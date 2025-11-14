import fs from 'node:fs'
import path from 'node:path'

const file = path.join(process.cwd(), 'scripts', 'schema.sql')
const sql = fs.readFileSync(file, 'utf8')
console.log(sql)