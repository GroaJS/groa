const ProtoBuf = require('protobufjs');
const grpc = require('grpc');
const path = require('path');

const listServices = function(root, def) {

	return Object.entries(def).reduce((results, [ propName, value ]) => {

		let objPath = propName;
		if (root) {
			objPath = root + '.' + propName;
		}

		if (value !== undefined && value.hasOwnProperty('super_') && value.hasOwnProperty('service')) {
			results[objPath] = value;
		} else if (value instanceof ProtoBuf.Enum) {
			return results;
		} else {
			return Object.assign(results, listServices(objPath, value));
		}

		return results;
	}, {});
};

const prepareRoot = async function() {

	const root = new ProtoBuf.Root();

	// Support google extension
	let _resolve = root.resolvePath;
	root.resolvePath = (origin, target) => {

		if (target.search('google') === 0) {
			return path.join(__dirname, '..', 'node_modules/google-proto-files', target);
		}

		return _resolve(origin, target);
	};

	return root;
}

const parseProto = async function(proto) {

	const root = await prepareRoot();

	let parserResult = ProtoBuf.parse(proto, root);
	let def = grpc.loadObject(parserResult.root);

	return {
		root: root,
		services: listServices('', def)
	};
};

const loadProto = async function(filename) {

	const root = await prepareRoot();

	// Loading file
	let parsedObj = await ProtoBuf.load(filename, root);
	let def = grpc.loadObject(parsedObj);

	return {
		root: root,
		services: listServices('', def)
	};
};


module.exports = {
	parseProto: parseProto,
	loadProto: loadProto,
	listServices: listServices
};
