const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const { pgPool } = require('../config/database');
const logger = require('../utils/logger');

class PromptVersionControl {
  constructor() {
    this.repoPath = process.env.GIT_REPOSITORY_PATH || './agent-prompts';
    this.git = simpleGit(this.repoPath);
  }

  async initializeGit() {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(this.repoPath, { recursive: true });
      await fs.mkdir(path.join(this.repoPath, 'versions'), { recursive: true });
      await fs.mkdir(path.join(this.repoPath, 'templates'), { recursive: true });
      await fs.mkdir(path.join(this.repoPath, 'current'), { recursive: true });

      // Initialize git repository
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        await this.git.init();
        await this.git.addConfig('user.name', process.env.GIT_USER_NAME || 'Agent Evolution System');
        await this.git.addConfig('user.email', process.env.GIT_USER_EMAIL || 'agent-evolution@example.com');
        
        // Create initial .gitignore
        const gitignoreContent = `
node_modules/
*.log
.env
.DS_Store
temp/
`;
        await fs.writeFile(path.join(this.repoPath, '.gitignore'), gitignoreContent);
        
        // Initial commit
        await this.git.add('.gitignore');
        await this.git.commit('Initial commit: Agent Evolution System');
        
        logger.info('Git repository initialized');
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize git repository:', error);
      throw error;
    }
  }

  async createVersion(agentName, promptContent, changelog = '', metadata = {}) {
    try {
      const client = await pgPool.connect();
      
      // Get current version and increment
      const versionResult = await client.query(
        'SELECT current_version FROM agents WHERE name = $1',
        [agentName]
      );
      
      let newVersion = '1.0.0';
      if (versionResult.rows.length > 0) {
        const currentVersion = versionResult.rows[0].current_version;
        newVersion = this.incrementVersion(currentVersion, metadata.versionType || 'patch');
      }

      // Save prompt to file system
      const versionDir = path.join(this.repoPath, 'versions', agentName);
      await fs.mkdir(versionDir, { recursive: true });
      
      const promptFilePath = path.join(versionDir, `${newVersion}.md`);
      const changelogPath = path.join(versionDir, `${newVersion}.changelog.md`);
      const metadataPath = path.join(versionDir, `${newVersion}.metadata.json`);
      
      await fs.writeFile(promptFilePath, promptContent);
      await fs.writeFile(changelogPath, changelog);
      await fs.writeFile(metadataPath, JSON.stringify({
        version: newVersion,
        created_at: new Date().toISOString(),
        agent_name: agentName,
        ...metadata
      }, null, 2));

      // Update current version
      const currentPath = path.join(this.repoPath, 'current', `${agentName}.md`);
      await fs.writeFile(currentPath, promptContent);

      // Git commit
      await this.git.add([promptFilePath, changelogPath, metadataPath, currentPath]);
      await this.git.commit(`${agentName}: Version ${newVersion}\n\n${changelog}`);

      // Update database
      let agentId;
      const agentResult = await client.query(
        'SELECT id FROM agents WHERE name = $1',
        [agentName]
      );

      if (agentResult.rows.length === 0) {
        const insertResult = await client.query(
          'INSERT INTO agents (name, current_version, description, category) VALUES ($1, $2, $3, $4) RETURNING id',
          [agentName, newVersion, metadata.description || '', metadata.category || 'general']
        );
        agentId = insertResult.rows[0].id;
      } else {
        agentId = agentResult.rows[0].id;
        await client.query(
          'UPDATE agents SET current_version = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newVersion, agentId]
        );
      }

      // Deactivate previous versions
      await client.query(
        'UPDATE prompt_versions SET is_active = false WHERE agent_id = $1',
        [agentId]
      );

      // Insert new version
      await client.query(`
        INSERT INTO prompt_versions (agent_id, version, content, changelog, is_active, metadata)
        VALUES ($1, $2, $3, $4, true, $5)
      `, [agentId, newVersion, promptContent, changelog, JSON.stringify(metadata)]);

      client.release();

      logger.info(`Created version ${newVersion} for agent ${agentName}`);
      return { version: newVersion, agentId };

    } catch (error) {
      logger.error('Failed to create version:', error);
      throw error;
    }
  }

  async compareVersions(agentName, version1, version2) {
    try {
      const versionDir = path.join(this.repoPath, 'versions', agentName);
      
      const content1 = await fs.readFile(path.join(versionDir, `${version1}.md`), 'utf8');
      const content2 = await fs.readFile(path.join(versionDir, `${version2}.md`), 'utf8');
      
      // Get git diff
      const diff = await this.git.diff([
        `versions/${agentName}/${version1}.md`,
        `versions/${agentName}/${version2}.md`
      ]);

      // Get performance metrics for both versions
      const client = await pgPool.connect();
      const metricsQuery = `
        SELECT version, metric_type, AVG(metric_value) as avg_value
        FROM performance_metrics pm
        JOIN agents a ON pm.agent_id = a.id
        WHERE a.name = $1 AND (pm.version = $2 OR pm.version = $3)
        GROUP BY version, metric_type
        ORDER BY version, metric_type
      `;
      
      const metricsResult = await client.query(metricsQuery, [agentName, version1, version2]);
      client.release();

      return {
        version1,
        version2,
        content1,
        content2,
        diff,
        metrics: metricsResult.rows
      };

    } catch (error) {
      logger.error('Failed to compare versions:', error);
      throw error;
    }
  }

  async rollback(agentName, targetVersion) {
    try {
      const client = await pgPool.connect();
      
      // Get agent ID
      const agentResult = await client.query(
        'SELECT id FROM agents WHERE name = $1',
        [agentName]
      );
      
      if (agentResult.rows.length === 0) {
        throw new Error(`Agent ${agentName} not found`);
      }
      
      const agentId = agentResult.rows[0].id;

      // Verify target version exists
      const versionResult = await client.query(
        'SELECT content FROM prompt_versions WHERE agent_id = $1 AND version = $2',
        [agentId, targetVersion]
      );
      
      if (versionResult.rows.length === 0) {
        throw new Error(`Version ${targetVersion} not found for agent ${agentName}`);
      }

      const promptContent = versionResult.rows[0].content;

      // Update current version in database
      await client.query(
        'UPDATE agents SET current_version = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [targetVersion, agentId]
      );

      // Deactivate all versions and activate target
      await client.query(
        'UPDATE prompt_versions SET is_active = false WHERE agent_id = $1',
        [agentId]
      );
      
      await client.query(
        'UPDATE prompt_versions SET is_active = true WHERE agent_id = $1 AND version = $2',
        [agentId, targetVersion]
      );

      // Update file system
      const currentPath = path.join(this.repoPath, 'current', `${agentName}.md`);
      await fs.writeFile(currentPath, promptContent);

      // Git commit
      await this.git.add(currentPath);
      await this.git.commit(`${agentName}: Rollback to version ${targetVersion}`);

      client.release();

      logger.info(`Rolled back ${agentName} to version ${targetVersion}`);
      return { agentName, version: targetVersion };

    } catch (error) {
      logger.error('Failed to rollback:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(agentName, version = null) {
    try {
      const client = await pgPool.connect();
      
      let query = `
        SELECT pm.*, a.name as agent_name
        FROM performance_metrics pm
        JOIN agents a ON pm.agent_id = a.id
        WHERE a.name = $1
      `;
      const params = [agentName];
      
      if (version) {
        query += ' AND pm.version = $2';
        params.push(version);
      }
      
      query += ' ORDER BY pm.measured_at DESC';
      
      const result = await client.query(query, params);
      client.release();

      return result.rows;

    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  async runABTest(agentName, versionA, versionB, testCriteria) {
    try {
      const client = await pgPool.connect();
      
      // Get agent ID
      const agentResult = await client.query(
        'SELECT id FROM agents WHERE name = $1',
        [agentName]
      );
      
      if (agentResult.rows.length === 0) {
        throw new Error(`Agent ${agentName} not found`);
      }
      
      const agentId = agentResult.rows[0].id;

      // Create A/B test record
      const testResult = await client.query(`
        INSERT INTO ab_tests (agent_id, test_name, version_a, version_b, criteria, status)
        VALUES ($1, $2, $3, $4, $5, 'running')
        RETURNING id
      `, [
        agentId,
        `${agentName}_${versionA}_vs_${versionB}_${Date.now()}`,
        versionA,
        versionB,
        JSON.stringify(testCriteria)
      ]);

      client.release();

      logger.info(`Started A/B test for ${agentName}: ${versionA} vs ${versionB}`);
      return {
        testId: testResult.rows[0].id,
        agentName,
        versionA,
        versionB,
        criteria: testCriteria
      };

    } catch (error) {
      logger.error('Failed to start A/B test:', error);
      throw error;
    }
  }

  incrementVersion(currentVersion, type = 'patch') {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
      default:
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  async getVersionHistory(agentName) {
    try {
      const client = await pgPool.connect();
      
      const result = await client.query(`
        SELECT pv.*, a.name as agent_name
        FROM prompt_versions pv
        JOIN agents a ON pv.agent_id = a.id
        WHERE a.name = $1
        ORDER BY pv.created_at DESC
      `, [agentName]);

      client.release();
      return result.rows;

    } catch (error) {
      logger.error('Failed to get version history:', error);
      throw error;
    }
  }
}

// Initialize Git on module load
let versionControl;

const initializeGit = async () => {
  versionControl = new PromptVersionControl();
  await versionControl.initializeGit();
  return versionControl;
};

module.exports = {
  PromptVersionControl,
  initializeGit,
  getVersionControl: () => versionControl
};