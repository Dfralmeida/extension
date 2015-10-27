(function (RequestManager, airlinesByCode, APP_NAME) {
	'use strict';

	function Smiles() {
		var self = this;
		self.parent.push.call(self);

		var PUBLIC_BASE_URL = 'https://www.smiles.com.br/passagens-com-milhas';

		// public methods
		self.sendRequest = function (request, successCallback, failCallback) {
			// if there is a flight served by gol, request gol flights first and
			// then request partners flights according to response (hasCongenereFligts)
			// otherwise, request partners flights first and only
			sendRequest(request, successCallback, failCallback, !flightServedByGol(request));
		};

		self.getUrl = function (request) {
			var p = [];

			p.push('tripType=' + (request.return === null ? 2 : 1));
			p.push('originAirport=' + request.origin);
			p.push('destinationAirport=' + request.destination);
			p.push('departureDay=' + (request.departure / 1000));
			p.push('returnDay=' + (request.return / 1000));

			p.push('adults=' + request.adults);
			p.push('children=' + request.children);
			p.push('infants=' + request.infants);
			p.push('utm_source=' + APP_NAME);

			return PUBLIC_BASE_URL + '?' + p.join('&');

			// https://www.smiles.com.br/passagens-com-milhas?tripType=1&originAirport=RIO&destinationAirport=GRU&departureDay=1430708400&returnDay=1431313200&adults=01&children=0&infants=0
		};

		// private methods
		var sendRequest = function(request, successCallback, failCallback, forceCongenere) {
			self.parent.sendRequest({
				request: request,
				url: getServiceUrl(request, forceCongenere),
				headers: {
					'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
				},
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					var response = !!responseText ? JSON.parse(responseText) : {};
					
					request.info = mapAjaxResponse(request, response, successCallback);

					if (response.hasCongenereFligts && !forceCongenere)
						sendRequest(request, successCallback, failCallback, true);
					else
						successCallback(request, request.info);
				},
				formData: getFormData(request, forceCongenere)
			});
		};
		
		var getServiceUrl = function (request, forceCongenere) {
			var p = [];

			p.push('p_p_id=smilessearchflightsresultportlet_WAR_smilesflightsportlet');
			p.push('p_p_lifecycle=2');
			p.push('p_p_state=normal');
			p.push('p_p_mode=view');
			p.push('p_p_resource_id=getFlights');
			p.push('p_p_cacheability=cacheLevelPage');
			p.push('p_p_col_id=column-2');
			p.push('p_p_col_count=2');

			var publicUrl = self.getUrl(request);
			var pathUrl = publicUrl.replace('https://www.smiles.com.br', '').replace('utm_source=' + APP_NAME,'');
			p.push('_smilessearchflightsresultportlet_WAR_smilesflightsportlet_currentURL=' + encodeURIComponent(pathUrl));

			return PUBLIC_BASE_URL + '?' + p.join('&') + '?noCache=' + (new Date()).getTime();

			//https://www.smiles.com.br/passagens-com-milhas?p_p_id=smilessearchflightsresultportlet_WAR_smilesflightsportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=getFlights&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_count=2&_smilessearchflightsresultportlet_WAR_smilesflightsportlet_currentURL=%2Fpassagens-com-milhas%3FtripType%3D1%26originAirport%3DRIO%26destinationAirport%3DGRU%26departureDay%3D1430708400%26returnDay%3D1431313200%26adults%3D01%26children%3D0%26infants%3D0?noCache=1431313200
		};

		var getFormData = function (request, forceCongenere) {
			return '_smilessearchflightsresultportlet_WAR_smilesflightsportlet_JSONParameters=' + JSON.stringify({
				getAvailableRequest: {
					routes: [{
						tripType: request.return === null ? 'ONE_WAY' : 'ROUND_TRIP',
						origin: request.origin,
						destination: request.destination,
						originAirport: request.origin,
						destinationAirport: request.destination,
						departureDay: request.departure,
						returnDay: request.return || 0,
						departureDayFinal: null,
						returnDayFinal: null,
						adults: request.adults,
						infants: request.infants,
						children: request.children,
						role: null,
						currencyCode: 'BRL',
						memberNumber: null,
						memberChannel: null
                    }],
					forceCongenere: forceCongenere || false // forceCongenere == true implies partners flights
				}
			});

			// _smilessearchflightsresultportlet_WAR_smilesflightsportlet_JSONParameters={"getAvailableRequest":{"routes":[{"tripType":"ROUND_TRIP","origin":"RIO","destination":"FOR","originAirport":"RIO","destinationAirport":"FOR","departureDay":1449194400000,"returnDay":1449367200000,"departureDayFinal":null,"returnDayFinal":null,"adults":1,"infants":0,"children":0,"role":null,"currencyCode":"BRL","memberNumber":null,"memberChannel":null}],"forceCongenere":false}}
		};

		var mapAjaxResponse = function (request, response) {
			var info = request.info || self.parent.returnDefault();
			
			if (!response.legs) return info;
			
			var isOneWay = request.return === null;

			var departurePrices = [0, 0, 0];
			var returnPrices = [0, 0, 0];
			var byCompany = {};

			for (var i = 0; i < response.legs.length; i++) {
				var legFlights = response.legs[i].categoryFlights;

				for (var j = 0; j < legFlights.length; j++) {
					var flight = legFlights[j].flights[0];
					var price = flight.smilesCost[0].originalSmiles;

					if (flight.clubSmilesCost !== null && flight.clubSmilesCost.length > 0)
						price = flight.clubSmilesCost[0].originalSmiles;

					var stops = parseInt(flight.stops) || 0;
					stops = Math.min(Math.max(stops, 0), 2); // must be between 0 and 2

					var airline = 'Gol';
					if (!!flight.carrierCode) {
						var airlineObj = airlinesByCode[flight.carrierCode.toUpperCase()];
						if (!!airlineObj)
							airline = airlineObj.text;
					}
					
					// if it's a round trip, show departure and return prices separated
					if (!isOneWay)
						airline += (i === 0 ? self.parent.departureLabel : self.parent.returnLabel);

					if (!byCompany[airline]) byCompany[airline] = self.parent.pricesDefault();
					byCompany[airline][stops] = self.parent.getMinPrice(byCompany[airline][stops], price);

					if (i === 0) { // departure flights
						departurePrices[stops] = self.parent.getMinPrice(departurePrices[stops], price);
					} else { // it has response.legs.length to support multiple cities, but for now we only support round trip
						returnPrices[stops] = self.parent.getMinPrice(returnPrices[stops], price);
					}
				}
			}

			self.parent.setTotalPrices(info, departurePrices, returnPrices, isOneWay);
			self.parent.setAirlinePrices(info, byCompany);

			return info;
		};
		
		// see more on: http://www.voegol.com.br/pt-br/destinos/mapa-de-rotas/Paginas/default.aspx
		var servedAirports = [
			'ATM', 'AJU', 'AUA', 'ASU', 'BGI', 'JTC', 'BHZ', 'CNF', 'BEL', 'BVB', 'BSB', 'BUE', 'AEP', 'EZE', 'CLV', 'CPV', 'VCP', 'CGR', 'CCS', 'CKS', 'CXJ', 'XAP', 'CZS', 'CGB', 'CWB', 'COR', 'FEN', 'FLN', 'FOR', 'IGU', 'GYN', 'IOS', 'IMP', 'JOI', 'JPA', 'JDO', 'IZA', 'LDB', 'MCP', 'MCZ', 'MAO', 'MAB', 'MGF', 'MDZ', 'MIA', 'MOC', 'MVD', 'NAT', 'NVT', 'MCO', 'PMW', 'PBM', 'PNZ', 'POA', 'BPS', 'PVH', 'PPB', 'PUJ', 'REC', 'RAO', 'RBR', 'GIG', 'SDU', 'RIO', 'ROS', 'SSA', 'VVI', 'STM', 'SCL', 'SLZ', 'SAO', 'CGH', 'GRU', 'THE', 'TAB', 'UDI', 'VIX'
		];
		
		var flightServedByGol = function (request) {
			var isOriginServed = false,
				isDestinationServed = false;
			
			for (var i = 0; i < servedAirports.length; i++) {
				var servedAirport = servedAirports[i];
				
				if (servedAirport === request.origin) isOriginServed = true;
				if (servedAirport === request.destination) isDestinationServed = true;
				if (isOriginServed && isDestinationServed) return true;
			}
			
			return false;
		};

		return self;
	}

	Smiles.prototype = new RequestManager('Smiles', 'Smiles - Milhas Gol', 2000, 5, 5);
	Smiles.prototype.constructor = Smiles;
	Smiles.prototype.parent = RequestManager.prototype;

	new Smiles();
})(window.RequestManager, window.airlinesByCode, window.APP_NAME);
