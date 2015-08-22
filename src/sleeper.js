import jan from 'jan';

const HOP = Object.prototype.hasOwnProperty;

// let extend = (obj, props) => (Object.keys(props).forEach(k=>obj[k]=props[k]), obj);
let extend = (obj, props) => {
	for (let i in props) if (HOP.call(props, i)) obj[i] = props[i];
	return obj;
};


class Emitter {
	constructor() {
		this._evt={};
	}
	on(type, fn) {
		(this._evt[type] || (this._evt[type]=[])).push(fn);
	}
	removeListener(type, fn) {
		let e = this._evt[type],
			i = e && e.indexOf(fn);
		if (e && i) e.splice(i, 1);
	}
	emit(type, ...args) {
		let e = this._evt[type];
		if (e) e.slice().forEach(f=>f(...args));
	}
}


/**	Create a new sleeper Resource, representing one resource type exposed by a RESTful API.
 *	@param {String} [url=/]		The full base URL for the resource (Example: http://a.com/api/users/)
 *	@returns {sleeper.Resource} resource
 */
let sleeper = url => new Resource(url);


/**	Represents a single resource type exposed by a RESTful API.
 *	@constructor Create a representation of a given REST resource.
 *	@augments puredom.EventEmitter
 *	@param {String} [url=/]		The full base URL for the resource (Example: http://a.com/api/users/)
 */
class Resource extends Emitter {
	constructor(url) {
		super();
		this.url = url || this.url;
		this.query = extend({}, this.query);
		this.headers = extend({}, this.headers);
	}

	/**	Get or set global parameters, sent with each request.
	 *	@param {String} key
	 *	@param {String} value
	 */
	param(key, value=undefined) {
		if (typeof key==='string') {
			if (value===undefined) return this.query[key];
			this.query[key] = value;
		}
		if (typeof key==='object') extend(this.query, key);
		return this;
	}

	/**	Get or set global headers, sent with each request.
	 *	@param {String} header
	 *	@param {String} value
	 */
	header(header, value=undefined) {
		if (typeof header==='string') {
			if (value===undefined) return this.headers[key];
			this.headers[header.toLowerCase()] = value;
		}
		if (typeof header==='object') {
			for (let i in header) if (HOP.call(header, i)) {
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
		return this.put(id, obj, callback, extend({ method:'PATCH' }, options || {}));
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
			fullUrl : url,
			relativeUrl: url,
			headers: extend({}, this.headers),
			body,
			rawBody : body
		};

		let h = options.headers;
		if (h) for (let i in h) if (HOP.call(h, i)) {
			req.headers[key.toLowerCase()] = h[key];
		}

		for (let i in req.query) if (HOP.call(req.query, i)) {
			req.url += (url.indexOf('?')<0?'?':'&') + encodeURIComponent(i) + '=' + encodeURIComponent(req.query[i]);
		}

		req.fullUrl = req.relativeUrl = req.url;
		req.url = this.url.replace(/(?:^([a-z]+\:\/\/)|(\/)\/+|\/+$)/g, '$1$2') + req.url;

		if (options.responseType) {
			req.responseType = options.responseType;
		}

		if (req.body && typeof this.serializeBody==='function' && options.serialize!==false) {
			req.bodySerialized = req.body = this.serializeBody(req.body, req) || req.body;
		}

		this.emit('req', req);
		this.emit(`req:${req.relativeUrl}`, req);

		jan(req, (err, res, data) => {
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
			]).forEach( type => this.emit(type, [req, res]) );

			if (typeof callback==='function') {
				callback(res.error, res.response, res);
			}
		});

		return this;
	}
}

let proto = Resource.prototype;

extend(proto, {
	// The resource base URL
	url: '/',
	// Global querystring parameters
	query: {},
	// Global headers
	headers: {},
	// Used to grab the identifier if you pass an object directly to put()
	idKey: 'id',

	create: proto.post,
	read: proto.get,
	update: proto.put,
	remove: proto.del
});

try { proto['delete'] = proto.del; } catch(err) {}


sleeper.sleeper = sleeper.Resource = Resource;
export default sleeper;
