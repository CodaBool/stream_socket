require('dotenv').config()
const io = require("socket.io-client")
const { NodeSSH } = require('node-ssh')
const ssh = new NodeSSH()

const token = process.env.SOCKET_API_TOKEN
const password = process.env.MOM_PASSWORD
const cwd = '/home/codabool/scripts/alexa'

const streamlabs = io(`https://sockets.streamlabs.com?token=${token}`, {transports: ['websocket']})

streamlabs.on('connect', () => console.log('connected!'))
streamlabs.on("connect_error", err => console.log(err))

streamlabs.on('event', e => {
  let routine = ''
  let message = ''
  let newEvent = ''

  // MOST RECENT UPDATE
  // - Removed follow 
  // - Removed host

  console.log('event', e.type)
  if (e.type === 'subscription') {
    routine = 'special'
  } else if (e.type === 'resub') {
    routine = 'special'
  } else if (e.type === 'donation') {
    if (e.message[0].amount > 5) { // amount in dollars
      routine = 'special'
    }
  } else if (e.type === 'bits') {
    if (Number(e.message[0].amount) > 499) { // $5
      routine = 'special'
    }
  } else if (e.type === 'raid') {
    if (e.message[0].raiders > 20) {
      routine = 'special'
    }
    if (e.message[0].name === 'linusfrog') { // trashabag
      routine = 'frog'
    }
  } else if (e.type === 'alertPlaying') {
  } else { // some other event
    // console.log('strange event', e)
    newEvent = e.type
  }

  // console.log(e.type, '|', routine, 'routine')
  // if (typeof e.message === 'array') {
  //   if (e.message[0].raiders) {
  //     console.log(e.message[0].raiders, 'raiders')
  //   }
  //   if (e.message[0].viewers) {
  //     console.log(e.message[0].viewers, 'viewers')
  //   }
  //   if (e.message[0].amount) {
  //     console.log(e.message[0].amount, 'amount')
  //   }
  // }

  if (routine.length > 0 && !newEvent && e.type !== 'alertPlaying' && e.type !== 'streamlabels' && e.type !== 'streamlabels.underlying') {
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
              // ACTIVATE TO DEBUG
              // if (newEvent) { // log any unhandled events
              //   ssh.execCommand(`echo ${JSON.stringify(newEvent)} >> log`, { cwd })
              //       .then(res => console.log('creating log', res.stdout))
              //       .catch(err => console.log('ERROR: in creating log |', err))
              // }
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
//              ssh.execCommand(`./local.sh -d 'Echo Office' -e speak:'${message}'`, { cwd })
//                .then(res => console.log('said =', message))
//                .catch(err => console.log('new', err))
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
