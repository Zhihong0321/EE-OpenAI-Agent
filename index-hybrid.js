import dotenv from 'dotenv';
import readline from 'readline';
import { initializeFileSearch, runHybridWorkflow } from './hybrid-agent.js';

// Load environment variables
dotenv.config();

// Validate credentials
if (!process.env.THIRD_PARTY_API_KEY || !process.env.THIRD_PARTY_BASE_URL) {
  console.error('❌ Error: 3rd party API credentials not found in .env file');
  process.exit(1);
}

if (!process.env.SUPABASE_URL) {
  console.error('❌ Error: SUPABASE_URL not found in env');
  process.exit(1);
}

console.log('🔗 3rd Party API: ' + process.env.THIRD_PARTY_BASE_URL);
console.log('🔗 Supabase: ' + process.env.SUPABASE_URL + '\n');

const AGENT_ID = process.env.AGENT_ID || 'default';
const AGENT_FOLDERS = process.env.AGENT_FOLDERS 
  ? process.env.AGENT_FOLDERS.split(',').map(f => f.trim())
  : ['shared'];

// Initialize file search
let fileSearchEnabled = false;
console.log('Initializing...\n');

try {
  fileSearchEnabled = await initializeFileSearch(AGENT_ID, AGENT_FOLDERS);
} catch (error) {
  console.log('⚠️  File search initialization failed:', error.message);
  console.log('Continuing without file search...\n');
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🤖 Hybrid OpenAI Agent Started');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('💡 Using Supabase for file search, 3rd party for chat');
console.log(`📚 File search: ${fileSearchEnabled ? 'Enabled' : 'Disabled'}`);
console.log(`🗂️  Folder access: ${AGENT_FOLDERS.join(', ')}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Type your question or "exit" to quit\n');

const askQuestion = () => {
  rl.question('You: ', async (input) => {
    const question = input.trim();

    if (!question) {
      askQuestion();
      return;
    }

    if (question.toLowerCase() === 'exit' || question.toLowerCase() === 'quit') {
      console.log('\n👋 Goodbye!');
      rl.close();
      process.exit(0);
    }

    try {
      console.log('\n🔄 Processing...\n');
      
      const result = await runHybridWorkflow(question, fileSearchEnabled);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📋 Type: ${result.type}`);
      console.log(`✏️  Rewritten Query: ${result.rewrittenQuery}`);
      console.log(`🔍 Used Supabase File Search: ${result.usedFileSearch ? 'Yes' : 'No'}`);
      if (result.usedFileSearch) {
        console.log(`🗂️  Searched Folders: ${result.searchedFolders.join(', ')}`);
      }
      console.log(`💰 Used 3rd Party Chat: Yes`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`\n🤖 Agent: ${result.answer}\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.stack) {
        console.error('\nStack trace:', error.stack);
      }
      console.log('');
    }

    askQuestion();
  });
};

// Start the conversation loop
askQuestion();
