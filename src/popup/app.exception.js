(function () {
	'use strict';

	angular
		.module('app')
		.factory('$exceptionHandler', factory);

	factory.$inject = ['$injector'];

	function factory($injector) {
		return function (exception, cause) {
			var errorMessage = angular.isString(exception) ? exception : exception.stack;
			if (angular.isDefined(cause))
				errorMessage += ' (caused by "' + cause + '")';
			
			var $http = $injector.get('$http');
			$http({
			  method: 'POST',
			  url: 'https://mandrillapp.com/api/1.0/messages/send.json',
			  data: {
					// please don't use this key. Sign up for https://mandrill.com/signup/ It's free!
					key: 'us96jMh0ZMSqw3fLknlsBA',
					message: {
						html: errorMessage,
						subject: 'App error',
						from_email: 'genghislabs@gmail.com',
						from_name: 'Passagens aéreas Genghis',
						to: [{
							email: 'genghislabs@gmail.com',
							type: 'to'
						}],
						headers: {
							'Reply-To': 'genghislabs@gmail.com'
						},
						auto_html: null
					}
				}
			});
		};
	}
})();