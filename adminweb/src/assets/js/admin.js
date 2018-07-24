var media = require('./media')
var Peer = require('simple-peer')
var Socket = require('simple-websocket')
var axios = require('axios')
// var $ = require('jquery')

var stream, socketId, socket, guestAId, guestBId, guestA, guestB

function initSocket () {
  var url = window.location.protocol === 'https:' ? 'wss://' + window.location.host + '/ws' : 'ws://' + window.location.host + '/ws'
  // var url = 'wss://zeochat-socket.now.sh/ws'
  console.log('initSocket', url)
  socket = new Socket({ url: url })

  socket.once('connect', function () {
    initGuestA()
  })
  socket.on('error', function (err) {
    console.error('[socket error]', err.stack || err.message || err)
  })
  socket.on('data', function (message) {
    console.log('got socket message: ' + message)
    try {
      message = JSON.parse(message)
    } catch (err) {
      console.error('[socket error]', err.stack || err.message || err)
    }

    if (message.type === 'id') {
      handleId(message.id)
    } else if (message.type === 'signalAdmin') {
      handleSignalAdmin(message)
    }
  })
}

function handleId (id) {
  socketId = id
}
function handleSignalAdmin (message) {
  console.log('from', message.from, 'to', message.to)
  if (message.from === guestAId) {
    console.log('Signal from guestA')
    guestA.signal(message.data)
  } else if (message.from === guestBId) {
    console.log('Signal from guestB')
    guestB.signal(message.data)
  } else {
    console.log('Unknown signal origin')
  }
}
function initGuestA () {
  guestA = new Peer({ initiator: true, stream: stream })

  guestA.on('signal', function (data) {
    socket.send(JSON.stringify({ type: 'signalAdmin', data: data, from: socketId, to: guestAId }))
  })
  guestA.on('connect', function () {
    console.log('attempting to send connect msg', guestA)
    addChat('Connected', 'guestA')
    checkIfPeerIsPresentAndConnect()
  })
  guestA.on('data', function (message) {
    console.log('got a message from guestA: ', message)
    try {
      message = JSON.parse(message)
    } catch (err) {
      console.error('[socket error]', err.stack || err.message || err)
    }

    if (message.type === 'text') {
      handleText(message.text, 'guestA')
    } else if (message.type === 'peerConnect') {
      handlePeerConnected()
    } else if (message.type === 'peerDisconnect') {
      handlePeerDisconnected()
    }
  })
  guestA.on('stream', function (guestAStream) {
    console.log('guestA: on stream')
    media.showStream(document.querySelector('video.guestA'), guestAStream)
  })
  guestA.on('close', function (message) {
    console.log('guestA: on close')
    handleGuestDisconnected()
  })
  guestA.on('error', function (err) {
    console.error('guestA error', err.stack || err.message || err)
  })
}
function initGuestB () {
  guestB = new Peer({ initiator: true, stream: stream })

  guestB.on('signal', function (data) {
    socket.send(JSON.stringify({ type: 'signalAdmin', data: data, from: socketId, to: guestBId }))
  })
  guestB.on('connect', function () {
    guestB.send('hi guestB, this is admin')
    addChat('Connected', 'guestB')
  })
  guestB.on('data', function (message) {
    console.log('got a message from guestA: ', message)
    try {
      message = JSON.parse(message)
    } catch (err) {
      console.error('[socket error]', err.stack || err.message || err)
    }

    if (message.type === 'text') {
      handleText(message.text, 'guestB')
    }
  })
  guestB.on('stream', function (guestBStream) {
    media.showStream(document.querySelector('video.guestB'), guestBStream)
  })
  guestB.on('close', function (message) {
    console.log('guestB: on close')
  })
  guestB.on('error', function (err) {
    console.error('guestB error', err.stack || err.message || err)
  })
}

function handleText (text, user) {
  addChat(text, 'guestA')
}
function checkIfPeerIsPresentAndConnect () {
  isPeerConnected(function (peerId, err) {
    if (peerId) {
      guestBId = peerId
      console.log('guestBId', guestBId)
      initGuestB()
    }
  })
}
function isPeerConnected (cb) {
  axios.get('/admin/api/guest/' + guestAId)
    .then(res => {
      if (res.data.guest.peer) {
        console.log('guestA candidate details', res.data.guest)
        cb(res.data.guest.peer)
      } else {
        console.log('no peer connected to guestA')
      }
    })
    .catch(error => {
      console.log(error)
    })
}
function handlePeerConnected () {
  addChat('Peer connected', 'guestA')
  checkIfPeerIsPresentAndConnect()
}
function handlePeerDisconnected () {
  addChat('Peer disconnected', 'guestA')
  destroyGuest(guestB)
}
function handleGuestDisconnected () {
  addChat('Guest disconnected', 'guestA')
  destroyGuest(guestA)
  destroyGuest(guestB)
}
function destroyGuest (guest) {
  console.log('destroy guest', guest)
  if (guest) {
    guest.destroy()
    guest = null
  }
  console.log('destroyed guest', guest)
}

function addChat (text, className) {
  var node = document.createElement('div')
  node.textContent = text
  node.className = className
  document.querySelector('.history').appendChild(node)
}

function init () {
  guestAId = (document.location.search.split('id=')[1] || '').split('&')[0]

  console.log('guestAId', guestAId)
  media.getUserMedia(function (err, s) {
    if (err) {
      window.alert('You must share your webcam to use this app!')
    } else {
      stream = s
      // Stop stream asap, unfortunately, it looks as though the initiator has to add a stream first
      stream.getTracks().forEach(function (track) {
        track.stop()
      })
      console.log('local stream created and stopped', stream)
      initSocket()
    }
  })
}
init()
