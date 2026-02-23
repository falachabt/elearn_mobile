# PostHog - Session Replay & Error Tracking

Cette documentation décrit l'implémentation de PostHog avec Session Replay et la capture automatique des erreurs dans l'application ELearn Mobile.

## 📋 Table des Matières

- [Fonctionnalités Activées](#fonctionnalités-activées)
- [Configuration](#configuration)
- [Session Replay](#session-replay)
- [Capture d'Erreurs](#capture-derreurs)
- [Utilisation](#utilisation)
- [Événements Capturés](#événements-capturés)
- [Visualisation dans PostHog](#visualisation-dans-posthog)

---

## ✨ Fonctionnalités Activées

### 1. **Session Replay**
- Enregistrement des sessions utilisateur en React Native
- Capture des interactions tactiles
- Masquage automatique des champs de saisie sensibles
- Capture de la télémétrie réseau

### 2. **Capture d'Erreurs Automatique**
- Erreurs JavaScript non gérées
- Erreurs React (via ErrorBoundary)
- Rejets de promesses non gérés
- Logs d'erreurs du logger personnalisé
- Warnings en production

### 3. **Tracking des Événements du Cycle de Vie**
- Démarrage/fermeture de l'app
- Transitions de l'app (background/foreground)
- Navigation entre écrans

---

## ⚙️ Configuration

### Fichier: `lib/posthog.ts`

```typescript
export const posthog = new PostHog(posthogApiKey ?? '', {
  host: 'https://eu.i.posthog.com',
  captureAppLifecycleEvents: true,
  
  // Session Replay activé
  enableSessionReplay: true,
  sessionReplayConfig: {
    maskAllTextInputs: true,        // Masquer les saisies
    maskAllImages: false,           // Ne pas masquer les images
    captureNetworkTelemetry: true,  // Capturer les requêtes réseau
  },
});
```

### Configuration Clé

| Option | Valeur | Description |
|--------|--------|-------------|
| `enableSessionReplay` | `true` | Active l'enregistrement des sessions |
| `maskAllTextInputs` | `true` | Masque automatiquement tous les champs de texte (sécurité) |
| `maskAllImages` | `false` | Les images sont visibles dans les replays |
| `captureNetworkTelemetry` | `true` | Enregistre les requêtes réseau |
| `captureAppLifecycleEvents` | `true` | Track ouverture/fermeture app |

---

## 🎬 Session Replay

### Qu'est-ce qui est Enregistré?

✅ **Capturé:**
- Tous les clics/touches de l'utilisateur
- Navigation entre écrans
- Scrolling
- Apparence de l'interface
- Requêtes réseau (avec télémétrie)
- Transitions et animations

🔒 **Protégé (Masqué):**
- Champs de saisie de texte (mots de passe, emails, etc.)
- Données sensibles

### Comment Voir les Replays?

1. Connectez-vous à PostHog: https://eu.i.posthog.com
2. Allez dans **Session Recordings**
3. Filtrez par:
   - Utilisateur
   - Date/heure
   - Événements spécifiques
   - Erreurs rencontrées

---

## 🐛 Capture d'Erreurs

### Types d'Erreurs Capturées

#### 1. **Erreurs JavaScript Non Gérées**
Fichier: `utils/errorHandler.ts`

```typescript
// Automatiquement capturé via ErrorUtils.setGlobalHandler()
// Exemple d'événement envoyé:
{
  event: 'uncaught_exception',
  error_name: 'TypeError',
  error_message: 'Cannot read property...',
  error_stack: '...',
  is_fatal: true,
  timestamp: '2026-02-24T...'
}
```

#### 2. **Erreurs React (ErrorBoundary)**
Fichier: `components/ErrorBoundary.tsx`

```typescript
// Capture les erreurs de rendu React
{
  event: 'react_error_boundary',
  error_name: 'Error',
  error_message: 'Failed to render component',
  error_stack: '...',
  component_stack: '...',
  timestamp: '2026-02-24T...'
}
```

#### 3. **Rejets de Promesses Non Gérés**

```typescript
{
  event: 'unhandled_promise_rejection',
  rejection_id: 'unique-id',
  error_name: 'NetworkError',
  error_message: 'Request failed',
  error_stack: '...',
  timestamp: '2026-02-24T...'
}
```

#### 4. **Erreurs du Logger**

```typescript
// Erreurs loggées via logger.error()
import { logger } from '@/utils/logger';

logger.error('Failed to load user data:', error);
// → Automatiquement envoyé à PostHog

{
  event: 'console_error',
  message: 'Failed to load user data: ...',
  error_name: 'Error',
  error_message: '...',
  error_stack: '...',
  timestamp: '2026-02-24T...'
}
```

#### 5. **Warnings en Production**

```typescript
logger.warn('API deprecated'); 
// → Envoyé à PostHog en production

{
  event: 'console_warning',
  message: 'API deprecated',
  timestamp: '2026-02-24T...'
}
```

---

## 📖 Utilisation

### Utiliser le Logger (Recommandé)

```typescript
import { logger } from '@/utils/logger';

// Development + Production
logger.error('Critical error', error);

// Production uniquement
logger.warn('Something unusual happened');

// Development uniquement
logger.log('Debug info');
logger.debug('Detailed debug info');
```

### Reporter Manuellement une Erreur

```typescript
import { reportError } from '@/utils/errorHandler';

try {
  await fetchData();
} catch (error) {
  reportError(error as Error, {
    context: 'user_profile',
    user_id: userId,
    action: 'fetch_data'
  });
}
```

### Tracker une Exception Gérée

```typescript
import { trackHandledException } from '@/utils/errorHandler';

if (!data) {
  trackHandledException(
    'Data validation failed',
    'ValidationError',
    {
      field: 'email',
      expected: 'valid email',
      received: userInput
    }
  );
}
```

### Wrapper un Composant avec ErrorBoundary

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Avec UI de fallback personnalisée
<ErrorBoundary fallback={<CustomErrorScreen />}>
  <MyComponent />
</ErrorBoundary>

// Avec UI par défaut
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

---

## 📊 Événements Capturés

| Événement | Type | Description |
|-----------|------|-------------|
| `uncaught_exception` | Error | Erreur JS non gérée |
| `react_error_boundary` | Error | Erreur de rendu React |
| `unhandled_promise_rejection` | Error | Promise rejetée non gérée |
| `console_error` | Error | Erreur loggée via logger.error() |
| `console_warning` | Warning | Warning loggé en production |
| `manual_error_report` | Error | Erreur reportée manuellement |
| `handled_exception` | Info | Exception gérée trackée |

---

## 📈 Visualisation dans PostHog

### Dashboard Recommandé

Créez un dashboard avec:

1. **Taux d'Erreurs**
   ```
   Événements: uncaught_exception, react_error_boundary
   Métrique: Count par jour
   ```

2. **Top Erreurs**
   ```
   Événements: Tous les types d'erreurs
   Groupé par: error_message
   Trié par: Count (DESC)
   ```

3. **Erreurs par Utilisateur**
   ```
   Événements: Tous les types d'erreurs
   Groupé par: distinct_id
   ```

4. **Session Replays avec Erreurs**
   ```
   Filtre: Sessions contenant des erreurs
   Vue: Session Recordings
   ```

### Alertes Recommandées

1. **Erreurs Critiques**
   - Condition: `uncaught_exception` avec `is_fatal: true`
   - Action: Email immédiat

2. **Pic d'Erreurs**
   - Condition: Plus de 10 erreurs/minute
   - Action: Notification Slack

3. **Erreur Nouvelle**
   - Condition: Nouveau `error_message` jamais vu
   - Action: Email

---

## 🔍 Debugging

### Voir les Erreurs en Dev

Les erreurs sont toujours loggées dans la console en développement:

```typescript
// En développement
logger.error('Test error'); // → Console + PostHog

// En production
logger.error('Production error'); // → PostHog uniquement
```

### Tester la Capture d'Erreurs

```typescript
// Test ErrorBoundary
throw new Error('Test error boundary');

// Test uncaught exception
setTimeout(() => {
  throw new Error('Test uncaught error');
}, 1000);

// Test unhandled promise
Promise.reject(new Error('Test promise rejection'));

// Test logger
logger.error('Test logger error', new Error('Test'));
```

---

## ⚠️ Considérations de Performance

### Session Replay

- **Impact**: Minimal (~1-2% CPU, ~5-10MB RAM)
- **Stockage**: Replays conservés 30 jours par défaut
- **Bande passante**: ~100-500 KB par session

### Capture d'Erreurs

- **Impact**: Négligeable (< 1ms par erreur)
- **Débit**: Batched, max 10 erreurs/seconde

### Recommandations

✅ **Faire:**
- Utiliser `logger.error()` pour les vraies erreurs
- Reporter les erreurs importantes manuellement
- Vérifier régulièrement le dashboard

❌ **Ne pas faire:**
- Logger toutes les requêtes (utilisez debug)
- Envoyer des données sensibles non masquées
- Capturer trop d'événements personnalisés

---

## 🔐 Sécurité et Confidentialité

### Données Masquées Automatiquement

- Tous les champs `<TextInput>` (mots de passe, emails, etc.)
- Pas de capture de données personnelles identifiables par défaut

### Configuration de Masquage Supplémentaire

Si besoin de masquer d'autres éléments:

```typescript
// Dans posthog.ts
sessionReplayConfig: {
  maskAllTextInputs: true,
  maskAllImages: true,  // Masquer aussi les images si nécessaire
  // Masquer des composants spécifiques
  maskElement: (element) => {
    // Logique personnalisée
    return element.props?.sensitive === true;
  }
}
```

---

## 📚 Ressources

- [PostHog React Native SDK](https://posthog.com/docs/libraries/react-native)
- [Session Replay Documentation](https://posthog.com/docs/session-replay)
- [Error Tracking Best Practices](https://posthog.com/docs/product-analytics/capture-events)

---

## 🆘 Support

Pour toute question ou problème:
1. Vérifier les logs de développement
2. Consulter le dashboard PostHog
3. Contacter l'équipe technique
