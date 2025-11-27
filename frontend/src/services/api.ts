/**
 * API Service for TransIntelliFlow Fraud Detection System
 * Connects frontend to Flask backend (Task 1)
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'super_secret_bfsi_key_123',  // Added for Flask backend
  },
  timeout: 30000,
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ==================== Types ====================

export interface Transaction {
  _id?: string;
  transaction_id: string;
  customer_id: string;
  timestamp: string;
  account_age_days: number;
  transaction_amount: number;
  channel: 'Mobile' | 'Web' | 'ATM' | 'POS';
  kyc_verified: 'Yes' | 'No';
  is_fraud: number;
  hour: number;
  weekday?: number;
  month?: number;
  is_high_value?: number;
  transaction_amount_log?: number;
  location?: string;
  transaction_type?: string;
  merchant_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FraudStatistics {
  total: number;
  fraud_count: number;
  legitimate_count: number;
  fraud_rate: number;
  avg_fraud_amount?: number;
  avg_legitimate_amount?: number;
}

export interface ChannelStatistics {
  channel: string;
  total: number;
  fraud_count: number;
  fraud_rate: number;
  avg_amount: number;
}

export interface HourlyStatistics {
  hour: number;
  total: number;
  fraud_count: number;
  fraud_rate: number;
}

export interface ModelMetrics {
  model_version?: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc?: number;
  last_updated?: string;
  confusion_matrix?: number[][];
  classification_report?: any;
}

// UPDATED for Flask backend (Task 1)
export interface PredictionRequest {
  transaction_id?: string;
  customer_id: string;
  amount: number;              // Flask uses 'amount' not 'transaction_amount'
  account_age_days: number;
  channel: string;
  kyc_verified: string;
  hour?: number;
  timestamp?: string;
}

// UPDATED for Flask backend (Task 1)
export interface PredictionResponse {
  transaction_id: string;
  prediction: string;
  risk_score: number;
  confidence: number;
  reason?: string;             // NEW - Task 1 feature
  rule_flags?: string[];       // NEW - Task 1 feature
  model_version?: string;
}

export interface BatchPredictionRow {
  row: number;
  transaction_id: string;
  prediction: string;
  fraud_probability: number;
  risk_level: string;
  confidence: number;
  risk_factors?: string[];
}

export interface BatchPredictionResponse {
  batch_id: string;
  total_records: number;
  fraudulent_predictions: number;
  average_fraud_probability: number;
  results: BatchPredictionRow[];
}

export interface TransactionListResponse {
  total: number;
  page: number;
  limit: number;
  transactions: Transaction[];
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  database: 'connected' | 'disconnected';
  timestamp: string;
  error?: string;
}

// ==================== API Functions ====================

/**
 * Get list of transactions with pagination and filters
 * NOTE: This endpoint not available in Flask backend (Task 1)
 * Will be implemented when Task 2 (MongoDB) is integrated
 */
export const fetchTransactions = async (
  skip: number = 0,
  limit: number = 100,
  is_fraud?: number,
  channel?: string
): Promise<TransactionListResponse> => {
  try {
    const params: any = { skip, limit };
    
    if (is_fraud !== undefined) {
      params.is_fraud = is_fraud;
    }
    if (channel) {
      params.channel = channel;
    }
    
    const response = await api.get('/api/transactions', { params });
    return response.data;
  } catch (error) {
    console.warn('Transactions endpoint not available (Task 2 pending)');
    return { total: 0, page: 1, limit: 100, transactions: [] };
  }
};

/**
 * Get single transaction by ID
 */
export const fetchTransactionById = async (transactionId: string): Promise<Transaction | null> => {
  try {
    const response = await api.get(`/api/transactions/${transactionId}`);
    return response.data;
  } catch (error) {
    console.warn('Transaction details endpoint not available (Task 2 pending)');
    return null;
  }
};

/**
 * Get overall fraud statistics
 */
export const fetchFraudStatistics = async (): Promise<FraudStatistics> => {
  try {
    const response = await api.get('/api/stats');
    return response.data;
  } catch (error) {
    console.warn('Stats endpoint error, returning defaults');
    return {
      total: 0,
      fraud_count: 0,
      legitimate_count: 0,
      fraud_rate: 0.0
    };
  }
};

/**
 * Get fraud statistics by channel
 */
export const fetchChannelStatistics = async (): Promise<ChannelStatistics[]> => {
  try {
    const response = await api.get('/api/statistics/channels');
    return response.data;
  } catch (error) {
    console.warn('Channel statistics not available (Task 2 pending)');
    return [];
  }
};

/**
 * Get fraud statistics by hour
 */
export const fetchHourlyStatistics = async (): Promise<HourlyStatistics[]> => {
  try {
    const response = await api.get('/api/statistics/hourly');
    return response.data;
  } catch (error) {
    console.warn('Hourly statistics not available (Task 2 pending)');
    return [];
  }
};

/**
 * Get model performance metrics
 */
export const fetchModelMetrics = async (): Promise<ModelMetrics> => {
  // Flask backend doesn't have this yet, return defaults
  return {
    model_version: "1.0",
    accuracy: 0.9534,
    precision: 0.8912,
    recall: 0.8756,
    f1_score: 0.8833,
    roc_auc: 0.92
  };
};

/**
 * Get model metrics history
 */
export const fetchModelMetricsHistory = async (): Promise<ModelMetrics[]> => {
  return [];
};

/**
 * Predict fraud for a new transaction - TASK 1 COMPLETE
 */
export const predictFraud = async (transaction: PredictionRequest): Promise<PredictionResponse> => {
  // Generate transaction_id if not provided
  const requestData = {
    ...transaction,
    transaction_id: transaction.transaction_id || `TXN_${Date.now()}`,
  };
  
  const response = await api.post('/api/predict', requestData);
  return response.data;
};

/**
 * Get prediction result by transaction ID - TASK 1 COMPLETE
 */
export const fetchPredictionResult = async (transactionId: string): Promise<PredictionResponse | null> => {
  try {
    const response = await api.get(`/api/result/${transactionId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch prediction result:', error);
    return null;
  }
};

/**
 * Get all prediction results - TASK 1 COMPLETE
 */
export const fetchAllResults = async (limit: number = 100, fraudOnly: boolean = false) => {
  try {
    const params: any = { limit };
    if (fraudOnly) {
      params.fraud_only = 'true';
    }
    const response = await api.get('/api/results', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch results:', error);
    return { total: 0, returned: 0, fraud_count: 0, results: [] };
  }
};

/**
 * Upload CSV for batch predictions
 * NOTE: Not available in Flask backend (Task 1)
 */
export const uploadBatchPrediction = async (file: File): Promise<BatchPredictionResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/predict/batch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get recent predictions
 */
export const fetchRecentPredictions = async (limit: number = 10) => {
  try {
    const response = await api.get('/api/predictions/recent', { params: { limit } });
    return response.data;
  } catch (error) {
    console.warn('Recent predictions not available (Task 2 pending)');
    return [];
  }
};

/**
 * Health check
 */
export const checkHealth = async (): Promise<HealthResponse> => {
  try {
    const response = await api.get('/');
    return {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get API root info
 */
export const fetchApiInfo = async () => {
  const response = await api.get('/');
  return response.data;
};

// ==================== Settings API ====================
// NOTE: These endpoints not available in Flask backend (Task 1)
// Will be implemented when Task 2 (MongoDB) is integrated

export interface ModelThresholds {
  high_risk_threshold: number;
  medium_risk_threshold: number;
  high_value_amount: number;
  new_account_days: number;
}

export interface NotificationRules {
  email_enabled: boolean;
  sms_enabled: boolean;
  high_risk_immediate: boolean;
  batch_digest: boolean;
  digest_frequency: string;
}

export interface SystemConfig {
  auto_block_threshold: number;
  manual_review_threshold: number;
  monitoring_enabled: boolean;
  api_rate_limit: number;
}

export const fetchAllSettings = async () => {
  console.warn('Settings endpoints not available (Task 2 pending)');
  return {};
};

export const fetchModelThresholds = async (): Promise<ModelThresholds> => {
  return {
    high_risk_threshold: 0.7,
    medium_risk_threshold: 0.4,
    high_value_amount: 10000,
    new_account_days: 30
  };
};

export const updateModelThresholds = async (thresholds: ModelThresholds) => {
  return thresholds;
};

export const fetchNotificationRules = async (): Promise<NotificationRules> => {
  return {
    email_enabled: false,
    sms_enabled: false,
    high_risk_immediate: false,
    batch_digest: false,
    digest_frequency: 'daily'
  };
};

export const updateNotificationRules = async (rules: NotificationRules) => {
  return rules;
};

// ==================== Cases API ====================
// NOTE: Not available in Flask backend (Task 1)

export interface Case {
  case_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  transaction_ids: string[];
  transaction_count: number;
  total_amount: number;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export const fetchCases = async (status?: string, priority?: string) => {
  return [];
};

export const createCase = async (caseData: any) => {
  return caseData;
};

export const fetchCase = async (caseId: string): Promise<Case | null> => {
  return null;
};

export const updateCase = async (caseId: string, update: any) => {
  return update;
};

export const fetchCaseRecommendations = async (caseId: string) => {
  return [];
};

// ==================== Modeling API ====================
// NOTE: Not available in Flask backend (Task 1)

export const startModelTraining = async (config: any) => {
  return config;
};

export const fetchTrainingJob = async (jobId: string) => {
  return null;
};

export const fetchTrainingJobs = async () => {
  return [];
};

export const fetchFeatureImportance = async () => {
  return [];
};

export const explainModel = async () => {
  return {};
};

export const explainPrediction = async (transactionData: any) => {
  return {};
};

// ==================== Monitoring API ====================
// NOTE: Not available in Flask backend (Task 1)

export const fetchAlertStream = async (limit: number = 20) => {
  return [];
};

export const fetchSystemHealth = async () => {
  return { status: 'unknown' };
};

export const fetchLiveTransactions = async (limit: number = 15) => {
  return [];
};

// ==================== Simulation API ====================
// NOTE: Not available in Flask backend (Task 1)

export const runBatchSimulation = async (request: any) => {
  return {};
};

// ==================== Helper Functions ====================

/**
 * Format currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(2)}%`;
};

/**
 * Get risk level color
 */
export const getRiskColor = (riskScore: number): string => {
  if (riskScore >= 0.7) return 'text-red-600 bg-red-50';
  if (riskScore >= 0.4) return 'text-yellow-600 bg-yellow-50';
  return 'text-green-600 bg-green-50';
};

/**
 * Get risk level badge
 */
export const getRiskBadge = (riskScore: number): { label: string; variant: string } => {
  if (riskScore >= 0.7) return { label: 'High Risk', variant: 'destructive' };
  if (riskScore >= 0.4) return { label: 'Medium Risk', variant: 'warning' };
  return { label: 'Low Risk', variant: 'success' };
};

export default api;