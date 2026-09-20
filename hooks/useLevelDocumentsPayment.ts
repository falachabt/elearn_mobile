import { useState, useRef } from 'react';

import { LevelDocumentsPaymentService, LevelDocumentsPayment } from '@/services/level-documents-payment.service';
import { logger } from '@/utils/logger';

/** Mirror of useCompetitionPayment.ts, without the dead NotchPay methods --
 * scoped to a single level (one payment unlocks exactly that level for 1
 * year). Each screen calls this with its own levelId. */
export const useLevelDocumentsPayment = (levelId: string) => {
  const [payment, setPayment] = useState<LevelDocumentsPayment | null>(null);
  const [latestPayment, setLatestPayment] = useState<LevelDocumentsPayment | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [latestPaymentLoading, setLatestPaymentLoading] = useState(false);

  // Short-lived cache to avoid hammering the DB every time a screen mounts.
  const accessCache = useRef<{ result: boolean; timestamp: number } | null>(null);

  const checkAccess = async (forceRefresh = false) => {
    const now = Date.now();
    const cacheValidityPeriod = 60000;

    if (!forceRefresh && accessCache.current && now - accessCache.current.timestamp < cacheValidityPeriod) {
      setHasAccess(accessCache.current.result);
      return accessCache.current.result;
    }

    setAccessLoading(true);
    try {
      const result = await LevelDocumentsPaymentService.checkAccess(levelId);
      accessCache.current = { result, timestamp: now };
      setHasAccess(result);
      return result;
    } catch (error) {
      logger.error('Error checking level documents access:', error);
      setHasAccess(false);
      return false;
    } finally {
      setAccessLoading(false);
    }
  };

  const invalidateAccessCache = () => {
    accessCache.current = null;
  };

  const getLatestPayment = async () => {
    setLatestPaymentLoading(true);
    try {
      const result = await LevelDocumentsPaymentService.getLatestPayment(levelId);
      setLatestPayment(result);
      setPayment(result);
      return result;
    } catch (error) {
      logger.error('Error getting latest level documents payment:', error);
      return null;
    } finally {
      setLatestPaymentLoading(false);
    }
  };

  const isFinalStatus = (status: string) => LevelDocumentsPaymentService.isFinalStatus(status);

  return {
    payment,
    latestPayment,
    latestPaymentLoading,
    hasAccess,
    accessLoading,
    checkAccess,
    invalidateAccessCache,
    getLatestPayment,
    isFinalStatus,
    setPayment,
  };
};
