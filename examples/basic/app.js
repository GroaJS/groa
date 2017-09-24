const Groa = require('../../');

const app = new Groa();

app.addProto(__dirname + '/proto/example.proto');

app.use(async (ctx, next) => {

	console.log('middleware');
	await next();
});

app.use(async (ctx, next) => {

	if (ctx.path === '/example.foo.Example1/Ping') {
		ctx.body = ctx.req.body;
	}
});

app.listen(50051, () => {
	console.log('Listening on port 50051');
});
