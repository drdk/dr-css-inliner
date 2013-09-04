var fs = require("fs"),
	webpage = require("webpage"),
	args = require("system").args;

var	url = args[1],
	width = args[2],
	height = args[3],
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
	
	if (response) {

		switch (response.message) {
			case "complete":
				if (outputpath) {
					console.log("writing to", outputpath);
					fs.write(outputpath, response.data);
				}
				else {
					console.log(response.message, response.data);
				}
				phantom.exit();
				break;
			default:
				console.log(response.message, response.data);
				break;
		}

	}
	
};

page.open(url, function () {
	
	var injection = page.injectJs("./lib/extractCSS.js");
	if (injection) {
		/*
		setTimeout(function () {
			phantom.exit();
		}, 10000);
		*/
	}
	else {
		phantom.exit();
	}
	
});
