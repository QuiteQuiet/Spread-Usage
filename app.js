'use strict';

let Pokedex = require('./pokedex.js').Pokedex;
let Usage = require('./spreads.js');
let express = require('express');
let app = express();

app.use(express.static(__dirname + '/client'));
app.get('/', function(req, res) {
	// Serve index page here
	res.sendFile('client/index.html', { root: __dirname});
});

app.get('/usage', function(req, res) {
	let query = req.query;
	// Read and validate query
	if (!query.pokemon) res.send("No Pok&eacute;mon Specified");
	let pokemon = toId(query.pokemon);
	// If existing pokemon
	if (Pokedex[pokemon] === undefined) {
		res.send("Pok&eacute;mon not found (or it's a typo?).");
	} else {
		pokemon = Pokedex[pokemon];
	}
	let tier = toId(query.tier ? query.tier : 'ou');
	let weight = (query.weight ? query.weight : (tier == 'ou' ? '1695' : '1630'));
	let allowedWeights = (tier === 'ou' ? {'0':1,'1500':1,'1695':1,'1825':1} : {'0':1,'1500':1,'1630':1,'1760':1});
	if (!(weight in allowedWeights)) {
		res.send('Invalid weight specified (' + weight + ') for tier: ' + tier);
	}
	let month = (query.month ? query.month : '' + (new Date().getMonth() - 1));
	let year = (query.year ? query.year : '' + new Date().getFullYear());
	if (month.length > 2) month = '0' + month;

	// Everything should be valid data here
	console.log('Fetching information: ' + pokemon + ' in ' + tier + '-' + weight + '.');
	let error = Usage.getSetUsage(pokemon, tier, weight, month, year, function(data) {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.end(data, 'utf-8');
	});
	if (error) {
		console.log(error);
	}
});

// This is all we need to do then...
let port = '8080';
app.listen(port);
console.log('Listening on port: ' + port);
