# EE OpenAI Agent

A hybrid AI agent system with folder-based access control, combining 3rd party providers for cost-effective chat completions and Supabase for vector search and file storage.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🌟 Features

- **Hybrid Architecture**: 3rd party provider (bltcy.ai) for chat + Supabase for vector search
- **Folder-Based Access Control**: Multi-tenant knowledge bases with per-agent folder permissions
- **Interactive API Documentation**: Swagger UI at `/docs` for easy frontend integration
- **OpenAI-Compatible API**: Drop-in replacement for OpenAI endpoints
- **Vector Search**: Semantic search using pgvector with 1536-dim embeddings
- **Streaming Support**: Real-time response streaming
- **Rate Limiting**: Built-in rate limiting per agent
- **Multiple Agent Modes**: Simple, file-based, and hybrid configurations

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Folder System](#folder-system)
- [Environment Variables](#environment-variables)
- [Usage Examples](#usage-examples)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- 3rd party OpenAI-compatible API provider (e.g., bltcy.ai)

### Installation

```bash
# Clone the repository
git clone https://github.com/Zhihong0321/EE-OpenAI-Agent.git
cd EE-OpenAI-Agent

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# - THIRD_PARTY_API_KEY
# - THIRD_PARTY_BASE_URL
# - SUPABASE_URL
# - SUPABASE_SECRET_KEY
# - SUPABASE_BUCKET
```

### Database Setup

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `scripts/schema-fresh-install.sql`
3. Paste and run

### Run the Application

```bash
# Start API server
npm run start:api

# Or start hybrid agent CLI
npm run start:hybrid

# Or start with file support
npm run start:files
```

Visit `http://localhost:3000/docs` for interactive API documentation.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                  (Separate Project)                          │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Server                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Manager    │  │   Wrapper    │  │  Swagger UI  │      │
│  │  Endpoints   │  │  Endpoints   │  │    /docs     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────┬────────────────────┬────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│    Supabase     │  │  3rd Party API  │
│  - Storage      │  │   (bltcy.ai)    │
│  - pgvector     │  │  - Chat         │
│  - RLS          │  │  - Embeddings   │
└─────────────────┘  └─────────────────┘
```

### Components

- **Manager**: Handles agents, files, indexing, and search
- **Wrapper**: Executes agent workflows with OpenAI-compatible API
- **Provider**: Routes chat/embeddings to 3rd party (cost-effective)
- **Supabase**: File storage and vector search (pgvector)

## 📖 API Documentation

### Interactive Documentation

Visit `/docs` for Swagger UI with:
- Interactive "Try it out" feature
- Request/response examples
- Authentication testing
- Copy as cURL commands

### Key Endpoints

**Documentation**
- `GET /` - Landing page
- `GET /docs` - Swagger UI
- `GET /openapi.yaml` - OpenAPI spec
- `GET /health` - Health check
- `GET /diagnostics` - System diagnostics

**Manager API**
- `POST /manager/agents` - Create agent with folder access
- `POST /manager/files/upload` - Upload file to folder
- `POST /manager/index` - Index file for search
- `POST /manager/search` - Vector search with folder filter

**Wrapper API**
- `POST /x-app/:appId/invoke` - Invoke agent (OpenAI-compatible)
- `POST /x-app/:appId/deploy` - Deploy agent wrapper

See [API-DOCS.md](API-DOCS.md) for complete reference.

## 🗂️ Folder System

### Hierarchical Structure

```
agent-files/
├── shared/              # Accessible by all agents
│   ├── company-policy.pdf
│   └── general-faq.md
├── sales-team/          # Sales agents only
│   ├── pricing.pdf
│   └── playbook.md
├── support-team/        # Support agents only
│   └── troubleshooting.md
└── agent-123/           # Private to agent-123
    └── custom-data.pdf
```

### Agent Configuration

```javascript
// Create agent with folder access
POST /manager/agents
{
  "id": "sales-agent",
  "config": {
    "model": "gpt-4o",
    "folders": ["shared", "sales-team"]
  }
}
```

### Access Control

- **Sales Agent**: `folders: ["shared", "sales-team"]`
  - ✅ Can access: `shared/`, `sales-team/`
  - ❌ Cannot access: `support-team/`, `agent-123/`

- **Admin Agent**: `folders: ["*"]`
  - ✅ Can access: All folders

See [FOLDER-SUPPORT.md](FOLDER-SUPPORT.md) for complete guide.

## 🔧 Environment Variables

```env
# 3rd Party Provider (for chat completions)
THIRD_PARTY_API_KEY=your_api_key
THIRD_PARTY_BASE_URL=https://api.bltcy.ai/v1/

# Supabase (for storage and vector search)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_secret_key
SUPABASE_BUCKET=agent-files

# Agent Configuration
AGENT_ID=default
AGENT_FOLDERS=shared,sales-team

# Optional
PORT=3000
MANAGER_TOKEN=your_secret_token
```

## 💡 Usage Examples

### CLI Mode

```bash
# Start hybrid agent with folder access
AGENT_FOLDERS=shared,sales-team npm run start:hybrid

# Interactive session
You: What is our pricing?
🔍 Searching files in folders: shared, sales-team...
✅ Found 3 results
🤖 Agent: [Answer with context from sales-team folder]
```

### API Mode

```javascript
// Search with folder restrictions
const response = await fetch('http://localhost:3000/manager/search', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agent_id: 'sales-agent',
    query: 'pricing tiers',
    folders: ['shared', 'sales-team'],
    top_k: 5
  })
});

// Invoke agent
const completion = await fetch('http://localhost:3000/x-app/sales-agent/invoke', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'What is our pricing?' }],
    tools: [{ type: 'file_search' }],
    metadata: {
      file_query: 'pricing',
      folders: ['shared', 'sales-team']
    }
  })
});
```

## 🚀 Deployment

### Railway

1. Push code to GitHub
2. Connect to Railway
3. Set environment variables
4. Deploy!

Your API docs will be live at: `https://your-app.railway.app/docs`

### Docker (Coming Soon)

```bash
docker build -t ee-openai-agent .
docker run -p 3000:3000 --env-file .env ee-openai-agent
```

## 📚 Documentation

- [PROJECT-SPEC.MD](PROJECT-SPEC.MD) - Architecture and API reference
- [FOLDER-SUPPORT.md](FOLDER-SUPPORT.md) - Folder system guide
- [API-DOCS.md](API-DOCS.md) - Frontend integration guide
- [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md) - Database migrations
- [CHANGELOG.md](CHANGELOG.md) - Version history

## 🧪 Testing

```bash
# Test folder support
npm run test:folders

# Test API endpoints
npm run test:api

# Test diagnostics
npm run test:api:diag

# Test hybrid agent
npm run test:hybrid
```

## 🛠️ Development

```bash
# Watch mode for API server
npm run dev:api

# Watch mode for CLI
npm run dev

# Upload and index test file
npm run upload:supabase

# Print SQL schema
npm run schema:print
```

## 📊 Project Structure

```
.
├── server.js                 # API server with Manager & Wrapper
├── hybrid-agent.js           # Hybrid agent with folder support
├── index-hybrid.js           # CLI interface
├── supabase-vector.js        # Vector search implementation
├── supabase-files.js         # File storage operations
├── services/
│   └── provider.js           # 3rd party provider routing
├── scripts/
│   ├── schema-fresh-install.sql
│   ├── migration-add-folders.sql
│   └── drop-and-recreate.sql
├── openapi.yaml              # API specification
└── docs/
    ├── PROJECT-SPEC.MD
    ├── FOLDER-SUPPORT.md
    ├── API-DOCS.md
    └── MIGRATION-GUIDE.md
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for the API specification
- Supabase for vector search and storage
- The open-source community

## 📧 Contact

- GitHub: [@Zhihong0321](https://github.com/Zhihong0321)
- Project Link: [https://github.com/Zhihong0321/EE-OpenAI-Agent](https://github.com/Zhihong0321/EE-OpenAI-Agent)

---

**Built with ❤️ for efficient AI agent development**
