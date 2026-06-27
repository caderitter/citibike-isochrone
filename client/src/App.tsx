import Map, { Layer, Source, type CircleLayerSpecification, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeatureCollection } from 'geojson';

const CITIBIKE_STATIONS_SOURCE_ID = 'citibike-stations-source';
const CITIBIKE_STATIONS_LAYER_ID = 'citibike-stations-layer';
const CITIBIKE_GEOJSON_STATION_ID_KEY = 'station_id';

const CITIBIKE_STATIONS_LAYER_STYLE: CircleLayerSpecification = {
  id: CITIBIKE_STATIONS_LAYER_ID,
  source: CITIBIKE_STATIONS_SOURCE_ID,
  type: 'circle',
  paint: {
    'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 10, 5],
    'circle-color': '#007cbf'
  }
};

const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz-v4/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`;


export function App() {
  const [citibikeGeoJson, setCitibikeGeoJson] = useState<FeatureCollection>();
  const mapRef = useRef<MapRef>(null);
  const hoveredFeatureIdRef = useRef<string | number>(null);

  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];

    if (feature && feature.geometry.type === 'Point') {
      const query = new URLSearchParams({
        lat: feature.geometry.coordinates[0].toString(),
        lon: feature.geometry.coordinates[1].toString(),
        costing: 'bicycle',
      });
      fetch(`${import.meta.env.VITE_SERVER_ENDPOINT}/isochrone?${query}`, { method: 'POST' })
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
    fetch(`${import.meta.env.VITE_SERVER_ENDPOINT}/geojson`, { mode: 'cors'}).then(res => res.json()).then(json => setCitibikeGeoJson(json));
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
      mapStyle={MAP_STYLE_URL}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseLeave}
      interactiveLayerIds={[CITIBIKE_STATIONS_LAYER_ID]}
    >
      {citibikeGeoJson && (
        <Source id={CITIBIKE_STATIONS_SOURCE_ID} type="geojson" data={citibikeGeoJson} promoteId={CITIBIKE_GEOJSON_STATION_ID_KEY}>
          <Layer {...CITIBIKE_STATIONS_LAYER_STYLE}/>
        </Source>
      )}
    </Map>
  );
}

