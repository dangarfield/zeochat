var winston = require('winston')
const PAPERTRAIL_HOST = process.env.ZEOCHAT_PAPERTRAIL_HOST
const PAPERTRAIL_PORT = process.env.ZEOCHAT_PAPERTRAIL_PORT
const PAPERTRAIL_APP = process.env.ZEOCHAT_PAPERTRAIL_APP
var logger
if (PAPERTRAIL_HOST != null && PAPERTRAIL_PORT != null && PAPERTRAIL_APP != null) {
  console.log('Using papertrailLogger')
  var wpt = require('winston-papertrail').Papertrail
  if (wpt) {
    console.log('winston-papertrail is set')
  }
  var winstonPapertrail = new winston.transports.Papertrail({
    host: PAPERTRAIL_HOST,
    port: PAPERTRAIL_PORT,
    logFormat: function (level, message) {
      return PAPERTRAIL_APP + ' [' + level + '] ' + message
    }
  })
  winstonPapertrail.on('error', function (err) {
    console.log('error', err)
  })
  logger = new winston.Logger({
    transports: [winstonPapertrail]
  })
} else {
  console.log('Using local console.log')
  var winstonConsole = new winston.transports.Console()
  logger = new winston.Logger({
    transports: [winstonConsole]
  })
}
exports.default = logger
