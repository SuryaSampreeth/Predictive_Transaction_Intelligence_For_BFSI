"""
Module 3: Real-Time Fraud Detection Engine
Milestone 3 (Weeks 5-6)

Components:
- FraudDetectionEngine: Main fraud detection logic
- Alert: Alert data structure
- AlertType: Types of fraud alerts
- RiskLevel: Risk level enumeration
- CustomerProfile: Customer behavioral profile
- FraudSignature: Known fraud patterns
"""

from .fraud_detector import (
    FraudDetectionEngine,
    Alert,
    AlertType,
    RiskLevel,
    CustomerProfile,
    FraudSignature,
    get_fraud_engine,
    initialize_fraud_engine,
)

__all__ = [
    'FraudDetectionEngine',
    'Alert',
    'AlertType',
    'RiskLevel',
    'CustomerProfile',
    'FraudSignature',
    'get_fraud_engine',
    'initialize_fraud_engine',
]
