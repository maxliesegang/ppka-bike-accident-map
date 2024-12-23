import {
  isBikeAndVehicleAccident,
  isBikeAndPedestrianAccident,
  hasInjuries,
  isBikeOnlyAccident,
  isPedestrianAndVehicleAccident,
  hasSevereInjuries,
  isSingleBikeAccident,
} from './featureChecks.js';

const MAP_INITIAL_VIEW = [45, 15];
const MAP_ZOOM_LEVEL = 3;

// Accident type colors
const COLORS = {
  DEFAULT_FILL: '#0FF',
  BIKE_AND_VEHICLE: '#FF0000',
  PEDESTRIAN_AND_VEHICLE: '#FFA500',
  BIKE_AND_PEDESTRIAN: '#FFDC00',
  SINGLE_BIKE: '#0074D9',
  BIKE_ONLY: '#B10DC9',
};

const getFillColor = (feature) => {
  if (isBikeAndVehicleAccident(feature)) return COLORS.BIKE_AND_VEHICLE;
  if (isPedestrianAndVehicleAccident(feature))
    return COLORS.PEDESTRIAN_AND_VEHICLE;
  if (isBikeAndPedestrianAccident(feature)) return COLORS.BIKE_AND_PEDESTRIAN;
  if (isSingleBikeAccident(feature)) return COLORS.SINGLE_BIKE;
  if (isBikeOnlyAccident(feature)) return COLORS.BIKE_ONLY;
  return COLORS.DEFAULT_FILL;
};

const getRadius = (feature) => {
  if (hasSevereInjuries(feature)) return 9;
  if (hasInjuries(feature)) return 6;
  return 3;
};

const getStyle = (feature) => ({
  color: '#000000',
  stroke: true,
  weight: 1,
  radius: getRadius(feature),
  fillColor: getFillColor(feature),
  opacity: 1,
  fillOpacity: 0.9,
});

// Initialize map
const map = L.map('map', {
  crs: L.CRS.EPSG4326,
}).setView(MAP_INITIAL_VIEW, MAP_ZOOM_LEVEL);

// Add OSM tile layer
const osm = L.tileLayer(
  'https://osm-{s}.gs.mil/tiles/default_pc/{z}/{x}/{y}.png',
  {
    subdomains: '1234',
    attribution:
      '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong>',
  }
);
osm.addTo(map);

// Add GeoPackage layer with safety handling
try {
  const geoPackageLayer = L.geoPackageFeatureLayer([], {
    geoPackageUrl: 'unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg',
    layerName: 'zugeschnitten',
    style: getStyle,
    pointToLayer: (feature, latlng) =>
      L.circleMarker(latlng, getStyle(feature)),
  }).addTo(map);
} catch (error) {
  console.error(error);
}

var legend = L.control({ position: 'topright' });
legend.onAdd = function (map) {
  var div = L.DomUtil.create('div', 'info legend');
  let labels = [];

  // Add accident type section header
  labels.push('<strong>Unfalltypen</strong>');

  // Accident types legend items
  const accidentTypes = [
    { name: 'Fahrrad und Fahrzeug', color: COLORS.BIKE_AND_VEHICLE },
    { name: 'Fußgänger und Fahrzeug', color: COLORS.PEDESTRIAN_AND_VEHICLE },
    { name: 'Fahrrad und Fußgänger', color: COLORS.BIKE_AND_PEDESTRIAN },
    { name: 'Nur Fahrrad', color: COLORS.BIKE_ONLY },
    { name: 'Einzelfahrrad', color: COLORS.SINGLE_BIKE },
    { name: 'Standard', color: COLORS.DEFAULT_FILL },
  ];

  accidentTypes.forEach((type) => {
    labels.push(
      `<i class="circle" style="background:${type.color}; border:1px solid #000;"></i> ${type.name}<br>`
    );
  });

  // Add accident severity section header (no extra `<br>` at the end of this header)
  labels.push('<strong>Schweregrad</strong>');

  // Accident severity legend items
  const accidentSeverity = [
    { name: 'Schwere Verletzungen', radius: 9, color: '#FF0000' },
    { name: 'Leichte Verletzungen', radius: 6, color: '#FFA500' },
    { name: 'Keine Verletzungen', radius: 3, color: '#00FF00' },
  ];

  accidentSeverity.forEach((severity) => {
    labels.push(
      `<i class="circle" style="background:${severity.color}; width:${severity.radius * 2}px; height:${severity.radius * 2}px; border:1px solid #000;"></i> ${severity.name}<br>`
    );
  });

  // Join the labels while keeping proper formatting
  div.innerHTML = labels.join('');
  return div;
};
legend.addTo(map);
