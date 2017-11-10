const grpc = require('grpc');
const path = require('path');
const debug = require('debug')('groa:client');
const loader = require('./loader');

module.exports = class Client {

	constructor(host = '0.0.0.0', port = 50051) {
		this.protoFiles = [];
		this.services = {};
		this.roots = [];
		this.connections = {};
		this.instances = {};
		this.host = host;
		this.port = port;
	}

	async loadProto(filename) {

		let proto = await loader.loadProto(filename);

		// Verifying
		for (let serviceName in proto.services) {
			let def = proto.services[serviceName];

			if (Object.keys(def.service).length === 0) {
				console.warn('Warning:', 'Ignore', serviceName, 'which is an empty service');
			}	
		}

		let services = this.services = Object.assign(this.services, proto.services);

		this.roots.push(proto.root);
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

	getService(servicePath) {

		// Getting instance
		let instance = this.instances[servicePath];
		if (instance !== undefined)
			return instance;

		// Getting service class
		let service = this.services[servicePath];
		if (service === undefined) {
			return null;
		}

		// Getting existing connection
		let connection = this.connections[servicePath];
		if (connection === undefined) {
			connection = this.connections[servicePath] = new service(this.host + ':' + this.port, grpc.credentials.createInsecure());
		}

		instance = this.instances[servicePath] = Object.entries(service.service).reduce((result, [ method, value ]) => {

			// Stream
			if (value.responseStream || value.requestStream) {
				let func = result[method] = function(...args) {
					return connection[method].apply(connection, args);
				};

				func.info = value;

				return result;
			}

			// Normal RPC
			let func = result[method] = function(...args) {

				return new Promise((resolve, reject) => {

					// Customized callback
					args.push((err, data) => {
						if (err)
							return reject(err);

						resolve(data);
					});

					connection[method].apply(connection, args);
				});
			};

			func.info = value;

			return result;
		}, {});

		return instance;
	}

	async close() {

		Object.entries(this.connections).forEach(([ servicePath, service ]) => {
			service.close();
		});
	}
};
