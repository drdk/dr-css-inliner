dr-css-inliner
================

PhantomJS script to inline above-the-fold CSS on a webpage.

Inlining CSS for above-the-fold content (and loading stylesheets in a non-blocking manner) will make pages render instantly.
This script will help extract the CSS needed.

As proposed by the Google Pagespeed team:
[Optimizing the Critical Rendering Path for Instant Mobile Websites - Velocity SC - 2013](https://www.youtube.com/watch?v=YV1nKLWoARQ) 

## How it works

There are two ways of processing a webpage; loaded via the `url` argument or piped in through `stdin`. When using `stdin` it is required that you use the `--fake-url` option in conjunction.

Once Phantomjs has loaded the page all stylesheets with no `media` set or with `media` set to `screen` or `all` are loaded again through XHR to avoid browser engine bias when parsing CSS. 

The CSS is inlined as per the supplied options and all stylesheets and style elements stripped from the webpage html. You can opt to expose the stripped stylesheets as an array in a script tag through the `-e` (`--expose-stylesheets`) option.

## Install

```
npm install dr-css-inliner
```

## Usage:

```
phantomjs index.js <url> [options]
```

#### Options:

* `-o, --output [string]` - Write the output to a file. If omitted the output is written to `stdout`.
* `-w, --width [value]` - Determines the width of the viewport. Defaults to 1200.
* `-h, --height [value]` - Determines the above-the-fold height. Defaults to the actual document height.
* `-m, --match-media-queries` - Omit media queries that don't match the defined width.
* `-r, --required-selectors [string]` - Force inclusion of required selectors in the form of a comma-separated selector string or an array (as a JSON string) of regexp strings (remember to escape `.`, `[` and `]` etc). Defaults to no required selectors.
* `-s, --strip-resources [string]` - Avoid loading resources (while extracting CSS) matching the string or array (as a JSON string) of strings turned into regexp pattern(s). Used to speed up execution of CSS inlining. Default is no stripping of resources.
* `-c, --css-only` - Output the raw required CSS without wrapping it in HTML.
* `-e, --expose-stylesheets [string]` - A variable name (or property on a preexisting variable) to expose an array containing information about the stripped stylesheets in an inline script tag.
* `-t, --insertion-token [string]` - A token (preferably an HTML comment) to control the exact insertion point of the inlined CSS. If omited default insertion is at the first encountered stylesheet.
* `-i, --css-id [string]` - Determines the id attribute of the inline style tag. By default no id is added.
* `-f,  --fake-url` - Defines a _fake_ url context. Required when piping in html through `stdin`. Default is null.
* `-d, --debug` - Prints out an HTML comment in the bottom of the output that exposes some info:
  * `time` - The time in ms it took to run the script (not including the phantomjs process itself).
  * `loadTime` - The time in ms it took to load the webpage.
  * `processingTime` - The time in ms it took to process and return the CSS in the webpage.
  * `requests` - An array of urls of all requests made by the webpage. Useful for spotting resources to strip.
  * `stripped` - An array of urls of requests aborted by the `--strip-resources` option.
  * `errors` - An array of errors that ocurred on the page.
  * `cssLength` - The length of the inlined CSS in chars.

##### Examples:

###### CSS options

Only inline the needed above-the-fold CSS for smaller devices:
```
phantomjs index.js http://www.mydomain.com/index.html -w 350 -h 480 -m -o index-mobile.html
```

Inline all needed CSS for the above-the-fold content on all devices (default 1200px and smaller):
```
phantomjs index.js http://www.mydomain.com/index.html -h 800 -o index-page-top.html
```

Inline all needed CSS for webpage:
```
phantomjs index.js http://www.mydomain.com/index.html -o index-full-page.html
```

Inline all needed CSS for webpage with extra required selectors:
```
phantomjs index.js http://www.mydomain.com/index.html -r ".foo > .bar, #myId" -o index-full-page.html
```

Inline all needed CSS for webpage with extra required regexp selector filters:
```
phantomjs index.js http://www.mydomain.com/index.html -r '["\\.foo > ", "\\.span-\\d+"]' -o index-full-page.html
```

###### Output options

The examples listed below use the following `index.css` and `index.html` samples (unless specified otherwise):

index.css:

```css
.foo {
	color: #BADA55;
}
.bar {
	color: goldenrod;
}
```

index.html:

```html
<!doctype html>
<html>
	<head>
		<title>Foo</title>
		<link href="index.css" rel="stylesheet" media="screen" />
		<link href="print.css" rel="stylesheet" media="print" />
	</head>
	<body>
		<h1 class="foo">Inlining CSS is in</h1>
	</body>
</html>
```

Doing:

```
phantomjs index.js index.html
```

...would get you:

```html
<!doctype html>
<html>
	<head>
		<title>Foo</title>
		<style>
			.foo {
				color: #BADA55;
			}
		</style>
	</head>
	<body>
		<h1 class="foo">Inlining CSS is in</h1>
	</body>
</html>
```

###### Only output CSS

`-c, --css-only`

```
phantomjs index.js index.html -c
```

...would get you:

```css
.foo {
	color: #BADA55;
}
```

###### Exposing the stripped stylesheets for later consumption

`-e, --expose-stylesheets [string]`

__Single global variable:__

```
phantomjs index.js index.html -e stylesheets
```

...would get you:

```html
<!doctype html>
<html>
	<head>
		<title>Foo</title>
		<style>
			.foo {
				color: #BADA55;
			}
		</style>
		<script>
			var stylesheets = [{url: "index.css", media: "screen"}, {url: "print.css", media: "print"}];
		</script>
	</head>
	<body>
		<h1 class="foo">Inlining CSS is in</h1>
	</body>
</html>
```

__Namespaced property:__

```
phantomjs index.js index.html -e myNamespace.stylesheets
```

provided you had an `index.html` like:

```html
<!doctype html>
<html>
	<head>
		<title>Foo</title>
		<script>
			var myNamespace = {};
		</script>
		<link href="index.css" rel="stylesheet" media="screen" />
		<link href="print.css" rel="stylesheet" media="print" />
	</head>
	<body>
		<h1 class="foo">Inlining CSS is in</h1>
	</body>
</html>
```

...would get you:

```html
<!doctype html>
<html>
	<head>
		<title>Foo</title>
		<script>
			var myNamespace = {};
		</script>
		<style>
			.foo {
				color: #BADA55;
			}
		</style>
		<script>
			myNamespace.stylesheets = [{url: "index.css", media: "screen"}, {url: "print.css", media: "print"}];
		</script>
	</head>
	<body>
		<h1 class="foo">Inlining CSS is in</h1>
	</body>
</html>
```

###### Controlling where to insert the inlined CSS

`-t, --insertion-token [string]`

provided you had an `index.html` like:

```html
<!doctype html>
<html>
	<head>
		<title>Foo</title>
		<!-- CSS goes here -->
		<script>
			var myNamespace = {};
		</script>
		<link href="index.css" rel="stylesheet" media="screen" />
		<link href="print.css" rel="stylesheet" media="print" />
	</head>
	<body>
		<h1 class="foo">Inlining CSS is in</h1>
	</body>
</html>
```

```
phantomjs index.js index.html -t "<!-- CSS goes here -->"
```

...would get you:

```html
<!doctype html>
<html>
	<head>
		<title>Foo</title>
		<style>
			.foo {
				color: #BADA55;
			}
		</style>
		<script>
			var myNamespace = {};
		</script>
	</head>
	<body>
		<h1 class="foo">Inlining CSS is in</h1>
	</body>
</html>
```

###### Avoid loading unneeded resources

`-s, --strip-resources [string]`

Doing:

```
phantomjs index.js index.html -s '["\\.(jpg|gif|png)$","webstat\\.js$"]'
```

... would avoid loading images and a given web statistic script.

###### Debug info

`-d, --debug`

Doing:
```
phantomjs index.js index.html -d
```

...would get you:

```html
<!doctype html>
<html>
	<head>
		<title>Foo</title>
		<style>
			.foo {
				color: #BADA55;
			}
		</style>
	</head>
	<body>
		<h1 class="foo">Inlining CSS is in</h1>
	</body>
</html>
<!--
	{"time":300,"loadTime":155,"processingTime":145,"requests":[...],"stripped":[...],"cssLength":5050}
-->
```


###### Adding an id to the inlined style tag

`-i, --css-id [string]`

Doing:
```
phantomjs index.js index.html -i my-inline-css
```

...would get you:

```html
<!doctype html>
<html>
	<head>
		<title>Foo</title>
		<style id="my-inline-css">
			.foo {
				color: #BADA55;
			}
		</style>
	</head>
	<body>
		<h1 class="foo">Inlining CSS is in</h1>
	</body>
</html>
```

###### Piping in HTML content through `stdin`

`-f, --fake-url [string]`

If you need to parse HTML that is not yet publicly available you can pipe it into `dr-css-inliner`. Below is a contrived example (in a real-world example imagine an httpfilter or similar in place of `cat`):

```
cat not-yet-public.html | phantomjs index.js -f http://www.mydomain.com/index.html
```

All loading of assets will be loaded relative to the _fake_ url - meaning they need to be available already.


---

## Changelog

### 0.6.0

Features:

* `-o, --output` option added.

Changes:

* Only errors in the inliner will halt execution. Remote script errors are ignored - but logged in `debug.errors`. 
* the `-x, --allow-cross-domain` option is deprecated and cross domain requests allowed by default.
* `debug.requests` is now populated by default regardless of the `--strip-resources`  option.

### 0.5.4

`css-inliner` bin removed due to not working on unix.



[![Analytics](https://ga-beacon.appspot.com/UA-8318361-2/drdk/dr-css-inliner)](https://github.com/igrigorik/ga-beacon)
