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

## Get Started

The same way with Koa to implement your first gRPC server:

```javascript
const Groa = require('Groa');

const app = new Groa();

// Add proto file
app.addProto(__dirname + '/proto/example.proto');

// Add middleware
app.use(async (ctx, next) => {

	// response
	ctx.body = {
		content: 'hello'
	};
});

app.listen(50051, () => {
	console.log('Listening on port 50051');
});
```

## TODO

* Need a good router
* Need more testcases

## License
Licensed under the MIT License
 
## Authors
Copyright(c) 2017 Fred Chien（錢逢祥） <<cfsghost@gmail.com>>
