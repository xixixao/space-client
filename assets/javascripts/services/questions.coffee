define ['services/services', 'vendor/angularResource'], (services) ->

  services.factory 'questions', ['$resource', ($resource) ->

    $resource('/api/questions')

  ]