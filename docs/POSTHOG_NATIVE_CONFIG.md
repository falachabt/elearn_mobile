# PostHog Configuration - Error Tracking & Session Replay

Configuration PostHog selon la documentation officielle pour capturer automatiquement les erreurs sans capturer les logs comme événements.

## ✅ Ce qui est Configuré

### 1. **Autocapture des Erreurs** (Native PostHog)
```typescript
// lib/posthog.ts
errorTracking: {
  autocapture: {
    uncaughtExceptions: true,      // Erreurs JS non gérées
    unhandledRejections: true,      // Promesses rejetées
    console: [],                    // N'envoie PAS les console.log comme événements
  },
}
```

### 2. **Session Replay**
```typescript
enableSessionReplay: true,
sessionReplayConfig: {
  maskAllTextInputs: true,          // Masque les données sensibles
  maskAllImages: false,
  captureNetworkTelemetry: true,    // Capture requêtes réseau
}
```

### 3. **PostHogErrorBoundary**
Capture automatiquement les erreurs React et les envoie à PostHog.

```typescript
// providers/index.tsx
<PostHogErrorBoundary 
  fallback={ErrorFallback}
  additionalProperties={{ screen: 'app' }}
>
  <YourApp />
</PostHogErrorBoundary>
```

---

## 🎯 Ce qui est Capturé Automatiquement

✅ **Capturé par PostHog :**
- Erreurs JavaScript non gérées (`uncaughtExceptions`)
- Rejets de promesses non gérées (`unhandledRejections`)
- Erreurs de rendu React (via `PostHogErrorBoundary`)
- Sessions utilisateur avec replay vidéo
- Télémétrie réseau

❌ **NON capturé :**
- `console.log()` / `console.warn()` comme événements
- Logs de debug

---

## 📖 Utilisation

### Utiliser le Logger (Ne crée PAS d'événements)

```typescript
import { logger } from '@/utils/logger';

// Logs normaux (dev uniquement, PAS envoyé à PostHog)
logger.log('User logged in');
logger.warn('API rate limit approaching');

// Erreurs (console uniquement, PostHog les capture automatiquement)
logger.error('Failed to load data', error);
```

### Capturer Manuellement une Exception

```typescript
import { posthog } from '@/lib/posthog';

try {
  await riskyOperation();
} catch (error) {
  // Capture manuelle avec contexte
  posthog.captureException(error, {
    context: 'user_profile',
    user_id: userId
  });
}
```

### Fonctions Helper

```typescript
import { trackError, trackApiError, trackValidationError } from '@/utils/analytics';

// Erreur générique
trackError(error, { action: 'save_profile' });

// Erreur API
trackApiError('/api/users', error, 500);

// Erreur de validation
trackValidationError('email', 'Invalid format', userInput);
```

---

## 🔍 Voir les Erreurs dans PostHog

1. **Dashboard** : https://us.posthog.com
2. **Session Recordings** : Voir les sessions avec replay
3. **Errors** : Tab "Errors" pour voir toutes les exceptions
4. **Insights** : Créer des graphiques pour monitorer les erreurs

---

## 🎬 Session Replay

Les sessions sont automatiquement enregistrées avec :
- Toutes les interactions utilisateur
- Navigation entre écrans
- Requêtes réseau (télémétrie)
- Données sensibles masquées (TextInput)

**Voir les replays :**
1. PostHog → Session Recordings
2. Filtrer par erreurs : Sessions contenant des exceptions
3. Replay vidéo de la session complète

---

## ⚠️ Important

### Ne PAS faire

❌ **Ne pas capturer les logs comme événements**
```typescript
// ❌ MAUVAIS - Ne faites pas ça
logger.error('Error'); // → Ne devient PAS un événement PostHog
```

Les erreurs sont automatiquement capturées par `errorTracking.autocapture`.

### Faire

✅ **Utiliser captureException pour les erreurs traitées**
```typescript
// ✅ BON - Pour erreurs gérées mais importantes
try {
  await operation();
} catch (error) {
  posthog.captureException(error, { context: 'operation' });
}
```

---

## 🐛 Debugging

### Vérifier que ça fonctionne

```typescript
// Test en dev
import { testErrorTracking } from '@/docs/error-tracking-examples';

if (__DEV__) {
  testErrorTracking();
}
```

### Dev Mode Behavior

⚠️ En développement, React propage toutes les erreurs au global handler même si elles sont capturées par PostHogErrorBoundary. Vous verrez peut-être des erreurs reportées deux fois en dev. C'est normal et n'arrive pas en production.

---

## 📊 Configuration PostHog Dashboard

### Insights Recommandés

1. **Erreurs par jour**
   - Type: **Errors**
   - Groupé par: **exception_type**

2. **Top Erreurs**
   - Type: **Errors**
   - Trier par: **Count**

3. **Sessions avec erreurs**
   - Type: **Session Recordings**
   - Filtre: **Contains error**

4. **Taux d'erreurs**
   - Erreurs / Total sessions

---

## 🔐 Sécurité

### Données Masquées

✅ **Automatiquement masqué :**
- Tous les `<TextInput>` (passwords, emails, etc.)
- Données de formulaires
- Informations personnelles saisies

✅ **Hébergement EU/US :**
- Host: `https://us.posthog.com`
- Données hébergées aux USA
- Pour EU: changer en `https://eu.i.posthog.com`

---

## 📚 Ressources

- [PostHog Error Tracking](https://posthog.com/docs/error-tracking)
- [Session Replay React Native](https://posthog.com/docs/session-replay/react-native)
- [Exemples de Code](error-tracking-examples.ts)

---

## ✅ Résumé

**Configuré :**
- ✅ Autocapture des erreurs (`errorTracking`)
- ✅ Session Replay (`enableSessionReplay`)
- ✅ PostHogErrorBoundary pour erreurs React
- ✅ Logs **NE SONT PAS** envoyés comme événements (`console: []`)

**Utilisation :**
- Logger pour logs normaux (dev uniquement)
- `posthog.captureException()` pour erreurs manuelles
- Tout le reste est automatique !

🎉 **C'est tout ! Les erreurs sont automatiquement capturées.**
