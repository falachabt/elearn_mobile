# Exemple d'utilisation de la revalidation SWR

## Exemple 1 : Mode automatique (la plupart des cas)

```tsx
// app/(app)/secondary/index.tsx
import useSWR from "swr";

const SecondaryPrograms = () => {
  const { data, isLoading, mutate } = useSWR(
    "secondary-program",
    async () => await getSecondaryPrograms()
  );

  // ✅ C'EST TOUT ! La revalidation se fait automatiquement
  // lors du retour sur cette page grâce à RouteRevalidationManager

  return (
    <View>
      {/* Votre UI ici */}
    </View>
  );
};
```

## Exemple 2 : Revalidation manuelle avec RefreshControl

```tsx
// app/(app)/secondary/index.tsx
import { RefreshControl } from "react-native";
import useSWR from "swr";

const SecondaryPrograms = () => {
  const { data, isLoading, mutate } = useSWR(
    "secondary-program",
    async () => await getSecondaryPrograms()
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await mutate(); // Force la revalidation manuelle
    setRefreshing(false);
  };

  return (
    <FlatList
      data={data}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    />
  );
};
```

## Exemple 3 : Revalidation ciblée pour une clé spécifique

```tsx
// Si vous voulez revalider uniquement certaines clés lors du focus
import { usePageFocusRevalidation } from '@/hooks/useRouteRevalidation';
import useSWR from "swr";

const MyDetailPage = () => {
  const { data: program } = useSWR(
    `program-${programId}`,
    fetchProgram
  );

  const { data: progress } = useSWR(
    `progress-${programId}-${userId}`,
    fetchProgress
  );

  // Revalide uniquement la progress lors du focus
  // (program sera revalidé par le système global)
  usePageFocusRevalidation(`progress-${programId}-${userId}`);

  return <View>{/* UI */}</View>;
};
```

## Exemple 4 : Désactiver la revalidation automatique pour une clé

```tsx
// Si vous voulez désactiver la revalidation automatique
import useSWR from "swr";

const StaticDataPage = () => {
  const { data } = useSWR(
    "static-config",
    fetchConfig,
    {
      revalidateOnFocus: false,      // Désactive revalidation au focus
      revalidateOnReconnect: false,  // Désactive revalidation à la reconnexion
      revalidateIfStale: false,      // N'utilise que le cache
    }
  );

  return <View>{/* UI */}</View>;
};
```

## Exemple 5 : Utilisation avec plusieurs clés SWR

```tsx
// Page avec plusieurs sources de données
import useSWR from "swr";

const DashboardPage = () => {
  // Toutes ces clés seront automatiquement revalidées
  // lors du retour sur cette page
  const { data: programs } = useSWR("programs", fetchPrograms);
  const { data: progress } = useSWR("progress", fetchProgress);
  const { data: news } = useSWR("news", fetchNews);
  const { data: stats } = useSWR("stats", fetchStats);

  // ✅ Aucune configuration supplémentaire nécessaire !

  return (
    <View>
      {/* Affiche toutes les données */}
    </View>
  );
};
```

## Exemple 6 : Debugging des revalidations

```tsx
import useSWR from "swr";
import { useEffect } from "react";

const DebugPage = () => {
  const { data, isValidating } = useSWR("debug-key", fetcher);

  // Affiche quand SWR est en train de revalider
  useEffect(() => {
    if (isValidating) {
      console.log("🔄 SWR is revalidating...");
    } else {
      console.log("✅ SWR revalidation complete");
    }
  }, [isValidating]);

  return (
    <View>
      {isValidating && <ActivityIndicator />}
      {/* Votre UI */}
    </View>
  );
};
```

## ⚠️ Cas particuliers

### Quand NE PAS utiliser la revalidation automatique

1. **Données très volumineuses** : Si vous chargez beaucoup de données, utilisez `revalidateOnFocus: false`
2. **Données temps réel** : Utilisez plutôt les subscriptions Supabase
3. **Données statiques** : Configuration, traductions, etc. → désactivez toutes les revalidations

### Configuration par défaut (dans providers/index.tsx)

```typescript
{
  revalidateOnFocus: true,        // ✅ Active
  revalidateIfStale: true,        // ✅ Active  
  revalidateOnReconnect: true,    // ✅ Active
  focusThrottleInterval: 2000,    // Minimum 2s entre revalidations
  dedupingInterval: 60000,        // Cache valide 1 minute
}
```

## 🎯 Bonnes pratiques

1. **Utilisez le mode automatique par défaut** - Ça suffit dans 95% des cas
2. **Ajoutez RefreshControl** - Pour permettre la revalidation manuelle
3. **Monitoring** - Utilisez `isValidating` pour afficher des indicateurs de chargement
4. **Throttling** - Ne revalidez pas trop souvent (risque de rate limit API)
5. **Clés uniques** - Utilisez des clés SWR descriptives et uniques

## 📊 Performances

Avec ce système :
- ✅ Pas de fetch inutile (throttle intelligent)
- ✅ Cache efficace (60s par défaut)
- ✅ Données toujours fraîches lors du retour sur page
- ✅ Support offline (AsyncStorage/IndexedDB cache)
