import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

// Simple agent workflow without hosted tools
export const runSimpleWorkflow = async (inputText) => {
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
        content: "Classify the question into one of these categories: 'q-and-a' (simple factual questions), 'fact-finding' (requires research), or 'other' (unclear/needs clarification). Respond with ONLY the category name."
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
  } else if (category.includes('fact-finding')) {
    systemPrompt = "Provide a detailed answer with supporting evidence. Include a concise summary followed by bullet points of key facts.";
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
    answer: answer
  };
};
