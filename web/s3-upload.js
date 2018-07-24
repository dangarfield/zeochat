var AWS = require('aws-sdk')
var fs = require('fs')
var mime = require('mime-types')
var md5 = require('md5')
var readdirp = require('readdirp')

const S3_BUCKET = process.env.ZEOCHAT_S3_BUCKET_WEB
const S3_ACCESS = process.env.ZEOCHAT_S3_ACCESS
const S3_SECRET = process.env.ZEOCHAT_S3_SECRET

function checkEnvVars () {
  console.log('S3_BUCKET', S3_BUCKET)
  console.log('S3_ACCESS', S3_ACCESS)
  console.log('S3_SECRET', S3_SECRET)
  if (S3_BUCKET === null || S3_ACCESS === null || S3_SECRET === null) {
    console.error('Environment variables not set correctly')
    process.exit(1)
  }
}
checkEnvVars()

var s3 = new AWS.S3({accessKeyId: S3_ACCESS, secretAccessKey: S3_SECRET})

function uploadToS3 (file) {
  return new Promise(resolve => {
    console.log('dist/' + file)
    fs.readFile('dist/' + file, function (err, data) {
      if (err) { throw err }

      console.log('Uploading file: ' + file)
      var base64data = Buffer.from(data, 'binary')

      s3.putObject({
        'Bucket': S3_BUCKET,
        'Key': file,
        'Body': base64data,
        'ACL': 'public-read',
        'ContentType': mime.lookup(file)
      }, function (resp) {
        console.log(arguments)
        console.log('Successfully uploaded, ', file)
        resolve('')
      })
    })
  })
}

function removeFromS3 (files) {
  return new Promise(resolve => {
    var objectList = []
    files.forEach(function (file) {
      objectList.push({'Key': file})
    })
    var params = {
      Bucket: S3_BUCKET,
      Delete: {
        Objects: objectList
      }
    }
    console.log(JSON.stringify(params))
    s3.deleteObjects(params, function (err, data) {
      if (err) {
        console.log(err, err.stack) // an error occurred
      } else {
        console.log(data)           // successful response
        resolve('')
      }
    })
  })
}
function getS3List () {
  return new Promise(resolve => {
    var params = {
      Bucket: S3_BUCKET
    }
    s3.listObjectsV2(params, function (err, data) {
      if (err) {
        console.erro(err, err.stack) // an error occurred
        process.exit(1)
      } else {
        var remoteFiles = []
        data.Contents.forEach(function (file) {
          var remoteFile = {file: file.Key, md5: file.ETag.replace(/"/g, '')}
          remoteFiles.push(remoteFile)
        })
        // console.log('remoteFiles', remoteFiles)
        resolve(remoteFiles)
      }
    })
  })
}

function getLocalFiles () {
  return new Promise(resolve => {
    readdirp({
      root: 'dist',
      // fileFilter: ['*.html', 'bundle*.js', '*.css', '*.jpg', '*.ico', '*.png', '*.eot', '*.svg', '*.ttf', '*.woff', '*.woff2', '*.map', '*.svg'],
      // fileFilter: ['bundle.js', '*.html'],
      directoryFilter: ['!.git', '!node_modules']
    }, function (err, res) {
      if (err) {
        console.error(err, err.stack) // an error occurred
        process.exit(1)
      }
      // console.log('res', res.files, res.files.length)
      var localFiles = []
      res.files.forEach(function (file) {
        // console.log(file)
        var buf = fs.readFileSync('dist/' + file.path)
        var tag = md5(buf)
        var localFile = {file: file.path, md5: tag}
        localFiles.push(localFile)
      })
      // console.log(localFiles)
      resolve(localFiles)
    })
  })
}

async function identifyFilesAndUpload () {
  var localFiles = await getLocalFiles()
  console.log('localFiles', localFiles)

  var remoteFiles = await getS3List()
  console.log('remoteFiles', remoteFiles)

  var localOnly = []
  var bothSame = []
  var bothDiff = []
  var remoteOnly = []
  localFiles.forEach(function (l) {
    var r = remoteFiles.find(r => r.file === l.file)
    if (r) {
      if (r.md5 === l.md5) {
        // console.log(l.file, ' - exists on server - both same')
        bothSame.push(l.file)
      } else {
        // console.log(l.file, ' - exists on server - both different')
        bothDiff.push(l.file)
      }
    } else {
      // console.log(l.file, ' - not on server')
      localOnly.push(l.file)
    }
  })
  remoteFiles.forEach(function (r) {
    var l = localFiles.find(l => l.file === r.file)
    if (!l) {
      // console.log(r.file, ' - on server not locally')
      remoteOnly.push(r.file)
    }
  })
  console.log('localOnly', localOnly)
  console.log('bothSame', bothSame)
  console.log('bothDiff', bothDiff)
  console.log('remoteOnly', remoteOnly)

  localOnly.forEach(async function (file) {
    await uploadToS3(file)
  })
  bothDiff.forEach(async function (file) {
    await uploadToS3(file)
  })
  if (remoteOnly.length > 0) {
    await removeFromS3(remoteOnly)
  }

  console.log('----- SYNC COMPLETE -----')
}
identifyFilesAndUpload()
