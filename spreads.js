'use strict';

let ch = require('./cache.js');

global.toId = function(text) {
	return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
}
exports.UsageCounter = class UsageCounter {
	constructor() {
		this.Cache = new ch.Cache();
		this.request = require('request');
		this.deviation = 24;
		this.percentBorder = 0.001;
	};
	setDeviation(value) {
		value = parseInt(value, 10);
		if (typeof value === NaN) value = this.deviation;
		this.deviation = value;
	};
	intArray(text, divider) {
		return text.split(divider).map(Number);
	};
	truncateNumber(num) {
		return parseFloat(num.toString().slice(0, 6));
	};

	getSpreadUsage(pokemon, tier, weight, month, year, callback) {
		return this.getSetUsage(pokemon, tier, weight, month, year, callback, true);
	};
	getSetUsage(pokemon, tier, weight, month, year, callback, ignoreNature) {
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
		let fileData = this.Cache.tryLoadCache(tier, weight, month, year);
		if (fileData === '') {
			let self = this;
			this.request(url, function(error, response, html) {
				let data = '';
				if (error) {
					data = error;
				} else {
					try {
						console.log(url);
						data = self.parseUsageChaos(pokemon, ignoreNature, html);
					} catch (e) {
						console.log(e);
						// The only error we should be catching here is invalid json
						// which probably means the file didn't exist.
						data = 'Invalid data recieved (perhaps the file you asked for doesn\'t exist?)';
					}
				}
				callback(data);
				// Cache this file for future use, if it wasn't an error
				if (data.indexOf('|') >= 0) {
					self.Cache.trySaveCache(html, tier, weight, month, year);
				}
			});
		} else {
			// This cannot feasibly create errors, because we have validated the data already
			callback(this.parseUsageChaos(pokemon, ignoreNature,fileData));
			return null;
		}
	};

	parseUsageChaos(pokemon, ignoreNature, chaos) {
		let buffer = '';
		let json = JSON.parse(chaos);
		let data = json['data'];
		let sum = 0;
		if (data[pokemon] === undefined) return 'No information found for ' + pokemon + ' in the specified tier.';
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
			let spread = this.intArray(set.split(':')[1], '/');
			if (!combined[set]) combined[set] = 0;
			for (let j = i; j < len; j++) {
				let nSet = sorted[j];
				let nNature = nSet.split(':')[0];
				// If nature isn't the same they're different spreads, unless explicitly told
				// to ignore the natures when counting.
				if (!ignoreNature && nature !== nNature) continue;
				if (counted[nSet]) continue;
				let nSpread = this.intArray(nSet.split(':')[1], '/');
				let similar = 0;
				for (let k = 0, evLen = nSpread.length; k < evLen; k++) {
					if (spread[k] === nSpread[k]) { 
						similar++; 
					} else {
						let diff = Math.abs(spread[k] - nSpread[k]);
						if (diff <= this.deviation) {
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
			if (combined[resorted[i]] < this.percentBorder) break;
			buffer += '' + resorted[i] + ': ' + this.truncateNumber(combined[resorted[i]]) + '%';
			buffer += '|';
		}
		return buffer;
	}
};