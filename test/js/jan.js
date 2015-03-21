/** Jan is a simple library for making HTTP requests.
 *
 * Jan makes it easy to issue network calls without dealing with awkward legacy API signatures.
 *
 * If called as a function, `jan()` is an alias of {@link module:jan.request `jan.request()`}
 * @module jan
 *
 * @example
 *	<caption>Basic Usage</caption>
 *	// grab the library:
 *	require(['jan'], function(jan) {
 *
 *		// Log requests before they go out:
 *		jan.on('req', function(e) {
 *			console.log('Request: ', e.req);
 *		});
 *
 *		// Log responses when they come in:
 *		jan.on('res', function(e) {
 *			console.log('Response: ', e.res);
 *		});
 *
 *		// Make a basic GET request:
 *		jan('/api/todos', function(err, res, body) {
 *			if (err) throw err;
 *			var names = data.map(function(todo){ return todo.name; });
 *			alert('ToDos: ' + names.join(', '));
 *		});
 *	});
 */
(function(root, factory) {
	if (typeof define==='function' && define.amd) {
		define([], factory);
	}
	else if (typeof module==='object' && module.exports) {
		module.exports = factory();
	}
	else {
		root.jan = factory();
	}
}(this, function() {
	var events = { req:[], res:[] },
		methods = 'GET POST PUT DELETE HEAD OPTIONS'.split(' '),
		hop = {}.hasOwnProperty;

	/** Issue an HTTP request.
	 * @memberOf module:jan
	 * @name request
	 * @function
	 * @param {Object|String} options			Options for the request, or a `String` `"url"` to which a GET request should be issued.
	 * @param {String} [opt.method=GET]		HTTP method
	 * @param {String} [opt.url=/]				The URL to request
	 * @param {String|FormData|Blob|ArrayBufferView} [opt.body=none]		Request body, for HTTP methods that allow it. Supported types: [XMLHttpRequest#send](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#send())
	 * @param {Object} [opt.headers={ }]		A map of request headers
	 * @param {String} [opt.user=none]			Authentication username, if basic auth is to be used
	 * @param {String} [opt.pass=none]			Authentication password for basic auth
	 * @param {Function} callback				A function to call when the request has completed (error or success). Gets passed `(err, httpResponse, responseBody)`.
	 *
	 * @example
	 *	<caption>"Kitchen Sync"</caption>
	 *	jan({
	 *		method : 'PUT',
	 *		url : 'http://foo.com/bar.json',
	 *		headers : {
	 *			'Content-Type' : 'application/json'
	 *		},
	 *		user : 'bob',
	 *		pass : 'firebird',
	 *		body : JSON.stringify({ key : 'value' })
	 *	}, function(err, res, body) {
	 *		if (err) throw err;
	 *		console.log(res.status===204, body);
	 *	});
	 */
	function jan(opt, callback, a) {
		if (a) {
			opt = extend(callback || {}, { url:opt });
			callback = a;
		}
		opt = typeof opt==='string' ? {url:opt} : opt || {};
		if (opt.baseUrl) {
			// TODO: proper support for URL concatenation
			opt.url = opt.baseUrl + opt.url;
		}
		opt.headers = opt.headers || {};
		var xhr = new XMLHttpRequest(),
			e = { xhr:xhr, req:opt };
		emit('req', e);
		(xhr = e.xhr).open(opt.method || 'GET', opt.url || '/', true, opt.user, opt.pass);
		for (var name in opt.headers) if (hop.call(opt.headers, name)) xhr.setRequestHeader(name, opt.headers[name]);
		xhr.onreadystatechange = function() {
			if (xhr.readyState!==4) return;
			var res = {
					status : xhr.status,
					error : xhr.status>399 ? xhr.statusText : null,
					headers : {},
					body : xhr.responseText,
					xml : xhr.responseXML,
					xhr : xhr
				},
				hreg = /^\s*([a-z0-9_-]+)\s*\:\s*(.*?)\s*$/gim,
				h = xhr.getAllResponseHeaders(),
				m;
			try{ res.json = JSON.parse(res.body); }catch(o){}
			res.data = res.json || res.xml || res.body;
			while (m=hreg.exec(h)) res.headers[m[1].toLowerCase()] = m[2];
			e.res = res;
			emit('res', e);
			(callback || opt.callback).call(e, res.error, res, res.data);
		};
		xhr.send(opt.body);
	}


	/**Get a namespaced copy of {@link module:jan jan} where all methods are relative to a base URL.
	 * @function
	 * @name module:jan.ns
	 * @param {String} baseUrl		A URL to which all namespaced methods should be relative
	 * @returns A `baseUrl`-namespaced jan interface
	 * @example
	 *	// Create a namespaced API client:
	 *	var api = jan.ns('https://example.com/api');
	 *
	 *	// GET /api/images:
	 *	api.get('/images', function(err, res, images) {
	 *		console.log(images);
	 *	});
	 *
	 *	// Log response headers for any requests to the base URL:
	 *	api.on('res', function(e) {
	 *		console.log( e.res.headers );
	 *	});
	 */
	jan.ns = function(uri) {
		var opt = { baseUrl:uri },
			ns = mapVerbs(alias(opt), opt);
		ns.on = function(type, handler, a) {
			jan.on(type, uri + (handler.sub ? handler : ''), a || handler);
			return ns;
		};
		return ns;
	};


	/**Register a handler function to be called in response to a given type of event.
	 *
	 * Valid event types are: `req` and `res`, fired on request and response respectively.
	 * @function
	 * @name module:jan.on
	 * @example
	 *	jan.on('res', function(e) {
	 *		// e.req
	 *		// e.res
	 *		// e.xhr
	 *	});
	 * @param {String} type					An event type to observe
	 * @param {String|RegExp} [urlFilter]	A String prefix or RegExp to filter against each event's request url
	 * @param {Function} handler			Handler function, gets passed an Event object
	 */
	jan.on = function(type, handler, a) {
		events[type].push(a ? function(e) {
			if (handler.exec ? e.req.url.match(handler) : e.req.url.indexOf(handler)===0) {
				a.call(this, e);
			}
		} : handler);
		return jan;
	};


	/**Alias of {@link module:jan.request request()} that presupplies the option `method:'GET'`
	 * @name module:jan.get
	 * @function
	 *
	 * @example
	 *	<caption>Get popular YouTube videos</caption>
	 *	var url = 'http://gdata.youtube.com/feeds/api/standardfeeds/most_popular?v=2&alt=json';
	 *	jan.get(url, function(err, data) {
	 *		if (err) throw err;
	 *		// display video links:
	 *		document.body.innerHTML = data.feed.entry.map(function(vid) {
	 *			return vid.title.$t.anchor(vid.content.src);	// String#neverforget
	 *		}).join('<br>');
	 *	});
	 */

	/**Alias of {@link module:jan.request request()} that presupplies the option `method:'POST'`
	 * @name module:jan.post
	 * @function
	 *
	 * @example
	 *	<caption>Submit a contact form</caption>
	 *	jan.post({
	 *		url : 'http://example.com/contact-form.php',
	 *		headers : {
	 *			'Content-Type' : 'application/x-www-form-encoded'
	 *		},
	 *		body : new FormData(document.querySelector('form'))
	 *	}, function(err, data) {
	 *		if (err) throw err;
	 *		alert('Submitted: ' + data.message);
	 *	});
	 */

	/** Alias of {@link module:jan.request request()} that presupplies the option `method:'PUT'`
	 * @name module:jan.put
	 * @function
	 *
	 * @example
	 *	<caption>Update a REST resource</caption>
	 *	jan.put({
	 *		url : 'http://foo.com/bar.json',
	 *		headers : { 'Content-Type':'application/json' },
	 *		body : '{"key":"val"}'
	 *	}, function(err, data) {
	 *		if (err) throw err;
	 *		console.log(data);
	 *	});
	 */

	/**	Alias of {@link module:jan.request request()} that presupplies the option `method:'HEAD'`
	 *	@name module:jan.head
	 *	@function
	 *
	 * @example
	 *	<caption>Get headers</caption>
	 *	jan.head('/massive.json', function(err, data, res) {
	 *		if (err) throw err;
	 *		console.log(res.headers);
	 *	});
	 */

	/**	Alias of {@link module:jan.request request()} that presupplies the option `method:'OPTIONS'`
	 *	@name module:jan.options
	 *	@function
	 *
	 * @example
	 *	<caption>Get WADL XML</caption>
	 *	jan.options('/api/v1', function(err, data, res) {
	 *		if (err) throw err;
	 *		console.log(res.headers, res.body);
	 *	});
	 */

	/**	Alias of {@link module:jan.request request()} that presupplies the option `method:'DELETE'`
	 *	@name module:jan.del
	 *	@function
	 *
	 * @example
	 *	<caption>Delete a REST resource</caption>
	 *	jan.del({
	 *		url : '/api/items/1a2b3c'
	 *	}, function(err, data) {
	 *		if (err) throw err;
	 *		alert('Deleted');
	 *	});
	 */

	/**	Alias of {@link module:jan.del del()}.
	 *  This alias is provided for completeness, but [should not be used](http://mothereff.in/js-properties#delete) because [it throws in ES3](http://mathiasbynens.be/notes/javascript-properties).
	 *	@name module:jan.delete
	 *	@function
	 *	@deprecated Don't call <code>delete()</code> if you need to support ES3. <code>jan['delete']()</code> is okay.
	 */

	mapVerbs(jan);


	function emit(type, args) {
		args = Array.prototype.slice.call(arguments, 1);
		for (var e=events[type], i=e.length; i--; ) e[i].apply(jan, args);
	}


	function alias(overrides) {
		return function(opt, callback) {
			return jan(extend({}, typeof opt==='string' ? {url:opt} : opt, overrides), callback);
		};
	}


	function mapVerbs(onto, opts) {
		for (var i=methods.length; i--; ) {
			onto[methods[i].toLowerCase()] = alias(extend({}, opts || {}, {
				method : methods[i]
			}));
		}
		onto.del = onto['delete'];
		return onto;
	}


	function extend(base, obj) {
		for (var i=1, p, o; i<arguments.length; i++) {
			o = arguments[i];
			for (p in o) if (hop.call(o, p)) base[p] = o[p];
		}
		return base;
	}


	return (jan.jan = jan.request = jan);
}));
