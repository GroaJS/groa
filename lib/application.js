const grpc = require('grpc');
const path = require('path');
const debug = require('debug')('groa:application');
const loader = require('./loader');

module.exports = class Application {

	constructor() {

		this.middleware = [];
		this.server;
		this.services = {};
		this.protoFiles = [];
	}

	async _next(ctx, middlewares) {

		// Getting next middleware
		let iterator = middlewares.next();
		if (iterator.done === true) {
			console.error('No more middleware');
			return;
		}

		return await iterator.value(ctx, this._next.bind(this, ctx, middlewares));
	}

	async _handler(ctx) {

		// Getting iterator
		let middlewares = this.middleware[Symbol.iterator]();

		await this._next(ctx, middlewares);

		return ctx.body;
	}

	async handler(objPath, call, callback) {

		// Preparing context
		let ctx = {
			app: this,
			path: objPath,
			req: {
				metadata: call.metadata.getMap(),
				body: call.request
			},
			body: {}
		};

		try {
			if (call.writable) {
				// Streaming
				ctx.body = call;
				await this._handler(ctx);
			} else {
				// Simple request
				let result = await this._handler(ctx);
				callback(null, result);
			}
		} catch(e) {
			callback({
				code: grpc.status.ABORTED,
				message: e.message
			});
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

	async _initializeServices() {

		for (let index in this.protoFiles) {

			let filename = this.protoFiles[index];

			let proto = await loader.loadProto(filename);

			// Verifying
			for (let serviceName in proto.services) {
				let def = proto.services[serviceName];

				if (Object.keys(def.service).length === 0) {
					console.warn('Warning:', 'Ignore', serviceName, 'which is an empty service');
				}	
			}

			this.services = Object.assign(this.services, proto.services);
		}
	}

	async _listen(port, host) {

		await this._initializeServices();

		// Preparing services
		Object.entries(this.services).forEach(([ serviceName, def ]) => {

			let methods = Object.keys(def.service);

			// Ignore empty service
			if (methods.length === 0)
				return;

			let implementations = methods.reduce((implementations, method) => {

				implementations[method] = this.handler.bind(this, serviceName + '.' + method);

				return implementations;
			}, {});

			this.server.addService(def.service, implementations);
		});

		this.server.bind(host + ':' + port, grpc.ServerCredentials.createInsecure());
		this.server.start();
	}

	listen(...args) {

		let callback;
		let port = 50051;
		let host = '0.0.0.0';
		if (args.length === 3) {
			port = args[0];
			host = args[1];
			callback = args[3];
		} else if (args.length === 2) {
			port = args[0];
			callback = args[1];
		} else {
			port = args[0];
		}

		// Create server instance
		this.server = new grpc.Server();

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
