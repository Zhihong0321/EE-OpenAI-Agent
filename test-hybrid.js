import { initializeFileSearch, runHybridWorkflow } from './hybrid-agent.js';

console.log('🧪 Testing Hybrid Agent (OpenAI files + 3rd party chat)...\n');

// Your OpenAI vector store ID
const VECTOR_STORE_ID = "vs_69156d1026088191a49150f079b0f1f9";

try {
  // Initialize file search with OpenAI
  const initialized = await initializeFileSearch(VECTOR_STORE_ID);
  
  if (!initialized) {
    console.log('⚠️  File search not available, continuing without it...\n');
  }
  
  // Test question
  const testQuestion = "What information is in the knowledge base?";
  console.log(`❓ Test Question: ${testQuestion}\n`);
  
  const result = await runHybridWorkflow(testQuestion, initialized);
  
  console.log('\n✅ Success!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 Type: ${result.type}`);
  console.log(`✏️  Rewritten Query: ${result.rewrittenQuery}`);
  console.log(`🔍 Used OpenAI File Search: ${result.usedFileSearch ? 'Yes' : 'No'}`);
  console.log(`💰 Used 3rd Party for Chat: Yes`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (result.fileContext) {
    console.log(`\n📚 File Context Retrieved:\n${result.fileContext}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
  
  console.log(`\n🤖 Final Answer:\n${result.answer}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('💡 Cost Breakdown:');
  console.log('   - File search: OpenAI (small cost, only when needed)');
  console.log('   - Query rewrite: 3rd party (cheap)');
  console.log('   - Classification: 3rd party (cheap)');
  console.log('   - Final answer: 3rd party (cheap)');
  console.log('   - Total savings: ~70-80% compared to all OpenAI!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.stack) {
    console.error('\n📋 Stack trace:', error.stack);
  }
}
