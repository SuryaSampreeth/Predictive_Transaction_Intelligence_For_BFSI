/**
 * API Service for TransIntelliFlow Fraud Detection System
 * Connects frontend to FastAPI backend with MongoDB
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
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
  avg_fraud_amount: number;
  avg_legitimate_amount: number;
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

export interface PredictionRequest {
  customer_id: string;
  account_age_days: number;
  transaction_amount: number;
  channel: string;
  kyc_verified: string;
  hour: number;
  timestamp?: string;
}

export interface PredictionResponse {
  transaction_id: string;
  prediction: string;
  fraud_probability: number;
  confidence: number;
  risk_level: string;
  risk_factors?: string[];
  model_version?: string;
  timestamp?: string;
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
 */
export const fetchTransactions = async (
  skip: number = 0,
  limit: number = 100,
  is_fraud?: number,
  channel?: string
): Promise<TransactionListResponse> => {
  const params: any = { skip, limit };
  
  if (is_fraud !== undefined) {
    params.is_fraud = is_fraud;
  }
  if (channel) {
    params.channel = channel;
  }
  
  const response = await api.get('/api/transactions', { params });
  return response.data;
};

/**
 * Get single transaction by ID
 */
export const fetchTransactionById = async (transactionId: string): Promise<Transaction> => {
  const response = await api.get(`/api/transactions/${transactionId}`);
  return response.data;
};

/**
 * Get overall fraud statistics
 */
export const fetchFraudStatistics = async (): Promise<FraudStatistics> => {
  const response = await api.get('/api/statistics/fraud');
  return response.data;
};

/**
 * Get fraud statistics by channel
 */
export const fetchChannelStatistics = async (): Promise<ChannelStatistics[]> => {
  const response = await api.get('/api/statistics/channels');
  return response.data;
};

/**
 * Get fraud statistics by hour
 */
export const fetchHourlyStatistics = async (): Promise<HourlyStatistics[]> => {
  const response = await api.get('/api/statistics/hourly');
  return response.data;
};

/**
 * Get model performance metrics
 */
export const fetchModelMetrics = async (): Promise<ModelMetrics> => {
  const response = await api.get('/api/metrics');
  return response.data;
};

/**
 * Get model metrics history
 */
export const fetchModelMetricsHistory = async (): Promise<ModelMetrics[]> => {
  const response = await api.get('/api/metrics/history');
  return response.data;
};

/**
 * Predict fraud for a new transaction
 */
export const predictFraud = async (transaction: PredictionRequest): Promise<PredictionResponse> => {
  const response = await api.post('/api/predict/enhanced', transaction);
  return response.data;
};

/**
 * Upload CSV for batch predictions
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
  const response = await api.get('/api/predictions/recent', { params: { limit } });
  return response.data;
};

/**
 * Health check
 */
export const checkHealth = async (): Promise<HealthResponse> => {
  const response = await api.get('/health');
  return response.data;
};

/**
 * Get API root info
 */
export const fetchApiInfo = async () => {
  const response = await api.get('/');
  return response.data;
};

// ==================== Settings API ====================

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
  const response = await api.get('/api/settings/all');
  return response.data;
};

export const fetchModelThresholds = async (): Promise<ModelThresholds> => {
  const response = await api.get('/api/settings/model-thresholds');
  return response.data;
};

export const updateModelThresholds = async (thresholds: ModelThresholds) => {
  const response = await api.put('/api/settings/model-thresholds', thresholds);
  return response.data;
};

export const fetchNotificationRules = async (): Promise<NotificationRules> => {
  const response = await api.get('/api/settings/notification-rules');
  return response.data;
};

export const updateNotificationRules = async (rules: NotificationRules) => {
  const response = await api.put('/api/settings/notification-rules', rules);
  return response.data;
};

// ==================== Cases API ====================

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
  const params: any = {};
  if (status) params.status = status;
  if (priority) params.priority = priority;
  const response = await api.get('/api/cases', { params });
  return response.data;
};

export const createCase = async (caseData: any) => {
  const response = await api.post('/api/cases', caseData);
  return response.data;
};

export const fetchCase = async (caseId: string): Promise<Case> => {
  const response = await api.get(`/api/cases/${caseId}`);
  return response.data;
};

export const updateCase = async (caseId: string, update: any) => {
  const response = await api.put(`/api/cases/${caseId}`, update);
  return response.data;
};

export const fetchCaseRecommendations = async (caseId: string) => {
  const response = await api.get(`/api/cases/${caseId}/recommendations`);
  return response.data;
};

// ==================== Modeling API ====================

export const startModelTraining = async (config: any) => {
  const response = await api.post('/api/modeling/train', config);
  return response.data;
};

export const fetchTrainingJob = async (jobId: string) => {
  const response = await api.get(`/api/modeling/jobs/${jobId}`);
  return response.data;
};

export const fetchTrainingJobs = async () => {
  const response = await api.get('/api/modeling/jobs');
  return response.data;
};

export const fetchFeatureImportance = async () => {
  const response = await api.get('/api/modeling/feature-importance');
  return response.data;
};

export const explainModel = async () => {
  const response = await api.get('/api/modeling/explain');
  return response.data;
};

export const explainPrediction = async (transactionData: any) => {
  const response = await api.post('/api/modeling/predict/explain', transactionData);
  return response.data;
};

// ==================== Monitoring API ====================

export const fetchAlertStream = async (limit: number = 20) => {
  const response = await api.get('/api/monitoring/alerts/stream', { params: { limit } });
  return response.data;
};

export const fetchSystemHealth = async () => {
  const response = await api.get('/api/monitoring/system/health');
  return response.data;
};

export const fetchLiveTransactions = async (limit: number = 15) => {
  const response = await api.get('/api/monitoring/transactions/live', { params: { limit } });
  return response.data;
};

// ==================== Simulation API ====================

export const runBatchSimulation = async (request: any) => {
  const response = await api.post('/api/simulation/batch', request);
  return response.data;
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
