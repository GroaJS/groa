const Groa = require('../../');

const app = new Groa();

app.addProto(__dirname + '/proto/example.proto');

app.use(async (ctx, next) => {

	ctx.throw(Groa.status.OUT_OF_RANGE, 'OUT OF RANGE!!!');

	console.log('ooops');
});


app.listen(50051, () => {
	console.log('Listening on port 50051');
});
