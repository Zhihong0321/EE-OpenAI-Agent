import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

console.log('🔍 Checking file/vector store capabilities...\n');

// Check if vector stores are supported
try {
  console.log('1️⃣ Checking vector stores...');
  const vectorStores = await client.beta.vectorStores.list({ limit: 5 });
  console.log('✅ Vector stores supported!');
  console.log(`   Found ${vectorStores.data.length} vector stores:`);
  vectorStores.data.forEach(vs => {
    console.log(`   - ${vs.id}: ${vs.name || 'Unnamed'} (${vs.file_counts.total} files)`);
  });
} catch (error) {
  console.log('❌ Vector stores not supported:', error.message);
}

console.log('');

// Check if files are supported
try {
  console.log('2️⃣ Checking files...');
  const files = await client.files.list();
  console.log('✅ Files supported!');
  console.log(`   Found ${files.data.length} files:`);
  files.data.slice(0, 5).forEach(file => {
    console.log(`   - ${file.id}: ${file.filename} (${file.purpose})`);
  });
} catch (error) {
  console.log('❌ Files not supported:', error.message);
}

console.log('');

// Check if assistants are supported
try {
  console.log('3️⃣ Checking assistants API...');
  const assistants = await client.beta.assistants.list({ limit: 1 });
  console.log('✅ Assistants API supported!');
} catch (error) {
  console.log('❌ Assistants API not supported:', error.message);
}
