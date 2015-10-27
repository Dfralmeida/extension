(function (RequestManager, airportsById, APP_NAME) {
	'use strict';

	function Viajanet() {
		var self = this;
		self.parent.push.call(self);

		var SERVICE_BASE_URL = 'http://passagens-aereas2.viajanet.com.br/s/resources/api/',
			PUBLIC_BASE_URL = 'http://passagens-aereas2.viajanet.com.br/s/voos-resultados/#/';

		// public methods
		self.sendRequest = function (request, successCallback, failCallback, time) {
			self.parent.sendRequest({
				request: request,
				url: getServiceUrl(request),
				headers: {
					'Content-type': 'application/json'
				},
				time: time,
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					var response = !!responseText ? JSON.parse(responseText) : {};
					
					if (isSessionSet(response)) {
						request.SearchKey = response.SearchKey;
						request.SessionId = response.SessionId;
					}
					
					// if not completed, try again. Status === 1 implies completed
					// if it will give up, but there is some results, show it anyway
					if ((!response.Status || response.Status === 0) &&
						!(self.parent.checkGiveUp(request) && response.PriceMatrix !== undefined))
						throw 'Not ready yet. Try again later';

					var info = mapAjaxResponse(request, response);

					successCallback(request, info);
				},
				formData: getFormData(request)
			});
		};

		self.getUrl = function (request) {
			var p = [];

			p.push(request.origin);
			p.push(request.destination);
			p.push(request.return === null ? 'OW' : 'RT');
			p.push(request.departure.toDateFormat('dd-MM-yyyy'));
			if (request.return !== null)
				p.push(request.return.toDateFormat('dd-MM-yyyy'));

			p.push('-'); // departure hour: '0-6', '6-12', '12-18', '18-24'
			if (request.return !== null)
				p.push('-'); // return hour

			p.push('-'); // '-' for all classes, '0' for first, '1' for business, '2' for economy

			p.push(request.adults);
			p.push(request.children);
			p.push(request.infants);

			p.push('-'); // only direct flights: 'NS'
			p.push('-'); // ?
			
			var pp = [];
			
			pp.push('utm_source=' + APP_NAME);
			pp.push('utm_medium=metasearch');
			pp.push('utm_content=' + request.origin + '-' + request.destination);
			
			var brazil = airportsById['SAO'].country;
			var isInternational = airportsById[request.origin].country !== brazil ||
				airportsById[request.destination].country !== brazil;
			pp.push('utm_campaign=passagens+' + (isInternational ? 'internacionais' : 'nacionais'));

			return PUBLIC_BASE_URL + p.join('/') + '/others/' + pp.join('&');
			//http://passagens-aereas2.viajanet.com.br/s/voos-resultados#/RIO/SAO/OW/01-12-2015/-/-/1/0/0/-/-
			//http://passagens-aereas2.viajanet.com.br/s/voos-resultados#/RIO/CDG/RT/01-12-2015/01-02-2016/-/-/-/1/0/0/-/-
		};

		// private methods
		var getServiceUrl = function (request) {
			return SERVICE_BASE_URL + (!isSessionSet(request) ? 'AvailabilityAsync' : 'AvailabilityStatusAsync');
		};

		var getFormData = function (request) {
			var arrivalDate = request.return;
			if (request.return === null) {
				var nextDayDeparture = new Date(request.departure);
				nextDayDeparture.setDate(nextDayDeparture.getDate() + 1);
				
				arrivalDate = new Date(nextDayDeparture);
			}
			
			var formData = {
				Partner: {
					Token: 'p0C6ezcSU8rS54+24+zypDumW+ZrLkekJQw76JKJVzWUSUeGHzltXDhUfEntPPLFLR3vJpP7u5CZZYauiwhshw==',
					Key: '582dF5FX9zoByzHmtTuby0rqjOc=',
					Id: '52',
					ConsolidatorSystemAccountId: '80',
					TravelAgencySystemAccountId: '80',
					Name: 'B2C'
				},
				Air: [{
					Arrival: {
						Iata: request.destination,
						Date: arrivalDate.toDateFormat('yyyy-MM-dd') + 'T14:00:00.000Z'
					},
					Departure: {
						Iata: request.origin,
						Date: request.departure.toDateFormat('yyyy-MM-dd') + 'T14:00:00.000Z'
					},
					OutBoundTime: '0',
					InBoundTime: '0',
					CiaCodeList: []
				}],
				IsRoundTrip: request.return !== null,
				Pax: {
					adt: request.adults,
					chd: request.children,
					inf: request.infants
				},
				BookingClass: -1,
				Stops: -1,
				DisplayTotalAmount: false,
				GetDeepLink: false,
				GetPriceMatrixOnly: true,
				PageLength: '10',
				PageNumber: 2
			};
			
			if (isSessionSet(request)) {
				formData.SearchKey = request.SearchKey;
				formData.SessionId = request.SessionId;
			}
			
			return JSON.stringify(formData);
		};

		var mapAjaxResponse = function (request, response) {
			var info = self.parent.returnDefault();
			var byCompany = {};

			for (var i = 0; i < response.PriceMatrix.AirCompanies.length; i++) {
				var aircompany = response.PriceMatrix.AirCompanies[i];
				var airline = aircompany.AirCompany;
				var airlineCode = aircompany.CiaCode;

				for (var j = 0; j < aircompany.Cells.length; j++) {
					var cell = aircompany.Cells[j];

					var stops = Math.min(Math.max(cell.Stops, 0), 2);
					var price = cell.Price;

					if (!byCompany[airline]) byCompany[airline] = self.parent.pricesDefault();
					byCompany[airline][stops] = self.parent.getMinPrice(byCompany[airline][stops], price);

					info.prices[stops] = self.parent.getMinPrice(info.prices[stops], price);
				}
			}

			self.parent.setAirlinePrices(info, byCompany);

			return info;
		};
		
		var isSessionSet = function (data) {
			return !!data.SearchKey && !!data.SessionId;
		};

		return self;
	}

	Viajanet.prototype = new RequestManager('Viajanet', 'Viajanet', 1000, 4, 1);
	Viajanet.prototype.constructor = Viajanet;
	Viajanet.prototype.parent = RequestManager.prototype;

	new Viajanet();
})(window.RequestManager, window.airportsById, window.APP_NAME);