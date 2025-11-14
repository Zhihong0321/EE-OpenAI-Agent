import { runSimpleWorkflow } from './simple-agent.js';

console.log('🧪 Testing Simple Agent...\n');

const testQuestion = "What is the capital of France?";

console.log(`❓ Test Question: ${testQuestion}\n`);

try {
  const result = await runSimpleWorkflow(testQuestion);
  
  console.log('\n✅ Success!\n');
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
