(function () {
	'use strict';

	angular
		.module('app')
		.constant('constants', (function () {
			var get = chrome.i18n.getMessage;

			return {
				priceInfinity: Number.MAX_SAFE_INTEGER,
				labels: {
					extensionName: get('extensionName'),
					origins: get('labelOrigins'),
					destinations: get('labelDestinations'),
					departures: get('labelDepartures'),
					range: get('labelRange'),
					returns: get('labelReturns'),
					qtyDays: get('labelQtyDays'),
					site: get('labelSite'),
					history: get('labelHistory'),
					sendEmailCheapFlights: get('labelSendEmailCheapFlights'),
					changePassengers: get('labelChangePassengers'),
					email: get('labelEmail'),
					priceEmail: get('labelPriceEmail'),
					adults: get('labelAdults'),
					children: get('labelChildren'),
					infants: get('labelInfants'),
					start: get('labelStart'),
					stop: get('labelStop'),
					resetDates: get('labelResetDates'),
					tabOneWay: get('labelTabOneWay'),
					tabRoundTrip: get('labelTabRoundTrip'),
					tabQtyDays: get('labelTabQtyDays'),
				},
				placeholders: {
					origins: get('placeholderOrigins'),
					destinations: get('placeholderDestinations'),
					qtyDays: get('placeholderQtyDays'),
					site: get('placeholderSite'),
					history: get('placeholderHistory'),
					email: get('placeholderEmail'),
					priceEmail: get('placeholderPriceEmail'),
				},
				tooltips: {
					origins: get('tooltipOrigins'),
					destinations: get('tooltipDestinations'),
					departures: get('tooltipDepartures'),
					returns: get('tooltipReturns'),
					qtyDays: get('tooltipQtyDays'),
					site: get('tooltipSite'),
					history: get('tooltipHistory'),
					range: get('tooltipRange'),
					donation: get('tooltipDonation'),
					deleteHistory: get('tooltipDeleteHistory'),
					expandMore: get('tooltipExpandMore'),
					expandLess: get('tooltipExpandLess'),
					main: get('tooltipMain'),
					resetDates: get('tooltipResetDates'),
				},
				grid: {
					originDestination: get('gridOriginDestination'),
					originDestinationTooltip: get('gridOriginDestinationTooltip'),
					departure: get('gridDeparture'),
					departureTooltip: get('gridDepartureTooltip'),
					return: get('gridReturn'),
					returnTooltip: get('gridReturnTooltip'),
					nonStop: get('gridNonStop'),
					nonStopTooltip: get('gridNonStopTooltip'),
					oneStop: get('gridOneStop'),
					oneStopTooltip: get('gridOneStopTooltip'),
					twoStops: get('gridTwoStops'),
					twoStopsTooltip: get('gridTwoStopsTooltip'),
					company: get('gridCompany'),
					companyTooltip: get('gridCompanyTooltip'),
				},
				days: {
					oneWay: get('daysOneWay'),
					returnSameDay: get('daysReturnSameDay'),
					singular: get('daysSingular'),
					plural: get('daysPlural'),
				},
				messages: {
					sendEmailCheapFlights: get('messagesSendEmailCheapFlights'),
					selectAtLeastOneOrigin: get('messagesSelectAtLeastOneOrigin'),
					selectAtLeastOneDestination: get('messagesSelectAtLeastOneDestination'),
					sameOriginAndDestination: get('messagesSameOriginAndDestination'),
					selectAtLeastOneDeparture: get('messagesSelectAtLeastOneDeparture'),
					selectAtLeastOnePassenger: get('messagesSelectAtLeastOnePassenger'),
					searchFinished: get('messagesSearchFinished'),
					loadingSingular: get('messagesLoadingSingular'),
					loadingPlural: get('messagesLoadingPlural'),
					foundFlightsSingular: get('messagesFoundFlightsSingular'),
					foundFlightsPlural: get('messagesFoundFlightsPlural'),
					returnsBeforeDepartures: get('messagesReturnsBeforeDepartures'),
					maxDateRequests: get('messagesMaxDateRequests'),
				}
			};
		})());
})();