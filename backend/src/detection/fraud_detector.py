"""
Module 3: Real-Time Fraud Detection Engine
Milestone 3 (Weeks 5-6)

This module implements:
1. Risk Detection Logic
2. Fraud Signature Matching
3. Behavioral Deviation Analysis
4. Real-Time Alerting System
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
from enum import Enum
import logging
import asyncio

logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class AlertType(Enum):
    HIGH_VALUE_TRANSACTION = "HIGH_VALUE_TRANSACTION"
    NEW_ACCOUNT_RISK = "NEW_ACCOUNT_RISK"
    UNUSUAL_HOUR = "UNUSUAL_HOUR"
    VELOCITY_SPIKE = "VELOCITY_SPIKE"
    GEOGRAPHIC_ANOMALY = "GEOGRAPHIC_ANOMALY"
    PATTERN_DEVIATION = "PATTERN_DEVIATION"
    KYC_VIOLATION = "KYC_VIOLATION"
    CHANNEL_ANOMALY = "CHANNEL_ANOMALY"
    AMOUNT_DEVIATION = "AMOUNT_DEVIATION"
    FRAUD_SIGNATURE_MATCH = "FRAUD_SIGNATURE_MATCH"


@dataclass
class Alert:
    """Represents a fraud alert"""
    alert_id: str
    transaction_id: str
    customer_id: str
    alert_type: AlertType
    severity: RiskLevel
    message: str
    details: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)
    acknowledged: bool = False
    resolved: bool = False
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "alert_id": self.alert_id,
            "transaction_id": self.transaction_id,
            "customer_id": self.customer_id,
            "alert_type": self.alert_type.value,
            "severity": self.severity.value,
            "message": self.message,
            "details": self.details,
            "timestamp": self.timestamp.isoformat(),
            "acknowledged": self.acknowledged,
            "resolved": self.resolved,
            "resolved_by": self.resolved_by,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }


@dataclass
class CustomerProfile:
    """Customer behavioral profile for deviation analysis"""
    customer_id: str
    avg_transaction_amount: float = 0.0
    std_transaction_amount: float = 0.0
    total_transactions: int = 0
    fraud_incidents: int = 0
    typical_channels: List[str] = field(default_factory=list)
    typical_hours: List[int] = field(default_factory=list)
    typical_locations: List[str] = field(default_factory=list)
    last_transaction_time: Optional[datetime] = None
    recent_transaction_amounts: List[float] = field(default_factory=list)
    recent_transaction_times: List[datetime] = field(default_factory=list)
    account_age_days: int = 0
    kyc_verified: bool = False
    risk_score_history: List[float] = field(default_factory=list)
    
    def update_with_transaction(self, amount: float, channel: str, hour: int, 
                                 location: str, timestamp: datetime):
        """Update profile with new transaction data"""
        # Update recent transactions (keep last 50)
        self.recent_transaction_amounts.append(amount)
        self.recent_transaction_times.append(timestamp)
        if len(self.recent_transaction_amounts) > 50:
            self.recent_transaction_amounts.pop(0)
            self.recent_transaction_times.pop(0)
        
        # Update statistics
        self.total_transactions += 1
        amounts = self.recent_transaction_amounts
        self.avg_transaction_amount = np.mean(amounts)
        self.std_transaction_amount = np.std(amounts) if len(amounts) > 1 else 0
        
        # Update typical patterns
        if channel not in self.typical_channels:
            self.typical_channels.append(channel)
        if hour not in self.typical_hours:
            self.typical_hours.append(hour)
        if location and location not in self.typical_locations:
            self.typical_locations.append(location)
        
        self.last_transaction_time = timestamp


class FraudSignature:
    """Known fraud patterns/signatures"""
    
    SIGNATURES = {
        "RAPID_FIRE": {
            "description": "Multiple transactions in very short time",
            "threshold_count": 5,
            "threshold_minutes": 10,
        },
        "ROUND_AMOUNT_FRAUD": {
            "description": "Suspiciously round amounts (like 50000, 100000)",
            "round_amounts": [10000, 20000, 25000, 50000, 75000, 100000],
            "tolerance": 100,
        },
        "JUST_BELOW_LIMIT": {
            "description": "Amounts just below reporting thresholds",
            "limits": [10000, 50000, 100000, 200000],
            "margin": 500,
        },
        "NEW_ACCOUNT_BURST": {
            "description": "High activity from newly created account",
            "max_account_age_days": 7,
            "min_transactions": 5,
        },
        "MIDNIGHT_HIGH_VALUE": {
            "description": "High-value transactions during midnight hours",
            "hours": [0, 1, 2, 3, 4],
            "min_amount": 20000,
        },
        "CHANNEL_HOPPING": {
            "description": "Rapid switching between channels",
            "min_channels": 3,
            "time_window_minutes": 30,
        },
    }


class FraudDetectionEngine:
    """
    Real-Time Fraud Detection Engine
    
    Combines:
    1. ML model predictions
    2. Business rules
    3. Behavioral analysis
    4. Fraud signature matching
    """
    
    def __init__(self, model=None, preprocessor=None):
        self.model = model
        self.preprocessor = preprocessor
        self.customer_profiles: Dict[str, CustomerProfile] = {}
        self.alerts: List[Alert] = []
        self.alert_counter = 0
        self.transaction_velocity: Dict[str, List[datetime]] = defaultdict(list)
        
        # Configurable thresholds
        self.thresholds = {
            "high_value_amount": 50000,
            "medium_value_amount": 20000,
            "new_account_days": 30,
            "very_new_account_days": 7,
            "unusual_hours": [0, 1, 2, 3, 4, 5],
            "high_risk_probability": 0.7,
            "medium_risk_probability": 0.4,
            "velocity_window_minutes": 60,
            "velocity_threshold": 10,
            "amount_deviation_threshold": 3.0,  # Standard deviations
        }
        
        logger.info("FraudDetectionEngine initialized")
    
    def analyze_transaction(
        self,
        transaction_id: str,
        customer_id: str,
        amount: float,
        channel: str,
        hour: int,
        account_age_days: int,
        kyc_verified: str,
        location: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        ml_probability: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Comprehensive transaction analysis combining all detection methods
        
        Returns:
            Dict containing prediction, risk_score, risk_level, alerts, and details
        """
        timestamp = timestamp or datetime.utcnow()
        
        # Get or create customer profile
        profile = self._get_or_create_profile(customer_id, account_age_days, kyc_verified)
        
        # Run all detection methods
        rule_flags = self._apply_business_rules(amount, channel, hour, account_age_days, kyc_verified)
        behavioral_flags = self._analyze_behavior(profile, amount, channel, hour, location, timestamp)
        signature_flags = self._match_fraud_signatures(profile, amount, hour, timestamp)
        velocity_flags = self._check_velocity(customer_id, timestamp)
        
        # Combine all flags
        all_flags = rule_flags + behavioral_flags + signature_flags + velocity_flags
        
        # Calculate composite risk score
        risk_score = self._calculate_composite_risk(
            ml_probability or 0.0,
            len(rule_flags),
            len(behavioral_flags),
            len(signature_flags),
            len(velocity_flags),
        )
        
        # Determine risk level
        risk_level = self._determine_risk_level(risk_score)
        
        # Generate prediction with rule override logic
        # If we have critical flags (VERY_HIGH_AMOUNT + UNVERIFIED_KYC), always flag as fraud
        critical_combination = (
            "VERY_HIGH_AMOUNT" in all_flags and "UNVERIFIED_KYC_HIGH_AMOUNT" in all_flags
        )
        
        # Default threshold-based prediction
        is_fraud = risk_score >= self.thresholds["medium_risk_probability"]
        
        # Override: Multiple rule flags (3+) should trigger fraud regardless of ML score
        if len(rule_flags) >= 3:
            is_fraud = True
            # Boost risk score for critical combinations
            if critical_combination:
                risk_score = max(risk_score, 0.75)  # At least HIGH risk
                risk_level = self._determine_risk_level(risk_score)
        
        # Override: Critical amount + unverified KYC is always fraud
        if critical_combination:
            is_fraud = True
            risk_score = max(risk_score, 0.8)  # At least HIGH risk
            risk_level = self._determine_risk_level(risk_score)
        
        # Generate alerts for high-risk transactions or multiple flags
        generated_alerts = []
        should_alert = (
            risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL] or
            len(all_flags) >= 3 or  # Multiple warning flags
            (risk_level == RiskLevel.MEDIUM and len(all_flags) >= 2)  # Medium risk with flags
        )
        if should_alert:
            # Upgrade risk level for alerting if multiple flags
            alert_severity = risk_level
            if len(all_flags) >= 4 and risk_level == RiskLevel.LOW:
                alert_severity = RiskLevel.MEDIUM
            elif len(all_flags) >= 3 and risk_level == RiskLevel.LOW:
                alert_severity = RiskLevel.MEDIUM
            
            generated_alerts = self._generate_alerts(
                transaction_id, customer_id, amount, alert_severity, all_flags, timestamp
            )
        
        # Update customer profile
        profile.update_with_transaction(amount, channel, hour, location or "Unknown", timestamp)
        profile.risk_score_history.append(risk_score)
        if is_fraud:
            profile.fraud_incidents += 1
        
        # Update velocity tracking
        self._update_velocity(customer_id, timestamp)
        
        # Generate clear explanation
        risk_factors_list = self._generate_risk_factors(all_flags, amount, account_age_days, hour, kyc_verified)
        if is_fraud:
            if len(risk_factors_list) >= 2:
                explanation = f"⚠️ FRAUD DETECTED: {' | '.join(risk_factors_list[:3])}. This transaction has been flagged and requires immediate review."
            elif len(risk_factors_list) == 1:
                explanation = f"⚠️ FRAUD ALERT: {risk_factors_list[0]}. Transaction blocked for investigation."
            else:
                explanation = f"⚠️ SUSPICIOUS ACTIVITY: Risk score {round(risk_score*100)}% exceeds threshold. Manual verification required."
        else:
            explanation = f"✓ Transaction approved. Risk assessment: {risk_level.value} ({round(risk_score*100, 1)}%). No immediate concerns detected."
        
        return {
            "transaction_id": transaction_id,
            "customer_id": customer_id,
            "prediction": "Fraud" if is_fraud else "Legitimate",
            "is_fraud": 1 if is_fraud else 0,
            "risk_score": round(risk_score, 4),
            "fraud_probability": round(risk_score, 4),
            "risk_level": risk_level.value,
            "confidence": round(abs(risk_score - 0.5) * 200, 2),
            "explanation": explanation,
            "rule_flags": rule_flags,
            "behavioral_flags": behavioral_flags,
            "signature_flags": signature_flags,
            "velocity_flags": velocity_flags,
            "all_flags": all_flags,
            "alerts_generated": len(generated_alerts),
            "alert_ids": [a.alert_id for a in generated_alerts],
            "risk_factors": risk_factors_list,
            "customer_risk_profile": {
                "total_transactions": profile.total_transactions,
                "fraud_incidents": profile.fraud_incidents,
                "avg_transaction_amount": round(profile.avg_transaction_amount, 2),
                "account_age_days": account_age_days,
            },
        }
    
    def _get_or_create_profile(self, customer_id: str, account_age_days: int, 
                                kyc_verified: str) -> CustomerProfile:
        """Get existing profile or create new one"""
        if customer_id not in self.customer_profiles:
            self.customer_profiles[customer_id] = CustomerProfile(
                customer_id=customer_id,
                account_age_days=account_age_days,
                kyc_verified=kyc_verified.lower() == "yes",
            )
        return self.customer_profiles[customer_id]
    
    def _apply_business_rules(self, amount: float, channel: str, hour: int,
                               account_age_days: int, kyc_verified: str) -> List[str]:
        """Apply business rules for fraud detection"""
        flags = []
        kyc_ok = kyc_verified.lower() == "yes"
        
        # Rule 1: High-value transaction from new account
        if amount > self.thresholds["medium_value_amount"] and account_age_days < self.thresholds["new_account_days"]:
            flags.append("HIGH_VALUE_NEW_ACCOUNT")
        
        # Rule 2: Unverified KYC with high amount
        if not kyc_ok and amount > 5000:
            flags.append("UNVERIFIED_KYC_HIGH_AMOUNT")
        
        # Rule 3: Unusual hour transaction
        if hour in self.thresholds["unusual_hours"] and amount > 3000:
            flags.append("UNUSUAL_HOUR_TRANSACTION")
        
        # Rule 4: Very high amount
        if amount > self.thresholds["high_value_amount"]:
            flags.append("VERY_HIGH_AMOUNT")
        
        # Rule 5: Very new account without KYC
        if account_age_days < self.thresholds["very_new_account_days"] and not kyc_ok:
            flags.append("NEW_ACCOUNT_UNVERIFIED")
        
        # Rule 6: High ATM/POS withdrawal
        if channel.lower() in ["atm", "pos"] and amount > 20000:
            flags.append("HIGH_ATM_POS_WITHDRAWAL")
        
        # Rule 7: New account high frequency (implied by other checks)
        if account_age_days < 14 and amount > 10000:
            flags.append("NEW_ACCOUNT_HIGH_VALUE")
        
        return flags
    
    def _analyze_behavior(self, profile: CustomerProfile, amount: float, 
                          channel: str, hour: int, location: Optional[str],
                          timestamp: datetime) -> List[str]:
        """Analyze transaction against customer's behavioral profile"""
        flags = []
        
        # Skip behavioral analysis for new customers with few transactions
        if profile.total_transactions < 5:
            return flags
        
        # Check amount deviation
        if profile.std_transaction_amount > 0:
            z_score = abs(amount - profile.avg_transaction_amount) / profile.std_transaction_amount
            if z_score > self.thresholds["amount_deviation_threshold"]:
                flags.append("AMOUNT_DEVIATION")
        
        # Check for unusually high amount compared to average
        if amount > profile.avg_transaction_amount * 5:
            flags.append("AMOUNT_5X_AVERAGE")
        
        # Check channel anomaly
        if profile.typical_channels and channel not in profile.typical_channels:
            flags.append("NEW_CHANNEL_USED")
        
        # Check hour anomaly
        if profile.typical_hours and hour not in profile.typical_hours:
            # Only flag if significantly different from typical hours
            min_diff = min(abs(hour - h) for h in profile.typical_hours) if profile.typical_hours else 0
            if min_diff > 4:  # More than 4 hours from typical
                flags.append("UNUSUAL_HOUR_FOR_CUSTOMER")
        
        # Check location anomaly
        if location and profile.typical_locations and location not in profile.typical_locations:
            flags.append("NEW_LOCATION_DETECTED")
        
        # Check time since last transaction
        if profile.last_transaction_time:
            time_diff = timestamp - profile.last_transaction_time
            if time_diff < timedelta(minutes=5) and amount > 10000:
                flags.append("RAPID_HIGH_VALUE_TRANSACTION")
        
        # Check for sudden activity spike
        recent_count = len([t for t in profile.recent_transaction_times 
                           if timestamp - t < timedelta(hours=24)])
        if recent_count > 20:  # More than 20 transactions in 24 hours
            flags.append("ACTIVITY_SPIKE_24H")
        
        return flags
    
    def _match_fraud_signatures(self, profile: CustomerProfile, amount: float,
                                 hour: int, timestamp: datetime) -> List[str]:
        """Match transaction against known fraud signatures"""
        flags = []
        
        # Signature: Round amount fraud
        sig = FraudSignature.SIGNATURES["ROUND_AMOUNT_FRAUD"]
        for round_amount in sig["round_amounts"]:
            if abs(amount - round_amount) <= sig["tolerance"]:
                flags.append("ROUND_AMOUNT_SUSPICIOUS")
                break
        
        # Signature: Just below limit
        sig = FraudSignature.SIGNATURES["JUST_BELOW_LIMIT"]
        for limit in sig["limits"]:
            if limit - sig["margin"] <= amount < limit:
                flags.append("JUST_BELOW_REPORTING_LIMIT")
                break
        
        # Signature: Midnight high value
        sig = FraudSignature.SIGNATURES["MIDNIGHT_HIGH_VALUE"]
        if hour in sig["hours"] and amount >= sig["min_amount"]:
            flags.append("MIDNIGHT_HIGH_VALUE_TRANSACTION")
        
        # Signature: New account burst
        sig = FraudSignature.SIGNATURES["NEW_ACCOUNT_BURST"]
        if (profile.account_age_days <= sig["max_account_age_days"] and 
            profile.total_transactions >= sig["min_transactions"]):
            flags.append("NEW_ACCOUNT_BURST_ACTIVITY")
        
        # Signature: Rapid fire transactions
        sig = FraudSignature.SIGNATURES["RAPID_FIRE"]
        recent_times = [t for t in profile.recent_transaction_times 
                       if timestamp - t <= timedelta(minutes=sig["threshold_minutes"])]
        if len(recent_times) >= sig["threshold_count"]:
            flags.append("RAPID_FIRE_TRANSACTIONS")
        
        return flags
    
    def _check_velocity(self, customer_id: str, timestamp: datetime) -> List[str]:
        """Check transaction velocity for the customer"""
        flags = []
        
        # Clean old entries
        window = timedelta(minutes=self.thresholds["velocity_window_minutes"])
        self.transaction_velocity[customer_id] = [
            t for t in self.transaction_velocity[customer_id]
            if timestamp - t <= window
        ]
        
        # Check velocity
        velocity = len(self.transaction_velocity[customer_id])
        if velocity >= self.thresholds["velocity_threshold"]:
            flags.append("VELOCITY_LIMIT_EXCEEDED")
        elif velocity >= self.thresholds["velocity_threshold"] * 0.7:
            flags.append("VELOCITY_WARNING")
        
        return flags
    
    def _update_velocity(self, customer_id: str, timestamp: datetime):
        """Update velocity tracking"""
        self.transaction_velocity[customer_id].append(timestamp)
    
    def _calculate_composite_risk(self, ml_probability: float, rule_count: int,
                                   behavioral_count: int, signature_count: int,
                                   velocity_count: int) -> float:
        """Calculate composite risk score from all sources"""
        # Weights for different signal sources
        weights = {
            "ml": 0.35,
            "rules": 0.25,
            "behavioral": 0.20,
            "signature": 0.15,
            "velocity": 0.05,
        }
        
        # Normalize counts to 0-1 range
        rule_score = min(rule_count / 3, 1.0)  # 3 rules = max score
        behavioral_score = min(behavioral_count / 3, 1.0)
        signature_score = min(signature_count / 2, 1.0)  # 2 signatures = max score
        velocity_score = min(velocity_count / 2, 1.0)
        
        # Calculate weighted average
        composite = (
            weights["ml"] * ml_probability +
            weights["rules"] * rule_score +
            weights["behavioral"] * behavioral_score +
            weights["signature"] * signature_score +
            weights["velocity"] * velocity_score
        )
        
        # Apply boosting for multiple signal types
        active_signals = sum([
            1 if ml_probability > 0.5 else 0,
            1 if rule_count > 0 else 0,
            1 if behavioral_count > 0 else 0,
            1 if signature_count > 0 else 0,
            1 if velocity_count > 0 else 0,
        ])
        
        if active_signals >= 4:
            composite = min(composite * 1.3, 1.0)  # 30% boost for 4+ signals
        elif active_signals >= 3:
            composite = min(composite * 1.15, 1.0)  # 15% boost for 3 signals
        
        return min(max(composite, 0.0), 1.0)
    
    def _determine_risk_level(self, risk_score: float) -> RiskLevel:
        """Determine risk level from score"""
        if risk_score >= 0.85:
            return RiskLevel.CRITICAL
        elif risk_score >= 0.7:
            return RiskLevel.HIGH
        elif risk_score >= 0.4:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW
    
    def _generate_alerts(self, transaction_id: str, customer_id: str, amount: float,
                         risk_level: RiskLevel, flags: List[str], 
                         timestamp: datetime) -> List[Alert]:
        """Generate alerts for high-risk transactions and store in MongoDB"""
        generated = []
        
        # Create primary alert
        self.alert_counter += 1
        alert_id = f"ALT-{timestamp.strftime('%Y%m%d')}-{self.alert_counter:06d}"
        
        alert = Alert(
            alert_id=alert_id,
            transaction_id=transaction_id,
            customer_id=customer_id,
            alert_type=self._determine_primary_alert_type(flags),
            severity=risk_level,
            message=self._generate_alert_message(flags, amount, risk_level),
            details={
                "amount": amount,
                "flags": flags,
                "flag_count": len(flags),
            },
            timestamp=timestamp,
        )
        
        self.alerts.append(alert)
        generated.append(alert)
        
        logger.warning(f"Alert generated: {alert_id} - {alert.message}")
        
        # Store in MongoDB (async, non-blocking)
        try:
            from ..database.alerts import store_alert
            # Convert alert to dict for MongoDB
            alert_data = alert.to_dict()
            # Run async in background (don't wait)
            asyncio.create_task(store_alert(alert_data))
            logger.info(f"Alert {alert_id} queued for MongoDB storage")
        except Exception as e:
            logger.error(f"Failed to queue alert for MongoDB storage: {str(e)}")
            # Continue even if MongoDB storage fails (in-memory still works)
        
        return generated
    
    def _determine_primary_alert_type(self, flags: List[str]) -> AlertType:
        """Determine the primary alert type from flags"""
        # Priority-based mapping
        priority_map = [
            (["VELOCITY_LIMIT_EXCEEDED", "RAPID_FIRE_TRANSACTIONS"], AlertType.VELOCITY_SPIKE),
            (["NEW_LOCATION_DETECTED", "GEOGRAPHIC_ANOMALY"], AlertType.GEOGRAPHIC_ANOMALY),
            (["AMOUNT_DEVIATION", "AMOUNT_5X_AVERAGE"], AlertType.AMOUNT_DEVIATION),
            (["ROUND_AMOUNT_SUSPICIOUS", "JUST_BELOW_REPORTING_LIMIT"], AlertType.FRAUD_SIGNATURE_MATCH),
            (["UNUSUAL_HOUR_TRANSACTION", "MIDNIGHT_HIGH_VALUE_TRANSACTION"], AlertType.UNUSUAL_HOUR),
            (["HIGH_VALUE_NEW_ACCOUNT", "NEW_ACCOUNT_BURST_ACTIVITY"], AlertType.NEW_ACCOUNT_RISK),
            (["UNVERIFIED_KYC_HIGH_AMOUNT", "NEW_ACCOUNT_UNVERIFIED"], AlertType.KYC_VIOLATION),
            (["VERY_HIGH_AMOUNT", "HIGH_ATM_POS_WITHDRAWAL"], AlertType.HIGH_VALUE_TRANSACTION),
        ]
        
        for check_flags, alert_type in priority_map:
            if any(f in flags for f in check_flags):
                return alert_type
        
        return AlertType.PATTERN_DEVIATION
    
    def _generate_alert_message(self, flags: List[str], amount: float, 
                                 risk_level: RiskLevel) -> str:
        """Generate human-readable alert message - clear and action-oriented"""
        
        # Critical priority messages (most severe)
        if "UNVERIFIED_KYC_HIGH_AMOUNT" in flags:
            return f"CRITICAL: ₹{amount:,.0f} transaction from unverified KYC account - Block and investigate immediately"
        if "VERY_HIGH_AMOUNT" in flags and amount >= 1000000:
            return f"CRITICAL ALERT: Extremely high amount ₹{amount:,.0f} detected - Requires immediate verification"
        if "VELOCITY_LIMIT_EXCEEDED" in flags:
            return "FRAUD ALERT: Transaction velocity exceeded safe limits - Potential account takeover"
        if "JUST_BELOW_REPORTING_LIMIT" in flags:
            return f"STRUCTURING SUSPECTED: Amount ₹{amount:,.0f} just below reporting threshold - Review for money laundering"
        
        # High priority messages
        if "MIDNIGHT_HIGH_VALUE_TRANSACTION" in flags:
            return f"HIGH RISK: ₹{amount:,.0f} transaction at unusual hours - Customer verification required"
        if "NEW_ACCOUNT_BURST_ACTIVITY" in flags:
            return "SUSPICIOUS: Burst activity from newly created account - Possible fraud account"
        if "RAPID_FIRE_TRANSACTIONS" in flags:
            return "ALERT: Multiple rapid transactions detected - Unusual pattern identified"
        if "AMOUNT_DEVIATION" in flags or "AMOUNT_5X_AVERAGE" in flags:
            return f"ANOMALY: ₹{amount:,.0f} significantly exceeds customer's typical pattern"
        if "NEW_LOCATION_DETECTED" in flags:
            return "GEOGRAPHIC ALERT: Transaction from new location - Verify customer identity"
        
        # Fallback for any flagged transaction
        return f"{risk_level.value.upper()} RISK: Suspicious transaction pattern detected (₹{amount:,.0f}) - Review required"
    
    def _generate_risk_factors(self, flags: List[str], amount: float, 
                                account_age_days: int, hour: int, 
                                kyc_verified: str) -> List[str]:
        """Generate clear, specific risk factors without hedging language"""
        factors = []
        
        # Amount-based factors (most critical first)
        if amount >= 5000000:
            factors.append(f"Extremely high amount: ₹{amount:,.0f}")
        elif amount > self.thresholds["high_value_amount"]:
            factors.append(f"Very high transaction: ₹{amount:,.0f}")
        elif amount > self.thresholds["medium_value_amount"]:
            factors.append(f"High-value transaction: ₹{amount:,.0f}")
        
        # KYC verification (critical risk factor)
        if kyc_verified.lower() != "yes":
            if amount >= 100000:
                factors.append("CRITICAL: Unverified KYC with large amount")
            else:
                factors.append("Unverified KYC account")
        
        # Account age (fraud indicator)
        if account_age_days < self.thresholds["very_new_account_days"]:
            factors.append(f"Very new account ({account_age_days} days old)")
        elif account_age_days < self.thresholds["new_account_days"]:
            factors.append(f"Recently created account ({account_age_days} days)")
        
        # Timing factors
        if hour in self.thresholds["unusual_hours"]:
            factors.append(f"Unusual transaction time ({hour}:00 hrs)")
        
        # Velocity and pattern factors
        if "VELOCITY_LIMIT_EXCEEDED" in flags:
            factors.append("Transaction velocity exceeded limits")
        if "AMOUNT_DEVIATION" in flags:
            factors.append("Amount deviates significantly from customer pattern")
        if "RAPID_FIRE_TRANSACTIONS" in flags:
            factors.append("Multiple rapid transactions detected")
        if "JUST_BELOW_REPORTING_LIMIT" in flags:
            factors.append("Structuring attempt (amount below reporting limit)")
        
        return factors[:5]  # Top 5 most critical factors
    
    # ==================== Alert Management ====================
    
    def get_alerts(self, status: Optional[str] = None, 
                   severity: Optional[str] = None,
                   limit: int = 100) -> List[Dict[str, Any]]:
        """Get alerts with optional filtering"""
        filtered = self.alerts
        
        if status == "pending":
            filtered = [a for a in filtered if not a.acknowledged and not a.resolved]
        elif status == "acknowledged":
            filtered = [a for a in filtered if a.acknowledged and not a.resolved]
        elif status == "resolved":
            filtered = [a for a in filtered if a.resolved]
        
        if severity:
            filtered = [a for a in filtered if a.severity.value.lower() == severity.lower()]
        
        # Sort by timestamp descending
        filtered = sorted(filtered, key=lambda a: a.timestamp, reverse=True)
        
        return [a.to_dict() for a in filtered[:limit]]
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge an alert"""
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.acknowledged = True
                logger.info(f"Alert acknowledged: {alert_id}")
                return True
        return False
    
    def resolve_alert(self, alert_id: str, resolved_by: str, 
                      resolution_notes: Optional[str] = None) -> bool:
        """Resolve an alert"""
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.resolved = True
                alert.resolved_by = resolved_by
                alert.resolved_at = datetime.utcnow()
                if resolution_notes:
                    alert.details["resolution_notes"] = resolution_notes
                logger.info(f"Alert resolved: {alert_id} by {resolved_by}")
                return True
        return False
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """Get alert statistics"""
        total = len(self.alerts)
        pending = len([a for a in self.alerts if not a.acknowledged and not a.resolved])
        acknowledged = len([a for a in self.alerts if a.acknowledged and not a.resolved])
        resolved = len([a for a in self.alerts if a.resolved])
        
        severity_counts = defaultdict(int)
        type_counts = defaultdict(int)
        
        for alert in self.alerts:
            severity_counts[alert.severity.value] += 1
            type_counts[alert.alert_type.value] += 1
        
        return {
            "total_alerts": total,
            "pending": pending,
            "acknowledged": acknowledged,
            "resolved": resolved,
            "by_severity": dict(severity_counts),
            "by_type": dict(type_counts),
            "resolution_rate": round(resolved / total * 100, 2) if total > 0 else 0,
        }
    
    # ==================== Customer Profile Management ====================
    
    def get_customer_profile(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Get customer profile"""
        profile = self.customer_profiles.get(customer_id)
        if not profile:
            return None
        
        return {
            "customer_id": profile.customer_id,
            "total_transactions": profile.total_transactions,
            "fraud_incidents": profile.fraud_incidents,
            "avg_transaction_amount": round(profile.avg_transaction_amount, 2),
            "std_transaction_amount": round(profile.std_transaction_amount, 2),
            "account_age_days": profile.account_age_days,
            "kyc_verified": profile.kyc_verified,
            "typical_channels": profile.typical_channels,
            "typical_hours": profile.typical_hours,
            "typical_locations": profile.typical_locations,
            "recent_risk_scores": profile.risk_score_history[-10:],
            "avg_risk_score": round(np.mean(profile.risk_score_history), 4) if profile.risk_score_history else 0,
        }
    
    def get_high_risk_customers(self, threshold: float = 0.6, limit: int = 20) -> List[Dict[str, Any]]:
        """Get customers with high average risk scores"""
        customers = []
        
        for customer_id, profile in self.customer_profiles.items():
            if profile.risk_score_history:
                avg_risk = np.mean(profile.risk_score_history)
                if avg_risk >= threshold:
                    customers.append({
                        "customer_id": customer_id,
                        "avg_risk_score": round(avg_risk, 4),
                        "fraud_incidents": profile.fraud_incidents,
                        "total_transactions": profile.total_transactions,
                        "fraud_rate": round(profile.fraud_incidents / profile.total_transactions * 100, 2) if profile.total_transactions > 0 else 0,
                    })
        
        # Sort by avg risk score descending
        customers.sort(key=lambda x: x["avg_risk_score"], reverse=True)
        
        return customers[:limit]


# Global instance for use across the application
fraud_engine: Optional[FraudDetectionEngine] = None


def get_fraud_engine() -> FraudDetectionEngine:
    """Get or create the global fraud detection engine instance"""
    global fraud_engine
    if fraud_engine is None:
        fraud_engine = FraudDetectionEngine()
    return fraud_engine


def initialize_fraud_engine(model=None, preprocessor=None) -> FraudDetectionEngine:
    """Initialize the fraud engine with model and preprocessor"""
    global fraud_engine
    fraud_engine = FraudDetectionEngine(model=model, preprocessor=preprocessor)
    return fraud_engine
