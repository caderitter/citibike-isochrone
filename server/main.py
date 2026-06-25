import os
from flask import Flask, send_file, request
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)

@app.route("/geojson")
def geojson():
    file_path = os.path.join(app.root_path, 'data/citibike.geojson')

    return send_file(file_path, mimetype='application/json')

@app.route("/isochrone")
def isochrone():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    costing = request.args.get('costing')
    contours = [
        {
            "time": 15.0,
            "color": "ff0000"
        }
    ]
    request_obj = {
        "locations": [{ "lat": lat, "lon": lon }],
        "costing": costing,
        "contours": contours
    }
    query_params = {
        "json": json.dumps(request_obj)
    }
    response = requests.post('http://localhost:8002/isochrone', params=query_params)

    return response

if __name__ == '__main__':
    app.run(debug=True)
