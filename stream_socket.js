require('dotenv').config()
const io = require("socket.io-client")
const { NodeSSH } = require('node-ssh')
const ssh = new NodeSSH()

const token = process.env.SOCKET_API_TOKEN
const password = process.env.MOM_PASSWORD
const cwd = '/home/codabool/scripts/alexa'

//io.set('heartbeat timeout', Number.MAX_VALUE) // seconds
//io.set('heartbeat interval', 5000)
const streamlabs = io(`https://sockets.streamlabs.com?token=${token}`, {transports: ['websocket']})


streamlabs.on('connect', () => console.log('connected!'))
streamlabs.on("connect_error", err => console.log(err))

streamlabs.on('event', e => {
  console.log('event', e)
  let routine = ''
  let message = ''
  let newEvent = ''
  if (e.type === 'subscription') {
//    message = e.message[0].name + ' joined UwU gang'
    routine = 'donation'
  } else if (e.type === 'follow') {
    message = 'Welcome ' + e.message[0].name
    routine = 'basic'
  } else if (e.type === 'resub') {
    routine = 'basic'
    message = e.message[0].name + ' resubbed'
    if (e.message[0].streak_months > 6) {
      message = e.message[0].name + ' is on a ' + e.message[0].streak_months + ' month streak, pog'
      if (e.message[0].streak_months > 12) {
        message = e.message[0].name + ' is on a ' + e.message[0].streak_months + ' month streak, pog u pog'
        if (e.message[0].streak_months > 24) {
          message = 'simp alert' + e.message[0].name + ' is on a ' + e.message[0].streak_months + ' month streak'
        }
      }
    }
  } else if (e.type === 'donation') {
    if (e.message[0].amount > 20) { // amount in dollars
      routine = 'special'
      message = 'pog ' + e.message[0].name + ' donated ' + e.message[0].amount + ' dollars'
    } else if (e.message[0].amount > 5) { // amount in dollars
      routine = 'donation'
      message = e.message[0].name + ' donated ' + e.message[0].amount + ' dollars'
    } else {
      routine = 'basic'
    }
  } else if (e.type === 'host') {
    routine = 'basic'
    if (e.message[0].viewers > 20) {
      routine = 'donation'
      message = e.message[0].name + ' just hosted'
    }
    if (e.message[0].viewers > 100) {
      routine = 'special'
      message = e.message[0].name + ' just hosted with ' + e.message[0].viewers + ' viewers'
    }
    if (e.message[0].name === 'linusfrog') {
      message = 'linus and ' + e.message[0].viewers + ' froggies join the chat'
    }
    if (e.message[0].name === 'trashabag') {
      message = 'trasha and ' + e.message[0].viewers + ' pieces of trash join the chat'
    }
  } else if (e.type === 'bits') {
    if (Number(e.message[0].amount) > 2000) { // $20
      routine = 'special'
      message = 'pog ' + e.message[0].name + ' gave ' + e.message[0].amount + ' bits'
    } else if (Number(e.message[0].amount) > 500) { // $5
      routine = 'donation'
      message = e.message[0].name + ' gave ' + e.message[0].amount + ' bits'
    } else {
      routine = 'basic'
    }
  } else if (e.type === 'raid') {
    routine = 'basic'
    if (e.message[0].raiders > 20) {
      routine = 'donation'
      message = e.message[0].name + ' just raided'
    }
    if (e.message[0].raiders > 100) {
      routine = 'special'
      message = e.message[0].name + ' just raided with ' + e.message[0].viewers + ' viewers'
    }
    if (e.message[0].name === 'linusfrog') {
      message = 'linus and ' + e.message[0].raiders + ' froggies joined the chat'
    }
    if (e.message[0].name === 'codabool') {
      message = 'coda and ' + e.message[0].raiders + ' nerds joined the chat'
    }
    if (e.message[0].name === 'trashabag') {
      message = 'trasha and ' + e.message[0].raiders + ' pieces of trash joined the chat'
    }
  } else if (e.type === 'alertPlaying') {
    if (e.message.rawAmount > 5) {
       console.log('amount =' e.message.rawAmount)
    }
  } else { // some other event
    // console.log('strange event', e)
    newEvent = e.type
  }

  console.log(e.type, '|', routine, 'routine')
  if (typeof e.message === 'array') {
    if (e.message[0].raiders) {
      console.log(e.message[0].raiders, 'raiders')
    }
    if (e.message[0].viewers) {
      console.log(e.message[0].viewers, 'viewers')
    }
    if (e.message[0].amount) {
      console.log(e.message[0].amount, 'amount')
    }
  }

  if (routine) {
    ssh.connect({
      host: '192.168.1.25',
      username: 'codabool',
      port: 22,
      password,
      tryKeyboard: true,
    })
      .then(() => {
        ssh.execCommand('echo $(( `expr $(date +%s) - $(head -n 1 lastRan)` > 12 ))', { cwd })
          .then(response => {
            // will stdout a 0 = too soon
            // will stdout a 1 = ready
            if (response.stdout === '1') {
              if (newEvent) { // log any unhandled events
                ssh.execCommand(`echo ${JSON.stringify(newEvent)} >> log`, { cwd })
                    .then(res => console.log('creating log', res.stdout))
                    .catch(err => console.log('ERROR: in creating log |', err))
              }
              ssh.execCommand(`./local.sh -d 'Echo Office' -e automation:${routine}`, { cwd })
                .then(res => {
                  ssh.execCommand('touch resetSoon', { cwd })
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
          setTimeout(() => {
            if (message) {
              ssh.execCommand(`./local.sh -d 'Echo Office' -e speak:'${message}'`, { cwd })
                .then(res => console.log('said =', message))
                .catch(err => console.log('new', err))
            }
          }, 5000)
      })
      .catch(err => {
        console.log(err)
      })
  }
})


// ====== EVENTS ======
// follow 
//   e.message[0].name
// subscription
//   e.message[0].name
//   e.message[0].months
//   e.message[0].message
// resub
//   e.message[0].name
//   e.message[0].months
//   e.message[0].streak_months
//   e.message[0].message
// donation
//   e.message[0].name
//   e.message[0].amount
//   e.message[0].message
// hosting
//   e.message[0].name
//   e.message[0].viewers
// bits
//   e.message[0].name
//   e.message[0].amount (string)
//   e.message[0].message
// raid
//   e.message[0].name
//   e.message[0].raiders
