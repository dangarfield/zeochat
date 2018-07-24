var media = require('./media')
var Peer = require('simple-peer')
var Socket = require('simple-websocket')
var axios = require('axios')
var ua = require('universal-ga')
var anime = require('animejs')

var $mainPage = document.querySelector('body.chat-page')
var $chatHolder = document.querySelectorAll('.chat-component')
var $joinHolder = document.querySelector('.join-component')

var $joinInput = document.querySelector('.join input')
var $joinButton = document.querySelector('button.join')
var $joinUnmodButton = document.querySelector('button.join-unmod')
var $interests = document.querySelector('.interests')
var $interestsText = document.querySelectorAll('.interests span')
var $count = document.querySelector('.count')
var $feedbackLink = document.querySelector('.feedback-link')
var $feedbackClose = document.querySelector('.feedback-close')
var $feedbackForm = document.querySelector('.feedback-form')
// var $socketId = document.querySelector('.socket-id')

var $chat = document.querySelector('form.chat-app-input')
var $history = document.querySelector('.history')
var $wait = document.querySelector('.wait')
var $next = document.querySelector('.next')
var $send = document.querySelector('.send')
var $textInput = document.querySelector('.chat-app-input input')
var $peerTyping = document.querySelector('.peer-typing')
var $videoLocalHolder = document.querySelector('.media.local .media-body')
var $videoLocal = document.querySelector('video.local')
var $videoRemote = document.querySelector('video.remote')
var $canvasStill = document.querySelector('canvas.still')
var $countdown = document.querySelector('.countdown')
var $modalErrorText = document.querySelector('.modal-error-text')

var peer
var stream
var socket
var socketId
var admin
var adminId
var waitCountdown = true
var avatarLocal
var avatarRemote

var rootHost = window.location.href.includes('zeochat.com') || window.location.href.includes('cloudfront.net') ? 'zeochat.now.sh' : window.location.host
console.log('host', rootHost)

function uiTalk () {
  $textInput.disabled = false
  $send.disabled = false
  $wait.disabled = false
  $wait.style.display = 'block'
  $next.disabled = true
  $next.style.display = 'none'
  $textInput.focus()
}
function uiWait () {
  $textInput.disabled = true
  $send.disabled = true
  $wait.disabled = true
  $wait.style.display = 'none'
  $next.disabled = false
  $next.style.display = 'block'
}
function uiConnecting () {
  $textInput.disabled = true
  $send.disabled = true
  $wait.disabled = true
  $wait.style.display = 'block'
  $next.disabled = true
  $next.style.display = 'none'
}
function enableChatUI () {
  console.log('$chatHolder', $chatHolder)
  $chatHolder.forEach(function (chatItem) {
    chatItem.style.display = 'block'
  })

  // $chatHolder.style.display = 'block'
  $joinHolder.style.display = 'none'
  $mainPage.classList.remove('blank-page')
  $mainPage.classList.remove('comingsoonOne')
  $mainPage.classList.add('chat-application')
  $mainPage.classList.add('fixed-navbar')
}

function addChatStatus (text) {
  // <p class="time">1 hours ago</p>
  var p = document.createElement('p')
  p.innerHTML = text
  p.className = 'time'
  $history.appendChild(p)
}

function getRandomAvatarId () {
  return Math.floor(Math.random() * (98 - 1 + 1)) + 1
}
function initAvatarLocal () {
  avatarLocal = '/img/avatar/avatar-' + getRandomAvatarId() + '.png'
}
function initAvatarRemote () {
  avatarRemote = '/img/avatar/avatar-' + getRandomAvatarId() + '.png'
}
function addChat (text, className) {
  var lastChat
  var chats = document.querySelectorAll('.history .chat')
  // console.log('chats', chats)
  if (chats.length > 0 && chats[chats.length - 1].className.includes(className)) {
    // console.log('IS LAST CHAT')
    lastChat = chats[chats.length - 1]
  }

  var content = document.createElement('div')
  content.className = 'chat-content'

  var p = document.createElement('p')
  p.textContent = text
  content.appendChild(p)

  console.log('lastChat', lastChat)
  if (lastChat) {
    console.log('INJECT TO LAST CHAT')
    lastChat.querySelector('.chat-body').appendChild(content)
  } else {
    console.log('CREATE NEW CHAT')

    var chat = document.createElement('div')
    if (className === 'local') {
      chat.className = 'chat local'
    } else if (className === 'remote') {
      chat.className = 'chat chat-left remote'
    }

    var avatar = document.createElement('div')
    avatar.className = 'chat-avatar'
    chat.appendChild(avatar)

    // <a href="#" class="btn btn-float btn-round btn-float-lg btn-primary">
    //   <i class="fa fa-camera"></i>
    // </a>

    // var avatarHolder = document.createElement('div')
    // avatarHolder.className = 'avatar'
    // avatar.appendChild(avatarHolder)
    // var avatarLink = document.createElement('button')
    // avatarLink.className = 'btn btn-float btn-round btn-primary'
    // avatarHolder.appendChild(avatarLink)
    // var avatarImage = document.createElement('i')
    // avatarImage.className = 'fa fa-camera font-medium-4'
    // avatarLink.appendChild(avatarImage)

    var avatarLink = document.createElement('a')
    avatarLink.className = 'avatar'
    avatar.appendChild(avatarLink)
    var avatarImage = document.createElement('img')
    if (className === 'local') {
      avatarImage.src = avatarLocal
    } else if (className === 'remote') {
      avatarImage.src = avatarRemote
    }
    avatarLink.appendChild(avatarImage)

    var body = document.createElement('div')
    body.className = 'chat-body'
    chat.appendChild(body)
    body.appendChild(content)
    $history.appendChild(chat)
  }
  var chatWindow = document.querySelector('.chat-app-window')
  chatWindow.scrollTop = chatWindow.scrollHeight
}

function clearChat () {
  $history.innerHTML = ''
}

function wait () {
  uiWait()
  addChatStatus('Chat ended')
  socket.send(JSON.stringify({ type: 'end' }))
  if (peer !== null && peer.connected) {
    console.log('peer', peer)
    peer.send(JSON.stringify({ type: 'end' }))
    peer.destroy()
    peer = null
  }
  waitCountdownInit()
}

function next (event) {
  analyticsEvent('Chat', 'Interaction', 'Next')
  if (event && event.preventDefault) {
    event.preventDefault()
  }
  var interests = getInterests()
  console.log('findMatch', interests)
  socket.send(JSON.stringify({ type: 'findMatch', interests: interests }))
  uiConnecting()
  clearChat()
  addChatStatus('Finding a peer...')
}

function handleFindMatch (data) {
  console.log('handleFindMatch data', data)
  peer = new Peer({
    initiator: !!data.initiator,
    stream: stream
  })

  peer.on('ping', function () {
    console.log('ping recieved')
  })
  peer.on('pong', function () {
    console.log('pong recieved')
  })
  peer.on('error', function (err) {
    console.error('peer error', err.stack || err.message || err)
    // window.alert('An error has occured - More than likely, this is because you using a corporate wifi. Try again after using a different wifi or relaxing your firewall settings')
    var msg = 'An error has occured - More than likely, this is because you using a corporate wifi. Try again after using a different wifi or relaxing your firewall settings. Try refreshing the page to see if the problem still exists. Maybe feed this back to us'
    displayError(msg)
    analyticsEvent('Error', 'Error', msg)
  })

  peer.on('connect', function () {
    clearChat()
    if (data.commonInterests.includes('random')) {
      addChatStatus('Connected to a random stranger, say hello!')
    } else if (data.commonInterests.includes('unmoderated')) {
      addChatStatus('This is an unmoderated chat with a random stranger, say hello!')
    } else if (data.commonInterests.length > 0) {
      var interests = []
      data.commonInterests.forEach(function (interest) {
        var badge = '<span class="badge bg-pink">' + interest + '</span>'
        interests.push(badge)
      })
      addChatStatus('Connected. You both like ' + interests.join(', ').replace(/,(?!.*,)/gmi, ' and') + '. Say hello!')
    } else {
      addChatStatus('Connected, say hello!')
    }

    uiTalk()
    initAvatarRemote()
    console.log('peer connected', peer)
    if (admin) {
      admin.send(JSON.stringify({ type: 'peerConnect', id: peer.id }))
    }
    analyticsEvent('Chat', 'Interaction', 'Peer connected')
  })

  peer.on('signal', function (data) {
    socket.send(JSON.stringify({ type: 'signal', data: data }))
  })

  peer.on('stream', function (stream) {
    console.log('stream data')
    media.showStream($videoRemote, stream, function () {
      console.log('play ready')
      initLocalVideoPosition()
    })
  })

  peer.on('data', function (message) {
    try {
      message = JSON.parse(message)
    } catch (err) {
      console.error('[socket error]', err.stack || err.message || err)
      displayError('An error has occured - ')
      var msg = 'An error has occured - We didn\'t understand some of the data that was being sent from the other person. Try refreshing the page to see if the problem still exists. Maybe feed this back to us'
      displayError(msg)
      analyticsEvent('Error', 'Error', msg)
    }

    if (message.type === 'text') {
      addChat(message.text, 'remote')
      $peerTyping.style.display = 'none'
    } else if (message.type === 'end') {
      // wait()
      if (peer !== null && peer.connected) {
        peer.destroy()
        peer = null
      }
    } else if (message.type === 'typing') {
      handlePeerTyping()
    }
  })

  // Takes ~3 seconds before this event fires when peerconnection is dead (timeout)
  peer.on('close', function (message) {
    if (admin) {
      admin.send(JSON.stringify({ type: 'peerDisconnect', id: peer.id }))
    }
    wait()
    peer = null
  })
}

function handleSignal (data) {
  peer.signal(data)
}

function handleCount (data) {
  $count.textContent = data
}
function handleRegistered (id) {
  console.log('registered')
  // $socketId.textContent = id
  socket.id = id
  ua.set('uid', id)
  console.log(id)
  enableChatUI()
  addChatStatus('Please grant access to your webcam. Remember to smile!')
  media.getUserMedia(function (err, s) {
    if (err) {
      stopSpinner()
      var msg = 'You must share your webcam to use this app!'
      displayError(msg)
      analyticsEvent('Error', 'Error', 'No webcam available')
    } else {
      stream = s
      media.showStream($videoLocal, stream)
      // media.showStream($videoRemote, stream) // For mobile testing
      next()
      setTimeout(captureStill, 1000)
      setInterval(captureStill, 60000)
      initLocalVideoPosition()
      stopSpinner()
    }
  })
}

function userTyping (event) {
  if (peer) {
    peer.send(JSON.stringify({ type: 'typing' }))
  }
}
var typingCountdown = 0
var typingCountdownInterval
function handlePeerTyping () {
  // console.log('Peer is typing')
  $peerTyping.style.display = 'block'
  typingCountdown = 5
  clearInterval(typingCountdownInterval)
  typingCountdownInterval = setInterval(() => {
    // console.log('inside interval - typingCountdown', typingCountdown)
    typingCountdown--
    if (typingCountdown === 0) {
      // console.log('clear typingCountdownInterval')
      clearInterval(typingCountdownInterval)
      $peerTyping.style.display = 'none'
    }
  }, 1000)
}
function send (event) {
  event.preventDefault()
  var text = $textInput.value
  if (text !== '') {
    addChat(text, 'local')
    analyticsEvent('Chat', 'Interaction', 'Send')
    if (peer) {
      peer.send(JSON.stringify({ type: 'text', text: text }))
    }
    if (admin) {
      admin.send(JSON.stringify({ type: 'text', text: text }))
    }
    $textInput.value = ''
  }
}

function getInterests () {
  var interests = []
  $interestsText = document.querySelectorAll('.interests span')
  // console.log('$interestsText', $interestsText.textContent)
  $interestsText.forEach(function (existingText) {
    interests.push(existingText.textContent)
  })
  return interests
}
function registerUnmod (event) {
  clearInterests()
  addInterest('unmoderated')
  analyticsScreen('Chat Screen')
  analyticsEvent('Chat', 'Register', 'Unmonitored')
  register(event)
}
function registerNormal (event) {
  analyticsScreen('Chat Screen')
  analyticsEvent('Chat', 'Register', 'Normal')
  register(event)
}
function register (event) {
  event.preventDefault()
  startSpinner()
  initChatSocket(function () {
    console.log('connection cb')
    var interests = getInterests()
    socket.send(JSON.stringify({ type: 'register', interests: interests }))
    initAvatarLocal()
    stopSpinner()
    stopMovingTitle()
  })
}

function captureStill () {
  console.log('captureStill')
  var canvas = window.canvas = $canvasStill
  // canvas.style.display = 'none'
  canvas.width = $videoLocal.videoWidth
  canvas.height = $videoLocal.videoHeight
  canvas.getContext('2d').drawImage($videoLocal, 0, 0, canvas.width, canvas.height)

  var imageData = canvas.toDataURL('image/jpeg')
  console.log(imageData, socket.id)
  // $.post(rootDomain + 'monitor/add-image', { imageData: imageData, id: socket.id })
  axios.post('//' + rootHost + '/monitor/add-image', { imageData: imageData, id: socket.id })
    .then((res) => {
      console.log('monitor res', res)
    })
    .catch(error => {
      console.log(error)
    })
}

function initChatSocket (cb) {
  var url = window.location.protocol === 'https:' ? 'wss://' + rootHost + '/ws' : 'ws://' + rootHost + '/ws'
  // var url = 'wss://zeochat-socket.now.sh/ws'
  // var url = 'ws://localhost:3001/ws'
  console.log('initSocket', url)
  socket = new Socket({ url: url })

  socket.on('connect', function () {
    console.log('connected to socket')
    cb()
  })
  socket.on('error', function (err) {
    console.error('[socket error]', err.stack || err.message || err)
    var msg = 'There has been an error communicating to the server. Try refreshing the page to see if the problem still exists. Maybe feed this back to us'
    displayError(msg)
    analyticsEvent('Error', 'Error', msg)
  })
  socket.on('data', function (message) {
    console.log('got socket message: ' + message)
    try {
      message = JSON.parse(message)
    } catch (err) {
      console.error('[socket error]', err.stack || err.message || err)
      var msg = 'There has been an error communicating to your browser. Try refreshing the page to see if the problem still exists. Maybe feed this back to us'
      displayError(msg)
      analyticsEvent('Error', 'Error', msg)
    }

    if (message.type === 'signal') {
      handleSignal(message.data)
    } else if (message.type === 'count') {
      handleCount(message.data)
      // } else if (message.type === 'end') {
      //   wait()
    } else if (message.type === 'findMatch') {
      handleFindMatch(message.data)
    } else if (message.type === 'registered') {
      handleRegistered(message.id)
    } else if (message.type === 'signalAdmin') {
      handleSignalAdmin(message)
    } else if (message.type === 'id') {
      handleId(message.id)
    }
  })
  socket.on('close', function (message) {
    var msg = 'It looks as though the connection to the server has been closed. Try refreshing the page to see if the problem still exists. Maybe feed this back to us'
    displayError(msg)
    analyticsEvent('Error', 'Error', msg)
    // window.location.reload()
  })
}
function handleId (id) {
  console.log('id', id)
  socketId = id
  // $count.textContent = socketId
}

function initAdmin () {
  admin = new Peer({ stream: stream })

  admin.on('signal', function (data) {
    console.log('sending signal, from', socketId, 'to', adminId)
    socket.send(JSON.stringify({ type: 'signalAdmin', data: data, from: socketId, to: adminId }))
  })
  admin.on('close', function (message) {
    console.log('admin: on close')
    admin.destroy()
    admin = null
  })
  admin.on('error', function (err) {
    console.error('admin error', err.stack || err.message || err)
  })
}
function handleSignalAdmin (message) {
  console.log('handleSignalAdmin', message)
  adminId = message.from
  if (!admin) {
    console.log('INIT ADMIN')
    initAdmin()
  }
  console.log('admin', admin)
  console.log('data', message.data)
  admin.signal(message.data)
}
function bindChatButtons () {
  $feedbackLink.addEventListener('click', showFeedbackModal)
  $feedbackClose.addEventListener('click', hideModals)
  $feedbackForm.addEventListener('submit', sendFeedback)
  $next.addEventListener('click', next)
  $chat.addEventListener('submit', send)
  $wait.addEventListener('click', () => {
    if (peer !== null && peer.connected) {
      peer.destroy()
      peer = null
    }
  })
  $send.addEventListener('click', send)

  $textInput.addEventListener('keypress', userTyping)

  // $join.addEventListener('submit', register)
  document.onkeydown = function (e) {
    e = e || window.event
    if (e.keyCode === 27) {
      if (!$next.disabled) {
        $next.click()
      } else if (!$wait.disabled) {
        $wait.click()
      }
    }
  }
  window.addEventListener('resize', function (e) {
    initLocalVideoPosition()
  })
}

function bindJoinButtons () {
  $joinInput.onkeydown = function (e) {
    console.log('joinInput', e.keyCode)
    const TAB = 9
    const COMMA = 188
    const FULL_STOP = 190
    const SPACE = 32
    const ENTER = 13

    if (e.keyCode === TAB || e.keyCode === COMMA || e.keyCode === FULL_STOP || e.keyCode === SPACE || e.keyCode === ENTER) {
      var interest = $joinInput.value.toLowerCase().replace(/([^a-z0-9 ]+)/gi, '').trim()
      var interests = $interests.textContent
      var alreadyPresent = false
      $interestsText = document.querySelectorAll('.interests span')
      console.log('$interestsText', $interestsText.textContent)
      $interestsText.forEach(function (existingText) {
        console.log('existingText', existingText)
        if (existingText.textContent === interest) {
          console.log('already exists')
          alreadyPresent = true
        }
      })

      if (interest !== '' && !alreadyPresent) {
        console.log('$joinInput', 'trigger next with', interest, interests)
        addInterest(interest)
        saveSessionInterests()
      }

      $joinInput.value = ''
      if (interest === '' && e.keyCode === ENTER) {
        console.log('submit')
        $joinButton.click()
      }
    }
  }
  $joinButton.addEventListener('click', registerNormal)
  $joinUnmodButton.addEventListener('click', registerUnmod)
}

function loadSessionInterests () {
  var sessionInterestsJSON = window.sessionStorage.getItem('interests')
  if (sessionInterestsJSON) {
    var sessionInterests = JSON.parse(sessionInterestsJSON)
    sessionInterests.forEach(function (interest) {
      console.log('Session Interests: GET ', interest)
      addInterest(interest)
    })
  }
}
function saveSessionInterests () {
  var interests = JSON.stringify(getInterests())
  window.sessionStorage.setItem('interests', interests)
  console.log('Session Interests: SET ', interests)
}
function clearInterests () {
  var $interestsText = document.querySelectorAll('.interests span')
  $interestsText.forEach(function (interest) {
    interest.remove()
  })
}
function addInterest (text) {
  var div = document.createElement('div')
  div.className = 'badge badge-primary round'

  var span = document.createElement('span')
  span.textContent = text
  div.appendChild(span)

  var i = document.createElement('i')
  i.className = 'ft ft-x font-medium-2'
  div.appendChild(i)

  $interests.appendChild(div)
  div.addEventListener('click', () => {
    div.remove()
    saveSessionInterests()
    analyticsEvent('Interests', 'Remove', text)
  })
  analyticsEvent('Interests', 'Add', text)
}
var timer, countdown

function startTimer () {
  timer = setTimeout(function () {
    countdown--
    console.log('Countdown ' + countdown)
    if (countdown > 0) {
      var secondsElement = document.querySelector('.countdown .seconds')
      if (secondsElement) {
        secondsElement.textContent = countdown + ' seconds'
      }
      startTimer()
    } else {
      next()
      console.log('Countdown end')
    }
  }, 1000)
}

function stopTimer () {
  clearTimeout(timer)
}

function waitCountdownInit () {
  console.log('waitCountdownInit')
  $countdown = document.querySelector('.countdown')
  if ($countdown) {
    $countdown.remove()
  }
  if (waitCountdown) {
    countdown = 5

    var div = document.createElement('div')
    div.textContent = 'Chat again in '
    div.className = 'countdown'

    var spanSeconds = document.createElement('span')
    spanSeconds.textContent = countdown + ' seconds'
    spanSeconds.className = 'seconds'

    var button = document.createElement('button')
    button.textContent = 'Stop'
    button.className = 'btn btn-pink'

    div.appendChild(spanSeconds)
    div.appendChild(button)
    $history.appendChild(div)

    startTimer()
    button.addEventListener('click', () => {
      console.log('click countdown stop')
      waitCountdown = false
      stopTimer()
      waitCountdownInit()
    })
  } else {
    div = document.createElement('div')
    div.textContent = 'No countdown'
    div.className = 'countdown'

    button = document.createElement('button')
    button.textContent = 'Start'
    button.className = 'btn btn-primary'

    div.appendChild(button)
    $history.appendChild(div)

    button.addEventListener('click', () => {
      console.log('click countdown start')
      waitCountdown = true
      waitCountdownInit()
    })
  }
}
function initLocalVideoPosition () {
  $videoLocalHolder = document.querySelector('.media.local')
  if (document.documentElement.clientWidth < 768) {
    console.log('mobile')
    $videoLocalHolder.style.width = '120px'
    $videoLocalHolder.style.height = '80px'
    $videoLocal.style.width = '100%'
    var $wrapper = document.querySelector('.content-right')
    var videoHeight = document.querySelector('.sidebar').clientHeight
    console.log('videoHeight', videoHeight)
    $wrapper.style.paddingTop = videoHeight + 0 + 'px'
    console.log($wrapper.style.paddingTop)
  } else {
    var h = $videoLocalHolder.clientHeight
    var w = $videoLocalHolder.clientWidth
    var hb = h / 3 * 4
    console.log('$videoLocalHolder.clientHeight', h, w, hb)
    if (hb > w) {
      $videoLocal.style.width = '100%'
      $videoLocal.style.removeProperty('height')
    } else {
      $videoLocal.style.removeProperty('width')
      $videoLocal.style.height = (h + 20) + 'px'
    }
  }
}
function getCount () {
  console.log('count url', rootHost + '/match/count')
  axios.get('//' + rootHost + '/match/count')
    .then(res => {
      console.log('count res', res)
      handleCount(res.data.count)
    })
    .catch(error => {
      console.log(error)
    })
}
function displayError (text) {
  $modalErrorText.textContent = text
  showModal('modal-error')
}
function showModal (name) {
  var modal = document.querySelector('[data-modal-name="' + name + '"]')
  modal.classList.add('is-modal-active')
}
function hideModals () {
  var activeModals = document.querySelectorAll('.is-modal-active')
  activeModals.forEach(function (modal) {
    modal.classList.remove('is-modal-active')
  })
}
function startSpinner () {
  console.log('startSpinner')
  showModal('modal-spinner')
}
function stopSpinner () {
  console.log('stopSpinner')
  hideModals()
}
function showFeedbackModal (event) {
  console.log('showFeedbackModal')
  if (event && event.preventDefault) {
    event.preventDefault()
  }
  showModal('modal-feedback')
}
function sendFeedback (event, element) {
  console.log('sendFeedback', event, element)
  if (event && event.preventDefault) {
    event.preventDefault()
  }
  let btn = document.querySelector('.feedback-send')
  btn.innerHTML = '<i class="fa fa-check-square-o"></i> Sending'
  btn.disabled = true
  let feedbackText = document.querySelector('.feedback-text').value
  axios.post('//' + rootHost + '/match/feedback', { text: feedbackText })
    .then(res => {
      console.log('feedback response', res)
      btn.innerHTML = '<i class="fa fa-check-square-o"></i> Feedback sent'
      btn.disabled = false
    })
    .catch(error => {
      console.log(error)
      btn.innerHTML = '<i class="fa fa-check-square-o"></i> Error sending feedback'
      btn.disabled = false
    })
}
var movingTitle
function initMovingTitle () {
  var width = document.querySelector('.moving-title .letters').offsetWidth
  movingTitle = anime.timeline({loop: true})
  .add({
    targets: '.moving-title .line',
    scaleY: [0, 1],
    opacity: [0.5, 1],
    easing: 'easeOutExpo',
    duration: 700
  })
  .add({
    targets: '.moving-title .line',
    translateX: [0, width + 10],
    easing: 'easeOutExpo',
    duration: 700,
    delay: 100
  }).add({
    targets: '.moving-title .letter',
    opacity: [0, 1],
    easing: 'easeOutExpo',
    duration: 600,
    offset: '-=775',
    delay: function (el, i) {
      return (34 * (i + 1))
    }
  }).add({
    targets: '.moving-title',
    opacity: 0,
    duration: 1000,
    easing: 'easeOutExpo',
    delay: 1500
  })
}
function stopMovingTitle () {
  movingTitle.pause()
}
function initChat () {
  initAnalytics()
  uiConnecting()
  bindJoinButtons()
  initMovingTitle()
  loadSessionInterests()
  bindChatButtons()
  getCount()
  setInterval(getCount, 1000 * 60)
}

function initAnalytics () {
  ua.initialize('UA-120272445-1 ')
  analyticsPage('/')
  analyticsScreen('Home screen')
}

function analyticsPage (name) {
  ua.pageview(name)
  console.log('analytics pageview', name)
}
function analyticsScreen (name) {
  ua.screenview(name)
  console.log('analytics screenview', name)
}
function analyticsEvent (category, action, label) {
  ua.event(category, action, { eventLabel: label }) // value??
  console.log('analytics event', category, action, label)
}

if ($mainPage) {
  initChat()
}
