// Gruntfile for simple js + css + php project

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-browser-sync');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');

    var pkg = grunt.file.readJSON('package.json');

    grunt.initConfig({

        pkg: pkg,

        watch: {
            css: {
                files: 'public/src/**/*.less',
                tasks: ['less:development']
            },
            index: {
                files: 'src/index.template.html',
                tasks: ['copy:indexdev']
            }
        },

        copy: {
            indexrelease: {
                //index.html
                options: {
                    processContent: function (content, srcpath) {
                        var template = { version: pkg.version, today: grunt.template.today('dd-mm-yyyy'), build: 'release' };
                        return grunt.template.process(content, {data: template});
                    }
                },
                src: 'public/src/index.template.html',
                dest: 'public/bin/index.html'
            },
            indexdev: {
                //index.html
                options: {
                    processContent: function (content, srcpath) {
                        var template = { version: pkg.version, today: grunt.template.today('dd-mm-yyyy'), build: 'dev' };
                        return grunt.template.process(content, {data: template});
                    }
                },
                src: 'public/src/index.template.html',
                dest: 'public/src/index.html'
            },
            release: {
                files: [
                    // html templates
                    {expand: true, cwd: 'public/src/', src: ['templates/**/*.html'], dest: 'public/bin/', filter: 'isFile'},
                    //ico
                    {expand: true, cwd: 'public/src/', src: ['*.ico'], dest: 'public/bin/', filter: 'isFile'},
                    //img
                    {expand: true, cwd: 'public/src/', src: ['img/**/*'], dest: 'public/bin/'},
                    //vendors
                    {expand: true, cwd: 'public/src/', src: ['vendors/**/*'], dest: 'public/bin/'},
                    //api
                    //{expand: true, cwd: 'public/src/', src: ['api/**/*', '!api/classes/pdoconn*.php'], dest: 'public/bin/'},
                ],
            },
        },

        less: {
            development: {
                files: {
                    'public/src/css/main.css': 'public/src/css/main.less'
                }
            },
            release: {
                files: {
                    'public/src/css/main.css': 'public/src/css/main.less'
                },
                compress: true,
                ieCompat: true,
            }
        },

        cssmin: {
            compress: {
                files: {
                    'public/bin/css/main.css': ['public/src/css/main.css']
                }
            }
        },

        uglify: {
            options: {
                mangle: true
            },
            release: {
                files: {
                    'public/bin/js/app.js':
                    [
                        'public/src/js/app.js', 
                        'public/src/js/controllers/*.js',
                        'public/src/js/services/*.js',
                        'public/src/js/directives/*.js'
                    ]
                }
            }
        },

        browserSync: {
            dist: {
                bsFiles: {
                    src: [
                        'public/src/**/*.js',
                        'public/src/**/*.php',
                        'public/src/**/*.html',
                        'public/src/**/*.css'
                    ]
                },
                options: {
                    proxy: '<%= php.dist.options.hostname %>:<%= php.dist.options.port %>',
                    watchTask: true,
                    notify: false,
                    open: true,
                    logLevel: 'silent',
                    ghostMode: {
                        clicks: true,
                        scroll: true,
                        links: true,
                        forms: true
                    }
                }
            }
        }
    });

    grunt.registerTask('serverwatch', [
        'copy:indexdev',
        'watch'
    ]);

    grunt.registerTask('watchdev', [
        'copy:indexdev',
        'watch'
    ]);

    grunt.registerTask('warningrelease', 'Display release warning', function(arg) {
        grunt.log.error('! WARNING !');
        grunt.log.error('! You need to add the proper config in server/config.js !');
        grunt.log.error('! WARNING !');
    });

    grunt.registerTask('build', [
        'less:development',
        'copy:indexdev'
    ]);

    grunt.registerTask('release', [
        'less:release',
        'cssmin:compress',
        'uglify:release',
        'copy:release',
        'copy:indexrelease',
        'warningrelease'
    ]);

}
