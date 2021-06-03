require('dotenv').config()
const { spawnSync } = require('child_process')
const cwd = '/home/codabool/scripts/alexa'

try {
  const { execSync } = require('child_process')
  const stdout = execSync('ls')
} catch (error) {
  console.log(error)
}