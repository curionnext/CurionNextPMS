import { useTransactionLogStore } from '../stores/transactionLogStore';
import type { TransactionEventType, TransactionLog } from '../services/transactionLogApi';

/**
 * Utility function to generate a random alphanumeric transaction reference
 */
export function generateTransactionReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
}

/**
 * Utility function to log transactions easily from anywhere in the app
 */
export function logTransaction(
  eventType: TransactionEventType,
  entityType: 'reservation' | 'guest' | 'room' | 'payment' | 'bill' | 'user' | 'system',
  entityId: string,
  description: string,
  metadata?: Record<string, any>,
  previousState?: Record<string, any>,
  newState?: Record<string, any>
) {
  const store = useTransactionLogStore.getState();
  
  store.logTransaction({
    eventType,
    entityType: entityType.toUpperCase() as TransactionLog['entityType'],
    entityId,
    description,
    metadata,
    previousState,
    newState,
  }).catch((error) => {
    console.error('Transaction logging failed:', error);
  });
}

/**
 * Hook to get the transaction logger
 */
export function useTransactionLogger() {
  const { logTransaction: storeLogTransaction } = useTransactionLogStore();

  return {
    log: (
      eventType: TransactionEventType,
      entityType: 'reservation' | 'guest' | 'room' | 'payment' | 'bill' | 'user' | 'system',
      entityId: string,
      description: string,
      metadata?: Record<string, any>,
      previousState?: Record<string, any>,
      newState?: Record<string, any>
    ) => {
      return storeLogTransaction({
        eventType,
        entityType: entityType.toUpperCase() as TransactionLog['entityType'],
        entityId,
        description,
        metadata,
        previousState,
        newState,
      });
    },
    generateReference: generateTransactionReference,
  };
}
