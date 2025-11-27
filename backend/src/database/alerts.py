"""
MongoDB Operations for Alerts Collection
Handles CRUD operations for fraud alerts in MongoDB
"""

from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
from .config import get_database

logger = logging.getLogger(__name__)


async def store_alert(alert_data: Dict[str, Any]) -> str:
    """Store a fraud alert in MongoDB"""
    try:
        db = await get_database()
        alerts_collection = db["alerts"]
        
        # Add created_at timestamp
        alert_data["created_at"] = datetime.utcnow()
        
        result = await alerts_collection.insert_one(alert_data)
        logger.info(f"Alert stored: {alert_data.get('alert_id')}")
        return str(result.inserted_id)
    except Exception as e:
        logger.error(f"Failed to store alert: {str(e)}")
        raise


async def get_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Fetch alerts with optional filtering"""
    try:
        db = await get_database()
        alerts_collection = db["alerts"]
        
        # Build query
        query = {}
        if status == "pending":
            query["acknowledged"] = False
            query["resolved"] = False
        elif status == "acknowledged":
            query["acknowledged"] = True
            query["resolved"] = False
        elif status == "resolved":
            query["resolved"] = True
        
        if severity:
            query["severity"] = severity.capitalize()
        
        # Fetch alerts
        cursor = alerts_collection.find(query).sort("timestamp", -1).skip(skip).limit(limit)
        alerts = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
        
        return alerts
    except Exception as e:
        logger.error(f"Failed to fetch alerts: {str(e)}")
        return []


async def get_alert_by_id(alert_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific alert by ID"""
    try:
        db = await get_database()
        alerts_collection = db["alerts"]
        
        alert = await alerts_collection.find_one({"alert_id": alert_id})
        
        if alert:
            alert["_id"] = str(alert["_id"])
        
        return alert
    except Exception as e:
        logger.error(f"Failed to fetch alert {alert_id}: {str(e)}")
        return None


async def update_alert(alert_id: str, update_data: Dict[str, Any]) -> bool:
    """Update an alert"""
    try:
        db = await get_database()
        alerts_collection = db["alerts"]
        
        # Add updated_at timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        result = await alerts_collection.update_one(
            {"alert_id": alert_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            logger.info(f"Alert updated: {alert_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to update alert {alert_id}: {str(e)}")
        return False


async def acknowledge_alert_db(alert_id: str) -> bool:
    """Acknowledge an alert"""
    return await update_alert(alert_id, {
        "acknowledged": True,
        "acknowledged_at": datetime.utcnow()
    })


async def resolve_alert_db(
    alert_id: str,
    resolved_by: str,
    resolution_notes: Optional[str] = None
) -> bool:
    """Resolve an alert"""
    update_data = {
        "resolved": True,
        "resolved_by": resolved_by,
        "resolved_at": datetime.utcnow()
    }
    
    if resolution_notes:
        update_data["resolution_notes"] = resolution_notes
    
    return await update_alert(alert_id, update_data)


async def mark_false_positive_db(
    alert_id: str,
    marked_by: str,
    notes: Optional[str] = None
) -> bool:
    """Mark an alert as false positive"""
    update_data = {
        "false_positive": True,
        "false_positive_by": marked_by,
        "false_positive_at": datetime.utcnow(),
        "resolved": True,
        "resolved_by": marked_by,
        "resolved_at": datetime.utcnow()
    }
    
    if notes:
        update_data["false_positive_notes"] = notes
    
    return await update_alert(alert_id, update_data)


async def delete_alert_db(alert_id: str) -> bool:
    """Delete an alert"""
    try:
        db = await get_database()
        alerts_collection = db["alerts"]
        
        result = await alerts_collection.delete_one({"alert_id": alert_id})
        
        if result.deleted_count > 0:
            logger.info(f"Alert deleted: {alert_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to delete alert {alert_id}: {str(e)}")
        return False


async def get_alert_statistics() -> Dict[str, Any]:
    """Get alert statistics"""
    try:
        db = await get_database()
        alerts_collection = db["alerts"]
        
        # Total alerts
        total_alerts = await alerts_collection.count_documents({})
        
        # Pending (not acknowledged, not resolved)
        pending = await alerts_collection.count_documents({
            "acknowledged": False,
            "resolved": False
        })
        
        # Acknowledged (acknowledged but not resolved)
        acknowledged = await alerts_collection.count_documents({
            "acknowledged": True,
            "resolved": False
        })
        
        # Resolved
        resolved = await alerts_collection.count_documents({"resolved": True})
        
        # By severity
        by_severity = {}
        for severity in ["Critical", "High", "Medium", "Low"]:
            count = await alerts_collection.count_documents({"severity": severity})
            if count > 0:
                by_severity[severity.lower()] = count
        
        # By type
        pipeline = [
            {"$group": {"_id": "$alert_type", "count": {"$sum": 1}}}
        ]
        by_type_cursor = alerts_collection.aggregate(pipeline)
        by_type = {}
        async for item in by_type_cursor:
            by_type[item["_id"]] = item["count"]
        
        # Resolution rate
        resolution_rate = (resolved / total_alerts * 100) if total_alerts > 0 else 0
        
        return {
            "total_alerts": total_alerts,
            "pending": pending,
            "acknowledged": acknowledged,
            "resolved": resolved,
            "by_severity": by_severity,
            "by_type": by_type,
            "resolution_rate": round(resolution_rate, 2)
        }
    except Exception as e:
        logger.error(f"Failed to get alert statistics: {str(e)}")
        return {
            "total_alerts": 0,
            "pending": 0,
            "acknowledged": 0,
            "resolved": 0,
            "by_severity": {},
            "by_type": {},
            "resolution_rate": 0
        }


async def get_total_alert_count() -> int:
    """Get total count of alerts"""
    try:
        db = await get_database()
        alerts_collection = db["alerts"]
        return await alerts_collection.count_documents({})
    except Exception as e:
        logger.error(f"Failed to count alerts: {str(e)}")
        return 0
