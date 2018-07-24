const hat = require('hat')
const http = require('http')
const ws = require('ws')
const axios = require('axios')
const logger = require('./logger').default
const dao = require('./dao')

logger.info('----- Socket app init ')

const BASE_HTTP = process.env.ZEOCHAT_BASE_HTTP
const PORT = process.env.ZEOCHAT_PORT_SOCKET

function checkEnvVars () {
  logger.info('BASE_HTTP', BASE_HTTP)
  logger.info('PORT', PORT)
  if (BASE_HTTP == null || PORT == null) {
    logger.error('Environment variables not set correctly')
    process.exit(1)
  }
}
checkEnvVars()
const server = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'})
  res.write('Hello socket root!')
  res.end()
})
var wsServer = new ws.Server({ noServer: true }, function () {
  logger.info('----- Socket app listening on port ' + PORT, 'second comment')
})
server.on('upgrade', function upgrade (request, socket, head) {
  wsServer.handleUpgrade(request, socket, head, function done (ws) {
    wsServer.emit('connection', ws, request)
  })
})
server.listen(PORT)

var guests = {}
var socketIds = []

wsServer.on('connection', onconnection)

function onconnection (peer, req) {
  peer.id = hat()

  guests[peer.id] = peer
  socketIds.push(peer.id)
  var ip = req.connection.remoteAddress
  logger.info('connection', peer.id, ip)

  peer.on('error', onclose.bind(peer))
  peer.on('close', onclose.bind(peer))
  peer.on('message', onmessage.bind(peer))

  peer.send(JSON.stringify({ type: 'id', id: peer.id }), onsend)

  peer.on('ping', function () {
    // console.debug('ping received')
  })
  peer.on('pong', function (data) {
    peer.heartbeatReceived = data.toString('utf8')
    // console.debug('pong received: ', this.id, peer.heartbeatReceived)
  })

  peer.pingInterval = setInterval(function () {
    // console.debug('check previous ping', peer.readyState, peer.heartbeatSent, peer.heartbeatReceived)
    if (peer.heartbeatSent === undefined && peer.heartbeatReceived === undefined) {
      // console.debug('first ping, ok')
    }
    if (peer.heartbeatSent !== peer.heartbeatReceived) {
      // console.debug('differing heartbeats, closing')
      peer.close()
    } else {
      // console.debug('ping send', peer.readyState)
      if (peer.readyState === ws.CONNECTING || peer.readyState === ws.OPEN) {
        var heartbeatSent = hat()
        peer.heartbeatSent = heartbeatSent
        // console.debug('ping data:     ', peer.id, peer.heartbeatSent)
        peer.ping(heartbeatSent)
      }
    }
    // peer.ping('{"kind":"ping"}', function (res) {
    //   console.log('ping result', res)
    // })
  }, 10 * 1000)

  // matchGetCount(function (count) {
  //   logger.info('count', count)
  //   broadcast(JSON.stringify({ tçype: 'count', data: count }))
  // })
}

function onclose () {
  logger.info('close')
  console.log('close ping interval', this.pingInterval)
  clearInterval(this.pingInterval)
  guests[this.id] = null
  var peerId = this.id
  socketIds = socketIds.filter(socketId => socketId !== peerId)

  matchRemoveGuest(this.id)
  removeMonitor(this.id)

  if (this.peerId) {
    var peer = guests[this.peerId]
    if (peer) {
      peer.peerId = null
      peer.send(JSON.stringify({ type: 'end' }), onsend)
      // matchEndChatWithGuest(peer.id)
    }
  }
}

function onmessage (data) {
  logger.info('[' + this.id + ' receive] ' + data + '\n')
  try {
    var message = JSON.parse(data)
  } catch (err) {
    logger.error('Discarding non-JSON message: ' + err)
    return
  }

  if (message.type === 'findMatch') {
    if (!message.interests) return logger.error('unexpected `findMatch` message', message)

    var player = this

    matchFindMatch(player.id, message.interests, function (matchedPeerData) {
      logger.info('matchedPeerData', matchedPeerData)
      var matchedPeerId = matchedPeerData.id
      var commonInterests = matchedPeerData.commonInterests
      if (matchedPeerId !== undefined && matchedPeerId !== null) {
        var matchedPeer = guests[matchedPeerId]

        player.peerId = matchedPeer.id
        matchedPeer.peerId = player.id

        player.send(JSON.stringify({
          type: 'findMatch',
          data: { initiator: true, commonInterests: commonInterests }
        }), onsend)

        matchedPeer.send(JSON.stringify({
          type: 'findMatch',
          data: { commonInterests: commonInterests }
        }), onsend)
      } else {
        logger.info('No match found, waiting for new user to match this user')
      }
    })
  } else if (message.type === 'signal') {
    if (!this.peerId) return logger.error('unexpected `signal` message')
    var peer = guests[this.peerId]
    peer.send(JSON.stringify({ type: 'signal', data: message.data }))
  } else if (message.type === 'end') {
    logger.info('end of conversation between', this.id, this.peerId)
    matchEndChatWithGuest(this.id)
  } else if (message.type === 'register') {
    logger.info('register', this.id)
    matchAddWaitingGuest(this.id, message.interests)
    if (!this.id) return logger.error('unexpected `register` message')
    this.send(JSON.stringify({ type: 'registered', id: this.id }), onsend)
  } else if (message.type === 'signalAdmin') {
    if (!message.data || !message.from || !message.to) return logger.error('unexpected `signalAdmin` message', message)

    logger.info('signalAdmin', message.from, message.to)
    var from = guests[message.from]
    var to = guests[message.to]
    if (to) {
      to.send(JSON.stringify({
        type: 'signalAdmin',
        data: message.data,
        from: from.id,
        to: to.id
      }), onsend)
    }
  } else {
    logger.error('unknown message `type` ' + message.type)
  }
}

function onsend (err) {
  if (err) logger.error(err.stack || err.message || err)
}

// function broadcast (message) {
//   for (var id in guests) {
//     var peer = guests[id]
//     if (peer) {
//       peer.send(message)
//     }
//   }
// }

function removeMonitor (id) {
  axios.get(BASE_HTTP + '/monitor/remove/' + id)
    .then(res => {
      logger.info(res.data)
    })
    .catch(error => {
      logger.info(error)
    })
}
// function matchGetCount(cb) {
//   axios.get(BASE_HTTP + '/match/count')
//     .then(res => {
//       cb(res.data.count)
//     })
//     .catch(error => {
//       logger.info(error)
//     })
// }
function matchRemoveGuest (id) {
  axios.get(BASE_HTTP + '/match/remove-guest', {
    params: {
      id: id
    }
  })
    .then(res => {
      logger.info('matchRemoveGuest', res.data)
    })
    .catch(error => {
      logger.info(error)
    })
}
function matchAddWaitingGuest (id, interests) {
  var params = {
    id: id,
    interests: interests
  }
  logger.info('GET add-waiting-guest: ' + BASE_HTTP + '/match/add-waiting-guest', params)
  axios.get(BASE_HTTP + '/match/add-waiting-guest', {
    params: params
  })
    .then(res => {
      logger.info('matchAddWaitingGuest', res.data)
      // cb(res.data)
    })
    .catch(error => {
      logger.info(error)
    })
}
function matchEndChatWithGuest (id) {
  axios.get(BASE_HTTP + '/match/end-chat-with-guest', {
    params: {
      id: id
    }
  })
    .then(res => {
      logger.info('matchEndChatWithGuest', res.data)
    })
    .catch(error => {
      logger.info(error)
    })
}
function matchFindMatch (id, interests, cb) {
  axios.get(BASE_HTTP + '/match/find-match', {
    params: {
      id: id,
      interests: interests
    }
  })
    .then(res => {
      logger.info('matchFindMatch', res.data)
      cb(res.data.match)
    })
    .catch(error => {
      logger.info(error)
    })
}

function cleanSocketsAndStatusSync () {
  console.log('cleanSocketsAndStatusSync')
  dao.getAllIds(function (statusIds) {
    let floatingStatusIDs = statusIds
      .filter(x => !socketIds.includes(x))
      .concat(socketIds.filter(x => !statusIds.includes(x)))
    console.log('Status IDs:', statusIds, 'Socket IDs:', socketIds, 'floatingStatusIDs:', floatingStatusIDs)
    if (floatingStatusIDs.length > 0) {
      dao.removeGuests(floatingStatusIDs, function () {
        console.log('Removal complete')
      })
    } else {
      console.log('No cleanup required')
    }
  })
}

setInterval(cleanSocketsAndStatusSync, 5000)
