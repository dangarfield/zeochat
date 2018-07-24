const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const axios = require('axios')
const AWS = require('aws-sdk')
const logger = require('./logger').default
logger.info('----- Monitor app init')

const BASE_HTTP = process.env.ZEOCHAT_BASE_HTTP
const PORT = process.env.ZEOCHAT_PORT_MONITOR
const S3_BUCKET = process.env.ZEOCHAT_S3_BUCKET_ASSETS
const S3_ACCESS = process.env.ZEOCHAT_S3_ACCESS
const S3_SECRET = process.env.ZEOCHAT_S3_SECRET

function checkEnvVars () {
  logger.info('BASE_HTTP', BASE_HTTP)
  logger.info('PORT', PORT)
  logger.info('S3_BUCKET', S3_BUCKET)
  logger.info('S3_ACCESS', S3_ACCESS)
  logger.info('S3_SECRET', S3_SECRET)
  if (BASE_HTTP === null || PORT === null || S3_BUCKET === null || S3_ACCESS === null || S3_SECRET === null) {
    logger.error('Environment variables not set correctly')
    process.exit(1)
  }
}
checkEnvVars()

var s3 = new AWS.S3({accessKeyId: S3_ACCESS, secretAccessKey: S3_SECRET})

app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

app.use(function (req, res, next) {
  // res.header('Access-Control-Allow-Origin', 'd2kc3n7326fv6x.cloudfront.net')
  // res.header('Access-Control-Allow-Origin', 'zeochat.com')
  res.header('Access-Control-Allow-Origin', 'https://www.zeochat.com')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.get('/', (req, res) => res.send('Hello monitor root!'))
app.get('/monitor', (req, res) => res.send('Hello monitor!'))

app.post('/monitor/add-image', function (req, res) {
  // logger.info(JSON.stringify(req.body))

  logger.info('Incoming monitor request')
  var img = req.body.imageData
  var fileName = req.body.id + '.png'
  logger.info('Monitoring file: ', fileName)
  var data = img.replace(/^data:image\/\w+;base64,/, '')
  saveFileS3(data, fileName, function (err) {
    if (!err) {
      var fileURL = 'https://' + S3_BUCKET + '.s3.amazonaws.com/' + fileName
      logger.info('File saved', fileName, fileURL)

      // save status with image first, rather than with classifier results
      updateImageCaptured(req.body.id, fileURL + '?' + new Date().getTime())

      var classifierURL = BASE_HTTP + '/classifier?image=' + fileURL
      logger.info('Getting classifier results', classifierURL)
      axios.get(classifierURL)
        .then(res => {
          logger.info('Classifier result', res.data)
          if (!res.data.error) {
            updateCandidateWithClassifierResults(req.body.id, res.data.gender, res.data.nsfw, res.data.image)
          }
        })
        .catch(error => {
          logger.info(error)
        })
    }
  })

  res.json({ 'Uploaded': fileName })
})
app.get('/monitor/remove/:id', function (req, res) {
  logger.info('Request for removing monitor image: ', req.params.id)
  var fileName = req.params.id + '.png'
  removeFileS3(fileName, function () {
    res.json({
      action: 'monitor-remove',
      guest: req.params.id
    })
  })
})
function updateImageCaptured (id, image) {
  axios.get(BASE_HTTP + '/match/image-added', {
    params: {
      id: id,
      image: image
    }
  })
    .then(res => {
      logger.info('Image added saved success', res.data)
    })
    .catch(error => {
      logger.info(error)
    })
}
function updateCandidateWithClassifierResults (id, gender, nsfw, image) {
  axios.get(BASE_HTTP + '/match/classifier-result', {
    params: {
      id: id,
      gender: gender,
      nsfw: nsfw,
      image: image
    }
  })
    .then(res => {
      logger.info('Classifier saved success', res.data)
    })
    .catch(error => {
      logger.info(error)
    })
}

function saveFileS3 (data, fileName, cb) {
  var buffer = Buffer.from(data, 'base64')
  // logger.info('buffer', buffer)

  var params = {
    Body: buffer,
    Bucket: S3_BUCKET,
    Key: fileName,
    StorageClass: 'ONEZONE_IA',
    ACL: 'public-read',
    ContentType: 'image/png'
  }
  logger.info('uploading:', fileName, params)
  s3.putObject(params, function (err, data) {
    if (err) {
      logger.info('error uploading to s3', err, err.stack)
      cb(err)
    } else {
      logger.info('s3 write data', data)
      cb()
    }
  })
}
function removeFileS3 (fileName, cb) {
  var params = {
    Bucket: S3_BUCKET,
    Key: fileName
  }
  s3.deleteObject(params, function (err, data) {
    if (err) {
      logger.info('error deleting from s3', err, err.stack)
      cb(err)
    } else {
      logger.info('s3 delete data', data)
      cb()
    }
  })
}
app.listen(PORT, () => logger.info('----- Monitor app listening on port ' + PORT))
