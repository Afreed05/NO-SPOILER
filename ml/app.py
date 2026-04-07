from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

def load_models():
    try:
        with open('model/spoilage_model.pkl', 'rb') as f:
            model = pickle.load(f)
        with open('model/crop_encoder.pkl', 'rb') as f:
            crop_encoder = pickle.load(f)
        with open('model/transport_encoder.pkl', 'rb') as f:
            transport_encoder = pickle.load(f)
        print("Models loaded successfully!")
        return model, crop_encoder, transport_encoder
    except FileNotFoundError:
        print("Model files not found! Run train.py first.")
        return None, None, None

model, crop_encoder, transport_encoder = load_models()

def get_risk_level(spoilage):
    if spoilage < 5:  return 'low'
    if spoilage < 10: return 'medium'
    return 'high'

def get_temp_offset(hour):
    if 4  <= hour < 7:  return -5
    if 7  <= hour < 10: return -2
    if 10 <= hour < 13: return +5
    if 13 <= hour < 16: return +3
    if 16 <= hour < 19: return +1
    if 19 <= hour < 22: return -1
    return -3

# ── NEW: Humidity varies through the day ──────────────────
def get_humidity_offset(hour):
    if 4  <= hour < 8:  return +12   # early morning — most humid
    if 8  <= hour < 11: return +6    # morning
    if 11 <= hour < 15: return -10   # noon — driest
    if 15 <= hour < 18: return -6    # afternoon
    if 18 <= hour < 21: return +4    # evening
    return +9                         # night — humid

# ── NEW: Traffic affects travel time = more time in heat ──
def get_traffic_multiplier(hour):
    if 8  <= hour < 10: return 1.4   # morning rush — slow
    if 17 <= hour < 20: return 1.35  # evening rush — slow
    if 0  <= hour < 5:  return 0.8   # night — fastest
    if 5  <= hour < 7:  return 0.85  # early morning — light
    return 1.0                        # normal

def predict_spoilage(crop, travel_hours, temperature, humidity, transport_type):
    try:
        crop_enc = crop_encoder.transform([crop])[0]
    except ValueError:
        crop_enc = crop_encoder.transform(['Tomato'])[0]
    try:
        transport_enc = transport_encoder.transform([transport_type])[0]
    except ValueError:
        transport_enc = transport_encoder.transform(['open'])[0]

    features = np.array([[crop_enc, travel_hours, temperature, humidity, transport_enc]])
    prediction = model.predict(features)[0]
    return round(float(prediction), 2)

@app.route('/')
def home():
    return jsonify({"message": "ML Server is running!", "model_loaded": model is not None})

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded. Run train.py first"}), 500
    data = request.get_json()
    required = ['crop', 'travel_hours', 'temperature', 'humidity', 'transport_type']
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400
    spoilage = predict_spoilage(
        crop=data['crop'],
        travel_hours=float(data['travel_hours']),
        temperature=float(data['temperature']),
        humidity=float(data['humidity']),
        transport_type=data['transport_type']
    )
    return jsonify({
        "crop": data['crop'],
        "spoilage_percent": spoilage,
        "risk_level": get_risk_level(spoilage)
    })

@app.route('/optimize', methods=['POST'])
def optimize():
    if model is None:
        return jsonify({"error": "Model not loaded. Run train.py first"}), 500

    data = request.get_json()
    crop           = data.get('crop', 'Tomato')
    travel_hours   = float(data.get('travel_hours', 4))
    base_temp      = float(data.get('temperature', 30))
    base_humidity  = float(data.get('humidity', 65))
    transport_type = data.get('transport_type', 'open')
    quantity_kg    = float(data.get('quantity_kg', 100))
    price_per_kg   = float(data.get('price_per_kg', 20))
    dispatch_date  = data.get('dispatch_date', None)
    dispatch_time  = data.get('dispatch_time', None)

    if dispatch_date and dispatch_time:
        try:
            start_dt = datetime.strptime(f"{dispatch_date} {dispatch_time}", "%Y-%m-%d %H:%M")
        except ValueError:
            start_dt = datetime.now()
    else:
        start_dt = datetime.now()

    windows = []

    for i in range(6):
        window_dt = start_dt + timedelta(hours=i * 6)
        hour      = window_dt.hour

        # Label
        day_str = "Today" if window_dt.date() == datetime.now().date() else "Tomorrow"
        if   hour == 0:  time_str = "12 AM"
        elif hour < 12:  time_str = f"{hour} AM"
        elif hour == 12: time_str = "12 PM"
        else:            time_str = f"{hour - 12} PM"
        label = f"{day_str} {time_str}"

        # ── Adjust all 3 variables per window ──────────────
        temp     = round(base_temp + get_temp_offset(hour), 1)
        humidity = round(min(95, max(30, base_humidity + get_humidity_offset(hour))), 1)
        t_hours  = round(travel_hours * get_traffic_multiplier(hour), 2)

        spoilage    = predict_spoilage(crop, t_hours, temp, humidity, transport_type)
        loss_kg     = round((spoilage / 100) * quantity_kg, 2)
        loss_rupees = round(loss_kg * price_per_kg, 2)

        windows.append({
            "window":           label,
            "hour":             hour,
            "temperature":      temp,
            "humidity":         humidity,
            "travel_hours":     t_hours,
            "spoilage_percent": spoilage,
            "loss_kg":          loss_kg,
            "loss_rupees":      loss_rupees,
            "risk_level":       get_risk_level(spoilage)
        })

    best_window  = min(windows, key=lambda x: x['spoilage_percent'])
    worst_window = max(windows, key=lambda x: x['spoilage_percent'])
    savings      = round(worst_window['loss_rupees'] - best_window['loss_rupees'], 2)
    if savings < 0:
        savings = 0

    return jsonify({
        "crop":           crop,
        "quantity_kg":    quantity_kg,
        "all_windows":    windows,
        "best_window":    best_window,
        "worst_window":   worst_window,
        "savings_rupees": savings,
        "recommendation": f"Dispatch at {best_window['window']} — save ₹{savings} vs worst time"
    })

if __name__ == '__main__':
    app.run(port=5001, debug=True)