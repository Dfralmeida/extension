(function (RequestManager, APP_NAME) {
	'use strict';

	function TudoAzul() {
		var self = this;
		self.parent.push.call(self);

		const SERVICE_BASE_URL = 'http://viajemais.voeazul.com.br/Search2.aspx',
			PUBLIC_BASE_URL = 'http://viajemais.voeazul.com.br/Search2.aspx';

		// public methods
		self.sendRequest = function (request, successCallback, failCallback, time) {
			self.parent.sendRequest({
				request: request,
				url: getServiceUrl(request),
				headers: {
					'Content-type': 'application/x-www-form-urlencoded'
				},
				time: time,
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					var parser = new DOMParser();
					var response = parser.parseFromString(responseText, 'text/html');
					var info = mapAjaxResponse(request, response);

					successCallback(request, info);
				},
				formData: getFormData(request)
			});
		};

		self.getUrl = function (request) {
			return SERVICE_BASE_URL + '?utm_source=' + APP_NAME;
		};

		// private methods
		var getFormData = function (request) {
			var p = [];

			var base = 'ControlGroupSearchView2$AvailabilitySearchInputSearchView2$';
			p.push('_authkey_=null');
			p.push('__EVENTTARGET=ControlGroupSearchView2$LinkButtonSubmit');
			p.push(base + 'TextBoxPromoCode=CALLCENT');
			p.push(base + 'RadioButtonMarketStructure=' + (request.return === null ? 'OneWay' : 'RoundTrip'));
			p.push(base + 'TextBoxMarketOrigin1=' + request.origin);
			p.push(base + 'CheckBoxUseMacOrigin1=');
			p.push(base + 'TextBoxMarketDestination1=' + request.destination);
			p.push(base + 'CheckBoxUseMacDestination1=on');
			p.push(base + 'DropDownListMarketDay1=' + request.departure.toDateFormat('dd'));
			p.push(base + 'DropDownListMarketMonth1=' + request.departure.toDateFormat('yyyy-MM'));

			if (request.return !== null) {
				p.push(base + 'DropDownListMarketDay2=' + request.return.toDateFormat('dd'));
				p.push(base + 'DropDownListMarketMonth2=' + request.return.toDateFormat('yyyy-MM'));
			}

			p.push(base + 'DropDownListSearchBy=columnView');
			p.push(base + 'DropDownListPassengerType_ADT=' + request.adults);
			p.push(base + 'DropDownListPassengerType_CHD=' + request.children);
			p.push(base + 'DropDownListPassengerType_INFANT=' + request.infants);
			p.push(base + 'DropDownListFareTypes=TD');
			p.push(base + 'rbSearchPoints=Pontos');

			return p.join('&');
		};

		var getServiceUrl = function (request) {
			return SERVICE_BASE_URL;
		};

		var mapAjaxResponse = function (request, response) {
			var isOneWay = request.return === null;

			var departurePrices = [0, 0, 0];
			var returnPrices = [0, 0, 0];
			var byCompany = {};

			// departure flights
			$('#GoingPrices .info-table tr.flightInfo', response).each(function () {
				// there can be more than one price related to economy, business, ...
				var price = 0;
				$(this).find('.farePrice').each(function () {
					var newPrice = parseInt($(this).text().replace(/[^0-9]/g, '')); // in general the price appears like 10.000 Pts
					price = self.parent.getMinPrice(newPrice, price);
				});

				var stops = JSON.parse($(this).find('.SegmentParam').text()).length - 1;
				stops = Math.min(Math.max(stops, 0), 2); //must be between 0 and 2

				// azul just sells its flights using miles
				var airlineName = 'Azul';

				//if it's a round trip, show departure and return airlines separated
				var airline = isOneWay ? airlineName : airlineName + self.parent.departureLabel;

				if (!byCompany[airline]) byCompany[airline] = self.parent.pricesDefault();
				byCompany[airline][stops] = self.parent.getMinPrice(byCompany[airline][stops], price);

				departurePrices[stops] = self.parent.getMinPrice(departurePrices[stops], price);
			});

			if (!isOneWay) {
				// return flights
				$('#BackPrices .info-table tr.flightInfo', response).each(function () {
					// there can be more than one price related to economy, business, ...
					var price = 0;
					$(this).find('.farePrice').each(function () {
						var newPrice = parseInt($(this).text().replace(/[^0-9]/g, '')); // in general the price appears like 10.000 Pts
						price = self.parent.getMinPrice(newPrice, price);
					});

					var stops = JSON.parse($(this).find('.SegmentParam').text()).length - 1;
					stops = Math.min(Math.max(stops, 0), 2); // must be between 0 and 2

					// azul just sells its flights using miles
					var airlineName = 'Azul';
					var airline = airlineName + self.parent.returnLabel;

					if (!byCompany[airline]) byCompany[airline] = self.parent.pricesDefault();
					byCompany[airline][stops] = self.parent.getMinPrice(byCompany[airline][stops], price);

					returnPrices[stops] = self.parent.getMinPrice(returnPrices[stops], price);
				});
			}

			var info = self.parent.returnDefault();
			self.parent.setTotalPrices(info, departurePrices, returnPrices, isOneWay);
			self.parent.setAirlinePrices(info, byCompany);

			return info;
		};

		return self;
	}

	TudoAzul.prototype = new RequestManager('TudoAzul', 'Tudo Azul - Milhas Azul', 1000, 4, 7);
	TudoAzul.prototype.constructor = TudoAzul;
	TudoAzul.prototype.parent = RequestManager.prototype;

	new TudoAzul();
})(window.RequestManager, window.APP_NAME);
