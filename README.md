sleeper [![Version](https://img.shields.io/npm/v/sleeper.svg?style=flat)](https://www.npmjs.org/package/sleeper) ⎔ [![Build Status](https://img.shields.io/travis/developit/sleeper.svg?style=flat&branch=master)](https://travis-ci.org/developit/sleeper)
=======

A high-level network abstraction that makes working with REST APIs simple.

This library is very old and you should probably use [ky](https://github.com/sindresorhus/ky) instead, which has a similar API but is based on Fetch rather than XMLHttpRequest.

---


Instantiation
-------------

Sleeper is available in ES Modules, CommonJS and UMD formats.

**Using Modules:**  

```js
import sleeper from 'sleeper';

const users = sleeper('/api/users');

// users is a sleeper.Resource instance:
alert(users instanceof sleeper.Resource);
```

**Without AMD:**  

```html
<script src="https://unpkg.com/sleeper/dist/sleeper.umd.js"></script>
<script>
	var users = sleeper('/api/users');

	// users is a sleeper.Resource instance:
	alert(users instanceof sleeper.Resource);
</script>
```


---

API
---


# sleeper(url) / new sleeper.Resource(url)
Create a new `sleeper.Resource` instance for the resource at a given URL.  

```js
const users = sleeper('/api/users');

// equivalent to:
const users = new sleeper.Resource('/api/users');
```


# .index(callback)
Get a list of resources

```js
users.index(list => {
	// list is an Array of users
	console.log('Users: ', list);
});
```


# .get(id, callback)
Get a single resource

```js
users.get('myid', user => {
	console.log('User "myid": ', user);
});
```


# .post(data, callback)
Create a new resource.

```js
users.post({
	username : 'joe',
	password : 'super secret password'
}, user => {
	console.log('New user: ', user);
});
```


# .put(id, data, callback)
Update/replace an existing resource, indicated by its ID.

```js
users.put('myid', {
	username : 'joe',
	password : 'super secret password',
	status : 'awesome'
}, user => {
	console.log('Updated user: ', user);
});
```


# .patch(id, data, callback)
Update/patch an existing resource, indicated by its ID.

```js
users.patch('myid', {
	status : 'awesome'
}, user => {
	console.log('Updated user: ', user);
});
```


# .delete(id, callback)
Update an existing resource, indicated by its ID.  
*If you care about old browsers, a `del()` alias is provided.*

```js
users.delete('myid', res => {
	console.log('Delete response: ', res);
});
```


# .param(key [, value])
Get or set a querystring parameter to send on each request.  

- If `value` is set: adds a global querystring parameter `key` with a value of `value`  
- If `value` is empty: returns the current value of the global parameter `key`  
- If `key` is an Object: adds `key`'s key-value property pairs as global parameters  

```js
// Send a token on all subsequent requests:
users.param('token', 'abcdefg');

// Get the current token value:
const token = users.param('token');
console.log(token);
```


---


Hooks
-----

Modify functionality by changing these values.


# .serializeBody(body, req)
When a request has a body, this function is responsible for serializing it.

The default implementation of `serializeBody()` provides an example usage:

```js
serializeBody(body, req) {
	if (!req.headers['content-type']) {
		req.headers['content-type'] = 'application/json';
	}
	return JSON.stringify(body);
}
```


# .idKey
This key path is used to obtain an Object identifier if one is not explicitly passed to `put()` / `patch()`.

> Defaults to `"id"`.


---


Events
------


# req

`(req) => {}`

Hook the `req` event to be notified prior to all requests.

Event handlers get passed a `Request` instance.

```js
users.on('req', req => {
	console.log('Request: ', req.method, req.url, req.body);
});
```


# req:/url

`(req) => {}`

Add an event handler for "req:" followed by relative URL (ex: `req:/users`) to be notified when a request is made to the given URL.

This is just a more specific version of the `req` event.

```js
users.on('req:/users', req => {
	console.log('User list request: ', req.method);
});
```


# status

`(req, res) => {}`

Hook the `status` event to be notified of the status of every response.

Event handlers get passed `Request` and `Response`.

```js
users.on('status', (req, res) => {
	console.log('Status: ', res.status);
});
```


# status:N

`(req, res) => {}`

Add an event handler for "status:" followed by a specific response status code (ex: `status:401`) to be notified when a response is issued with that status.

This is just a more specific version of the `status` event.

```js
users.on('status:401', (req, res) => {
	console.log('Unauthorized: ', res.response);
});
```


# res

`(req, res) => {}`

Hook the `res` event to be notified of all responses.

Event handlers get passed a `Request` and `Response`.

```js
users.on('res', (req, res) => {
	console.log('Response: ', req.url, res.headers, res.json);
});
```


# res:/url

`(req, res) => {}`

Add an event handler for "res:" followed by relative URL (ex: `res:/users`) to be notified when a response is received from the given URL.

This is just a more specific version of the `res` event.  

```js
users.on('res:/users', (req, res) => {
	console.log('User list response: ', res.headers, res.json);
});
```
