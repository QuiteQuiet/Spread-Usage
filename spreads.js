'use strict';

let ch = require('./cache.js');
let Cache = new ch.Cache();
exports.request = require('request');

global.toId = function(text) {
	return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
}
exports.intArray = function(text, divider) {
	return text.split(divider).map(Number);
}
exports.truncateNumber = function(num) {
	return parseFloat(num.toString().slice(0, 6));
}

exports.getSpreadUsage = function(pokemon, tier, weight, month, year, callback) {
	return getSetUsage(pokemon, tier, weight, month, year, callback, true);
}
exports.getSetUsage = function(pokemon, tier, weight, month, year, callback, ignoreNature) {
	let baseurl = 'http://www.smogon.com/stats/';

	if (!pokemon) {
		return 'No Pokemon specified';
	}
	if (!tier) tier = 'ou';
	if (!weight) {
		weight = (tier === 'ou' ? '1695' : '1630');
	}
	if (!month) month = '' + (new Date().getMonth() - 1); // Last month's data is default
	if (!year) year = '' + new Date().getFullYear();

	let allowedWeights = (tier === 'ou' ? {'0':1,'1500':1,'1695':1,'1825':1} : {'0':1,'1500':1,'1630':1,'1760':1});
	if (!(weight in allowedWeights)) {
		return 'Invalid weight specified (' + weight + ') for tier: ' + tier;
	}
	// Pad month if it's single digit
	if (month.length < 2) month = '0' + month;

	let url = baseurl + year + '-' + month + '/chaos/' + tier + '-' + weight + '.json';

	// Fetch the information from PS or cache (if we have it)
	let fileData = Cache.tryLoadCache(tier, weight, month, year);
	if (fileData === '') {
		exports.request(url, function(error, response, html) {
			let data = '';
			if (error) {
				console.log(error);
			} else {
				data = parseUsageChaos(pokemon, ignoreNature, html);
			}
			callback(data);
			// Cache this file for future use
			Cache.trySaveCache(html, tier, weight, month, year);
			return null;
		});
	} else {
		callback(parseUsageChaos(pokemon, ignoreNature,fileData));
	}
}

function parseUsageChaos(pokemon, ignoreNature, chaos) {
	let buffer = '';
	let json = JSON.parse(chaos);
	let data = json['data'];
	let sum = 0;
	let sets = data[pokemon]['Spreads'];

	// Get the total sum for percentages
	for (let set in sets) {
		sum += sets[set];
	}
	for (let set in sets) {
		sets[set] = (sets[set] / sum) * 100;
	}
	let sorted = Object.keys(sets).sort(function (a, b) { return sets[b] - sets[a]; });

	// combine similar sets into the most common one
	// what this does is loop through the array, and for each
	// element it looks through the rest for spreads that are
	// similar to the original, and then mark spreads it counted.
	let combined = {};
	let counted = {}
	for (let i = 0, len = sorted.length; i < len; i++) {
		let set = sorted[i];
		if (counted[set]) continue;
		let nature = set.split(':')[0];
		let spread = exports.intArray(set.split(':')[1], '/');
		if (!combined[set]) combined[set] = 0;
		for (let j = i; j < len; j++) {
			let nSet = sorted[j];
			let nNature = nSet.split(':')[0];
			// If nature isn't the same they're different spreads, unless explicitly told
			// to ignore the natures when counting.
			if (!ignoreNature && nature !== nNature) continue;
			if (counted[nSet]) continue;
			let nSpread = exports.intArray(nSet.split(':')[1], '/');
			let similar = 0;
			for (let k = 0, evLen = nSpread.length; k < evLen; k++) {
				if (spread[k] === nSpread[k]) { 
					similar++; 
				} else {
					let diff = Math.abs(spread[k] - nSpread[k]);
					if (diff <= 24) {
						similar++;
					}
				}
			}
			if (similar >= 6) {
				combined[set] += sets[nSet];
				counted[nSet] = true;
			}
		}
	}

	let resorted = Object.keys(combined).sort(function(a, b) { return combined[b] - combined[a]; });
	for (let i = 0, rLen = resorted.length; i < rLen; i++) {
		// Lower than 0.001% usage probably isn't worth noting
		if (combined[resorted[i]] < 0.001) break;
		buffer += '' + resorted[i] + ': ' + exports.truncateNumber(combined[resorted[i]]) + '%';
		buffer += '|';
	}
	return buffer;
}