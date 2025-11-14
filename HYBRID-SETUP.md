# Hybrid Setup: OpenAI + 3rd Party

## The Strategy 💡

Use the best of both worlds:
- **OpenAI**: File search / vector stores (their specialty)
- **3rd Party**: Chat completions (70-80% cheaper!)

## Configuration

Edit your `.env` file:

```env
# 3rd Party Provider (for cheap chat completions)
THIRD_PARTY_API_KEY=sk-jW4WLdgCGCshSyFY9VbKXwj8y2YXclFHxw2x2WbXElFkcAlD
THIRD_PARTY_BASE_URL=https://api.bltcy.ai/v1/

# OpenAI (for file retrieval/vector search only)
OPENAI_API_KEY=sk-proj-your-real-openai-key-here
```

## Your Vector Store

Your original agent used:
```javascript
const fileSearch = fileSearchTool(["vs_69156d1026088191a49150f079b0f1f9"])
```

This vector store ID is already configured in the hybrid agent!

## Run the Hybrid Agent

```bash
npm run start:hybrid
```

Or test it:
```bash
npm run test:hybrid
```

## How It Works

1. **Query Rewrite** → 3rd party (cheap) ✅
2. **Classification** → 3rd party (cheap) ✅
3. **File Search** → OpenAI (only when needed) 💰
4. **Final Answer** → 3rd party (cheap) ✅

## Cost Breakdown

Example question with file search:

| Task | Provider | Cost |
|------|----------|------|
| Query rewrite | 3rd party | ~$0.0001 |
| Classification | 3rd party | ~$0.0001 |
| File search | OpenAI | ~$0.001 |
| Final answer | 3rd party | ~$0.0005 |
| **Total** | **Hybrid** | **~$0.0017** |

vs. All OpenAI: ~$0.008

**Savings: ~80%!** 🎉

## When File Search is Used

The agent automatically uses OpenAI file search when:
- Question is classified as "q-and-a" or "fact-finding"
- Vector store is initialized successfully
- Question is not "other" (unclear)

For general knowledge questions, it skips file search entirely (even cheaper!).

## Fallback

If OpenAI file search fails:
- Agent continues without it
- Uses 3rd party for everything
- Still works, just without file context

## Files

- `hybrid-agent.js` - Main hybrid logic
- `index-hybrid.js` - Interactive app
- `test-hybrid.js` - Test script
