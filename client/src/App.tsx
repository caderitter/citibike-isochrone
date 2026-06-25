import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';

export function App() {

  return (
    <Map
      initialViewState={{
        latitude: 40.7128,
        longitude: -74.0060,
        zoom: 10
      }}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '100%'
      }}
      mapStyle="https://api.maptiler.com/maps/dataviz-v4/style.json?key=O4SIJKy0mkCeNgNS0Nic"
    />
  );
}

