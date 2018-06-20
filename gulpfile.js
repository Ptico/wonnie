'use strict';

const fs = require('fs'),
      crypto = require('crypto'),
      gulp = require('gulp'),
      glob = require('glob'),
      path = require('path'),
      del  = require('del'),
      Vinyl = require('vinyl'),
      logger = require('fancy-log'),
      colors = require('ansi-colors'),
      gulpif = require('gulp-if'),
      gzip   = require('gulp-gzip'),
      brotli = require('gulp-brotli'),
      RevAll = require('gulp-rev-all'),
      revdel = require('gulp-rev-delete-original'),
      fontmin = require('gulp-fontmin'),
      through = require('through2'),
      imagemin   = require('gulp-imagemin'),
      imageOptim = require('imageoptim'),
      sourcemaps = require('gulp-sourcemaps'),
      sass         = require('gulp-sass'),
      postcss      = require('gulp-postcss'),
      cssnano      = require('cssnano'),
      autoprefixer = require('autoprefixer'),
      rollup             = require('rollup').rollup,
      rollupBabel        = require('rollup-plugin-babel'),
      rollupUglify       = require('rollup-plugin-uglify'),
      rollupIncludePaths = require('rollup-plugin-includepaths');

const paths = {
  js: {
    src: 'assets/js/*.js',
    dest: 'public/js',
    watch: 'assets/js/**/*'
  },
  css: {
    src: ['assets/css/**/*.scss', 'assets/css/**/*.css'],
    dest: 'public/css'
  },
  img: {
    src: 'assets/img/**/*',
    dest: 'public/img'
  },
  fonts: {
    src: 'assets/fonts/**/*',
    dest: 'public/fonts'
  }
};

/****************
 Javascript tasks
 ****************/
gulp.task('js:dev', function(done) {
  jsBuild(false).then(function() { done(); });
});

gulp.task('js:prod', function(done) {
  jsBuild(true).then(function() { done(); });
});

/*********
 CSS tasks
 *********/
gulp.task('css:dev', function() {
  return cssBuild(false);
});

gulp.task('css:prod', function() {
  return cssBuild(true);
});

/************
 Images tasks
 ************/
gulp.task('img:dev', function() {
  return gulp.src(paths.img.src)
    .pipe(gulp.dest(paths.img.dest));
});

gulp.task('imagemin', function() {
  return gulp.src([paths.img.src, '!*.png'])
    .pipe(imagemin([
        imagemin.gifsicle(),
        imagemin.jpegtran(),
        imagemin.svgo()
      ])
    )
    .pipe(gulp.dest(paths.img.dest));
});

gulp.task('imageoptim', function(done) {
  gulp.src(paths.img.src + '.png')
    .pipe(gulp.dest(paths.img.dest))
    .on('end', function() {
      imageOptim.optim(glob.sync(paths.img.dest + '/**/*.png'))
        .then(imageOptimReport).done(done);
    });
});

gulp.task('img:prod', gulp.parallel('imagemin', 'imageoptim'));

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
  return gulp.src(['public/**/*', '!public/**/*.{map, html}', '!public/assets.json'])
    .pipe(RevAll.revision({fileNameManifest: 'assets.json'}))
    .pipe(revdel())
    .pipe(gulp.dest('public'))
    .pipe(RevAll.manifestFile())
    .pipe(fixFile())
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

gulp.task('compress', gulp.parallel('gzip', 'brotli'));

/**********
 Main tasks
 **********/
gulp.task('dev',
  gulp.series(
    'clean',
    gulp.parallel('css:dev', 'js:dev', 'img:dev', 'fonts:dev', 'favicon')
  )
);

gulp.task('prod',
  gulp.series(
    'clean',
    gulp.parallel('css:prod', 'js:prod', 'img:prod', 'fonts:prod', 'favicon')
  )
);

gulp.task('build',
  gulp.series('prod', 'rev', 'compress')
);

gulp.task('watch',
  gulp.series('dev', watch)
);
/*****
 Utils
 *****/
function jsBuild(minify) {
  let jobs = glob.sync(paths.js.src).map(function(file) {
    return jsBuildFile(file, minify);
  });

  return Promise.all(jobs);
}

function jsBuildFile(file, minify) {
  let plugins = [
    rollupIncludePaths({ paths: [path.dirname(paths.js.src)] }),
    rollupBabel()
  ];

  if (minify) plugins.push(rollupUglify.uglify());

  return rollup({
    input: file,
    plugins: plugins
  }).then(function(bundle) {
    bundle.write({
      sourcemap: true,
      file: paths.js.dest + '/' + path.basename(file),
      format: 'iife'
    });
  }).catch(logger.error);
}

function cssBuild(minify) {
  let autoprefixerOptions = { cascade: false },
      style = 'expanded',
      postCSSPlugins = [autoprefixer(autoprefixerOptions)];

  if (minify) {
    style = 'compressed';
    postCSSPlugins.push(cssnano({ safe: true }));
  }

  return gulp.src(paths.css.src)
    .pipe(sourcemaps.init())
    .pipe(gulpif('*.scss', sass({ outputStyle: style }).on('error', sass.logError)))
    .pipe(postcss(postCSSPlugins))
    .pipe(sourcemaps.write('.', { sourceRoot: './assets/css' }))
    .pipe(gulp.dest(paths.css.dest));
}

function imageOptimReport(result) {
  var saved = result.reduce(function(prev, current) {
    return (current.savedBytes || 0) + prev;
  }, 0);

  logger('imageoptim: Minified ' + result.length + ' image(s) ' +
    colors.gray('(saved ' + (saved / 1024).toFixed(2) + ' kB)'));
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

  file.contents = Buffer.from(JSON.stringify(newManifest, null, 2));

  this.push(file);

  cb();
}

function watch() {
  gulp.watch(paths.css.src, gulp.series('css:dev'));
  gulp.watch(paths.js.watch, gulp.series('js:dev'));
  gulp.watch(paths.img.src, gulp.series('img:dev'));
}

// TODO - remove when the new version of gulp-rev-all will be released
function fixFile() {
  return through.obj(function(file, enc, cb) {
    let upgradedFile = new Vinyl(file);
    cb(null, upgradedFile);
  });
}
