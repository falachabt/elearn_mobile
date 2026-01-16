# Solution SWR Revalidation avec Expo Router

## 🔍 Problème identifié

Avec Expo Router, les pages ne se démontent pas lors de la navigation (elles restent montées en arrière-plan). Par conséquent :

1. Les hooks SWR restent actifs mais ne revalidate pas automatiquement
2. `revalidateOnFocus` ne fonctionne pas car l'app reste dans l'état "active"
3. Les données deviennent stales quand l'utilisateur navigue et revient

## ✅ Solutions implémentées

### 1. Hook personnalisé `useRouteRevalidation`

**Fichier** : [hooks/useRouteRevalidation.ts](hooks/useRouteRevalidation.ts)

- Détecte les changements de route via `usePathname()`
- Force la revalidation de tous les hooks SWR actifs lors d'un changement
- Inclut un throttle de 2 secondes pour éviter les revalidations excessives

**Deux hooks disponibles** :

```typescript
// Force la revalidation de TOUS les hooks SWR lors du changement de route
useRouteRevalidation()

// Revalide une clé SWR spécifique lors du retour sur la page
usePageFocusRevalidation(swrKey)
```

### 2. Configuration SWR améliorée

**Fichier** : [providers/index.tsx](providers/index.tsx)

Changements apportés :

- ✅ **Web support** : `initFocus` maintenant actif sur web avec `visibilitychange` et `focus` events
- ✅ **Throttle réduit** : `focusThrottleInterval` passé de 5s à 2s
- ✅ **Auto-revalidation** : Le composant `RouteRevalidationManager` injecté dans l'arbre des providers

### 3. Configuration automatique

Le système est maintenant automatique pour toutes les pages ! Aucune modification nécessaire dans vos composants existants.

## 📝 Utilisation

### Mode automatique (recommandé)

Rien à faire ! La revalidation se fait automatiquement lors des changements de route.

```tsx
// Dans votre page
const { data, isLoading } = useSWR('my-key', fetcher);
// ✅ Les données seront revalidées automatiquement lors du retour sur la page
```

### Mode manuel (optionnel)

Si vous voulez contrôler la revalidation pour une clé spécifique :

```tsx
import { usePageFocusRevalidation } from '@/hooks/useRouteRevalidation';

function MyPage() {
  const { data } = useSWR('my-specific-key', fetcher);
  
  // Revalide uniquement cette clé lors du focus de la page
  usePageFocusRevalidation('my-specific-key');
  
  return <View>...</View>;
}
```

## 🎯 Résultats attendus

- ✅ Les données se revalidate automatiquement lors du retour sur une page
- ✅ Fonctionne sur iOS, Android et Web
- ✅ Throttle intelligent pour éviter les surcharges réseau
- ✅ Compatible avec tous vos hooks SWR existants
- ✅ Pas de modification nécessaire dans les composants

## 🧪 Pour tester

1. Allez sur une page qui utilise SWR (ex: liste des programmes)
2. Naviguez vers une autre page
3. Modifiez les données dans Supabase ou via une autre page
4. Revenez sur la première page
5. ✅ Les données devraient se rafraîchir automatiquement

## ⚙️ Configuration avancée

Si vous voulez ajuster le comportement, modifiez les constantes dans [hooks/useRouteRevalidation.ts](hooks/useRouteRevalidation.ts) :

```typescript
const THROTTLE_MS = 2000; // Temps minimum entre deux revalidations (ms)
```

Ou dans [providers/index.tsx](providers/index.tsx) :

```typescript
focusThrottleInterval: 2000, // Throttle pour revalidateOnFocus
dedupingInterval: 60000,      // Durée du cache
```

## 🐛 Debugging

Des logs sont ajoutés pour faciliter le debugging :

```
[SWR] Revalidating cache due to route change: /old-path → /new-path
[SWR] Revalidating key on page focus: my-key
```

Vous pouvez les voir dans la console pour suivre les revalidations.
