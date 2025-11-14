/**
 * Test the production agent endpoint
 * 
 * Run: node test-production-agent.js
 */

const BASE_URL = 'https://ee-openai-agent-production.up.railway.app'
const MANAGER_TOKEN = process.env.MANAGER_TOKEN || 'test-token'

async function testChat() {
  console.log('🧪 Testing production agent...')
  console.log(`   URL: ${BASE_URL}/x-app/main-agent/chat\n`)
  
  try {
    const response = await fetch(`${BASE_URL}/x-app/main-agent/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MANAGER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Say hello and tell me your agent ID!' }
        ]
      })
    })

    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Chat endpoint works!')
      console.log(`\n💬 Response:`)
      console.log(`   ${data.choices?.[0]?.message?.content}\n`)
      return true
    } else {
      console.log('❌ Chat failed!')
      console.log(`   Error: ${data.error?.message}`)
      console.log(`   Code: ${data.error?.code}`)
      console.log('\n📋 Full response:')
      console.log(JSON.stringify(data, null, 2))
      return false
    }
  } catch (error) {
    console.log('❌ Request failed!')
    console.log(`   Error: ${error.message}`)
    return false
  }
}

async function checkAgentExists() {
  console.log('🔍 Checking if agent exists...')
  
  try {
    const response = await fetch(`${BASE_URL}/manager/agents/main-agent`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MANAGER_TOKEN}`
      }
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Agent found in registry')
      console.log(`   Name: ${data.config?.name}`)
      console.log(`   Folders: ${data.config?.folders?.join(', ')}\n`)
      return true
    } else {
      console.log('❌ Agent not found!')
      console.log(`   Error: ${data.error?.message}\n`)
      return false
    }
  } catch (error) {
    console.log('❌ Check failed!')
    console.log(`   Error: ${error.message}\n`)
    return false
  }
}

async function main() {
  console.log('🤖 Production Agent Test\n')
  
  const exists = await checkAgentExists()
  
  if (!exists) {
    console.log('⚠️  Agent not registered. Run: node register-agent.js')
    process.exit(1)
  }
  
  const works = await testChat()
  
  if (works) {
    console.log('🎉 Everything is working! Frontend can connect.')
  } else {
    console.log('⚠️  Something is wrong. Check the error above.')
    process.exit(1)
  }
}

main()
