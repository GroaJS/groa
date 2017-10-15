<p align="center">
<a href="https://github.com/cfsghost/brig">
<img src="https://user-images.githubusercontent.com/252072/30776180-913e50e0-a0d4-11e7-819b-87ed776e6a47.png">
</a>
</p>

# Groa

Expressive gRPC middleware framework for Node.js. It provides the same style of middleware system and APIs many developers are familiar with which is similar to Koa 2.

[![NPM](https://nodei.co/npm/groa.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/groa/)

## Requirement

Node.js v7.6+ is required, the middleware system of Gora is based on async function.

## Installation

Install via NPM:

```shell
npm install groa --save
```

## Getting Started

The same way with Koa to implement your first gRPC server:

```javascript
const Groa = require('groa');

const app = new Groa();

// Add proto file
app.addProto(__dirname + '/example.proto');

// Add middleware
app.use(async (ctx, next) => {

	// response
	ctx.body = ctx.req.body;
});

app.listen(50051, () => {
	console.log('Listening on port 50051');
});
```

__example.proto__

```proto
syntax = "proto3";

package example.foo;

service Example1 {
	rpc Ping(Ping) returns (Pong) {}
}

message Ping {
	string content = 1;
}

message Pong {
	string content = 1;
}
```

## Send Data as a Stream

Implement streaming method is quite easy that writing to `Stream` object of body directly.

```javascript
const Groa = require('groa');

const app = new Groa();

// Add proto file
app.addProto(__dirname + '/stream.proto');

const delay = (interval) => {
	return new Promise((resolve) => {
		setTimeout(resolve, interval);
	});
}

// Add middleware
app.use(async (ctx, next) => {

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
	ctx.body.end();
});

app.listen(50051, () => {
	console.log('Listening on port 50051');
});
```

__stream.proto__

```proto
syntax = "proto3";

package example.foo;

service Example1 {
	rpc receive(ReceiveRequest) returns (stream ReceiveResponse) {};
}

message ReceiveRequest {
}

message ReceiveResponse {
	string timestamp = 1;
}
```

## Receive Data from Stream

When input is a stream, `ctx.req.body` will be a stream object for receiving data. Besides, `ctx.body` contains the same stream object with `ctx.req.body` if output is stream as well.

```javascript
const Groa = require('groa');

const app = new Groa();

// Add proto file
app.addProto(__dirname + '/stream.proto');

// Add middleware
app.use(async (ctx, next) => {

	// Alias as ctx.body for input stream
	ctx.req.body.on('data', (data) => {
		console.log(data);
		
		// Send the same data back to client
		ctx.body.write(data);
	});
});

app.listen(50051, () => {
	console.log('Listening on port 50051');
});
```

__stream.proto__

```proto
syntax = "proto3";

package example.foo;

service Example1 {
	rpc receive(stream ReceiveRequest) returns (stream ReceiveResponse) {};
}

message ReceiveRequest {
	string timestamp = 1;
}

message ReceiveResponse {
	string timestamp = 1;
}
```

## Status Code and Error Message

You can set status code and message when problem occurring for a request, the following is status code of gRPC Groa supported:

* OK: 0
* CANCELLED: 1
* UNKNOWN: 2
* INVALID_ARGUMENT: 3
* DEADLINE_EXCEEDED: 4
* NOT_FOUND: 5
* ALREADY_EXISTS: 6
* PERMISSION_DENIED: 7
* RESOURCE_EXHAUSTED: 8
* FAILED_PRECONDITION: 9
* ABORTED: 10
* OUT_OF_RANGE: 11
* UNIMPLEMENTED: 12
* INTERNAL: 13
* UNAVAILABLE: 14
* DATA_LOSS: 15
* UNAUTHENTICATED: 16

Usage:

```javascript
ctx.status = Groa.status.ABORTED;
ctx.message = 'Something\'s wrong'
```

Or you can throw an error:

```javascript
ctx.throw('wrong'); // UNKNOWN if no status code
ctx.throw(Application.status.OUT_OF_RANGE);
ctx.throw(Application.status.OUT_OF_RANGE, 'OUT OF RANGE!!!');
```

## Middlewares

* Router: [gora-router](https://github.com/GroaJS/groa-router)

## Using Groa to build a Client with Promise-style functions

Groa provide a `Client` class which provides Promise-style functions to make client much easier in ES6.

```javascript
const { Client } = require('groa');

const client = new Client('0.0.0.0', 50051);

const main = async () => {

	// Loading definition file
	await client.loadProto(__dirname + '/example.proto');
	
	// Get service defnined
	let Example1 = client.getService('example.foo.Example1');
	
	// call
	let ret = await Example1.ping({
		content: 'hello'
	});

	console.log(ret);
};

main();
```

## TODO

* Need more testcases
* Support google.api.http to generate restful API automatically
* Support SSL

## License
Licensed under the MIT License
 
## Authors
Copyright(c) 2017 Fred Chien（錢逢祥） <<cfsghost@gmail.com>>
