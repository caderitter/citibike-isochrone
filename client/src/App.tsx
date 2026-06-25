import Map, { Layer, Source, useMap, type CircleLayerSpecification, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeatureCollection } from 'geojson';

const CITIBIKE_STATIONS_SOURCE_ID = 'citibike-stations-source';
const CITIBIKE_STATIONS_LAYER_ID = 'citibike-stations-layer';
const CITIBIKE_GEOJSON_STATION_ID_KEY = 'station_id';

const citibikeStationLayerStyle: CircleLayerSpecification = {
  id: CITIBIKE_STATIONS_LAYER_ID,
  source: CITIBIKE_STATIONS_SOURCE_ID,
  type: 'circle',
  paint: {
    'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 10, 5],
    'circle-color': '#007cbf'
  }
};

export function App() {
  const [citibikeGeoJson, setCitibikeGeoJson] = useState<FeatureCollection>();
  const mapRef = useRef<MapRef>(null);
  const hoveredFeatureIdRef = useRef<string | number>(null);

  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];

    if (feature) {
      console.log(feature.geometry);
    }
  }, []);

  const handleMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const map = mapRef?.current?.getMap();
    if (!map) return;

    const feature = event.features?.[0];

    if (hoveredFeatureIdRef.current !== null) {
      map.setFeatureState(
        { source: CITIBIKE_STATIONS_SOURCE_ID, id: hoveredFeatureIdRef.current },
        { hover: false }
      );
    }

    if (feature?.id !== undefined) {
      map.setFeatureState(
        { source: CITIBIKE_STATIONS_SOURCE_ID, id: feature.id },
        { hover: true }
      );
      hoveredFeatureIdRef.current = feature.id;
      map.getCanvas().style.cursor = 'pointer';
    } else {
      hoveredFeatureIdRef.current = null;
      map.getCanvas().style.cursor = '';
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (hoveredFeatureIdRef.current !== null) {
      map.setFeatureState(
        { source: CITIBIKE_STATIONS_SOURCE_ID, id: hoveredFeatureIdRef.current },
        { hover: false }
      );
      hoveredFeatureIdRef.current = null;
    }
    map.getCanvas().style.cursor = '';
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/geojson').then(res => res.json()).then(json => setCitibikeGeoJson(json));
  }, []);

  return (
    <Map
      ref={mapRef}
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
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseLeave}
      interactiveLayerIds={[CITIBIKE_STATIONS_LAYER_ID]}
    >
      {citibikeGeoJson && (
        <Source id={CITIBIKE_STATIONS_SOURCE_ID} type="geojson" data={citibikeGeoJson} promoteId={CITIBIKE_GEOJSON_STATION_ID_KEY}>
          <Layer {...citibikeStationLayerStyle}/>
        </Source>
      )}
    </Map>
  );
}

