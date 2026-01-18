---
applyTo: "**/*.ts,**/*.tsx"
---
# ELearn Mobile - Standards de Codage

Ce projet est une application mobile d'apprentissage construite avec React Native, Expo, et Supabase.

## 🎯 Principes Généraux

- **TypeScript First**: Utiliser TypeScript pour tout nouveau code
- **Functional Programming**: Privilégier les composants fonctionnels et les hooks
- **Immutabilité**: Utiliser `const`, `readonly`, et éviter les mutations
- **Type Safety**: Utiliser optional chaining (`?.`) et nullish coalescing (`??`)

---

## 📊 Gestion des Types et Interfaces

### ✅ Utiliser les types de la base de données Supabase
**TOUJOURS** partir des types générés par Supabase au lieu de créer de nouveaux types.

```typescript
// ✅ BON - Utiliser les types de la base de données
import { Database } from "@/types/supabase";

type User = Database["public"]["Tables"]["accounts"]["Row"];
type Course = Database["public"]["Tables"]["courses"]["Row"];

// ✅ BON - Étendre les types existants si nécessaire
type CourseWithProgress = Database["public"]["Tables"]["courses"]["Row"] & {
    progress?: number;
    completed?: boolean;
};

// ❌ MAUVAIS - Créer de nouveaux types qui dupliquent la DB
interface User {
    id: string;
    email: string;
    // ...
}
```

### Exemples du projet
Voir les fichiers suivants pour des exemples de patterns:
- [types/secondary.type.ts](types/secondary.type.ts)
- [types/course.type.ts](types/course.type.ts)

---

## 🪝 Hooks et Gestion des Données

### Utiliser SWR pour le data fetching
Créer des hooks personnalisés dans `@/hooks` qui utilisent SWR pour la gestion du cache et des états.

```typescript
// ✅ BON - Hook avec SWR
import useSWR from 'swr';
import { supabase } from '@/lib/supabase';

export const useUserCourses = (userId: string) => {
    const { data, error, isLoading, mutate } = useSWR(
        userId ? `courses-${userId}` : null,
        async () => {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('user_id', userId);
            
            if (error) throw error;
            return data;
        }
    );

    return { courses: data, error, isLoading, mutate };
};

// ❌ MAUVAIS - useState + useEffect pour fetch
const [courses, setCourses] = useState([]);
useEffect(() => {
    fetchCourses().then(setCourses);
}, []);
```

### Clés SWR standardisées
Utiliser les clés définies dans `@/constants/swr-path.ts` pour la cohérence et les mutations.

```typescript
// ✅ BON - Utiliser les clés standardisées
import { courseProgressKeys } from '@/constants/swr-path';

useSWR(courseProgressKeys.detail(courseId, userId), fetcher);

// Mutation
courseProgressKeys.mutateDetail(courseId, userId);

// ❌ MAUVAIS - Clés en dur
useSWR(`course-${courseId}-${userId}`, fetcher);
```

**Exemples du projet:**
- [hooks/useArchiveData.ts](hooks/useArchiveData.ts)
- [hooks/useCourseProgress.ts](hooks/useCourseProgress.ts)
- [constants/swr-path.ts](constants/swr-path.ts)

---

## 🎨 Styles et Thèmes

### Utiliser les constantes de thème
**NE PAS** écrire de couleurs ou styles en dur. Toujours utiliser `@/constants/theme.ts`.

```typescript
// ✅ BON - Utiliser le système de thème
import { theme } from '@/constants/theme';
import { useThemeColor } from '@/hooks/useThemeColor';

const MyComponent = () => {
    const backgroundColor = useThemeColor(
        { light: theme.color.light.background.primary, dark: theme.color.dark.background.primary },
        'background'
    );
    
    return (
        <View style={{ 
            backgroundColor,
            borderColor: theme.color.primary[500]
        }}>
            {/* ... */}
        </View>
    );
};

// ❌ MAUVAIS - Couleurs en dur
<View style={{ backgroundColor: '#FFFFFF', borderColor: '#4CAF50' }}>
```

### Support Dark Mode
Toujours penser au support du mode sombre avec `useThemeColor` ou `useColorScheme`.

```typescript
// ✅ BON - Support dark mode
import { useColorScheme } from '@/hooks/useColorScheme';

const MyComponent = () => {
    const colorScheme = useColorScheme();
    const textColor = colorScheme === 'dark' 
        ? theme.color.dark.text.primary 
        : theme.color.light.text.primary;
    
    return <Text style={{ color: textColor }}>Hello</Text>;
};
```

**Ressources:**
- [constants/theme.ts](constants/theme.ts)
- [constants/Colors.ts](constants/Colors.ts)
- [hooks/useThemeColor.ts](hooks/useThemeColor.ts)

---

## 📝 Logging

### Utiliser le logger centralisé
**JAMAIS** utiliser `console.log` directement. Toujours utiliser `@/utils/logger`.

```typescript
// ✅ BON - Logger centralisé
import { logger } from '@/utils/logger';

logger.log('Fetching user data');
logger.info('User logged in:', user);
logger.warn('API rate limit approaching');
logger.error('Failed to load data:', error);
logger.debug('State:', state);

// ❌ MAUVAIS - console.log direct
console.log('User data:', data);
console.error('Error:', error);
```

**Avantages:**
- Logs seulement en mode développement (sauf errors)
- Centralisé pour faciliter les modifications futures
- Possibilité d'ajouter tracking/analytics facilement

---

## 💾 Stockage Local

### Utiliser les clés standardisées
Utiliser les constantes de `@/constants/storage-keys.ts` pour AsyncStorage.

```typescript
// ✅ BON - Clés standardisées
import { STORAGE_KEY_SETTINGS, STORAGE_KEY_CUSTOM_GOALS } from '@/constants/storage-keys';
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));

// ❌ MAUVAIS - Clés en dur
await AsyncStorage.setItem('settings', JSON.stringify(settings));
```

---

## 🗄️ Services et Accès à la Base de Données

### Créer des services réutilisables
Pour les opérations complexes, créer des services dans `@/services/`.

```typescript
// ✅ BON - Service réutilisable
// services/course.service.ts
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

type Course = Database["public"]["Tables"]["courses"]["Row"];

export const CourseService = {
    async getCourse(courseId: string): Promise<Course | null> {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async enrollUser(userId: string, courseId: string) {
        const { data, error } = await supabase
            .from('enrollments')
            .insert({ user_id: userId, course_id: courseId })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }
};
```

**Exemples:**
- [services/cart.service.ts](services/cart.service.ts)
- [services/course.progress.service.ts](services/course.progress.service.ts)

---

## 📱 Composants React Native

### Composants fonctionnels uniquement
```typescript
// ✅ BON - Composant fonctionnel avec hooks
import { FC } from 'react';

interface CourseCardProps {
    title: string;
    progress: number;
    onPress: () => void;
}

export const CourseCard: FC<CourseCardProps> = ({ title, progress, onPress }) => {
    const backgroundColor = useThemeColor({}, 'background');
    
    return (
        <TouchableOpacity onPress={onPress} style={{ backgroundColor }}>
            <Text>{title}</Text>
            <ProgressBar value={progress} />
        </TouchableOpacity>
    );
};

// ❌ MAUVAIS - Class component
class CourseCard extends React.Component {
    // ...
}
```

### Règles des Hooks
- Pas d'appels conditionnels de hooks
- Hooks au début du composant
- Dépendances correctes dans useEffect/useCallback/useMemo

```typescript
// ✅ BON
const MyComponent = () => {
    const [data, setData] = useState(null);
    const userId = useAuth().user?.id;
    
    useEffect(() => {
        if (userId) {
            fetchData(userId).then(setData);
        }
    }, [userId]);
    
    return <View>{/* ... */}</View>;
};

// ❌ MAUVAIS - Hook conditionnel
const MyComponent = () => {
    const userId = useAuth().user?.id;
    
    if (userId) {
        const [data, setData] = useState(null); // ❌ Hook dans condition
    }
};
```

---

## 🎯 Feedback Haptique

Utiliser le hook `useHaptics` pour les feedbacks tactiles.

```typescript
// ✅ BON
import { useHaptics, HapticType } from '@/hooks/useHaptics';

const MyButton = () => {
    const { triggerHaptic } = useHaptics();
    
    const handlePress = () => {
        triggerHaptic(HapticType.SUCCESS);
        // Action...
    };
    
    return <Button onPress={handlePress}>Submit</Button>;
};
```

---

## 🔐 Authentification

Utiliser le contexte d'authentification pour accéder aux données utilisateur.

```typescript
// ✅ BON
import { useAuth } from '@/contexts/auth';

const MyComponent = () => {
    const { user, signOut, isLoading } = useAuth();
    
    if (isLoading) return <LoadingSpinner />;
    if (!user) return <LoginScreen />;
    
    return <Dashboard user={user} />;
};
```

---

## 📋 Checklist pour Nouveau Code

Avant de soumettre du code, vérifier:

- [ ] Types importés depuis `@/types/supabase` (pas de nouveaux types dupliqués)
- [ ] Hooks SWR utilisés pour data fetching (pas de useState + useEffect)
- [ ] Clés SWR de `@/constants/swr-path.ts`
- [ ] Logger `@/utils/logger` (pas de console.log)
- [ ] Thème de `@/constants/theme.ts` (pas de couleurs en dur)
- [ ] Support dark mode avec `useThemeColor` ou `useColorScheme`
- [ ] Clés storage de `@/constants/storage-keys.ts`
- [ ] Services dans `@/services/` pour logique complexe
- [ ] Composants fonctionnels avec TypeScript
- [ ] Props typées avec interfaces
- [ ] Hooks correctement utilisés (pas de conditions)

---

## 📚 Architecture du Projet

```
/app           → Routes et écrans (Expo Router)
/components    → Composants réutilisables
/hooks         → Hooks personnalisés (SWR)
/services      → Logique métier et API calls
/contexts      → Contextes React (Auth, etc.)
/types         → Types TypeScript (depuis Supabase)
/constants     → Thème, couleurs, clés, paths
/utils         → Utilitaires (logger, etc.)
/lib           → Configuration (Supabase, etc.)
```

---

## 🚀 Bonnes Pratiques Supplémentaires

### Performance
- Utiliser `React.memo` pour les composants lourds
- `useMemo` et `useCallback` pour optimiser les renders
- Lazy loading avec `React.lazy` quand approprié

### Accessibilité
- Ajouter `accessibilityLabel` aux éléments interactifs
- Tester avec VoiceOver/TalkBack

### Erreurs
- Toujours gérer les erreurs des appels API
- Afficher des messages utilisateur clairs
- Logger les erreurs avec `logger.error()`

### Tests
- Tester les hooks avec des cas limites
- Tester les composants avec différents états
- Mock Supabase dans les tests
