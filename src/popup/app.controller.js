(function () {
	'use strict';

	angular
		.module('app')
		.controller('Controller', Controller);

	Controller.$inject = ['$scope', '$timeout', '$filter', 'i18nService',
						  'constants', 'uiGridConstants', 'uiGridGroupingConstants'];

	function Controller($scope, $timeout, $filter, i18nService, c, gridConst, gridGroupConst) {
		var vm = this;

		vm.model = {
			origins: [],
			destinations: [],
			departures: [],
			returns: [],
			qtyDays: [],
			site: null,
			email: null,
			priceEmail: null,
			adults: 1,
			children: 0,
			infants: 0
		};

		vm.showForm = true;
		vm.showQtyDays = false;
		vm.showReturns = false;
		vm.showSendEmailCheapFlights = false;
		vm.showPassengers = false;
		vm.messageError = '';
		vm.initialNumberOfFlights = 0;
		vm.days = [];
		vm.sites = [];

		vm.airports = [];
		vm.airportsById = [];
		vm.airlines = [];

		vm.start = start;
		vm.stop = stop;
		vm.deleteHistory = deleteHistory;
		vm.updateResults = updateResults;
		vm.updateForm = updateForm;

		activate();

		/////////////

		function activate() {
			var backgroundPage = getBackgroundPage(),
				bg = backgroundPage.BG,
				i;
				
			// if background is not loaded yet for some reason, we can do nothing
			if (!bg) return;
			
			bg.hideBadge();

			vm.airports = backgroundPage.airports;
			vm.airportsById = backgroundPage.airportsById;
			vm.airlines = backgroundPage.airlines;

			vm.days = [{
				id: -1,
				text: c.days.oneWay
            }, {
				id: 0,
				text: c.days.returnSameDay
            }, {
				id: 1,
				text: '1 ' + c.days.singular
            }];

			for (i = 2; i <= 120; i++) {
				vm.days.push({
					id: i,
					text: i + ' ' + c.days.plural
				});
			}
			
			vm.daysById = {};
			for (i = 0; i < vm.days.length; i++) {
				var day = vm.days[i];
				vm.daysById[day.id] = day;
			}

			vm.sites = bg.getSites();

			vm.savedSearches = bg.getRequests();
			if (vm.savedSearches && vm.savedSearches.length > 0) {
				var recentSearch = vm.savedSearches[0];

				// saved data from old version, different format, so clear all storage
				if (!recentSearch.site) // we had field store instead of site
					deleteHistory(bg);
				else
					updateForm(recentSearch);
			} else {
				updateForm();
			}

			setupUiGridLang();
			setupUiGrids();
			setupDatepickers();
			
			vm.initialNumberOfFlights = bg.getInitialNumberOfFlights() || 0;
			updateResults(bg.getResults());
		}

		function start() {
			var MAX_DATE_REQUESTS = 100;
			var model = buildServerModel();
			
			setMessageError(model);
			if (vm.messageError !== '') return;
			
			var bg = getBackgroundPage().BG;
			if (bg.getDateRequests(model).length > MAX_DATE_REQUESTS) {
				vm.messageError = c.messages.maxDateRequests.replace('MAX_DATE_REQUESTS', MAX_DATE_REQUESTS);
				return;
			}
			
			vm.showForm = false;
			vm.gridOptions.data = [];

			vm.initialNumberOfFlights = bg.initServer(model);
		}

		function stop(bg) {
			bg = bg || getBackgroundPage().BG;
			bg.stopServer();
		}

		function deleteHistory(bg) {
			bg = bg || getBackgroundPage().BG;
			bg.deleteHistory();

			stop(bg);
			updateForm();

			vm.savedSearches = [];
			vm.gridOptions.data = [];
			vm.initialNumberOfFlights = 0;
		}

		function updateResults(results) {
			if (!results || results.length === 0) return;

			var i, j, showReturnColumn = false;
			for (i = 0; i < results.length; i++) {
				var result = results[i];
				
				if (!!result.return)
					showReturnColumn = true;

				for (j = 0; j < result.byCompany.length; j++)
					result.byCompany[j].url = result.url;

				result.subGridOptions = {
					data: result.byCompany,
					columnDefs: vm.subGridOptions.columnDefs
				};
			}

			vm.gridOptions.data = results;
			
			var isReturnColumnVisible = vm.columnDefs[2].visible || vm.columnDefs[2].visible === undefined;
			if (showReturnColumn !== isReturnColumnVisible) {
				vm.columnDefs[2].visible = !isReturnColumnVisible;
				
				if (!!vm.gridApi && !!vm.gridApi.core)
					vm.gridApi.core.notifyDataChange(gridConst.dataChange.COLUMN);
			}
		}

		function updateForm(request) {
			request = request || {};
			if (typeof request === 'string')
				request = JSON.parse(request);

			var today = new Date().setHours(0, 0, 0, 0);
			vm.model = {
				origins: (request.origins || []).map(function (a) { 
					return vm.airportsById[a];
				}),
				destinations: (request.destinations || []).map(function (a) { 
					return vm.airportsById[a];
				}),
				departures: (request.departures || []).filter(function (d) {
					return d >= today;
				}),
				returns: (request.returns || []).filter(function (d) {
					return d >= today;
				}),
				qtyDays: (request.qtyDays || []).map(function (a) { 
					return vm.daysById[a];
				}),
				site: request.site || vm.sites[0].id,
				email: request.email || null,
				priceEmail: request.priceEmail || null,
				adults: request.adults || 1,
				children: request.children || 0,
				infants: request.infants || 0
			};

			$timeout(function () {
				vm.showQtyDays = vm.model.qtyDays.length > 0;
				vm.showReturns = !vm.showQtyDays && vm.model.returns.length > 0;
			}, 100);
			vm.showSendEmailCheapFlights = vm.model.email !== null && vm.model.priceEmail !== null;
			vm.showPassengers = vm.model.adults !== 1 || vm.model.children !== 0 || vm.model.infants !== 0;
		}
		
		function buildServerModel() {
			var model = angular.copy(vm.model);
			
			model.origins = model.origins.map(function (a) { return a.id; });
			model.destinations = model.destinations.map(function (a) { return a.id; });
			model.qtyDays = model.qtyDays.map(function (a) { return a.id; });
			
			return model;
		}

		function setMessageError(model) {
			vm.messageError = '';

			if (model.origins.length === 0)
				vm.messageError = c.messages.selectAtLeastOneOrigin;

			else if (model.destinations.length === 0)
				vm.messageError = c.messages.selectAtLeastOneDestination;

			else if (model.origins.length === 1 && model.destinations.length === 1 && model.origins[0] === model.destinations[0])
				vm.messageError = c.messages.sameOriginAndDestination;

			else if (model.departures.length === 0)
				vm.messageError = c.messages.selectAtLeastOneDeparture;

			else if (model.returns.length > 0 && Math.max.apply(null, model.returns) < Math.min.apply(null, model.departures))
				vm.messageError = c.messages.returnsBeforeDepartures;

			else if (model.adults == 0 && model.children == 0 && model.infants == 0)
				vm.messageError = c.messages.selectAtLeastOnePassenger;
		}

		function setupDatepickers() {
			$scope.$watchCollection('vm.model.departures', function (newVal, oldVal) {
				var today = new Date();
				var minDeparture = (newVal && newVal.length > 0) ? new Date(Math.min.apply(null, newVal)) : today;

				vm.initDateDeparture = minDeparture;

				if (vm.model.returns && vm.model.returns.length > 0) {
					if (!vm.initDateReturn) {
						vm.initDateReturn = new Date(Math.min.apply(null, vm.model.returns));
					}
				} else {
					var previousReturn = vm.initDateReturn || today;

					if (minDeparture.getFullYear() != previousReturn.getFullYear() ||
						minDeparture.getMonth() != previousReturn.getMonth()) {
						vm.initDateReturn = new Date(minDeparture.getFullYear(), minDeparture.getMonth(), 1);
					} else {
						vm.initDateReturn = previousReturn;
					}
				}

				if (vm.initDateReturn < today)
					vm.initDateReturn = today;
			});
		}

		function getBackgroundPage() {
			return chrome.extension.getBackgroundPage();
		}
		
		function setupUiGridLang() {
			var userLang = chrome.i18n.getUILanguage().toLowerCase();
			var availableLangs = i18nService.getAllLangs();

			var lang, regionLang;
			for (var i = 0; i < availableLangs.length; i++) {
				if (availableLangs[i] === userLang) {
					lang = userLang;
					break;
				}

				if (getRegion(availableLangs[i]) === getRegion(userLang)) {
					regionLang = availableLangs[i];
				}
			}

			lang = lang || regionLang || 'en';
			i18nService.setCurrentLang(lang);
		}

		// example: 'en_US' or 'en-GB' return 'en'
		function getRegion(lang) {
			return !lang ? '' : lang.split(/[_-]/)[0];
		}

		function setupUiGrids() {
			vm.columnDefs = [
				{
					name: 'key',
					field: 'key',
					type: 'string',
					displayName: c.grid.originDestination,
					headerTooltip: c.grid.originDestinationTooltip,
					width: '*',
					minWidth: 80,
					/*
					grouping: {
						groupPriority: 0
					},
					*/
					cellTooltip: true,
					cellTemplate: 'groupingTemplate.html',
					customTreeAggregationFinalizerFn: function (aggregation) {
						aggregation.rendered = aggregation.groupVal;
					},
					groupingShowAggregationMenu: false,
					enableHiding: false
				},
				{
					name: 'departure',
					field: 'departure',
					type: 'number',
					displayName: c.grid.departure,
					headerTooltip: c.grid.departureTooltip,
					width: '*',
					cellTooltip: true,
					cellTemplate: 'groupingTemplate.html',
					cellFilter: 'toDate',
					customTreeAggregationFinalizerFn: function (aggregation) {
						aggregation.rendered = aggregation.groupVal;
					},
					groupingShowAggregationMenu: false,
					enableHiding: false
				},
				{
					name: 'return',
					field: 'return',
					type: 'number',
					displayName: c.grid['return'],
					headerTooltip: c.grid.returnTooltip,
					width: '*',
					cellTooltip: true,
					cellTemplate: 'groupingTemplate.html',
					cellFilter: 'toDate',
					customTreeAggregationFinalizerFn: function (aggregation) {
						aggregation.rendered = aggregation.groupVal;
					},
					groupingShowAggregationMenu: false,
					enableHiding: true
				},
				{
					name: 'prices0',
					field: 'prices[0]',
					type: 'number',
					displayName: c.grid.nonStop,
					headerTooltip: c.grid.nonStopTooltip,
					width: '*',
					cellTooltip: true,
					cellFilter: 'toPrice:this',
					cellTemplate: 'priceTemplate.html',
					treeAggregationType: gridGroupConst.aggregation.MIN,
					customTreeAggregationFinalizerFn: function (aggregation) {
						aggregation.rendered = aggregation.value;
					},
					enableColumnMenu: false,
					enableHiding: true
				},
				{
					name: 'prices1',
					field: 'prices[1]',
					type: 'number',
					displayName: c.grid.oneStop,
					headerTooltip: c.grid.oneStopTooltip,
					width: '*',
					cellTooltip: true,
					cellFilter: 'toPrice:this',
					cellTemplate: 'priceTemplate.html',
					treeAggregationType: gridGroupConst.aggregation.MIN,
					customTreeAggregationFinalizerFn: function (aggregation) {
						aggregation.rendered = aggregation.value;
					},
					enableColumnMenu: false,
					enableHiding: true
				},
				{
					name: 'prices2',
					field: 'prices[2]',
					type: 'number',
					displayName: c.grid.twoStops,
					headerTooltip: c.grid.twoStopsTooltip,
					width: '*',
					cellTooltip: true,
					cellFilter: 'toPrice:this',
					cellTemplate: 'priceTemplate.html',
					treeAggregationType: gridGroupConst.aggregation.MIN,
					customTreeAggregationFinalizerFn: function (aggregation) {
						aggregation.rendered = aggregation.value;
					},
					enableColumnMenu: false,
					enableHiding: true
				}
			];
			
			vm.gridOptions = {
				data: [],
				enableFiltering: false,
				enableGroupHeaderSelection: true,
				enableGridMenu: true,
				treeRowHeaderAlwaysVisible: false,
				enableHorizontalScrollbar: gridConst.scrollbars.NEVER,
				horizontalScrollThreshold: 6,
				maxVisibleColumnCount: 10,
				minRowsToShow: 30,
				virtualizationThreshold: 30,
				// see more on: http://ui-grid.info/docs/#/tutorial/216_expandable_grid
				expandableRowTemplate: 'expandableRowTemplate.html',
				expandableRowHeight: 130,

				// see more on: http://ui-grid.info/docs/#/api/ui.grid.class:GridOptions.columnDef
				columnDefs: vm.columnDefs,

				//see more on: http://ui-grid.info/docs/#/api/ui.grid.exporter.api:GridOptions
				exporterCsvFilename: 'genghis.csv',
				//exporterCsvColumnSeparator: ';',
				exporterFieldCallback: function (grid, row, col, value) {
					switch (col.name) {
					case 'departure':
					case 'return':
						return $filter('toDate')(value);

					case 'prices0':
					case 'prices1':
					case 'prices2':
						return $filter('toPrice')(value);

					default:
						return value;
					}
				},
				exporterMenuPdf: false,
				exporterCsvLinkElement: angular.element(document.querySelectorAll(".custom-csv-link-location")),
				onRegisterApi: function (gridApi) {
					vm.gridApi = gridApi;
				}
			};

			vm.subGridOptions = {
				data: [],
				columnDefs: [
					{
						name: 'company',
						field: 'company',
						type: 'string',
						displayName: c.grid.company,
						headerTooltip: c.grid.companyTooltip,
						width: '*',
						cellTooltip: true,
						enableHiding: false
					},
					{
						name: 'prices0',
						field: 'prices[0]',
						type: 'number',
						displayName: c.grid.nonStop,
						headerTooltip: c.grid.nonStopTooltip,
						width: '*',
						cellTooltip: true,
						cellFilter: 'toPrice:this',
						cellTemplate: 'priceTemplate.html',
						enableColumnMenu: false
					},
					{
						name: 'prices1',
						field: 'prices[1]',
						type: 'number',
						displayName: c.grid.oneStop,
						headerTooltip: c.grid.oneStopTooltip,
						width: '*',
						cellTooltip: true,
						cellFilter: 'toPrice:this',
						cellTemplate: 'priceTemplate.html',
						enableColumnMenu: false
					},
					{
						name: 'prices2',
						field: 'prices[2]',
						type: 'number',
						displayName: c.grid.twoStops,
						headerTooltip: c.grid.twoStopsTooltip,
						width: '*',
						cellTooltip: true,
						cellFilter: 'toPrice:this',
						cellTemplate: 'priceTemplate.html',
						enableColumnMenu: false
					}
				]
			};
		}
	}
})();