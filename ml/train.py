# ============================================================
# train.py — ML Model Training Script
# Ye script ek baar chalao — model train hoga aur 
# model/spoilage_model.pkl file mein save ho jayega
# ============================================================

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error
import xgboost as xgb
import pickle
import os

# ----------------------------------------
# Step 1 — CSV Data Load karo
# ----------------------------------------
# perishability.csv mein crop ke hisaab se
# temperature, travel time, humidity ke saath
# spoilage percentage ka data hai
df = pd.read_csv('data/perishability.csv')
print("Data loaded successfully!")
print(df.head())
print(f"Total rows: {len(df)}")

# ----------------------------------------
# Step 2 — Categorical Columns Encode karo
# ----------------------------------------
# ML model sirf numbers samajhta hai
# isliye crop aur transport_type ko numbers mein convert karo
# Example: Tomato=0, Onion=1, Mango=2 etc.
le_crop = LabelEncoder()
le_transport = LabelEncoder()

df['crop_encoded'] = le_crop.fit_transform(df['crop'])
df['transport_encoded'] = le_transport.fit_transform(df['transport_type'])

print(f"\nCrop classes: {list(le_crop.classes_)}")
print(f"Transport classes: {list(le_transport.classes_)}")

# ----------------------------------------
# Step 3 — Features aur Target define karo
# ----------------------------------------
# Features (X) = jo cheezein model ko input milti hain
# Target (y) = jo cheez model predict karega (spoilage %)
X = df[['crop_encoded', 'travel_hours', 'temperature_celsius', 
        'humidity_percent', 'transport_encoded']]
y = df['spoilage_percent']

print(f"\nFeatures shape: {X.shape}")
print(f"Target shape: {y.shape}")

# ----------------------------------------
# Step 4 — Train/Test Split karo
# ----------------------------------------
# 80% data se model train hoga
# 20% data se model test hoga (accuracy check ke liye)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ----------------------------------------
# Step 5 — XGBoost Model banao aur train karo
# ----------------------------------------
# XGBoost ek powerful gradient boosting algorithm hai
# regression task ke liye use kar rahe hain
# kyunki output ek continuous number hai (spoilage %)
model = xgb.XGBRegressor(
    n_estimators=100,      # 100 decision trees
    max_depth=4,           # har tree ki max depth
    learning_rate=0.1,     # step size
    random_state=42
)

model.fit(X_train, y_train)
print("\nModel training complete!")

# ----------------------------------------
# Step 6 — Model Accuracy Check karo
# ----------------------------------------
# MAE = Mean Absolute Error
# agar MAE = 3 hai matlab prediction mein avg 3% ka error hai
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
print(f"Model MAE (Mean Absolute Error): {mae:.2f}%")

# ----------------------------------------
# Step 7 — Model aur Encoders Save karo
# ----------------------------------------
# pickle se model ko file mein save karte hain
# app.py is file ko load karke predictions deta hai
os.makedirs('model', exist_ok=True)

with open('model/spoilage_model.pkl', 'wb') as f:
    pickle.dump(model, f)

with open('model/crop_encoder.pkl', 'wb') as f:
    pickle.dump(le_crop, f)

with open('model/transport_encoder.pkl', 'wb') as f:
    pickle.dump(le_transport, f)

print("\nModel saved to model/spoilage_model.pkl")
print("Crop encoder saved to model/crop_encoder.pkl")
print("Transport encoder saved to model/transport_encoder.pkl")
print("\nTraining complete! Now run app.py")