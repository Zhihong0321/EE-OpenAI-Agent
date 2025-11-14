import 'dotenv/config'
import { OpenAI } from 'openai'

export const getProviderClient = async () => {
  const baseURL = process.env.THIRD_PARTY_BASE_URL || process.env.OPENAI_BASE_URL
  const apiKey = process.env.THIRD_PARTY_API_KEY || process.env.OPENAI_API_KEY
  if (!baseURL) throw new Error('Missing THIRD_PARTY_BASE_URL')
  if (!apiKey) throw new Error('Missing THIRD_PARTY_API_KEY')
  return new OpenAI({ apiKey, baseURL })
}

export const createEmbedding = async (inputs, model = 'text-embedding-3-small') => {
  const client = await getProviderClient()
  const res = await client.embeddings.create({ model, input: inputs })
  return res.data.map(d => d.embedding)
}

export default { getProviderClient, createEmbedding }