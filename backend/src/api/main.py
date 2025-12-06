from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
from io import BytesIO
from uuid import uuid4

# Import database operations
from ..database.config import get_database, close_database
from ..database import operations as db_ops
from ..database.models import TransactionModel, PredictionModel, ModelMetricsModel

# Import Gemini for LLM explanations
from ..utils.gemini_client import generate_fraud_explanation, generate_model_explanation

# Import routers
from .routers import settings, cases, modeling, monitoring, simulation, alerts

# Import Fraud Detection Engine (Milestone 3)
from ..detection import get_fraud_engine, initialize_fraud_engine

app = FastAPI(title="Fraud Detection API - TransIntelliFlow", version="1.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8081", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(settings.router)
app.include_router(cases.router)
app.include_router(modeling.router)
app.include_router(monitoring.router)
app.include_router(simulation.router)
app.include_router(alerts.router)

# ==================== MODEL LOADING (Updated to match app.py) ====================

class RenameUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        # Map old module names to new package structure
        if module == "preprocessing":
            module = "src.preprocessing"
        elif module == "preprocessor":
            module = "src.preprocessing"
        return super().find_class(module, name)

def load_pickle_with_rename(path):
    with open(path, "rb") as f:
        return RenameUnpickler(f).load()

# Updated model paths to match app.py
MODEL_PATH = "outputs/all_models/random_forest_model.pkl"
PREPROCESSOR_PATH = "src/preprocessing/preprocessor.pkl"

print("🔄 Loading model & preprocessor...")

model = joblib.load(MODEL_PATH)
preprocessor = load_pickle_with_rename(PREPROCESSOR_PATH)

print("✅ Model Loaded:", type(model))
print("✅ Preprocessor Loaded:", type(preprocessor))
print("Model expects:", model.feature_names_in_)

# Initialize Fraud Detection Engine (Milestone 3)
fraud_engine = initialize_fraud_engine(model=model, preprocessor=preprocessor)
print("✅ Fraud Detection Engine Initialized")

MODEL_FEATURE_ORDER = list(model.feature_names_in_)
N_FEATURES = len(MODEL_FEATURE_ORDER)

# Pre-create numpy array template for faster predictions (avoid DataFrame overhead)
import numpy as np
FEATURE_ARRAY_TEMPLATE = np.zeros((1, N_FEATURES), dtype=np.float64)

# ==================== HELPER FUNCTIONS ====================

def _determine_risk_level(probability: float) -> str:
    if probability > 0.7:
        return "High"
    if probability > 0.4:
        return "Medium"
    return "Low"

def _channel_feature_flags(channel: str) -> Dict[str, int]:
    normalized = (channel or "").strip().lower()
    flags = {
        "channel_atm": 0,
        "channel_mobile": 0,
        "channel_pos": 0,
        "channel_web": 0,
    }
    mapping = {
        "atm": "channel_atm",
        "mobile": "channel_mobile",
        "pos": "channel_pos",
        "web": "channel_web",
    }
    key = mapping.get(normalized)
    if key:
        flags[key] = 1
    else:
        flags["channel_web"] = 1
    
    renamed = {
        "channel_Atm": flags["channel_atm"],
        "channel_Mobile": flags["channel_mobile"],
        "channel_Pos": flags["channel_pos"],
        "channel_Web": flags["channel_web"],
    }
    return renamed

def _kyc_flags(kyc_status: str) -> Dict[str, int]:
    normalized = (kyc_status or "No").strip().lower()
    return {
        "kyc_verified_No": 1 if normalized == "no" else 0,
        "kyc_verified_Yes": 1 if normalized == "yes" else 0,
    }

def _build_engineered_features_basic(
    transaction_amount: float,
    account_age_days: int,
    hour: int,
    channel: str,
    kyc_verified: str,
) -> Dict[str, Any]:
    channel_flags = _channel_feature_flags(channel)
    kyc_flags = _kyc_flags(kyc_verified)
    engineered = {
        "account_age_days": account_age_days,
        "transaction_amount": transaction_amount,
        "hour": hour,
        "weekday": datetime.utcnow().weekday(),
        "month": datetime.utcnow().month,
        "is_high_value": int(transaction_amount > 50000),  # Fixed: threshold is 50000 to match training data
        "transaction_amount_log": 0 if transaction_amount <= 0 else float(np.log1p(transaction_amount)),
    }
    engineered.update(channel_flags)
    engineered.update(kyc_flags)
    return engineered

def _run_model_prediction(engineered_features: Dict[str, Any]) -> Dict[str, Any]:
    """Run ML model prediction - OPTIMIZED for speed (no DataFrame overhead)"""
    # Build feature array directly (much faster than DataFrame)
    feature_array = FEATURE_ARRAY_TEMPLATE.copy()
    for i, feature_name in enumerate(MODEL_FEATURE_ORDER):
        feature_array[0, i] = engineered_features.get(feature_name, 0)
    
    # Get predictions directly on numpy array (faster than DataFrame)
    pred = int(model.predict(feature_array)[0])
    probas = model.predict_proba(feature_array)[0]
    prob = float(probas[1])  # Probability of fraud
    
    risk_level = _determine_risk_level(prob)
    confidence = round(abs(prob - 0.5) * 200, 2)
    
    return {
        "prediction": pred,
        "fraud_probability": prob,
        "risk_level": risk_level,
        "confidence": confidence,
    }

def _derive_risk_factors(
    transaction_amount: float,
    account_age_days: int,
    hour: int,
    kyc_verified: str,
    channel: str,
) -> List[str]:
    factors: List[str] = []
    if transaction_amount > 10000:
        factors.append("High transaction amount")
    if account_age_days < 30:
        factors.append("New account (< 30 days)")
    if hour < 6 or hour > 22:
        factors.append("Unusual transaction time")
    if kyc_verified.strip().lower() == "no":
        factors.append("KYC not verified")
    if channel.lower() in ["atm", "pos"] and transaction_amount > 20000:
        factors.append("High-value ATM transaction")
    return factors

def _generate_fraud_reason(
    prediction: int,
    risk_factors: List[str],
    fraud_probability: float,
    transaction_amount: float
) -> str:
    """
    Generate human-readable reason for fraud detection decision.
    Combines ML model output with rule-based flags.
    """
    if prediction == 1:  # Fraud detected
        if len(risk_factors) >= 2:
            return f"⚠️ FRAUD ALERT: {', '.join(risk_factors[:3])}. Immediate investigation required."
        elif len(risk_factors) == 1:
            return f"⚠️ FRAUD DETECTED: {risk_factors[0]}. Transaction blocked for review."
        elif fraud_probability >= 0.7:
            return f"⚠️ HIGH RISK: ML model detected {round(fraud_probability*100)}% fraud probability. Transaction requires verification."
        else:
            return f"⚠️ SUSPICIOUS ACTIVITY: Transaction flagged for potential fraud (confidence: {round(fraud_probability*100)}%)."
    else:  # Legitimate
        return f"✓ Transaction cleared. Normal pattern with low fraud indicators (₹{transaction_amount:,.0f})."

def _apply_rule_based_detection(
    transaction_amount: float,
    account_age_days: int,
    hour: int,
    kyc_verified: str,
    channel: str,
    ml_prediction: int,
    ml_probability: float
) -> tuple[int, List[str], str]:
    """
    Apply rule-based fraud detection logic - Strengthened for simulation patterns.
    Returns: (final_prediction, rule_flags, reason)
    
    BUSINESS RULES:
    1. High-value new account transactions
    2. Unverified KYC with significant amounts
    3. Unusual hour transactions
    4. Very high amounts
    5. New accounts without KYC
    6. High ATM/POS withdrawals
    7. EXTREME FRAUD PATTERNS (for simulation)
    """
    rule_flags = []
    
    # RULE 1: High-value transaction from new account
    if transaction_amount > 10000 and account_age_days < 30:
        rule_flags.append("HIGH_VALUE_NEW_ACCOUNT")
    
    # RULE 2: KYC not verified with significant amount
    if kyc_verified.strip().lower() == "no" and transaction_amount > 5000:
        rule_flags.append("UNVERIFIED_KYC_HIGH_AMOUNT")
    
    # RULE 3: Unusual hour transactions (late night/early morning)
    if hour >= 0 and hour <= 5 and transaction_amount > 3000:
        rule_flags.append("UNUSUAL_HOUR")
    
    # RULE 4: Very high amount (automatic flag)
    if transaction_amount > 50000:
        rule_flags.append("VERY_HIGH_AMOUNT")
    
    # RULE 7: EXTREME FRAUD PATTERN - Brand new account + massive amount + late night + no KYC
    if (account_age_days <= 5 and transaction_amount > 70000 and 
        kyc_verified.strip().lower() == "no" and hour <= 4):
        rule_flags.append("EXTREME_FRAUD_PATTERN")
    
    # RULE 5: New account + unverified KYC
    if account_age_days < 7 and kyc_verified.strip().lower() == "no":
        rule_flags.append("NEW_ACCOUNT_UNVERIFIED")
    
    # RULE 6: ATM withdrawals above threshold
    if channel.lower() in ["atm", "pos"] and transaction_amount > 20000:
        rule_flags.append("HIGH_ATM_WITHDRAWAL")
    
    # Combine ML + Rules for final decision - Strengthened for extreme patterns
    rule_triggered = len(rule_flags) > 0
    
    # EXTREME FRAUD PATTERN - instant fraud detection
    if "EXTREME_FRAUD_PATTERN" in rule_flags:
        final_prediction = 1
    # Multiple red flags (3+) with any ML indication
    elif len(rule_flags) >= 3 and ml_probability > 0.1:
        final_prediction = 1
    # Standard thresholds
    elif rule_triggered and ml_probability > 0.3:
        final_prediction = 1
    elif ml_probability >= 0.7:
        final_prediction = 1
    elif rule_triggered and ml_probability > 0.15:
        final_prediction = 1
    else:
        final_prediction = ml_prediction
    
    # Derive risk factors for reason generation
    risk_factors = _derive_risk_factors(
        transaction_amount, account_age_days, hour, kyc_verified, channel
    )
    
    # Generate reason
    reason = _generate_fraud_reason(
        final_prediction, risk_factors, ml_probability, transaction_amount
    )
    
    return final_prediction, rule_flags, reason

async def _store_prediction_record(transaction_id: str, prediction: Dict[str, Any], transaction_data: Dict[str, Any] = None):
    """Store prediction with full transaction details for history tracking"""
    try:
        payload = {
            "transaction_id": transaction_id,
            "customer_id": transaction_data.get("customer_id", transaction_id) if transaction_data else transaction_id,
            "prediction": prediction.get("prediction", "Legitimate"),
            "fraud_probability": prediction.get("fraud_probability", 0.0),
            "risk_score": prediction.get("fraud_probability", 0.0),
            "risk_level": prediction.get("risk_level", "Low"),
            "reason": prediction.get("reason", ""),
            "rule_flags": prediction.get("rule_flags", []),
            "model_version": os.getenv("MODEL_VERSION", "1.0.0"),
            "predicted_at": datetime.utcnow(),
            # Include transaction details for history display
            "amount": transaction_data.get("amount", 0) if transaction_data else 0,
            "channel": transaction_data.get("channel", "Unknown") if transaction_data else "Unknown",
            "account_age_days": transaction_data.get("account_age_days", 0) if transaction_data else 0,
            "kyc_verified": transaction_data.get("kyc_verified", "Unknown") if transaction_data else "Unknown",
            "hour": transaction_data.get("hour", 0) if transaction_data else 0,
        }
        await db_ops.create_prediction(payload)
    except Exception as exc:
        if "E11000" not in str(exc):
            print(f"Could not store prediction: {exc}")

def _prepare_enhanced_features(transaction: "EnhancedPredictionInput") -> Dict[str, Any]:
    return _build_engineered_features_basic(
        transaction_amount=transaction.transaction_amount,
        account_age_days=transaction.account_age_days,
        hour=transaction.hour,
        channel=transaction.channel,
        kyc_verified=transaction.kyc_verified,
    )

# ==================== PYDANTIC MODELS ====================

class TransactionInput(BaseModel):
    step: int
    type: int
    amount: float
    oldbalanceOrg: float
    newbalanceOrig: float
    oldbalanceDest: float
    newbalanceDest: float
    errorBalanceOrig: float
    errorBalanceDest: float
    transactionType_CASH_OUT: int
    transactionType_TRANSFER: int
    transactionType_PAYMENT: int
    channel_Atm: int = 0
    channel_Mobile: int = 0
    channel_Pos: int = 0
    channel_Web: int = 0
    kyc_verified_No: int = 0
    kyc_verified_Yes: int = 0

class EnhancedPredictionInput(BaseModel):
    customer_id: str
    account_age_days: int
    amount: float  # Changed from transaction_amount to match Flask/frontend
    channel: str  # Mobile, Web, ATM, POS
    kyc_verified: str  # Yes, No
    hour: int  # 0-23
    
    # Alias for backwards compatibility (accepts transaction_amount or amount)
    @property
    def transaction_amount(self) -> float:
        return self.amount

def _prepare_legacy_features(transaction: TransactionInput) -> Dict[str, Any]:
    input_dict = transaction.dict()
    engineered = {
        "account_age_days": 0,
        "transaction_amount": input_dict["amount"],
        "hour": input_dict["step"] % 24,
        "weekday": (input_dict["step"] // 24) % 7,
        "month": (input_dict["step"] // (24 * 30)) % 12,
        "is_high_value": int(input_dict["amount"] > 50000),  # Fixed: threshold is 50000 to match training data
        "transaction_amount_log": 0 if input_dict["amount"] <= 0 else float(np.log1p(input_dict["amount"])),
        "channel_Atm": input_dict.get("channel_Atm", 0),
        "channel_Mobile": input_dict.get("channel_Mobile", 0),
        "channel_Pos": input_dict.get("channel_Pos", 0),
        "channel_Web": input_dict.get("channel_Web", 0),
        "kyc_verified_No": input_dict.get("kyc_verified_No", 0),
        "kyc_verified_Yes": input_dict.get("kyc_verified_Yes", 0),
    }
    return engineered

# ==================== LIFECYCLE EVENTS ====================

@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    try:
        await get_database()
        print("✅ Database connected successfully")
    except Exception as e:
        print(f"⚠️ Warning: Could not connect to database: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    await close_database()

# ==================== API ENDPOINTS ====================

@app.get("/")
def root():
    return {
        "message": "🚀 Fraud Detection API - TransIntelliFlow is running successfully!",
        "version": "1.0.0",
        "milestone": "Milestone 3 - Complete",
        "features": [
            "ML Model (Random Forest)",
            "Rule-Based Detection (6 business rules)",
            "Risk Scoring",
            "Reason Generation",
            "MongoDB Storage"
        ],
        "endpoints": {
            "predict_enhanced": "/api/predict/enhanced",
            "predict_batch": "/api/predict/batch",
            "get_result": "/api/result/{transaction_id}",
            "transactions": "/api/transactions",
            "statistics": "/api/statistics/fraud",
            "metrics": "/api/metrics"
        }
    }

@app.post("/predict")
async def predict_fraud(transaction: TransactionInput):
    """Legacy prediction endpoint"""
    engineered = _prepare_legacy_features(transaction)
    prediction = _run_model_prediction(engineered)
    await _store_prediction_record(
        transaction_id=f"TXN_{datetime.utcnow().timestamp()}",
        prediction=prediction,
    )

    return {
        "fraud_prediction": prediction["prediction"],
        "fraud_probability": prediction["fraud_probability"],
        "risk_level": prediction["risk_level"],
    }

@app.post("/api/predict/enhanced")
async def predict_fraud_enhanced(transaction: EnhancedPredictionInput):
    """
    Enhanced prediction endpoint - Milestone 3 Complete
    
    Features:
    - ML Model (Random Forest)
    - Rule-Based Detection (6 business rules)
    - Risk Scoring
    - Reason Generation
    - MongoDB Storage
    
    Request: {
      "customer_id": "C123",
      "account_age_days": 365,
      "transaction_amount": 5000,
      "channel": "Web",
      "kyc_verified": "Yes",
      "hour": 14
    }
    
    Response: {
      "transaction_id": "C123",
      "prediction": "Fraud" | "Legitimate",
      "risk_score": 0.80,
      "confidence": 95.5,
      "reason": "High transaction amount from new account",
      "rule_flags": ["HIGH_VALUE_NEW_ACCOUNT"],
      "risk_level": "High",
      "risk_factors": [...],
      "model_version": "1.0.0"
    }
    """
    try:
        # Step 1: Build engineered features
        engineered = _prepare_enhanced_features(transaction)
        
        # Step 2: Get ML model prediction
        ml_result = _run_model_prediction(engineered)
        ml_prediction = ml_result["prediction"]
        ml_probability = ml_result["fraud_probability"]
        
        # Step 3: Apply rule-based detection (combines ML + business rules)
        final_prediction, rule_flags, reason = _apply_rule_based_detection(
            transaction.transaction_amount,
            transaction.account_age_days,
            transaction.hour,
            transaction.kyc_verified,
            transaction.channel,
            ml_prediction,
            ml_probability
        )
        
        # Step 4: Determine risk level (adjusted for rule-based overrides)
        risk_level = _determine_risk_level(ml_probability)
        
        # Adjust risk level when business rules override ML decision
        if final_prediction == 1 and risk_level == "Low":
            # If marked as fraud by rules, boost to at least Medium
            if len(rule_flags) >= 3:
                risk_level = "High"
            else:
                risk_level = "Medium"
        elif final_prediction == 1 and risk_level == "Medium":
            # If marked as fraud with many rule flags, boost to High
            if len(rule_flags) >= 3:
                risk_level = "High"
        
        # Step 5: Derive risk factors for frontend display
        risk_factors = _derive_risk_factors(
            transaction.transaction_amount,
            transaction.account_age_days,
            transaction.hour,
            transaction.kyc_verified,
            transaction.channel,
        )
        
        # Step 6: Build response matching Milestone 3 spec
        response = {
            "transaction_id": transaction.customer_id,
            "prediction": "Fraud" if final_prediction == 1 else "Legitimate",
            "risk_score": round(ml_probability, 4),
            "confidence": round(ml_probability * 100, 2),
            "reason": reason,
            "rule_flags": rule_flags,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "model_version": os.getenv("MODEL_VERSION", "1.0.0"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Step 7: Store prediction in MongoDB (async, non-blocking for better performance)
        # Create background task to avoid blocking the response
        import asyncio
        prediction_payload = {
            "prediction": "Fraud" if final_prediction == 1 else "Legitimate",
            "fraud_probability": ml_probability,
            "risk_level": risk_level,
            "reason": reason,
            "rule_flags": rule_flags,
        }
        transaction_data = {
            "customer_id": transaction.customer_id,
            "amount": transaction.amount,
            "channel": transaction.channel,
            "account_age_days": transaction.account_age_days,
            "kyc_verified": transaction.kyc_verified,
            "hour": transaction.hour,
        }
        # Fire and forget - don't wait for storage to complete
        asyncio.create_task(_store_prediction_record(transaction.customer_id, prediction_payload, transaction_data))
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/api/result/{transaction_id}")
async def get_prediction_result(transaction_id: str):
    """
    GET /api/result/<transaction_id>
    Retrieves prediction result by transaction ID
    
    Response: Full prediction details from MongoDB
    """
    try:
        result = await db_ops.get_prediction_by_transaction_id(transaction_id)
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"No prediction found for transaction_id: {transaction_id}"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/results")
async def get_all_results(
    limit: int = Query(100, ge=1, le=1000),
    fraud_only: bool = Query(False)
):
    """
    GET /api/results?limit=100&fraud_only=false
    Returns all stored prediction results (matches Flask endpoint for compatibility)
    
    Response: {
        "total": 50,
        "returned": 50,
        "fraud_count": 10,
        "results": [...]
    }
    """
    try:
        # Get recent predictions from database
        predictions = await db_ops.get_recent_predictions(limit=limit)
        
        # Filter fraud only if requested
        if fraud_only:
            predictions = [p for p in predictions if p.get('prediction') == 'Fraud']
        
        fraud_count = sum(1 for p in predictions if p.get('prediction') == 'Fraud')
        
        return {
            "total": len(predictions),
            "returned": len(predictions),
            "fraud_count": fraud_count,
            "results": predictions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/predict/batch")
async def predict_fraud_batch(file: UploadFile = File(...)):
    """Batch prediction endpoint that accepts CSV uploads"""
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        dataframe = pd.read_csv(BytesIO(contents))
        dataframe.columns = [col.lower() for col in dataframe.columns]
        required_columns = {"customer_id", "transaction_amount", "account_age_days", "channel", "kyc_verified", "hour"}
        missing_columns = required_columns.difference(set(dataframe.columns))
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )

        records = dataframe.to_dict("records")
        results = []
        fraud_count = 0
        probability_total = 0.0

        for idx, row in enumerate(records):
            payload = {
                "customer_id": str(row.get("customer_id") or f"BATCH_{idx}"),
                "transaction_amount": float(row.get("transaction_amount", 0)),
                "account_age_days": int(row.get("account_age_days", 0)),
                "channel": str(row.get("channel", "Web")),
                "kyc_verified": str(row.get("kyc_verified", "No")),
                "hour": int(row.get("hour", datetime.utcnow().hour)),
            }
            transaction = EnhancedPredictionInput(**payload)
            engineered = _prepare_enhanced_features(transaction)
            ml_result = _run_model_prediction(engineered)
            
            final_prediction, rule_flags, reason = _apply_rule_based_detection(
                transaction.transaction_amount,
                transaction.account_age_days,
                transaction.hour,
                transaction.kyc_verified,
                transaction.channel,
                ml_result["prediction"],
                ml_result["fraud_probability"]
            )
            
            risk_factors = _derive_risk_factors(
                transaction.transaction_amount,
                transaction.account_age_days,
                transaction.hour,
                transaction.kyc_verified,
                transaction.channel,
            )

            probability_total += ml_result["fraud_probability"]
            if final_prediction == 1:
                fraud_count += 1

            results.append({
                "row": idx + 1,
                "transaction_id": transaction.customer_id,
                "prediction": "Fraud" if final_prediction == 1 else "Legitimate",
                "fraud_probability": round(ml_result["fraud_probability"] * 100, 2),
                "risk_level": ml_result["risk_level"],
                "confidence": ml_result["confidence"],
                "reason": reason,
                "rule_flags": rule_flags,
                "risk_factors": risk_factors,
            })

        average_probability = round(probability_total / len(results) * 100, 2) if results else 0.0

        return {
            "batch_id": str(uuid4()),
            "total_records": len(results),
            "fraudulent_predictions": fraud_count,
            "average_fraud_probability": average_probability,
            "results": results,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")

# ==================== DATABASE ENDPOINTS ====================

@app.get("/api/transactions")
async def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    is_fraud: Optional[int] = Query(None, ge=0, le=1),
    channel: Optional[str] = Query(None)
):
    """Get list of transactions with pagination and filters"""
    try:
        filters = {}
        if is_fraud is not None:
            filters["is_fraud"] = is_fraud
        if channel:
            filters["channel"] = channel
        
        transactions = await db_ops.get_transactions(skip=skip, limit=limit, filters=filters)
        total = await db_ops.count_transactions(filters=filters)
        
        return {
            "total": total,
            "page": skip // limit + 1,
            "limit": limit,
            "transactions": transactions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/transactions/{transaction_id}")
async def get_transaction_details(transaction_id: str):
    """Get transaction details by ID"""
    try:
        transaction = await db_ops.get_transaction(transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return transaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


class SimulationTransactionRequest(BaseModel):
    """Request model for storing simulation transactions (matches training schema)"""
    transaction_id: str
    customer_id: str
    transaction_amount: float
    channel: str
    timestamp: str
    is_fraud: int = 0
    fraud_probability: float = 0.0
    risk_level: str = "Low"
    source: str = "simulation"
    account_age_days: Optional[int] = None
    kyc_verified: Optional[str] = "Yes"
    hour: Optional[int] = None
    weekday: Optional[int] = None
    month: Optional[int] = None
    is_high_value: Optional[int] = None
    transaction_amount_log: Optional[float] = None


@app.post("/api/transactions")
async def store_transaction(transaction: SimulationTransactionRequest):
    """Store a new transaction (simulation or test results)"""
    try:
        # Calculate derived fields for model training compatibility
        hour = transaction.hour or datetime.utcnow().hour
        now = datetime.utcnow()
        weekday = transaction.weekday if transaction.weekday is not None else now.weekday()
        month = transaction.month if transaction.month is not None else now.month
        is_high_value = transaction.is_high_value if transaction.is_high_value is not None else (1 if transaction.transaction_amount > 50000 else 0)
        transaction_amount_log = transaction.transaction_amount_log if transaction.transaction_amount_log is not None else (float(np.log1p(transaction.transaction_amount)) if transaction.transaction_amount > 0 else 0.0)
        
        transaction_dict = {
            "transaction_id": transaction.transaction_id,
            "customer_id": transaction.customer_id,
            "transaction_amount": transaction.transaction_amount,
            "channel": transaction.channel,
            "timestamp": transaction.timestamp,
            "is_fraud": transaction.is_fraud,
            "fraud_probability": transaction.fraud_probability,
            "risk_level": transaction.risk_level,
            "source": transaction.source,
            "account_age_days": transaction.account_age_days or 365,
            "kyc_verified": transaction.kyc_verified or "Yes",
            "hour": hour,
            "weekday": weekday,
            "month": month,
            "is_high_value": is_high_value,
            "transaction_amount_log": transaction_amount_log,
            "created_at": datetime.utcnow()
        }
        result = await db_ops.create_transaction(transaction_dict)
        return {"success": True, "transaction_id": transaction.transaction_id, "message": "Transaction stored"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.post("/api/transactions/batch")
async def store_transactions_batch(transactions: List[SimulationTransactionRequest]):
    """Store multiple transactions (simulation or test results) with full training schema"""
    try:
        stored_count = 0
        now = datetime.utcnow()
        
        for txn in transactions:
            # Calculate derived fields for model training compatibility
            hour = txn.hour if txn.hour is not None else now.hour
            weekday = txn.weekday if txn.weekday is not None else now.weekday()
            month = txn.month if txn.month is not None else now.month
            is_high_value = txn.is_high_value if txn.is_high_value is not None else (1 if txn.transaction_amount > 50000 else 0)
            transaction_amount_log = txn.transaction_amount_log if txn.transaction_amount_log is not None else (float(np.log1p(txn.transaction_amount)) if txn.transaction_amount > 0 else 0.0)
            
            transaction_dict = {
                "transaction_id": txn.transaction_id,
                "customer_id": txn.customer_id,
                "transaction_amount": txn.transaction_amount,
                "channel": txn.channel,
                "timestamp": txn.timestamp,
                "is_fraud": txn.is_fraud,
                "fraud_probability": txn.fraud_probability,
                "risk_level": txn.risk_level,
                "source": txn.source,
                "account_age_days": txn.account_age_days or 365,
                "kyc_verified": txn.kyc_verified or "Yes",
                "hour": hour,
                "weekday": weekday,
                "month": month,
                "is_high_value": is_high_value,
                "transaction_amount_log": transaction_amount_log,
                "created_at": datetime.utcnow()
            }
            await db_ops.create_transaction(transaction_dict)
            stored_count += 1
        return {"success": True, "stored_count": stored_count, "message": f"Stored {stored_count} transactions"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


class TransactionUpdateRequest(BaseModel):
    """Request model for updating transaction"""
    is_fraud: Optional[int] = None
    fraud_probability: Optional[float] = None
    risk_level: Optional[str] = None
    verified: Optional[bool] = None
    verified_by: Optional[str] = None
    notes: Optional[str] = None


@app.put("/api/transactions/{transaction_id}")
async def update_transaction(transaction_id: str, update: TransactionUpdateRequest):
    """Update a transaction (e.g., after case resolution for feedback loop)"""
    try:
        update_dict = {k: v for k, v in update.dict().items() if v is not None}
        if not update_dict:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        result = await db_ops.update_transaction(transaction_id, update_dict)
        if not result:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return {"success": True, "transaction_id": transaction_id, "message": "Transaction updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


class BatchTransactionUpdateRequest(BaseModel):
    """Request model for batch updating transactions"""
    transaction_ids: List[str]
    is_fraud: Optional[int] = None
    fraud_probability: Optional[float] = None
    risk_level: Optional[str] = None
    verified: Optional[bool] = None
    verified_by: Optional[str] = None
    notes: Optional[str] = None


@app.put("/api/transactions/batch/update")
async def update_transactions_batch(update: BatchTransactionUpdateRequest):
    """Update multiple transactions (for case resolution feedback loop)"""
    try:
        update_dict = {k: v for k, v in update.dict().items() if v is not None and k != "transaction_ids"}
        if not update_dict:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        count = await db_ops.update_transactions_batch(update.transaction_ids, update_dict)
        return {"success": True, "updated_count": count, "message": f"Updated {count} transactions"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/statistics/fraud")
async def fraud_statistics():
    """Get overall fraud statistics"""
    try:
        return await db_ops.get_fraud_statistics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/statistics/channels")
async def channel_statistics():
    """Get fraud statistics by transaction channel"""
    try:
        return await db_ops.get_channel_statistics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/statistics/hourly")
async def hourly_statistics():
    """Get fraud statistics by hour of day"""
    try:
        return await db_ops.get_hourly_statistics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/predictions/recent")
async def recent_predictions(limit: int = Query(10, ge=1, le=100)):
    """Get recent prediction results"""
    try:
        return await db_ops.get_recent_predictions(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Model metrics endpoint moved below with full metadata support

@app.post("/api/metrics")
async def save_metrics(metrics: ModelMetricsModel):
    """Save model performance metrics"""
    try:
        metrics_dict = metrics.dict()
        return await db_ops.save_model_metrics(metrics_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/metrics/history")
async def get_metrics_history():
    """Get all model metrics history"""
    try:
        return await db_ops.get_all_model_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        db = await get_database()
        await db.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "model": "loaded",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.get("/api/metrics")
async def get_model_metrics():
    """
    Get model performance metrics
    Returns metrics from the trained model
    """
    import json
    from pathlib import Path
    
    try:
        # Try to load metadata from the saved model
        metadata_path = Path("outputs/all_models/model_metadata.json")
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            return {
                "model_version": metadata.get("model_type", "RandomForest (Calibrated)"),
                "accuracy": 0.90,  # Test accuracy from training
                "precision": 0.33,
                "recall": 0.14,
                "f1_score": 0.20,
                "roc_auc": metadata.get("roc_auc", 0.7334),
                "training_samples": metadata.get("training_samples", 5481),
                "test_samples": metadata.get("test_samples", 1000),
                "risk_thresholds": metadata.get("risk_thresholds", {
                    "low": "< 0.4",
                    "medium": "0.4 - 0.7",
                    "high": ">= 0.7"
                }),
                "probability_distribution": metadata.get("probability_distribution", {
                    "low_pct": 89.0,
                    "medium_pct": 9.4,
                    "high_pct": 1.6
                }),
                "last_updated": metadata.get("trained_at", datetime.utcnow().isoformat())
            }
    except Exception as e:
        print(f"Could not load model metadata: {e}")
    
    # Default metrics
    return {
        "model_version": "RandomForest (Calibrated + SMOTE)",
        "accuracy": 0.90,
        "precision": 0.33,
        "recall": 0.14,
        "f1_score": 0.20,
        "roc_auc": 0.7334,
        "last_updated": datetime.utcnow().isoformat()
    }

# ==================== LLM EXPLANATION ENDPOINTS (Milestone 3) ====================

class ExplanationRequest(BaseModel):
    """Request for LLM explanation of a prediction"""
    transaction_id: str
    customer_id: str
    amount: float
    channel: str
    account_age_days: int
    kyc_verified: str
    hour: int
    prediction: str
    risk_score: float
    risk_level: str
    risk_factors: List[str] = []

@app.post("/api/explain/prediction")
async def get_llm_explanation(request: ExplanationRequest):
    """
    Generate LLM-powered explanation for a fraud prediction.
    Uses Google Gemini to provide natural language reasoning.
    
    This fulfills Milestone 3 requirement:
    "LLM can generate a human-readable reason: 'This transaction is suspicious 
    because the amount is 5x higher than usual and occurred from an unverified 
    channel at late midnight.'"
    """
    try:
        transaction_data = {
            "customer_id": request.customer_id,
            "transaction_amount": request.amount,
            "channel": request.channel,
            "account_age_days": request.account_age_days,
            "kyc_verified": request.kyc_verified,
            "hour": request.hour,
        }
        
        prediction_result = {
            "prediction": request.prediction,
            "fraud_probability": request.risk_score,
            "risk_level": request.risk_level,
            "risk_factors": request.risk_factors,
        }
        
        explanation = await generate_fraud_explanation(transaction_data, prediction_result)
        
        return {
            "transaction_id": request.transaction_id,
            "explanation": explanation,
            "generated_by": "Google Gemini",
            "timestamp": datetime.utcnow().isoformat()
        }
    except ValueError as e:
        # Gemini API key not configured
        return {
            "transaction_id": request.transaction_id,
            "explanation": f"LLM explanation unavailable: {str(e)}. Using rule-based reason instead.",
            "generated_by": "fallback",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate explanation: {str(e)}")

@app.post("/api/explain/model")
async def explain_model_performance():
    """
    Generate LLM-powered explanation of model performance for business stakeholders.
    """
    try:
        # Use static feature importance data (from trained model)
        feature_importance = {
            "transaction_amount": 0.245,
            "transaction_amount_log": 0.198,
            "account_age_days": 0.156,
            "is_high_value": 0.132,
            "hour": 0.089,
            "channel_Mobile": 0.067,
            "kyc_verified_No": 0.054,
            "channel_ATM": 0.032,
            "weekday": 0.027,
        }
        
        # Try to get from loaded model if available (override only if model has valid data)
        if model is not None and hasattr(model, 'feature_importances_') and hasattr(model, 'feature_names_in_'):
            feature_names = model.feature_names_in_
            model_feature_importance = {}
            for name, importance in zip(feature_names, model.feature_importances_):
                model_feature_importance[name] = float(importance)
            # Only use model data if it's not empty
            if model_feature_importance:
                feature_importance = model_feature_importance
        
        # Actual RandomForest model metrics from training (best precision)
        metrics = {
            "accuracy": 0.9147,
            "precision": 0.5714,
            "recall": 0.0615,
            "f1_score": 0.1111,
            "roc_auc": 0.8063,
        }
        
        explanation = await generate_model_explanation(feature_importance, metrics)
        
        return {
            "explanation": explanation,
            "feature_importance": feature_importance,
            "metrics": metrics,
            "generated_by": "Google Gemini",
            "timestamp": datetime.utcnow().isoformat()
        }
    except ValueError as e:
        return {
            "explanation": f"LLM explanation unavailable: {str(e)}",
            "generated_by": "fallback",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate explanation: {str(e)}")


# ==================== MILESTONE 3: FRAUD DETECTION ENGINE ENDPOINTS ====================

@app.post("/api/detect")
async def detect_fraud_comprehensive(transaction: EnhancedPredictionInput):
    """
    Comprehensive Fraud Detection Endpoint - Milestone 3 Complete
    
    Uses the FraudDetectionEngine which combines:
    1. ML Model Predictions
    2. Business Rules
    3. Behavioral Analysis
    4. Fraud Signature Matching
    5. Velocity Checks
    6. Real-Time Alerting
    
    This is the recommended endpoint for production use.
    """
    try:
        # Get ML prediction first
        engineered = _prepare_enhanced_features(transaction)
        ml_result = _run_model_prediction(engineered)
        ml_probability = ml_result["fraud_probability"]
        
        # Use FraudDetectionEngine for comprehensive analysis
        engine = get_fraud_engine()
        result = engine.analyze_transaction(
            transaction_id=transaction.customer_id,
            customer_id=transaction.customer_id,
            amount=transaction.transaction_amount,
            channel=transaction.channel,
            hour=transaction.hour,
            account_age_days=transaction.account_age_days,
            kyc_verified=transaction.kyc_verified,
            location=None,  # Can be extended
            timestamp=datetime.utcnow(),
            ml_probability=ml_probability,
        )
        
        # Add model version
        result["model_version"] = os.getenv("MODEL_VERSION", "1.0.0")
        result["detection_engine_version"] = "3.0.0"
        
        # Store in MongoDB
        prediction_payload = {
            "prediction": result["prediction"],
            "fraud_probability": result["fraud_probability"],
            "risk_level": result["risk_level"],
            "reason": "; ".join(result["risk_factors"][:3]) if result["risk_factors"] else "No specific risk factors",
            "rule_flags": result["all_flags"],
        }
        transaction_data = {
            "customer_id": transaction.customer_id,
            "amount": transaction.transaction_amount,
            "channel": transaction.channel,
            "account_age_days": transaction.account_age_days,
            "kyc_verified": transaction.kyc_verified,
            "hour": transaction.hour,
        }
        await _store_prediction_record(transaction.customer_id, prediction_payload, transaction_data)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


@app.post("/api/detect/batch")
async def detect_fraud_batch(transactions: List[EnhancedPredictionInput]):
    """
    Batch fraud detection using FraudDetectionEngine
    
    Process multiple transactions with full behavioral analysis
    """
    try:
        engine = get_fraud_engine()
        results = []
        
        for txn in transactions:
            # Get ML prediction
            engineered = _prepare_enhanced_features(txn)
            ml_result = _run_model_prediction(engineered)
            ml_probability = ml_result["fraud_probability"]
            
            # Comprehensive analysis
            result = engine.analyze_transaction(
                transaction_id=txn.customer_id,
                customer_id=txn.customer_id,
                amount=txn.transaction_amount,
                channel=txn.channel,
                hour=txn.hour,
                account_age_days=txn.account_age_days,
                kyc_verified=txn.kyc_verified,
                ml_probability=ml_probability,
            )
            
            results.append(result)
        
        # Summary statistics
        fraud_count = sum(1 for r in results if r["is_fraud"] == 1)
        high_risk_count = sum(1 for r in results if r["risk_level"] in ["High", "Critical"])
        alerts_generated = sum(r.get("alerts_generated", 0) for r in results)
        
        return {
            "total_processed": len(results),
            "fraud_count": fraud_count,
            "legitimate_count": len(results) - fraud_count,
            "fraud_rate": round(fraud_count / len(results) * 100, 2) if results else 0,
            "high_risk_count": high_risk_count,
            "alerts_generated": alerts_generated,
            "results": results,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch detection failed: {str(e)}")


@app.get("/api/detection/stats")
async def get_detection_statistics():
    """
    Get fraud detection statistics from the engine
    """
    try:
        engine = get_fraud_engine()
        alert_stats = engine.get_alert_statistics()
        
        return {
            "alert_statistics": alert_stats,
            "customer_profiles_tracked": len(engine.customer_profiles),
            "detection_engine_version": "3.0.0",
            "timestamp": datetime.utcnow().isoformat(),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")


# ==================== FEEDBACK LOOP ENDPOINTS (User Labeling) ====================

class FeedbackInput(BaseModel):
    """Input model for user feedback on predictions"""
    transaction_id: str
    prediction: str  # "Fraud" or "Legitimate"
    is_correct: bool  # True if user marks prediction as correct
    user_id: Optional[str] = None
    notes: Optional[str] = None
    risk_score: Optional[float] = None
    actual_label: Optional[str] = None  # User-provided actual label


@app.post("/api/feedback")
async def submit_feedback(feedback: FeedbackInput):
    """
    Submit user feedback on a prediction.
    
    This enables a feedback loop for:
    - Model improvement (collecting labeled data for retraining)
    - Quality monitoring (tracking prediction accuracy)
    - Audit trail (documenting user verification)
    
    Example:
        POST /api/feedback
        {
            "transaction_id": "TXN_123456",
            "prediction": "Fraud",
            "is_correct": true,
            "user_id": "analyst_001",
            "notes": "Confirmed fraudulent pattern"
        }
    """
    try:
        feedback_dict = {
            "transaction_id": feedback.transaction_id,
            "prediction": feedback.prediction,
            "is_correct": feedback.is_correct,
            "user_id": feedback.user_id or "anonymous",
            "notes": feedback.notes,
            "risk_score": feedback.risk_score,
            "actual_label": feedback.actual_label or ("Fraud" if (feedback.is_correct and feedback.prediction == "Fraud") or (not feedback.is_correct and feedback.prediction == "Legitimate") else "Legitimate"),
            "feedback_type": "user_verification",
        }
        
        result = await db_ops.store_feedback(feedback_dict)
        
        return {
            "success": True,
            "message": "Feedback recorded successfully",
            "feedback_id": result.get("_id"),
            "transaction_id": feedback.transaction_id,
            "is_correct": feedback.is_correct,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store feedback: {str(e)}")


@app.get("/api/feedback/{transaction_id}")
async def get_feedback(transaction_id: str):
    """
    Get feedback for a specific transaction.
    """
    try:
        feedback = await db_ops.get_feedback_by_transaction(transaction_id)
        
        if not feedback:
            return {
                "found": False,
                "transaction_id": transaction_id,
                "message": "No feedback found for this transaction"
            }
        
        return {
            "found": True,
            "feedback": feedback
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get feedback: {str(e)}")


@app.get("/api/feedback")
async def list_feedback(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_correct: Optional[bool] = Query(None)
):
    """
    List all feedback with pagination and optional filtering.
    
    Query params:
        - skip: Number of records to skip (default 0)
        - limit: Maximum records to return (default 100)
        - is_correct: Filter by correctness (true/false)
    """
    try:
        feedback_list = await db_ops.get_all_feedback(skip=skip, limit=limit, is_correct=is_correct)
        total = await db_ops.count_feedback(is_correct=is_correct)
        
        return {
            "total": total,
            "page": skip // limit + 1,
            "limit": limit,
            "feedback": feedback_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list feedback: {str(e)}")


@app.get("/api/feedback/statistics")
async def feedback_statistics():
    """
    Get feedback statistics for model improvement insights.
    
    Returns:
        - total_feedback: Total feedback entries
        - marked_correct: Predictions marked as correct
        - marked_incorrect: Predictions marked as incorrect
        - accuracy_rate: User-verified accuracy percentage
        - needs_review: Count of incorrect predictions for review
    """
    try:
        stats = await db_ops.get_feedback_statistics()
        stats["timestamp"] = datetime.utcnow().isoformat()
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get feedback statistics: {str(e)}")