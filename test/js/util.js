/**	Utility functions and essential ES5 polyfills.
 *	@module util
 *	@example
 *		<caption>Using Polyfills:</caption>
 *
 *		// Including util as a dependency adds the polyfills:
 *		var util = require('util');
 *
 *		// Now you can use some ES5 stuff everywhere:
 *		Array.isArray.bind([])(Object.keys(Object.create({a:' '.trim()})).forEach(util.typeOf));
 */
(function(root, factory) {
	if (typeof define==='function' && define.amd) {
		define([], factory);
	}
	else if (typeof module==='object' && module.exports) {
		module.exports = factory();
	}
	else {
		root.util = factory();
	}
}(this, function() {
	var entityMap = {'&':'amp','<':'lt','>':'gt','"':'quot'},
		uuids = 0,
		exports;

	/**	The built in String object.
	 *	@name String
	 *	@external String
	 *	@see {@link https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String String}
	 */

	/**	The built in Object object.
	 *	@name Object
	 *	@external Object
	 *	@see {@link https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object Object}
	 */

	/**	The built in Array object.
	 *	@name Array
	 *	@external Array
	 *	@see {@link https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array Array}
	 */

	/**	The built in Function object.
	 *	@name Function
	 *	@external Function
	 *	@see {@link https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function Function}
	 */

	// Polyfills!

	if (!String.prototype.trim) {
		/**	Remove whitespace from the beginning and end of a string.
		 *	@function external:String#trim
		 *	@see {@link https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/Trim String.prototype.trim}
		 */
		String.prototype.trim = function() {
			return this.replace(/^\s*.*?\s*$/g, '');
		};
	}

	if (!Array.isArray) {
		/**	Check if the given value is an Array.
		 *	@function external:Array.isArray
		 *	@see {@link https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray Array.isArray}
		 */
		Array.isArray = function(obj) {
			return Object.prototype.toString.call(obj)==='[object Array]';
		};
	}

	if (!Array.prototype.forEach) {
		/**	Call <code>iterator</code> on each value of an Array.
		 *	@param {Function} iterator		Gets passed <code>(value, index, array)</code>.
		 *	@param {Object} [context]		Set the value of <code>this</code> within <code>iterator</code>.
		 *	@function external:Array#forEach
		 *	@see {@link https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/forEach Array.prototype.forEach}
		 */
		Array.prototype.forEach = function(iterator, context) {
			for (var i=0; i<this.length; i++) {
				iterator.call(context, this[i], i, this);
			}
		};
	}

	if (!Object.keys) {
		/**	Get an Array of the given object's own-property keys.
		 *	@function external:Object.keys
		 *	@see {@link https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/keys Object.keys}
		 */
		Object.keys = function(obj) {
			var keys=[], i;
			for (i in obj) {
				if (obj.hasOwnProperty(i)) {
					keys.push(i);
				}
			}
			return keys;
		};
	}

	if (!Object.create) {
		/**	Create a new object with the given reference object as its prototype.
		 *	@function external:Object.create
		 *	@see {@link https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/create Object.create}
		 */
		Object.create = function(o) {
			function F(){}
			F.prototype = o;
			return new F();
		};
	}

	if (!Function.prototype.bind) {
		/**	Bind a function to the given context and any given arguments.
		 *	@function external:Function#bind
		 *	@see {@link https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind Function.prototype.bind}
		 */
		Function.prototype.bind = function(context, args) {
			var func=this, proxy;
			args = Array.prototype.slice.call(arguments, 1);
			/**	@ignore */
			proxy = function() {
				return func.apply(context===null || context===undefined ? this : context, args.concat(Array.prototype.slice.call(arguments)));
			};
			/**	@ignore */
			proxy.unbind = function() {
				var o = func;
				context = args = func = proxy = null;
				return o;
			};
			return proxy;
		};
	}


	exports = {

		/**	Get the type of a given value.
		 *	@param {Any} value		A value to check the type of
		 *	@returns {String} A normalized lowercase type name.
		 *
		 *	@example
		 *		util.typeOf( [] )         // array
		 *		util.typeOf( {} )         // object
		 *		util.typeOf( "" )         // string
		 *		util.typeOf( 5 )          // number
		 *		util.typeOf( /./g )       // regexp
		 *		util.typeOf( null )       // null
		 *		util.typeOf( undefined )  // undefined
		 */
		typeOf : function(value) {
			var type;
			if (value===undefined) {
				return 'undefined';
			}
			else if (value===null) {
				return 'null';
			}
			else if (Array.isArray(value)) {
				return 'array';
			}
			else if (value instanceof RegExp) {
				return 'regexp';
			}
			type = (typeof value || 'object').toLowerCase();
			if (type==='object') {
				if (value instanceof Number) {
					return 'number';
				}
				else if (value instanceof String) {
					return 'string';
				}
				else if (value instanceof Boolean) {
					return 'boolean';
				}
			}
			return type;
		},

		/** Simple string templating: replace <code>{{fields}}</code> with values from a data object.
		 *	@function
		 *	@param {String} str			The string to operate on.
		 *	@param {Object} fields		A key-value field data.
		 *	@param {Object} [options]	Hashmap of options.
		 *	@param {String} [options.prefix]	If set, only operates on the subset of fields prefixed by the given character sequence. Example: <code>"i18n."</code>
		 *	@returns {String} The tempalted string.
		 *
		 *	@example
		 *		<caption>prints the string: Hello Jason, your email is Fake &lt;not-a@real.email&gt;</caption>
		 *
		 *		util.template('Hello {{user.name}}, your email is {{{user.email}}}.', {
		 *			user : {
		 *				name : 'Jason',
		 *				email : 'Fake <not-a@real.email>'
		 *			}
		 *		});
		 */
		template : (function() {
			var rep = /\{\{\{?([^{}]+)\}?\}\}/gi,
				currentOptions,
				current,
				noopt = {};

			function template(str, fields, options) {
				current = fields || noopt;
				currentOptions = options || noopt;
				return str.replace(rep, field);
			}

			function field(str, token) {
				var opt = currentOptions,
					value;
				if (opt.prefix) {
					if (token.substring(0, opt.prefix.length)!==opt.prefix) {
						return str;
					}
					token = token.substring(opt.prefix.length);
				}
				value = exports.delve(current, token);
				if (value) {
					if (str.charAt(2)!=='{') {
						value = exports.htmlEntities(value);
					}
					return value;
				}
				if (opt.empty!==false) {
					str = opt.empty || '';
				}
				return str;
			}

			return template;
		}()),

		/**	Create a memoized proxy of a function.  This caches the return values of the given function using only the <strong>first argument</strong> as a cache key.
		 *	@function
		 *	@param {Function} func			A function to memoize.
		 *	@param {Object} [mem={}]		Optionally pre-supply key-value cache entries.
		 *	@param {Object} [options]		Hashmap of options for the cache.
		 *	@param {Object} [options.ignoreCase=false]		If <code>true</code>, the cache becomes case-insensitive.
		 *	@returns {Function} A memoized version of <code>func</code>.
		 *
		 *	@example
		 *		// Executes getElementById each time it is called:
		 *		function find(id) {
		 *			return document.getElementById(id);
		 *		}
		 *
		 *		// Wrap find() in a cache:
		 *		var fastFind = util.memoize(find);
		 *
		 *		find('test') === fastFind('test');   // true
		 */
		memoize : function(func, mem, options) {
			var memoized;
			if (typeof func!=='function') {
				throw(new Error("util.memoize(func, mem) :: Error - first argument must be a function."));
			}
			mem = mem || {};
			options = options || {};
			/**	@ignore */
			memoized = function(input) {
				var ret;
				input += '';
				if (options.caseInsensitive===true) {
					// cast cache key to a string and normalize case:
					input = input.toLowerCase();
				}
				if (mem.hasOwnProperty(input)) {
					return mem[input];
				}
				ret = func.apply(this, arguments);
				mem[input] = ret;
				return ret;
			};
			/**	@ignore */
			memoized.unmemoize = function() {
				var o = func;
				memoized = func = mem = null;
				return o;
			};
			return memoized;
		},

		/** Call an iterator function on any Object or Array.<br />
		 *	<strong>Note:</strong> Return false from <code>iterator</code> to break out of the loop.
		 *	@param {Array|Object} obj		Any object
		 *	@param {Function} iterator		A function to call on each entry, gets passed <code>(value, key, obj)</code>.
		 *	@returns {Object} Returns the first arguments, <code>obj</code>, for convenience.
		 *
		 *	@example
		 *		util.forEach(window, function(value, key) {
		 *			console.log(value, key);
		 *		});
		 */
		forEach : function(obj, iterator) {
			var p;
			if (Array.isArray(obj)) {
				for (p=0; p<obj.length; p++) {
					if (iterator.call(obj, obj[p], p)===false) {
						break;
					}
				}
			}
			else {
				for (p in obj) {
					if (obj.hasOwnProperty(p) && iterator.call(obj, obj[p], p)===false) {
						break;
					}
				}
			}
			return obj;
		},

		/**	Retrieve a nested property value using dot-notated keys.
		 *	@param {Object} obj		An object to descend into
		 *	@param {String} key		A dot-notated (and/or bracket-notated) key
		 *	@param {any} [fallback]	Fallback to return if <code>key</code> is not found in <code>obj</code>
		 *	@returns The corresponding key's value if it exists, otherwise <code>fallback</code> or <code>undefined</code>.
		 *
		 *	@example
		 *		<caption>Basic Usage:</caption>
		 *
		 *		var res = {
		 *			json : {
		 *				success : true,
		 *				message : 'Thing completed.'
		 *			}
		 *		};
		 *
		 *		var msg = util.delve(res, 'json.message');
		 *		console.log(msg);		// 'Thing completed.'
		 *
		 *	@example
		 *		<caption>DOM Traversal:</caption>
		 *
		 *		document.body.innerHTML = '<span>hello</span>';
		 *		var text = util.delve(window, 'document.body.childNodes.0.textContent');
		 *		console.log(text);		// "hello"
		 */
		delve : function(obj, key, fallback) {
			var c=obj, i;
			if (key==='this') {
				return obj;
			}
			if (key==='.') {
				return obj.hasOwnProperty('.') ? obj['.'] : fallback;
			}
			if (key.indexOf('.')===-1) {
				return obj.hasOwnProperty(key) ? obj[key] : fallback;
			}
			key = key.replace(/(\.{2,}|\[(['"])([^\.]*?)\1\])/gm,'.$2').replace(/(^\.|\.$)/gm,'').split('.');
			for (i=0; i<key.length; i++) {
				if (!c || !c.hasOwnProperty(key[i])) {
					return fallback;
				}
				c = c[key[i]];
			}
			return c;
		},

		/** Copy own-properties from <code>props</code> onto <code>base</code>.
		 *	@param {Object} base		An object onto which properties should be copied
		 *	@param {Object} props*		The rest of the arguments will have their properties copied onto <code>base</code>
		 *	@returns base
		 *
		 *	@example
		 *		<caption>Basic Usage:</caption>
		 *		var obj1 = {
		 *				test : 'foo',
		 *				obj1prop : 'obj1'
		 *			},
		 *			obj2 = {
		 *				test : 'bar',
		 *				obj2prop : 'obj2'
		 *			};
		 *
		 *		// copy properties from obj2 onto obj1:
		 *		util.extend(obj1, obj2);
		 *
		 *		console.log(obj1.test);
		 *		//	{
		 *		//		test : "bar",
		 *		//		obj1prop : "obj1",
		 *		//		obj2prop : "obj2"
		 *		//	}
		 *
		 *	@example
		 *		<caption>Shallow Clone:</caption>
		 *		var orig = {
		 *			foo : 'bar'
		 *		};
		 *
		 *		var clone = util.extend({}, orig);
		 *
		 *		console.log(clone === orig);   // false
		 *		console.log(clone.foo === orig.foo);   // true
		 *
		 *	@example
		 *		<caption>Tip: Cheater constructor options</caption>
		 *
		 *		function MyClass(options) {
		 *			// copy options onto the instance:
		 *			util.extend(this, options || {});
		 *		}
		 *
		 *		new MyClass({
		 *			unique : true
		 *		});
		 */
		extend : function extend(base, props) {
			var i, p, obj, len=arguments.length, ctor=exports.constructor, bypass;
			for (i=1; i<len; i++) {
				obj = arguments[i];
				if (obj!==null && obj!==undefined) {
					bypass = obj.constructor===exports.constructor;
					for (p in obj) {
						if (bypass || obj.hasOwnProperty(p)) {
							base[p] = obj[p];
						}
					}
				}
			}
			return base;
		},

		/**	Simple inheritance.<br />
		 *	<b>Note: Operates directly on baseClass.</b>
		 *	@param {Function} baseClass		The base (child) class.
		 *	@param {Function} superClass	The SuperClass to inherit.
		 *	@returns {Function} the modified class, for convenience.
		 *	@example
		 *		function Animal() {
		 *			this.sound = "";
		 *		}
		 *		Animal.prototype.type = 'Unknown';
		 *
		 *		function Cat() {
		 *			// call parent constructor:
		 *			Animal.call(this);
		 *			this.sound = "mew";
		 *		}
		 *		Cat.prototype.type = 'Feline';
		 *
		 *		// Make Cat inherit from Animal:
		 *		util.inherits(Cat, Animal);
		 *
		 *		var cat = new Cat();
		 *		console.log(cat.sound);		// "mew"
		 *		console.log(cat.type);		// "Feline"
		 */
		inherits : function(base, superClass) {
			var proto = base.prototype;
			function F() {}
			F.prototype = superClass.prototype;
			base.prototype = new F();
			exports.extend(base.prototype, proto, {
				constructor : base,
				__super : superClass
			});
		},

		/**	Escape HTML entities within a string.
		 *	@param {String} str		The string to entity-encode
		 *	@returns {String} An entity-encoded version of the input string, <code>str</code>.
		 */
		htmlEntities : function(str) {
			var t=str.split(''), i;
			for (i=t.length; i--; ) {
				if (entityMap.hasOwnProperty(t[i])) {
					t[i] = '&' + entityMap[t[i]] + ';';
				}
			}
			return t.join('');
		},

		/** Generate an unique ID (unique only to the page), with optional prefix.
		 *	@param {String} [prefix=""]		Optionally prefix the returned ID with a given string.
		 *	@returns {String} A uuid String.
		 */
		uniqueId : function(prefix) {
			return (prefix || '') + (++uuids).toString(36);
		}

	};

	/**	Alias of {@link util.forEach}.
	 *	@function module:util.foreach
	 *	@deprecated
	 *	@ignore
	 */
	exports.foreach = exports.forEach;

	return exports;
}));
