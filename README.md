dr-inview-css
=============

PhantomJS script to extract the needed CSS for the visible HTML of a page by given viewport size.

Perceived increased pageload speed can be achieved by inlining the CSS for above-the-fold content - circumventing blocking stylesheets.
This script will help extract the CSS needed. 

As proposed by the Google Pagespeed team:
[Optimizing the Critical Rendering Path for Instant Mobile Websites - Velocity SC - 2013](https://www.youtube.com/watch?v=YV1nKLWoARQ) 

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
