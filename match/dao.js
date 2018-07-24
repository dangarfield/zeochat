const MongoClient = require('mongodb').MongoClient
const logger = require('./logger').default
const hat = require('hat')

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
var feedback
const AVOID_LIST_COUNT = 20

// Connect to db
MongoClient.connect(dbUrl, dbOptions, function (err, client) {
  if (err) {
    logger.error('Failure connecting to mongo server')
    return process.exit(1)
  }
  logger.info('Connected correctly to mongo server')
  var db = client.db(dbName)
  guests = db.collection('guests')
  feedback = db.collection('feedback')

  // Ensure indexes are set?
})

// status: wait, finding, chat
exports.removeGuest = function (id, cb) {
  logger.info('removeGuest start', id)

  guests.deleteOne({ _id: id }, function (err, result) {
    if (err) {
      logger.error('removeGuest error', id, err)
    }
    logger.info('removeGuest success', id)
    if (cb) {
      cb()
    }
  })
}
exports.removeAllGuests = function (cb) {
  logger.info('removeAllGuests')

  guests.deleteMany({}, function (err, result) {
    if (err) {
      logger.error('removeAllGuests error', err)
    }
    logger.info('removeAllGuests success')
    if (cb) {
      cb()
    }
  })
}
exports.addWaitingGuest = function (id, interests, cb) {
  logger.info('addWaitingGuest start', id)

  if (interests === undefined) {
    interests = []
  }
  if (interests.length === 0) {
    interests.push('random')
  }

  var guest = { _id: id, interests: interests, status: 'finding', avoid: [] }
  guests.update({ _id: id }, guest, { upsert: true }, function (err, result) {
    if (err) {
      logger.error('addWaitingGuest error', id, err)
    }
    logger.info('addWaitingGuest success', id)
    if (cb) {
      cb()
    }
  })
  return guest
}
exports.endChatWithGuest = function (id, cb) {
  logger.info('endChatWithGuest start', id)
  updateGuest(id, { $set: { status: 'waiting' }, $unset: { peer: '', initiator: '' } }, function () {
    if (cb) {
      cb()
    }
  })
}
exports.listInterests = function (cb) {
  logger.info('listInterests start')
  guests.aggregate([
    { $unwind: '$interests' },
    { $group: { _id: '$interests', count: { '$sum': 1 } } },
    { $sort: { 'count': -1 } }
  ]).toArray(function (err, result) {
    if (err) {
      logger.error('listInterests error')
    }
    logger.info('listInterests success')
    if (cb) {
      cb(result)
    }
  })
}
exports.findMatch = function (id, cb) {
  logger.info('findMatch start', id)

  getGuest(id, function (guest) {
    var interestQuerylist = []
    guest.interests.forEach(function (interest) {
      logger.info(interest)
      interestQuerylist.push({ 'interests': interest })
    })
    var excludedIds = guest.avoid
    excludedIds.push(guest._id)
    var find = { $match: { _id: { $nin: excludedIds }, status: 'finding', $or: interestQuerylist } } // Uses avoid list
    // var find = { $match: { _id: { $ne: id }, status: 'finding', $or: interestQuerylist } } // No avoid list
    var sample = { $sample: { size: 1 } }
    logger.info('findMatch find', find)
    guests.aggregate([find, sample]).toArray(function (err, docs) {
      if (err) {
        logger.error('findMatch error', err)
        cb(null)
      }
      logger.info('findMatch success', docs)
      if (docs.length > 0) {
        var match = docs[0]
        logger.info('findMatch found matches', match)

        var guestAvoid = guest.avoid
        guestAvoid.unshift(match._id)
        if (guestAvoid.length > AVOID_LIST_COUNT) {
          guestAvoid.length = AVOID_LIST_COUNT
        }
        var matchAvoid = match.avoid
        matchAvoid.unshift(id)
        if (matchAvoid.length > AVOID_LIST_COUNT) {
          matchAvoid.length = AVOID_LIST_COUNT
        }

        updateGuest(id, { $set: { status: 'chat', peer: match._id, initiator: true, avoid: guestAvoid } })
        updateGuest(match._id, { $set: { status: 'chat', peer: id, avoid: matchAvoid } })
        if (cb) {
          var commonInterests = guest.interests.filter(x => match.interests.includes(x))
          var matchRes = {id: match._id, commonInterests: commonInterests}
          console.log('matchRes', matchRes)
          cb(matchRes)
        }
      } else {
        logger.info('findMatch no matches')
        if (cb) {
          updateGuest(id, { $set: { status: 'finding' } })
          cb()
        }
      }
    })
  })
}
var updateGuest = exports.updateGuest = function (id, updateQuery, cb) {
  logger.info('updateGuest start', id, updateQuery)
  guests.update({ _id: id }, updateQuery, function (err, result) {
    if (err) {
      logger.error('updateGuest error', id, err)
    }
    logger.info('updateGuest success', id)
    if (cb) {
      cb()
    }
  })
}
exports.liveGuests = function (cb) {
  logger.info('liveGuests start')
  // TODO - Add sorting and limiting
  guests.find({ image: { $exists: true } }).toArray(function (err, docs) {
    if (err) {
      logger.error('liveGuests error', err)
    }
    logger.info('liveGuests success', docs)
    if (cb) {
      cb(docs)
    }
  })
}
var getGuest = exports.getGuest = function (id, cb) {
  logger.info('getGuest start', id)
  guests.findOne({ _id: id }, function (err, result) {
    if (err) {
      logger.error('getGuest error', id, err)
    }
    logger.info('getGuest success', id, result)
    if (cb) {
      cb(result)
    }
  })
}
exports.getAllGuests = function (cb) {
  logger.info('getAllGuests start')
  guests.find({}).toArray(function (err, docs) {
    if (err) {
      logger.error('getAllGuests error', err)
    }
    logger.info('getAllGuests success', docs)
    if (cb) {
      cb(docs)
    }
  })
}
exports.getGuestCount = function (cb) {
  logger.info('getGuestCount start')
  guests.count({}, function (err, result) {
    if (err) {
      logger.error('getGuestCount error', err)
    }
    logger.info('getGuestCount success', result)
    if (cb) {
      cb(result)
    }
  })
}
exports.addFeedback = function (text, cb) {
  logger.info('addFeedback start', text)
  var feedbackItem = {
    _id: hat(),
    text: text,
    date: new Date()
  }
  feedback.insert(feedbackItem, function (err, result) {
    if (err) {
      logger.error('addFeedback error', err)
    }
    logger.info('addFeedback success', result)
    if (cb) {
      cb()
    }
  })
}
exports.getFeedback = function (cb) {
  logger.info('getFeedback start')
  feedback.find({}).toArray(function (err, docs) {
    if (err) {
      logger.error('getFeedback error', err)
    }
    logger.info('getFeedback success', docs)
    if (cb) {
      cb(docs)
    }
  })
}
exports.removeFeedback = function (id, cb) {
  logger.info('removeFeedback start', { _id: id })
  feedback.deleteOne({ _id: id }, function (err, result) {
    if (err) {
      logger.error('removeFeedback error', id, err)
    }
    logger.info('removeFeedback success', id)
    if (cb) {
      cb()
    }
  })
}
