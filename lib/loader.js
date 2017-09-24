const ProtoBuf = require('protobufjs');
const grpc = require('grpc');
const path = require('path');

const listServices = function(root, def) {

	return Object.entries(def).reduce((results, [ propName, value ]) => {

		let objPath = propName;
		if (root) {
			objPath = root + '.' + propName;
		}

		if (value.hasOwnProperty('service')) {
			results[objPath] = value;
		} else {
			return Object.assign(results, listServices(objPath, value));
		}

		return results;
	}, {});
};

const loadProto = async function(filename) {

	const root = new ProtoBuf.Root();

	// Support google extension
	let _resolve = root.resolvePath;
	root.resolvePath = (origin, target) => {

		if (target.search('google') === 0) {
			return path.join(__dirname, '..', 'node_modules/google-proto-files', target);
		}

		return _resolve(origin, target);
	};

	// Loading file
	let parsedObj = await ProtoBuf.load(filename, root);
	let def = grpc.loadObject(parsedObj);

	return {
		services: listServices('', def)
	};
};


module.exports = {
	loadProto: loadProto,
	listServices: listServices
};
