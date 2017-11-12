const grpc = require('grpc');
const path = require('path');
const debug = require('debug')('groa:application');
const loader = require('./loader');

class Application {

	constructor() {

		this.middleware = [];
		this.server = new grpc.Server();
		this.services = {};
		this.roots = [];
		this.protoFiles = [];
	}

	throw(...args) {
		let err = new Error();

		if (args.length === 0) {
			err.code = Application.status.UNKNOWN;
			err.message = 'Internal server error';
			throw err;
		}

		if (args[0] instanceof String) {
			err.code = Application.status.UNKNOWN;
			err.message = args[0];
		} else {
			err.code = args[0];

			if (args.length == 2) {
				err.message = args[1];
			}
		}

		throw err;
	}

	async _next(ctx, middlewares) {

		// Getting next middleware
		let iterator = middlewares.next();
		if (iterator.done === true) {
			return;
		}

		return await iterator.value(ctx, this._next.bind(this, ctx, middlewares));
	}

	async _handler(ctx) {

		// No handler
		if (this.middleware.length === 0) {
			ctx.status = Application.status.UNIMPLEMENTED;
			ctx.body = 'Method is not implemented';
			return;
		}

		// Getting iterator
		let middlewares = this.middleware[Symbol.iterator]();

		let _body = ctx.body;
		try {
			await this._next(ctx, middlewares);
		} catch(e) {
			ctx.status = e.code;

			if (ctx.status === undefined) {
				ctx.status = Application.status.ABORTED;
			}

			if (e.message instanceof String) {
				ctx.body = e.message;
			} else {
				ctx.body = JSON.stringify(e.message || {});
			}

			if (ctx.responseStream) {
				_body.emit('error', {
					code: ctx.status,
					message: ctx.body
				});
				_body.end();
			}

			return;
		}

		if (ctx.status === undefined && ctx.body === undefined) {
			ctx.status = Application.status.UNIMPLEMENTED;
			ctx.body = 'Method is not implemented';

			if (ctx.responseStream) {
				_body.emit('error', {
					code: ctx.status,
					message: ctx.body
				});
				_body.end();
			}
		} else if (ctx.status === undefined) {
			ctx.status = Application.status.OK;
		}
	}

	async handler(objPath, call, callback) {

		// Preparing context
		let ctx = {
			app: this,
			path: objPath,
			status: undefined,
			message: undefined,
			throw: this.throw,
			requestStream: call.readable ? true : false,
			responseStream: call.writable ? true : false,
			req: {
				path: objPath,
				metadata: call.metadata.getMap(),
				body: call.readable ? call : call.request
			},
			body: undefined
		};

		if (call.writable) {
			// Streaming
			ctx.body = call;
			await this._handler(ctx);
		} else {
			// Normal request
			await this._handler(ctx);

			if (ctx.status === Application.status.OK) {
				callback(null, ctx.body);
			} else {

				// for specific status code and message
				callback({
					code: ctx.status,
					message: ctx.body || ''
				});
			}
		}
	}

	use(fn) {

		if (typeof fn !== 'function')
			throw new TypeError('middleware must be a function!');

		debug('use %s', fn._name || fn.name || '-');

		this.middleware.push(fn);

		return this;
	}

	addProto(filename) {

		if (filename instanceof Array) {
			return filename.map((file) => {
				return this.loadProto(file);
			});
		}

		let file = path.resolve(filename);
		if (this.protoFiles.indexOf(file) === -1) {
			this.protoFiles.push(file);
		}
	}

	updateMethod(methodPath, opts) {

		if (opts.serialize)
			this.server.handlers[methodPath].serialize = opts.serialize;

		if (opts.deserialize)
			this.server.handlers[methodPath].deserialize = opts.deserialize;

	}

	registerService(service, implementations, opts) {

		const _register = () => {

			this.server.addService(service, implementations);

			// Customizations
			Object.entries(service).forEach(([ methodName, attrs ]) => {

				if (opts.serialize)
					this.server.handlers[attrs.path].serialize = opts.serialize;

				if (opts.deserialize)
					this.server.handlers[attrs.path].deserialize = opts.deserialize;
			});
		};

		if (this.server.started) {
			// Workaround: addServer will stop us adding service if server is started, so we set property.
			this.server.started = false;

			_register();

			this.server.started = true;
		} else {
			_register();
		}
	}

	async applyProto(proto, opts = {}) {

		opts = Object.assign({
			serialize: undefined,
			deserialize: undefined,
		}, opts);

		// Verifying
		for (let serviceName in proto.services) {
			let def = proto.services[serviceName];

			if (Object.keys(def.service).length === 0) {
				console.warn('Warning:', 'Ignore', serviceName, 'which is an empty service');
			}	
		}

		let services = this.services = Object.assign(this.services, proto.services);

		const capitalize = function(str) {
			return str.charAt(0).toUpperCase() + str.slice(1);
		}

		// Preparing services
		Object.entries(proto.services).forEach(([ serviceName, def ]) => {

			let methods = Object.keys(def.service);

			// Ignore empty service
			if (methods.length === 0)
				return;

			let implementations = methods.reduce((implementations, method) => {

				implementations[method] = this.handler.bind(this, '/' + serviceName + '/' + capitalize(method));

				return implementations;
			}, {});

			// Register
			this.registerService(def.service, implementations, opts)
		});

		this.roots.push(proto.root);
	}

	async loadProto(filename) {

		let proto = await loader.loadProto(filename);

		await this.applyProto(proto);
	}

	lookupType(type) {

		let root = this.roots.find((root) => {
			try {
				return root.lookupType(type);
			} catch(e) {
				return false;
			}
		});

		if (root)
			return root.lookupType(type);
	}

	async _initializeServices() {

		for (let index in this.protoFiles) {

			let filename = this.protoFiles[index];

			await this.loadProto(filename);
		}
	}

	async _listen(port, host) {

		await this._initializeServices();

		this.server.bind(host + ':' + port, grpc.ServerCredentials.createInsecure());
		this.server.start();
	}

	async forceShutdown() {
		this.server.forceShutdown();
	}

	tryShutdown() {

		return new Promise((resolve, reject) => {
			this.server.tryShutdown((err) => {

				if (err)
					return reject(err);

				resolve();
			});
		});
	}

	listen(...args) {

		let callback;
		let port = 50051;
		let host = '0.0.0.0';
		if (args.length === 3) {
			port = args[0];
			host = args[1];
			callback = args[2];
		} else if (args.length === 2) {
			port = args[0];
			callback = args[1];
		} else {
			port = args[0];
		}

		this._listen(port, host)
			.then(() => {
				if (callback !== undefined) {
					callback();
				}
			})
			.catch((e) => {
				if (callback !== undefined) {
					callback(e);
				}
			});

		return this.server;
	}
};

Application.Loader = loader;
Application.status = grpc.status;
Application.Metadata = grpc.Metadata;
Application.grpc = grpc;
Application.Client = require('./client');

module.exports = Application;
