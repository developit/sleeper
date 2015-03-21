describe('sleeper', function() {
	it('should be a function', function() {
		expect(sleeper).to.exist;
		expect(sleeper).to.be.a.function;
	});

	it('should expose the Resource constructor', function() {
		expect(sleeper.Resource).to.be.a.function;
	});

	it('should initialize with a URL', function() {
		var url = '/api/users';

		expect(function() {
			sleeper(url);
		}).not.to.throw;

		var api = sleeper(url);
		expect( api ).to.be.an.instanceof( sleeper.Resource );
		expect( api.url ).to.equal( url );
	});


	// patch for PhantomJS:
	window.ProgressEvent = function(type, props){ util.extend(this, props); };

	// CRUD server
	var server, users;
	before(function() {
		var multi = /^\/api\/users\/?(?:\?.*)?$/,
			single = /^\/api\/users\/([^\/\?]+)\/?(?:\?.*)?$/,
			counter = 0;

		server = sinon.fakeServer.create();
		server.autoRespond = true;
		server.autoRespondAfter = 1;		// 10ms is the pointlessly long default

		users = [];
		user(null, { name:'brian' });
		user(null, { name:'betty' });
		user(null, { name:'bob' });

		function reply(xhr, json) {
			json = json || { success:false };
			xhr.respond(
				json.status || (json.success===false ? 500 : 200),
				{ 'Content-Type' : 'application/json' },
				JSON.stringify(json)
			);
		}

		// get(id), set(id, user), create(null, user), delete(id, false)
		function user(id, update) {
			if (!id) {
				users.push({ id : id=++counter+'' });
			}
			for (var i=users.length, u; i--; ) {
				u = users[i];
				if (u.id===id) {
					if (update) {
						u = users[i] = update;
						u.id = id;
					}
					if (update===false) {
						users.splice(i, 1);
					}
					return u;
				}
			}
			return false;
		}

		// Index
		server.respondWith('GET', multi, function(r) {
			reply(r, users);
		});

		// Create
		server.respondWith('POST', multi, function(r) {
			reply(r, user(null, JSON.parse(r.requestBody)));
		});

		// Read
		server.respondWith('GET', single, function(r, id) {
			reply(r, user(id) || { success:false, status:404, message:'Not Found' });
		});

		// Update
		server.respondWith('PUT', single, function(r, id) {
			reply(r, user(id, JSON.parse(r.requestBody)));
		});

		// Delete
		server.respondWith('DELETE', single, function(r, id) {
			var rem = user(id, false);
			reply(r, { success : !!rem });
		});
	});

	after(function() {
		server.restore();
	});


	describe('#index()', function() {
		it('should issue a request to /', function(done) {
			var api = sleeper('/api/users');

			api.index(function(err, list) {
				expect(err).to.equal(null);
				expect(list).to.deep.equal(users);

				done();
			});
		});
	});


	describe('#get(id)', function() {
		it('should issue a GET request to /:id', function(done) {
			var api = sleeper('/api/users');

			api.get(users[0].id, function(err, user) {
				expect(err).to.equal(null);
				expect(user).to.deep.equal(users[0]);
				done();
			});
		});

		it('should return an error if status>=400', function(done) {
			var api = sleeper('/api/users');

			api.get('does-not-exist', function(err, user) {
				expect(err).to.deep.equal('Not Found');
				//expect(user).to.equal(null);
				done();
			});
		});

		it('should return an error property if messageProp is set', function(done) {
			var api = sleeper('/api/users');

			api.messageProp = 'message';
			api.get('also-does-not-exist', function(err, user) {
				expect(err).to.equal('Not Found');
				//expect(user).to.equal(null);
				done();
			});
		});
	});


	describe('#post(obj)', function() {
		it('should issue a form-encoded POST request to /', function(done) {
			var api = sleeper('/api/users'),
				newUser = {
					name : 'billiam'
				};

			api.post(newUser, function(err, user) {
				expect(err).to.equal(null);

				// simpler
				newUser.id = users[users.length-1].id;
				expect(user).to.deep.equal(newUser);
				done();
			});
		});
	});


	describe('#put([id, ] obj)', function() {
		it('should issue a JSON-encoded PUT request to /:id', function(done) {
			var api = sleeper('/api/users'),
				updatedUser = {};
			updatedUser = util.extend({}, users[0], {
				name : 'sheryll',
				concern : 'Who is this sheryll?'
			});

			api.put(updatedUser.id, updatedUser, function(err, user) {
				expect(err).to.equal(null);
				expect(user).to.deep.equal(updatedUser);
				done();
			});
		});

		it('should use an `id` property for an object via #idKey', function(done) {
			var api = sleeper('/api/users'),
				updatedUser = {
					id : users[1].id,
					name : 'benny',
					associations : ['The Jets']
				};

			api.put(updatedUser, function(err, user) {
				expect(err).to.equal(null);
				expect(user).to.deep.equal(updatedUser);
				done();
			});
		});
	});


	describe('#del(id)', function() {
		it('should issue a DELETE request to /:id', function(done) {
			var api = sleeper('/api/users'),
				id = users[1].id;

			api.del(id, function(err, info) {
				expect(err).to.equal(null);
				expect(info).to.deep.equal({ success:true });
				// make sure Benny's really gone:
				expect(users[1].id).not.to.equal(id);
				done();
			});
		});
	});


	describe('#param(key [, value])', function() {
		it('should set a value when given (key, value)', function() {
			var api = sleeper('/api/users');
			expect(api.query).to.deep.equal({});
			api.param('some_key', 'some_value');
			expect(api.query).to.deep.equal({
				some_key : 'some_value'
			});
		});

		it('should add values from an object when given (hash)', function() {
			var api = sleeper('/api/users'),
				vals = {
					k1 : 'v1',
					k2 : 'v2'
				};
			api.param('k', 'v');
			api.param(vals);
			expect(api.query).to.deep.equal({
				k : 'v',
				k1 : 'v1',
				k2 : 'v2'
			});
		});

		it('should return the value for a key when given (key)', function() {
			var api = sleeper('/api/users');
			api.query = {
				k1 : 'v1',
				k2 : 'v2'
			};

			expect( api.param('k1') ).to.equal('v1');
			expect( api.param('k2') ).to.equal('v2');
			expect( api.param('foo') ).to.equal(undefined);
		});

		it('should send params on each request', function(done) {
			var api = sleeper('/api/users');
			api.param('auth_token', 'asdf1234');

			api.index(function(err, list) {
				expect(server.requests[server.requests.length-1].url).to.match(/\?auth_token=asdf1234$/g);
				done();
			});
		});
	});


	describe('#create(obj)', function() {
		it('should be an alias of post()', function() {
			var api = sleeper();
			expect(api.create).to.equal(api.post);
		});
	});


	describe('#read(id)', function() {
		it('should be an alias of get()', function() {
			var api = sleeper();
			expect(api.get).to.equal(api.read);
		});
	});


	describe('#update(id, obj)', function() {
		it('should be an alias of put()', function() {
			var api = sleeper();
			expect(api.update).to.equal(api.put);
		});
	});


	describe('#delete(id)', function() {
		it('should be an alias of del()', function() {
			var api = sleeper();
			expect(api.delete).to.equal(api.del);
		});
	});


	describe('#remove(id)', function() {
		it('should be an alias of del()', function() {
			var api = sleeper();
			expect(api.remove).to.equal(api.del);
		});
	});
});
