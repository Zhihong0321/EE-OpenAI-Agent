import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import fs from 'fs';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

// Load knowledge base files
let knowledgeBase = '';

export const loadKnowledgeFiles = (filePaths) => {
  console.log('📚 Loading knowledge base files...');
  const contents = [];
  
  for (const filePath of filePaths) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      contents.push(`\n--- File: ${filePath} ---\n${content}`);
      console.log(`   ✅ Loaded: ${filePath}`);
    } catch (error) {
      console.log(`   ❌ Failed to load: ${filePath}`);
    }
  }
  
  knowledgeBase = contents.join('\n\n');
  console.log(`📖 Knowledge base ready (${knowledgeBase.length} characters)\n`);
};

// Agent workflow with file support
export const runWorkflowWithFiles = async (inputText) => {
  console.log('🔄 Step 1: Rewriting query...');
  
  // Step 1: Query Rewrite
  const rewriteResponse = await client.chat.completions.create({
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
  
  // Step 2: Classify
  console.log('🔄 Step 2: Classifying query type...');
  const classifyResponse = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Classify the question into one of these categories: 'q-and-a' (simple factual questions), 'fact-finding' (requires research/analysis), or 'other' (unclear/needs clarification). Respond with ONLY the category name."
      },
      {
        role: "user",
        content: `Question: ${rewrittenQuery}`
      }
    ]
  });
  
  const category = classifyResponse.choices[0].message.content.trim().toLowerCase();
  console.log(`📋 Category: ${category}\n`);
  
  // Step 3: Answer based on category
  console.log('🔄 Step 3: Generating answer...');
  let systemPrompt;
  
  if (category.includes('q-and-a')) {
    systemPrompt = "Answer the user's question concisely. Use bullet points and summarize the answer up front.";
    if (knowledgeBase) {
      systemPrompt += "\n\nUse the following knowledge base to answer:\n" + knowledgeBase;
    }
  } else if (category.includes('fact-finding')) {
    systemPrompt = "Provide a detailed answer with supporting evidence. Include a concise summary followed by bullet points of key facts.";
    if (knowledgeBase) {
      systemPrompt += "\n\nAnalyze the following knowledge base:\n" + knowledgeBase;
    }
  } else {
    systemPrompt = "Ask the user to provide more detail so you can help them better.";
  }
  
  const answerResponse = await client.chat.completions.create({
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
    usedKnowledgeBase: knowledgeBase.length > 0
  };
};
