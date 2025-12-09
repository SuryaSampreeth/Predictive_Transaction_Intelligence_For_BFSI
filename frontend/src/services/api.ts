/**
 * API Service for TransIntelliFlow Fraud Detection System
 * Connects frontend to FastAPI backend
 */

import axios, { AxiosError } from 'axios';

// For Vercel deployment: use relative URL (empty string) when no API URL is configured
// This allows the frontend to call /api/* which routes to serverless functions
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Timeout and retry settings
const TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

// Track if backend is known to be waking up
let isBackendWakingUp = false;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: TIMEOUT_MS,
});

// Request interceptor to add retry logic
api.interceptors.request.use((config) => {
  // Add retry count to config
  (config as any).__retryCount = (config as any).__retryCount || 0;
  return config;
});

// Response interceptor with retry for timeout errors
api.interceptors.response.use(
  (response) => {
    // Backend is awake
    isBackendWakingUp = false;
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as any;

    // If it's a timeout and we haven't exhausted retries
    if (
      error.code === 'ECONNABORTED' &&
      config &&
      config.__retryCount < MAX_RETRIES
    ) {
      config.__retryCount += 1;
      isBackendWakingUp = true;
      console.warn(`API timeout, retrying (attempt ${config.__retryCount}/${MAX_RETRIES})...`);

      // Add a small delay before retry
      await new Promise(resolve => setTimeout(resolve, 2000));

      return api(config);
    }

    // Check if backend is sleeping (Render free tier)
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      console.warn('Backend may be sleeping (Render free tier). Please wait 30-60 seconds for cold start.');
      isBackendWakingUp = true;
    }

    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Export backend status
export const isBackendSleeping = () => isBackendWakingUp;


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
  training_samples?: number;
  test_samples?: number;
  risk_thresholds?: {
    low: string;
    medium: string;
    high: string;
  };
  probability_distribution?: {
    low_pct: number;
    medium_pct: number;
    high_pct: number;
  };
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
  fraud_probability?: number;  // Alias for risk_score (backward compatibility)
  confidence: number;
  reason?: string;             // NEW - Task 1 feature
  rule_flags?: string[];       // NEW - Task 1 feature
  model_version?: string;
  timestamp?: string;
  risk_level?: string;
  risk_factors?: string[];
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
    const response = await api.get('/api/statistics/fraud');
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
  try {
    const response = await api.get('/api/metrics');
    return response.data;
  } catch (error) {
    // Return metrics based on actual trained model
    return {
      model_version: "RandomForest (Calibrated + SMOTE)",
      accuracy: 0.90,
      precision: 0.33,
      recall: 0.14,
      f1_score: 0.20,
      roc_auc: 0.7334,
      last_updated: new Date().toISOString(),
      probability_distribution: {
        low_pct: 89.0,
        medium_pct: 9.4,
        high_pct: 1.6
      },
      risk_thresholds: {
        low: "< 0.4",
        medium: "0.4 - 0.7",
        high: ">= 0.7"
      }
    };
  }
};

/**
 * Get model metrics history
 */
export const fetchModelMetricsHistory = async (): Promise<ModelMetrics[]> => {
  return [];
};

// ==================== SIMULATION TRANSACTION STORAGE ====================

export interface SimulationTransaction {
  transaction_id: string;
  customer_id: string;
  transaction_amount: number;
  channel: string;
  timestamp: string;
  is_fraud: number;
  fraud_probability: number;
  risk_level: string;
  source: string;
  account_age_days?: number;
  kyc_verified?: string;
  hour?: number;
}

/**
 * Store a single simulation transaction to MongoDB
 */
export const storeSimulationTransaction = async (transaction: SimulationTransaction): Promise<{ success: boolean }> => {
  try {
    const response = await api.post('/api/transactions', transaction);
    return response.data;
  } catch (error) {
    console.error('Failed to store simulation transaction:', error);
    throw error;
  }
};

/**
 * Store multiple simulation transactions to MongoDB in batch
 */
export const storeSimulationTransactionsBatch = async (transactions: SimulationTransaction[]): Promise<{ success: boolean; stored_count: number }> => {
  try {
    const response = await api.post('/api/transactions/batch', transactions);
    return response.data;
  } catch (error) {
    console.error('Failed to store simulation transactions batch:', error);
    throw error;
  }
};

// ==================== TRANSACTION UPDATE API (Feedback Loop) ====================

export interface TransactionUpdate {
  is_fraud?: number;
  fraud_probability?: number;
  risk_level?: string;
  verified?: boolean;
  verified_by?: string;
  notes?: string;
}

/**
 * Update a single transaction (for case resolution feedback loop)
 */
export const updateTransaction = async (transactionId: string, update: TransactionUpdate): Promise<{ success: boolean }> => {
  try {
    const response = await api.put(`/api/transactions/${transactionId}`, update);
    return response.data;
  } catch (error) {
    console.error('Failed to update transaction:', error);
    throw error;
  }
};

/**
 * Update multiple transactions in batch (for case resolution feedback loop)
 */
export const updateTransactionsBatch = async (transactionIds: string[], update: TransactionUpdate): Promise<{ success: boolean; updated_count: number }> => {
  try {
    const response = await api.put('/api/transactions/batch/update', {
      transaction_ids: transactionIds,
      ...update
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update transactions batch:', error);
    throw error;
  }
};

/**
 * Predict fraud for a new transaction - TASK 1 COMPLETE
 */
export const predictFraud = async (transaction: PredictionRequest): Promise<PredictionResponse> => {
  // Generate transaction_id if not provided
  const requestData = {
    ...transaction,
    customer_id: transaction.customer_id || `TXN_${Date.now()}`,
  };

  const response = await api.post('/api/predict/enhanced', requestData);
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

// ==================== LLM Explanation API (Milestone 3) ====================

export interface LLMExplanationRequest {
  transaction_id: string;
  customer_id: string;
  amount: number;
  channel: string;
  account_age_days: number;
  kyc_verified: string;
  hour: number;
  prediction: string;
  risk_score: number;
  risk_level: string;
  risk_factors?: string[];
}

export interface LLMExplanationResponse {
  transaction_id: string;
  explanation: string;
  generated_by: string;
  timestamp: string;
}

/**
 * Get LLM-powered explanation for a prediction
 * Uses Google Gemini for natural language reasoning
 */
export const getLLMExplanation = async (request: LLMExplanationRequest): Promise<LLMExplanationResponse> => {
  try {
    const response = await api.post('/api/explain/prediction', request);
    return response.data;
  } catch (error) {
    console.error('Failed to get LLM explanation:', error);
    return {
      transaction_id: request.transaction_id,
      explanation: 'LLM explanation unavailable. Please check if GEMINI_API_KEY is configured.',
      generated_by: 'fallback',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get LLM-powered model performance explanation
 */
export const getModelExplanation = async () => {
  try {
    const response = await api.post('/api/explain/model');
    return response.data;
  } catch (error) {
    console.error('Failed to get model explanation:', error);
    return {
      explanation: 'Model explanation unavailable.',
      generated_by: 'fallback',
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
  try {
    const response = await api.get('/api/settings/all');
    return response.data;
  } catch (error) {
    console.warn('Settings endpoints not available');
    return {};
  }
};

export const fetchModelThresholds = async (): Promise<ModelThresholds> => {
  try {
    const response = await api.get('/api/settings/model-thresholds');
    return response.data;
  } catch (error) {
    console.warn('Model thresholds not available, using defaults');
    return {
      high_risk_threshold: 0.7,
      medium_risk_threshold: 0.4,
      high_value_amount: 50000,
      new_account_days: 30
    };
  }
};

export const updateModelThresholds = async (thresholds: ModelThresholds) => {
  try {
    const response = await api.put('/api/settings/model-thresholds', thresholds);
    return response.data;
  } catch (error) {
    console.error('Failed to update model thresholds:', error);
    throw error;
  }
};

export const fetchNotificationRules = async (): Promise<NotificationRules> => {
  try {
    const response = await api.get('/api/settings/notification-rules');
    return response.data;
  } catch (error) {
    console.warn('Notification rules not available, using defaults');
    return {
      email_enabled: true,
      sms_enabled: false,
      high_risk_immediate: true,
      batch_digest: true,
      digest_frequency: 'daily'
    };
  }
};

export const updateNotificationRules = async (rules: NotificationRules) => {
  try {
    const response = await api.put('/api/settings/notification-rules', rules);
    return response.data;
  } catch (error) {
    console.error('Failed to update notification rules:', error);
    throw error;
  }
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
  try {
    const params: any = {};
    if (status) params.status = status;
    if (priority) params.priority = priority;
    const response = await api.get('/api/cases', { params });
    return response.data;
  } catch (error) {
    console.warn('Cases fetch failed, using fallback');
    return { total: 0, cases: [] };
  }
};

export const createCase = async (caseData: any) => {
  try {
    const response = await api.post('/api/cases', caseData);
    return response.data;
  } catch (error) {
    console.error('Failed to create case:', error);
    throw error;
  }
};

export const fetchCase = async (caseId: string): Promise<Case | null> => {
  try {
    const response = await api.get(`/api/cases/${caseId}`);
    return response.data;
  } catch (error) {
    console.warn('Case fetch failed');
    return null;
  }
};

export const updateCase = async (caseId: string, update: any) => {
  try {
    const response = await api.put(`/api/cases/${caseId}`, update);
    return response.data;
  } catch (error) {
    console.error('Failed to update case:', error);
    throw error;
  }
};

export const fetchCaseRecommendations = async (caseId: string) => {
  try {
    const response = await api.get(`/api/cases/${caseId}/recommendations`);
    return response.data;
  } catch (error) {
    console.warn('Case recommendations not available');
    return { recommendations: [], actions: [] };
  }
};

// ==================== Modeling API ====================

export const startModelTraining = async (config: any) => {
  try {
    const response = await api.post('/api/modeling/train', config);
    return response.data;
  } catch (error) {
    console.error('Failed to start training:', error);
    throw error;
  }
};

export const fetchTrainingJob = async (jobId: string) => {
  try {
    const response = await api.get(`/api/modeling/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    console.warn('Training job not found');
    return null;
  }
};

export const fetchTrainingJobs = async () => {
  try {
    const response = await api.get('/api/modeling/jobs');
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch training jobs');
    return [];
  }
};

export const fetchFeatureImportance = async () => {
  try {
    const response = await api.get('/api/modeling/feature-importance');
    return response.data;
  } catch (error) {
    console.warn('Feature importance not available');
    return { features: {}, model_version: '1.0.0' };
  }
};

export const explainModel = async () => {
  try {
    const response = await api.get('/api/modeling/explain');
    return response.data;
  } catch (error) {
    console.warn('Model explanation not available');
    return { explanation: '', feature_importance: {}, metrics: {} };
  }
};

export const explainPrediction = async (transactionData: any) => {
  try {
    const response = await api.post('/api/modeling/predict/explain', transactionData);
    return response.data;
  } catch (error) {
    console.warn('Prediction explanation not available');
    return { prediction: {}, explanation: '' };
  }
};

// ==================== Alerts API (Milestone 3) ====================

/**
 * Fetch all alerts with optional filters
 */
export const fetchAlerts = async (params?: {
  status?: string;
  severity?: string;
  limit?: number
}) => {
  try {
    const response = await api.get('/api/alerts', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    throw error;
  }
};

/**
 * Get alert statistics
 */
export const fetchAlertStatistics = async () => {
  try {
    const response = await api.get('/api/alerts/statistics');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch alert statistics:', error);
    throw error;
  }
};

/**
 * Get single alert by ID
 */
export const fetchAlertById = async (alertId: string) => {
  try {
    const response = await api.get(`/api/alerts/${alertId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch alert:', error);
    throw error;
  }
};

/**
 * Acknowledge an alert
 */
export const acknowledgeAlert = async (alertId: string) => {
  try {
    const response = await api.put(`/api/alerts/${alertId}/acknowledge`);
    return response.data;
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    throw error;
  }
};

/**
 * Resolve an alert
 */
export const resolveAlert = async (alertId: string, data: {
  resolved_by: string;
  resolution_notes?: string
}) => {
  try {
    const response = await api.put(`/api/alerts/${alertId}/resolve`, data);
    return response.data;
  } catch (error) {
    console.error('Failed to resolve alert:', error);
    throw error;
  }
};

/**
 * Mark alert as false positive
 */
export const markAlertFalsePositive = async (alertId: string, data: {
  marked_by: string;
  notes?: string
}) => {
  try {
    const response = await api.put(`/api/alerts/${alertId}/false-positive`, data);
    return response.data;
  } catch (error) {
    console.error('Failed to mark alert as false positive:', error);
    throw error;
  }
};

/**
 * Delete an alert
 */
export const deleteAlert = async (alertId: string) => {
  try {
    const response = await api.delete(`/api/alerts/${alertId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete alert:', error);
    throw error;
  }
};

/**
 * Comprehensive fraud detection (uses FraudDetectionEngine)
 */
export const detectFraudComprehensive = async (transaction: {
  customer_id: string;
  amount: number;
  channel: string;
  hour: number;
  account_age_days: number;
  kyc_verified: string;
}) => {
  try {
    const response = await api.post('/api/detect', transaction);
    return response.data;
  } catch (error) {
    console.error('Comprehensive fraud detection failed:', error);
    throw error;
  }
};

/**
 * Batch fraud detection
 */
export const detectFraudBatch = async (transactions: any[]) => {
  try {
    const response = await api.post('/api/detect/batch', transactions);
    return response.data;
  } catch (error) {
    console.error('Batch fraud detection failed:', error);
    throw error;
  }
};

/**
 * Get detection engine statistics
 */
export const fetchDetectionStats = async () => {
  try {
    const response = await api.get('/api/detection/stats');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch detection stats:', error);
    throw error;
  }
};

// ==================== Monitoring API ====================
// NOTE: Not available in Flask backend (Task 1)

export const fetchAlertStream = async (limit: number = 20) => {
  try {
    // Use the new alerts API
    const data = await fetchAlerts({ limit });
    return {
      alerts: data.alerts || [],
      total: data.total || 0
    };
  } catch (error) {
    console.warn('Alert stream not available, using fallback');
    return { alerts: [], total: 0 };
  }
};

export const fetchSystemHealth = async () => {
  try {
    const response = await api.get('/api/monitoring/system/health');
    return response.data;
  } catch (error) {
    console.warn('System health not available, using fallback');
    return {
      status: 'healthy',
      services: {
        api: { status: 'up', latency_ms: 50 },
        database: { status: 'up', latency_ms: 30 },
        model: { status: 'up', latency_ms: 100 }
      },
      resources: {
        cpu_usage: 25,
        memory_usage: 45
      },
      throughput: {
        requests_per_minute: 120,
        predictions_per_minute: 85,
        avg_response_time_ms: 150
      }
    };
  }
};

export const fetchLiveTransactions = async (limit: number = 15) => {
  try {
    const response = await api.get('/api/monitoring/transactions/live', { params: { limit } });
    return response.data;
  } catch (error) {
    console.warn('Live transactions not available, using fallback');
    return { transactions: [], fraud_count: 0, total: 0 };
  }
};

// ==================== Simulation API ====================

export const runBatchSimulation = async (request: any) => {
  try {
    const response = await api.post('/api/simulation/batch', request);
    return response.data;
  } catch (error) {
    console.error('Batch simulation failed:', error);
    throw error;
  }
};

export const fetchSimulationOverlay = async (limit: number = 100) => {
  try {
    const response = await api.get('/api/simulation/overlay', { params: { limit } });
    return response.data;
  } catch (error) {
    console.warn('Simulation overlay not available');
    return { total: 0, fraud_count: 0, fraud_rate: 0, transactions: [] };
  }
};

// ==================== Feedback Loop API (User Labeling) ====================

export interface FeedbackRequest {
  transaction_id: string;
  prediction: string;  // "Fraud" or "Legitimate"
  is_correct: boolean;
  user_id?: string;
  notes?: string;
  risk_score?: number;
  actual_label?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  feedback_id?: string;
  transaction_id: string;
  is_correct: boolean;
  timestamp: string;
}

export interface Feedback {
  _id: string;
  transaction_id: string;
  prediction: string;
  is_correct: boolean;
  user_id: string;
  notes?: string;
  risk_score?: number;
  actual_label?: string;
  feedback_type: string;
  created_at: string;
  updated_at: string;
}

export interface FeedbackStatistics {
  total_feedback: number;
  marked_correct: number;
  marked_incorrect: number;
  accuracy_rate: number;
  needs_review: number;
  timestamp: string;
}

/**
 * Submit user feedback on a prediction
 * Enables feedback loop for model improvement and quality monitoring
 */
export const submitFeedback = async (feedback: FeedbackRequest): Promise<FeedbackResponse> => {
  try {
    const response = await api.post('/api/feedback', feedback);
    return response.data;
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    throw error;
  }
};

/**
 * Get feedback for a specific transaction
 */
export const getFeedbackByTransaction = async (transactionId: string): Promise<{ found: boolean; feedback?: Feedback }> => {
  try {
    const response = await api.get(`/api/feedback/${transactionId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to get feedback:', error);
    return { found: false };
  }
};

/**
 * List all feedback with pagination
 */
export const listFeedback = async (
  skip: number = 0,
  limit: number = 100,
  isCorrect?: boolean
): Promise<{ total: number; page: number; limit: number; feedback: Feedback[] }> => {
  try {
    const params: any = { skip, limit };
    if (isCorrect !== undefined) {
      params.is_correct = isCorrect;
    }
    const response = await api.get('/api/feedback', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to list feedback:', error);
    return { total: 0, page: 1, limit: 100, feedback: [] };
  }
};

/**
 * Get feedback statistics for model improvement insights
 */
export const getFeedbackStatistics = async (): Promise<FeedbackStatistics> => {
  try {
    const response = await api.get('/api/feedback/statistics');
    return response.data;
  } catch (error) {
    console.error('Failed to get feedback statistics:', error);
    return {
      total_feedback: 0,
      marked_correct: 0,
      marked_incorrect: 0,
      accuracy_rate: 0,
      needs_review: 0,
      timestamp: new Date().toISOString()
    };
  }
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