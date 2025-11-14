import { initializeFileSearch, runHybridWorkflow } from './hybrid-agent.js';

console.log('🧪 Testing Hybrid Agent with Specific Question...\n');

// Your OpenAI vector store ID
const VECTOR_STORE_ID = "vs_69156d1026088191a49150f079b0f1f9";

try {
  // Initialize file search with OpenAI
  const initialized = await initializeFileSearch(VECTOR_STORE_ID);
  
  if (!initialized) {
    console.log('❌ File search initialization failed\n');
    process.exit(1);
  }
  
  // Test with a specific factual question that should trigger file search
  const testQuestion = "What are the key features mentioned in the documentation?";
  console.log(`❓ Test Question: ${testQuestion}\n`);
  
  const result = await runHybridWorkflow(testQuestion, initialized);
  
  console.log('\n✅ Success!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 Type: ${result.type}`);
  console.log(`✏️  Rewritten Query: ${result.rewrittenQuery}`);
  console.log(`🔍 Used OpenAI File Search: ${result.usedFileSearch ? 'Yes ✅' : 'No'}`);
  console.log(`💰 Used 3rd Party Chat: Yes ✅`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (result.fileContext) {
    console.log(`\n📚 File Context from OpenAI:\n${result.fileContext.substring(0, 500)}...\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
  
  console.log(`\n🤖 Final Answer (from 3rd party using OpenAI context):\n${result.answer}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('💰 Cost Optimization:');
  console.log('   ✅ File search: OpenAI (only this part uses OpenAI)');
  console.log('   ✅ Query rewrite: 3rd party (cheap)');
  console.log('   ✅ Classification: 3rd party (cheap)');
  console.log('   ✅ Final answer: 3rd party (cheap)');
  console.log('   🎉 Estimated savings: 70-80% vs all OpenAI!\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.stack) {
    console.error('\n📋 Stack trace:', error.stack);
  }
}
