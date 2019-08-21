// ==UserScript==
// @name         airbnb places searchbox
// @namespace    https://github.com/srizzo/airbnb-places-searchbox
// @version      0.2
// @description  Adds a places searchbox to Airbnb's search results map
// @author       Samuel Rizzo
// @include     http*://*.airbnb.*/s/*
// @include     http*://airbnb.com/s/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var markers = [];

    function allParents(el) {
      var parents = []
      while (el.parentElement != null) {
        parents.push(el.parentElement)
        el = el.parentElement
      }
      return parents
    }

    function branchRoot(trunkSel, elSel) {
      var el = document.querySelector(elSel)
      var trunkNodes = allParents(document.querySelector(trunkSel))
      while (trunkNodes.indexOf(el.parentElement) < 0) {
        el = el.parentElement
      }
      return el
    }

    function setFullWidthMap() {
      var mapContainer = document.querySelector(".sticky-outer-wrapper").parentElement
      var filtersContainer = branchRoot(".sticky-outer-wrapper", "[data-container-name='explore']")

      filtersContainer.style.cssText = 'display: none !important';

      mapContainer.style.cssText = 'width: 100% !important; padding-left: 24px !important;';
      mapContainer.parentNode.style.cssText = 'width: 100% !important';

      window.dispatchEvent(new Event('resize'));
    }

    function initPlacesSearchBox () {
      document.head.insertAdjacentHTML('beforeend', `
        <style>
          #infowindow-content .title {
            font-weight: bold;
          }

          #pac-input {
            background-color: #fff;
            font-family: Roboto;
            font-size: 15px;
            font-weight: 300;
            margin: 12px;
            padding: 0 11px 0 13px;
            text-overflow: ellipsis;
            width: 400px;
          }

          #pac-input:focus {
            border-color: #4d90fe;
          }
        </style>
      `);

      document.body.insertAdjacentHTML('beforeend', `
        <div style="display: none">
          <input id="pac-input" class="controls" type="text" placeholder="Search Box" />
          <div id="infowindow-content">
            <a href="" class="place-url title" target="_blank">
              <span class="place-name"></span>
              <span class="place-rating"></span>
            </a>
            <br>
            <p class="place-address"></p>
            <p class="place-website"></p>
            <p>
              <img class="place-photo-0" src="" />
              <img class="place-photo-1" src="" />
            </p>
          </div>
        </div>
      `);

      var map = getMap();

      // Create the search box and link it to the UI element.
      var input = document.getElementById('pac-input');
      var searchBox = new google.maps.places.SearchBox(input);
      map.controls[google.maps.ControlPosition.TOP_RIGHT].push(input);

      var placesService = new google.maps.places.PlacesService(map);

      // Bias the SearchBox results towards current map's viewport.
      map.addListener('bounds_changed', function() {
        searchBox.setBounds(map.getBounds());
      });

      var infowindow = new google.maps.InfoWindow();
      var infowindowContent = document.getElementById('infowindow-content');

      // Listen for the event fired when the user selects a prediction and retrieve
      // more details for that place.
      searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();

        if (places.length === 0) {
          return;
        }

        // Clear out the old markers.
        markers.forEach(function(marker) {
          marker.setMap(null);
        });
        markers = [];

        // For each place, get the icon, name and location.
        var bounds = new google.maps.LatLngBounds();
        places.forEach(function(place) {
          if (!place.geometry) {
            console.log("Returned place contains no geometry");
            return;
          }
          var icon = {
            url: place.icon,
            size: new google.maps.Size(71, 71),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 34),
            scaledSize: new google.maps.Size(25, 25)
          };

          // Create a marker for each place.
          var marker = new google.maps.Marker({
            map: map,
            icon: icon,
            title: place.name,
            label: place.name,
            position: place.geometry.location
          });

          markers.push(marker)

          google.maps.event.addListener(marker, 'click', function() {
              placesService.getDetails({ placeId: place.place_id }, function (placeDetails, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                  infowindow.close();

                  infowindowContent.getElementsByClassName('place-url')[0].href = placeDetails.url ? placeDetails.url : null;
                  infowindowContent.getElementsByClassName('place-name')[0].textContent = place.name ? place.name : null;
                  infowindowContent.getElementsByClassName('place-rating')[0].textContent = placeDetails.rating ? placeDetails.rating : null;
                  infowindowContent.getElementsByClassName('place-address')[0].textContent = placeDetails.formatted_address ? placeDetails.formatted_address : null;
                  infowindowContent.getElementsByClassName('place-photo-0')[0].src = (placeDetails.photos && placeDetails.photos[0]) ? placeDetails.photos[0].getUrl({'maxWidth': 250, 'maxHeight': 150}) : placeDetails.icon;
                  infowindowContent.getElementsByClassName('place-photo-1')[0].src = (placeDetails.photos && placeDetails.photos[1]) ? placeDetails.photos[1].getUrl({'maxWidth': 250, 'maxHeight': 150}) : placeDetails.icon;

                  infowindow.setContent(infowindowContent);
                  infowindow.open(map, marker);
                }
              });
          });

          if (place.geometry.viewport) {
            // Only geocodes have viewport.
            bounds.union(place.geometry.viewport);
          } else {
            bounds.extend(place.geometry.location);
          }
        });
//        map.fitBounds(bounds);
      });
    }

    function findReactComponent(el) {
      for (const key in el) {
        if (key.startsWith('__reactInternalInstance$')) {
          const fiberNode = el[key];
          return fiberNode && fiberNode.return && fiberNode.return.stateNode;
        }
      }
      return null;
    }

    function getMap() {
        var els = document.querySelectorAll(".sticky-inner-wrapper *")
        for (var i = 0; i < els.length; i ++) {
            var el = els[i]
            var component = findReactComponent(el)
            if (component &&
                component._reactInternalFiber &&
                component._reactInternalFiber.return &&
                component._reactInternalFiber.return.stateNode &&
                component._reactInternalFiber.return.stateNode.context &&
                component._reactInternalFiber.return.stateNode.context.map) {
                return component._reactInternalFiber.return.stateNode.context.map
            }
        }
    }


    function init() {
      setFullWidthMap();
      initPlacesSearchBox();
    }

    function waitForMap() {
        if(getMap()) {
          init();
        } else {
          window.setTimeout(waitForMap, 300);
        }
    }
    waitForMap();
  }
)();
