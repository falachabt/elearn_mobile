# 🚨 Correctif SWR Revalidation

## Problème rencontré

Après avoir implémenté le système de revalidation automatique, l'app redirige vers la page auth lors de la navigation.

## Cause du problème

Le `RouteRevalidationManager` utilisait `usePathname()` et `mutate()` trop tôt dans le cycle de vie de l'app, avant que l'authentification soit complètement initialisée. La revalidation globale était trop agressive.

## Solutions appliquées

### 1. Protection des routes d'authentification
Le hook ignore maintenant les routes d'authentification pour éviter les conflits.

### 2. Mode conservateur par défaut
- **Mode conservateur** (par défaut) : Se fie à `revalidateOnFocus` de SWR
- **Mode agressif** (optionnel) : Force la revalidation de toutes les clés

### 3. Positionnement corrigé
`RouteRevalidationManager` est maintenant placé **après** `UserActivityTracker` pour garantir que l'auth est initialisée.

## Pour tester

```bash
# Redémarrez l'app
npx expo start --clear
```

## Si le problème persiste

Si vous rencontrez toujours des problèmes de redirection vers auth, **désactivez temporairement** le RouteRevalidationManager :

```tsx
// Dans providers/index.tsx, ligne ~318
const RouteRevalidationManager = React.memo(({ children }: { children: React.ReactNode }) => {
    useRouteRevalidation({ enabled: false, aggressive: false }); // ← Mettez false ici
    return <>{children}</>;
});
```

Ou commentez complètement le composant :

```tsx
// <RouteRevalidationManager>
    <BackHandlerManager>
        {children}
    </BackHandlerManager>
// </RouteRevalidationManager>
```

La configuration SWR améliorée (avec support web et focusThrottleInterval réduit) fonctionnera quand même pour améliorer la revalidation.

## Configuration actuelle

- ✅ `revalidateOnFocus: true` - Revalide au focus
- ✅ `focusThrottleInterval: 2000` - Throttle 2s
- ✅ Support web avec `visibilitychange` + `focus` events
- ⚠️ `RouteRevalidationManager` en mode conservateur

## Mode debug

Pour voir les logs de revalidation :
- Ouvrez la console
- Cherchez `[SWR] Route change detected`
- Vérifiez que les routes auth sont ignorées
