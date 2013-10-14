var fs = require("fs"),
	webpage = require("webpage"),
	system = require("system");

var args = [].slice.call(system.args, 1), arg,
	html, url, fakeUrl,
	value,
	width = 1200,
	height = 0,
	matchMQ,
	required,
	cssOnly = false,
	cssId,
	cssToken,
	exposeCSS;

html = system.stdin.read();
system.stdin.close();

while (args.length) {
	arg = args.shift();
	switch (arg) {

		case "-f":
		case "--fake-url":
			value = (args.length) ? args.shift() : "";
			if (value) {
				if (!value.match(/(\/|\.[^./]+)$/)) {
					value += "/";
				}
				fakeUrl = value;
			}
			else {
				fail("Expected string for 'fake-url' option");
			}
			break;

		case "-w":
		case "--width":
			value = (args.length) ? args.shift() : "";
			if (value.match(/^\d+$/)) {
				width = value;
			}
			else {
				fail("Expected numeric value for 'width' option");
			}
			break;

		case "-h":
		case "--height":
			value = (args.length) ? args.shift() : "";
			if (value.match(/^\d+$/)) {
				height = value;
			}
			else {
				fail("Expected numeric value for 'height' option");
			}
			break;

		case "-m":
		case "--match-media-queries":
			matchMQ = true;
			break;

		case "-r":
		case "--required-selectors":
			value = (args.length) ? args.shift() : "";
			if (value) {
				required = parseString(value).split(/\s*,\s*/);
			}
			else {
				fail("Expected a string for 'required-selectors' option");
			}
			break;

		case "-e":
		case "--expose-stylesheets":
			value = (args.length) ? args.shift() : "";
			if (value) {
				exposeCSS = ((value.indexOf(".") > -1) ? "" : "var ") + value;
			}
			else {
				fail("Expected a string for 'expose-stylesheets' option");
			}
			break;

		case "-t":
		case "--insertion-token":
			value = (args.length) ? args.shift() : "";
			if (value) {
				cssToken = parseString(value);
			}
			else {
				fail("Expected a string for 'insertion-token' option");
			}
			break;

		case "-i":
		case "--css-id":
			value = (args.length) ? args.shift() : "";
			if (value) {
				cssId = value;
			}
			else {
				fail("Expected a string for 'css-id' option");
			}
			break;

		case "-c":
		case "--css-only":
			cssOnly = true;
			break;

		default:
			if (!url && !arg.match(/^--?[a-z]/)) {
				url = arg;
			}
			else {
				fail("Unknown option");
			}
			break;
	}
	
}

var page = webpage.create();

page.viewportSize = {
	width: width,
	height: height || 800
};

page.onCallback = function (response) {
	if (response.css) {
		var result;
		if (cssOnly) {
			result = response.css;
		}
		else {
			result = inlineCSS(html, response.css);
		}
		system.stdout.write(result);
		phantom.exit();
	}
	else {
		system.stdout.write(response);
		phantom.exit();
	}
};

page.onError = function (msg, trace) {
	var msgStack = ['ERROR: ' + msg];
	if (trace && trace.length) {
		msgStack.push('TRACE:');
		trace.forEach(function (t) {
			msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
		});
	}
	fail(msgStack.join('\n'));
};

page.onConsoleMessage = function (msg, lineNum, sourceId) {
	console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
};

page.onLoadFinished = function () {

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

	var scriptPath = phantom.libraryPath + "/extractCSS.js";

	if (!fs.isFile(scriptPath)) {
		fail("Unable to locate script at: " + scriptPath);
	}

	var injection = page.injectJs(scriptPath);
	if (!injection) {
		fail("Unable to inject script in page");
	}

};

if (html) {

	if (!fakeUrl) {
		fail("Missing 'fake-url' option");
	}

	page.setContent(html, fakeUrl);

}
else {

	if (!url) {
		fail("Missing 'url' argument");
	}

	page.open(url);
}

function inlineCSS(html, css) {

	var tokenAtFirstStylesheet = !cssToken, // auto-insert css if no cssToken has been specified.
		insertToken = function () {
			var string = "";
			if (tokenAtFirstStylesheet) {
				tokenAtFirstStylesheet = false;
				string = cssToken;
			}
			return string;
		},
		links = [],
		stylesheets = [];

	if (!cssToken) {
		cssToken = "<!-- inline CSS insertion token -->";
	}

	html = html.replace(/<style[^>]*>[^<]*<\/style>/g, "").replace(/<link [^>]*rel=["']?stylesheet["'][^>]*\/>/g, function (m) {
		links.push(m);
		return insertToken();
	});

	stylesheets = links.map(function (link) {
		var urlMatch = link.match(/href="([^"]+)"/),
			mediaMatch = link.match(/media="([^"]+)"/),
			url = urlMatch && urlMatch[1],
			media = mediaMatch && mediaMatch[1];

		return { url: url, media: media };
	});

	html = html.replace(cssToken, function () {

		var exposedCSS = "";
		if (exposeCSS) {
			exposedCSS = '<script>\n\
		' + exposeCSS + ' = [' + stylesheets.map(function (link) {
			return '{href:"' + link.url + '", media:"' + link.media + '"}';
		}).join(",") + '];\n\
	</script>\n\
	';
		}

		return '<style ' + ((cssId) ? 'id="' + cssId + '" ' : "") + 'media="screen">\n\
		' + css + '\n\
	</style>\n\
	' + exposedCSS;

	});

	return html;

}

function fail(message) {
	system.stderr.write(message);
	phantom.exit();
}

function parseString(value) {
	return (value.match(/^(["']).*\1$/)) ? JSON.parse(value) : value;
}