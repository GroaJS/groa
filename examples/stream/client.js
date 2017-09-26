const { Client } = require('../../');

const client = new Client('0.0.0.0', 50051);

client.loadProto(__dirname + '/proto/stream.proto').then(async () => {

	let Example1 = client.getService('example.foo.Example1');

	let stream = await Example1.receive({});

	stream.write({
		timestamp: new Date()
	});

	stream.on('data', (data) => {
		console.log(data);
	});

});
