(function () {
    'use strict';

    angular
        .module('app')
        .config(config);

    config.$inject = ['$uibTooltipProvider', 'uibDatepickerConfig', '$mdThemingProvider'];

    function config($uibTooltipProvider, uibDatepickerConfig, $mdThemingProvider) {
        $uibTooltipProvider.options({
            trigger: 'mouseenter',
            placement: 'right',
            animation: false,
            popupDelay: 150,
            appendToBody: true
        });

        var today = new Date();
		var oneYearFromNow = today.setFullYear(today.getFullYear() + 1);
		
		angular.extend(uibDatepickerConfig, {
            showWeeks: false,
            minMode: 'day',
            maxMode: 'month',
            minDate: new Date(),
            maxDate: oneYearFromNow,
        });
		
		$mdThemingProvider.theme('default')
			.primaryPalette('light-blue', {
				'default': '800',
			})
			.accentPalette('grey');
    }
})();
