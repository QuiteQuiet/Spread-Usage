'use strict';

exports.Cache = class Cache {
	constructor () {
		this.fs = require('fs');
	};
	makePath(tier, weight, month, year) {
		return  __dirname + '/cache/' + year + '-' + month + '-' + tier + '-' + weight + '.json';
	};

	loadCacheFile(tier, weight, month, year) {
		// Load a cached file instead of re-fetching it from stats
		return this.fs.readFileSync(this.makePath(tier, weight, month, year), 'utf8');
	};
	tryLoadCache(tier, weight, month, year) {
		try {
			return this.loadCacheFile(tier, weight, month, year);
		} catch (e) {
			return '';
		}
	};

	saveCacheFile(cache, tier, weight, month, year) {
		// Save a fetched file to cache so we can speed up future requests
		this.fs.writeFile(this.makePath(tier, weight, month, year), cache, 'utf8', function(err) {
			if (err) {
				console.log('Didn\'t save' + err);
			}
			console.log('Cached: cache/' + tier + '-' + weight);
		});
	};
	trySaveCache(data, tier, weight, month, year) {
		try {
			this.saveCacheFile(data, tier, weight, month, year);
			return true;
		} catch (e) {
			return false;
		}
	};

	delCachedFile(tier, weight, month, year) {
		// Probably not needed, but delete a cached file
		// Requires #checkCache to be called first
		return this.fs.unlinkSync(this.makePath(tier, weight, month, year));
	};

	purgeCacheFiles() {
		// Clears everything from cache
	};
}
