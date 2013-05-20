define ['c/controllers'], (controllers) ->


  mutate = (ob, property, value) ->
    ob[property] = value
    ob

  colorize = (list) ->
    colors = ['3300ff', 'ff3300']
    mutate ob, 'color', i for ob, i in list


  controllers.controller 'phoneList', ['$scope', '$http', ($scope, $http) ->
    $http.get('files').success (data) ->
      $scope.phones = data.files
      $scope.phones = colorize $scope.phones

    $scope.orderProp = 'age'
  ]