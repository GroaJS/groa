const Groa = require('../../');

const app = new Groa();

// Add proto file
app.addProto(__dirname + '/proto/stream.proto');

const delay = (interval) => {
	return new Promise((resolve) => {
		setTimeout(resolve, interval);
	});
}

// Add middleware
app.use(async (ctx, next) => {

	ctx.req.body.on('data', (data) => {
		console.log(data);
	});

	// send a message
	ctx.body.write({
		timestamp: new Date()
	});
	
	// delay 1 second
	await delay(1000);
	
	// send a message
	ctx.body.write({
		timestamp: new Date()
	});
	
	// delay 1 second
	await delay(1000);
	
	// complete
	//ctx.body.end();
});

app.listen(50051, () => {
	console.log('Listening on port 50051');
});
