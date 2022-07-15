import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';

const map = new Map(
  { basemap: "streets-vector" }
);

const view = new MapView({
  map: map,
  container: 'viewDiv',
  center: [-76.92, 40.2398],
  zoom: 10
});
