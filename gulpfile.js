var fs = require('fs'),
    crypto = require('crypto'),
    gulp = require('gulp'),
    util = require('gulp-util'),
    glob = require('glob'),
    path = require('path'),
    del  = require('del'),
    gzip   = require('gulp-gzip'),
    brotli = require('gulp-brotli'),
    RevAll = require('gulp-rev-all'),
    revdel = require('gulp-rev-delete-original'),
    fontmin = require('gulp-fontmin'),
    through = require('through2'),
    imagemin   = require('gulp-imagemin'),
    imageOptim = require('imageoptim');
    sourcemaps  = require('gulp-sourcemaps'),
    sass         = require('gulp-sass'),
    postcss      = require('gulp-postcss'),
    cssnano      = require('cssnano'),
    autoprefixer = require('autoprefixer'),
    runSequence  = require('run-sequence'),
    rollup             = require('rollup').rollup,
    rollupBabel        = require('rollup-plugin-babel'),
    rollupUglify       = require('rollup-plugin-uglify'),
    rollupIncludePaths = require('rollup-plugin-includepaths');

/**********
 Main tasks
 **********/
gulp.task('dev', function(done) {
  return runSequence('clean', [
    'css:compile:dev',
    'css:copy:dev',
    'js:compile:dev',
    'images:dev',
    'fonts:dev',
    'favicon'
  ], done);
});

gulp.task('prod', function(done) {
  return runSequence('clean', [
    'css:compile:prod',
    'css:copy:prod',
    'js:compile:prod',
    'images:prod',
    'fonts:prod',
    'favicon'
  ], done);
});

gulp.task('build', function(done) {
  return runSequence('prod', 'rev', 'compress', done);
});

gulp.task('watch', ['dev'], function() {
  gulp.watch('assets/css/**/*.scss', ['css:compile:dev']);
  gulp.watch('assets/css/**/*.css', ['css:copy:dev']);
  gulp.watch('assets/js/**/*.js', ['js:compile:dev']);
  gulp.watch('assets/img/**/*', ['images:dev']);
});

/****************
 Javascript tasks
 ****************/
gulp.task('js:compile:dev', function(done) {
  jsBuild(false).then(function() { done(); });
});

gulp.task('js:compile:prod', function(done) {
  jsBuild(true).then(function() { done(); });
});

/*********
 CSS tasks
 *********/
gulp.task('css:copy:dev', function() {
  return cssBuild(false);
});

gulp.task('css:copy:prod', function() {
  return cssBuild(true);
});

gulp.task('css:compile:dev', function() {
  return sassBuild(false);
});

gulp.task('css:compile:prod', function() {
  return sassBuild(true);
});

/************
 Images tasks
 ************/
gulp.task('images:dev', function() {
  return gulp.src('assets/img/**/*')
    .pipe(gulp.dest('public/img'));
});

gulp.task('imagemin', function() {
  return gulp.src(['assets/img/**/*', '!assets/img/**/*.png'])
    .pipe(imagemin({
      plugins: [
        imagemin.gifsicle(),
        imagemin.jpegtran(),
        imagemin.svgo()
      ]
    }))
    .pipe(gulp.dest('public/img'));
});

gulp.task('imageoptim', function(done) {
  gulp.src('assets/img/**/*.png')
    .pipe(gulp.dest('public/img'))
    .on('end', function() {
      imageOptim.optim(glob.sync('public/img/**/*.png'))
        .then(imageOptimReport).done(done);
    });
});

gulp.task('images:prod', ['imagemin', 'imageoptim']);

/************
 Fonts tasks
 ************/
gulp.task('fonts:dev', function() {
  return gulp.src('assets/fonts/**/*').pipe(gulp.dest('public/fonts'));
});

gulp.task('fonts:prod', function() {
  return gulp.src('assets/fonts/**/*')
    .pipe(fontmin())
    .pipe(gulp.dest('public/fonts'));
});

/******************
 Build finalization
 ******************/
gulp.task('clean', function() {
  return del('public/**/*');
});

gulp.task('favicon', function() {
  return gulp.src(['assets/favicon.ico']).pipe(gulp.dest('public'));
});

gulp.task('rev', function () {
  var revAll = new RevAll({
    fileNameManifest: 'assets.json'
  });

  return gulp.src(['public/**/*', '!public/**/*.{map, html}', '!public/assets.json'])
    .pipe(revAll.revision())
    .pipe(revdel())
    .pipe(gulp.dest('public'))
    .pipe(revAll.manifestFile('assets.json'))
    .pipe(through.obj(fixManifest))
    .pipe(gulp.dest('public'));
});

gulp.task('gzip', function() {
  return gulp.src(['public/**/*.{js,css}'])
    .pipe(gzip({
      skipGrowingFiles: true,
      gzipOptions: { level: 7 }
    }))
    .pipe(gulp.dest('public'));
});

gulp.task('brotli', function() {
  return gulp.src(['public/**/*.{js,css}'])
    .pipe(brotli.compress({
      skipLarger: true
    }))
    .pipe(gulp.dest('public'));
});

gulp.task('compress', ['gzip', 'brotli']);

/*****
 Utils
 *****/
function jsBuildFile(file, minify) {
  var plugins = [
    rollupIncludePaths({ paths: ['assets/js'] }),
    rollupBabel()
  ];

  if (minify) plugins.push(rollupUglify());

  return rollup({
    entry: file,
    plugins: plugins
  }).then(function(bundle) {
    bundle.write({
      sourceMap: true,
      dest: 'public/js/' + path.basename(file),
      format: 'iife'
    });
  }).catch(util.log);
}

function jsBuild(minify) {
  var jobs = glob.sync('assets/js/*.js').map(function(file) {
    return jsBuildFile(file, minify);
  });

  return Promise.all(jobs);
}

var autoprefixerOptions = { browsers: ['last 2 versions'], cascade: false };

function cssBuild(minify) {
  var postCSSPlugins = [autoprefixer(autoprefixerOptions)];

  if (minify) postCSSPlugins.push(cssnano({ safe: true } ));

  return gulp.src('assets/css/**/*.css')
    .pipe(sourcemaps.init())
    .pipe(postcss(postCSSPlugins))
    .pipe(sourcemaps.write('.', { sourceRoot: 'assets/css' }))
    .pipe(gulp.dest('public/css'));
}

function sassBuild(minify) {
  var style = 'expanded',
      postCSSPlugins = [autoprefixer(autoprefixerOptions)];

  if (minify) {
    style = 'compressed';
    postCSSPlugins.push(cssnano({ safe: true }));
  }

  return gulp.src('assets/css/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: style }).on('error', sass.logError))
    .pipe(postcss(postCSSPlugins))
    .pipe(sourcemaps.write('.', { sourceRoot: 'assets/css' }))
    .pipe(gulp.dest('public/css'));
}

function imageOptimReport(result) {
  var saved = result.reduce(function(prev, current) {
    return (current.savedBytes || 0) + prev;
  }, 0);

  util.log('imageoptim: Minified ' + result.length + ' image(s) ' +
    util.colors.gray('(saved ' + (saved / 1024).toFixed(2) + ' kB)'));
}

function fixManifest(file, enc, cb) {
  var manifest = JSON.parse(file.contents),
      newManifest = {};

  Object.keys(manifest).forEach(function(k) {
    var path = manifest[k],
        file = fs.readFileSync('./public/' + path),
        sha  = crypto.createHash('sha256');

    newManifest['/' + k] = {
      'target': '/' + path,
      'sri': ['sha256-' + sha.update(file).digest('base64')]
    };
  });

  file.contents = new Buffer(JSON.stringify(newManifest, null, 2));

  this.push(file);

  cb();
}
