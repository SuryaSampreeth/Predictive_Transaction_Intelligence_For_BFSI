/**
 * Transaction Store Context
 * Manages pending transactions from Simulation Lab & Model Testing
 * Routes them to Case Management for feedback verification before MongoDB storage
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PredictionRequest, PredictionResponse } from '@/services/api';

export interface PendingTransaction {
  id: string;
  source: 'simulation' | 'model_testing';
  payload: PredictionRequest;
  prediction: PredictionResponse;
  createdAt: number;
  verified?: boolean;
  feedback?: {
    isCorrect: boolean;
    actualLabel: 'Fraud' | 'Legitimate';
    notes?: string;
    verifiedBy?: string;
    verifiedAt: number;
  };
}

interface TransactionStoreContextType {
  pendingTransactions: PendingTransaction[];
  verifiedTransactions: PendingTransaction[];
  addPendingTransaction: (transaction: PendingTransaction) => void;
  addPendingTransactionsBatch: (transactions: PendingTransaction[]) => void;
  markTransactionVerified: (id: string, isCorrect: boolean, actualLabel: 'Fraud' | 'Legitimate', notes?: string) => void;
  clearVerifiedTransactions: (ids: string[]) => void;
  getPendingCount: () => number;
  getVerifiedCount: () => number;
}

const TransactionStoreContext = createContext<TransactionStoreContextType | undefined>(undefined);

export const TransactionStoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [verifiedTransactions, setVerifiedTransactions] = useState<PendingTransaction[]>([]);

  const addPendingTransaction = (transaction: PendingTransaction) => {
    setPendingTransactions((prev) => [...prev, transaction]);
  };

  const addPendingTransactionsBatch = (transactions: PendingTransaction[]) => {
    setPendingTransactions((prev) => [...prev, ...transactions]);
  };

  const markTransactionVerified = (id: string, isCorrect: boolean, actualLabel: 'Fraud' | 'Legitimate', notes?: string) => {
    setPendingTransactions((prev) => {
      const transaction = prev.find((t) => t.id === id);
      if (!transaction) return prev;

      const verifiedTransaction: PendingTransaction = {
        ...transaction,
        verified: true,
        feedback: {
          isCorrect,
          actualLabel,
          notes,
          verifiedAt: Date.now(),
        },
      };

      setVerifiedTransactions((verif) => [...verif, verifiedTransaction]);
      return prev.filter((t) => t.id !== id);
    });
  };

  const clearVerifiedTransactions = (ids: string[]) => {
    setVerifiedTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
  };

  const getPendingCount = () => pendingTransactions.length;
  const getVerifiedCount = () => verifiedTransactions.length;

  return (
    <TransactionStoreContext.Provider
      value={{
        pendingTransactions,
        verifiedTransactions,
        addPendingTransaction,
        addPendingTransactionsBatch,
        markTransactionVerified,
        clearVerifiedTransactions,
        getPendingCount,
        getVerifiedCount,
      }}
    >
      {children}
    </TransactionStoreContext.Provider>
  );
};

export const useTransactionStore = () => {
  const context = useContext(TransactionStoreContext);
  if (!context) {
    throw new Error('useTransactionStore must be used within TransactionStoreProvider');
  }
  return context;
};
