(function () {
	'use strict';

	// Priority Queue (list of requests sorted by time to request)
	window.PriorityQueue = (function (SM, RM) {
		var self = {};

		var GAP_TIME_SERVER = 1000,
			MAX_WAITING = 4,
			list = [],
			callback,
			time;

		// public methods
		self.enqueue = function (item) {
			list.push(item);
			list.sort(function (a, b) {
				return getLastTime(a) - getLastTime(b);
			});
		};

		self.initServer = function (backgroundCallback) {
			callback = function () {
				decreaseWaiting();

				// drop response if it was initiated before drop limit time
				var dropLimitTime = parseInt(SM.get('dropResponsesLimitTime')) || 0;
				if (arguments[0].times[0] < dropLimitTime) return false;

				backgroundCallback.apply(this, arguments);
			};

			time = new Date().getTime();

			// update urls and initTime (used to drop responses)
			for (var i = 0; i < list.length; i++) {
				var request = list[i];
				var requestManager = RM.getInstance(request.site);

				request.url = requestManager.getUrl(request);
				request.initTime = time;
			}

			router();
		};

		self.stopServer = function () {
			list = [];
			SM.delete('results');
			SM.put('waiting', 0);
			SM.put('dropResponsesLimitTime', new Date().getTime());
		};

		self.getLength = function () {
			return list.length;
		};

		// private methods
		var router = function () {
			var waiting = getWaiting();

			var request = list[0];
			var requestManager = request ? RM.getInstance(request.site) : {};
			var rmMaxWaiting = requestManager.maxWaiting || MAX_WAITING;
			var gapTimeServer = requestManager.gapTimeServer || GAP_TIME_SERVER;

			if (!request) {
				if (waiting === 0)
					return false; // stops the 'server'

			} else if (getLastTime(request) <= time && !request.isPriority && waiting < rmMaxWaiting) {
				request = list.shift(); // remove the first item
				request.isPriority = true;

				increaseWaiting();
				sendRequest(request);

			} else {
				for (var i = 0; i < list.length; i++) {
					request = list[i];

					if (getLastTime(request) <= time && request.isPriority) {
						request = list.splice(i, 1)[0]; // remove the item at position i

						sendRequest(request);
						break
					}
				}
			}

			time += gapTimeServer;
			setTimeout(router, gapTimeServer);
		};

		var sendRequest = function (request) {
			setTimeout(function () {
				var requestManager = RM.getInstance(request.site);

				requestManager.sendRequest(request, callback, failCallback, time);
			}, 1);
		};

		var failCallback = function (request) {
			var lastTime = getLastTime(request);
			request.times.push(estimatedTimeToBeReady(lastTime));

			self.enqueue(request);
		};

		var estimatedTimeToBeReady = function (time) {
			return parseInt(time) + 3000;
		};

		var getLastTime = function (request) {
			return request.times[request.times.length - 1];
		};

		var increaseWaiting = function () {
			SM.put('waiting', getWaiting() + 1);
		};

		var decreaseWaiting = function () {
			SM.put('waiting', getWaiting() - 1);
		};

		var getWaiting = function () {
			return parseInt(SM.get('waiting')) || 0;
		};

		return self;
	}(window.StoreManager, window.RequestManager));
})();
