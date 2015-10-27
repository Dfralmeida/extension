(function () {
	'use strict';

	window.APP_NAME = 'genghis';
	window.BG = (function (SM, PQ, RM) {
		var GAP_TIME = 1000,
			REPEAT_SEARCH_DELAY = 6 * 60 * 60 * 1000, //6 HOURS
			sendEmailTimeout,
			repeatSearchTimeout;

		// public methods
		return {
			initServer: initServer,
			stopServer: stopServer,
			getDateRequests: getDateRequests,
			deleteHistory: deleteHistory,
			hideBadge: hideBadge,
			saveRequest: saveRequest,
			getRequests: getRequests,
			getResults: getResults,
			getSites: getSites,
			getInitialNumberOfFlights: getInitialNumberOfFlights
		};

		function initServer(req) {
			stopServer();

			var list = getDateRequests(req),
				i;
			for (i = 0; i < list.length; i++)
				PQ.enqueue(list[i]);

			setTimeout(function () {
				saveRequest(req);
				PQ.initServer(getResponse);
			}, 1);

			setupRepeatSearch(req);
			saveInitialNumberOfFlights();

			return list.length;
		}

		function stopServer() {
			PQ.stopServer();
			saveInitialNumberOfFlights();
		}

		function getDateRequests(req) {
			var i, j, k, w,
				time = new Date().getTime(),
				email = req.email,
				priceEmail = req.priceEmail,
				adults = req.adults,
				children = req.children,
				infants = req.infants,
				site = req.site,
				origin,
				destination,
				departure,
				returnDate,
				qtyDays,
				dateRequest,
				list = [];

			for (i = 0; i < req.origins.length; i++) {
				for (j = 0; j < req.destinations.length; j++) {
					origin = req.origins[i];
					destination = req.destinations[j];
					if (origin === destination) continue;

					for (k = 0; k < req.departures.length; k++) {
						departure = req.departures[k];

						if (req.qtyDays !== null && req.qtyDays.length > 0) {
							for (w = 0; w < req.qtyDays.length; w++) {
								qtyDays = req.qtyDays[w];

								returnDate = null; // oneway
								if (qtyDays >= 0) // roundtrip
									returnDate = new Date(departure).setHours(24 * qtyDays, 0, 0, 0);

								dateRequest = createDateRequest(origin, destination, departure, returnDate,
									adults, children, infants, site, email, priceEmail, time);
								list.push(dateRequest);

								time += GAP_TIME;
							}

							continue;
						}

						// oneway
						if (req.returns === null || req.returns.length === 0) {
							dateRequest = createDateRequest(origin, destination, departure, null,
								adults, children, infants, site, email, priceEmail, time);
							list.push(dateRequest);

							time += GAP_TIME;
							continue;
						}

						// roundtrip
						for (w = 0; w < req.returns.length; w++) {
							returnDate = req.returns[w];
							if (departure > returnDate) continue;

							dateRequest = createDateRequest(origin, destination, departure, returnDate,
								adults, children, infants, site, email, priceEmail, time);
							list.push(dateRequest);

							time += GAP_TIME;
						}
					}
				}
			}

			return list;
		}

		function deleteHistory() {
			SM.clear();
		}

		function hideBadge() {
			chrome.browserAction.setBadgeText({
				text: ''
			});
		}

		function saveRequest(request) {
			if (!request || Object.keys(request).length === 0) return;

			var i, j, requests = getRequests();
			for (i in requests) {
				if (!requests.hasOwnProperty(i)) continue;
				var savedRequest = requests[i];

				// if it has same origins and destinations as an old request, override it
				var hasSameOriginsAndDepartures =
					request.origins.length === savedRequest.origins.length &&
					request.destinations.length === savedRequest.destinations.length;

				if (hasSameOriginsAndDepartures) {
					for (j in request.origins) {
						if (request.origins.hasOwnProperty(j) &&
							savedRequest.origins.indexOf(request.origins[j]) === -1) {
							hasSameOriginsAndDepartures = false;
							break;
						}
					}
				}

				if (hasSameOriginsAndDepartures) {
					for (j in request.destinations) {
						if (request.destinations.hasOwnProperty(j) &&
							savedRequest.destinations.indexOf(request.destinations[j]) === -1) {
							hasSameOriginsAndDepartures = false;
							break;
						}
					}
				}

				if (hasSameOriginsAndDepartures) {
					requests.splice(i, 1); // remove it
					break;
				}
			}

			requests.splice(0, 0, request); // save it on beginning
			SM.put('requests', JSON.stringify(requests));
		}

		function getRequests() {
			return JSON.parse(SM.get('requests')) || [];
		}

		function getResults() {
			return JSON.parse(SM.get('results')) || [];
		}

		function saveResults(results) {
			SM.put('results', JSON.stringify(results || []));
		}

		function getSites() {
			return RM.getInstances();
		}

		function getInitialNumberOfFlights() {
			return parseInt(SM.get('initialNumberOfFlights')) || 0;
		}

		// private methods
		function saveInitialNumberOfFlights() {
			SM.put('initialNumberOfFlights', PQ.getLength());
		}

		function createDateRequest(origin, destination, departureDate, returnDate,
			adults, children, infants, site, email, priceEmail, time) {
			return {
				origin: origin,
				destination: destination,
				departure: departureDate,
				return: returnDate,
				adults: adults,
				children: children,
				infants: infants,
				site: site,
				email: email,
				priceEmail: priceEmail,
				times: [time]
			};
		}

		function getResponse(request, response) {
			var results = savePricesReceived(request, response);
			var popup = chrome.extension.getViews({
				type: 'popup'
			})[0];

			if (popup !== undefined) {
				hideBadge();

				var scope = popup.angular
					.element(popup.document.getElementsByTagName('body'))
					.scope();

				scope.$apply(function () {
					scope.vm.updateResults(results);
				});
			} else {
				updateBadge();
			}

			if (request.email && request.priceEmail)
				sendEmailIfLowFare(request, results);
		}

		function savePricesReceived(request, response) {
			var results = getResults();

			results.push({
				origin: request.origin,
				destination: request.destination,
				departure: request.departure,
				return: request.return,
				url: request.url,
				prices: response.prices,
				byCompany: response.byCompany,
				minPrice: Math.min.apply(null, response.prices),
				key: request.origin + '-' + request.destination
			});

			results.sort(function (a, b) {
				return a.minPrice > b.minPrice ? 1 : (a.minPrice < b.minPrice ? -1 : a.key - b.key);
			});

			saveResults(results);

			return results;
		}

		function updateBadge() {
			chrome.browserAction.setBadgeBackgroundColor({
				color: [220, 0, 0, 255]
			});

			chrome.browserAction.setBadgeText({
				text: getResults().length.toString()
			});
		}

		function sendEmailIfLowFare(request, results) {
			var i, datesWithLowFare = '';

			for (i in results) {
				if (!results.hasOwnProperty(i)) continue;
				var result = results[i];

				if (result.minPrice > 0 && result.minPrice <= request.priceEmail) {
					var text = result.key + ' - ' + result.departure.toDateFormat('dd/MM/yyyy');

					if (result.return !== null) //roundtrip
						text += ' - ' + result.return.toDateFormat('dd/MM/yyyy');

					text += ' - ' + result.minPrice;
					datesWithLowFare += '<br/><a href="' + result.url + '">' + text + '</a>';
				}
			}

			if (datesWithLowFare !== '') {
				clearTimeout(sendEmailTimeout);

				sendEmailTimeout = setTimeout(function () {
					var extensionName = chrome.i18n.getMessage('extensionName');
					var subject = chrome.i18n.getMessage('emailSubject');
					var template = chrome.i18n.getMessage('emailTemplate');
					var message = template
						.replace('PRICE_EMAIL', request.priceEmail)
						.replace('DATES', datesWithLowFare);

					$.ajax({
						type: 'POST',
						url: 'https://mandrillapp.com/api/1.0/messages/send.json',
						data: {
							// please don't use this key. Sign up for https://mandrill.com/signup/ It's free!
							key: '9oF6KGko9Eg43LpgM2GCXA',
							message: {
								html: message + extensionName,
								subject: subject,
								from_email: 'genghislabs@gmail.com',
								from_name: extensionName,
								to: [
									{
										email: request.email,
										type: 'to'
									},
									{
										email: 'genghislabs@gmail.com',
										type: 'cc'
									},
								],
								headers: {
									'Reply-To': 'genghislabs@gmail.com'
								},
								auto_html: null,
							}
						}
					});

					clearTimeout(repeatSearchTimeout);
				}, 2000 * 60); // wait two minutes, enough time to fetch more results
			}
		}

		function setupRepeatSearch(req) {
			if (req === undefined) { // pc turn on, verify if we need do the saved search
				var timeToSearch = SM.get('repeatSearchTime');
				if (timeToSearch !== null) {
					clearTimeout(repeatSearchTimeout);

					repeatSearchTimeout = setTimeout(function () {
						initServer(JSON.parse(SM.get('repeatSearchRequest')));
					}, Math.max(1, parseInt(timeToSearch) - (new Date()).getTime()));
				}
			} else if (req.email && req.priceEmail) {
				var now = new Date();
				now.setMilliseconds(now.getMilliseconds() + REPEAT_SEARCH_DELAY);

				// saving ticks, in case the pc shutdown. So next time the pc turn on, we verify this
				SM.put('repeatSearchTime', now.getTime());
				SM.put('repeatSearchRequest', JSON.stringify(req));

				clearTimeout(repeatSearchTimeout);

				repeatSearchTimeout = setTimeout(function () {
					var request = JSON.parse(SM.get('repeatSearchRequest'));

					initServer(request);
				}, REPEAT_SEARCH_DELAY);
			} else {
				SM.delete('repeatSearchTime');
				SM.delete('repeatSearchRequest');

				clearTimeout(repeatSearchTimeout);
			}
		}

		// initial setup in case of turning on the pc
		setupRepeatSearch();

	}(window.StoreManager, window.PriorityQueue, window.RequestManager));
})();