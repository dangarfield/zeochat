module.exports = function (grunt) {
  'use strict'

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: 'dist',
    bump: {
      options: {
        files: ['package.json'],
        commit: false,
        createTag: false,
        push: false,
        globalReplace: false,
        prereleaseName: false,
        metadata: '',
        regExp: false,
        updateConfigs: ['pkg']
      }
    },
    assemble: {
      options: {
        flatten: true,
        partials: ['src/partials/*.hbs'],
        layoutdir: 'src/layouts',
        layout: 'default.hbs'

      },
      full: {
        options: {
          data: {version: '<%= pkg.version %>', fullBuild: true}
        },
        src: ['src/pages/home.hbs'],
        dest: 'dist/index'
      },
      quick: {
        options: {
          data: {version: '<%= pkg.version %>', fullBuild: false}
        },
        src: ['src/pages/home.hbs'],
        dest: 'dist/index'
      }
    },
    copy: {
      img: {
        expand: true,
        cwd: 'src/assets',
        src: ['img/**'],
        dest: 'dist/'
      },
      feather: {
        expand: true,
        cwd: 'src/assets/css/vendors/feather/fonts',
        src: ['**'],
        dest: 'dist/fonts'
      },
      fa: {
        expand: true,
        cwd: 'src/assets/css/vendors/feather/fonts',
        src: ['**'],
        dest: 'dist/fonts'
      },
      all: {
        expand: true,
        cwd: 'src/assets',
        src: ['**'],
        dest: 'dist/'
      }
    },
    connect: {
      server: {
        options: {
          port: 3004,
          keepalive: true,
          base: 'dist'
        }
      }
    },
    browserify: {
      full: {
        src: ['src/assets/js/main.js'],
        dest: 'processing/bundle-browserify.js'
      },
      quick: {
        src: ['src/assets/js/main.js'],
        dest: 'dist/bundle-<%= pkg.version %>.js'
      }
    },
    uglify: {
      bundle: {
        files: {
          'dist/bundle-<%= pkg.version %>.js': ['processing/bundle-browserify.js']
        }
      }
    },
    cssmin: {
      bundle: {
        files: [{
          // 'processing/bundle-cssmin.css': [
          'dist/bundle-<%= pkg.version %>.css': [
            'src/assets/css/font-adventpro.css',
            'src/assets/css/font-montserrat.css',
            'src/assets/css/font-opensans.css',
            'src/assets/css/vendors/feather/style.min.css',
            'src/assets/css/vendors/font-awesome/css/font-awesome.min.css',
            'src/assets/css/bootstrap.css',
            'src/assets/css/bootstrap-extended.css',
            'src/assets/css/colors.css',
            'src/assets/css/components.css',
            'src/assets/css/vertical-menu.css',
            'src/assets/css/palette-gradient.css',
            'src/assets/css/chat-application.css',
            'src/assets/css/coming-soon.css',
            'src/assets/css/style.css']
        }]
      }
    },
    purifycss: {
      options: {},
      target: {
        src: ['dist/index.html', 'dist/bundle.js'],
        css: ['processing/bundle-cssmin.css'],
        dest: 'dist/bundle-<%= pkg.version %>.css'
      }
    }
  })
  grunt.loadNpmTasks('grunt-assemble')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-connect')
  grunt.loadNpmTasks('grunt-browserify')
  grunt.loadNpmTasks('grunt-contrib-uglify-es')
  grunt.loadNpmTasks('grunt-contrib-cssmin')
  grunt.loadNpmTasks('grunt-purifycss')
  grunt.loadNpmTasks('grunt-bump')

  // The default task to run with the `grunt` command.
  grunt.registerTask('default', ['clean', 'bump', 'assemble:quick', 'copy:all', 'browserify:quick', 'connect'])
  grunt.registerTask('build', ['clean', 'bump:minor', 'assemble:full', 'copy:img', 'copy:feather', 'copy:fa', 'browserify', 'uglify', 'cssmin'])//, 'purifycss'])
}
