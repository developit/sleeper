import jan from 'jan';

function extend (obj, props) {
	for (const i in props) obj[i] = props[i];
	return obj;
}


/**
 * Create a new sleeper Resource, representing one resource type exposed by a RESTful API.
 * @param {string} [url=/] The full base URL for the resource (Example: http://a.com/api/users/)
 * @returns {sleeper.Resource} resource
 */
const sleeper = url => new Resource(url);


/**
 * Represents a single resource type exposed by a RESTful API.
 * @constructor Create a representation of a given REST resource.
 * @param {string} [url=/] The full base URL for the resource (ex: http://a.com/api/users/)
 */
class Resource {
	constructor(url) {
		this._evt = {};
		this.url = url || this.url;
		this.query = extend({}, this.query);
		this.headers = extend({}, this.headers);
	}

	/**
	 * Listen for an event of a given type.
	 * @param {string} type The event name to listen for.
	 * @param {(...any) => void} fn Callback to fire in response to an event.
	 */
	on(type, fn) {
		(this._evt[type] || (this._evt[type]=[])).push(fn);
	}

	/**
	 * Remove an event listener with the given type.
	 * @param {string} type The event name to remove a listener for.
	 * @param {(...any) => void} fn A reference to the handler function to remove.
	 */
	removeListener(type, fn) {
		let e = this._evt[type],
			i = e && e.indexOf(fn);
		if (e && i) e.splice(i, 1);
	}

	/**
	 * @private Fire an event with arguments.
	 * @param {string} type
	 * @param {any[]} args
	 */
	emit(type, ...args) {
		let e = this._evt[type];
		if (e) e.slice().forEach(f => f(...args));
	}

	/**	Get or set global parameters, sent with each request.
	 *	@param {string|object} key  Pass an object to define multiple key-value query parameter pairs.
	 *	@param {string|boolean} [value]
	 */
	param(key, value=undefined) {
		if (typeof key==='string') {
			if (value===undefined) return this.query[key];
			this.query[key] = value;
			if (value===false) delete this.query[key];
		}
		if (typeof key==='object') {
			for (const i in key) {
				this.param(i, key[i]);
			}
		}
		return this;
	}

	/**	Get or set global headers, sent with each request.
	 *	@param {string|object} header  Pass an object to define multiple key-value header pairs.
	 *	@param {string|boolean} [value]
	 */
	header(header, value=undefined) {
		if (typeof header==='string') {
			let key = header.toLowerCase();
			if (value===undefined) return this.headers[key];
			this.headers[key] = value;
			if (value===false) delete this.headers[key];
		}
		if (typeof header==='object') {
			for (const i in header) {
				this.header(i, header[i]);
			}
		}
		return this;
	}

	index(callback, options) {
		return this._call('GET /', null, callback, options);
	}

	get(id, callback, options) {
		return this._call('GET /' + id, null, callback, options);
	}

	post(obj, callback, options) {
		return this._call('POST /', obj, callback, options);
	}

	put(id, obj, callback, options) {
		if (id && typeof id==='object' && typeof obj==='function') {
			callback = obj;
			obj = id;
			id = obj[this.idKey];
		}
		return this._call('PUT /' + id, obj, callback, options);
	}

	patch(id, obj, callback, options) {
		return this.put(id, obj, callback, extend({ method: 'PATCH' }, options || {}));
	}

	del(id, callback, options) {
		return this._call('DELETE /' + id, null, callback, options);
	}

	serializeBody(body, req) {
		if (!req.headers['content-type']) {
			req.headers['content-type'] = 'application/json';
		}
		return JSON.stringify(body);
	}

	_call(url, body, callback, options={}) {
		let parts = url.split(' ');
		let method = (options.method || (parts[0]===parts[0].toUpperCase() && parts.splice(0, 1)[0]) || 'GET').toUpperCase();

		url = parts.join(' ');
		url = ('/' + url.replace(/(^\/+|\/+$)/g, '')).replace(/\/+$/g,'');

		let req = {
			method,
			url,
			path: url,
			query: extend(extend({}, this.query), options.query || {}),
			fullUrl: url,
			relativeUrl: url,
			headers: extend({}, this.headers),
			body,
			rawBody: body
		};
		req.request = req;

		let h = options.headers;
		if (h) for (const key in h) {
			req.headers[key.toLowerCase()] = h[key];
		}

		for (const i in req.query) {
			req.url += (req.url.indexOf('?')<0?'?':'&') + encodeURIComponent(i) + '=' + encodeURIComponent(req.query[i]);
		}

		req.fullUrl = req.relativeUrl = req.url;
		req.url = this.url.replace(/(?:^([a-z]+:\/\/)|(\/)\/+|\/+$)/g, '$1$2') + req.url;

		if (options.responseType) {
			req.responseType = options.responseType;
		}

		if (req.body && typeof this.serializeBody==='function' && options.serialize!==false) {
			req.bodySerialized = req.body = this.serializeBody(req.body, req) || req.body;
		}

		this.emit('req', req);
		this.emit(`req:${req.relativeUrl}`, req);

		jan(req, (err, res) => {
			req.response = res;
			res.response = res.data;
			if (!res.status) err = res.error = 'Connection Error';

			let r = err ? 'error' : 'success';
			([
				'status',
				`status:${res.status}`,
				'res',
				`res:${req.relativeUrl}`,
				r,
				`${r}:${req.relativeUrl}`
			]).forEach( type => this.emit(type, req, res) );

			if (typeof callback==='function') {
				callback(res.error, res.response, res);
			}
		});

		return this;
	}
}

let proto = Resource.prototype;

extend(proto, /** @extends Resource.prototype */ {

	/** Base URL for all requests. */
	url: '/',

	/** Querystring parameters to pass on all requests. */
	query: {},

	/**
	 * Headers to apply to all requests.
	 * @type {{[id: string]: string}}
	 */
	headers: {},

	/**
	 * Used to grab the identifier if you pass an object directly to put()
	 * @type {string}
	 */
	idKey: 'id',

	create: proto.post,
	read: proto.get,
	update: proto.put,
	remove: proto.del
});

// eslint-disable-next-line
try { proto['delete'] = proto.del; } catch(err) {}

sleeper.sleeper = sleeper.Resource = Resource;
export default sleeper;
