# Guide de Migration - PostHog Error Tracking

## 🎯 Résumé des Changements

Ce guide décrit les modifications apportées pour activer le **Session Replay** et le **tracking automatique des erreurs** avec PostHog.

---

## ✨ Nouvelles Fonctionnalités

### 1. **Session Replay Activé**
- Enregistrement automatique des sessions utilisateur
- Masquage des données sensibles (champs de texte)
- Capture de la télémétrie réseau

### 2. **Tracking Automatique des Erreurs**
- Erreurs JavaScript non gérées
- Erreurs React (via ErrorBoundary)
- Rejets de promesses non gérées
- Logs d'erreurs via le logger

### 3. **Nouvelles Fonctions Helper**
- `trackError()` - Track une erreur avec contexte
- `trackApiError()` - Track les erreurs API
- `trackValidationError()` - Track les erreurs de validation
- `trackHandledException()` - Track les exceptions gérées

---

## 📁 Fichiers Modifiés

### Configuration
| Fichier | Changements |
|---------|-------------|
| `lib/posthog.ts` | ✅ Activé `enableSessionReplay` et configuration |
| `app/_layout.tsx` | ✅ Ajouté `ErrorBoundary` et initialisation des handlers |

### Gestion des Erreurs
| Fichier | Changements |
|---------|-------------|
| `utils/logger.ts` | ✅ Intégration avec PostHog pour erreurs/warnings |
| `utils/errorHandler.ts` | ✅ **NOUVEAU** - Handlers globaux d'erreurs |
| `utils/analytics.ts` | ✅ Ajouté fonctions helper pour tracking d'erreurs |

### Composants
| Fichier | Changements |
|---------|-------------|
| `components/ErrorBoundary.tsx` | ✅ **NOUVEAU** - Capture erreurs React |

### Documentation
| Fichier | Description |
|---------|-------------|
| `docs/POSTHOG_ERROR_TRACKING.md` | 📖 Documentation complète |
| `docs/error-tracking-examples.ts` | 📖 Exemples d'utilisation |

---

## 🚀 Mise en Production

### Aucune Action Requise

Les changements sont **rétrocompatibles** :
- ✅ Le code existant continue de fonctionner
- ✅ Les erreurs sont automatiquement capturées
- ✅ Pas besoin de modifier le code existant

### Recommandations

Pour profiter pleinement des nouvelles fonctionnalités :

#### 1. **Remplacer `console.log` par `logger`**

```typescript
// ❌ Avant
console.error('Failed to load', error);

// ✅ Après
import { logger } from '@/utils/logger';
logger.error('Failed to load', error);
```

#### 2. **Ajouter du contexte aux erreurs**

```typescript
// ✅ Bon - Avec contexte
try {
  await fetchData();
} catch (error) {
  trackError(error as Error, {
    action: 'fetch_user_profile',
    user_id: userId
  });
}
```

#### 3. **Utiliser ErrorBoundary pour les sections critiques**

```typescript
// ✅ Wrapper les composants sensibles
<ErrorBoundary>
  <CriticalComponent />
</ErrorBoundary>
```

---

## 🔍 Comment Vérifier que Ça Fonctionne

### 1. Vérifier dans PostHog

1. Connectez-vous à [PostHog EU](https://eu.i.posthog.com)
2. Allez dans **Session Recordings** → Vous devriez voir les sessions
3. Allez dans **Events** → Cherchez `console_error`, `uncaught_exception`, etc.

### 2. Tester Localement

```typescript
// Dans n'importe quel composant ou fichier
import { testErrorTracking } from '@/docs/error-tracking-examples';

// En développement uniquement
if (__DEV__) {
  testErrorTracking();
}
```

Puis vérifiez :
- ✅ Console logs apparaissent
- ✅ Événements envoyés à PostHog (vérifier dashboard)

---

## 📊 Nouveaux Événements PostHog

Ces événements sont automatiquement capturés :

| Événement | Quand | Propriétés |
|-----------|-------|------------|
| `uncaught_exception` | Erreur JS non gérée | `error_name`, `error_message`, `error_stack`, `is_fatal` |
| `react_error_boundary` | Erreur de rendu React | `error_name`, `error_message`, `component_stack` |
| `unhandled_promise_rejection` | Promise rejetée | `error_name`, `error_message`, `rejection_id` |
| `console_error` | `logger.error()` appelé | `message`, `error_stack` |
| `console_warning` | `logger.warn()` en prod | `message` |
| `manual_error_report` | `reportError()` appelé | Contexte personnalisé |
| `handled_exception` | `trackHandledException()` | `error_type`, `error_message`, contexte |

---

## ⚙️ Configuration

### Variables d'Environnement

Aucune nouvelle variable requise. La clé existante est utilisée :

```env
EXPO_PUBLIC_POSTHOG_API_KEY=phc_cMypJdYMwtFM6IqoACXeJCrig45ld8aa4vBoTO1ocFh
```

### Désactiver Session Replay (si nécessaire)

Dans `lib/posthog.ts` :

```typescript
export const posthog = new PostHog(posthogApiKey ?? '', {
  host: 'https://eu.i.posthog.com',
  captureAppLifecycleEvents: true,
  enableSessionReplay: false, // ← Désactiver ici
});
```

---

## 🐛 Troubleshooting

### Session Replay ne fonctionne pas

**Vérifiez :**
- Version de `posthog-react-native` >= 3.0
- `enableSessionReplay: true` dans la config
- App redémarrée après changement

**Solution :**
```bash
npm install posthog-react-native@latest
```

### Erreurs ne s'affichent pas dans PostHog

**Vérifiez :**
- Clé API PostHog correcte
- Connexion internet active
- Pas de bloqueur de tracking actif

**Test :**
```typescript
import { logger } from '@/utils/logger';
logger.error('Test error', new Error('Test'));
```

Puis vérifiez la console → doit afficher l'erreur.

### ErrorBoundary affiche un écran d'erreur

**Normal en développement.**
- En prod : écran utilisateur friendly
- En dev : écran avec détails techniques

**Pour tester :**
```typescript
// Déclencher une erreur volontaire
throw new Error('Test ErrorBoundary');
```

---

## 📈 Métriques Recommandées

Créez un dashboard PostHog avec :

1. **Taux d'erreurs par jour**
   - Événements : `uncaught_exception`, `react_error_boundary`
   - Graphique : Line chart

2. **Top 10 erreurs**
   - Événements : Tous types d'erreurs
   - Groupé par : `error_message`

3. **Erreurs par utilisateur**
   - Événements : Tous types d'erreurs
   - Groupé par : `distinct_id`

4. **Sessions avec erreurs**
   - Sessions contenant au moins 1 erreur
   - % du total des sessions

---

## 🔐 Sécurité

### Données Masquées Automatiquement

✅ **Protégé :**
- Tous les `<TextInput>` (mots de passe, emails, etc.)
- Champs de paiement
- Informations personnelles saisies

❌ **Non masqué :**
- Textes statiques de l'UI
- Boutons et labels
- Navigation

### Compliance RGPD

✅ PostHog hébergé en **Europe (EU)** : `https://eu.i.posthog.com`
✅ Données utilisateur anonymisées par défaut
✅ Possibilité d'opt-out utilisateur (à implémenter si besoin)

---

## 📞 Support

- **Documentation complète :** `docs/POSTHOG_ERROR_TRACKING.md`
- **Exemples de code :** `docs/error-tracking-examples.ts`
- **Dashboard PostHog :** https://eu.i.posthog.com

---

## ✅ Checklist de Déploiement

Avant de déployer en production :

- [ ] Tests en dev effectués
- [ ] Session Replay testé
- [ ] Erreurs capturées et visibles dans PostHog
- [ ] Dashboard PostHog configuré
- [ ] Alertes configurées (optionnel)
- [ ] Équipe informée des nouvelles fonctionnalités
- [ ] Documentation lue par l'équipe

---

## 🎉 C'est Tout !

Les changements sont **actifs et fonctionnels**. L'app capture maintenant automatiquement toutes les erreurs et enregistre les sessions utilisateur pour un meilleur debugging.

**Prochaines étapes suggérées :**
1. Monitorer le dashboard PostHog pendant 1 semaine
2. Identifier les erreurs les plus fréquentes
3. Fixer les bugs découverts
4. Ajuster la configuration si nécessaire
