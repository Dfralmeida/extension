'use strict';

function RequestManager(id, name, gapTimeServer, maxWaiting) {
	var self = this;

	self.id = id;
	self.name = name;
	self.gapTimeServer = gapTimeServer;
	self.maxWaiting = maxWaiting;

	return self;
}

RequestManager.prototype.push = function () {
	RequestManager.instances.push(this);
};

RequestManager.prototype.checkGiveUp = function (request, callback) {
	if (request.times.length <= 6) return false;

	//over 3 attempts, give up
	callback(request, this.returnDefault());
	return true;
};

RequestManager.prototype.pricesDefault = function () {
	return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
};

RequestManager.prototype.returnDefault = function () {
	return {
		prices: this.pricesDefault(),
		byCompany: []
	};
};

RequestManager.prototype.setAirlinePrices = function (info, pricesByCompany) {
	for (var airline in pricesByCompany) {
		var prices = pricesByCompany[airline];
		for (var i = 0; i < prices.length; i++)
			prices[i] = prices[i] > 0 ? prices[i] : Number.MAX_SAFE_INTEGER;

		// in case of search by miles, we append these labels to show departure and return prices separately
		var airlineName = airline.replace(this.departureLabel, '').replace(this.returnLabel, '');
		var internalAirline = airlinesByName[airlineName] || (airlinesByCode[airlineName] || {});

		info.byCompany.push({
			company: internalAirline.text || airlineName,
			code: internalAirline.code || airlineName,
			prices: prices,
			minPrice: Math.min.apply(null, prices)
		});
	}

	info.byCompany.sort(function (a, b) {
		return a.minPrice - b.minPrice;
	});
};

RequestManager.prototype.setTotalPrices = function (info, departurePrices, returnPrices, isOneWay) {
	for (var stops = 0; stops <= 2; stops++) {
		var min = 0;

		if (isOneWay) {
			min = departurePrices[stops];
		} else {
			for (var i = 0; i <= stops; i++) {
				if (departurePrices[stops] > 0 && returnPrices[i] > 0)
					min = this.getMinPrice(min, departurePrices[stops] + returnPrices[i]);

				if (departurePrices[i] > 0 && returnPrices[stops] > 0)
					min = this.getMinPrice(min, departurePrices[i] + returnPrices[stops]);
			}	
		}

		info.prices[stops] = this.getMinPrice(info.prices[stops], min);
	}
};

RequestManager.prototype.sendRequest = function (config) {
	var self = this;
	var c = config || {};

	var xhr = new XMLHttpRequest();
	xhr.open(c.method || 'POST', c.url, true);
	for (var i in c.headers) xhr.setRequestHeader(i, c.headers[i]);

	if (c.withCredentials) xhr.withCredentials = c.withCredentials;

	var init = new Date();
	xhr.onload = function (e) {
		if (c.time) c.request.times.push(c.time + ((new Date()) - init));
		if (self.checkGiveUp(c.request, c.successCallback)) return;

		if (xhr.status === 200) {
			try {
				c.callback(xhr.responseText);
			} catch (error) {
				c.failCallback(c.request);
			}
		} else {
			c.failCallback(c.request);
		}
	};

	try {
		xhr.send(c.formData);
	} catch (error) {
		if (self.checkGiveUp(c.request, c.successCallback)) return;
		c.failCallback(c.request);
	}
};

RequestManager.prototype.getMinPrice = function (previousPrice, price) {
	return previousPrice == 0 || price == 0 ? Math.max(previousPrice, price) : Math.min(previousPrice, price);
};

// static properties
RequestManager.instances = [];
RequestManager.getInstances = function () {
	var response = [];
	for (var i in RequestManager.instances) {
		var instance = RequestManager.instances[i];
		response.push({
			id: instance.id,
			text: instance.name
		});
	}

	return response;
};

RequestManager.getInstance = function (id) {
	var inst = RequestManager.instances.filter(function (i) {
		return i.id == id;
	});
	return inst && inst.length > 0 ? inst[0] : {};
};

RequestManager.prototype.departureLabel = ' - Ida';
RequestManager.prototype.returnLabel = ' - Volta';
