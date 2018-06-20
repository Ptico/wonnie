# Wonnie stack v2.0.beta 2

This is an example of *wonnie* frontend stack, which we use at [Aejis](http://aejis.eu/)

Currently it does:

- Build [scss](http://sass-lang.com/) files, postprocess them with [autoprefixer](https://github.com/ai/autoprefixer) and minify with [cssnano](http://cssnano.co)
- Convert and bundle ES2015 to ES5
- Optimize images with [jpegtran](http://jpegclub.org/jpegtran/), [SVGO](https://github.com/svg/svgo), [gifsicle](https://www.lcdf.org/gifsicle/) and [ImageOptim](https://imageoptim.com/)
- Compress text assets with Gzip and Brotli for webservers
- Create assets revision and revision file ([Hanami](http://hanamirb.org) compatible!)
- Builds sourcemaps with preserved file structure

## Concepts

- Create an assets bundle which is as small as possible
- Production build time doesn't matter, web performance is
- Comfortable debugging with proper sourcemaps

## TODO

- [ ] TypeScript support
- [ ] Linting
- [ ] Unit testing
- [ ] Example configurations for nginx and h2o servers
- [ ] Build and minify mustache html templates
- [ ] Copy and optimize favicons and app-icons
- [ ] Rails and Sinatra compatibility

## Usage

- `gulp dev` - build assets without compression and optimizations (fast for developmet)
- `gulp prod` - build and optimize assets, but without gzipping and revisioning
- `gulp build` - build, optimize, compress and revision assets
- `gulp watch` - watch for changes and rebuild assets
