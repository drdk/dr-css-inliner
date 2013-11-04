(function (global, doc) {

	var html = doc.documentElement,
		width, height,
		options = global.extractCSSOptions,
		matchMQ, required,
		stylesheets = [],
		mediaStylesheets = [],
		left,
		isRunning;

	if (options) {
		if ("matchMQ" in options) {
			matchMQ = options.matchMQ;
		}
		if ("required" in options) {
			required = options.required;

			required = required.map(function (string) {
				return new RegExp(string, "i");
			});
		}
	}

	function init() {
		if (isRunning) {
			return;
		}
		isRunning = true;
		width = html.offsetWidth;
		height = global.innerHeight;
		mediaStylesheets = Array.prototype.slice.call(doc.styleSheets).filter(function (stylesheet) {
			return (!stylesheet.media.length || stylesheet.media[0] == "screen" || stylesheet.media[0] == "all");
		});
		left = mediaStylesheets.slice(0);

		var base = global.location.href.replace(/\/[^/]+$/, "/"),
			host = global.location.protocol + "//" + global.location.host;

		mediaStylesheets.forEach(function (stylesheet) {
			// avoid crossdomain requests
			if (stylesheet.href && stylesheet.href.indexOf(host) == 0) {
				fetchStylesheet(stylesheet.href, function (text) {
					var index = left.indexOf(stylesheet);
					if (index > -1) {
						left.splice(index, 1);
					}
					text = text.replace(/\/\*[\s\S]+?\*\//g, "").replace(/[\n\r]+/g, "").replace(/url\((["']|)(\.\.\/[^"'\(\)]+)\1\)/g, function (m, quote, url) {
						return "url(" + quote + pathRelativeToPage(base, stylesheet.href, url) + quote + ")";
					});
					stylesheets.push(text);
					if (left.length == 0) {
						complete();
					}
				});
			}
			else {
				var index = left.indexOf(stylesheet);
				if (index > -1) {
					left.splice(index, 1);
				}
				if (left.length == 0) {
					complete();
				}
			}
		});

		function complete() {
			var elements = false;

			// if viewport height is forced
			// define elements to check seletors against
			if (html.offsetHeight != height) {
				elements = Array.prototype.slice.call(doc.getElementsByTagName("*")).filter(function (element) {
					var rect = element.getBoundingClientRect();
					return (rect.top < height);
				});
			}

			var CSS = stylesheets.map(function (css) {
				return outputRules(filterCSS(css, elements));
			}).join("");

			if (typeof global.callPhantom === 'function') {
				global.callPhantom({ css: CSS });
			}
			else if (global.console) {
				console.log({ css: CSS });
			}

		}

	}

	function outputRules(rules) {
		return rules.map(function (rule) {
			return rule.selectors.join(",") + "{" + rule.css + "}";
		}).join("");
	}

	function matchSelectors(selectors, elements) {

		return selectors.map(function (selector) {
			// strip comments
			return selector.replace(/\/\*[\s\S]+?\*\//g, "").replace(/(^\s+)|(\s+$)/g, "");
		}).filter(function (selector) {
			if (selector.indexOf(":") > -1) {
				selector = selector.replace(/(?:::?)(?:after|before|link|visited|hover|active|focus|invalid|valid|read-only|target|(?:-[a-zA-Z-]+))\s*$/, "");
			}
			if (!selector || selector.match(/@/)) {
				return false;
			}
			if (required) {
				var found = required.some(function (reg) {
					return reg.test(selector);
				});
				if (found) {
					return true;
				}
			}
			var matches = doc.querySelectorAll(selector),
				i = 0,
				l = matches.length;

			if (l) {
				if (elements) {
					while (i < l) {
						if (elements.indexOf(matches[i++]) > -1) {
							return true;
						}
					}
					return false;
				}
				return true;
			}
			return false;
		});
	}

	function filterCSS(css, elements) {

		var rules = parseRules(css),
			matchedRules = [];

		rules.forEach(function (rule) {
			var matchingSelectors = [],
				atRuleMatch = rule.selectors[0].match(/^\s*(@[a-z\-]+)/);
			if (rule.selectors) {
				if (atRuleMatch) {

					switch (atRuleMatch[1]) {
						case "@font-face":
							matchingSelectors = ["@font-face"];
							break;
						case "@media":
							if (matchMQ) {
								var widths = rule.selectors[0].match(/m(?:ax|in)-width:[^)]+/g),
									mq;
								if (widths) {
									var pair;
									mq = {};
									while (widths.length) {
										pair = widths.shift().split(/:\s?/);
										mq[pair[0]] = parseInt(pair[1]);
									}
								}
							}
							if (!matchMQ || !mq || ((!("min-width" in mq) || mq["min-width"] <= width) && (!("max-width" in mq) || mq["max-width"] >= width))) {
								var matchedSubRules = filterCSS(rule.css, elements);
								if (matchedSubRules.length) {
									matchingSelectors = rule.selectors;
									rule.css = outputRules(matchedSubRules);
								}
							}
							break;
					}

				}
				else {
					matchingSelectors = matchSelectors(rule.selectors, elements);
				}
			}
			if (matchingSelectors.length) {
				rule.selectors = matchingSelectors;
				matchedRules.push(rule);
			}
		});

		return matchedRules;

	}

	function parseRules(css) {
		var matches = css.replace(/\n+/g, " ").match(/(?:[^{}]+\s*\{[^{}]+\})|(?:[^{}]+\{\s*(?:[^{}]+\{[^{}]+\})+\s*\})/g),
			rules = [];
		if (matches) {
			matches.forEach(function (match) {
				var rule = parseRule(match);
				if (rule) {
					rules.push(rule);
				}
			});
		}

		return rules;
	}

	function parseRule(rule) {
		var match = rule.match(/^\s*([^{}]+)\s*\{\s*((?:[^{}]+\{[^{}]+\})+|[^{}]+)\s*\}$/);
		return {
			selectors: match && match[1].split(/\s*,\s*/),
			css: match && match[2]
		}
	}

	function pathRelativeToPage(basepath, csspath, sourcepath) {
		while (sourcepath.indexOf("../") == 0) {
			sourcepath = sourcepath.slice(3);
			csspath = csspath.replace(/\/[^/]+\/[^/]*$/, "/");
		}
		var path = csspath + sourcepath;
		return (path.indexOf(basepath) === 0) ? path.slice(basepath.length) : path;
	}

	function fetchStylesheet(url, callback) {
		var xhr = new XMLHttpRequest();

		xhr.open("GET", url, false);

		xhr.onload = function () {
			callback(xhr.responseText);
		};

		xhr.send(null);

		return xhr;
	}

	if (doc.readyState != "complete") {
		global.addEventListener("load", function () {
			init();
		}, false);
	}
	else {
		init();
	}


}(window, document));
