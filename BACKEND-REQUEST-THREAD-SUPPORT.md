# 🔧 Backend Feature Request: Thread-Based Conversation Memory

**Priority:** 🔴 HIGH  
**Type:** Feature Enhancement  
**Date:** 2025-11-14  
**Requested By:** Frontend Team

---

## Problem Statement

The current chat API (`/x-app/{agentId}/chat`) is **stateless** and does not maintain conversation history between requests. This causes the AI to "forget" previous messages in the conversation.

### Current Behavior (Broken)

**Request 1:**
```json
POST /x-app/test-agent/chat
{
  "messages": [
    { "role": "user", "content": "My name is Alice" }
  ]
}
```

**Response 1:**
```json
{
  "choices": [{
    "message": {
      "content": "Nice to meet you, Alice! How can I assist you today?"
    }
  }]
}
```

**Request 2:**
```json
POST /x-app/test-agent/chat
{
  "messages": [
    { "role": "user", "content": "What is my name?" }
  ]
}
```

**Response 2:**
```json
{
  "choices": [{
    "message": {
      "content": "I don't have access to personal information about you..."
    }
  }]
}
```

**❌ Problem:** The AI forgot that the user said their name was Alice.

---

## Requested Solution: Thread-Based Memory

Implement **OpenAI Assistants API-style thread management** where the backend maintains conversation history server-side.

### Proposed API Design

#### 1. Create Thread (New Conversation)

```http
POST /x-app/{agentId}/threads
Authorization: Bearer {MANAGER_TOKEN}
Content-Type: application/json

{
  "metadata": {
    "user_id": "optional-user-id",
    "session_info": "optional-metadata"
  }
}
```

**Response:**
```json
{
  "thread_id": "thread_abc123",
  "agent_id": "test-agent",
  "created_at": "2025-11-14T12:00:00Z",
  "metadata": {}
}
```

#### 2. Send Message to Thread

```http
POST /x-app/{agentId}/threads/{thread_id}/messages
Authorization: Bearer {MANAGER_TOKEN}
Content-Type: application/json

{
  "content": "My name is Alice"
}
```

**Response:**
```json
{
  "message_id": "msg_xyz789",
  "thread_id": "thread_abc123",
  "role": "user",
  "content": "My name is Alice",
  "created_at": "2025-11-14T12:00:01Z"
}
```

#### 3. Run Thread (Get AI Response)

```http
POST /x-app/{agentId}/threads/{thread_id}/run
Authorization: Bearer {MANAGER_TOKEN}
Content-Type: application/json

{}
```

**Response:**
```json
{
  "run_id": "run_def456",
  "thread_id": "thread_abc123",
  "status": "completed",
  "messages": [
    {
      "role": "user",
      "content": "My name is Alice"
    },
    {
      "role": "assistant",
      "content": "Nice to meet you, Alice! How can I assist you today?"
    }
  ],
  "usage": {
    "prompt_tokens": 11,
    "completion_tokens": 14,
    "total_tokens": 25
  }
}
```

#### 4. Get Thread Messages (History)

```http
GET /x-app/{agentId}/threads/{thread_id}/messages
Authorization: Bearer {MANAGER_TOKEN}
```

**Response:**
```json
{
  "thread_id": "thread_abc123",
  "messages": [
    {
      "message_id": "msg_001",
      "role": "user",
      "content": "My name is Alice",
      "created_at": "2025-11-14T12:00:01Z"
    },
    {
      "message_id": "msg_002",
      "role": "assistant",
      "content": "Nice to meet you, Alice! How can I assist you today?",
      "created_at": "2025-11-14T12:00:02Z"
    }
  ]
}
```

#### 5. Delete Thread (Cleanup)

```http
DELETE /x-app/{agentId}/threads/{thread_id}
Authorization: Bearer {MANAGER_TOKEN}
```

**Response:**
```json
{
  "thread_id": "thread_abc123",
  "deleted": true
}
```

---

## Alternative: Simplified Thread API

If the full Assistants API pattern is too complex, here's a simpler approach:

### Simplified Design

#### Create/Continue Conversation

```http
POST /x-app/{agentId}/chat
Authorization: Bearer {MANAGER_TOKEN}
Content-Type: application/json

{
  "thread_id": "thread_abc123",  // Optional: omit to create new thread
  "message": "What is my name?"
}
```

**Response:**
```json
{
  "thread_id": "thread_abc123",
  "message": {
    "role": "assistant",
    "content": "Your name is Alice!"
  },
  "conversation_length": 4,  // Total messages in thread
  "usage": { ... }
}
```

**How it works:**
1. If `thread_id` is provided → Backend retrieves conversation history from database
2. Backend appends new user message to history
3. Backend sends full history to OpenAI
4. Backend stores assistant response
5. Backend returns response with `thread_id`

---

## Database Schema Suggestion

### Table: `threads`
```sql
CREATE TABLE threads (
  id VARCHAR(255) PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### Table: `messages`
```sql
CREATE TABLE messages (
  id VARCHAR(255) PRIMARY KEY,
  thread_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_thread ON messages(thread_id, created_at);
```

---

## Benefits of Thread-Based Approach

### For Backend
✅ **Centralized memory management** - No need for frontend to track history  
✅ **Consistent across clients** - Same conversation on web, mobile, API  
✅ **Analytics & monitoring** - Track conversation length, topics, etc.  
✅ **Rate limiting** - Limit by thread, not just by request  
✅ **Audit trail** - Full conversation history for debugging  

### For Frontend
✅ **Simpler implementation** - Just send `thread_id` and new message  
✅ **No state management** - Backend handles all history  
✅ **Reliable** - No risk of losing history on page refresh  
✅ **Multi-device support** - Continue conversation on different devices  

### For Users
✅ **Persistent conversations** - Can return to previous chats  
✅ **Context awareness** - AI remembers the full conversation  
✅ **Better UX** - Natural conversation flow  

---

## Implementation Priority

### Phase 1: Basic Thread Support (MVP)
- [ ] Create thread endpoint
- [ ] Store messages in database
- [ ] Retrieve thread history
- [ ] Send full history to OpenAI
- [ ] Return thread_id in response

### Phase 2: Thread Management
- [ ] List user's threads
- [ ] Delete thread
- [ ] Update thread metadata
- [ ] Thread expiration/cleanup

### Phase 3: Advanced Features
- [ ] Thread search
- [ ] Message editing
- [ ] Conversation branching
- [ ] Export conversation

---

## Testing Requirements

### Test Case 1: Memory Persistence
```bash
# Create thread and send first message
curl -X POST ".../chat" \
  -d '{"message":"My name is Alice"}'
# Response: {"thread_id":"thread_123",...}

# Send follow-up with thread_id
curl -X POST ".../chat" \
  -d '{"thread_id":"thread_123","message":"What is my name?"}'
# Expected: "Your name is Alice!"
```

### Test Case 2: Multiple Threads
```bash
# Thread 1
curl -X POST ".../chat" -d '{"message":"I like pizza"}'
# Response: {"thread_id":"thread_aaa",...}

# Thread 2
curl -X POST ".../chat" -d '{"message":"I like sushi"}'
# Response: {"thread_id":"thread_bbb",...}

# Continue Thread 1
curl -X POST ".../chat" -d '{"thread_id":"thread_aaa","message":"What do I like?"}'
# Expected: "You like pizza!"
```

### Test Case 3: Long Conversations
```bash
# Send 20 messages in same thread
# Verify: All context is maintained
# Verify: Token usage is reasonable (consider truncation)
```

---

## Migration Path

### Backward Compatibility

**Option 1: Keep both endpoints**
- `/x-app/{agentId}/chat` - Stateless (current behavior)
- `/x-app/{agentId}/threads/*` - Stateful (new)

**Option 2: Enhance existing endpoint**
- If `thread_id` provided → Use thread mode
- If no `thread_id` → Stateless mode (backward compatible)

**Recommendation:** Option 2 for simpler API surface

---

## Example: Full Conversation Flow

```javascript
// Frontend implementation example

let currentThreadId = null;

async function sendMessage(message) {
  const response = await fetch(`${API_BASE}/x-app/test-agent/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MANAGER_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      thread_id: currentThreadId,  // null for first message
      message: message
    })
  });
  
  const data = await response.json();
  currentThreadId = data.thread_id;  // Store for next message
  
  return data.message.content;
}

// Usage
await sendMessage("My name is Alice");  // Creates thread
await sendMessage("What is my name?");  // Uses same thread → "Your name is Alice!"
```

---

## Questions for Backend Team

1. **Storage:** Do you prefer PostgreSQL, Redis, or another solution for thread storage?
2. **Retention:** How long should threads be kept? (Suggest: 30 days)
3. **Limits:** Max messages per thread? (Suggest: 100 messages)
4. **Token Management:** Should we truncate old messages when context gets too long?
5. **Authentication:** Should threads be user-scoped or just agent-scoped?
6. **Timeline:** What's the estimated implementation time?

---

## References

- **OpenAI Assistants API:** https://platform.openai.com/docs/assistants/overview
- **OpenAI Threads:** https://platform.openai.com/docs/api-reference/threads
- **Current API Test Results:** See `CHAT-FIX-REQUIRED.md`
- **Frontend Implementation:** See `app.js` and `api.js`

---

## Current Workaround (Frontend-Side)

Until backend implements threads, frontend can maintain history client-side:

```javascript
// Temporary solution - not ideal
let conversationHistory = [];

async function sendMessage(message) {
  conversationHistory.push({ role: "user", content: message });
  
  const response = await fetch(`${API_BASE}/x-app/test-agent/chat`, {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({
      messages: conversationHistory  // Send full history
    })
  });
  
  const data = await response.json();
  const reply = data.choices[0].message.content;
  
  conversationHistory.push({ role: "assistant", content: reply });
  
  return reply;
}
```

**Problems with client-side approach:**
- ❌ Lost on page refresh
- ❌ Not shared across devices
- ❌ Frontend must manage token limits
- ❌ No server-side analytics
- ❌ Inconsistent across clients

---

## Summary

**Request:** Implement server-side thread management for chat conversations

**Why:** Current stateless API cannot maintain conversation context

**Proposed Solution:** Thread-based API similar to OpenAI Assistants

**Impact:** 
- Better user experience
- Simpler frontend code
- Persistent conversations
- Multi-device support

**Priority:** HIGH - Core feature for any chat application

---

**Status:** 🟡 Awaiting Backend Team Response  
**Contact:** Frontend Team  
**Date:** 2025-11-14
