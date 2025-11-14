/**
 * Test both /invoke and /chat endpoints
 * 
 * Run: node test-chat-endpoint.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const MANAGER_TOKEN = process.env.MANAGER_TOKEN || 'test-token'

async function testEndpoint(endpoint, appId) {
  console.log(`\n🧪 Testing ${endpoint}...`)
  
  const url = `${BASE_URL}/x-app/${appId}${endpoint}`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MANAGER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Say hello!' }
        ]
      })
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ ${endpoint} works!`)
      console.log(`   Response: ${data.choices?.[0]?.message?.content?.substring(0, 50)}...`)
      return true
    } else {
      console.log(`❌ ${endpoint} failed:`, data.error?.message)
      return false
    }
  } catch (error) {
    console.log(`❌ ${endpoint} error:`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Testing chat endpoints...')
  console.log(`   Base URL: ${BASE_URL}`)
  
  const appId = 'test-agent'
  
  const invokeWorks = await testEndpoint('/invoke', appId)
  const chatWorks = await testEndpoint('/chat', appId)
  
  console.log('\n📊 Results:')
  console.log(`   /invoke: ${invokeWorks ? '✅' : '❌'}`)
  console.log(`   /chat:   ${chatWorks ? '✅' : '❌'}`)
  
  if (invokeWorks && chatWorks) {
    console.log('\n🎉 Both endpoints working! Frontend can use either one.')
  } else {
    console.log('\n⚠️  Some endpoints failed. Check server logs.')
    process.exit(1)
  }
}

main()
