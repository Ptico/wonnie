# Wonnie stack v2.0.beta

This is an example of *wonnie* frontend stack, which we use at [Aejis](http://aejis.eu/)

Currently it does:

- Build [scss](http://sass-lang.com/) files, postprocess them with [autoprefixer](https://github.com/ai/autoprefixer) and minify with [cssnano](http://cssnano.co)
- Convert and bundle ES2015 to ES5
- Optimize images with [jpegtran](http://jpegclub.org/jpegtran/), [SVGO](https://github.com/svg/svgo), [gifsicle](https://www.lcdf.org/gifsicle/) and [ImageOptim](https://imageoptim.com/)
- Compress text assets with Gzip and Brotli for webservers
- Create assets revision and revision file ([Hanami](http://hanamirb.org) compatible!)
- Builds sourcemaps with preserved file structure

TODO:

- [ ] Optimize fonts
- [ ] Build and minify mustache html templates
- [ ] Copy and optimize favicons and app-icons

## Usage

- `gulp dev`
- `gulp prod`
- `gulp watch`
