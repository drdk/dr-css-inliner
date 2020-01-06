
var debug = {
	time: new Date(),
	loadTime: null,
	processingTime: null,
	requests: [],
	stripped: [],
	errors: [],
	cssLength: 0
};

var path = require('path');
var fs = require("fs");
var process = require("process");
var puppeteer = require("puppeteer");

var args = [].slice.call(process.argv, 2), arg;
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
var diskCacheDir;
var userAgent;
var ignoreHttpsErrors = false;
var browserTimeout = 30000;
var browserTimeoutHandle = null;
var scriptPath =  __dirname + "/extractCSS.js";

if (args.length < 1) {

	try {
	  stdout(fs.readFileSync(path.resolve(__dirname, 'README.md'), 'utf8')
		  .match(/## Usage:([\s\S]*?)##### Examples:/i)[1]
		  .replace(/\n```\n/g,'')
		  .replace(/#### Options:/,'\nOptions:')
		  .replace(/node index.js/g, 'dr-css-inliner'));
	} catch (e) {
	  stderr('Off-line `dr-css-inliner` help is not available!');
	}

	return;
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
				stderr("Expected string for '--fake-url' option");
				return;
			}
			break;

		case "-w":
		case "--width":
			value = (args.length) ? args.shift() : "";
			if (value.match(/^\d+$/)) {
				width = parseInt(value);
			}
			else {
				stderr("Expected numeric value for '--width' option");
				return;
			}
			break;

		case "-h":
		case "--height":
			value = (args.length) ? args.shift() : "";
			if (value.match(/^\d+$/)) {
				height = parseInt(value);
			}
			else {
				stderr("Expected numeric value for '--height' option");
				return;
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
				stderr("Expected a string for '--required-selectors' option");
				return;
			}
			break;

		case "-e":
		case "--expose-stylesheets":
			value = (args.length) ? args.shift() : "";
			if (value) {
				exposeStylesheets = ((value.indexOf(".") > -1) ? "" : "var ") + value;
			}
			else {
				stderr("Expected a string for '--expose-stylesheets' option");
				return;
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
				stderr("Expected a string for '--insertion-token' option");
				return;
			}
			break;

		case "-i":
		case "--css-id":
			value = (args.length) ? args.shift() : "";
			if (value) {
				cssId = value;
			}
			else {
				stderr("Expected a string for '--css-id' option");
				return;
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
					return new RegExp(string, "i");
				});
				stripResources = value;
			}
			else {
				stderr("Expected a string for '--strip-resources' option");
				return;
			}
			break;

		case "-l":
		case "--local-storage":
			value = (args.length) ? args.shift() : "";
			if (value) {
				localStorage = parseString(value);
			}
			else {
				stderr("Expected a string for '--local-storage' option");
				return;
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
				stderr("Expected a string for '--output' option");
				return;
			}
			break;

		case "-d":
		case "--debug":
			outputDebug = true;
			break;

		case "-dcd":
		case "--disk-cache-dir":
			value = (args.length) ? args.shift() : "";
			if (value) {
				diskCacheDir = value;
			}
			else {
				stderr("Expected a string for '--disk-cache-dir' option");
				return;
			}
			break;

		case "-u":
		case "--user-agent":
			value = (args.length) ? args.shift() : "";
			if (value) {
				userAgent = value;
			}
			else {
				stderr("Expected a string for '--user-agent' option");
				return;
			}
			break;

		case "-ihe":
		case "--ignore-https-errors":
			ignoreHttpsErrors = true;
			break;

		case "-b":
		case "--browser-timeout":
			value = (args.length) ? args.shift() : "";
			if (value.match(/^\d+$/)) {
				browserTimeout = parseInt(value);
			}
			else {
				stderr("Expected numeric value for '--browser-timeout' option");
				return;
			}
			break;

		default:
			if (!url && !arg.match(/^--?[a-z]/)) {
				url = arg;
			}
			else {
				stderr("Unknown option");
				return;
			}
			break;
	}

}

(async () => {

	var launchOptions = {
		ignoreHTTPSErrors: ignoreHttpsErrors,
		args: [] 
	};

	if (diskCacheDir) {
		launchOptions.args.push('--disk-cache-dir=' + diskCacheDir);
	}

	var browser;
	var page;

	async function closePuppeteer() {

		if (page) {
			await page.close().catch((e) => {
				outputError("PUPPETEER ERROR", e);
			});
		}

		if (browser) {
			await browser.close().catch((e) => {
				outputError("PUPPETEER ERROR", e);
			});
		}

		if (browserTimeoutHandle) {
			clearTimeout(browserTimeoutHandle);
		}
	}

	try {
		browser = await puppeteer.launch(launchOptions);
		page = await browser.newPage();

		if (userAgent) {
			await page.setUserAgent(userAgent);
		}

		await page.setViewport({
			width: width,
			height: height || 800
		});

		if (stripResources) {
			await page.setRequestInterception(true);

			var baseUrl = url || fakeUrl;
		
			page.on("request", request => {
		
				var _url = request.url();
		
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
							return;
						}
					}
				}
		
				request.continue();
			});	
		}

		page.on("pageerror", function(err) {  
			outputError("PAGE ERROR", err); 
		});

		page.on("error", function (err) {  
			outputError("PAGE ERROR", err);
		});

		if(!await loadPage() || !await injectCssExtractor()) {
			await closePuppeteer();
		}

	}
	catch (e) {
		outputError("EXCEPTION", e);
		try {
			await closePuppeteer();
		} catch (err) {}
	}

	return;

	async function loadPage() {

		if (url) {
	
			debug.loadTime = new Date();
	
			await page.goto(url);

			return true;
		}
		else {
		
			if (!fakeUrl) {
				stderr("Missing \"fake-url\" option");
				return false;
			}
		
			html = fs.readFileSync(0, "utf-8");
		
			debug.loadTime = new Date();
	
			await page.setRequestInterception(true);
	
			page.once("request", req => {
			  req.respond({
				body: "<!DOCTYPE html><html><head><title>Empty page</title></head><body><div>Empty page</div></body></html>"
			  });
			});
	
			await page.goto(fakeUrl);
	
			if (!stripResources) {
				// disable request interception to allow caching
				await page.setRequestInterception(false);
			}
	
			if (diskCacheDir) {
				await page.setCacheEnabled(true);
			}
	
			await page.setContent(html);

			return true;
		}	
	}

	async function injectCssExtractor() {

		if (!html) {
			html = await page.content();
		}

		if(html.indexOf("stylesheet") === -1) {
			return false;
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
			await page.evaluate(function (data) {
				var storage = window.localStorage;
				if (storage) {
					for (var key in data) {
						storage.setItem(key, data[key]);
					}
				}
			}, localStorage);
		}
	
		if (Object.keys(options).length) {
			await page.evaluate(function (options) {
				window.extractCSSOptions = options;
			}, options);
		}
	
		if (!height) {
			var _height = await page.evaluate(function () {
				return document.body.offsetHeight;
			});
			page.viewportSize = {
				width: width,
				height: _height
			};
		}
	
		await page.on("console", async msg => {

			if (msg.args().length !== 2) {
				return;
			}

			if (await msg.args()[0].jsonValue() !== "_extractedcss") {
				return;
			}

			let response = await msg.args()[1].jsonValue();

			await closePuppeteer();

			await cssExtractorCallback(response);
		});

		if (!fs.lstatSync(scriptPath).isFile()) {
			stderr("Unable to locate script at: " + scriptPath);
			return false;
		}
		await page.addScriptTag({path: scriptPath});

		if (browserTimeout) {
			browserTimeoutHandle = setTimeout(async function () {
				await closePuppeteer();
				stderr("Browser timeout");
			}, browserTimeout);
		}

		return true;
	}

	async function cssExtractorCallback(response) {
		
		if (!response.css) {
			stderr("Browser did not return any CSS");
			return;
		}

		if ("css" in response) {
			var result;
			if (cssOnly) {
				result = response.css;
			}
			else {
				result = inlineCSS(response.css)
				if (!result) {
					return;
				}
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
				stdout(result);
			}
		}
		else {
			stdout(response);
		}
	};

})();

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
		stderr("token not found:\n" + cssToken);
		return false;
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

function outputError(context, msg) {

	var error = msg.stack ? msg.stack : msg;

	debug.errors.push(error);
	stderr(context + ": " + error);
}

function stdout(message) {
	process.stdout.write(message + "\n");
}

function stderr(message) {
	process.stderr.write(message + "\n");
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
