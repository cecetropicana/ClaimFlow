# ClaimFlow

## Overview
ClaimFlow is an insurance claims management application designed for claims agents managing storm backlog. It provides tools for triaging claims, managing adjuster workloads, analyzing storm impacts, and processing claim backlogs. The project leverages a governed multi-agent AI architecture for enhanced decision-making and operational efficiency. It integrates with the Averecion platform for pre-execution governance and earned autonomy.

## User Preferences
I prefer simple language.
I want iterative development.
Ask before making major changes.

## System Architecture
The application follows a client-server architecture.
The UI/UX uses Tailwind CSS with Shadcn/UI components and custom Adaptive Cards for rich data display.
The frontend is built with React 18 and TypeScript, utilizing Wouter for routing and TanStack Query for server state management.
The backend is an Express.js server with TypeScript, using in-memory storage (MemStorage). API endpoints are RESTful with Zod validation.

### Domain Models (shared/schema.ts)
- **Claim**: Insurance claims with policyholder info, property address, damage type, severity, status, estimated loss, assigned adjuster
- **Adjuster**: Field adjusters with specialties, caseload, availability, coverage regions
- **StormEvent**: Storm events (hurricanes, tropical storms) with category, status, affected regions
- **ClaimNote**: Notes/comments on claims for triage workflow
- **DashboardMetrics**: Aggregated metrics type for dashboard and chat cards

### Key Pages
- **Dashboard** (`/dashboard`): Storm claims overview with metrics cards, severity breakdown, status pipeline, storm-specific stats
- **Backlog Queue** (`/backlog`): Filterable/sortable claims table with bulk assignment, search, and multi-filter support
- **Adjusters** (`/adjusters`): Adjuster workload cards showing caseload, specialties, availability
- **Triage** (`/triage/:id`): Individual claim review with detail editing, adjuster assignment, notes, status updates, and activity log timeline
- **Home** (`/`): Chat interface with AI assistant for natural language claim queries

### Chat & Adaptive Cards
The chat system responds to insurance queries with rich cards:
- `claims-summary`: Dashboard metrics overview
- `claim-detail`: Single claim detail with link to triage
- `backlog-stats`: Backlog pipeline and urgency indicators
- `adjuster-workload`: Adjuster caseload bars and availability
- `storm-claims`: Storm events with claim counts and losses

### Agent/Governance System (preserved from original architecture)
- 3-layer multi-agent system (Experience, Agent Orchestration, Governance)
- Supervisor Agent routes queries to specialized agents
- Averecion MCP integration for pre-execution governance
- Human-in-the-Loop approval workflows
- Agent monitoring and trust level management

## API Endpoints
- `GET /api/claims` - List all claims
- `GET /api/claims/:id` - Get single claim
- `PATCH /api/claims/:id` - Update claim
- `POST /api/claims/:id/assign` - Assign adjuster to claim
- `POST /api/claims/bulk-assign` - Bulk assign claims
- `GET /api/claims/:id/notes` - Get claim notes
- `POST /api/claims/:id/notes` - Add claim note
- `GET /api/claims/:id/activity` - Get claim activity/forensic trail
- `GET /api/activity` - Get all activity (optional ?agentId filter)
- `GET /api/adjusters` - List adjusters
- `GET /api/adjusters/:id` - Get adjuster detail
- `GET /api/adjusters/:id/workload` - Get adjuster workload
- `GET /api/storm-events` - List storm events
- `GET /api/dashboard/metrics` - Dashboard aggregated metrics
- `POST /api/chat` - AI chat with card responses

## External Dependencies
- **OpenAI**: Integrated via Replit AI Integrations for AI capabilities.
- **Averecion Platform**: External governance platform for pre-execution checks and earned autonomy.

## Mock Data
The application ships with demonstration data:
- 3 storm events (Hurricane Milton Cat 4, Hurricane Helena Cat 3, Tropical Storm Beta Cat 1)
- 8 adjusters with varying specialties and caseloads
- 48 claims across FL, GA, SC, LA with realistic addresses and damage types
