module.exports = function (grunt) {
  'use strict'

  grunt.initConfig({
    assemble: {
      options: {
        flatten: true,
        partials: ['src/partials/*.hbs'],
        layoutdir: 'src/layouts',
        layout: 'default.hbs'
      },
      site: {
        files: {
          'admin/index': ['src/pages/home.hbs'],
          'admin/live-guests/index': ['src/pages/live-guests.hbs'],
          'admin/status/index': ['src/pages/status.hbs'],
          'admin/interests/index': ['src/pages/interests.hbs'],
          'admin/monitor-chat/index': ['src/pages/monitor-chat.hbs'],
          'admin/archive/index': ['src/pages/archive.hbs'],
          'admin/feedback/index': ['src/pages/feedback.hbs']
        }
      }
    },
    copy: {
      main: {
        expand: true,
        cwd: 'src',
        src: 'assets/**',
        dest: 'admin/'
      }
    },
    connect: {
      server: {
        options: {
          port: 3006,
          keepalive: true
        }
      }
    },
    browserify: {
      adminBundle: {
        src: ['src/assets/js/admin.js'],
        dest: 'admin/js/bundle-admin.js'
      }
    }
  })

  // Load the Assemble plugin.
  grunt.loadNpmTasks('grunt-assemble')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-connect')
  grunt.loadNpmTasks('grunt-browserify')

  // The default task to run with the `grunt` command.
  grunt.registerTask('default', ['assemble', 'copy', 'browserify', 'connect'])
}
