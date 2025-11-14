/**
 * Test listing all agents
 * 
 * Run: node test-list-agents.js
 */

const BASE_URL = 'https://ee-openai-agent-production.up.railway.app'
const MANAGER_TOKEN = process.env.MANAGER_TOKEN || 'test-token'

async function listAgents() {
  console.log('📋 Listing all agents...')
  console.log(`   URL: ${BASE_URL}/manager/agents`)
  console.log(`   Token: ${MANAGER_TOKEN}\n`)
  
  try {
    const response = await fetch(`${BASE_URL}/manager/agents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MANAGER_TOKEN}`
      }
    })

    console.log(`   Status: ${response.status} ${response.statusText}\n`)
    
    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ Found ${data.length} agent(s):\n`)
      
      if (data.length === 0) {
        console.log('   (No agents registered)')
      } else {
        data.forEach((agent, i) => {
          console.log(`   ${i + 1}. Agent ID: ${agent.id}`)
          console.log(`      Name: ${agent.config?.name || 'N/A'}`)
          console.log(`      Description: ${agent.config?.description || 'N/A'}`)
          console.log(`      Folders: ${agent.config?.folders?.join(', ') || 'N/A'}`)
          console.log(`      Created: ${agent.created_at}`)
          console.log(`      Endpoint: ${BASE_URL}/x-app/${agent.id}/chat\n`)
        })
      }
      
      return data
    } else {
      console.log('❌ Failed to list agents')
      console.log(`   Error: ${data.error?.message}`)
      console.log(`   Code: ${data.error?.code}`)
      console.log('\n📋 Full response:')
      console.log(JSON.stringify(data, null, 2))
      return []
    }
  } catch (error) {
    console.log('❌ Request failed!')
    console.log(`   Error: ${error.message}`)
    return []
  }
}

async function main() {
  console.log('🤖 Agent List Test\n')
  
  const agents = await listAgents()
  
  if (agents.length === 0) {
    console.log('\n⚠️  No agents found. This could mean:')
    console.log('   1. Server was restarted (agents are stored in memory)')
    console.log('   2. Wrong MANAGER_TOKEN')
    console.log('   3. Agents were never registered')
    console.log('\n💡 To register an agent, run: node register-agent.js')
  } else {
    console.log('✨ All agents listed successfully!')
  }
}

main()
