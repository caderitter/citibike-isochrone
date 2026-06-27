import express, { Request } from 'express';
import cors from 'cors';
import path from 'node:path';

const app = express();

app.use(cors());

app.get('/geojson', (_req, res) => {
  const filePath = path.join(__dirname, 'data', 'citibike.geojson');

  res.sendFile(filePath, {
    maxAge: 3600000,
    immutable: true
  });
});

app.post('/isochrone', async (req: Request, res) => {
  const { lat, lon, costing } = req.params;
  const requestObj = {
    locations: [{ lat, lon }],
    costing,
    contours: [
      {
          "time": 15.0,
          "color": "ff0000"
      }
    ]
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

app.listen(5000);