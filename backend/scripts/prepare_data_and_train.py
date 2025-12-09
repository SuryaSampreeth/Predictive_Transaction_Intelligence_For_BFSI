"""
Complete Data Preparation and Model Training Pipeline
=====================================================

This script:
1. Loads the original fraud detection dataset (with raw channel/kyc columns)
2. Creates engineered features for ML training
3. Saves MongoDB-ready data (with original channel names)
4. Trains a Random Forest model with proper calibration for Low/Medium/High risk
5. Saves the trained model and preprocessor

Run from backend directory:
    python scripts/prepare_data_and_train.py
"""

import os
import sys
import pandas as pd
import numpy as np
import joblib
from datetime import datetime
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

# Setup paths
SCRIPT_DIR = Path(__file__).parent
BACKEND_DIR = SCRIPT_DIR.parent
DATA_DIR = BACKEND_DIR / "data"
PROCESSED_DIR = DATA_DIR / "processed"
RAW_DIR = DATA_DIR / "raw"
OUTPUTS_DIR = BACKEND_DIR / "outputs"
MODELS_DIR = OUTPUTS_DIR / "all_models"

# Ensure directories exist
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Source file - original dataset with raw channel column
ORIGINAL_DATA_FILE = PROCESSED_DIR / "fraud_detection_dataset_LLM (2) (2).csv"

print("=" * 60)
print("FRAUD DETECTION - DATA PREPARATION & MODEL TRAINING")
print("=" * 60)

# ==================== STEP 1: LOAD ORIGINAL DATA ====================
print("\n📂 Step 1: Loading original dataset...")

if not ORIGINAL_DATA_FILE.exists():
    print(f"❌ Original data file not found: {ORIGINAL_DATA_FILE}")
    sys.exit(1)

df_original = pd.read_csv(ORIGINAL_DATA_FILE)
print(f"✅ Loaded {len(df_original)} transactions")
print(f"📋 Columns: {list(df_original.columns)}")
print(f"\n📊 Sample data:\n{df_original.head()}")

# ==================== STEP 2: DATA VALIDATION ====================
print("\n🔍 Step 2: Validating data...")

required_columns = ['transaction_id', 'customer_id', 'kyc_verified', 'account_age_days', 
                   'transaction_amount', 'channel', 'timestamp', 'is_fraud']

missing = [c for c in required_columns if c not in df_original.columns]
if missing:
    print(f"❌ Missing required columns: {missing}")
    sys.exit(1)

print(f"✅ All required columns present")

# Check fraud distribution
fraud_counts = df_original['is_fraud'].value_counts()
print(f"\n📊 Fraud Distribution:")
print(f"   Legitimate (0): {fraud_counts.get(0, 0)} ({fraud_counts.get(0, 0)/len(df_original)*100:.1f}%)")
print(f"   Fraud (1): {fraud_counts.get(1, 0)} ({fraud_counts.get(1, 0)/len(df_original)*100:.1f}%)")

# Check channel distribution
print(f"\n📊 Channel Distribution:")
print(df_original['channel'].value_counts())

# Check KYC distribution
print(f"\n📊 KYC Verified Distribution:")
print(df_original['kyc_verified'].value_counts())

# ==================== STEP 3: FEATURE ENGINEERING ====================
print("\n⚙️ Step 3: Feature Engineering...")

df = df_original.copy()

# Parse timestamp and extract time features
df['timestamp'] = pd.to_datetime(df['timestamp'])
df['hour'] = df['timestamp'].dt.hour
df['weekday'] = df['timestamp'].dt.weekday  # 0=Monday, 6=Sunday
df['month'] = df['timestamp'].dt.month

# High value transaction flag (> 50000)
HIGH_VALUE_THRESHOLD = 50000
df['is_high_value'] = (df['transaction_amount'] > HIGH_VALUE_THRESHOLD).astype(int)

# Log transform of amount (for model training)
df['transaction_amount_log'] = np.log1p(df['transaction_amount'])

# Normalize channel names
df['channel'] = df['channel'].str.strip().str.capitalize()
df['channel'] = df['channel'].replace({'Pos': 'POS', 'Atm': 'ATM'})

# Normalize KYC
df['kyc_verified'] = df['kyc_verified'].str.strip().str.capitalize()

# One-hot encode channel for ML
channel_dummies = pd.get_dummies(df['channel'], prefix='channel')
# Ensure all expected channel columns exist
for col in ['channel_ATM', 'channel_Mobile', 'channel_POS', 'channel_Web']:
    if col not in channel_dummies.columns:
        channel_dummies[col] = 0

# Rename to match expected feature names (Atm instead of ATM)
channel_dummies = channel_dummies.rename(columns={
    'channel_ATM': 'channel_Atm',
    'channel_POS': 'channel_Pos'
})

# One-hot encode KYC for ML
df['kyc_verified_No'] = (df['kyc_verified'].str.lower() == 'no').astype(int)
df['kyc_verified_Yes'] = (df['kyc_verified'].str.lower() == 'yes').astype(int)

# Combine with main dataframe
df = pd.concat([df, channel_dummies], axis=1)

print(f"✅ Feature engineering complete")
print(f"📋 New columns: {list(df.columns)}")

# ==================== STEP 4: CREATE ML-READY DATASET ====================
print("\n📁 Step 4: Creating ML-ready dataset...")

# Features for ML model (13 features)
ML_FEATURES = [
    'account_age_days', 'transaction_amount', 'hour', 'weekday', 'month',
    'is_high_value', 'transaction_amount_log',
    'channel_Atm', 'channel_Mobile', 'channel_Pos', 'channel_Web',
    'kyc_verified_No', 'kyc_verified_Yes'
]

# Ensure all ML features exist
for feat in ML_FEATURES:
    if feat not in df.columns:
        print(f"⚠️  Missing feature {feat}, creating with zeros")
        df[feat] = 0

# Create ML dataset
df_ml = df[['transaction_id', 'customer_id', 'timestamp'] + ML_FEATURES + ['is_fraud']].copy()

# Save ML-ready CSV (for model training reference)
ml_output_path = RAW_DIR / "transactions_clean.csv"
df_ml.to_csv(ml_output_path, index=False)
print(f"✅ Saved ML-ready dataset: {ml_output_path}")

# ==================== STEP 5: CREATE MONGODB-READY DATASET ====================
print("\n📁 Step 5: Creating MongoDB-ready dataset...")

# MongoDB needs BOTH the raw channel AND the ML features
df_mongo = df[[
    'transaction_id', 'customer_id', 'timestamp',
    'account_age_days', 'transaction_amount', 
    'channel',  # RAW channel name
    'kyc_verified',  # RAW kyc status
    'is_fraud',
    'hour', 'weekday', 'month', 
    'is_high_value', 'transaction_amount_log',
    'channel_Atm', 'channel_Mobile', 'channel_Pos', 'channel_Web',
    'kyc_verified_No', 'kyc_verified_Yes'
]].copy()

mongo_output_path = PROCESSED_DIR / "transactions_mongodb_ready.csv"
df_mongo.to_csv(mongo_output_path, index=False)
print(f"✅ Saved MongoDB-ready dataset: {mongo_output_path}")

# ==================== STEP 6: TRAIN/VAL/TEST SPLIT ====================
print("\n🔀 Step 6: Splitting data into Train/Validation/Test...")

# Features and target
X = df[ML_FEATURES].copy()
y = df['is_fraud'].copy()

# First split: 85% train+val, 15% test
X_train_full, X_test, y_train_full, y_test = train_test_split(
    X, y, test_size=0.15, random_state=42, stratify=y
)

# Second split: ~82.5% train, ~17.5% val (of full) -> actual 70% train, 15% val, 15% test
X_train, X_val, y_train, y_val = train_test_split(
    X_train_full, y_train_full, test_size=0.1765, random_state=42, stratify=y_train_full
)

print(f"✅ Split sizes:")
print(f"   Train: {len(X_train)} ({len(X_train)/len(df)*100:.1f}%)")
print(f"   Validation: {len(X_val)} ({len(X_val)/len(df)*100:.1f}%)")
print(f"   Test: {len(X_test)} ({len(X_test)/len(df)*100:.1f}%)")

# Save splits for reference
for name, data_x, data_y, fname in [
    ("train", X_train, y_train, "train.csv"),
    ("validation", X_val, y_val, "validation.csv"),
    ("test", X_test, y_test, "test.csv"),
]:
    df_split = data_x.copy()
    df_split['is_fraud'] = data_y.values
    df_split.to_csv(PROCESSED_DIR / fname, index=False)
    print(f"   Saved {name} -> {PROCESSED_DIR / fname}")

# ==================== STEP 7: TRAIN RANDOM FOREST MODEL ====================
print("\n🤖 Step 7: Training Random Forest Model...")

# Use class_weight to handle imbalance
rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight='balanced_subsample',  # Handle class imbalance
    random_state=42,
    n_jobs=-1
)

print("   Training base model...")
rf_model.fit(X_train, y_train)

# ==================== STEP 8: CALIBRATE MODEL FOR BETTER PROBABILITIES ====================
print("\n📊 Step 8: Calibrating model for better probability estimates...")

# Calibrated model produces better probability estimates for risk scoring
calibrated_model = CalibratedClassifierCV(
    estimator=rf_model,
    method='sigmoid',  # Platt scaling
    cv='prefit'  # Use pre-trained model
)

calibrated_model.fit(X_val, y_val)
print("✅ Model calibrated")

# ==================== STEP 9: EVALUATE MODEL ====================
print("\n📈 Step 9: Evaluating Model Performance...")

# Predictions on test set
y_pred = calibrated_model.predict(X_test)
y_proba = calibrated_model.predict_proba(X_test)[:, 1]

print("\n📊 Classification Report:")
print(classification_report(y_test, y_pred, target_names=['Legitimate', 'Fraud']))

print(f"\n📊 ROC-AUC Score: {roc_auc_score(y_test, y_proba):.4f}")

print("\n📊 Confusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print(f"   TN: {cm[0,0]}, FP: {cm[0,1]}")
print(f"   FN: {cm[1,0]}, TP: {cm[1,1]}")

# ==================== STEP 10: ANALYZE PROBABILITY DISTRIBUTION ====================
print("\n📊 Step 10: Analyzing Probability Distribution for Risk Levels...")

# Check distribution of probabilities
proba_bins = [
    (0.0, 0.4, "Low"),
    (0.4, 0.7, "Medium"),
    (0.7, 1.0, "High")
]

print("\nProbability Distribution on Test Set:")
for low, high, label in proba_bins:
    count = ((y_proba >= low) & (y_proba < high)).sum()
    pct = count / len(y_proba) * 100
    print(f"   {label} Risk ({low:.1f}-{high:.1f}): {count} ({pct:.1f}%)")

# Show some examples from each bucket
print("\n📋 Sample Predictions by Risk Level:")
for low, high, label in proba_bins:
    mask = (y_proba >= low) & (y_proba < high)
    if mask.sum() > 0:
        print(f"\n   {label} Risk Examples (first 3):")
        indices = np.where(mask)[0][:3]
        for idx in indices:
            print(f"      Prob: {y_proba[idx]:.3f}, Actual: {'Fraud' if y_test.iloc[idx] == 1 else 'Legit'}")

# ==================== STEP 11: SAVE MODEL ====================
print("\n💾 Step 11: Saving Trained Model...")

# Save the calibrated model
model_path = MODELS_DIR / "random_forest_model.pkl"
joblib.dump(calibrated_model, model_path)
print(f"✅ Saved model: {model_path}")

# Also save feature names for reference
feature_names_path = MODELS_DIR / "model_features.txt"
with open(feature_names_path, 'w') as f:
    for feat in ML_FEATURES:
        f.write(feat + '\n')
print(f"✅ Saved feature names: {feature_names_path}")

# ==================== STEP 12: CREATE MODEL METADATA ====================
print("\n📝 Step 12: Creating Model Metadata...")

metadata = {
    "model_type": "RandomForestClassifier (Calibrated)",
    "n_estimators": 200,
    "max_depth": 15,
    "n_features": len(ML_FEATURES),
    "features": ML_FEATURES,
    "training_samples": len(X_train),
    "validation_samples": len(X_val),
    "test_samples": len(X_test),
    "roc_auc": float(roc_auc_score(y_test, y_proba)),
    "trained_at": datetime.now().isoformat(),
    "risk_thresholds": {
        "low": "< 0.4",
        "medium": "0.4 - 0.7",
        "high": "> 0.7"
    }
}

import json
metadata_path = MODELS_DIR / "model_metadata.json"
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"✅ Saved metadata: {metadata_path}")

# ==================== SUMMARY ====================
print("\n" + "=" * 60)
print("TRAINING COMPLETE!")
print("=" * 60)
print(f"""
📁 Files Created:
   - ML Training Data:     {ml_output_path}
   - MongoDB Ready Data:   {mongo_output_path}
   - Train Split:          {PROCESSED_DIR / 'train.csv'}
   - Validation Split:     {PROCESSED_DIR / 'validation.csv'}
   - Test Split:           {PROCESSED_DIR / 'test.csv'}
   - Trained Model:        {model_path}
   - Feature Names:        {feature_names_path}
   - Model Metadata:       {metadata_path}

📊 Model Performance:
   - ROC-AUC: {roc_auc_score(y_test, y_proba):.4f}
   - Test Accuracy: {(y_pred == y_test).mean():.4f}

🎯 Risk Level Thresholds:
   - Low:    probability < 0.4
   - Medium: 0.4 <= probability < 0.7
   - High:   probability >= 0.7

⏭️ Next Steps:
   1. Run: python scripts/import_mongodb_fresh.py
      To import fresh data into MongoDB with proper channels
""")
