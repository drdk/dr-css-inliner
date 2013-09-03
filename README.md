dr-inview-css-inliner
=====================

PhantomJS script to inline CSS for the visible HTML of a page by given viewport size.

##Usage:

```
phantomjs index.js [arguments]
```

####Arguments:

* `width` - The desired viewport width of the webpage.
* `height` - The desired viewport height og the webpage.
* `output` - (Optional) Path to write output to. If not supplied output is just logged to console.

#####Example:
```
phantomjs index.js http://www.mydomain.com 640 480 inlined.css
```
