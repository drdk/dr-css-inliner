var fs = require("fs"),
	webpage = require("webpage"),
	_args = require("system").args;

var	args = [].slice.call(_args, 1),
	url = args.shift(),
	value, width, height, matchMQ;

while (args.length) {
	switch (args.shift()) {
		
		case "-w":
		case "--width":
			value = (args.length) ? args.shift() : "";
			if (value.match(/^\d+$/)) {
				width = value;
			}
			else {
				console.error("Expected numeric value for 'width' option.");
				phantom.exit();
			}
			break;
		
		case "-h":
		case "--height":
			value = (args.length) ? args.shift() : "";
			if (value.match(/^\d+$/)) {
				height = value;
			}
			else {
				console.error("Expected numeric value for 'height' option.");
				phantom.exit();
			}
			break;

		case "-m":
		case "--match-media-queries":
			matchMQ = true;
			break;

		default:
			console.error("Unknown option.");
			phantom.exit();
			break;
	}
}

var page = webpage.create();

page.viewportSize = {
	width: width || 1200,
	height: height || 800
};

page.onCallback = function (response) {

	console.log(response);
	phantom.exit();
	
};

page.open(url, function () {

	if (matchMQ) {
		page.evaluate(function () {
			window.extractCSSMatchMediaQueries = true;
		});
	}

	if (!height) {
		page.evaluate(function () {
			window.resizeBy(0, document.body.offsetHeight - window.innerHeight);
		});
	}

	var injection = page.injectJs("./lib/extractCSS.js");
	if (!injection) {
		phantom.exit();
	}
	
});
