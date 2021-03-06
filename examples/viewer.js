'use strict';

(function() {

    var module = angular.module('viewer', [
        'storytools.core.time',
        'storytools.core.mapstory',
        'storytools.core.pins',
        'storytools.core.boxes',
        'storytools.core.ogc',
        'storytools.core.legend',
        'ui.bootstrap'
    ]);

    module.constant('iconCommonsHost', 'http://mapstory.dev.boundlessgeo.com');

    module.run(function() {
        // install a watchers debug loop
        (function() {
            var root = angular.element(document.getElementsByTagName('body'));
            var last;
            var watchers = 0;

            var f = function(element) {
                if (element.data().hasOwnProperty('$scope')) {
                    watchers += (element.data().$scope.$$watchers || []).length;
                }

                angular.forEach(element.children(), function(childElement) {
                    f(angular.element(childElement));
                });
            };

            window.setInterval(function() {
                watchers = 0;
                f(root);
                if (watchers != last) {
                    console.log(watchers);
                }
                last = watchers;
            }, 1000);

        })();
    });

    function MapManager($http, $q, $log, $rootScope, $location,
        stMapConfigStore, StoryMap, stStoryMapBuilder, stStoryMapBaseBuilder, StoryPinLayerManager, StoryBoxLayerManager) {
        this.storyMap = new StoryMap({target: 'map', returnToExtent: false});
        var self = this;
        StoryPinLayerManager.map = self.storyMap;
        StoryBoxLayerManager.map = self.storyMap;
        this.loadMap = function(options) {
            options = options || {};
            if (options.id) {
                var config = stMapConfigStore.loadConfig(options.id);
                stStoryMapBuilder.modifyStoryMap(self.storyMap, config);

                var annotationsURL = "/maps/" + options.id + "/annotations";
                if (annotationsURL.slice(-1) === '/') {
                    annotationsURL = annotationsURL.slice(0, -1);
                }

                var boxesURL = "/maps/" + options.id + "/boxes";
                if (boxesURL.slice(-1) === '/') {
                    boxesURL = boxesURL.slice(0, -1);
                }

                var annotationsLoad = $http.get(annotationsURL);
                var boxesLoad = $http.get(boxesURL);
                $q.all([annotationsLoad, boxesLoad]).then(function(values) {
                    var pins_geojson = values[0].data;
                    StoryPinLayerManager.loadFromGeoJSON(pins_geojson, self.storyMap.getMap().getView().getProjection(), true);

                    var boxes_geojson = values[1].data;
                    StoryBoxLayerManager.loadFromGeoJSON(boxes_geojson, self.storyMap.getMap().getView().getProjection(), true);
                });
            } else if (options.url) {
                var mapLoad = $http.get(options.url).success(function(data) {
                    stStoryMapBuilder.modifyStoryMap(self.storyMap, data);
                }).error(function(data, status) {
                    if (status === 401) {
                        window.console.warn('Not authorized to see map ' + mapId);
                        stStoryMapBaseBuilder.defaultMap(self.storyMap);
                    }
                });

                var annotationsURL = options.url.replace('/data','/annotations');
                if (annotationsURL.slice(-1) === '/') {
                    annotationsURL = annotationsURL.slice(0, -1);
                }

                var boxesURL = options.url.replace('/data','/boxes');
                if (boxesURL.slice(-1) === '/') {
                    boxesURL = boxesURL.slice(0, -1);
                }

                var annotationsLoad = $http.get(annotationsURL);
                var boxesLoad = $http.get(boxesURL);
                $q.all([mapLoad, annotationsLoad, boxesLoad]).then(function(values) {
                    var pins_geojson = values[1].data;
                    StoryPinLayerManager.loadFromGeoJSON(pins_geojson, self.storyMap.getMap().getView().getProjection());

                    var boxes_geojson = values[2].data;
                    StoryBoxLayerManager.loadFromGeoJSON(boxes_geojson, self.storyMap.getMap().getView().getProjection());
                });

            } else {
                stStoryMapBaseBuilder.defaultMap(this.storyMap);
            }
            this.currentMapOptions = options;
            // @todo how to make on top?
        };
        $rootScope.$on('$locationChangeSuccess', function() {
            var path = $location.path();
            if (path === '/new') {
                self.loadMap();
            } else if (path.indexOf('/local') === 0) {
                self.loadMap({id: /\d+/.exec(path)});
            } else {
                self.loadMap({url: path});
            }
        });
    }

    module.service('MapManager', function($injector) {
        return $injector.instantiate(MapManager);
    });

    module.controller('tileProgressController', function($scope) {
        $scope.tilesToLoad = 0;
        $scope.tilesLoadedProgress = 0;
        $scope.$on('tilesLoaded', function(evt, remaining) {
            $scope.$apply(function () {
                if (remaining <= 0) {
                    $scope.tilesToLoad = 0;
                    $scope.tilesLoaded = 0;
                    $scope.tilesLoadedProgress = 0;
                } else {
                    if (remaining < $scope.tilesToLoad) {
                        $scope.tilesLoaded = $scope.tilesToLoad - remaining;
                        $scope.tilesLoadedProgress = Math.floor(100 * ($scope.tilesLoaded/($scope.tilesToLoad - 1)));
                    } else {
                        $scope.tilesToLoad = remaining;
                    }
                }
            });
        });
    });

    module.controller('viewerController', function($scope, $injector, MapManager, TimeControlsManager) {
        $scope.timeControlsManager = $injector.instantiate(TimeControlsManager);
        $scope.mapManager = MapManager;
        $scope.playbackOptions = {
            mode: 'instant',
            fixed: false
        };
    });
})();
