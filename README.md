dr-inview-css
=============

PhantomJS script to extract above-the-fold CSS for a webpage.

Inlining CSS for above-the-fold content (and loading stylesheets in a non-blocking manner) will make pages render instantly.
This script will help extract the CSS needed.

As proposed by the Google Pagespeed team:
[Optimizing the Critical Rendering Path for Instant Mobile Websites - Velocity SC - 2013](https://www.youtube.com/watch?v=YV1nKLWoARQ) 

##Usage:

```
phantomjs index.js width height [output]
```

####Arguments:

* `width` - The desired width of the viewport.
* `height` - The desired height of the viewport.
* `output` - (Optional) Path to write output to. If not supplied output is just logged to console.

#####Example:

```
phantomjs index.js http://www.mydomain.com/index.html 640 480 inline.css
```
