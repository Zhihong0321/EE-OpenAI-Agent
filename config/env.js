import 'dotenv/config'

export const requireRuntimeEnv = () => {
  const errs = []
  const must = [
    ['THIRD_PARTY_BASE_URL', process.env.THIRD_PARTY_BASE_URL],
    ['THIRD_PARTY_API_KEY', process.env.THIRD_PARTY_API_KEY]
  ]
  for (const [name, val] of must) if (!val) errs.push(name)
  if (errs.length) throw new Error('Missing env: ' + errs.join(', '))
}

export default { requireRuntimeEnv }