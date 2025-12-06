"""Gemini AI Integration for Fraud Detection Insights"""
import os
from typing import Optional, Dict, Any, List
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_gemini_model():
    """Get configured Gemini model"""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")
    try:
        return genai.GenerativeModel(GEMINI_MODEL_NAME)
    except Exception as exc:
        raise RuntimeError(f"Failed to load Gemini model '{GEMINI_MODEL_NAME}': {exc}")

async def generate_fraud_explanation(
    transaction_data: Dict[str, Any],
    prediction_result: Dict[str, Any]
) -> str:
    """Generate human-readable fraud explanation using Gemini"""
    try:
        model = get_gemini_model()
        
        prompt = f"""As a fraud detection expert, analyze this transaction and explain the prediction:

Transaction Details:
- Customer ID: {transaction_data.get('customer_id')}
- Amount: ₹{transaction_data.get('transaction_amount'):,.2f}
- Channel: {transaction_data.get('channel')}
- Account Age: {transaction_data.get('account_age_days')} days
- KYC Status: {transaction_data.get('kyc_verified')}
- Time: Hour {transaction_data.get('hour')}

Prediction:
- Result: {prediction_result.get('prediction')}
- Fraud Probability: {prediction_result.get('fraud_probability', 0)*100:.1f}%
- Risk Level: {prediction_result.get('risk_level')}
- Risk Factors: {', '.join(prediction_result.get('risk_factors', []))}

Provide a concise 2-3 sentence explanation for an analyst, focusing on key risk indicators."""

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return "LLM explanation is temporarily unavailable. Please use the rule-based reason shown above."

async def generate_case_recommendations(
    case_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Generate investigation recommendations for a fraud case"""
    try:
        model = get_gemini_model()
        
        prompt = f"""As a fraud investigation specialist, provide recommendations for this case:

Case: {case_data.get('case_id')}
Status: {case_data.get('status')}
Priority: {case_data.get('priority')}
Transaction Count: {case_data.get('transaction_count')}
Total Amount: ₹{case_data.get('total_amount', 0):,.2f}

Provide:
1. Top 3 investigation priorities
2. Recommended next actions
3. Evidence to collect

Keep response structured and concise."""

        response = model.generate_content(prompt)
        return {
            "recommendations": response.text,
            "generated_at": "now",
            "confidence": "high"
        }
    except Exception as e:
        return {
            "recommendations": f"Unable to generate recommendations: {str(e)}",
            "generated_at": "now",
            "confidence": "low"
        }

async def analyze_pattern_insights(
    transaction_patterns: List[Dict[str, Any]]
) -> str:
    """Analyze transaction patterns and provide insights"""
    try:
        model = get_gemini_model()
        
        summary = f"Analyzing {len(transaction_patterns)} transactions"
        if transaction_patterns:
            fraud_count = sum(1 for t in transaction_patterns if t.get('is_fraud') == 1)
            avg_amount = sum(t.get('transaction_amount', 0) for t in transaction_patterns) / len(transaction_patterns)
            channels = set(t.get('channel') for t in transaction_patterns)
            
            summary += f"""
- Fraud Rate: {fraud_count}/{len(transaction_patterns)} ({fraud_count/len(transaction_patterns)*100:.1f}%)
- Average Amount: ₹{avg_amount:,.2f}
- Channels: {', '.join(channels)}"""

        prompt = f"""Analyze these transaction patterns and identify key insights:

{summary}

Provide 3-4 bullet points highlighting:
- Notable trends
- Risk patterns
- Operational recommendations"""

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Pattern analysis unavailable: {str(e)}"

async def generate_model_explanation(
    feature_importance: Dict[str, float],
    metrics: Dict[str, float]
) -> str:
    """Explain model performance and feature importance"""
    try:
        model = get_gemini_model()
        
        top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:5]
        
        prompt = f"""Explain this fraud detection model's behavior to a business stakeholder:

Model Performance:
- Accuracy: {metrics.get('accuracy', 0)*100:.1f}%
- Precision: {metrics.get('precision', 0)*100:.1f}%
- Recall: {metrics.get('recall', 0)*100:.1f}%

Top 5 Important Features:
{chr(10).join(f"- {feat}: {imp:.3f}" for feat, imp in top_features)}

Provide a 3-4 sentence explanation in business terms about what drives fraud detection."""

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Model explanation unavailable: {str(e)}"
