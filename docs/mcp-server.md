# MCP Server Documentation

ClaimFlow exposes an MCP (Model Context Protocol) server that enables AI assistants and other MCP-compatible clients to interact with the insurance claims agent system programmatically.

## Overview

MCP (Model Context Protocol) is a standard for connecting AI assistants to external tools and data sources. This server exposes the full suite of insurance claims management tools, allowing AI assistants to:

- Triage insurance claims
- Analyze claims backlog
- Manage adjuster workloads
- Assess storm impacts
- Interact with the governed multi-agent system

## Quick Start

### Running the MCP Server

```bash
npx tsx server/mcp-entry.ts
```

The server uses stdio transport and communicates via standard input/output streams.

## Client Configuration

### Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "claimflow-claims-management": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/server/mcp-entry.ts"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@host:5432/database",
        "AI_INTEGRATIONS_OPENAI_API_KEY": "your-openai-api-key",
        "AI_INTEGRATIONS_OPENAI_BASE_URL": "https://api.openai.com/v1",
        "AVERECION_API_KEY": "your-averecion-api-key"
      }
    }
  }
}
```

After saving, restart Claude Desktop to load the new server.

### Cursor IDE

For Cursor, add to your workspace or user settings:

```json
{
  "mcp.servers": {
    "claimflow-claims-management": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/server/mcp-entry.ts"],
      "env": {
        "DATABASE_URL": "postgresql://..."
      }
    }
  }
}
```

### Other MCP Clients

Any MCP-compatible client can connect using the stdio transport. The server follows the MCP specification and responds to standard tool listing and execution requests.

## Available Tools

### Analysis Tools

#### `triage_claim`
Triage and classify an insurance claim.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `claimId` | string | Yes | The claim ID to triage |
| `damageType` | string | No | Type of damage (e.g., 'wind', 'flood', 'hail') |
| `region` | string | No | Region code (e.g., 'GA', 'TX', 'CA') |

**Example:**
```json
{
  "claimId": "CLM-2025-00142",
  "damageType": "wind",
  "region": "GA"
}
```

#### `analyze_backlog`
Analyze claims backlog metrics.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `region` | string | No | Region code for backlog analysis |
| `status` | string | No | Filter by claim status (e.g., 'pending', 'in_review') |
| `stormEventId` | string | No | Filter by storm event ID |

#### `manage_adjusters`
Optimize adjuster assignments.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `adjusterId` | string | No | Specific adjuster ID to analyze |
| `region` | string | No | Region code for workload analysis |

#### `assess_storm`
Assess storm impact on claims.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `stormId` | string | No | Specific storm event ID |
| `region` | string | No | Region code for assessment |

### Agent System Tools

#### `chat_with_agent`
Send natural language queries to the multi-agent system.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `message` | string | Yes | Natural language query |

The multi-agent system automatically routes queries to the appropriate specialist:
- **Claims Triage Agent**: Claim severity, damage assessment, priority scoring
- **Backlog Analysis Agent**: Queue metrics, throughput, bottleneck detection
- **Adjuster Management Agent**: Workload balancing, specialty matching
- **Storm Assessment Agent**: Storm impact, loss estimation, claims clustering

#### `get_agent_status`
Get metrics and trust levels for all agents.

**Parameters:** None

**Response includes:**
- Agent trust levels (Supervised, Guided, Semi-Autonomous)
- Success rates and decision counts
- Performance metrics

#### `get_pending_approvals`
List agent actions pending human approval.

**Parameters:** None

Returns all actions in the human-in-the-loop approval queue.

#### `approve_action`
Approve or reject a pending agent action.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `approvalId` | number | Yes | Approval request ID |
| `decision` | string | Yes | 'approved' or 'rejected' |
| `reviewNotes` | string | No | Notes explaining decision |

## Response Format

All tools return JSON responses in the following structure:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"data\": {...}, \"isMockData\": true}"
    }
  ]
}
```

The `isMockData` flag indicates whether the response contains sample demonstration data or data from connected sources.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | For AI features | OpenAI API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | For AI features | OpenAI API base URL |
| `AVERECION_API_KEY` | No | Averecion governance API key |

## Governance and Trust Levels

The MCP server respects the same governance rules as the web application:

- **Supervised**: All agent actions require human approval
- **Guided**: Medium-risk actions auto-approved, high-risk require review
- **Semi-Autonomous**: Most actions auto-approved with audit logging

Agents earn autonomy through successful decision-making tracked by the system.

## Error Handling

Errors are returned with `isError: true`:

```json
{
  "content": [
    {
      "type": "text", 
      "text": "{\"error\": \"Error message here\"}"
    }
  ],
  "isError": true
}
```

## Security Considerations

- The MCP server inherits permissions from the environment it runs in
- Database credentials should be stored securely in environment variables
- The Averecion governance layer provides pre-execution policy checks
- All actions are logged for audit purposes

## Troubleshooting

### Server won't start
- Ensure all required environment variables are set
- Check that the database is accessible
- Verify Node.js and tsx are installed

### Tools not appearing
- Restart your MCP client after configuration changes
- Verify the server path is absolute and correct
- Check client logs for connection errors

### Governance rejections
- Check agent trust levels via `get_agent_status`
- Review pending approvals with `get_pending_approvals`
- Verify Averecion API key if using external governance
