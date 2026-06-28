import express, { Request } from 'express';
import cors from 'cors';
import path from 'node:path';

const CITIBIKE_PRICE_PER_MIN = 0.27;
const SUBWAY_FARE = 3.00;
const RIDE_LENGTH_AT_SUBWAY_COST = SUBWAY_FARE / CITIBIKE_PRICE_PER_MIN;
const MAX_RIDE_TIME = 45.0;

const app = express();

app.use(cors());

app.get('/geojson', (_req, res) => {
  const filePath = path.join(import.meta.dirname, '..', 'data', 'citibike.geojson');

  res.sendFile(filePath, {
    maxAge: '1d',
    immutable: true
  });
});

app.post('/isochrone', async (req: Request, res) => {
  const { lat, lon, costing } = req.query;
  const requestObj = {
    locations: [{ lat, lon }],
    costing,
    contours: [
      {
          "time": MAX_RIDE_TIME,
          "color": "0000ff"
      },
      {
        "time": RIDE_LENGTH_AT_SUBWAY_COST,
        "color": "ff0000"
      }
    ],
    polygons: true,
    costing_options: {
      bicycle: {
        bicycle_type: "Hybrid",
        cycling_speed: 17,
      }
    },
  };

  const queryParams = new URLSearchParams({
    json: JSON.stringify(requestObj),
  });

  const valhallaResponse = await fetch(`http://localhost:8002/isochrone?${queryParams}`, { method: 'POST'});

  if (!valhallaResponse.ok) {
    return res.status(valhallaResponse.status).json({ error: 'Valhalla error' });
  }

  const isochroneGeojson = await valhallaResponse.json();

  res.json(isochroneGeojson);
});

app.listen(5001);