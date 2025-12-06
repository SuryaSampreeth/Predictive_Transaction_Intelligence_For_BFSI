/**
 * Transaction Type Definitions
 * Note: Mock data generators have been removed. All data comes from the backend API.
 */

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  channel: string;
  type: string;
  location: string;
  customerSegment: string;
  isFraud: boolean;
  fraudProbability: number;
  deviceType: string;
}

// Empty array - no mock transactions. Use API calls instead.
export const mockTransactions: Transaction[] = [];

// Model metrics should come from the API via fetchModelMetrics()
export const modelMetrics = {
  accuracy: 0,
  precision: 0,
  recall: 0,
  f1Score: 0,
};
