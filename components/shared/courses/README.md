# Architecture des Composants Réutilisables de Cours

Ce dossier contient des composants réutilisables pour les pages de détails de cours, utilisables à la fois dans la section **learn** (prépa) et **secondary** (lycée).

## Structure

```
components/shared/courses/
├── EmptyState.tsx           # État vide pour les listes
├── EnrollmentBadge.tsx      # Badge d'inscription/aperçu
├── PreviewBanner.tsx        # Bannière pour contenu verrouillé
├── ContentItem.tsx          # Item de section/leçon
├── VideoItem.tsx            # Item de vidéo
├── QuizItem.tsx             # Item de quiz
├── ViewTabs.tsx             # Onglets de navigation (Contenu/Vidéos/Quiz)
├── CourseHeader.tsx         # En-tête de la page de cours
├── LoadingErrorStates.tsx   # États de chargement et d'erreur
└── index.ts                 # Exports centralisés
```

## Utilisation

### 1. Page de Détails de Cours

```tsx
import {
  ViewType,
  EmptyState,
  PreviewBanner,
  ContentItem,
  VideoItem,
  QuizItem,
  ViewTabs,
  CourseHeader,
  LoadingState,
  ErrorState,
} from "@/components/shared/courses";

// Dans votre composant
<CourseHeader
  courseName={course?.name || ""}
  categoryName={course?.course_category?.name}
  sectionsCount={sections.length}
  videosCount={videos.length}
  isEnrolled={isEnrolled}
  isDark={isDark}
  onBack={() => router.back()}
/>

<ViewTabs
  selectedView={selectedView}
  onViewChange={setSelectedView}
  isDark={isDark}
/>

{sections.map((section, index) => (
  <ContentItem
    key={section.id}
    section={section}
    index={index}
    progress={progress}
    isDark={isDark}
    isLocked={isLocked}
    onPress={() => navigateToSection(section.id)}
  />
))}
```

### 2. Liste de Vidéos

```tsx
{videos.map((video, index) => (
  <VideoItem
    key={video.id}
    video={video}
    index={index}
    isDark={isDark}
    isLocked={isPreviewMode && index >= 1}
    onPress={() => navigateToVideo(video.id)}
  />
))}
```

### 3. Bannière d'Aperçu

```tsx
{isPreviewMode && items.length > 1 && (
  <PreviewBanner
    isDark={isDark}
    itemCount={items.length - 1}
    itemType="sections" // ou "vidéos" ou "quiz"
    onPurchase={handlePurchaseFlow}
  />
)}
```

## Implémentations

### Learn (Prépa)
- **Chemin**: `app/(app)/learn/[pdId]/courses/[courseId]/`
- **Enrollment Check**: `isLearningPathEnrolled(pdId)`
- **Navigation**: Utilise `pdId` comme identifiant du programme

### Secondary (Lycée)
- **Chemin**: `app/(app)/secondary/program/[programId]/courses/[courseId]/`
- **Enrollment Check**: `isSecondaryProgramEnrolled(programId)`
- **Navigation**: Utilise `programId` comme identifiant du programme

## Structure Complète des Routes

### Secondary School
```
secondary/program/[programId]/
  courses/
    _layout.tsx                     # Layout principal des cours
    index.tsx                        # Liste des cours
    [courseId]/
      _layout.tsx                    # Layout du cours
      index.tsx                      # Détails du cours (composants réutilisables)
      lessons/
        layout.tsx
        [sectionId]/
          _layout.tsx
          index.tsx                  # Page de leçon
      videos/
        [videoId].tsx                # Page de vidéo
```

### Learn (Prépa) - Même structure
```
learn/[pdId]/
  courses/
    _layout.tsx
    index.tsx
    [courseId]/
      _layout.tsx
      index.tsx                      # Utilise les mêmes composants
      lessons/
        layout.tsx
        [sectionId]/
          _layout.tsx
          index.tsx
      videos/
        [videoId].tsx
```

## Composants Partagés

### EmptyState
Affiche un état vide avec icône et message personnalisé selon le type.

**Props**:
- `type`: "content" | "videos" | "quizzes"
- `isDark`: boolean

### ContentItem
Item de section/leçon avec progression et statut.

**Props**:
- `section`: { id, name, order }
- `index`: number
- `progress?`: SectionProgress
- `isDark`: boolean
- `isLocked?`: boolean
- `onPress`: () => void

### VideoItem
Item de vidéo avec durée et icône.

**Props**:
- `video`: { id, title, duration }
- `index`: number
- `isDark`: boolean
- `isLocked?`: boolean
- `onPress`: () => void

### QuizItem
Item de quiz avec métadonnées et score.

**Props**:
- `quiz`: { id, name, questions, estimated_time }
- `index`: number
- `highestScore?`: number
- `isDark`: boolean
- `isLocked?`: boolean
- `onPress`: () => void

### PreviewBanner
Bannière pour inviter à l'inscription et débloquer le contenu.

**Props**:
- `isDark`: boolean
- `itemCount`: number
- `itemType`: "sections" | "vidéos" | "quiz"
- `onPurchase`: () => void

### ViewTabs
Onglets de navigation entre Contenu, Vidéos et Quiz.

**Props**:
- `selectedView`: ViewType
- `onViewChange`: (view: ViewType) => void
- `isDark`: boolean

### CourseHeader
En-tête avec titre, catégorie, statistiques et badge d'inscription.

**Props**:
- `courseName`: string
- `categoryName?`: string
- `sectionsCount`: number
- `videosCount`: number
- `isEnrolled`: boolean
- `isDark`: boolean
- `onBack`: () => void

## Mode Aperçu

Le mode aperçu permet aux utilisateurs non inscrits de voir le premier élément de chaque catégorie (section, vidéo, quiz).

**Logique**:
```tsx
const isPreviewMode = !isEnrolled;
const visibleItems = isPreviewMode ? items.slice(0, 1) : items;
const isItemLocked = isPreviewMode && index >= 1;
```

## Dark Mode

Tous les composants supportent le dark mode via la prop `isDark`.

## Types

```typescript
export type ViewType = "content" | "videos" | "quizzes";

export interface SectionProgress {
  sectionid: number;
  completed: number;
  total: number;
}
```

## Notes

- Les composants utilisent `theme.typography.fontFamily` pour la cohérence des polices
- Les couleurs suivent les conventions du thème de l'application
- Les composants sont optimisés pour React Native (iOS/Android/Web)
- Utilisation de `useHaptics` pour le feedback tactile
- Utilisation de `trackEvent` pour l'analytique
