#!/usr/bin/env node

/**
 * Sentry MCP Server
 * Provides tools for fetching and analyzing Sentry errors
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

// Sentry configuration
const SENTRY_AUTH_TOKEN = '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';
const SENTRY_ORG = 'bossio-solution-inc';
const SENTRY_PYTHON_PROJECT = 'python';
const SENTRY_NODE_PROJECT = 'node';

class SentryMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'sentry-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'sentry_list_issues',
          description: 'List recent Sentry issues for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                enum: ['python', 'node'],
                description: 'Which project to fetch issues from',
              },
              limit: {
                type: 'number',
                description: 'Number of issues to fetch (default: 10)',
                default: 10,
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'sentry_get_issue',
          description: 'Get detailed information about a specific Sentry issue',
          inputSchema: {
            type: 'object',
            properties: {
              issueId: {
                type: 'string',
                description: 'The Sentry issue ID',
              },
            },
            required: ['issueId'],
          },
        },
        {
          name: 'sentry_get_events',
          description: 'Get events for a specific Sentry issue',
          inputSchema: {
            type: 'object',
            properties: {
              issueId: {
                type: 'string',
                description: 'The Sentry issue ID',
              },
              limit: {
                type: 'number',
                description: 'Number of events to fetch (default: 5)',
                default: 5,
              },
            },
            required: ['issueId'],
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'sentry_list_issues':
            return await this.listIssues(args);
          case 'sentry_get_issue':
            return await this.getIssue(args);
          case 'sentry_get_events':
            return await this.getEvents(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async listIssues({ project, limit = 10 }) {
    const projectSlug = project === 'python' ? SENTRY_PYTHON_PROJECT : SENTRY_NODE_PROJECT;
    const projectName = project === 'python' ? '6FB Booking Backend' : 'Bossio Investing Machine';

    try {
      const response = await axios.get(
        `https://sentry.io/api/0/projects/${SENTRY_ORG}/${projectSlug}/issues/`,
        {
          headers: {
            Authorization: `Bearer ${SENTRY_AUTH_TOKEN}`,
          },
          params: {
            limit,
            statsPeriod: '24h',
          },
        }
      );

      const issues = response.data.map((issue) => ({
        id: issue.id,
        title: issue.title,
        culprit: issue.culprit,
        level: issue.level,
        count: issue.count,
        userCount: issue.userCount,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        permalink: issue.permalink,
        isUnhandled: issue.isUnhandled,
        metadata: issue.metadata,
      }));

      return {
        content: [
          {
            type: 'text',
            text: `Found ${issues.length} issues in ${projectName}:\n\n${issues
              .map(
                (issue, index) =>
                  `${index + 1}. **${issue.title}**\n` +
                  `   - ID: ${issue.id}\n` +
                  `   - Level: ${issue.level}\n` +
                  `   - Count: ${issue.count} events\n` +
                  `   - Users affected: ${issue.userCount}\n` +
                  `   - Last seen: ${new Date(issue.lastSeen).toLocaleString()}\n` +
                  `   - Culprit: ${issue.culprit}\n` +
                  `   - Link: ${issue.permalink}`
              )
              .join('\n\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch issues: ${error.message}`);
    }
  }

  async getIssue({ issueId }) {
    try {
      const response = await axios.get(
        `https://sentry.io/api/0/issues/${issueId}/`,
        {
          headers: {
            Authorization: `Bearer ${SENTRY_AUTH_TOKEN}`,
          },
        }
      );

      const issue = response.data;
      const tags = Object.entries(issue.tags || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      return {
        content: [
          {
            type: 'text',
            text: `## Issue Details: ${issue.title}\n\n` +
              `**ID:** ${issue.id}\n` +
              `**Level:** ${issue.level}\n` +
              `**Status:** ${issue.status}\n` +
              `**First seen:** ${new Date(issue.firstSeen).toLocaleString()}\n` +
              `**Last seen:** ${new Date(issue.lastSeen).toLocaleString()}\n` +
              `**Count:** ${issue.count} events\n` +
              `**Users affected:** ${issue.userCount}\n` +
              `**Culprit:** ${issue.culprit}\n` +
              `**Tags:** ${tags}\n` +
              `**Link:** ${issue.permalink}\n\n` +
              `### Metadata\n\`\`\`json\n${JSON.stringify(issue.metadata, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch issue details: ${error.message}`);
    }
  }

  async getEvents({ issueId, limit = 5 }) {
    try {
      const response = await axios.get(
        `https://sentry.io/api/0/issues/${issueId}/events/`,
        {
          headers: {
            Authorization: `Bearer ${SENTRY_AUTH_TOKEN}`,
          },
          params: {
            limit,
          },
        }
      );

      const events = response.data.map((event) => {
        const stacktrace = event.entries?.find((e) => e.type === 'exception')?.data?.values?.[0]?.stacktrace;
        const frames = stacktrace?.frames?.slice(-3) || []; // Last 3 frames

        return {
          id: event.id,
          timestamp: event.dateCreated,
          message: event.message || event.title,
          platform: event.platform,
          environment: event.environment,
          release: event.release,
          user: event.user,
          context: event.contexts,
          tags: event.tags,
          stacktrace: frames.map(frame => ({
            filename: frame.filename,
            function: frame.function,
            lineNo: frame.lineNo,
            contextLine: frame.contextLine,
          })),
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: `## Events for Issue ${issueId}\n\n${events
              .map(
                (event, index) =>
                  `### Event ${index + 1} (${new Date(event.timestamp).toLocaleString()})\n` +
                  `**ID:** ${event.id}\n` +
                  `**Message:** ${event.message}\n` +
                  `**Platform:** ${event.platform}\n` +
                  `**Environment:** ${event.environment || 'N/A'}\n` +
                  `**User:** ${event.user?.email || event.user?.id || 'Anonymous'}\n\n` +
                  `**Stack Trace (last 3 frames):**\n\`\`\`\n${event.stacktrace
                    .map(
                      (frame) =>
                        `${frame.filename}:${frame.lineNo} in ${frame.function}\n` +
                        `  ${frame.contextLine}`
                    )
                    .join('\n\n')}\n\`\`\`\n` +
                  `**Tags:** ${Object.entries(event.tags || {})
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ')}`
              )
              .join('\n\n---\n\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Sentry MCP Server running on stdio');
  }
}

// Run the server
const server = new SentryMCPServer();
server.run().catch(console.error);
