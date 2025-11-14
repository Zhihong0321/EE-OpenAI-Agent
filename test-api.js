import 'dotenv/config'

const base = process.env.API_BASE || 'http://localhost:' + (process.env.PORT || 3000)

const run = async () => {
  const health = await fetch(base + '/health')
  const healthJson = await health.json()
  console.log('health', healthJson.status)

  const invoke = await fetch(base + '/x-app/testapp/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Say hello.' }] })
  })
  const invokeJson = await invoke.json()
  console.log('invoke.model', invokeJson.model)
  console.log('invoke.message.role', invokeJson.choices?.[0]?.message?.role)
  console.log('invoke.message.len', (invokeJson.choices?.[0]?.message?.content || '').length)
}

run().catch(e => { console.error(e); process.exit(1) })