/**
 * Register the main agent with the Manager interface
 * 
 * Run: node register-agent.js
 */

const BASE_URL = process.env.BASE_URL || 'https://ee-openai-agent-production.up.railway.app'
const MANAGER_TOKEN = process.env.MANAGER_TOKEN || 'test-token'

async function registerAgent() {
  console.log('🔧 Registering agent with Manager...')
  console.log(`   Base URL: ${BASE_URL}`)
  
  const agentConfig = {
    id: 'main-agent',
    config: {
      name: 'Main Agent',
      description: 'Primary AI agent with file search capabilities',
      folders: ['shared'],
      model: 'gpt-4o-mini'
    }
  }
  
  try {
    const response = await fetch(`${BASE_URL}/manager/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MANAGER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentConfig)
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Agent registered successfully!')
      console.log('   Agent ID:', data.id)
      console.log('   Created:', data.created_at)
      console.log('\n📋 Agent Details:')
      console.log(JSON.stringify(data, null, 2))
      console.log('\n🚀 You can now use this agent:')
      console.log(`   POST ${BASE_URL}/x-app/${data.id}/chat`)
      console.log(`   POST ${BASE_URL}/x-app/${data.id}/invoke`)
      return data
    } else {
      console.log('❌ Registration failed:', data.error?.message)
      process.exit(1)
    }
  } catch (error) {
    console.log('❌ Error:', error.message)
    process.exit(1)
  }
}

async function verifyAgent(agentId) {
  console.log('\n🔍 Verifying agent registration...')
  
  try {
    const response = await fetch(`${BASE_URL}/manager/agents/${agentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MANAGER_TOKEN}`
      }
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Agent verified!')
      console.log('   Status: Active')
      return true
    } else {
      console.log('⚠️  Agent not found in registry')
      return false
    }
  } catch (error) {
    console.log('⚠️  Verification failed:', error.message)
    return false
  }
}

async function listAllAgents() {
  console.log('\n📋 Listing all registered agents...')
  
  try {
    const response = await fetch(`${BASE_URL}/manager/agents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MANAGER_TOKEN}`
      }
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log(`   Found ${data.length} agent(s)`)
      data.forEach((agent, i) => {
        console.log(`\n   ${i + 1}. ${agent.id}`)
        console.log(`      Name: ${agent.config?.name || 'N/A'}`)
        console.log(`      Created: ${agent.created_at}`)
      })
      return data
    } else {
      console.log('❌ Failed to list agents:', data.error?.message)
      return []
    }
  } catch (error) {
    console.log('❌ Error:', error.message)
    return []
  }
}

async function main() {
  console.log('🤖 Agent Registration Tool\n')
  
  // Register the agent
  const agent = await registerAgent()
  
  // Verify it was registered
  await verifyAgent(agent.id)
  
  // List all agents
  await listAllAgents()
  
  console.log('\n✨ Done! Your agent is ready to use.')
}

main()
