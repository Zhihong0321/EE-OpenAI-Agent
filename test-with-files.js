import { loadKnowledgeFiles, runWorkflowWithFiles } from './simple-agent-with-files.js';

console.log('🧪 Testing Agent with Knowledge Base...\n');

// Load knowledge files
loadKnowledgeFiles(['test-upload.txt']);

// Test question about the file
const testQuestion = "What products does the company offer?";

console.log(`❓ Test Question: ${testQuestion}\n`);

try {
  const result = await runWorkflowWithFiles(testQuestion);
  
  console.log('\n✅ Success!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 Type: ${result.type}`);
  console.log(`✏️  Rewritten Query: ${result.rewrittenQuery}`);
  console.log(`📚 Used Knowledge Base: ${result.usedKnowledgeBase ? 'Yes' : 'No'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n🤖 Agent Answer:\n${result.answer}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.stack) {
    console.error('\n📋 Stack trace:', error.stack);
  }
}
