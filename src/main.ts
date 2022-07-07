import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';

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
