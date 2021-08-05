angular.module('todoApp', ['angularMoment'])
  .run(function(amMoment) {
    amMoment.changeLocale('de');
});

angular.module('todoApp', ['angularMoment'])
  .controller('coopCtrl', ['$scope', '$http', 'moment', function($scope, $http, moment) {


    $scope.coopStatus = {};
    $scope.coopStatusLaedt = false;
    $scope.coopStatusVonWann = null;

    $scope.camera = {
      url: null,
      time: null,
      urlNightVision: null,
      timeNightVision: null,
    }

    $scope.updateCameraTime = (newTime,isNightVision=false) => {
      if(isNightVision) {
        $scope.camera.timeNightVision = newTime;
      }
      else {
        $scope.camera.time = newTime;
      }

      $scope.camera.url = '/cam/' + moment($scope.camera.time).unix();
      $scope.camera.urlNightVision = '/nightvision/' + moment($scope.camera.timeNightVision).unix();
    };

    $scope.getStatus = () => {
        $scope.coopStatusLaedt = true;

        $http({
          method: 'GET',
          url: '/status'
        }).then(function successCallback(response) {
            $scope.coopStatus = response.data;
            $scope.coopStatusLaedt = false;
            $scope.coopStatusVonWann = new Date();

            $scope.updateCameraTime($scope.coopStatus.camera.time, false);
            $scope.updateCameraTime($scope.coopStatus.camera.ir.time, true);
          }, function errorCallback(response) {
            $scope.coopStatusLaedt = false;
            $scope.coopStatusVonWann = new Date();
          });
    }
    $scope.getStatus();




    $scope.doorIst = (obenUnten) => {
      if(obenUnten=="oben") {
        reqUrl = '/calibrate/oben';
      }
      else if (obenUnten=="unten") {
        reqUrl = '/calibrate/unten';
      }
      else {
        alert("Fehler");
      }

      $http({
        method: 'GET',
        url: reqUrl
      }).then(function successCallback(response) {
          $scope.calibrateStatus = response.data;
          $scope.calibrateStatusVonWann = new Date();
          $scope.getStatus();
        }, function errorCallback(response) {
          alert("Fehler beim Kalibrieren: "+ response);
          $scope.calibrateStatus = response.data;
          $scope.calibrateStatusVonWann = new Date();
          $scope.getStatus();
        });
    }

    $scope.doorKorrigieren = (hochRunter) => {
      if(hochRunter=="hoch") {
        reqUrl = '/korrigiere/hoch';
      }
      else if (hochRunter=="runter") {
        reqUrl = '/korrigiere/runter';
      }
      else {
        alert("Fehler");
      }

      $http({
        method: 'GET',
        url: reqUrl
      }).then(function successCallback(response) {
          $scope.korrigierStatus = response.data;
          $scope.korrigierStatusVonWann = new Date();
        }, function errorCallback(response) {
          alert("Fehler beim Korrigieren: "+ response);
          $scope.korrigierStatus = response.data;
          $scope.korrigierStatusVonWann = new Date();
        });
    }

    $scope.fahreKlappe = (hochRunter) => {
      if(hochRunter=="hoch") {
        reqUrl = '/hoch';
      }
      else if (hochRunter=="runter") {
        reqUrl = '/runter';
      }
      else {
        alert("Fehler");
      }

      $http({
        method: 'GET',
        url: reqUrl
      }).then(function successCallback(response) {
          $scope.fahreStatus = response.data;
          $scope.fahreStatusVonWann = new Date();

          // Lade in 10s erneut
          setTimeout(function erneutLesen() {
            $scope.getStatus();
          }, 10 * 1000);
        }, function errorCallback(response) {
          $scope.fahreStatus = response.data;
          $scope.fahreStatusVonWann = new Date();
        });
    }

    $scope.nachtsichten = () => {
      let reqUrl = '/nightvision/new/';

      $http({
        method: 'GET',
        url: reqUrl
      }).then(function successCallback(response) {
        $scope.nachtsichtStatus = response.data;
        $scope.nachtsichtStatusVonWann = new Date();
      }, function errorCallback(response) {
        $scope.nachtsichtStatus = response.data;
        $scope.nachtsichtStatusVonWann = new Date();
      });
    }

    $scope.schalteLicht = (anAus) => {
      if(anAus) {
        reqUrl = '/shelly/turn/on';
      }
      else {
        reqUrl = '/shelly/turn/off';
      }

      $http({
        method: 'GET',
        url: reqUrl
      }).then(function successCallback(response) {
        $scope.getStatus();
      }, function errorCallback(response) {
        $scope.getStatus();
        alert("Fehler beim Licht schalten: "+ response);
      });
    }

    $scope.schalteHeizung = (anAus) => {
      if(anAus) {
        reqUrl = '/heating/enable';
      }
      else {
        reqUrl = '/heating/disable';
      }

      $http({
        method: 'GET',
        url: reqUrl
      }).then(function successCallback(response) {
        $scope.getStatus();
      }, function errorCallback(response) {
        $scope.getStatus();
        alert("Fehler beim Heizung schalten: "+ response);
      });
    }

    $scope.getLichtStatus = (anAus) => {
      reqUrl = '/shelly/update';

      $http({
        method: 'GET',
        url: reqUrl
      }).then(function successCallback(response) {
        $scope.getStatus();
      }, function errorCallback(response) {
        $scope.getStatus();
        alert("Fehler beim Licht updaten: "+ response);
      });
    }

    // Subscribe to coop events
    var es = new EventSource('/events');
    es.addEventListener('newWebcamPic', function (event) {
      // Pass the new timestamp to determine the new pic's url
      $scope.updateCameraTime(JSON.parse(event.data), false);
      $scope.$apply();
    });
    es.addEventListener('newWebcamPicIR', function (event) {
      // Pass the new timestamp to determine the new pic's url
      $scope.updateCameraTime(JSON.parse(event.data),true); //.replaceAll('"',''), true);
      $scope.$apply();
    });
    es.addEventListener('doornPosition', function (event) {
      $scope.coopStatus.door.position = JSON.parse(event.data); //.replaceAll('"','');
      $scope.$apply();
    });
    es.addEventListener('doornStatus', function (event) {
      $scope.coopStatus.door.status = JSON.parse(event.data); //.replaceAll('"','');
      $scope.$apply();
    });
    es.addEventListener('shellyRelayIsOn', function (event) {
      $scope.coopStatus.shelly.relay.ison = JSON.parse(event.data);
      $scope.$apply();
    });
    es.addEventListener('heating', function (event) {
      $scope.coopStatus.heating.status = JSON.parse(event.data);
      $scope.$apply();
    });
  }]);
