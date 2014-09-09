var debug = {
	time: new Date(),
	loadTime: null,
	processingTime: null,
	requests: [],
	stripped: [],
	errors: [],
	cssLength: 0
};

var fs = require("fs");
var webpage = require("webpage");
var system = require("system");

phantom.onError = function (msg, trace) {
	outputError("PHANTOM ERROR", msg, trace);
};

var args = [].slice.call(system.args, 1), arg;
var html, url, fakeUrl;
var value;
var width = 1200;
var height = 0;
var matchMQ;
var required;
var prefetch;
var cssOnly = false;
var cssId;
var cssToken;
var exposeStylesheets;
var stripResources;
var localStorage;
var outputDebug;
var outputPath;
var scriptPath = "/extractCSS.js";

if (fs.isLink(system.args[0])) {
	scriptPath = fs.readLink(system.args[0]).replace(/\/[\/]+$/, "");
}
else {
	scriptPath = phantom.libraryPath + scriptPath;
}

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
				fail("Expected string for '--fake-url' option");
			}
			break;

		case "-w":
		case "--width":
			value = (args.length) ? args.shift() : "";
			if (value.match(/^\d+$/)) {
				width = value;
			}
			else {
				fail("Expected numeric value for '--width' option");
			}
			break;

		case "-h":
		case "--height":
			value = (args.length) ? args.shift() : "";
			if (value.match(/^\d+$/)) {
				height = value;
			}
			else {
				fail("Expected numeric value for '--height' option");
			}
			break;

		case "-m":
		case "--match-media-queries":
			matchMQ = true;
			break;

		case "-x":
		case "--allow-cross-domain":
			//allowCrossDomain = true;
			break;

		case "-r":
		case "--required-selectors":
			value = (args.length) ? args.shift() : "";
			if (value) {
				value = parseString(value);
				if (typeof value == "string") {
					value = value.split(/\s*,\s*/).map(function (string) {
						return "(?:" + string.replace(/([.*+?=^!:${}()|[\]\/\\])/g, '\\$1') + ")";
					}).join("|");

					value = [value];
				}

				required = value;
			}
			else {
				fail("Expected a string for '--required-selectors' option");
			}
			break;

		case "-e":
		case "--expose-stylesheets":
			value = (args.length) ? args.shift() : "";
			if (value) {
				exposeStylesheets = ((value.indexOf(".") > -1) ? "" : "var ") + value;
			}
			else {
				fail("Expected a string for '--expose-stylesheets' option");
			}
			break;

		case "-p":
		case "--prefetch":
			prefetch = true;
			break;

		case "-t":
		case "--insertion-token":
			value = (args.length) ? args.shift() : "";
			if (value) {
				cssToken = parseString(value);
			}
			else {
				fail("Expected a string for '--insertion-token' option");
			}
			break;

		case "-i":
		case "--css-id":
			value = (args.length) ? args.shift() : "";
			if (value) {
				cssId = value;
			}
			else {
				fail("Expected a string for '--css-id' option");
			}
			break;

		case "-s":
		case "--strip-resources":
			value = (args.length) ? args.shift() : "";
			if (value) {
				value = parseString(value);
				if (typeof value == "string") {
					value = [value];
				}
				value = value.map(function (string) {
					//throw new Error(string);
					return new RegExp(string, "i");
				});
				stripResources = value;
			}
			else {
				fail("Expected a string for '--strip-resources' option");
			}
			break;

		case "-l":
		case "--local-storage":
			value = (args.length) ? args.shift() : "";
			if (value) {
				localStorage = parseString(value);
			}
			else {
				fail("Expected a string for '--local-storage' option");
			}
			break;

		case "-c":
		case "--css-only":
			cssOnly = true;
			break;

		case "-o":
		case "--output":
			value = (args.length) ? args.shift() : "";
			if (value) {
				outputPath = value;
			}
			else {
				fail("Expected a string for '--output' option");
			}
			break;

		case "-d":
		case "--debug":
			outputDebug = true;
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

page.settings.webSecurityEnabled = false;

page.viewportSize = {
	width: width,
	height: height || 800
};


var baseUrl = url || fakeUrl;
page.onResourceRequested = function (requestData, request) {
	var _url = requestData.url;
	if (_url.indexOf(baseUrl) > -1) {
		_url = _url.slice(baseUrl.length);
	}
	if (outputDebug && !_url.match(/^data/) && debug.requests.indexOf(_url) < 0) {
		debug.requests.push(_url);
	}
	if (stripResources) {
		var i = 0;
		var l = stripResources.length;
		// /http:\/\/.+?\.(jpg|png|svg|gif)$/gi
		while (i < l) {
			if (stripResources[i++].test(_url)) {
				if (outputDebug) {
					debug.stripped.push(_url);
				}
				request.abort();
				break;
			}
		}
	}
};

page.onCallback = function (response) {
	page.close();
	if ("css" in response) {
		var result;
		if (cssOnly) {
			result = response.css;
		}
		else {
			result = inlineCSS(response.css);
		}
		if (outputDebug) {
			debug.cssLength = response.css.length;
			debug.time = new Date() - debug.time;
			debug.processingTime = debug.time - debug.loadTime;
			result += "\n<!--\n\t" + JSON.stringify(debug) + "\n-->";
		}
		if (outputPath) {
			fs.write(outputPath, result);
		}
		else {
			system.stdout.write(result);
		}
		phantom.exit();
	}
	else {
		system.stdout.write(response);
		phantom.exit();
	}
};

page.onError = function (msg, trace) {
	outputError("PHANTOM PAGE ERROR", msg, trace);
};

page.onLoadFinished = function () {

	if (!html) {
		html = page.evaluate(function () {
			var xhr = new XMLHttpRequest();
			var html;
			xhr.open("get", window.location.href, false);
			xhr.onload = function () {
				html = xhr.responseText;
			};
			xhr.send();
			return html;
		});
	}

	debug.loadTime = new Date() - debug.loadTime;

	var options = {};

	if (matchMQ) {
		options.matchMQ = true;
	}

	if (required) {
		options.required = required;
	}

	if (localStorage) {
		page.evaluate(function (data) {
			var storage = window.localStorage;
			if (storage) {
				for (var key in data) {
					storage.setItem(key, data[key]);
				}
			}
		}, localStorage);
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

	if (!fs.isFile(scriptPath)) {
		fail("Unable to locate script at: " + scriptPath);
	}

	var injection = page.injectJs(scriptPath);
	if (!injection) {
		fail("Unable to inject script in page");
	}

};

if (url) {

	debug.loadTime = new Date();
	page.open(url);

}
else {

	if (!fakeUrl) {
		fail("Missing \"fake-url\" option");
	}

	html = system.stdin.read();
	system.stdin.close();

	debug.loadTime = new Date();
	page.setContent(html, fakeUrl);

}



function inlineCSS(css) {

	if (!css) {
		return html;
	}

	var tokenAtFirstStylesheet = !cssToken; // auto-insert css if no cssToken has been specified.
	var insertToken = function (m) {
			var string = "";
			if (tokenAtFirstStylesheet) {
				tokenAtFirstStylesheet = false;
				var whitespace = m.match(/^[^<]+/);
				string = ((whitespace) ? whitespace[0] : "") + cssToken;
			}
			return string;
		};
	var links = [];
	var stylesheets = [];

	if (!cssToken) {
		cssToken = "<!-- inline CSS insertion token -->";
	}

	html = html.replace(/[ \t]*<link [^>]*rel=["']?stylesheet["'][^>]*\/>[ \t]*(?:\n|\r\n)?/g, function (m) {
		links.push(m);
		return insertToken(m);
	});

	stylesheets = links.map(function (link) {
		var urlMatch = link.match(/href="([^"]+)"/);
		var mediaMatch = link.match(/media="([^"]+)"/);
		var url = urlMatch && urlMatch[1];
		var media = mediaMatch && mediaMatch[1];

		return { url: url, media: media };
	});

	var index = html.indexOf(cssToken);
	var length = cssToken.length;

	if (index == -1) {
		fail("token not found:\n" + cssToken);
	}

	var replacement = "<style " + ((cssId) ? "id=\"" + cssId + "\" " : "") + "media=\"screen\">\n\t\t\t" + css + "\n\t\t</style>\n";

	if (exposeStylesheets) {
		replacement += "\t\t<script>\n\t\t\t" + exposeStylesheets + " = [" + stylesheets.map(function (link) {
			return "{href:\"" + link.url + "\", media:\"" + link.media + "\"}";
		}).join(",") + "];\n\t\t</script>\n";
	}

	if (prefetch) {
		replacement += stylesheets.map(function (link) {
			return "\t\t<link rel=\"prefetch\" href=\"" + link.url + "\" />\n";
		}).join("");
	}

	return html.slice(0, index) + replacement + html.slice(index + length);

}

function outputError (context, msg, trace) {
	var errMsg = "";
	var errStack = [msg];
	var errInRemoteScript = false;
	if (trace && trace.length) {
		errStack.push("TRACE:");
		trace.forEach(function (t) {
			var source = t.file || t.sourceURL;
			if (!errInRemoteScript && source != scriptPath) {
				errInRemoteScript = true;
			}
			errStack.push(" -> " + source + ": " + t.line + (t.function ? " (in function " + t.function + ")" : ""));
		});
	}
	errMsg = errStack.join("\n");
	if (errInRemoteScript) {
		debug.errors.push(errMsg);
	}
	else {
		fail(context + ": " + errStack.join("\n"));
	}
	
}

function fail(message) {
	system.stderr.write(message);
	phantom.exit(1);
}

function parseString(value) {
	if (value.match(/^(["']).*\1$/)) {
		value = JSON.parse(value);
	}
	if (typeof value == "string") {
		if (value.match(/^\{.*\}$/) || value.match(/^\[.*\]$/)) {
			value = JSON.parse(value);
		}
	}
	return value;
}
