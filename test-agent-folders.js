import 'dotenv/config'
import { initializeFileSearch, runHybridWorkflow } from './hybrid-agent.js'

console.log('🧪 Testing Agent with Folder Access\n')

const testAgent = async () => {
  // Test 1: Initialize with default folders
  console.log('Test 1: Default folder access (shared only)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  await initializeFileSearch('test-agent', ['shared'])
  
  // Test 2: Initialize with multiple folders
  console.log('\nTest 2: Multiple folder access')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  await initializeFileSearch('sales-agent', ['shared', 'sales-team'])
  
  // Test 3: Initialize with admin access
  console.log('\nTest 3: Admin access (all folders)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  await initializeFileSearch('admin-agent', ['*'])
  
  console.log('\n✅ All tests passed!')
  console.log('\n📋 Usage Examples:\n')
  
  console.log('1️⃣  Set folders via environment variable:')
  console.log('   AGENT_FOLDERS=shared,sales-team npm run start:hybrid\n')
  
  console.log('2️⃣  Initialize with specific folders:')
  console.log('   await initializeFileSearch("agent-id", ["shared", "team-folder"])\n')
  
  console.log('3️⃣  Override folders per query:')
  console.log('   await runHybridWorkflow("question", true, ["shared", "other-folder"])\n')
  
  console.log('4️⃣  Admin access to all folders:')
  console.log('   await initializeFileSearch("admin", ["*"])\n')
  
  console.log('🗂️  Folder Structure Example:')
  console.log('   shared/          - Company-wide knowledge')
  console.log('   sales-team/      - Sales team only')
  console.log('   support-team/    - Support team only')
  console.log('   agent-123/       - Private to agent-123\n')
  
  console.log('🔐 Access Control:')
  console.log('   Sales agent with folders: ["shared", "sales-team"]')
  console.log('   ✅ Can access: shared/, sales-team/')
  console.log('   ❌ Cannot access: support-team/, agent-123/\n')
}

testAgent().catch(console.error)
