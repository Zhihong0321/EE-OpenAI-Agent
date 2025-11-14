import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import fs from 'fs';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

console.log('📤 Testing file upload...\n');

try {
  // Upload a file
  console.log('1️⃣ Uploading test file...');
  const file = await client.files.create({
    file: fs.createReadStream('test-upload.txt'),
    purpose: 'assistants'
  });
  
  console.log('✅ File uploaded successfully!');
  console.log(`   File ID: ${file.id}`);
  console.log(`   Filename: ${file.filename}`);
  console.log(`   Purpose: ${file.purpose}`);
  console.log(`   Size: ${file.bytes} bytes\n`);
  
  // Try to create a vector store
  console.log('2️⃣ Creating vector store...');
  try {
    const vectorStore = await client.beta.vectorStores.create({
      name: "Test Knowledge Base",
      file_ids: [file.id]
    });
    
    console.log('✅ Vector store created!');
    console.log(`   Vector Store ID: ${vectorStore.id}`);
    console.log(`   Name: ${vectorStore.name}`);
    console.log(`   Status: ${vectorStore.status}\n`);
    
    console.log('📋 Use this vector store ID in your agent:');
    console.log(`   const fileSearch = fileSearchTool(["${vectorStore.id}"])`);
    
  } catch (error) {
    console.log('❌ Vector store creation failed:', error.message);
    console.log('\n💡 Your provider might use a different method for file search.');
    console.log(`   File ID to use: ${file.id}`);
  }
  
} catch (error) {
  console.error('❌ Upload failed:', error.message);
  if (error.response) {
    console.error('   Response:', JSON.stringify(error.response.data, null, 2));
  }
}
