const { Client } = require('../../');

const client = new Client('0.0.0.0', 50051);

client.loadProto(__dirname + '/proto/example.proto').then(async () => {

	let Example1 = client.getService('example.foo.Example1');

	let ret = await Example1.ping({
		content: 'hello!!!!'
	});

	console.log(ret);
});
