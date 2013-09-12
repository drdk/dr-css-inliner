var fs = require("fs"),
	webpage = require("webpage"),
	args = require("system").args;

var	url = args[1],
	width = args[2] || null,
	height = args[3] || null,
	outputpath = args[4] || null;

if (width) {
	width = parseInt(width);
}
if (height) {
	height = parseInt(height);
}

var page = webpage.create();

page.viewportSize = {
	width: width || 1200,
	height: height || 800
};

page.onCallback = function (response) {

	if (response && response.message == "complete") {

		if (outputpath) {
			console.log("Writing to", outputpath);
			fs.write(outputpath, response.data);
		}
		else {
			console.log(response.data);
		}
		phantom.exit();

	}
	
};

page.open(url, function () {

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
