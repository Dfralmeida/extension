(function (RequestManager) {
	'use strict';

	function Decolar() {
		var self = this;
		self.parent.push.call(self);

		const SERVICE_BASE_URL = 'http://m.decolar.com/mobile-flights-web/results/',
			PUBLIC_BASE_URL = 'http://www.decolar.com/shop/flights/results/',
			AFFILIATED_ID = 'AG51971';

		// public methods
		self.sendRequest = function (request, successCallback, failCallback, time) {
			self.parent.sendRequest({
				request: request,
				method: 'GET',
				url: getServiceUrl(request),
				headers: {
					'Content-type': 'text/html;charset=UTF-8'
				},
				time: time,
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					var parser = new DOMParser();
					var response = parser.parseFromString(responseText, 'text/html');
					var info = mapAjaxResponse(request, response);

					successCallback(request, info);
				}
			});
		};

		self.getUrl = function (request) {
			var p = [];

			p.push(request.return === null ? 'oneway' : 'roundtrip');
			p.push(request.origin.toLowerCase());
			p.push(request.destination.toLowerCase());
			p.push(request.departure.toDateFormat('yyyy-MM-dd'));
			if (request.return !== null)
				p.push(request.return.toDateFormat('yyyy-MM-dd'));

			p.push(request.adults);
			p.push(request.children);
			p.push(request.infants);

			var pp = [];

			pp.push('affiliate=' + AFFILIATED_ID);
			pp.push('aid=lomadee');
			pp.push('utm_source=RDA');
			pp.push('utm_medium=cpa');
			pp.push('utm_campaign=' + AFFILIATED_ID);
			pp.push('mktdata=c%3D' + AFFILIATED_ID);

			return PUBLIC_BASE_URL + p.join('/') + '?' + pp.join('&');
		};

		// private methods
		var getServiceUrl = function (request) {
			var p = [];

			p.push(request.return === null ? 'oneway' : 'roundtrip');
			p.push(request.origin.toLowerCase());
			p.push(request.destination.toLowerCase());
			p.push(request.departure.toDateFormat('dd-MM-yyyy'));

			if (request.return !== null)
				p.push(request.return.toDateFormat('dd-MM-yyyy'));
			else
				p.push(request.departure.toDateFormat('dd-MM-yyyy'));

			p.push(request.adults);
			p.push(request.children);
			p.push(request.infants);
			p.push('i1'); // i1 is the first page of results (lowest prices), i2 the second, ...

			return SERVICE_BASE_URL + p.join('/') + '?order_by=price&order_type=asc&currency_code=BRL';
			// http://m.decolar.com/mobile-flights-web/results/roundtrip/RIO/GRU/31-12-2015/01-01-2016/1/0/0/i1?order_by=price&order_type=asc&currency_code=BRL
		};

		var mapAjaxResponse = function (request, response) {
			var info = self.parent.returnDefault();
			var byCompany = {};

			$('.result > .flight', response).each(function () {
				var airline = $(this).find('.airlineName').text().trim();
				var price = $(this).find('.price').text().trim().replace('.', '');
				var stops = {};

				$(this).find('.flightDetail').each(function () {
					var stop = 2;
					if ($(this).find('span:contains("2 escalas")').length > 0) stop = 2;
					else if ($(this).find('span:contains("1 escala")').length > 0) stop = 1;
					else if ($(this).find('span:contains("Direto")').length > 0) stop = 0;

					stops[stop] = true;
				});

				stops = Object.keys(stops);
				for (var i = 0; i < stops.length; i++) {
					if (!byCompany[airline]) byCompany[airline] = self.parent.pricesDefault();
					byCompany[airline][stops[i]] = self.parent.getMinPrice(byCompany[airline][stops[i]], price);

					info.prices[stops[i]] = self.parent.getMinPrice(info.prices[stops[i]], price);
				}
			});

			self.parent.setAirlinePrices(info, byCompany);

			return info;
		};

		return self;
	}

	Decolar.prototype = new RequestManager('Decolar', 'Decolar', 1500, 5, 2);
	Decolar.prototype.constructor = Decolar;
	Decolar.prototype.parent = RequestManager.prototype;

	new Decolar();
})(window.RequestManager);
