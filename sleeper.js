/** A synchronized model base class. */
(function(root, factory) {
	if (typeof define==='function' && define.amd) {
		define(['events', 'util', 'jan'], factory);
	}
	else if (typeof module==='object' && module.exports) {
		module.exports = factory(require('events'), require('util'), require('jan'));
	}
	else {
		root.sleeper = factory(root.events, root.util || root._, root.jan);
	}
}(this, function(events, _, jan) {
	/** @exports sleeper */

	var EventEmitter = events.EventEmitter || events;

	/**	Create a new sleeper Resource, representing one resource type exposed by a RESTful API.
	 *	@param {String} [url=/]		The full base URL for the resource (Example: http://a.com/api/users/)
	 *	@returns {sleeper.Resource} resource
	 */
	function sleeper(url) {
		return new sleeper.Resource(url);
	}

	/**	Represents a single resource type exposed by a RESTful API.
	 *	@constructor Create a representation of a given REST resource.
	 *	@augments puredom.EventEmitter
	 *	@param {String} [url=/]		The full base URL for the resource (Example: http://a.com/api/users/)
	 */
	sleeper.Resource = function(url) {
		EventEmitter.call(this);

		this.url = url || this.url;
		this.query = _.extend({}, this.query);
		this.headers = _.extend({}, this.headers);
	};

	_.inherits(sleeper.Resource, EventEmitter);

	var proto = sleeper.Resource.prototype;
	_.extend(proto, /** @lends sleeper.Resource# */ {
		url : '/',

		query : {},

		headers : {},

		/**	Get or set global parameters, sent with each request.
		 *	@param {String} key
		 *	@param {String} value
		 */
		param : function(key, value) {
			if (typeof key==='string') {
				if (arguments.length===1) return this.query[key];
				this.query[key] = value;
			}
			if (typeof key==='object') {
				_.extend(this.query, key);
			}
			return this;
		},

		/**	Get or set global headers, sent with each request.
		 *	@param {String} header
		 *	@param {String} value
		 */
		header : function(header, value) {
			var i;
			if (typeof header==='string') {
				if (arguments.length===1) return this.headers[key];
				this.headers[header.toLowerCase()] = value;
			}
			if (typeof header==='object') {
				for (i in header) if (header.hasOwnProperty(i)) {
					this.header(i, header[i]);
				}
			}
			return this;
		},

		index : function(callback, options) {
			return this._call('GET /', null, callback, options);
		},

		get : function(id, callback, options) {
			return this._call('GET /' + id, null, callback, options);
		},

		post : function(obj, callback, options) {
			return this._call('POST /', obj, callback, options);
		},

		put : function(id, obj, callback, options) {
			if (id && typeof id==='object' && typeof obj==='function') {
				callback = obj;
				obj = id;
				id = obj[this.idKey];
			}
			return this._call('PUT /' + id, obj, callback, options);
		},

		patch : function(id, obj, callback, options) {
			return this.put(id, obj, callback, _.extend({ method:'PATCH' }, options || {}));
		},

		del : function(id, callback, options) {
			return this._call('DELETE /' + id, null, callback, options);
		},

		/** Used to grab the identifier if you pass an object directly to put() */
		idKey : 'id',

		serializeBody : function(body, req) {
			if (!req.headers['content-type']) {
				req.headers['content-type'] = 'application/json';
			}
			return JSON.stringify(body);
		},

		_call : function(url, body, callback, options) {
			var self = this,
				headers = _.extend({}, this.headers),
				query = _.extend({}, this.query),
				parts = url.split(' '),
				method, path, relativeUrl, querystring;
			options = options || {};

			if (options.headers) {
				_.forEach(options.headers, function(value, key) {
					headers[key.toLowerCase()] = value;
				});
			}
			if (options.query) {
				_.extend(query, options.query);
			}

			if (parts[0]===parts[0].toUpperCase()) {
				method = String(options.method || parts.splice(0, 1)[0] || 'GET').toUpperCase();
			}
			url = parts.join(' ');
			url = ('/' + url.replace(/(^\/+|\/+$)/g, '')).replace(/\/+$/g,'');
			path = url;

			if (query) {
				_.forEach(query, function(value, key) {
					url += (url.indexOf('?')<0?'?':'&') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
				});
			}

			relativeUrl = url;
			url = this.url.replace(/(?:^([a-z]+\:\/\/)|(\/)\/+|\/+$)/g, '$1$2') + url;

			var req = {
				path : path,
				querystring : querystring,
				query : query,
				url : url,
				fullUrl : url,
				relativeUrl : relativeUrl,
				method : method,
				headers : headers,
				body : body,
				rawBody : body
			};

			if (options.responseType) {
				req.responseType = options.responseType;
			}

			if (req.body && typeof this.serializeBody==='function' && options.serialize!==false) {
				req.bodySerialized = req.body = this.serializeBody(body, req) || req.body;
			}

			this.emit('req', req);
			this.emit('req:' + relativeUrl, req);

			jan(req, function(err, res, data) {
				var msgProp = self.errorMessageProp || self.messageProp,
					isError = err || !res.status || res.status>=400,
					evts, i, r;

				res.response = res.data;
				if (!res.status) {
					err = res.error = 'Connection Error';
				}

				r = err ? 'error' : 'success';
				evts = [
					'status',
					'status:' + res.status,
					'res',
					'res:' + relativeUrl,
					r,
					r + ':' + relativeUrl
				];
				for (i=0; i<evts.length; i++) {
					self.emit(evts[i], [req, res]);
				}

				if (typeof callback==='function') {
					callback(res.error, res.response, res);
				}
			});

			return this;
		}
	});

	proto.create = proto.post;
	proto.read = proto.get;
	proto.update = proto.put;
	proto.remove = proto.del;
	try {
		proto['delete'] = proto.del;
	} catch(err) {}

	sleeper.rest = sleeper.sleeper = sleeper;
	return sleeper;
}));
