const MongoClient = require('mongodb').MongoClient
const logger = require('./logger').default

const DB_CONNECTION = process.env.ZEOCHAT_DB_CONNECTION
const DB_NAME = process.env.ZEOCHAT_DB_NAME

function checkEnvVars () {
  logger.info('DB_CONNECTION', DB_CONNECTION)
  logger.info('DB_NAME', DB_NAME)
  if (DB_CONNECTION == null || DB_NAME == null) {
    logger.error('Environment variables not set correctly')
    process.exit(1)
  }
}
checkEnvVars()

// DB Values
const dbUrl = DB_CONNECTION
const dbName = DB_NAME
const dbOptions = {useNewUrlParser: true,
  socketTimeoutMS: 480000,
  keepAlive: 300000
}
var guests

// Connect to db
MongoClient.connect(dbUrl, dbOptions, function (err, client) {
  if (err) {
    logger.error('Failure connecting to mongo server')
    return process.exit(1)
  }
  logger.info('Connected correctly to mongo server')
  var db = client.db(dbName)
  guests = db.collection('guests')

  // Ensure indexes are set?
})

exports.getAllIds = function (cb) {
  logger.info('getAllIds start')
  guests
    .find({})
    .project({_id: 1})
    .map(x => x._id)
    .toArray(function (err, result) {
      if (err) {
        logger.error('getAllIds error', err)
      }
      logger.info('getAllIds success', result)
      if (cb) {
        cb(result)
      }
    })
}
exports.removeGuests = function (ids, cb) {
  logger.info('removeGuests start', ids)
  var filter = {'_id': {'$in': ids}}
  console.log('filter', filter)
  guests.deleteMany(filter, function (err, result) {
    if (err) {
      logger.error('removeGuests error', ids, err)
    }
    logger.info('removeGuests success', ids)
    if (cb) {
      cb()
    }
  })
}
