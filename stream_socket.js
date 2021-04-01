require('dotenv').config()
const io = require("socket.io-client")
const { NodeSSH } = require('node-ssh')
const ssh = new NodeSSH()

const token = process.env.SOCKET_API_TOKEN
const password = process.env.MOM_PASSWORD
const cwd = '/home/codabool/scripts/alexa'

console.log(token)
const streamlabs = io(`https://sockets.streamlabs.com?token=${token}`, {transports: ['websocket']})

streamlabs.on('connect', () => console.log('connected!'))
streamlabs.on("connect_error", err => console.log(err))

streamlabs.on('event', e => {
  console.log(e.type)
  let routine = ''
  if (e.type === 'subscription') {
  } else if (e.type === 'follow') {
    routine = 'Switch'
  } else if (e.type === 'resub') {
    if (e.message[0].months > 6) {
      // routine = 'Switch'
    }
    
  } else if (e.type === 'donation') {
    if (e.message[0].amount > 5) { // amount in dollars
      routine = 'Bye'
    }
  } else if (e.type === 'host') {
    
  } else if (e.type === 'bits') {
    if (Number(e.message[0].amount) > 500) { // $5
      routine = 'Sony'
    }
  } else if (e.type === 'raid') {
    
  } else { // some other event
    // routine = something
  }

  if (routine) {
    ssh.connect({
      host: '192.168.1.25',
      username: 'codabool',
      port: 22,
      password,
      tryKeyboard: true,
    })
      .then(res => {
        // console.log(res)
        ssh.execCommand('echo $(( `expr $(date +%s) - $(head -n 1 lastRan)` > 12 ))', { cwd })
          .then(res => {
            // will stdout a 0 = too soon
            // will stdout a 1 = ready
            if (res.stdout === '1') {
              ssh.execCommand(`./local.sh -d 'Echo Bed' -e automation:${routine}`, { cwd })
                .then(res => {
                  ssh.execCommand('touch resetSoon', { cwd })
                    .then(res => {
                      console.log('creating resetSoon', res.stdout)
                    })
                    .catch(err => {
                      console.log('ERROR: in creating resetSoon |', err)
                    })
                  ssh.execCommand('echo "$(date +%s)" > lastRan', { cwd })
                  console.log('STDOUT: ' + res.stdout)
                  console.log('STDERR: ' + res.stderr)
                })
            } else {
              console.log('DEBUG: too soon')
            }
          })
      })
      .catch(err => {
        console.log(err)
      })
  }
})