var nodeStatic = require('node-static')
var http = require('http')

const PORT = process.env.ZEOCHAT_PORT_WEB

function checkEnvVars () {
  console.log('PORT', PORT)
  if (PORT == null) {
    console.error('Environment variables not set correctly')
    process.exit(1)
  }
}
checkEnvVars()

var httpServer = http.createServer()
var staticServer = new nodeStatic.Server('./', { cache: false })

httpServer.on('request', function (req, res) {
  req.addListener('end', function () {
    staticServer.serve(req, res)
  }).resume()
})

httpServer.listen(PORT, function () {
  console.log('Web app listening on port ' + PORT)
})
