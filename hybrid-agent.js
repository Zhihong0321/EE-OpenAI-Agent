import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { searchSupabase } from './supabase-vector.js'

dotenv.config();

// Two separate clients
const thirdPartyClient = new OpenAI({
  apiKey: process.env.THIRD_PARTY_API_KEY,
  baseURL: process.env.THIRD_PARTY_BASE_URL
});

let supabaseAgentId = null
let agentFolders = ['shared'] // Default folder access

// Store assistant and thread IDs for file search
let fileSearchAssistant = null;
let currentThread = null;

/**
 * Initialize agent with file search capability and folder access
 * @param {string} agentId - Agent ID for scoping
 * @param {string[]} folders - Folders this agent can access (default: ['shared'])
 */
export const initializeFileSearch = async (agentId, folders = ['shared']) => {
  console.log('📚 Initializing Supabase file search...')
  supabaseAgentId = agentId
  agentFolders = folders
  fileSearchAssistant = true
  console.log(`✅ File search ready (folders: ${folders.join(', ')})\n`)
  return true
}

/**
 * Search files using Supabase vector store with folder restrictions
 * @param {string} query - Search query
 * @param {string[]} folders - Optional folder override
 * @returns {Promise<string>} - Retrieved information from files
 */
const searchFiles = async (query, folders = null) => {
  if (!fileSearchAssistant || !supabaseAgentId) throw new Error('File search not initialized')
  const searchFolders = folders || agentFolders
  console.log(`🔍 Searching files in folders: ${searchFolders.join(', ')}...`)
  const results = await searchSupabase({ 
    agentId: supabaseAgentId, 
    query, 
    topK: 5,
    folders: searchFolders
  })
  const text = results.map(r => `[${r.folder}] ${r.content}`).join('\n\n')
  console.log(`✅ Found ${results.length} results\n`)
  return text
}

/**
 * Hybrid workflow: Supabase for file search, 3rd party for chat
 * @param {string} inputText - User question
 * @param {boolean} useFileSearch - Whether to search files
 * @param {string[]} folders - Optional folder override for this query
 * @returns {Promise<object>} - Result object
 */
export const runHybridWorkflow = async (inputText, useFileSearch = true, folders = null) => {
  console.log('🔄 Step 1: Rewriting query (3rd party)...');
  
  // Step 1: Query Rewrite - Use 3rd party (cheap)
  const rewriteResponse = await thirdPartyClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Rewrite the user's question to be more specific and relevant. Return only the rewritten question."
      },
      {
        role: "user",
        content: `Original question: ${inputText}`
      }
    ]
  });
  
  const rewrittenQuery = rewriteResponse.choices[0].message.content;
  console.log(`✏️  Rewritten: ${rewrittenQuery}\n`);
  
  // Step 2: Classify - Use 3rd party (cheap)
  console.log('🔄 Step 2: Classifying query type (3rd party)...');
  const classifyResponse = await thirdPartyClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Classify the question: 'q-and-a' (simple factual), 'fact-finding' (needs research), or 'other' (unclear). Respond with ONLY the category name."
      },
      {
        role: "user",
        content: `Question: ${rewrittenQuery}`
      }
    ]
  });
  
  const category = classifyResponse.choices[0].message.content.trim().toLowerCase();
  console.log(`📋 Category: ${category}\n`);
  
  // Step 3: Get file context if needed - Use Supabase (file search)
  let fileContext = '';
  let searchedFolders = [];
  if (useFileSearch && fileSearchAssistant && !category.includes('other')) {
    try {
      searchedFolders = folders || agentFolders;
      fileContext = await searchFiles(rewrittenQuery, searchedFolders);
    } catch (error) {
      console.log('⚠️  File search failed, continuing without it:', error.message);
    }
  }
  
  // Step 4: Generate answer - Use 3rd party (cheap)
  console.log('🔄 Step 3: Generating answer (3rd party)...');
  let systemPrompt;
  
  if (category.includes('q-and-a')) {
    systemPrompt = "Answer the user's question concisely. Use bullet points and summarize the answer up front.";
  } else if (category.includes('fact-finding')) {
    systemPrompt = "Provide a detailed answer with supporting evidence. Include a concise summary followed by bullet points of key facts.";
  } else {
    systemPrompt = "Ask the user to provide more detail so you can help them better.";
  }
  
  if (fileContext) {
    systemPrompt += "\n\nUse this information from the knowledge base:\n" + fileContext;
  }
  
  const answerResponse = await thirdPartyClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: rewrittenQuery
      }
    ]
  });
  
  const answer = answerResponse.choices[0].message.content;
  
  return {
    type: category,
    rewrittenQuery: rewrittenQuery,
    answer: answer,
    usedFileSearch: fileContext.length > 0,
    searchedFolders: searchedFolders,
    fileContext: fileContext
  };
};
