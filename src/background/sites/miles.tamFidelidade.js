(function (RequestManager, APP_NAME) {
	'use strict';

	function TamFidelidade() {
		var self = this;
		self.parent.push.call(self);

		const BASE_URL = 'http://book.tam.com.br/TAM/dyn/air/';

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

		// there is not a public url
		self.getUrl = function (request) {
			return BASE_URL + 'entry?WDS_DEST_PAGE=SEARCH&SITE=JJBKJJBK&LANGUAGE=BR&WDS_MARKET=BR&utm_source=' + APP_NAME;

			// http://book.tam.com.br/TAM/dyn/air/entry?WDS_DEST_PAGE=SEARCH&SITE=JJBKJJBK&LANGUAGE=BR&WDS_MARKET=BR
		};

		// private methods
		var getServiceUrl = function (request) {
			return BASE_URL + 'booking/upslDispatcher';

			// http://book.tam.com.br/TAM/dyn/air/booking/upslDispatcher
		};

		var getFormData = function (request) {
			var p = [];

			p.push('FROM_PAGE=SEARCH');
			p.push('SITE=JJRDJJRD');
			p.push('LANGUAGE=BR');
			p.push('SWITCH_TO_SSL=false');
			p.push('REFRESH=0');
			p.push('FORCE_OVERRIDE=TRUE');
			p.push('WDS_FORCE_SITE_UPDATE=TRUE');
			p.push('WDS_DISABLE_REDEMPTION=false');
			p.push('WDS_MARKET=BR');
			p.push('WDS_FORCE_SITE_UPDATE=TRUE');
			p.push('WDS_CORPORATE_SALES=FALSE');
			p.push('WDS_NAVIGATION_TAB=ONLINESEARCH');
			p.push('B_DATE_1=' + request.departure.toDateFormat('yyyyMMdd0000'));

			if (request.return !== null)
				p.push('B_DATE_2=' + request.return.toDateFormat('yyyyMMdd0000'));

			p.push('B_LOCATION_1=' + request.origin);
			p.push('E_LOCATION_1=' + request.destination);
			p.push('TRIP_TYPE=' + (request.return === null ? 'O' : 'R')); //O: oneway, R: roundtrip
			p.push('passenger_useMyPoints=true');
			p.push('search_from=' + airportsById[request.origin] ? airportsById[request.origin].text : request.origin);
			p.push('search_to=' + airportsById[request.destination] ? airportsById[request.destination].text : request.destination);
			p.push('search_outbound_date=' + request.departure.toDateFormat('dd/MM/yyyy'));
			p.push('MULTICITY_STATE=');
			p.push('MULTICITY_B_LOCATION_1=');
			p.push('MULTICITY_E_LOCATION_1=');
			p.push('MULTICITY_B_DATE_1=');
			p.push('MULTICITY_B_LOCATION_2=');
			p.push('MULTICITY_E_LOCATION_2=');
			p.push('MULTICITY_B_DATE_2=');
			p.push('MULTICITY_B_LOCATION_3=');
			p.push('MULTICITY_E_LOCATION_3=');
			p.push('MULTICITY_B_DATE_3=');
			p.push('MULTICITY_B_LOCATION_4=');
			p.push('MULTICITY_E_LOCATION_4=');
			p.push('MULTICITY_B_DATE_4=');
			p.push('adults=' + request.adults);
			p.push('children=' + request.children);
			p.push('infants=' + request.infants);
			p.push('COMMERCIAL_FARE_FAMILY_1=' + getCommercialFareFamily(request));
			p.push('CORPORATE_CODE_INPUT=');
			p.push('SEARCH_COOKIE=' + JSON.stringify({
				bounds: [
                null, null, null, null, null, null, null, null, null, null,
					{
						bLocation: request.origin,
						eLocation: request.destination,
						bDate: request.departure.toDateFormat('yyyyMMdd0000')
                },
					(request.return === null ? null : {
						bDate: request.return.toDateFormat('yyyyMMdd0000')
					})
            ],
				roundtripCommon: {
					tripType: request.return === null ? 'O' : 'R',
					useMyPoints: 'true',
					adults: request.adults + '',
					children: request.children + '',
					infants: request.infants + '',
					cff: getCommercialFareFamily(request)
				}
			}));

			return p.join('&');

			// FROM_PAGE=SEARCH&SITE=JJRDJJRD&LANGUAGE=BR&SWITCH_TO_SSL=false&REFRESH=0&WDS_FORCE_SITE_UPDATE=TRUE&FORCE_OVERRIDE=TRUE&WDS_DISABLE_REDEMPTION=false&WDS_MARKET=BR&WDS_FORCE_SITE_UPDATE=TRUE&WDS_CORPORATE_SALES=FALSE&WDS_NAVIGATION_TAB=ONLINESEARCH&B_DATE_1=201507010000&B_LOCATION_1=FOR&E_LOCATION_1=RIO&TRIP_TYPE=O&passenger_useMyPoints=true&search_from=FOR&search_to=RIO&search_outbound_date=01/07/2015&MULTICITY_STATE=&MULTICITY_B_LOCATION_1=&MULTICITY_E_LOCATION_1=&MULTICITY_B_DATE_1=&MULTICITY_B_LOCATION_2=&MULTICITY_E_LOCATION_2=&MULTICITY_B_DATE_2=&MULTICITY_B_LOCATION_3=&MULTICITY_E_LOCATION_3=&MULTICITY_B_DATE_3=&MULTICITY_B_LOCATION_4=&MULTICITY_E_LOCATION_4=&MULTICITY_B_DATE_4=&adults=1&children=0&infants=0&COMMERCIAL_FARE_FAMILY_1=TAMAWFLX&CORPORATE_CODE_INPUT=&SEARCH_COOKIE={'bounds':[null,null,null,null,null,null,null,null,null,null,{'bLocation':'FOR','eLocation':'RIO','bDate':'201507010000'},null],'roundtripCommon':{'tripType':'O','useMyPoints':'true','adults':'1','children':'0','infants':'0','cff':'TAMAWFLX'}}
		};

		var mapAjaxResponse = function (request, response) {
			var isOneWay = request.return === null;

			var departurePrices = [0, 0, 0];
			var returnPrices = [0, 0, 0];
			var byCompany = {};

			// departure flights
			$('#outbound_list_flight tr.flight', response).each(function () {
				var stops = parseInt($(this).find('td:not(.th)').attr('rowspan') / 2) - 1;
				stops = Math.min(Math.max(stops, 0), 2); // must be between 0 and 2

				var price = 0;
				$(this).find('td').each(function () {
					// there are also data-cell-price-chd and data-cell-price-inf
					price = self.parent.getMinPrice(price, parseInt($(this).attr('data-cell-price-adt') || 0));
				});

				var airlineName = airlinesByCode[$(this).attr('data-airlinecode')];
				if (!airlineName)
					airlineName = airlinesByName[$(this).attr('data-airlinecompany')];

				if (airlineName) // found airline in internal list of airlines
					airlineName = airlineName.text;
				else
					airlineName = $(this).attr('data-airlinecompany');

				// if it's a round trip, show departure and return airlines separated
				var airline = isOneWay ? airlineName : airlineName + self.parent.departureLabel;

				if (!byCompany[airline]) byCompany[airline] = self.parent.pricesDefault();
				byCompany[airline][stops] = self.parent.getMinPrice(byCompany[airline][stops], price);

				departurePrices[stops] = self.parent.getMinPrice(departurePrices[stops], price);
			});

			if (!isOneWay) {
				// return flights
				$('#inbound_list_flight tr.flight', response).each(function () {
					var stops = parseInt($(this).find('td:not(.th)').attr('rowspan') / 2) - 1;
					stops = Math.min(Math.max(stops, 0), 2); //must be between 0 and 2
					var price = 0;
					$(this).find('td').each(function () {
						// there are also data-cell-price-chd and data-cell-price-inf
						price = self.parent.getMinPrice(price, parseInt($(this).attr('data-cell-price-adt') || 0));
					});

					var airlineName = airlinesByCode[$(this).attr('data-airlinecode')];
					if (!airlineName)
						airlineName = airlinesByName[$(this).attr('data-airlinecompany')];

					if (airlineName) // found airline in internal list of airlines
						airlineName = airlineName.text;
					else
						airlineName = $(this).attr('data-airlinecompany');

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

		var getCommercialFareFamily = function (request) {
			var defaultCountry = airportsById['SAO'] ? airportsById['SAO'].country : 'Brasil';
			var countryOrigin = airportsById[request.origin] ? airportsById[request.origin].country : defaultCountry;
			var countryDestination = airportsById[request.destination] ? airportsById[request.destination].country : defaultCountry;

			return countryOrigin !== defaultCountry || countryDestination !== defaultCountry ? 'TAMAW3' : 'TAMAWFLX';
		};

		return self;
	}

	TamFidelidade.prototype = new RequestManager('TamFidelidade', 'Multiplus - Milhas Tam', 2000, 5, 6);
	TamFidelidade.prototype.constructor = TamFidelidade;
	TamFidelidade.prototype.parent = RequestManager.prototype;

	new TamFidelidade();
})(window.RequestManager, window.APP_NAME);
