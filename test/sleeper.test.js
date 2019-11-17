import sinon from 'sinon';
import expect from 'expect';
import sleeper from '..';

describe('sleeper', () => {
	it('should be a function', () => {
		expect(sleeper).toEqual(expect.any(Function));
	});

	it('should expose the Resource constructor', () => {
		expect(sleeper.Resource).toEqual(expect.any(Function));
	});

	it('should initialize with a URL', () => {
		let url = '/api/users';

		expect(() => {
			sleeper(url);
		}).not.toThrow();

		let api = sleeper(url);
		expect(api).toBeInstanceOf(sleeper.Resource);
		expect(api.url).toEqual(url);
	});


	// CRUD server
	let server, users;
	beforeAll(() => {
		let multi = /^\/api\/users\/?(?:\?.*)?$/,
			single = /^\/api\/users\/([^/?]+)\/?(?:\?.*)?$/,
			counter = 0;

		server = sinon.useFakeServer();
		server.autoRespond = true;
		server.autoRespondAfter = 1;

		users = [];
		user(null, { name: 'brian' });
		user(null, { name: 'betty' });
		user(null, { name: 'bob' });

		function reply(xhr, json) {
			json = json || { success: false };
			xhr.respond(
				json.status || (json.success === false ? 500 : 200),
				{ 'Content-Type': 'application/json' },
				JSON.stringify(json)
			);
		}

		// get(id), set(id, user), create(null, user), delete(id, false)
		function user(id, update) {
			if (!id) {
				users.push({ id: id = ++counter + '' });
			}
			for (let i = users.length, u; i--;) {
				u = users[i];
				if (u.id === id) {
					if (update) {
						u = users[i] = update;
						u.id = id;
					}
					if (update === false) {
						users.splice(i, 1);
					}
					return u;
				}
			}
			return false;
		}

		// Index
		server.respondWith('GET', multi, (r) => {
			reply(r, users);
		});

		// Create
		server.respondWith('POST', multi, (r) => {
			reply(r, user(null, JSON.parse(r.requestBody)));
		});

		// Read
		server.respondWith('GET', single, (r, id) => {
			reply(r, user(id) || { success: false, status: 404, message: 'Not Found' });
		});

		// Update
		server.respondWith('PUT', single, (r, id) => {
			reply(r, user(id, JSON.parse(r.requestBody)));
		});

		// Delete
		server.respondWith('DELETE', single, (r, id) => {
			let rem = user(id, false);
			reply(r, { success: !!rem });
		});
	});

	afterAll(() => {
		server.restore();
	});


	describe('#index()', () => {
		it('should issue a request to /', (done) => {
			let api = sleeper('/api/users');

			api.index((err, list) => {
				expect(err).toEqual(null);
				expect(list).toMatchObject(users);

				done();
			});
		});
	});


	describe('#get(id)', () => {
		it('should issue a GET request to /:id', (done) => {
			let api = sleeper('/api/users');

			api.get(users[0].id, (err, user) => {
				expect(err).toEqual(null);
				expect(user).toMatchObject(users[0]);
				done();
			});
		});

		it('should return an error if status>=400', (done) => {
			let api = sleeper('/api/users');

			api.get('does-not-exist', (err, user) => {
				expect(err).toEqual('Not Found');
				//expect(user).toEqual(null);
				done();
			});
		});

		it('should return an error property if messageProp is set', (done) => {
			let api = sleeper('/api/users');

			api.messageProp = 'message';
			api.get('also-does-not-exist', (err, user) => {
				expect(err).toEqual('Not Found');
				//expect(user).toEqual(null);
				done();
			});
		});
	});


	describe('#post(obj)', () => {
		it('should issue a form-encoded POST request to /', (done) => {
			let api = sleeper('/api/users'),
				newUser = {
					name: 'billiam'
				};

			api.post(newUser, (err, user) => {
				expect(err).toEqual(null);

				// simpler
				newUser.id = users[users.length - 1].id;
				expect(user).toMatchObject(newUser);
				done();
			});
		});
	});


	describe('#put([id, ] obj)', () => {
		it('should issue a JSON-encoded PUT request to /:id', (done) => {
			let api = sleeper('/api/users'),
				updatedUser = {};
			updatedUser = Object.assign({}, users[0], {
				name: 'sheryll',
				concern: 'Who is this sheryll?'
			});

			api.put(updatedUser.id, updatedUser, (err, user) => {
				expect(err).toEqual(null);
				expect(user).toMatchObject(updatedUser);
				done();
			});
		});

		it('should use an `id` property for an object via #idKey', (done) => {
			let api = sleeper('/api/users'),
				updatedUser = {
					id: users[1].id,
					name: 'benny',
					associations: ['The Jets']
				};

			api.put(updatedUser, (err, user) => {
				expect(err).toEqual(null);
				expect(user).toMatchObject(updatedUser);
				done();
			});
		});
	});


	describe('#del(id)', () => {
		it('should issue a DELETE request to /:id', (done) => {
			let api = sleeper('/api/users'),
				id = users[1].id;

			api.del(id, (err, info) => {
				expect(err).toEqual(null);
				expect(info).toMatchObject({ success: true });
				// make sure Benny's really gone:
				expect(users[1].id).not.toEqual(id);
				done();
			});
		});
	});


	describe('#param(key [, value])', () => {
		it('should set a value when given (key, value)', () => {
			let api = sleeper('/api/users');
			expect(api.query).toEqual({});
			api.param('some_key', 'some_value');
			expect(api.query).toEqual({
				some_key: 'some_value'
			});
		});

		it('should add values from an object when given (hash)', () => {
			let api = sleeper('/api/users'),
				vals = {
					k1: 'v1',
					k2: 'v2'
				};
			api.param('k', 'v');
			api.param(vals);
			expect(api.query).toEqual({
				k: 'v',
				k1: 'v1',
				k2: 'v2'
			});
		});

		it('should return the value for a key when given (key)', () => {
			let api = sleeper('/api/users');
			api.query = {
				k1: 'v1',
				k2: 'v2'
			};

			expect(api.param('k1')).toEqual('v1');
			expect(api.param('k2')).toEqual('v2');
			expect(api.param('foo')).toEqual(undefined);
		});

		it('should send params on each request', (done) => {
			let api = sleeper('/api/users');
			api.param('auth_token', 'asdf1234');

			api.index((err, list) => {
				expect(server.requests[server.requests.length - 1].url).toMatch(/\?auth_token=asdf1234$/g);
				done();
			});
		});
	});


	describe('#create(obj)', () => {
		it('should be an alias of post()', () => {
			let api = sleeper();
			expect(api.create).toEqual(api.post);
		});
	});


	describe('#read(id)', () => {
		it('should be an alias of get()', () => {
			let api = sleeper();
			expect(api.get).toEqual(api.read);
		});
	});


	describe('#update(id, obj)', () => {
		it('should be an alias of put()', () => {
			let api = sleeper();
			expect(api.update).toEqual(api.put);
		});
	});


	describe('#delete(id)', () => {
		it('should be an alias of del()', () => {
			let api = sleeper();
			expect(api.delete).toEqual(api.del);
		});
	});


	describe('#remove(id)', () => {
		it('should be an alias of del()', () => {
			let api = sleeper();
			expect(api.remove).toEqual(api.del);
		});
	});
});
