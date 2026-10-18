import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const config = require('./.lighthouserc.cjs')

export default config
