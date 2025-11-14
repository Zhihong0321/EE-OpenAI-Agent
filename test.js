import dotenv from 'dotenv';
import { runWorkflow } from './agent.js';

// Load environment variables
dotenv.config();

console.log('🧪 Testing OpenAI Agent...\n');
console.log(`🔗 API Base URL: ${process.env.OPENAI_BASE_URL}`);
console.log(`🔑 API Key: ${process.env.OPENAI_API_KEY?.substring(0, 20)}...\n`);

const testQuestion = "What is the capital of France?";

console.log(`❓ Test Question: ${testQuestion}\n`);
console.log('🔄 Processing...\n');

try {
  const result = await runWorkflow(testQuestion);
  
  console.log('✅ Success!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 Type: ${result.type}`);
  console.log(`✏️  Rewritten Query: ${result.rewrittenQuery}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n🤖 Agent Answer:\n${result.answer}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.stack) {
    console.error('\n📋 Stack trace:', error.stack);
  }
}
