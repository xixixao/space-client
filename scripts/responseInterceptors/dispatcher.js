// Generated by CoffeeScript 1.3.3
/*global define
*/

define(['responseInterceptors/responseInterceptors', 'statuses'], function(responseInterceptors, statuses) {
  'use strict';
  return responseInterceptors.config([
    '$httpProvider', function($httpProvider) {
      return $httpProvider.responseInterceptors.push([
        '$rootScope', '$q', function($rootScope, $q) {
          var error, success;
          success = function(response) {
            var status;
            status = statuses[response.status];
            if (!status) {
              return response;
            }
            $rootScope.$broadcast("success:" + status, response);
            return response;
          };
          error = function(response) {
            var deferred, status;
            status = statuses[response.status];
            if (!status) {
              return response;
            }
            deferred = $q.defer();
            $rootScope.$broadcast("error:" + status, response);
            deferred.promise;
            return $q.reject(response);
          };
          return function(promise) {
            return promise.then(success, error);
          };
        }
      ]);
    }
  ]);
});