import dotenv from 'dotenv';
import readline from 'readline';
import { loadKnowledgeFiles, runWorkflowWithFiles } from './simple-agent-with-files.js';

// Load environment variables
dotenv.config();

// Validate API key and base URL
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY not found in .env file');
  console.error('Please create a .env file with your OpenAI API key');
  console.error('See .env.example for reference');
  process.exit(1);
}

if (!process.env.OPENAI_BASE_URL) {
  console.error('❌ Error: OPENAI_BASE_URL not found in .env file');
  console.error('Please add your API provider base URL to .env file');
  process.exit(1);
}

console.log(`🔗 Using API: ${process.env.OPENAI_BASE_URL}`);

// Load knowledge base files (add your files here)
const knowledgeFiles = ['test-upload.txt'];
loadKnowledgeFiles(knowledgeFiles);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🤖 OpenAI Agent App Started (with Knowledge Base)');
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
      
      const result = await runWorkflowWithFiles(question);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📋 Type: ${result.type}`);
      console.log(`✏️  Rewritten Query: ${result.rewrittenQuery}`);
      console.log(`📚 Used Knowledge Base: ${result.usedKnowledgeBase ? 'Yes' : 'No'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`\n🤖 Agent: ${result.answer}\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
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
