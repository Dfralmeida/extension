(function (RequestManager, airportsById, airlinesByCode, APP_NAME) {
	'use strict';

	function SkyScanner() {
		var self = this;
		self.parent.push.call(self);

		var SERVICE_BASE_URL = 'http://www.skyscanner.com.br/dataservices/routedate/v2.0/',
			PUBLIC_BASE_URL = 'http://www.skyscanner.com.br/transporte/passagens-aereas/';

		//public methods
		self.sendRequest = function (request, successCallback, failCallback, time) {
			self.parent.sendRequest({
				request: request,
				method: isSessionSet(request) ? 'GET' : 'POST',
				url: getServiceUrl(request),
				headers: {
					'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
				},
				time: time,
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					var response = !!responseText ? JSON.parse(responseText) : {};
					
					if (isSessionSet(response))
						request.SessionKey = response.SessionKey;

					request.info = mapAjaxResponse(request, response);
					
					if (isIncomplete(response) && !self.parent.checkGiveUp(request))
						throw 'Not ready yet. Try again later';

					successCallback(request, request.info);
				},
				formData: getFormData(request)
			});
		};

		self.getUrl = function (request) {
			var p = [];

			p.push(request.origin.toLowerCase());
			p.push(request.destination.toLowerCase());
			p.push(request.departure.toDateFormat('yyMMdd'));
			if (request.return !== null)
				p.push(request.return.toDateFormat('yyMMdd'));

			p.push('tarifas-aereas.html');

			var pp = [];
			pp.push('adults=' + request.adults);
			pp.push('children=' + request.children);
			pp.push('infants=' + request.infants);
			pp.push('cabinclass=economy');
			pp.push('preferdirects=false');
			pp.push('outboundaltsenabled=false');
			pp.push('inboundaltsenabled=true');
			pp.push('rtn=' + (request.return !== null ? 1 : 0));
			pp.push('utm_source=' + APP_NAME);

			return PUBLIC_BASE_URL + p.join('/') + '?' + pp.join('&');

			// http://www.skyscanner.com.br/transporte/passagens-aereas/ath/ista/150722/150725/tarifas-aereas-de-internacional-de-atenas-para-istambul-em-julho-2015.html?adults=1&children=0&infants=0&cabinclass=economy&preferdirects=false&outboundaltsenabled=false&inboundaltsenabled=true&rtn=1
		};

		// private methods
		var getServiceUrl = function (request) {
			return SERVICE_BASE_URL + (!isSessionSet(request) ? '' : request.SessionKey) + '?use204=true';
			// http://www.skyscanner.com.br/dataservices/routedate/v2.0/?use204=true
		};

		var getFormData = function (request) {
			if (isSessionSet(request)) return;

			var p = [];

			var originCode = request.origin;
			var origin = airportsById[request.origin];
			if (!!origin && !!origin.cityId)
				originCode = origin.cityId;

			var destinationCode = request.destination;
			var destination = airportsById[request.destination];
			if (!!destination && !!destination.cityId)
				destinationCode = destination.cityId;

			p.push('MergeCodeshares=false');
			p.push('SkipMixedAirport=false');
			p.push('OriginPlace=' + originCode);
			p.push('DestinationPlace=' + destinationCode);
			p.push('OutboundDate=' + request.departure.toDateFormat('yyyy-MM-dd'));
			p.push('InboundDate=' + (request.return !== null ? request.return.toDateFormat('yyyy-MM-dd') : ''));
			p.push('Passengers.Adults=' + request.adults);
			p.push('Passengers.Children=' + request.children);
			p.push('Passengers.Infants=' + request.infants);
			p.push('UserInfo.CountryId=BR');
			p.push('UserInfo.LocaleName=pt-BR');
			p.push('UserInfo.CurrencyId=BRL');
			p.push('CabinClass=Economy');
			p.push('UserInfo.ChannelId=transportfunnel');
			p.push('JourneyModes=flight');
			p.push('PriceForPassengerGroup=true');
			p.push('RequestId=' + generateUUID());

			return p.join('&');

			// MergeCodeshares=false&SkipMixedAirport=false&OriginPlace=HKG&DestinationPlace=CNX&OutboundDate=2016-01-20&InboundDate=&Passengers.Adults=1&Passengers.Children=0&Passengers.Infants=0&UserInfo.CountryId=BR&UserInfo.LocaleName=pt-BR&UserInfo.CurrencyId=BRL&CabinClass=Economy&UserInfo.ChannelId=transportfunnel&JourneyModes=flight&PriceForPassengerGroup=true&RequestId=f599a3f9-3795-4e48-930d-c1732b04a51b
		};

		var mapAjaxResponse = function (request, response) {
			var info = request.info || self.parent.returnDefault();
			var byCompany = {};

			if (!response || !response.Itineraries || response.Itineraries.length === 0)
				return info;

			var outboundLegsById = {},
				inboundLegsById = {},
				carriersById = {},
				quotesById = {},
				i;

			for (i = 0; i < (response.OutboundItineraryLegs || []).length; i++) {
				var outboundLeg = response.OutboundItineraryLegs[i];
				outboundLegsById[outboundLeg.Id] = outboundLeg;
			}

			for (i = 0; i < (response.InboundItineraryLegs || []).length; i++) {
				var inboundLeg = response.InboundItineraryLegs[i];
				inboundLegsById[inboundLeg.Id] = inboundLeg;
			}

			for (i = 0; i < (response.Carriers || []).length; i++) {
				var carrier = response.Carriers[i];
				carriersById[carrier.Id] = carrier;
			}

			for (i = 0; i < (response.Quotes || []).length; i++) {
				var quote = response.Quotes[i];
				quotesById[quote.Id] = quote;
			}

			for (i = 0; i < response.Itineraries.length; i++) {
				var itinerary = response.Itineraries[i];

				var outboundLeg = outboundLegsById[itinerary.OutboundLegId];
				if (!outboundLeg || !outboundLeg.OperatingCarrierIds ||
					outboundLeg.OperatingCarrierIds.length === 0) continue;

				var carrierId = outboundLeg.OperatingCarrierIds[0];
				var carrier = carriersById[carrierId];
				if (!carrier) continue;

				var airline = carrier.Name;
				if (!!carrier.DisplayCode) {
					var airlineObj = airlinesByCode[carrier.DisplayCode];
					if (!!airlineObj)
						airline = airlineObj.text;
				}

				var inboundStops = 0;
				var inboundLeg = inboundLegsById[itinerary.InboundLegId];
				if (!!inboundLeg)
					inboundStops = inboundLeg.StopsCount;

				if (!itinerary.PricingOptions || itinerary.PricingOptions.length === 0) continue;

				var quoteIds = itinerary.PricingOptions[0].QuoteIds;
				if (!quoteIds || quoteIds.length === 0) continue;

				var price = 0;
				for (var j = 0; j < quoteIds.length; j++) {
					var quoteId = quoteIds[j];
					var quote = quotesById[quoteId];
					if (!quote) continue;

					price += quote.Price || 0;
				}

				var stops = Math.max(outboundLeg.StopsCount, inboundStops);
				stops = Math.min(Math.max(stops, 0), 2);

				if (!byCompany[airline]) byCompany[airline] = self.parent.pricesDefault();
				byCompany[airline][stops] = self.parent.getMinPrice(byCompany[airline][stops], price);

				info.prices[stops] = self.parent.getMinPrice(info.prices[stops], price);
			}

			self.parent.setAirlinePrices(info, byCompany);

			return info;
		};

		var isSessionSet = function (data) {
			return !!data && !!data.SessionKey;
		};

		var isIncomplete = function (response) {
			if (!response || !response.QuoteRequests || response.QuoteRequests.length === 0)
				return true;
			
			for (var i = 0; i < response.QuoteRequests.length; i++)
				if (response.QuoteRequests[i].HasLiveUpdateInProgress)
					return true;

			return false;
		};

		// see more on http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript/8809472#8809472
		function generateUUID() {
			var d = new Date().getTime();
			var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
				var r = (d + Math.random() * 16) % 16 | 0;
				d = Math.floor(d / 16);
				return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
			});
			return uuid;
		};

		return self;
	}

	SkyScanner.prototype = new RequestManager('Skyscanner', 'Skyscanner', 2000, 4, 3);
	SkyScanner.prototype.constructor = SkyScanner;
	SkyScanner.prototype.parent = RequestManager.prototype;

	new SkyScanner();
})(window.RequestManager, window.airportsById, window.airlinesByCode, window.APP_NAME);