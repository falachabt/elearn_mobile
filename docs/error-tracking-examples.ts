/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Exemples d'utilisation du tracking d'erreurs PostHog
 * 
 * Ce fichier contient des exemples pratiques montrant comment utiliser
 * les fonctionnalités de tracking d'erreurs et de session replay dans l'application.
 */

import { logger } from '@/utils/logger';
import { reportError, trackHandledException } from '@/utils/errorHandler';
import { trackError, trackApiError, trackValidationError, trackEvent, Events } from '@/utils/analytics';

// ============================================================================
// EXEMPLE 1: Utiliser le Logger (Recommandé)
// ============================================================================

/**
 * Le logger est la façon la plus simple de tracker les erreurs.
 * Il envoie automatiquement les erreurs à PostHog.
 */
const example1_BasicLogging = async () => {
  try {
    const data = await fetchUserData();
    return data;
  } catch (error) {
    // ✅ Automatiquement envoyé à PostHog avec stack trace
    logger.error('Failed to fetch user data', error);
    throw error;
  }
};

// ============================================================================
// EXEMPLE 2: Tracker une Erreur API
// ============================================================================

/**
 * Utilisez trackApiError pour les erreurs de requêtes API
 */
const example2_ApiError = async () => {
  try {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    // ✅ Track avec contexte API
    trackApiError(
      '/data',
      error as Error,
      (error as any).status
    );
    throw error;
  }
};

// ============================================================================
// EXEMPLE 3: Erreur de Validation
// ============================================================================

/**
 * Utilisez trackValidationError pour les erreurs de validation de formulaire
 */
const example3_ValidationError = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    // ✅ Track la validation échouée
    trackValidationError(
      'email',
      'Invalid email format',
      email // Sera converti en string sécurisé
    );
    return false;
  }
  return true;
};

// ============================================================================
// EXEMPLE 4: Exception Gérée (Non-Bloquante)
// ============================================================================

/**
 * Pour des erreurs attendues qui n'empêchent pas l'app de fonctionner
 */
const example4_HandledException = async () => {
  const cached = await loadFromCache();
  
  if (!cached) {
    // ✅ Erreur gérée mais qu'on veut monitorer
    trackHandledException(
      'Cache miss, fetching from API',
      'CacheError',
      {
        cache_key: 'user_data',
        fallback: 'api'
      }
    );
    return await fetchFromApi();
  }
  
  return cached;
};

// ============================================================================
// EXEMPLE 5: Erreur avec Contexte Riche
// ============================================================================

/**
 * Ajouter beaucoup de contexte pour faciliter le debugging
 */
const example5_RichContext = async (userId: string, courseId: string) => {
  try {
    await enrollUserInCourse(userId, courseId);
  } catch (error) {
    // ✅ Track avec contexte complet
    trackError(error as Error, {
      action: 'course_enrollment',
      user_id: userId,
      course_id: courseId,
      timestamp: new Date().toISOString(),
      user_plan: 'premium',
      platform: 'mobile'
    });
    throw error;
  }
};

// ============================================================================
// EXEMPLE 6: Erreur de Paiement
// ============================================================================

/**
 * Tracker les erreurs critiques de paiement
 */
const example6_PaymentError = async (amount: number, method: string) => {
  try {
    const result = await processPayment(amount, method);
    return result;
  } catch (error) {
    // ✅ Track avec événement personnalisé + contexte
    logger.error('Payment failed', error);
    
    trackEvent(Events.PAYMENT_ERROR, {
      amount,
      payment_method: method,
      error_message: (error as Error).message,
      retry_count: 0
    });
    
    throw error;
  }
};

// ============================================================================
// EXEMPLE 7: Erreur dans un Composant React
// ============================================================================

/**
 * Dans un composant, utilisez logger.error ou trackError
 * 
 * Exemple de code:
 * 
 * import React, { useEffect, useState } from 'react';
 * import { View, Text } from 'react-native';
 * import { logger } from '@/utils/logger';
 * 
 * const MyComponent = () => {
 *   const [data, setData] = useState(null);
 *   
 *   useEffect(() => {
 *     const loadData = async () => {
 *       try {
 *         const result = await fetchData();
 *         setData(result);
 *       } catch (error) {
 *         // ✅ Track l'erreur avec contexte du composant
 *         logger.error('Component failed to load data', error, {
 *           component: 'MyComponent',
 *           phase: 'mount'
 *         });
 *       }
 *     };
 *     
 *     loadData();
 *   }, []);
 *   
 *   return data ? <View><Text>Data loaded</Text></View> : null;
 * };
 */

// ============================================================================
// EXEMPLE 8: Erreur dans Service/Hook Custom
// ============================================================================

/**
 * Dans un service ou hook personnalisé
 * 
 * Exemple de code:
 * 
 * import { useState, useEffect } from 'react';
 * import { trackError } from '@/utils/analytics';
 * 
 * export const useDataFetcher = (id: string) => {
 *   const [data, setData] = useState(null);
 *   const [error, setError] = useState<Error | null>(null);
 *   
 *   useEffect(() => {
 *     const fetch = async () => {
 *       try {
 *         const result = await fetchById(id);
 *         setData(result);
 *       } catch (err) {
 *         const error = err as Error;
 *         setError(error);
 *         
 *         // ✅ Track dans le hook
 *         trackError(error, {
 *           hook: 'useDataFetcher',
 *           resource_id: id
 *         });
 *       }
 *     };
 *     
 *     fetch();
 *   }, [id]);
 *   
 *   return { data, error };
 * };
 */

// ============================================================================
// EXEMPLE 9: Erreur Réseau avec Retry
// ============================================================================

/**
 * Tracker les erreurs réseau avec tentatives de retry
 */
const example9_NetworkRetry = async (url: string, maxRetries = 3) => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        // ✅ Track après toutes les tentatives échouées
        logger.error(`Network request failed after ${maxRetries} attempts`, error);
        
        trackEvent(Events.NETWORK_ERROR, {
          url,
          attempts: maxRetries,
          error_message: lastError.message
        });
      }
    }
    
    // Attendre avant retry
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
  
  throw lastError;
};

// ============================================================================
// EXEMPLE 10: Tester le Tracking
// ============================================================================

/**
 * Fonction de test pour vérifier que le tracking fonctionne
 * À utiliser uniquement en développement
 */
export const testErrorTracking = () => {
  if (!__DEV__) {
    console.warn('testErrorTracking should only be called in development');
    return;
  }
  
  console.log('Testing error tracking...');
  
  // Test 1: Logger error
  logger.error('Test logger error', new Error('This is a test error'));
  
  // Test 2: Track API error
  trackApiError('/test', new Error('Test API error'), 500);
  
  // Test 3: Track validation error
  trackValidationError('test_field', 'Test validation failure', 'invalid-value');
  
  // Test 4: Track handled exception
  trackHandledException('Test handled exception', 'TestError', {
    test: true,
    timestamp: Date.now()
  });
  
  // Test 5: Track with event
  trackEvent(Events.ERROR_OCCURRED, {
    type: 'test',
    message: 'Test event error'
  });
  
  console.log('Error tracking tests completed. Check PostHog dashboard.');
};

// ============================================================================
// Fonctions Helper Factices (Pour les exemples)
// ============================================================================

const fetchUserData = async () => ({ id: '1', name: 'User' });
const fetchData = async () => ({ data: 'test' });
const loadFromCache = async () => null;
const fetchFromApi = async () => ({ data: 'from api' });
const enrollUserInCourse = async (userId: string, courseId: string) => {};
const processPayment = async (amount: number, method: string) => ({ success: true });
const fetchById = async (id: string) => ({ id, data: 'test' });
