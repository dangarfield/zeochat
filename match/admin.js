const exphbs = require('express-handlebars')
const AWS = require('aws-sdk')
const logger = require('./logger').default

const S3_BUCKET = process.env.ZEOCHAT_S3_BUCKET_ASSETS
const S3_ACCESS = process.env.ZEOCHAT_S3_ACCESS
const S3_SECRET = process.env.ZEOCHAT_S3_SECRET

function checkEnvVars () {
  logger.info('S3_BUCKET', S3_BUCKET)
  logger.info('S3_ACCESS', S3_ACCESS)
  logger.info('S3_SECRET', S3_SECRET)
  if (S3_BUCKET === null || S3_ACCESS === null || S3_SECRET === null) {
    logger.error('Environment variables not set correctly')
    process.exit(1)
  }
}
checkEnvVars()

var s3 = new AWS.S3({accessKeyId: S3_ACCESS, secretAccessKey: S3_SECRET})

function setupApp (app) {
  app.engine('handlebars', exphbs({
    defaultLayout: 'admin-base'
  }))
  app.set('view engine', 'handlebars')
  app.disable('view cache')
}

function setupRoutes (app, dao) {
  // api
  app.get('/admin/api/status', function (req, res) {
    dao.getAllGuests(function (docs) {
      res.json({
        action: 'status',
        guests: docs
      })
    })
  })
  app.get('/admin/api/live-guests', function (req, res) {
    logger.info('Request for: live-guests', req.query)
    dao.liveGuests(function (guests) {
      res.json({
        action: 'live-guests',
        guests: guests
      })
    })
  })
  app.get('/admin/api/guest/:id', function (req, res) {
    logger.info('Request for guest: ', req.params.id)
    dao.getGuest(req.params.id, function (guest) {
      res.json({
        action: 'guest',
        guest: guest
      })
    })
  })
  app.get('/admin/api/interests', function (req, res) {
    logger.info('Request for: match interests')
    dao.listInterests(function (interests) {
      res.json({
        action: 'interests',
        interests: interests
      })
    })
  })
  app.get('/admin/api/feedback', function (req, res) {
    logger.info('Request for: feedback')
    dao.getFeedback(function (feedback) {
      res.json({
        action: 'feedback',
        feedback: feedback
      })
    })
  })
  app.get('/admin/api/remove-feedback/:id', function (req, res) {
    logger.info('Request for: match remove-feedback')
    var id = req.params.id
    logger.info('remove-feedback id', id)
    dao.removeFeedback(id, function (text) {
      res.json({ action: 'remove-feedback', id: id })
    })
  })
  app.get('/admin/api/remove-all-guests', function (req, res) {
    logger.info('Request for: remove-all-guests')
    dao.removeAllGuests()
    res.json({
      action: 'remove-all-guests'
    })
  })
  app.get('/admin/api/archive', function (req, res) {
    logger.info('Request for: archive')

    var archives = []
    var params = {
      Bucket: S3_BUCKET
    }
    s3.listObjectsV2(params, function (err, data) {
      if (err) {
        logger.info('error finding archives in s3', err, err.stack)
        res.json({
          action: 'archive',
          error: 'error finding archives in s3'
        })
      } else {
        data.Contents.forEach(archive => {
          var url = 'https://zeochat-assets.s3.amazonaws.com/' + archive.Key
          archives.push({url: url, live: false, id: archive.Key.replace('.png', '')})
        })
        logger.info('s3 archive objects', data.Contents)
        dao.getAllGuests(function (guests) {
          logger.info('current ids', guests)
          guests.forEach(live => {
            archives.forEach(archive => {
              logger.info('live._id === archive.id', live._id, ' - ', archive.id)
              if (live._id === archive.id) {
                logger.info('live._id === archive.id', live._id, archive.id)
                archive.live = true
                if (live.image) {
                  archive.url = live.image
                }
              }
            })
          })
          archives.sort(function (a, b) { return b.live - a.live })

          res.json({
            action: 'archive',
            archives: archives
          })
        })
      }
    })
  })
}
exports.initAdmin = function (app, dao) {
  logger.info('Initialising Admin Functions')
  setupApp(app)
  setupRoutes(app, dao)
}
