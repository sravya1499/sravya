from flask import Flask, request, jsonify
import numpy as np

app = Flask(_name_)

@app.route('/predict', methods=['POST'])
def predict_disaster():
    sensor_data = request.json.get('sensor_data', [])
    if not sensor_data:
        return jsonify({'error': 'No data'}), 400
    risk_score = np.mean(sensor_data)
    prediction = "Flood Risk" if risk_score > 0.5 else "No Risk"
    return jsonify({'prediction': prediction, 'risk_score': round(risk_score, 2)})

@app.route('/chat', methods=['POST'])
def chatbot():
    msg = request.json.get('message', '').lower()
    if "safe" in msg:
        reply = "Yes, your area is currently safe."
    elif "route" in msg:
        reply = "Use National Highway 16 to evacuate safely."
    else:
        reply = "Please ask about safety or evacuation."
    return jsonify({'reply': reply})

@app.route('/sensor', methods=['POST'])
def receive_sensor():
    data = request.json
    print(f"Sensor {data.get('id')} sent: {data.get('values')}")
    return jsonify({'status': 'Data received'})

if _name_ == '_main_':
    app.run(debug=True)