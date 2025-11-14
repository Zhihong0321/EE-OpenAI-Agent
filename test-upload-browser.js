import fs from 'fs'
import FormData from 'form-data'
import fetch from 'node-fetch'

const base = 'http://localhost:3001'

const run = async () => {
  // Create a test file
  const testContent = 'This is a test file uploaded from browser-style endpoint'
  fs.writeFileSync('test-browser-upload.txt', testContent)
  
  // Create FormData
  const formData = new FormData()
  formData.append('file', fs.createReadStream('test-browser-upload.txt'))
  formData.append('folder', 'test-folder')
  formData.append('upsert', 'true')
  
  console.log('Uploading file via browser endpoint...')
  
  const response = await fetch(base + '/manager/files/upload-browser', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-token',
      ...formData.getHeaders()
    },
    body: formData
  })
  
  const result = await response.json()
  console.log('Upload result:', result)
  
  // Cleanup
  fs.unlinkSync('test-browser-upload.txt')
}

run().catch(e => { console.error('Error:', e.message); process.exit(1) })
