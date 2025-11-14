const base = 'https://ee-openai-agent-production.up.railway.app'

const run = async () => {
  console.log('Testing Railway deployment...\n')
  
  // Test health
  const health = await fetch(base + '/health')
  const healthJson = await health.json()
  console.log('✓ Health:', healthJson.status)
  
  // Test diagnostics
  const diag = await fetch(base + '/diagnostics')
  const diagJson = await diag.json()
  console.log('✓ Diagnostics:', {
    supabase: diagJson.supabaseUrl,
    storage: diagJson.storageOk,
    schema: diagJson.schemaOk
  })
  
  // Test agent invoke
  console.log('\nTesting agent invoke...')
  const invoke = await fetch(base + '/x-app/test-agent/invoke', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': 'Bearer test-token' 
    },
    body: JSON.stringify({ 
      model: 'gpt-4o-mini', 
      messages: [{ role: 'user', content: 'What is 2+2? Answer briefly.' }] 
    })
  })
  
  const invokeJson = await invoke.json()
  
  if (invokeJson.error) {
    console.log('✗ Error:', invokeJson.error)
  } else {
    console.log('✓ Model:', invokeJson.model)
    console.log('✓ Response:', invokeJson.choices?.[0]?.message?.content)
  }
}

run().catch(e => { console.error('Error:', e.message); process.exit(1) })
