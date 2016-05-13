'use strict';

exports.Cache = class Cache {
	constructor (restrictSize) {
		this.fs = require('fs');
		this.restrictCacheSize = restrictSize;
		this.maxCacheFiles = 10;
		this.path = __dirname + '/cache/';
	};
	makePath(tier, weight, month, year) {
		return this.path + year + '-' + month + '-' + tier + '-' + weight + '.json';
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
		if (this.restrictCacheSize) this.restrictCacheSize();
		// Save a fetched file to cache so we can speed up future requests
		this.fs.writeFile(this.makePath(tier, weight, month, year), cache, 'utf8', function(err) {
			if (err) {
				console.log('Didn\'t save' + err);
			}
			console.log('Cached: cache/' + year + '-' + month + '-' + tier + '-' + weight);
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

	restrictCacheSize() {
		let self = this;
		this.fs.readdir(this.path, function(err, files) {
			// Cache files doesn't include .gitignore
			files = files.filter(function(el) { return el !== '.gitignore' });
			if (files.length >= self.maxCacheFiles) {
				// Get the oldest cached file from the current ones (files created after this point is ignored)
				// oldest = the file with the oldest last accessed time
				let old = self.findOldestFile(files);
				self.delCachedFile(old);
			}
		});
	};
	findOldestFile(files) {
		// Files should be longer than 1, so this is safe
		let oldest = this.path + files[0];
		let oldDate = new Date(this.fs.statSync(oldest)['atime']);
		let test;
		for (let i = 1, len = files.length; i < len; i++) {
			files[i] = this.path + files[i];
			test = new Date(this.fs.statSync(files[i])['atime']);
			if (test < oldDate) {
				oldest = files[i];
				oldTime = test;
			}
		}
		return oldest;
	};

	delCachedFile(path) {
		// Delete a cached file
		return this.fs.unlinkSync(path);
	};

	purgeCacheFiles() {
		// Clear everything from cache (except .gitignore)
		let self = this;
		this.fs.readdir(this.path, function(err, files) {
			// Cache files doesn't include .gitignore
			files = files.filter(function(el) { return el !== '.gitignore' });
			for (let i = 0, len = files.length; i < len; i++) {
				self.delCachedFile(self.path + files[i]);
			}
		});
	};
};
