(function (RequestManager, APP_NAME) {
	'use strict';

	function SubmarinoViagens() {
		var self = this;
		self.parent.push.call(self);

		const SERVICE_BASE_URL = 'https://www.submarinoviagens.com.br/ibe/common/',
			PUBLIC_BASE_URL = 'https://www.submarinoviagens.com.br/passagens/selecionarvoo/',
			AFFILIATED_ID = 842;

		var updateTime = null,
			conversationId = null,
			sessionId = null;

		// public methods
		self.sendRequest = function (request, successCallback, failCallback, time) {
			if (Date.now() - (updateTime || 0) > 15 * 60 * 1000 /* 15 minutes */ || !sessionId || sessionId === '') {
				createSession(request, successCallback, failCallback, time);
				return;
			}

			self.parent.sendRequest({
				request: request,
				url: SERVICE_BASE_URL + 'processSearchForm.do?ConversationID=' + conversationId,
				withCredentials: true,
				headers: {
					'Content-type': 'application/json;charset=UTF-8',
					userAgent: navigator.userAgent
				},
				time: time,
				successCallback: successCallback,
				failCallback: function () {
					// reset local variables on fail to create a new session
					updateTime = null;
					conversationId = null;
					sessionId = null;

					failCallback.apply(this, arguments);
				},
				callback: function (responseText) {
					var response = JSON.parse(responseText);
					var info = mapAjaxResponse(request, response);

					successCallback(request, info);
				},
				formData: getFormData(request)
			});
		};

		self.getUrl = function (request, removeSource) {
			var p = [];

			p.push(request.origin);
			p.push(request.destination);
			p.push(request.return === null ? 'oneway' : 'roundtrip');
			p.push(request.departure.toDateFormat('d-M-yyyy'));

			if (request.return !== null)
				p.push(request.return.toDateFormat('d-M-yyyy'));

			p.push(request.adults);
			p.push(request.children);
			p.push(request.infants);

			var pp = [];

			pp.push('AffiliatedID=' + AFFILIATED_ID);
			pp.push('utm_source=' + APP_NAME);
			pp.push('utm_medium=LINK');
			pp.push('utm_campaign=home_081113');
			pp.push('s_cid=rise_LINK_081113');
			pp.push('utm_content=' + APP_NAME);
			pp.push('a_aid=' + APP_NAME);

			var url = PUBLIC_BASE_URL + p.join('/');
			return removeSource ? url : (url + '?' + pp.join('&'));
		};

		// private methods
		var getFormData = function (request) {
			return JSON.stringify({
				SearchType: 'F',
				method: 'post',
				name: 'plan_trip',
				action: '/common/processSearchForm.do',
				PageInfo: {
					Language: 'pt',
					Locale: 'BR',
					FromServicing: 'false',
					ConversationID: conversationId,
					SessionID: sessionId,
					Brand: 'SUB',
					Username: '',
					ReadOnly: 'false',
					skin: 'legacy',
					SessionSource: 'Browse-IBE',
					POS: {
						CompanyCode: 'ibe'
					},
					CurrencyInfo: {
						CurrencyCode: 'BRL',
						SecondaryCurrencyCode: 'USD'
					}
				},
				FlightSearch: {
					Location: {
						OriginInput: {
							type: 'location',
							name: 'Search/OriginDestinationInformation/Origin/location',
							value: request.origin,
							display: '',
							parameters: '&searchableOnly=false&locationType=airport',
							readonly: 'false'
						},
						DestinationInput: {
							type: 'location',
							name: 'Search/OriginDestinationInformation/Destination/location',
							value: request.destination,
							display: '',
							parameters: '&searchableOnly=false&locationType=airport',
							readonly: 'false'
						}
					},
					Calendar: {
						DepartDateInput: {
							type: 'calendar',
							name: 'Search/DateInformation/departDate',
							value: request.departure.toDateFormat('yyyy-MM-dd')
						},
						DepartTimeInput: {
							type: 'clock',
							name: 'Search/AirDepartTime',
							value: 'Any'
						},
						ReturnDateInput: {
							type: 'calendar',
							name: 'Search/DateInformation/returnDate',
							value: (request.return || new Date()).toDateFormat('yyyy-MM-dd')
						},
						ReturnTimeInput: {
							type: 'clock',
							name: 'Search/AirReturnTime',
							value: 'Any'
						}
					},
					Passengers: {
						AdultsInput: {
							type: 'number',
							name: 'Search/Passengers/adults',
							value: request.adults
						},
						ChildrenInput: {
							type: 'number',
							name: 'Search/Passengers/children',
							value: request.children
						},
						InfantsInput: {
							type: 'number',
							name: 'Search/Passengers/infants',
							value: request.infants
						}
					},
					FlightTypeInput: {
						type: 'list',
						name: 'Search/flightType',
						value: request.return === null ? 'oneway' : 'return',
						option: [
							{
								value: 'oneway'
                        	},
							{
								value: 'return'
                        	},
							{
								value: 'multicity'
                        	}
                   		]
					},
					AirlineModeInput: {
						type: 'fixed',
						name: 'Search/AirlineMode',
						value: 'false'
					},
					SearchTypeValidatorInput: {
						type: 'fixed',
						name: 'searchTypeValidator',
						value: 'F'
					},
					CalendarSearchInput: {
						type: 'boolean',
						name: 'Search/calendarSearch',
						value: 'true'
					},
					CalendarSearchedInput: {
						type: 'fixed',
						name: 'Search/calendarSearched',
						value: 'false'
					},
					MoreOptionsInput: {
						type: 'boolean',
						name: 'Search/moreOptions',
						value: 'false'
					},
					AdditionalOptions: {
						SeatClassInput: {
							type: 'list',
							name: 'Search/seatClass'
						},
						AirlinePrefInput: {
							type: 'list',
							name: 'Search/airlinePrefs/airlinePref',
							multiple: 'multiple',
							value: ''
						},
						AirDirectOnlyInput: {
							type: 'boolean',
							name: 'Search/AirDirectOnly',
							value: '0'
						},
						RestrictionTypeInput: {
							type: 'list',
							name: 'Search/restrictionType',
							value: 'Restricted',
							option: [
								{
									value: 'Restricted',
									selected: 'selected'
                            	},
								{
									value: 'FullyFlexible'
								}
						   ]
						}
					}
				},
				_TimeStamp: Date.now(),
				//immutable
				Restrictions: {
					MaxChildren: '5',
					ViewOnly: 'false',
					AdultLimit: 'ibe',
					PostBookingDeeplink: 'false',
					HomePage: 'true',
					MaxNumLegs: '6'
				},
				SearchTypeInput: {
					type: 'fixed',
					name: 'Search/searchType',
					value: 'F'
				},
				XSellModeInput: {
					type: 'fixed',
					name: 'xSellMode',
					value: 'false'
				},
				MetaSearch: {
					type: 'fixed',
					name: 'MetaSearch',
					value: 'N'
				},
				MetaSearchName: {
					type: 'fixed',
					name: 'MetaSearchName',
					value: '842'
				},
				DropOffLocationRequiredInput: {
					type: 'fixed',
					name: 'dropOffLocationRequired',
					value: 'false'
				}
			});
		};

		var getFormDataHomeRedirect = function () {
			return JSON.stringify({
				name: 'CreateSessionForm',
				method: 'post',
				action: '/common/homeRedirect.do',
				RedirectedInput: {
					type: 'fixed',
					name: 'redirected',
					value: 'true'
				},
				CreateSessionInput: {
					type: 'fixed',
					name: 'createSession',
					value: 'true'
				},
				TestModeInput: {
					type: 'fixed',
					name: 'testMode',
					value: 'A'
				},
				BrandInput: {
					type: 'fixed',
					name: 'brand',
					value: 'SUB'
				},
				LanguageInput: {
					type: 'fixed',
					name: 'language',
					value: 'pt'
				},
				UsernameInput: {
					type: 'fixed',
					name: 'username',
					value: ''
				}
			});
		};

		var mapAjaxResponse = function (request, response) {
			var info = self.parent.returnDefault();
			sessionId = response.FlightSearchResults.PageInfo.SessionID;

			// using index 0 as we're not doing multiple flights yet
			for (var i in response.FlightSearchResults.Flights[0].Flight) {
				var flight = response.FlightSearchResults.Flights[0].Flight[i];
				var price = flight.Price.Base.Amount; // to see price with taxes (flight.Prices.Total.Amount)

				var stops = 0;
				for (var j in flight.FlightDetails) {
					stops = Math.max(stops, flight.FlightDetails[j].Summary.NumStopOvers || 0);
				}

				stops = Math.min(Math.max(stops, 0), 2); // must be between 0 and 2

				info.prices[stops] = self.parent.getMinPrice(info.prices[stops], price);
			}

			var byCompany = {};
			var priceSummary = response.FlightSearchResults.PriceSummary.Airline;
			for (var i = 0; i < priceSummary.length; i++) {
				var airCompany = priceSummary[i];
				var airline = airlinesByCode[airCompany.Code].text;
				if (!airline) {
					var airlineSameCode = response.FlightSearchResults.FlightFilterForm.AirCompanies.AirCompanyInput.filter(function (c) {
						return c.value === airCompany.Code
					});

					if (!airlineSameCode || airlineSameCode.length === 0) {
						airline = airCompany.Code;
					} else {
						airline = airlineSameCode[0].display;
					}
				}

				for (var j = 0; j < airCompany.Stop.length; j++) {
					var stopObj = airCompany.Stop[j];
					var stops = stopObj.NumStops;

					var price = 0;
					if (stopObj.Price && stopObj.Price.Amount)
						price = stopObj.Price.Amount; // prices with taxes

					if (!byCompany[airline]) byCompany[airline] = self.parent.pricesDefault();
					byCompany[airline][stops] = self.parent.getMinPrice(byCompany[airline][stops], price);
				}
			}

			self.parent.setAirlinePrices(info, byCompany);

			return info;
		};

		var createSession = function (request, successCallback, failCallback, time) {
			var maxWaiting = self.maxWaiting; // save maxWaiting to reset after getting a session
			self.maxWaiting = 1; // hold the other requests until get a session

			// request public url
			self.parent.sendRequest({
				request: request,
				url: self.getUrl(request, true),
				withCredentials: true,
				headers: {
					'Content-type': 'text/html; charset=utf-8',
					userAgent: navigator.userAgent
				},
				time: time,
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					// request splash url
					createSessionStep2(request, successCallback, failCallback, time, maxWaiting);
				},
				formData: null
			});
		};

		var createSessionStep2 = function (request, successCallback, failCallback, time, maxWaiting) {
			self.parent.sendRequest({
				request: request,
				url: SERVICE_BASE_URL + 'splash.do',
				withCredentials: true,
				headers: {
					'Content-type': 'text/html;charset=ISO-8859-1',
					userAgent: navigator.userAgent
				},
				time: time,
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					var response = JSON.parse(responseText);
					if (!sessionId || sessionId === '') {
						sessionId = response.SplashPage.PageInfo.SessionID;
						updateTime = Date.now();
					}

					conversationId = response.SplashPage.PageInfo.ConversationID;

					// request home redirect url with conversationId
					createSessionStep3(request, successCallback, failCallback, time, maxWaiting);
				},
				formData: null
			});
		};

		var createSessionStep3 = function (request, successCallback, failCallback, time, maxWaiting) {
			self.parent.sendRequest({
				request: request,
				url: SERVICE_BASE_URL + 'homeRedirect.do?ConversationID=' + conversationId,
				withCredentials: true,
				headers: {
					'Content-type': 'text/json;charset=UTF-8',
					userAgent: navigator.userAgent
				},
				time: time,
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					var response = JSON.parse(responseText);
					if (!sessionId || sessionId === '') {
						sessionId = response.HomePage.PageInfo.SessionID;
						updateTime = Date.now();
					}

					conversationId = response.HomePage.PageInfo.ConversationID;

					self.maxWaiting = maxWaiting;

					// finally session created. send final request
					self.sendRequest(request, successCallback, failCallback, time);
				},
				formData: getFormDataHomeRedirect()
			});
		};

		return self;
	}

	// unfortunately we can only request once per session
	// TODO: see if it's possible to manage multiple sessions
	SubmarinoViagens.prototype = new RequestManager('SubmarinoViagens', 'Submarino Viagens', 1000, 1, 4);
	SubmarinoViagens.prototype.constructor = SubmarinoViagens;
	SubmarinoViagens.prototype.parent = RequestManager.prototype;

	new SubmarinoViagens();
})(window.RequestManager, window.APP_NAME);
