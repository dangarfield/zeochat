var assemble = require('assemble')
var hbsEngine = require('engine-handlebars')
var extname = require('gulp-extname')
var fs = require('fs-extra')

const PUBLIC_ROOT = 'admin'

var app = assemble()
app.engine('*', hbsEngine)

app.partials('src/partials/*.hbs')
app.layouts('src/layouts/*.hbs', {
  layout: 'default'
})
app.pages('src/pages/*.hbs', {
  layout: 'default'
})

app.dest(PUBLIC_ROOT + '/')

app.task('remove', function (cb) {
  console.log(' -- Removing files')
  fs.removeSync(PUBLIC_ROOT)
  cb()
})
app.task('compile', function () {
  console.log(' -- Compiling templates')
  return app.toStream('pages')
    .pipe(app.renderFile('*'))
    .pipe(extname())
    .pipe(app.dest(PUBLIC_ROOT + '/'))
})
app.task('rename', function (cb) {
  console.log(' -- Renaming')
  fs.readdirSync(PUBLIC_ROOT).forEach(file => {
    console.log(file)
    var name = file.substr(0, file.lastIndexOf('.'))
    console.log(name)
    if (name === 'home') {
      fs.moveSync(PUBLIC_ROOT + '/' + file, PUBLIC_ROOT + '/index.html')
    } else {
      fs.moveSync(PUBLIC_ROOT + '/' + file, PUBLIC_ROOT + '/' + name + '/index.html')
    }
  })
  cb()
})
app.task('assets', function (cb) {
  console.log(' -- Copy assets')
  return app.copy('src/assets/**', PUBLIC_ROOT + '/')
})

app.task('default', ['remove', 'compile', 'rename', 'assets'])
app.build = app.build.bind(app, 'default')

app.build(function () {
  console.log(' -- Build complete')
})
