dr-css-extractor
================

PhantomJS script to extract above-the-fold CSS for a webpage.

Inlining CSS for above-the-fold content (and loading stylesheets in a non-blocking manner) will make pages render instantly.
This script will help extract the CSS needed.

As proposed by the Google Pagespeed team:
[Optimizing the Critical Rendering Path for Instant Mobile Websites - Velocity SC - 2013](https://www.youtube.com/watch?v=YV1nKLWoARQ) 

## Usage:

```
phantomjs index.js <url> [options]
```

#### Options:

* `-o, --output [string]` - Path to write output to. Defaults to `STDOUT`.
* `-w, --width [value]` - Determines the width of the viewport. Defaults to 1200.
* `-h, --height [value]` - Determines the above-the-fold height. Defaults to the actual document height.
* `-m, --match-media-queries` - Omit media queries that don't match the defined width.

##### Examples:

Only extract the needed above-the-fold CSS for smaller devices:
```
phantomjs index.js http://www.mydomain.com/index.html -w 350 -h 480 -m -o mobile.css
```

Extract all needed CSS for the above-the-fold content on all devices (default 1200px and smaller):
```
phantomjs index.js http://www.mydomain.com/index.html -h 800 -o page-top.css
```

Extract all needed CSS for webpage:
```
phantomjs index.js http://www.mydomain.com/index.html -o page.css
```
