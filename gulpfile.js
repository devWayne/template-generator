var fs = require('fs');
var path = require('path');

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')(); // Load all gulp plugins
                                              // automatically and attach
var less = require('gulp-less');
var jade = require('gulp-jade');
var runSequence = require('run-sequence');    // Temporary solution until gulp 4
                                              // https://github.com/gulpjs/gulp/issues/355
var template = require('lodash').template;

var pkg = require('./package.json');
var dirs = pkg['h5bp-configs'].directories;

var config=require('./config.js');



gulp.task('archive:create_archive_dir', function () {
    fs.mkdirSync(path.resolve(dirs.archive), '0755');
});

gulp.task('archive:zip', function (done) {

    var archiveName = path.resolve(dirs.archive, pkg.name + '_v' + pkg.version + '.zip');
    var archiver = require('archiver')('zip');
    var files = require('glob').sync('**/*.*', {
        'cwd': dirs.dist,
        'dot': true // include hidden files
    });
    var output = fs.createWriteStream(archiveName);

    archiver.on('error', function (error) {
        done();
        throw error;
    });

    output.on('close', done);

    files.forEach(function (file) {

        var filePath = path.resolve(dirs.dist, file);

        // `archiver.bulk` does not maintain the file
        // permissions, so we need to add files individually
        archiver.append(fs.createReadStream(filePath), {
            'name': file,
            'mode': fs.statSync(filePath)
        });

    });

    archiver.pipe(output);
    archiver.finalize();

});

gulp.task('clean', function (done) {
    require('del')([
        template('<%= archive %>', dirs),
        template('<%= dist %>', dirs)
    ], done);
});

gulp.task('copy', [
    'compile:less',
    'compile:index.jade',
]);


gulp.task('compile:index.jade', function () {
    return gulp.src(template('<%= template %>/index.jade', dirs))
               .pipe(jade({locals:config.config,pretty: true}))
               .pipe(gulp.dest(template('<%= dist %>', dirs)));
});

gulp.task('copy:jquery', function () {
    return gulp.src(['node_modules/jquery/dist/jquery.min.js'])
               .pipe(plugins.rename('jquery-' + pkg.devDependencies.jquery + '.min.js'))
               .pipe(gulp.dest(template('<%= dist %>/js/vendor', dirs)));
});

gulp.task('compile:less', function () {

    var banner = '/*! template v' + pkg.version +
                    ' | ' + pkg.license.type + ' License' +
                    ' | ' + pkg.homepage + ' */\n\n';

    return gulp.src(template('<%= template %>/less/*.less', dirs))
               .pipe(less())
               .pipe(plugins.header(banner))
               .pipe(gulp.dest(template('<%= dist %>/css', dirs)));

});

gulp.task('compile:jade', function () {
    return gulp.src(template('<%= template %>/jade/*.jade', dirs))
               .pipe(jade())
               .pipe(plugins.replace(/{{JQUERY_VERSION}}/g, pkg.devDependencies.jquery))
               .pipe(gulp.dest(template('<%= dist %>/html', dirs)));

});

gulp.task('copy:misc', function () {
    return gulp.src([
        template('!<%= template %>/*/**', dirs),
        // Exclude the following files
        // (other tasks will handle the copying of these files)
        template('!<%= template %>/less/*.less', dirs),
        template('!<%= template %>/jade/*.jade', dirs),
        template('!<%= template %>/index.jade', dirs)
    ], {

        // Include hidden files by default
        dot: true

    }).pipe(gulp.dest(template('<%= dist %>', dirs)));
});


gulp.task('jshint', function () {
    return gulp.src([
        'gulpfile.js',
        template('<%= template %>/js/*.js', dirs)
    ]).pipe(plugins.jshint())
      .pipe(plugins.jshint.reporter('jshint-stylish'))
      .pipe(plugins.jshint.reporter('fail'));
});

gulp.task('watch', function () {
    gulp.watch([template('<%= template %>/less/*', dirs),template('<%= template %>/index.jade', dirs),template('<%= template %>/jade/*', dirs)], ['compile:less','compile:jade','compile:index.jade']);
});


// -----------------------------------------------------------------------------
// | Main tasks                                                                |
// -----------------------------------------------------------------------------

gulp.task('archive', function (done) {
    runSequence(
        'build',
        'archive:create_archive_dir',
        'archive:zip',
    done);
});

gulp.task('build', function (done) {
    runSequence(
        ['clean'],
        'copy',
    done);
});

gulp.task('default', ['build']);