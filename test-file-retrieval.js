import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import fs from 'fs';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

console.log('🔍 Testing file retrieval methods...\n');

// First, upload a file
console.log('1️⃣ Uploading test file...');
const file = await client.files.create({
  file: fs.createReadStream('test-upload.txt'),
  purpose: 'assistants'
});

console.log(`✅ File uploaded: ${file.id}\n`);

// Method 1: Try using assistants API with file_search
console.log('2️⃣ Testing Assistants API with file_search...');
try {
  const assistant = await client.beta.assistants.create({
    name: "File Search Assistant",
    instructions: "You are a helpful assistant that can search through uploaded files.",
    model: "gpt-4o-mini",
    tools: [{ type: "file_search" }],
    tool_resources: {
      file_search: {
        vector_stores: [{
          file_ids: [file.id]
        }]
      }
    }
  });
  
  console.log('✅ Assistant created with file_search!');
  console.log(`   Assistant ID: ${assistant.id}\n`);
  
  // Create a thread and ask about the file
  const thread = await client.beta.threads.create();
  
  await client.beta.threads.messages.create(thread.id, {
    role: "user",
    content: "What is the company name in the document?"
  });
  
  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id
  });
  
  console.log('⏳ Waiting for response...');
  
  // Poll for completion
  let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
  let attempts = 0;
  while (runStatus.status !== 'completed' && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    attempts++;
    if (runStatus.status === 'failed') {
      console.log('❌ Run failed:', runStatus.last_error);
      break;
    }
  }
  
  if (runStatus.status === 'completed') {
    const messages = await client.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0].text.value;
    console.log('✅ Response:', response);
  }
  
} catch (error) {
  console.log('❌ Assistants API failed:', error.message);
}

console.log('\n3️⃣ Testing direct chat with file context...');
try {
  // Read file content and use it in context
  const fileContent = fs.readFileSync('test-upload.txt', 'utf-8');
  
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Answer questions based on the following document:\n\n" + fileContent
      },
      {
        role: "user",
        content: "What is the company name?"
      }
    ]
  });
  
  console.log('✅ Direct context method works!');
  console.log('   Answer:', response.choices[0].message.content);
  
} catch (error) {
  console.log('❌ Direct context failed:', error.message);
}
