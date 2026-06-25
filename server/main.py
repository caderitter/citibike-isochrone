import os
from flask import Flask, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/geojson")
def geojson():
    file_path = os.path.join(app.root_path, 'data/citibike.geojson')

    return send_file(file_path, mimetype='application/json')

if __name__ == '__main__':
    app.run(debug=True)
