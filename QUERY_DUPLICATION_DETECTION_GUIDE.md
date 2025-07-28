# Database Query Duplication Detection Hook - Claude Code Integration

## Overview

A comprehensive hook system that prevents database query duplication by automatically analyzing newly created or modified queries against existing ones, using a separate Claude Code instance for semantic similarity analysis and providing actionable refactoring suggestions.

## Features

### 🔍 **Automatic Query Detection**
- **Multi-format support**: Raw SQL, Prisma, Knex.js, SQLAlchemy, Sequelize, and more
- **Smart file matching**: Detects queries in `./queries`, `./sql`, `./database`, `./db`, `./models` directories
- **Pattern-based detection**: Files matching `*query*.ts`, `*sql*.py`, `*.sql`, etc.
- **Framework-agnostic**: Works with PostgreSQL, MySQL, SQLite, MongoDB

### 🤖 **Claude Code Reviewer Integration**
- **Separate instance**: Launches independent Claude Code instance for objective analysis
- **Semantic similarity**: Analyzes query purpose and intent, not just text matching
- **Comprehensive review**: Examines table access patterns, WHERE conditions, JOIN logic, return structures
- **Structured feedback**: Provides specific refactoring suggestions and duplicate identification

### 📊 **Advanced Analysis**
- **Purpose inference**: Understands what each query is trying to accomplish
- **Parameter detection**: Identifies queries that could be parameterized instead of duplicated
- **Table relationship mapping**: Analyzes which tables and columns are accessed
- **Return structure comparison**: Compares what data queries return

## Implementation Details

### Files Created
1. **Core Engine**: `.claude/hooks/query-duplication-detector.py` - Python analysis engine
2. **Shell Wrapper**: `.claude/hooks/query-duplication-wrapper.sh` - Claude Code integration
3. **Configuration**: `.claude/query-duplication-config.json` - Customizable settings
4. **Hook Integration**: Updated `.claude/hooks.json` with query duplication hook
5. **Documentation**: This comprehensive guide

### Hook Configuration
```json
{
  "name": "query_duplication_detection",
  "event": "PostToolUse", 
  "matchers": [
    "Edit(file_path:*queries/*)",
    "Write(file_path:*query*.ts)",
    "MultiEdit(file_path:*.sql)"
  ],
  "blocking": false
}
```

### Supported Query Formats

#### **Raw SQL**
```sql
-- Detected and analyzed
SELECT id, name FROM users WHERE status = 'active';
INSERT INTO orders (user_id, total) VALUES (?, ?);
```

#### **Prisma ORM**
```typescript
// Automatically parsed
const users = await prisma.user.findMany({
  where: { status: 'active' },
  select: { id: true, name: true }
});
```

#### **Knex.js Query Builder**
```javascript
// Pattern recognition
const orders = knex('orders')
  .select('*')
  .where('status', 'pending')
  .join('users', 'orders.user_id', 'users.id');
```

#### **SQLAlchemy (Python)**
```python
# ORM detection
users = session.query(User).filter(User.status == 'active').all()
orders = db.session.query(Order).join(User).filter(Order.status == 'pending')
```

#### **Sequelize ORM**
```javascript
// Model-based queries
const users = await User.findAll({
  where: { status: 'active' },
  attributes: ['id', 'name']
});
```

## Query Analysis Process

### 1. **Detection Phase**
- Monitors file modifications in query-related directories
- Identifies files matching query patterns
- Extracts all queries from modified files

### 2. **Parsing Phase**
- **Framework Detection**: Identifies query format (SQL, Prisma, Knex, etc.)
- **Structure Extraction**: Pulls out tables, columns, conditions, joins
- **Purpose Inference**: Determines what the query is trying to accomplish
- **Parameter Identification**: Finds placeholders and dynamic values

### 3. **Analysis Phase**
- **Claude Reviewer Launch**: Starts separate Claude Code instance
- **Semantic Comparison**: Compares new queries against all existing ones
- **Similarity Scoring**: Rates semantic similarity (0.0 to 1.0)
- **Duplication Detection**: Identifies exact and near-duplicates

### 4. **Reporting Phase**
- **Structured Report**: JSON-formatted analysis results
- **Actionable Feedback**: Specific refactoring suggestions
- **Code References**: File paths, line numbers, function names

## Sample Analysis Output

### Duplicate Detection Report
```
🔍 Database Query Duplication Analysis Results
============================================================

🚨 EXACT DUPLICATES FOUND:
------------------------------
  ❌ getUsersByStatus (line 45 in services/user-service.ts)
     Duplicates: getActiveUsers() in queries/users.sql
     Reason: Both queries select users with status filter - identical logic

⚠️ SIMILAR QUERIES DETECTED:
------------------------------
  🔶 getOrdersWithDetails (line 28 in models/orders.py)
     Similar to: getOrdersByUser() in services/order-service.ts
     Similarity: 0.85
     Suggestion: Parameterize getOrdersByUser to accept optional user filter

💡 REFACTORING RECOMMENDATIONS:
------------------------------
  1. Consolidate user status queries into single parameterized function
  2. Extract common order joining logic into reusable query builder
  3. Consider creating a generic pagination wrapper for list queries

📋 SUMMARY:
-----------
Found 1 exact duplicate and 2 similar queries. Recommend refactoring to
reuse existing getUsersByStatus() function with parameters instead of
creating new query variations.

🤖 REQUIRED ACTIONS:
--------------------
1. Review the identified duplications above
2. Refactor to use existing query functions where possible
3. Consider parameterizing similar queries instead of creating new ones
4. Update your code to call existing functions instead of duplicating logic
```

## Configuration Options

### Directory Monitoring
```json
{
  "query_directories": [
    "queries", "sql", "database", "db", "models",
    "backend-v2/services", "backend-v2/models"
  ]
}
```

### File Pattern Matching
```json
{
  "query_file_patterns": [
    "*query*.ts", "*sql*.py", "*.sql", 
    "*service*.py", "*model*.py", "*repository*.py"
  ]
}
```

### Analysis Settings
```json
{
  "similarity_threshold": 0.8,
  "block_on_duplicates": false,
  "semantic_similarity": true,
  "table_access_patterns": true,
  "where_condition_analysis": true
}
```

## Usage Examples

### Automatic Activation
The hook automatically triggers when Claude modifies query files:
```python
# When Claude creates this file, duplication check runs
def get_pending_orders():
    return db.query("SELECT * FROM orders WHERE status = 'pending'")

# Hook compares against existing queries and may find:
# "Similar to getPendingOrdersList() in orders.py - consider parameterizing"
```

### Manual Testing
```bash
# Test the hook manually
/Users/bossio/6fb-booking/.claude/hooks/query-duplication-wrapper.sh manual

# Check hook status
/Users/bossio/6fb-booking/.claude/hooks/query-duplication-wrapper.sh status

# View configuration
/Users/bossio/6fb-booking/.claude/hooks/query-duplication-wrapper.sh config
```

## Advanced Features

### Semantic Similarity Analysis
- **Purpose Matching**: Queries that accomplish the same business goal
- **Table Access Patterns**: Similar data access even with different syntax
- **Intent Recognition**: Understanding query objectives beyond syntax

### Framework-Specific Intelligence
- **Prisma Relations**: Understands `include` and `select` semantics
- **SQL JOIN Analysis**: Recognizes equivalent join patterns
- **ORM Translation**: Maps ORM operations to underlying SQL concepts

### Performance Optimization
- **Caching System**: Avoids re-analyzing unchanged files
- **Incremental Analysis**: Only processes modified queries
- **Timeout Protection**: Prevents hanging on large codebases

## Error Handling

### Claude Code Not Available
```
⚠️ Claude Code reviewer not available - running basic duplication check
```
Falls back to text-based similarity when Claude Code unavailable.

### No Query Structure Found
```
ℹ️ No query structure found, skipping duplication checking
```
Intelligently skips projects without database operations.

### Analysis Timeout
```
🚨 Query analysis timed out after 5 minutes
```
Protects against infinite analysis loops on complex queries.

## Benefits

### 🛡️ **DRY Principle Enforcement**
- Prevents query logic duplication across the codebase
- Encourages parameterization over duplication
- Maintains consistent data access patterns

### 🚀 **Development Efficiency**
- Immediate feedback on query duplications
- Automated detection saves manual code review time
- Suggests specific refactoring approaches

### 📊 **Code Quality**
- Enforces consistent query patterns
- Reduces maintenance burden of duplicate queries
- Improves overall database interaction design

## Troubleshooting

### Hook Not Triggering
1. **Check file patterns**: Verify your files match configured patterns
2. **Review directories**: Ensure query directories are correctly configured
3. **Check logs**: Review `/Users/bossio/6fb-booking/.claude/logs/query-duplication-wrapper.log`

### False Positives
1. **Adjust similarity threshold**: Lower threshold in configuration
2. **Add exclusions**: Configure excluded directories or patterns
3. **Performance queries**: Some duplication may be intentional for optimization

### Claude Reviewer Issues
1. **Command availability**: Ensure `claude-code` command is in PATH
2. **Timeout settings**: Increase timeout for complex analyses
3. **Network connectivity**: Check internet connection for Claude API access

## Customization

### Custom Query Patterns
Add project-specific patterns to configuration:
```json
{
  "query_file_patterns": [
    "*repository*.ts",
    "*dao*.java", 
    "*persistence*.py"
  ]
}
```

### Framework Support
Extend the parser for custom query frameworks:
```python
def _parse_custom_orm(self, file_path: Path, content: str) -> List[QueryInfo]:
    # Custom parsing logic for your ORM
    pass
```

### Analysis Rules
Configure analysis behavior:
```json
{
  "analysis_settings": {
    "ignore_parameter_differences": true,
    "focus_on_business_logic": true,
    "consider_performance_variants": false
  }
}
```

---

**The Query Duplication Detection Hook ensures your database code follows DRY principles by automatically identifying and preventing duplicate query logic, leading to more maintainable and consistent data access patterns.**