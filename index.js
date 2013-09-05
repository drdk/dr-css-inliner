var fs = require("fs"),
	webpage = require("webpage"),
	args = require("system").args;

var	url = args[1],
	width = args[2] || 1200,
	height = args[3] || 800,
	outputpath = args[4] || null;

var page = webpage.create();

page.viewportSize = {
	width: width,
	height: height
};

page.clipRect = { 
	top: 0,
	left: 0,
	width: width,
	height: height
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
	var injection = page.injectJs("./lib/extractCSS.js");
	if (!injection) {
		phantom.exit();
	}
	
});
