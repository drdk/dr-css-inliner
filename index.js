var fs = require("fs"),
	webpage = require("webpage"),
	_args = require("system").args;

var	args = [].slice.call(_args, 1),
	url = args.shift(),
	value,
	width = 1200,
	height = 0,
	matchMQ,
	required;

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
		
		case "-r":
		case "--required":
			value = (args.length) ? args.shift() : "";
			if (value) {
				required = value.split(/\s*,\s*/);
			}
			else {
				console.error("Expected a string for 'required' option.");
				phantom.exit();
			}
			break;
		
		case "-o":
		case "--output":
			value = (args.length) ? args.shift() : "";
			if (value) {
				output = value;
			}
			else {
				console.error("Expected a string for 'output' option.");
				phantom.exit();
			}
			break;

		default:
			console.error("Unknown option.");
			phantom.exit();
			break;
	}
}

var page = webpage.create();

page.viewportSize = {
	width: width,
	height: height || 800
};

page.onCallback = function (response) {

	if (output) {
		console.log("Writing output to:", output);
		fs.write(output, response);
	}
	else {
		console.log(response);
	}
	phantom.exit();
	
};

page.open(url, function () {

	var options = {};

	if (matchMQ) {
		options.matchMQ = true;
	}

	if (required) {
		options.required = required;
	}

	if (Object.keys(options).length) {
		page.evaluate(function (options) {
			window.extractCSSOptions = options;
		}, options);
	}

	if (!height) {
		var _height = page.evaluate(function () {
			return document.body.offsetHeight;
		});
		page.viewportSize = {
			width: width,
			height: _height
		};
	}

	var injection = page.injectJs("./lib/extractCSS.js");
	if (!injection) {
		phantom.exit();
	}

});
