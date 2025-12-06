"""Modeling and Training API Router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime
import numpy as np

router = APIRouter(prefix="/api/modeling", tags=["Modeling"])

# Simulated model training state
TRAINING_JOBS: Dict[str, Any] = {}
FEATURE_IMPORTANCE: Dict[str, float] = {
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

class TrainingConfig(BaseModel):
    model_type: str  # xgboost, random_forest, logistic
    hyperparameters: Dict[str, Any]
    validation_split: float = 0.2

class ModelMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: Optional[float] = None

@router.post("/train")
async def start_training(config: TrainingConfig):
    """Start model training job"""
    job_id = f"JOB-{datetime.utcnow().timestamp()}"
    
    TRAINING_JOBS[job_id] = {
        "job_id": job_id,
        "status": "running",
        "model_type": config.model_type,
        "config": config.dict(),
        "started_at": datetime.utcnow().isoformat(),
        "progress": 0,
        "metrics": None
    }
    
    return {"job_id": job_id, "status": "Training started"}

@router.get("/jobs/{job_id}")
async def get_training_job(job_id: str):
    """Get training job status"""
    if job_id not in TRAINING_JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = TRAINING_JOBS[job_id]
    
    # Simulate progress
    if job["status"] == "running":
        job["progress"] = min(100, job.get("progress", 0) + 25)
        if job["progress"] >= 100:
            job["status"] = "completed"
            job["completed_at"] = datetime.utcnow().isoformat()
            job["metrics"] = {
                "accuracy": 0.9147,
                "precision": 0.5714,
                "recall": 0.0615,
                "f1_score": 0.1111,
                "roc_auc": 0.8063
            }
    
    return job

@router.get("/jobs")
async def list_training_jobs():
    """List all training jobs"""
    return list(TRAINING_JOBS.values())

@router.get("/feature-importance")
async def get_feature_importance():
    """Get feature importance for current model"""
    return {
        "features": FEATURE_IMPORTANCE,
        "model_version": "1.0.0",
        "generated_at": datetime.utcnow().isoformat()
    }

@router.post("/evaluate")
async def evaluate_model(metrics: ModelMetrics):
    """Evaluate model performance"""
    from ...database import operations as db_ops
    
    metrics_dict = metrics.dict()
    metrics_dict["model_version"] = "1.0.0"
    metrics_dict["created_at"] = datetime.utcnow()
    
    await db_ops.save_model_metrics(metrics_dict)
    
    return {
        "message": "Model evaluation saved",
        "metrics": metrics_dict
    }

@router.get("/explain")
async def explain_model():
    """Get AI-powered model explanation"""
    from ...utils.gemini_client import generate_model_explanation
    
    metrics = {
        "accuracy": 0.9147,
        "precision": 0.5714,
        "recall": 0.0615,
        "f1_score": 0.1111,
        "roc_auc": 0.8063
    }
    
    explanation = await generate_model_explanation(FEATURE_IMPORTANCE, metrics)
    
    return {
        "explanation": explanation,
        "feature_importance": FEATURE_IMPORTANCE,
        "metrics": metrics
    }

@router.post("/predict/explain")
async def explain_prediction(transaction_data: Dict[str, Any]):
    """Explain a specific prediction"""
    from ...utils.gemini_client import generate_fraud_explanation
    
    # Simulate prediction result
    prediction_result = {
        "prediction": "Fraud" if transaction_data.get("transaction_amount", 0) > 50000 else "Legitimate",
        "fraud_probability": 0.82 if transaction_data.get("transaction_amount", 0) > 50000 else 0.15,
        "risk_level": "High" if transaction_data.get("transaction_amount", 0) > 50000 else "Low",
        "risk_factors": ["High transaction amount"] if transaction_data.get("transaction_amount", 0) > 50000 else []
    }
    
    explanation = await generate_fraud_explanation(transaction_data, prediction_result)
    
    return {
        "prediction": prediction_result,
        "explanation": explanation
    }
