# ============================================================
# app.py — Flask ML Server (FIXED)
# Changes:
# 1. Risk levels fixed: LOW < 5%, MEDIUM 5-10%, HIGH > 10%
# 2. Windows reduced to 4 (next 24 hours only)
# 3. Selected date/time se windows calculate hote hain
# ============================================================

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

# ----------------------------------------
# Risk level — FIXED thresholds
# ----------------------------------------
def get_risk_level(spoilage):
    if spoilage < 5:   return 'low'
    if spoilage < 10:  return 'medium'
    return 'high'

# ----------------------------------------
# Temperature adjustment by hour of day
# Same logic as Node ml.js
# ----------------------------------------
def get_temp_offset(hour):
    if 4  <= hour < 7:  return -5
    if 7  <= hour < 10: return -2
    if 10 <= hour < 13: return +5
    if 13 <= hour < 16: return +3
    if 16 <= hour < 19: return +1
    if 19 <= hour < 22: return -1
    return -3

# ----------------------------------------
# Predict spoilage for given inputs
# ----------------------------------------
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

# ----------------------------------------
# Health check
# ----------------------------------------
@app.route('/')
def home():
    return jsonify({"message": "ML Server is running!", "model_loaded": model is not None})

# ----------------------------------------
# POST /predict — single prediction
# ----------------------------------------
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

# ----------------------------------------
# POST /optimize — 4 windows, next 24 hours
# FIXED: respects dispatch_date and dispatch_time
# ----------------------------------------
@app.route('/optimize', methods=['POST'])
def optimize():
    if model is None:
        return jsonify({"error": "Model not loaded. Run train.py first"}), 500

    data = request.get_json()

    crop           = data.get('crop', 'Tomato')
    travel_hours   = float(data.get('travel_hours', 4))
    base_temp      = float(data.get('temperature', 30))
    humidity       = float(data.get('humidity', 65))
    transport_type = data.get('transport_type', 'open')
    quantity_kg    = float(data.get('quantity_kg', 100))
    price_per_kg   = float(data.get('price_per_kg', 20))
    dispatch_date  = data.get('dispatch_date', None)   # "2026-03-27"
    dispatch_time  = data.get('dispatch_time', None)   # "06:00"

    # ----------------------------------------
    # Starting point — selected date/time ya abhi
    # ----------------------------------------
    if dispatch_date and dispatch_time:
        try:
            start_dt = datetime.strptime(f"{dispatch_date} {dispatch_time}", "%Y-%m-%d %H:%M")
        except ValueError:
            start_dt = datetime.now()
    else:
        start_dt = datetime.now()

    # ----------------------------------------
    # 4 windows — har 6 ghante
    # Start from selected time, not always "Today 6 AM"
    # ----------------------------------------
    windows = []

    for i in range(4):
        window_dt   = start_dt + timedelta(hours=i * 6)
        hour        = window_dt.hour

        # Descriptive label
        day_str = "Today" if window_dt.date() == datetime.now().date() else "Tomorrow"
        if   hour == 0:  time_str = "12 AM"
        elif hour < 12:  time_str = f"{hour} AM"
        elif hour == 12: time_str = "12 PM"
        else:            time_str = f"{hour - 12} PM"
        label = f"{day_str} {time_str}"

        # Temperature at this specific window
        temp_offset = get_temp_offset(hour)
        temp        = round(base_temp + temp_offset, 1)

        spoilage    = predict_spoilage(crop, travel_hours, temp, humidity, transport_type)
        loss_kg     = round((spoilage / 100) * quantity_kg, 2)
        loss_rupees = round(loss_kg * price_per_kg, 2)

        windows.append({
            "window":          label,
            "hour":            hour,
            "temperature":     temp,
            "spoilage_percent": spoilage,
            "loss_kg":         loss_kg,
            "loss_rupees":     loss_rupees,
            "risk_level":      get_risk_level(spoilage)
        })

    # Best window = lowest spoilage among 4
    best_window = min(windows, key=lambda x: x['spoilage_percent'])

    # Savings = first window loss - best window loss
    savings = round(windows[0]['loss_rupees'] - best_window['loss_rupees'], 2)
    if savings < 0:
        savings = 0  # agar selected time hi best hai

    return jsonify({
        "crop":             crop,
        "quantity_kg":      quantity_kg,
        "all_windows":      windows,
        "best_window":      best_window,
        "savings_rupees":   savings,
        "recommendation":   f"Dispatch at {best_window['window']} — only {best_window['spoilage_percent']}% spoilage"
    })

if __name__ == '__main__':
    app.run(port=5001, debug=True)