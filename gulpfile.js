'use strict';

var gulp = require('gulp'),
	debug = require('gulp-debug'),
	del = require('del'),
	concat = require('gulp-concat'),
	sourcemaps = require('gulp-sourcemaps'),
	uglify = require('gulp-uglify'),
	minifyCss = require('gulp-minify-css'),
	ngAnnotate = require('gulp-ng-annotate'),
	rev = require('gulp-rev'),
	revReplace = require('gulp-rev-replace'),
	revDel = require('rev-del'),
	less = require('gulp-less'),
	zip = require('gulp-zip');

var paths = {
	move: [
        'src/popup/html/**/*.html',
        'src/images/**/*',
        'bower_components/bootstrap/fonts/*.{eot,svg,ttf,woff,woff2}',
        'bower_components/bootstrap-material-design/fonts/Material-Design-Icons.{eot,svg,ttf,woff,woff2}',
        'bower_components/angular-ui-grid/*.{eot,svg,ttf,woff,woff2}',
    ],
	background: [
        'bower_components/jquery/dist/jquery.min.js',
        'src/js/**/*.js',
        'src/background/storeManager.js',
        'src/background/requestManager.js',
        'src/background/priorityQueue.js',
        'src/background/background.js',
        'src/background/sites/**/*.js'
    ],
	libs: [
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/angular/angular.min.js',
        'bower_components/angular-i18n/angular-locale_pt-br.js',
        'bower_components/angular-animate/angular-animate.min.js',
        'bower_components/angular-aria/angular-aria.min.js',
        'bower_components/angular-material/angular-material.min.js',
        'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
        'bower_components/angular-ui-grid/ui-grid.min.js',
        'bower_components/gm.datepickerMultiSelect/dist/gm.datepickerMultiSelect.min.js'
    ],
	scripts: [
        'src/popup/app.module.js',
        'src/popup/app.constants.js',
        'src/popup/app.config.js',
        'src/popup/app.run.js',
        'src/popup/app.controller.js',
        'src/popup/app.exception.js',
        'src/popup/filters/**/*.js',
    ],
	less: 'src/popup/app.less',
};

var distPaths = {
	dest: 'dist',
	background: 'background.js',
	libs: 'libs.js',
	scripts: 'app.js',
	css: 'app.css',
};

// Clean dist folder
gulp.task('clean', function () {
	return del([distPaths.dest + '/*']).then(function (deletedPaths) {
		console.log('Deleted files/folders:\n', deletedPaths.join('\n'));
	});
});

// Move non-processed files to dist (fonts, html, images, ...)
gulp.task('move', function () {
	return gulp.src(paths.move)
		.pipe(debug({
			title: 'Moved file:'
		}))
		.pipe(gulp.dest(distPaths.dest));
});

// Concat, minify and create sourcemaps for background scripts
gulp.task('background', function () {
	return gulp.src(paths.background)
		.pipe(debug({
			title: 'Concat file to background:'
		}))
		//.pipe(sourcemaps.init())
		.pipe(concat(distPaths.background))
		.pipe(uglify().on('error', function (err) {
			console.log(err);
		}))
		//.pipe(sourcemaps.write())
		.pipe(gulp.dest(distPaths.dest))
});

// Concat 3rd party libs
gulp.task('popup:libs', function () {
	return gulp.src(paths.libs)
		.pipe(debug({
			title: 'Concat file to libs:'
		}))
		.pipe(concat(distPaths.libs))
		.pipe(gulp.dest(distPaths.dest))
});

// Concat, minify and create sourcemaps for app scripts
gulp.task('popup:js', function () {
	return gulp.src(paths.scripts)
		.pipe(debug({
			title: 'Concat file to js:'
		}))
		//.pipe(sourcemaps.init())
		.pipe(ngAnnotate().on('error', function (err) {
			console.log(err);
		}))
		.pipe(concat(distPaths.scripts))
		.pipe(uglify().on('error', function (err) {
			console.log(err);
		}))
		//.pipe(sourcemaps.write())
		.pipe(gulp.dest(distPaths.dest))
});

// Compile less and minify css
gulp.task('popup:css', function () {
	return gulp.src(paths.less)
		.pipe(debug({
			title: 'Less file:'
		}))
		.pipe(less())
		.pipe(minifyCss())
		.pipe(gulp.dest(distPaths.dest))
});

// Revision static asset appending hash
gulp.task('rev', ['popup:libs', 'popup:js', 'popup:css'], function () {
	var staticFiles = [
		distPaths.dest + '/' + distPaths.libs,
		distPaths.dest + '/' + distPaths.scripts,
		distPaths.dest + '/' + distPaths.css
	];

	return gulp.src(staticFiles)
		.pipe(rev())
		.pipe(gulp.dest(distPaths.dest))
		.pipe(rev.manifest())
		.pipe(revDel({
			dest: distPaths.dest
		}))
		.pipe(gulp.dest(distPaths.dest));
});

// Rewrite popup.html with revisioned popup files
gulp.task('revreplace', ['rev'], function () {
	var manifest = gulp.src(distPaths.dest + '/rev-manifest.json');

	return gulp.src(distPaths.dest + '/popup.html')
		.pipe(revReplace({
			manifest: manifest
		}))
		.pipe(gulp.dest(distPaths.dest));
});

// Rerun the task when a file changes
gulp.task('watch', ['build'], function () {
	gulp.watch(paths.move, ['move']);
	gulp.watch(paths.background, ['background']);
	gulp.watch(paths.libs, ['popup:libs', 'rev', 'revreplace']);
	gulp.watch(paths.scripts, ['popup:js', 'rev', 'revreplace']);
	gulp.watch(paths.less, ['popup:css', 'rev', 'revreplace']);
});

// The deployment task (no need for watch)
gulp.task('build', ['clean', 'move', 'background', 'popup:libs', 'popup:js',
					'popup:css', 'rev', 'revreplace']);

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['build', 'watch']);

// Zip manifest and dist folder to deploy the app
gulp.task('zip', ['build'], function () {
	return gulp.src([
		'manifest.json',
		'_locales/**/*',
		distPaths.dest + '/**',
		// exclude static non-versioned files
		'!' + distPaths.dest + '/rev-manifest.json',
		'!' + distPaths.dest + '/' + distPaths.libs,
		'!' + distPaths.dest + '/' + distPaths.scripts,
		'!' + distPaths.dest + '/' + distPaths.css], {
			base: '.'
		})
		.pipe(debug({
			title: 'Zip file:'
		}))
		.pipe(zip('deploy.zip'))
		.pipe(gulp.dest(distPaths.dest));
});