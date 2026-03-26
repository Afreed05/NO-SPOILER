# 🌿 No Spoilers
### *Dispatch Smart. Lose Nothing.*

> An AI-powered agricultural logistics platform that helps farmers make 
> data-driven dispatch decisions, connect with transport providers,labours 
> and maximize their post-harvest income.


![No Spoilers Banner](https://img.shields.io/badge/No%20Spoilers-Agricultural%20AI-22c55e?style=for-the-badge&logo=leaf)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js)
![Python](https://img.shields.io/badge/Python-3.10-3776AB?style=flat-square&logo=python)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=flat-square&logo=firebase)
![XGBoost](https://img.shields.io/badge/ML-XGBoost-FF6600?style=flat-square)

## 🚨 The Problem

India loses **₹92,000 crore annually** in post-harvest agricultural waste.
This is not a farming problem — it is a **logistics and decision-making problem.**

A tomato farmer in Kolar harvests 500kg. He has 3–4 days before spoilage
begins. He has no cold storage. He dispatches based on habit — not data.

**4 critical gaps nobody is solving:**

| Gap | Impact |
|-----|--------|
| Wrong dispatch timing | 15–21% spoilage in peak summer heat |
| Wrong route selection | Extra travel time = extra spoilage |
| No market price visibility | Selling ₹4/kg less than best mandi |
| No transport system | 2–3 hour delay finding tempo driver |

> *"The problem is not that crops are bad. The problem is that good crops
> are wasted because of decisions made without data."*

---

## 💡 Our Solution

**No Spoilers** is a 3-layer smart agricultural logistics platform:

```
Layer 1 — Logistics Marketplace
Farmer posts request → Provider sees on live map → Accepts instantly
No calls. No middlemen. No delays.

Layer 2 — ML Intelligence (Core Differentiator)
Real weather + actual road time → XGBoost model →
Best dispatch window in next 24 hours → ₹ savings quantified

Layer 3 — Market Intelligence  
5 Karnataka mandis compared → Best price recommended →
Price trend arrows → Profit calculator with real costs
```

---

## 📊 Real World Impact

```
A single tomato farmer using No Spoilers:

Without App              With App
─────────────────────    ─────────────────────
Dispatches at 2 PM       Dispatches at 6 AM
Temperature: 38°C        Temperature: 28°C
Spoilage: 21%            Spoilage: 6.2%
Loss: ₹1,890             Loss: ₹540
                         
                         Savings per trip: ₹1,350
                         Per season (3 trips): ₹4,050
                         
If 10,000 farmers adopt: ₹15–20 crore saved per season
```

**Validated against:**
- FAO published perishability indices
- ICAR post-harvest loss documentation
- Agmarknet historical mandi price data
- Real-time Karnataka weather via OpenWeatherMap

---

## 🎥 Live Demo

```
Farmer Account:  farmer@test.com  / 123456
Provider Account: provider@test.com / 123456
```

**Demo Flow:**
1. Login as Farmer → Fill request form
2. Click "Check Spoilage Risk" → See ML analysis
3. See best dispatch time + ₹ savings
4. Compare mandi prices → Calculate profit
5. Post request → Login as Provider
6. See request on Karnataka map → Accept
7. See real road route drawn on map
8. Farmer confirms delivery → Earnings updated

---

## ⭐ Core Features

### 🌾 Farmer Dashboard

**Smart Request Form**
- Crop selection with auto-loaded mandi prices
- 3 transport types: Open Truck / Closed Truck / Refrigerated
- Date and time picker for planned dispatch
- Nearby driver selection with real rates
- Optional labour hiring for loading/unloading

**ML Spoilage Analysis**
- Real-time weather from OpenWeatherMap API
- Actual road distance from OSRM routing engine
- XGBoost model predicts spoilage % for next 24 hours
- 4 dispatch windows analyzed (every 6 hours)
- Best window highlighted with ₹ savings
- Risk levels: 🟢 LOW (<5%) · 🟡 MEDIUM (5–10%) · 🔴 HIGH (>10%)

**Mandi Price Intelligence**
- 5 Karnataka mandis compared per crop
- Price trend arrows (📈 rising · 📉 falling · ➡️ stable)
- Best mandi highlighted with ⭐
- Auto-loads when farmer selects crop

**Profit Calculator**
- Revenue range from all mandis (min → max)
- Real transport cost from selected driver's rate
- Labour cost if hired
- ML-predicted spoilage loss
- Final profit range displayed
- Tip: "Dispatch at Tomorrow 6 AM — save ₹787 more"

**My Requests**
- Live status tracking: Pending → Accepted → Delivered
- Driver details always visible: Name · Vehicle No · Type · Rate · 📞 Call
- Labour details: Name · Rate · 📞 Call
- ML savings chips per request
- Two-step delivery verification (farmer confirms after driver marks done)

---

### 🚛 Provider Dashboard

**Live Karnataka Map**
- Dark-themed Leaflet map with real OpenStreetMap tiles
- Markers for all pending pickup requests
- Click marker → See crop, quantity, route, ML savings
- Accept directly from popup

**OSRM Real Road Routing**
- No API key required — fully free
- Actual road path drawn on map (not straight line)
- Distance calculated via Haversine fallback if OSRM fails
- Route info bar: Distance · Travel time · Temperature · Cargo

**Job Management**
- Available Requests tab with ML intelligence per job
- My Jobs tab with route replay
- Status badges per job
- Earnings dashboard updated on delivery confirmation

---

### 💪 Labour Dashboard

- See assigned loading/unloading jobs
- Accept or decline
- Mark job as complete
- Two-step verification with farmer
- Daily earnings tracker

---

### 🔐 Authentication System

- Email/Password via Firebase Auth
- 3 role types: Farmer / Provider / Labour
- Role-based routing — each role sees their own dashboard
- Vehicle type selection for providers at signup
- Persistent auth — survives page refresh

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (React)                       │
│                     Port: 5173                          │
│  Landing → Login → Farmer/Provider/Labour Dashboard     │
└──────────────────────┬──────────────────────────────────┘
                       │ axios HTTP
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 NODE.JS SERVER                          │
│                   Port: 5000                            │
│  /api/ml/analyze    /api/mandi/:crop                   │
└──────┬──────────────┬──────────────────────────────────┘
       │              │
       ▼              ▼
┌──────────┐    ┌──────────────┐    ┌─────────────────┐
│OpenWeather│    │OSRM Routing  │    │  FLASK ML SERVER │
│   MAP API │    │(Free, No Key)│    │    Port: 5001   │
│ Real temp │    │ Real routes  │    │ XGBoost Model   │
└──────────┘    └──────────────┘    └─────────────────┘
                                           │
                                    ┌──────▼──────┐
                                    │  Firestore  │
                                    │  Firebase   │
                                    │Auth + DB    │
                                    └─────────────┘
```

**Data Flow for ML Analysis:**
```
Farmer fills form
      ↓
React → POST /api/ml/analyze
      ↓
Node → OpenWeatherMap (real temperature, Kolar = 33.8°C)
Node → OSRM (actual road: Kolar→Bengaluru = 78km, 2.3hrs)
Node → Flask /optimize
      ↓
Flask → XGBoost predicts 4 windows (next 24 hours)
Flask → Returns best_window + savings_rupees
      ↓
Node combines weather + route + prediction
      ↓
React renders Risk Card: "Tomorrow 6 AM — save ₹787"
```

---

## 🛠 Tech Stack

| Layer | Technology | Why Chosen |
|-------|-----------|------------|
| Frontend | React 18 + Vite | Component-based, real-time state, fast HMR |
| Backend | Node.js + Express | Secure API key proxy, orchestrates 3 services |
| ML Server | Python 3.10 + Flask | Best ML ecosystem, lightweight API serving |
| ML Model | XGBoost Regressor | Best for small tabular datasets (72 rows, MAE 2.93%) |
| Database | Firebase Firestore | Real-time updates, auto-scaling, free tier |
| Auth | Firebase Auth | Role-based, secure, handles tokens automatically |
| Weather | OpenWeatherMap | Free 1000 calls/day, reliable, city-name lookup |
| Routing | OSRM | Free, no API key, real road geometry, GeoJSON output |
| Map | Leaflet.js | Free, open-source, no billing, handles polylines |
| Mandi Data | Agmarknet (static) | Historical data, reliable, ₹2–3 accuracy |
| Styling | CSS-in-JS (inline) | No build step, dark theme, zero dependencies |

---

## 🧠 ML Model

### Algorithm: XGBoost Regressor

**Why XGBoost over Deep Learning:**
- Training data: 72 rows (FAO perishability tables)
- Deep learning needs thousands of rows minimum
- XGBoost is the industry standard for small tabular datasets
- MAE: **2.93%** — predictions accurate within 3%

**Input Features:**
```python
features = [
    crop_encoded,        # LabelEncoded (Tomato=6, Onion=3...)
    travel_hours,        # From OSRM — actual road time
    temperature_celsius, # From OpenWeatherMap — real-time
    humidity_percent,    # From OpenWeatherMap — real-time
    transport_encoded,   # open=1, refrigerated=0, closed=2
]
```

**Output:**
```python
{
    spoilage_percent: 6.2,
    risk_level: "low"    # low<5% / medium 5-10% / high>10%
}
```

**Dispatch Window Optimization:**
```python
# 4 windows — next 24 hours (every 6 hours)
# Temperature model:
#   6 AM  → base - 5°C (coolest)
#   12 PM → base + 5°C (hottest)
#   6 PM  → base + 2°C
#   12 AM → base - 3°C

for each window:
    predict spoilage at that temperature
    calculate loss_kg and loss_rupees
    
best_window = min(spoilage)
savings = first_window_loss - best_window_loss
```

**Training Data Source:**
- FAO Food Loss and Waste Protocol
- ICAR post-harvest technology guidelines
- Karnataka-specific temperature profiles

---

## 🗃 Firestore Structure

```javascript
// Collection: users
users/{userId} = {
  name:        "Raju Kumar",
  email:       "raju@test.com",
  role:        "farmer" | "provider" | "labour",
  vehicleType: "open" | "closed" | "refrigerated",  // providers only
  vehicleNo:   "KA09AB1234",                         // providers only
  ratePerKm:   12,                                   // providers only
  ratePerDay:  500,                                  // labour only
  isAvailable: true,
  phone:       "9876543210",
  earnings:    0,                                    // updated on delivery
  createdAt:   Timestamp
}

// Collection: requests
requests/{requestId} = {
  farmerId:    "uid123",
  farmerEmail: "raju@test.com",
  crop:        "Tomato",
  quantity:    500,
  pickup:      "Kolar",
  destination: "Bengaluru APMC",
  status:      "pending" | "accepted" | "delivered",
  
  // Full snapshot — never lost
  driver: {
    id:          "uid456",
    name:        "Suresh",
    vehicleNo:   "KA09AB1234",
    vehicleType: "open",
    ratePerKm:   12,
    phone:       "9876543210",
    status:      "pending" | "accepted"
  },
  
  labour: {
    id:        "uid789",
    name:      "Ramesh",
    ratePerDay: 500,
    phone:     "9123456789",
    status:    "pending" | "accepted"
  },
  
  riskAnalysis: {
    spoilage_percent: 6.2,
    best_window:      "Tomorrow 6 AM",
    savings_rupees:   787
  },
  
  // Two-step delivery verification
  driverMarkedDelivered: false,
  farmerConfirmedDelivery: false,
  
  createdAt:  Timestamp,
  acceptedAt: Timestamp,
  deliveredAt: Timestamp
}
```

---

## 🚀 Getting Started

### Prerequisites
```bash
Node.js v20+
Python 3.10+
Git
```

### Installation

**1. Clone repository**
```bash
git clone https://github.com/yourusername/no-spoilers.git
cd no-spoilers
```

**2. Python virtual environment**
```bash
python -m venv .venv

# Windows
.venv\Scripts\Activate.ps1

# Mac/Linux  
source .venv/bin/activate

pip install flask flask-cors pandas numpy scikit-learn xgboost requests python-dotenv gunicorn
```

**3. Train ML model (run once)**
```bash
cd ml
python train.py
# Output: Model saved to model/spoilage_model.pkl
# MAE: 2.93%
```
## 🔮 Future Roadmap

### Phase 2 — 3 Months

| Feature | Impact | Effort |
|---------|--------|--------|
| WhatsApp notifications via Twilio | Farmer gets SMS when provider accepts | Low |
| Real-time Firestore listeners (onSnapshot) | Status updates without refresh | Low |
| Google Maps quality routing | Better visual route accuracy | Medium |
| Agmarknet daily price sync | Live mandi prices | Medium |
| Mobile PWA | Works offline, installable | Medium |
| Carbon footprint score | CO₂ saved per optimized route | Low |

### Phase 3 — 6 Months

| Feature | Impact | Effort |
|---------|--------|--------|
| Multilingual UI (Kannada, Hindi) | Direct farmer accessibility | Medium |
| FPO (Farmer Producer Org) dashboard | Bulk dispatch management | High |
| Historical analytics per farmer | Season-over-season improvement | Medium |
| ML model retraining pipeline | Accuracy improves with real data | High |
| Provider rating system | Trust and quality assurance | Low |
| Bank integration for payments | Direct earnings transfer | High |

### Phase 4 — 1 Year

| Feature | Impact | Effort |
|---------|--------|--------|
| IoT temperature sensor integration | Real vehicle temperature monitoring | High |
| Satellite crop health data | Pre-harvest quality prediction | High |
| Multi-state expansion | Beyond Karnataka | Medium |
| Insurance integration | Spoilage-based micro-insurance | High |
| Government scheme eligibility checker | Auto-match farmer to subsidies | Medium |

## 📁 Project Structure

```
no-spoilers/
│
├── client/                          # React Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx          # Hero page
│   │   │   ├── Login.jsx            # Auth
│   │   │   ├── Signup.jsx           # Role selection
│   │   │   ├── FarmerDashboard.jsx  # Core farmer interface
│   │   │   └── ProviderDashboard.jsx# Map + jobs
│   │   ├── components/
│   │   │   └── ProfitCalculator.jsx # Financial analysis
│   │   ├── firebase/
│   │   │   └── config.js            # Firebase init
│   │   └── App.jsx                  # Routes + auth
│   └── package.json
│
├── server/                          # Node.js Backend
│   ├── routes/
│   │   ├── ml.js                    # ML orchestration
│   │   └── mandi.js                 # Mandi prices
│   ├── utils/
│   │   ├── weather.js               # OpenWeatherMap
│   │   └── routing.js               # OSRM routing
│   └── index.js
│
└── ml/                              # Python ML
    ├── data/
    │   └── perishability.csv        # FAO-based training data
    ├── model/
    │   ├── spoilage_model.pkl        # Trained XGBoost
    │   ├── crop_encoder.pkl
    │   └── transport_encoder.pkl
    ├── train.py                     # Training script
    └── app.py                       # Flask API
```

---
## 👥 Team

**Khet Set Match**

| Afreed Khan D -> ML Engineer + Full Stack Backend 
| Jathin M -> Frontend Engineer 
| H K Mohan Gowda ->  Research + Presentation 
| Heamanth Gowda -> Testing + Demo 

---


**Built with ❤️ for Indian farmers**

*"Every rupee saved from spoilage is a rupee earned without extra work."*
