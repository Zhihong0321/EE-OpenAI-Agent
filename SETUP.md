# Quick Start Guide

## Your Configuration
- **API Provider**: https://api.bltcy.ai/v1/
- **API Key**: Already configured in `.env`
- **Models Used**: 
  - gpt-4o-mini (for rewriting and classification)
  - gpt-4o (for final answers)

## Run the App

**Without knowledge base:**
```bash
npm start
```

**With knowledge base (file search):**
```bash
npm run start:files
```

Then type your questions and press Enter!

## Test the App

**Basic test:**
```bash
npm test
```

**Test with knowledge base:**
```bash
npm run test:files
```

## Files Overview

- `simple-agent.js` - Basic agent (no file support)
- `simple-agent-with-files.js` - Agent with knowledge base support
- `index.js` - Interactive CLI app (basic)
- `index-with-files.js` - Interactive CLI app (with knowledge base)
- `.env` - Your API credentials (already configured)
- `test-simple.js` - Basic test
- `test-with-files.js` - Test with knowledge base

## Adding Your Own Knowledge Files

Edit `index-with-files.js` and update this line:
```javascript
const knowledgeFiles = ['test-upload.txt', 'your-file.txt'];
```

The agent will load these files and use them to answer questions!

## Note

The original `agent.js` using `@openai/agents` library won't work with 3rd party providers because it has hardcoded connections to OpenAI's services (tracing, hosted tools). 

The new `simple-agent.js` uses only the standard OpenAI SDK, so it works perfectly with your provider!
