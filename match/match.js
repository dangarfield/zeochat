const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const admin = require('./admin')
const dao = require('./dao')
const logger = require('./logger').default
logger.info('----- Monitor app init')

const PORT = process.env.ZEOCHAT_PORT_MATCH

function checkEnvVars () {
  logger.info('PORT', PORT)
  if (PORT == null) {
    logger.error('Environment variables not set correctly')
    process.exit(1)
  }
}
checkEnvVars()

app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.get('/', (req, res) => res.send('Hello match root!'))
app.get('/match', (req, res) => res.send('Hello match!'))
app.get('/match/count', function (req, res) {
  logger.info('Request for: match count')
  dao.getGuestCount(function (count) {
    res.json({ action: 'count', count: count })
  })
})
app.get('/match/remove-guest', function (req, res) {
  logger.info('Request for: remove-guest', req.query)
  dao.removeGuest(req.query.id)
  res.json({ action: 'remove-guest', id: req.query.id })
})
app.get('/match/add-waiting-guest', function (req, res) {
  logger.info('Request for: add-waiting-guest', req.query)
  dao.addWaitingGuest(req.query.id, req.query.interests)
  res.json({ action: 'add-waiting-guest', id: req.query.id, interests: req.query.interests })
})
app.get('/match/end-chat-with-guest', function (req, res) {
  logger.info('Request for: end-chat-with-guest', req.query)
  dao.endChatWithGuest(req.query.id)
  res.json({ action: 'end-chat-with-guest', id: req.query.id })
})
app.get('/match/find-match', function (req, res) {
  logger.info('Request for: find-match', req.query)
  dao.findMatch(req.query.id, function (match) {
    res.json({ action: 'find-match', id: req.query.id, match: match })
  })
})
app.get('/match/image-added', function (req, res) {
  logger.info('Request for image-added: ', req.query.id, req.query.image)
  dao.updateGuest(req.query.id, { $set: { image: req.query.image } }, function () {
    res.json({ action: 'image-added', id: req.query.id, image: req.query.image })
  })
})
app.get('/match/classifier-result', function (req, res) {
  logger.info('Request for classifier-result: ', req.query.id, req.query.gender, req.query.nsfw, req.query.image)
  dao.updateGuest(req.query.id, { $set: { gender: req.query.gender, nsfw: req.query.nsfw, image: req.query.image } }, function () {
    res.json({ action: 'classifier-result', id: req.query.id, gender: req.query.gender, nsfw: req.query.nsfw, image: req.query.image })
  })
})
app.post('/match/feedback', function (req, res) {
  logger.info('Request for: match feedback')
  var text = req.body.text
  logger.info('feedback text', text)
  dao.addFeedback(text, function (text) {
    res.json({ action: 'feedback', text: text })
  })
})
admin.initAdmin(app, dao)

app.listen(PORT, () => logger.info('Match / admin app listening on port ' + PORT))
