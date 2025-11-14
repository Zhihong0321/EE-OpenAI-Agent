import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

console.log('🔍 Checking available models...\n');

try {
  const models = await client.models.list();
  console.log('✅ Available models:');
  models.data.forEach(model => {
    console.log(`  - ${model.id}`);
  });
} catch (error) {
  console.error('❌ Error:', error.message);
}
