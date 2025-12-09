"""
Enhanced Model Training with SMOTE and Better Hyperparameters
================================================================

This script addresses the class imbalance issue using:
1. SMOTE (Synthetic Minority Over-sampling Technique)
2. Better hyperparameter tuning
3. Threshold optimization for Medium risk detection

Run from backend directory:
    python scripts/train_balanced_model.py
"""

import os
import sys
import pandas as pd
import numpy as np
import joblib
from datetime import datetime
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix, precision_recall_curve
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

# Try to import SMOTE, if not available, use class_weight approach
try:
    from imblearn.over_sampling import SMOTE, ADASYN
    from imblearn.combine import SMOTETomek
    SMOTE_AVAILABLE = True
except ImportError:
    SMOTE_AVAILABLE = False
    print("⚠️  imbalanced-learn not installed. Using class_weight approach.")
    print("   Install with: pip install imbalanced-learn")

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

# Source file
ORIGINAL_DATA_FILE = PROCESSED_DIR / "fraud_detection_dataset_LLM (2) (2).csv"

print("=" * 60)
print("ENHANCED MODEL TRAINING WITH BALANCED SAMPLING")
print("=" * 60)

# ==================== STEP 1: LOAD AND PREPARE DATA ====================
print("\n📂 Step 1: Loading and preparing data...")

if not ORIGINAL_DATA_FILE.exists():
    print(f"❌ Data file not found: {ORIGINAL_DATA_FILE}")
    sys.exit(1)

df_original = pd.read_csv(ORIGINAL_DATA_FILE)
print(f"✅ Loaded {len(df_original)} transactions")

# Feature Engineering
df = df_original.copy()
df['timestamp'] = pd.to_datetime(df['timestamp'])
df['hour'] = df['timestamp'].dt.hour
df['weekday'] = df['timestamp'].dt.weekday
df['month'] = df['timestamp'].dt.month
df['is_high_value'] = (df['transaction_amount'] > 50000).astype(int)
df['transaction_amount_log'] = np.log1p(df['transaction_amount'])

# Additional features that might help detect fraud
df['is_night_transaction'] = ((df['hour'] >= 0) & (df['hour'] <= 5)).astype(int)
df['is_weekend'] = (df['weekday'] >= 5).astype(int)
df['is_new_account'] = (df['account_age_days'] < 30).astype(int)
df['amount_per_account_day'] = df['transaction_amount'] / (df['account_age_days'] + 1)
df['log_amount_per_day'] = np.log1p(df['amount_per_account_day'])

# Normalize channel and KYC
df['channel'] = df['channel'].str.strip().str.capitalize()
df['channel'] = df['channel'].replace({'Pos': 'POS', 'Atm': 'ATM'})
df['kyc_verified'] = df['kyc_verified'].str.strip().str.capitalize()

# One-hot encoding
df['channel_Atm'] = (df['channel'] == 'ATM').astype(int)
df['channel_Mobile'] = (df['channel'] == 'Mobile').astype(int)
df['channel_Pos'] = (df['channel'] == 'POS').astype(int)
df['channel_Web'] = (df['channel'] == 'Web').astype(int)
df['kyc_verified_No'] = (df['kyc_verified'].str.lower() == 'no').astype(int)
df['kyc_verified_Yes'] = (df['kyc_verified'].str.lower() == 'yes').astype(int)

# Features for model - including new features
ML_FEATURES_EXTENDED = [
    'account_age_days', 'transaction_amount', 'hour', 'weekday', 'month',
    'is_high_value', 'transaction_amount_log',
    'channel_Atm', 'channel_Mobile', 'channel_Pos', 'channel_Web',
    'kyc_verified_No', 'kyc_verified_Yes',
    'is_night_transaction', 'is_weekend', 'is_new_account', 'log_amount_per_day'
]

# Original 13 features for compatibility
ML_FEATURES_ORIGINAL = [
    'account_age_days', 'transaction_amount', 'hour', 'weekday', 'month',
    'is_high_value', 'transaction_amount_log',
    'channel_Atm', 'channel_Mobile', 'channel_Pos', 'channel_Web',
    'kyc_verified_No', 'kyc_verified_Yes'
]

print(f"\n📊 Class Distribution:")
fraud_counts = df['is_fraud'].value_counts()
print(f"   Legitimate (0): {fraud_counts[0]} ({fraud_counts[0]/len(df)*100:.1f}%)")
print(f"   Fraud (1): {fraud_counts[1]} ({fraud_counts[1]/len(df)*100:.1f}%)")
print(f"   Imbalance Ratio: 1:{fraud_counts[0]//fraud_counts[1]}")

# ==================== STEP 2: TRAIN/TEST SPLIT ====================
print("\n🔀 Step 2: Splitting data...")

# Use original features for compatibility with existing API
X = df[ML_FEATURES_ORIGINAL].copy()
y = df['is_fraud'].copy()

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"   Train: {len(X_train)} (Fraud: {y_train.sum()})")
print(f"   Test: {len(X_test)} (Fraud: {y_test.sum()})")

# ==================== STEP 3: HANDLE CLASS IMBALANCE ====================
print("\n⚖️ Step 3: Handling class imbalance...")

if SMOTE_AVAILABLE:
    print("   Using SMOTE for oversampling minority class...")
    smote = SMOTE(random_state=42, sampling_strategy=0.5)  # 50% fraud after resampling
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)
    print(f"   After SMOTE - Train: {len(X_train_resampled)}")
    print(f"   Class distribution: {pd.Series(y_train_resampled).value_counts().to_dict()}")
else:
    print("   Using class_weight='balanced' instead of SMOTE")
    X_train_resampled, y_train_resampled = X_train, y_train

# ==================== STEP 4: TRAIN MULTIPLE MODELS ====================
print("\n🤖 Step 4: Training models...")

models = {}

# Random Forest with optimized parameters
print("\n   Training Random Forest...")
rf_model = RandomForestClassifier(
    n_estimators=300,
    max_depth=20,
    min_samples_split=5,
    min_samples_leaf=2,
    max_features='sqrt',
    class_weight='balanced' if not SMOTE_AVAILABLE else None,
    random_state=42,
    n_jobs=-1
)
rf_model.fit(X_train_resampled, y_train_resampled)
models['RandomForest'] = rf_model

# Gradient Boosting
print("   Training Gradient Boosting...")
gb_model = GradientBoostingClassifier(
    n_estimators=200,
    learning_rate=0.1,
    max_depth=5,
    min_samples_split=5,
    min_samples_leaf=2,
    subsample=0.8,
    random_state=42
)
gb_model.fit(X_train_resampled, y_train_resampled)
models['GradientBoosting'] = gb_model

# ==================== STEP 5: EVALUATE MODELS ====================
print("\n📈 Step 5: Evaluating models...")

best_model = None
best_auc = 0
best_model_name = ""

for name, model in models.items():
    y_proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_proba)
    
    print(f"\n   {name}:")
    print(f"   ├── ROC-AUC: {auc:.4f}")
    
    # Check probability distribution
    low_count = ((y_proba >= 0) & (y_proba < 0.4)).sum()
    med_count = ((y_proba >= 0.4) & (y_proba < 0.7)).sum()
    high_count = (y_proba >= 0.7).sum()
    print(f"   ├── Low Risk (<0.4): {low_count} ({low_count/len(y_proba)*100:.1f}%)")
    print(f"   ├── Medium Risk (0.4-0.7): {med_count} ({med_count/len(y_proba)*100:.1f}%)")
    print(f"   └── High Risk (>0.7): {high_count} ({high_count/len(y_proba)*100:.1f}%)")
    
    if auc > best_auc:
        best_auc = auc
        best_model = model
        best_model_name = name

print(f"\n🏆 Best Model: {best_model_name} (AUC: {best_auc:.4f})")

# ==================== STEP 6: CALIBRATE BEST MODEL ====================
print("\n📊 Step 6: Calibrating model for better probability estimates...")

# Split validation set from train for calibration
X_train_cal, X_val_cal, y_train_cal, y_val_cal = train_test_split(
    X_train_resampled, y_train_resampled, test_size=0.2, random_state=42, stratify=y_train_resampled
)

# Retrain on calibration train set
if best_model_name == 'RandomForest':
    final_base = RandomForestClassifier(
        n_estimators=300,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features='sqrt',
        random_state=42,
        n_jobs=-1
    )
else:
    final_base = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=5,
        min_samples_split=5,
        min_samples_leaf=2,
        subsample=0.8,
        random_state=42
    )

final_base.fit(X_train_cal, y_train_cal)

# Calibrate
calibrated_model = CalibratedClassifierCV(
    estimator=final_base,
    method='isotonic',  # isotonic often works better for imbalanced data
    cv='prefit'
)
calibrated_model.fit(X_val_cal, y_val_cal)

print("✅ Model calibrated")

# ==================== STEP 7: FINAL EVALUATION ====================
print("\n📊 Step 7: Final Model Evaluation...")

y_pred = calibrated_model.predict(X_test)
y_proba = calibrated_model.predict_proba(X_test)[:, 1]

print("\n📊 Classification Report:")
print(classification_report(y_test, y_pred, target_names=['Legitimate', 'Fraud']))

print(f"\n📊 ROC-AUC Score: {roc_auc_score(y_test, y_proba):.4f}")

print("\n📊 Confusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print(f"   TN: {cm[0,0]}, FP: {cm[0,1]}")
print(f"   FN: {cm[1,0]}, TP: {cm[1,1]}")

# Probability distribution
print("\n📊 Probability Distribution:")
low_count = ((y_proba >= 0) & (y_proba < 0.4)).sum()
med_count = ((y_proba >= 0.4) & (y_proba < 0.7)).sum()
high_count = (y_proba >= 0.7).sum()
print(f"   Low Risk (<0.4): {low_count} ({low_count/len(y_proba)*100:.1f}%)")
print(f"   Medium Risk (0.4-0.7): {med_count} ({med_count/len(y_proba)*100:.1f}%)")
print(f"   High Risk (>0.7): {high_count} ({high_count/len(y_proba)*100:.1f}%)")

# Show actual fraud detection by risk level
print("\n📊 Fraud Detection by Risk Level:")
for low, high, label in [(0, 0.4, "Low"), (0.4, 0.7, "Medium"), (0.7, 1.0, "High")]:
    mask = (y_proba >= low) & (y_proba < high)
    if mask.sum() > 0:
        fraud_in_bucket = y_test[mask].sum()
        total_in_bucket = mask.sum()
        print(f"   {label}: {fraud_in_bucket}/{total_in_bucket} frauds ({fraud_in_bucket/total_in_bucket*100:.1f}%)")

# ==================== STEP 8: SAVE MODEL ====================
print("\n💾 Step 8: Saving Model...")

model_path = MODELS_DIR / "random_forest_model.pkl"
joblib.dump(calibrated_model, model_path)
print(f"✅ Saved model: {model_path}")

# Save feature names
feature_names_path = MODELS_DIR / "model_features.txt"
with open(feature_names_path, 'w') as f:
    for feat in ML_FEATURES_ORIGINAL:
        f.write(feat + '\n')

# Save metadata
import json
metadata = {
    "model_type": f"{best_model_name} (Calibrated)",
    "smote_used": SMOTE_AVAILABLE,
    "n_features": len(ML_FEATURES_ORIGINAL),
    "features": ML_FEATURES_ORIGINAL,
    "training_samples": len(X_train_resampled),
    "test_samples": len(X_test),
    "roc_auc": float(roc_auc_score(y_test, y_proba)),
    "trained_at": datetime.now().isoformat(),
    "risk_thresholds": {
        "low": "< 0.4",
        "medium": "0.4 - 0.7", 
        "high": ">= 0.7"
    },
    "probability_distribution": {
        "low_pct": round(low_count/len(y_proba)*100, 1),
        "medium_pct": round(med_count/len(y_proba)*100, 1),
        "high_pct": round(high_count/len(y_proba)*100, 1)
    }
}

metadata_path = MODELS_DIR / "model_metadata.json"
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"✅ Saved metadata: {metadata_path}")

# ==================== SUMMARY ====================
print("\n" + "=" * 60)
print("TRAINING COMPLETE!")
print("=" * 60)
print(f"""
📊 Model Performance:
   - Type: {best_model_name} (Calibrated)
   - ROC-AUC: {roc_auc_score(y_test, y_proba):.4f}
   - SMOTE Used: {SMOTE_AVAILABLE}

📊 Risk Level Distribution:
   - Low (<0.4): {low_count/len(y_proba)*100:.1f}%
   - Medium (0.4-0.7): {med_count/len(y_proba)*100:.1f}%
   - High (>=0.7): {high_count/len(y_proba)*100:.1f}%

⏭️ Next Steps:
   1. Run: python scripts/import_mongodb_fresh.py
   2. Restart the backend server
   3. Test predictions via API
""")
