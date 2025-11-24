import json
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS 
# Assume you have scikit-learn or a similar library installed
# import joblib 
import numpy as np 
# --- CONFIGURATION ---
MODEL_PATH = 'models/trained_fraud_model.pkl'
SUPPORTED_CHANNELS = ['Web', 'Mobile', 'Pos', 'Atm']

# --- PLACEHOLDERS (Replace with real ML logic) ---

def load_ml_model(path):
    """Placeholder for loading the serialized machine learning model."""
    print(f"INFO: Loading model from {path}...")
    # For now, return a dummy object
    class DummyModel:
        def predict_proba(self, features):
            """
            Simulate risk score using key features from the CSV data:
            - transaction_amount (higher = more risk)
            - account_age_days (lower = more risk)
            - channel_Web (Web is often higher risk)
            """
            amount = features.get('transaction_amount', 0)
            age = features.get('account_age_days', 1000)
            is_web = features.get('channel_Web', 0)
            
            # Simple simulation function (not a real model prediction)
            base_risk = min(0.1 + (amount / 10000.0), 0.95)
            
            # Adjust risk based on features
            risk_score = base_risk + (0.05 if is_web else 0) - (0.05 * (age / 1000))
            
            final_risk = max(0.05, min(0.95, risk_score)) # Clamp between 5% and 95%
            return final_risk
    
        def get_features_for_inference(self, data):
            """
            This function prepares the raw input data into the structured 
            feature vector expected by the ML model, matching the CSV columns.
            """
            
            # 1. Direct Input Features
            features = {
                'customer_id': data.get('customer_id'),
                'transaction_amount': data.get('amount', 0),
                'account_age_days': data.get('account_age_days', 0),
            }
            
            # 2. Time-Based Derived Features (from 'timestamp' column in CSV)
            current_dt = datetime.now()
            features['hour'] = current_dt.hour
            features['weekday'] = current_dt.weekday()
            features['month'] = current_dt.month
            
            # 3. One-Hot Encoded Features (Channels)
            channel = data.get('channel', 'Web') # Default to 'Web' if missing
            for chan in SUPPORTED_CHANNELS:
                 # Matches CSV column names: channel_Atm, channel_Mobile, etc.
                features[f'channel_{chan}'] = 1.0 if channel.lower() == chan.lower() else 0.0
            
            # 4. Binary/Engineered Features (Like 'is_high_value' in CSV)
            features['is_high_value'] = 1.0 if features['transaction_amount'] > 1000 else 0.0
            
            # 5. Log Transformation (Like 'transaction_amount_log' in CSV)
            features['transaction_amount_log'] = np.log1p(features['transaction_amount']) if features['transaction_amount'] > 0 else 0.0
            
            return features

    return DummyModel()

# --- FLASK APP SETUP ---
app = Flask(__name__)
# CRITICAL FIX: Explicitly allow the custom X-API-Key header to pass the CORS preflight check
CORS(app, resources={r"/predict": {"origins": "*", "allow_headers": ["Content-Type", "X-API-Key"]}})
MODEL = load_ml_model(MODEL_PATH)

# NEW: Health check route for the root path
@app.route('/', methods=['GET'])
def home():
    """Simple status check for the root URL."""
    return jsonify({
        "status": "OK",
        "service": "Fraud Prediction API",
        "model_loaded": "Simulated XGBoost v1.2.3",
        "endpoint": "/predict (POST)"
    }), 200

@app.route('/predict', methods=['POST'])
def predict_fraud():
    """Main prediction endpoint for real-time fraud scoring."""
    start_time = time.time()
    
    # 1. API Key Check (Now inline for the /predict endpoint only, as required)
    API_KEY_HEADER = 'X-API-Key'
    VALID_API_KEY = 'super_secret_bfsi_key_123'
    api_key = request.headers.get(API_KEY_HEADER)
    if api_key != VALID_API_KEY:
         return jsonify({
            "status": "error",
            "message": "Unauthorized access. Invalid API key provided."
        }), 401
    
    # 2. Input Validation and Parsing
    try:
        data = request.get_json(force=True)
        # Required fields now align with customer_id, amount, and the new features
        required_fields = ['transaction_id', 'customer_id', 'amount', 'account_age_days', 'channel']
        if not all(field in data for field in required_fields):
            return jsonify({
                "status": "error", 
                "message": f"Missing required fields. Needs: {', '.join(required_fields)}"
            }), 400
    except Exception:
        return jsonify({
            "status": "error", 
            "message": "Invalid JSON format."
        }), 400

    transaction_id = data['transaction_id']

    try:
        # 3. Feature Engineering & Preprocessing
        features_for_model = MODEL.get_features_for_inference(data)
        
        # 4. Model Inference (Prediction)
        risk_score = MODEL.predict_proba(features_for_model)

        # 5. Decision Engine Logic (Business Rules + Score)
        decision = "ALLOW"
        
        RISK_THRESHOLD_HIGH = 0.75
        RISK_THRESHOLD_MEDIUM = 0.50
        
        if risk_score >= RISK_THRESHOLD_HIGH:
            decision = "DENY" 
        elif risk_score >= RISK_THRESHOLD_MEDIUM:
            decision = "FLAG_FOR_REVIEW" 
        
        # 6. Response Generation
        latency_ms = (time.time() - start_time) * 1000 
        
        response = {
            "transaction_id": transaction_id,
            "status": "success",
            "risk_score": round(risk_score, 4),
            "decision": decision,
            "message": f"Fraud risk score determined. Action: {decision}",
            "metadata": {
                "latency_ms": round(latency_ms, 2),
                "model_used": "XGBoost v1.2.3"
            }
        }
        
        return jsonify(response), 200

    except Exception as e:
        print(f"FATAL ERROR in /predict: {e}")
        return jsonify({
            "status": "error",
            "message": f"An unexpected error occurred during prediction: {e}"
        }), 500

if __name__ == '__main__':
    # To run: set FLASK_APP=fraud_detection_api.py; flask run
    # For production, use a WSGI server like Gunicorn or deploy on cloud infrastructure.
    app.run(debug=True, host='0.0.0.0', port=5000)