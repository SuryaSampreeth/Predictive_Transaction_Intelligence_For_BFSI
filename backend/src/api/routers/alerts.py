"""
Alerts API Router - Real-Time Fraud Alerting System
Part of Milestone 3: Real-Time Fraud Detection Engine
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

from ...detection import get_fraud_engine, RiskLevel
from ...database.alerts import (
    get_alerts as get_alerts_db,
    get_alert_by_id,
    acknowledge_alert_db,
    resolve_alert_db,
    mark_false_positive_db,
    delete_alert_db,
    get_alert_statistics as get_alert_statistics_db,
    get_total_alert_count,
)

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


class AlertAcknowledge(BaseModel):
    alert_id: str


class AlertResolve(BaseModel):
    resolved_by: str
    resolution_notes: Optional[str] = None


class AlertFalsePositive(BaseModel):
    marked_by: str
    notes: Optional[str] = None


class AlertResponse(BaseModel):
    alert_id: str
    transaction_id: str
    customer_id: str
    alert_type: str
    severity: str
    message: str
    details: Dict[str, Any]
    timestamp: str
    acknowledged: bool
    resolved: bool
    resolved_by: Optional[str]
    resolved_at: Optional[str]


@router.get("")
async def get_alerts(
    status: Optional[str] = Query(None, description="Filter by status: pending, acknowledged, resolved"),
    severity: Optional[str] = Query(None, description="Filter by severity: Low, Medium, High, Critical"),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Get fraud alerts with optional filtering (MongoDB-backed)
    
    - **status**: pending (not acknowledged), acknowledged, resolved
    - **severity**: Low, Medium, High, Critical
    - **limit**: Maximum number of alerts to return (1-500)
    """
    try:
        alerts = await get_alerts_db(status=status, severity=severity, limit=limit)
        total = await get_total_alert_count()
        
        return {
            "total": total,
            "returned": len(alerts),
            "alerts": alerts,
            "filters": {
                "status": status,
                "severity": severity,
            }
        }
    except Exception as e:
        # Fallback to in-memory if MongoDB fails
        engine = get_fraud_engine()
        alerts = engine.get_alerts(status=status, severity=severity, limit=limit)
        
        return {
            "total": len(alerts),
            "returned": len(alerts),
            "alerts": alerts,
            "filters": {
                "status": status,
                "severity": severity,
            },
            "source": "in-memory"
        }


@router.get("/pending")
async def get_pending_alerts(limit: int = Query(50, ge=1, le=200)):
    """Get all pending (unacknowledged, unresolved) alerts"""
    try:
        alerts = await get_alerts_db(status="pending", limit=limit)
        return {
            "total": len(alerts),
            "alerts": alerts,
        }
    except Exception as e:
        engine = get_fraud_engine()
        alerts = engine.get_alerts(status="pending", limit=limit)
        return {
            "total": len(alerts),
            "alerts": alerts,
            "source": "in-memory"
        }


@router.get("/statistics")
async def get_alert_statistics():
    """Get alert statistics and metrics (MongoDB-backed)"""
    try:
        stats = await get_alert_statistics_db()
        return {
            "statistics": stats,
            "generated_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        # Fallback to in-memory
        engine = get_fraud_engine()
        stats = engine.get_alert_statistics()
        return {
            "statistics": stats,
            "generated_at": datetime.utcnow().isoformat(),
            "source": "in-memory"
        }


@router.get("/{alert_id}")
async def get_alert(alert_id: str):
    """Get a specific alert by ID (MongoDB-backed)"""
    try:
        alert = await get_alert_by_id(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        return alert
    except HTTPException:
        raise
    except Exception as e:
        # Fallback to in-memory
        engine = get_fraud_engine()
        alerts = engine.get_alerts(limit=1000)
        alert = next((a for a in alerts if a["alert_id"] == alert_id), None)
        if not alert:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        return alert


@router.put("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """
    Acknowledge an alert (MongoDB-backed)
    
    Marks the alert as seen/acknowledged by an analyst
    """
    try:
        success = await acknowledge_alert_db(alert_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        
        return {
            "message": f"Alert {alert_id} acknowledged",
            "alert_id": alert_id,
            "acknowledged_at": datetime.utcnow().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        # Fallback to in-memory
        engine = get_fraud_engine()
        success = engine.acknowledge_alert(alert_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        return {
            "message": f"Alert {alert_id} acknowledged",
            "alert_id": alert_id,
            "acknowledged_at": datetime.utcnow().isoformat(),
            "source": "in-memory"
        }


@router.put("/{alert_id}/resolve")
async def resolve_alert(alert_id: str, request: AlertResolve):
    """
    Resolve an alert (MongoDB-backed)
    
    Marks the alert as resolved with resolution details
    """
    try:
        success = await resolve_alert_db(
            alert_id,
            request.resolved_by,
            request.resolution_notes
        )
        if not success:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        
        return {
            "message": f"Alert {alert_id} resolved",
            "alert_id": alert_id,
            "resolved_by": request.resolved_by,
            "resolved_at": datetime.utcnow().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        # Fallback to in-memory
        engine = get_fraud_engine()
        success = engine.resolve_alert(
            alert_id,
            request.resolved_by,
            request.resolution_notes
        )
        if not success:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        return {
            "message": f"Alert {alert_id} resolved",
            "alert_id": alert_id,
            "resolved_by": request.resolved_by,
            "resolved_at": datetime.utcnow().isoformat(),
            "source": "in-memory"
        }


@router.put("/{alert_id}/false-positive")
async def mark_false_positive(alert_id: str, request: AlertFalsePositive):
    """
    Mark alert as false positive (MongoDB-backed)
    
    Marks the alert as a false positive and resolves it
    """
    try:
        success = await mark_false_positive_db(
            alert_id,
            request.marked_by,
            request.notes
        )
        if not success:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        
        return {
            "message": f"Alert {alert_id} marked as false positive",
            "alert_id": alert_id,
            "marked_by": request.marked_by,
            "marked_at": datetime.utcnow().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark as false positive: {str(e)}")


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str):
    """
    Delete an alert (MongoDB-backed)
    
    Permanently removes an alert from the system
    """
    try:
        success = await delete_alert_db(alert_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        
        return {
            "message": f"Alert {alert_id} deleted",
            "alert_id": alert_id,
            "deleted_at": datetime.utcnow().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete alert: {str(e)}")


@router.post("/bulk-acknowledge")
async def bulk_acknowledge_alerts(alert_ids: List[str]):
    """Acknowledge multiple alerts at once"""
    engine = get_fraud_engine()
    
    results = {
        "acknowledged": [],
        "failed": [],
    }
    
    for alert_id in alert_ids:
        if engine.acknowledge_alert(alert_id):
            results["acknowledged"].append(alert_id)
        else:
            results["failed"].append(alert_id)
    
    return {
        "message": f"Bulk acknowledge completed",
        "acknowledged_count": len(results["acknowledged"]),
        "failed_count": len(results["failed"]),
        "results": results,
    }


@router.get("/customer/{customer_id}")
async def get_customer_alerts(
    customer_id: str,
    limit: int = Query(50, ge=1, le=200),
):
    """Get all alerts for a specific customer"""
    engine = get_fraud_engine()
    all_alerts = engine.get_alerts(limit=1000)
    
    customer_alerts = [a for a in all_alerts if a["customer_id"] == customer_id]
    customer_alerts = sorted(customer_alerts, key=lambda x: x["timestamp"], reverse=True)
    
    return {
        "customer_id": customer_id,
        "total": len(customer_alerts),
        "alerts": customer_alerts[:limit],
    }


@router.get("/high-risk-customers")
async def get_high_risk_customers(
    threshold: float = Query(0.6, ge=0.0, le=1.0),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Get customers with high average risk scores
    
    - **threshold**: Minimum average risk score (0.0-1.0)
    - **limit**: Maximum number of customers to return
    """
    engine = get_fraud_engine()
    customers = engine.get_high_risk_customers(threshold=threshold, limit=limit)
    
    return {
        "threshold": threshold,
        "total": len(customers),
        "high_risk_customers": customers,
    }


@router.get("/customer-profile/{customer_id}")
async def get_customer_profile(customer_id: str):
    """Get behavioral profile for a customer"""
    engine = get_fraud_engine()
    profile = engine.get_customer_profile(customer_id)
    
    if not profile:
        raise HTTPException(
            status_code=404, 
            detail=f"No profile found for customer {customer_id}"
        )
    
    return profile
