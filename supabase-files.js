import fs from 'node:fs/promises'
import path from 'node:path'

const requireEnv = () => {
  const url = process.env.SUPABASE_URL
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Missing SUPABASE_URL')
  if (!publishable && !secret) throw new Error('Missing SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY')
}

const getClient = async (role = 'secret') => {
  requireEnv()
  const { createClient } = await import('@supabase/supabase-js')
  const url = process.env.SUPABASE_URL
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || publishable
  const key = role === 'secret' ? secret : publishable
  return createClient(url, key)
}

export const ensureBucket = async (bucket, options = {}) => {
  const client = await getClient('secret')
  const defaultOptions = { public: false }
  const { data, error } = await client.storage.getBucket(bucket)
  if (error && error.message) {
    const { error: createErr } = await client.storage.createBucket(bucket, { ...defaultOptions, ...options })
    if (createErr) throw createErr
    return bucket
  }
  if (!data) {
    const { error: createErr } = await client.storage.createBucket(bucket, { ...defaultOptions, ...options })
    if (createErr) throw createErr
  }
  return bucket
}

export const uploadFile = async (bucket, filePath, destPath, opts = {}) => {
  const client = await getClient(opts.role || 'secret')
  const buffer = await fs.readFile(filePath)
  const name = destPath || path.basename(filePath)
  const { data, error } = await client.storage.from(bucket).upload(name, buffer, { upsert: !!opts.upsert, contentType: opts.contentType })
  if (error) throw error
  return data
}

export const updateFile = async (bucket, filePath, destPath, opts = {}) => {
  return uploadFile(bucket, filePath, destPath, { ...opts, upsert: true })
}

export const listFiles = async (bucket, prefix = '', opts = {}) => {
  const client = await getClient(opts.role || 'secret')
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: opts.limit, offset: opts.offset, sortBy: opts.sortBy })
  if (error) throw error
  return data
}

export const deleteFile = async (bucket, fileKey, opts = {}) => {
  const client = await getClient(opts.role || 'secret')
  const { data, error } = await client.storage.from(bucket).remove([fileKey])
  if (error) throw error
  return data
}

export const getSignedUrl = async (bucket, fileKey, expiresIn = 3600, opts = {}) => {
  const client = await getClient(opts.role || 'service')
  const { data, error } = await client.storage.from(bucket).createSignedUrl(fileKey, expiresIn)
  if (error) throw error
  return data
}

export const getPublicUrl = async (bucket, fileKey, opts = {}) => {
  const client = await getClient(opts.role || 'anon')
  const { data } = await client.storage.from(bucket).getPublicUrl(fileKey)
  return data
}

export const downloadFile = async (bucket, fileKey, opts = {}) => {
  try {
    const client = await getClient('secret')
    const { data, error } = await client.storage.from(bucket).download(fileKey)
    if (!error && data) {
      const buf = Buffer.from(await data.arrayBuffer())
      return buf
    }
  } catch {}
  try {
    const signed = await getSignedUrl(bucket, fileKey, opts.expiresIn || 300, opts)
    const res = await fetch(signed.signedUrl)
    if (!res.ok) throw new Error(`Failed to download: ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {}
  const pub = await getPublicUrl(bucket, fileKey, { role: 'anon' })
  const res = await fetch(pub.publicUrl)
  if (!res.ok) throw new Error('Object not found')
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export default {
  ensureBucket,
  uploadFile,
  updateFile,
  listFiles,
  deleteFile,
  getSignedUrl,
  getPublicUrl,
  downloadFile,
}
