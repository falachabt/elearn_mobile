# Cahier de Charge — PostHog Tracking Implementation
# ELearn Mobile - Observabilité & Analytics

Document de spécification pour le suivi analytique PostHog dans ELearn Mobile. Ce document liste tous les événements implémentés, leur emplacement dans le code, les propriétés envoyées, et les funnels / dashboards associés.

---

## 📋 Table des Matières

1. [Événements Implémentés](#1-événements-implémentés)
2. [Funnels (Entonnoirs de Conversion)](#2-funnels-entonnoirs-de-conversion)
3. [Session Replay — Configuration](#3-session-replay--configuration)
4. [Identification Utilisateur](#4-identification-utilisateur)
5. [Dashboards Recommandés](#5-dashboards-recommandés)
6. [Fichiers de Tracking](#6-fichiers-de-tracking)

---

## 1. Événements Implémentés

### 1.1 Authentification (auth_*)

| Événement | Déclencheur | Propriétés |
|-----------|-------------|------------|
| `auth_login` | Session utilisateur détectée | `method: 'password' \| 'oauth' \| 'biometric'` |
| `auth_login_failed` | Échec de connexion | `error` |
| `auth_signup_started` | Clic sur "S'inscrire" | `method: 'email' \| 'oauth'` |
| `auth_signup_completed` | Inscription réussie | `method: 'email' \| 'oauth'` |
| `auth_signup_failed` | Erreur à l'inscription | `error` |
| `auth_oauth_started` | Clic sur bouton OAuth | `provider: 'google' \| 'apple'`, `context: 'login' \| 'register'` |
| `auth_logout` | Déconnexion réussie | — |
| `auth_password_reset_requested` | Demande de réinitialisation | — |
| `auth_onboarding_completed` | Onboarding terminé | — |
| `auth_onboarding_skipped` | Onboarding ignoré | — |

**Fichier d'implémentation suggéré:** `contexts/auth.tsx`, composants d'auth dans `app/(auth)/`

---

### 1.2 Apprentissage (learning_*)

| Événement | Déclencheur | Propriétés |
|-----------|-------------|------------|
| `learning_course_list_viewed` | Montage de la liste des cours | `courses_count`, `filter` |
| `learning_course_viewed` | Visite d'un cours spécifique | `course_id`, `course_name`, `is_purchased` |
| `learning_course_enrolled` | Inscription à un cours | `course_id`, `course_name`, `price` |
| `learning_lesson_started` | Début d'une leçon | `lesson_id`, `lesson_name`, `course_id` |
| `learning_lesson_completed` | Fin d'une leçon | `lesson_id`, `lesson_name`, `course_id`, `duration_seconds` |
| `learning_video_played` | Vidéo lancée | `video_id`, `lesson_id` |
| `learning_video_paused` | Vidéo mise en pause | `video_id`, `current_time` |
| `learning_video_completed` | Vidéo terminée | `video_id`, `duration_seconds` |
| `learning_progress_updated` | Progression mise à jour | `course_id`, `progress_percentage` |
| `learning_course_completed` | Cours terminé | `course_id`, `course_name`, `total_duration_seconds` |

**Fichiers d'implémentation suggérés:** 
- `app/(app)/learn/` (écrans de cours)
- `hooks/useCourseProgress.ts`
- Composants vidéo dans `components/`

---

### 1.3 Quiz (quiz_*)

| Événement | Déclencheur | Propriétés |
|-----------|-------------|------------|
| `quiz_started` | Début d'un quiz | `quiz_id`, `quiz_name`, `questions_count` |
| `quiz_question_answered` | Question répondue | `quiz_id`, `question_id`, `is_correct`, `time_spent_seconds` |
| `quiz_completed` | Quiz terminé | `quiz_id`, `score`, `total_questions`, `duration_seconds`, `passed` |
| `quiz_abandoned` | Quiz abandonné | `quiz_id`, `questions_answered`, `total_questions` |
| `quiz_retried` | Nouvelle tentative | `quiz_id`, `attempt_number` |

**Fichiers d'implémentation suggérés:**
- `contexts/quizContext.tsx`
- `app/(app)/quiz/` (écrans de quiz)
- `hooks/useQuiz.ts`

---

### 1.4 Paiement (payment_*)

| Événement | Déclencheur | Propriétés |
|-----------|-------------|------------|
| `payment_checkout_viewed` | Page de paiement affichée | `item_type`, `item_id`, `price` |
| `payment_method_selected` | Méthode de paiement choisie | `method: 'notchpay' \| 'mobile_money' \| 'card'` |
| `payment_started` | Début du processus | `item_type`, `item_id`, `amount`, `payment_method` |
| `payment_completed` | Paiement réussi | `transaction_id`, `item_type`, `item_id`, `amount`, `payment_method` |
| `payment_failed` | Échec du paiement | `error`, `item_type`, `amount` |
| `payment_promo_code_applied` | Code promo appliqué | `promo_code`, `discount_amount` |
| `payment_cart_item_added` | Ajout au panier | `item_type`, `item_id`, `item_name`, `price` |
| `payment_cart_item_removed` | Retrait du panier | `item_type`, `item_id` |
| `payment_installment_plan_selected` | Paiement échelonné | `plan_id`, `installments_count` |

**Fichiers d'implémentation suggérés:**
- `hooks/usePayment.ts`
- `hooks/usePaymentFlow.ts`
- `hooks/useCart.ts`
- `hooks/useInstallmentPlan.ts`
- `components/payment/`

---

### 1.5 Contenu (content_*)

| Événement | Déclencheur | Propriétés |
|-----------|-------------|------------|
| `content_pdf_viewed` | Ouverture d'un PDF | `pdf_id`, `pdf_name`, `source` |
| `content_pdf_downloaded` | Téléchargement PDF | `pdf_id`, `pdf_name` |
| `content_archive_viewed` | Consultation d'une archive | `archive_id`, `archive_name`, `program_id` |
| `content_correction_viewed` | Consultation d'une correction | `correction_id`, `archive_id` |
| `content_search_performed` | Recherche effectuée | `query`, `results_count`, `search_type` |

**Fichiers d'implémentation suggérés:**
- `app/(app)/learn/[pdId]/anales/` (archives)
- `app/(app)/manuel/` (manuels)
- Composants FileViewer

---

### 1.6 Engagement (engagement_*)

| Événement | Déclencheur | Propriétés |
|-----------|-------------|------------|
| `engagement_daily_streak_achieved` | Série quotidienne atteinte | `streak_count` |
| `engagement_goal_completed` | Objectif complété | `goal_type`, `goal_value` |
| `engagement_notification_clicked` | Clic sur notification | `notification_type`, `notification_id` |
| `engagement_notification_permission_requested` | Demande de permission | — |
| `engagement_notification_permission_granted` | Permission accordée | — |
| `engagement_notification_permission_denied` | Permission refusée | — |
| `engagement_app_rated` | Note donnée à l'app | `rating` |
| `engagement_support_ticket_created` | Ticket créé | `category` |
| `engagement_whatsapp_support_opened` | Support WhatsApp ouvert | — |

**Fichiers d'implémentation suggérés:**
- `contexts/NotificationContext.tsx`
- `components/RatingModal.tsx`
- `components/WhatsappSupport.tsx`
- `hooks/useSupportTicket.ts`

---

### 1.7 Concours Blancs (competition_*)

| Événement | Déclencheur | Propriétés |
|-----------|-------------|------------|
| `competition_viewed` | Visite d'un concours blanc | `competition_id`, `competition_name` |
| `competition_registered` | Inscription à un concours | `competition_id`, `competition_name`, `price` |
| `competition_started` | Début du concours | `competition_id` |
| `competition_completed` | Concours terminé | `competition_id`, `score`, `duration_seconds` |

**Fichiers d'implémentation suggérés:**
- `app/(app)/manuel/anciens-sujets/`
- `hooks/useCompetitionPayment.ts`

---

### 1.8 Navigation (nav_*)

| Événement | Déclencheur | Propriétés |
|-----------|-------------|------------|
| `nav_screen_viewed` | Montage d'un écran | `screen_name`, `params` |
| `nav_tab_switched` | Changement d'onglet | `from_tab`, `to_tab` |
| `nav_deep_link_opened` | Ouverture deep link | `link_type`, `destination` |
| `nav_back_button_pressed` | Bouton retour | `current_screen` |

**Fichiers d'implémentation suggérés:**
- `components/shared/ScreenTracker.tsx`
- `contexts/NavigationContext.tsx`
- `app/_layout.tsx`

---

### 1.9 Réglages (settings_*)

| Événement | Déclencheur | Propriétés |
|-----------|-------------|------------|
| `settings_viewed` | Page réglages affichée | — |
| `settings_theme_changed` | Changement de thème | `theme: 'light' \| 'dark' \| 'auto'` |
| `settings_language_changed` | Changement de langue | `language` |
| `settings_notifications_toggled` | Toggle notifications | `enabled` |
| `settings_download_quality_changed` | Qualité de téléchargement | `quality` |

**Fichiers d'implémentation suggérés:**
- `components/settings/`

---

### 1.10 Erreurs (error_*)

| Événement | Déclencheur | Propriétés |
|-----------|-------------|------------|
| `error_api_failed` | Erreur API | `endpoint`, `status_code`, `error_message` |
| *(Erreurs auto-capturées)* | Erreurs JS, React, Promises | *(via PostHog errorTracking)* |

**Configuration:** `lib/posthog.ts` avec `errorTracking.autocapture`

---

## 2. Funnels (Entonnoirs de Conversion)

### 2.1 Funnel d'Inscription → Premier Cours

```
auth_signup_started
  → auth_signup_completed
    → auth_onboarding_completed
      → learning_course_list_viewed
        → learning_course_viewed
          → payment_checkout_viewed (si payant)
            → payment_completed
              → learning_course_enrolled
```

**Objectif:** Mesurer le taux de conversion de l'inscription au premier cours acheté/commencé.

---

### 2.2 Funnel d'Achat de Cours

```
learning_course_viewed (non acheté)
  → payment_checkout_viewed
    → payment_method_selected
      → payment_started
        → payment_completed
          → learning_course_enrolled
```

**Objectif:** Comprendre les abandons de paiement. Identifier où les utilisateurs hésitent.

---

### 2.3 Funnel de Complétion de Cours

```
learning_course_enrolled
  → learning_lesson_started
    → learning_lesson_completed
      → learning_progress_updated (50%)
        → learning_progress_updated (100%)
          → learning_course_completed
```

**Objectif:** Mesurer l'engagement et le taux de complétion des cours.

---

### 2.4 Funnel de Quiz

```
quiz_started
  → quiz_question_answered (première question)
    → quiz_question_answered (plusieurs questions)
      → quiz_completed (success)
```

**Objectif:** Identifier les abandons de quiz. Optimiser la difficulté.

---

### 2.5 Funnel de Rétention (Engagement)

```
auth_signup_completed
  → learning_lesson_started (J+0)
    → nav_screen_viewed (J+1)
      → learning_lesson_started (J+7)
        → engagement_daily_streak_achieved (7 jours)
```

**Objectif:** Mesurer la rétention utilisateur sur 7, 14, 30 jours.

---

## 3. Session Replay — Configuration

| Paramètre | Valeur | Raison |
|-----------|--------|--------|
| `enableSessionReplay` | `true` | Capturer sessions pour analyse UX |
| `maskAllTextInputs` | `true` | Protéger mots de passe, emails, données personnelles |
| `maskAllImages` | `false` | Images cours OK à voir |
| `captureNetworkTelemetry` | `true` | Analyser perf API |
| Taux d'échantillonnage | 100% | Phase initiale — tout capturer |

### Pages prioritaires pour l'analyse des replays:

- `/auth/*` — Comprendre les abandons d'inscription
- `/learn/*` — Optimiser l'interface d'apprentissage
- `/payment/*` — Comprendre les hésitations de paiement
- `/quiz/*` — Identifier blocages utilisateur

**Configuration:** Voir `lib/posthog.ts`

---

## 4. Identification Utilisateur

| Moment | Action PostHog | Données |
|--------|----------------|---------|
| Connexion détectée | `posthog.identify(user_id)` | `email`, `user_type`, `total_courses_enrolled`, `courses_completed`, `total_spent`, `total_points` |
| Déconnexion | `posthog.reset()` | — |

**Implémentation:** `contexts/auth.tsx`

```typescript
// Exemple
posthogService.identify(user.id, {
  email: user.email,
  user_type: 'student',
  total_courses_enrolled: 5,
  courses_completed: 2,
  total_spent: 50000,
  has_payment: true,
});
```

---

## 5. Dashboards Recommandés dans PostHog

### 5.1 Acquisition & Onboarding

- **Nouveaux inscrits** par jour/semaine/mois
- **Taux de complétion onboarding** (signup → onboarding completed)
- **Temps moyen** inscription → premier cours vu
- **Sources d'inscription** (email vs OAuth)
- **Taux d'abandon** à l'inscription

---

### 5.2 Engagement & Apprentissage

- **Cours les plus vus**
- **Taux de complétion des cours** (enrolled → completed)
- **Temps moyen** par leçon
- **Vidéos les plus abandonnées** (paused sans completed)
- **Quiz : taux de réussite** moyen
- **Streak quotidiens** : distribution
- **Sessions actives** par jour

---

### 5.3 Monétisation

- **Vues de page checkout** par type de produit
- **Taux de conversion** checkout → payment completed
- **Paniers abandonnés** (cart_item_added sans payment)
- **Revenus** par type de produit (cours, programmes, concours)
- **Codes promo** les plus utilisés
- **Montant moyen** par transaction
- **Méthodes de paiement** préférées

---

### 5.4 Navigation & UX

- **Écrans les plus visités**
- **Parcours de navigation** typiques (path analysis)
- **Taux de rebond** par écran
- **Session replays** des abandons de paiement
- **Temps moyen** par écran

---

### 5.5 Rétention

- **Taux de rétention** J+1, J+7, J+30
- **DAU / WAU / MAU** (Daily/Weekly/Monthly Active Users)
- **Churn rate** (utilisateurs inactifs)
- **Feature adoption** (% utilisant quiz, archives, etc.)

---

### 5.6 Erreurs & Qualité

- **Erreurs API** par endpoint
- **Taux d'erreur** global
- **Paiements échoués** par raison
- **Session replays** avec erreurs
- **Crashes** par version app

---

## 6. Fichiers de Tracking

### 6.1 Service Principal

| Fichier | Description |
|---------|-------------|
| `utils/posthogService.ts` | Service centralisé pour tous les événements PostHog. API type-safe. |
| `lib/posthog.ts` | Configuration PostHog (clé API, session replay, error tracking) |

---

### 6.2 Fichiers à Modifier pour le Tracking

#### Authentification
- `contexts/auth.tsx` — Identify/reset user, track login/logout
- `app/(auth)/login.tsx` — Track login attempts, oauth
- `app/(auth)/register.tsx` — Track signup flow

#### Apprentissage
- `app/(app)/learn/` — Track course views, lessons
- `hooks/useCourseProgress.ts` — Track progress updates
- Composants vidéo — Track video play, pause, complete

#### Quiz
- `contexts/quizContext.tsx` — Track quiz lifecycle
- `app/(app)/quiz/` — Track quiz interactions
- `hooks/useQuiz.ts` — Track questions answered

#### Paiement
- `hooks/usePayment.ts` — Track payment flow
- `hooks/usePaymentFlow.ts` — Track checkout process
- `hooks/useCart.ts` — Track cart operations
- `components/payment/` — Track payment UI interactions

#### Contenu
- `app/(app)/learn/[pdId]/anales/` — Track archives views
- `components/shared/learn/anales/FileViewer/` — Track PDF views/downloads
- Composants de recherche — Track searches

#### Navigation
- `components/shared/ScreenTracker.tsx` — Track screen views
- `contexts/NavigationContext.tsx` — Track navigation events
- `app/_layout.tsx` — Track deep links

#### Engagement
- `contexts/NotificationContext.tsx` — Track notifications
- `components/RatingModal.tsx` — Track app ratings
- `components/WhatsappSupport.tsx` — Track support interactions
- `hooks/useSupportTicket.ts` — Track tickets

---

## 7. Métriques Clés (KPIs)

### Acquisition
- **CAC (Customer Acquisition Cost)** — Coût par nouveau user
- **Signup Rate** — % de visiteurs qui s'inscrivent
- **Onboarding Completion Rate** — % qui finissent le setup

### Activation
- **Time to First Course** — Temps jusqu'au premier cours vu
- **First Purchase Rate** — % qui achètent dans les 7 jours
- **Course Enrollment Rate** — % qui s'inscrivent à un cours

### Engagement
- **DAU/MAU Ratio** — Mesure de l'engagement quotidien
- **Avg. Session Duration** — Durée moyenne par session
- **Lessons per User** — Nombre moyen de leçons par user
- **Quiz Completion Rate** — % de quiz terminés

### Monétisation
- **Conversion Rate** — % qui achètent (view → payment)
- **ARPU (Average Revenue Per User)** — Revenu moyen par user
- **Cart Abandonment Rate** — % de paniers abandonnés
- **Payment Success Rate** — % de paiements réussis

### Rétention
- **D1/D7/D30 Retention** — % de retour après 1, 7, 30j
- **Churn Rate** — % d'users inactifs par mois
- **Course Completion Rate** — % de cours terminés
- **Weekly Active Learners** — Users actifs par semaine

---

## 8. Prochaines Étapes

### Phase 1 : Implémentation (Semaine 1-2)
- [ ] Intégrer `posthogService` dans auth flow
- [ ] Tracker événements learning (cours, leçons, vidéos)
- [ ] Tracker événements payment (checkout, completion)
- [ ] Tracker quiz events
- [ ] Tester les événements en dev

### Phase 2 : Dashboards (Semaine 3)
- [ ] Créer dashboards dans PostHog
- [ ] Configurer funnels principaux
- [ ] Setup alertes pour erreurs critiques
- [ ] Configurer retention cohorts

### Phase 3 : Optimisation (Semaine 4+)
- [ ] Analyser session replays
- [ ] Identifier points de friction
- [ ] A/B tests sur parcours critiques
- [ ] Itérer sur UX basé sur data

---

## 9. Notes d'Implémentation

### Convention de Nommage
- Format: `category_action` en snake_case
- Catégories: `auth`, `learning`, `quiz`, `payment`, `content`, `engagement`, `competition`, `nav`, `settings`, `error`
- Actions: verbes au passé (`viewed`, `started`, `completed`, `failed`)

### Utilisation du Service

```typescript
import { posthogService } from '@/utils/posthogService';

// Identifier l'utilisateur
posthogService.identify(user.id, {
  email: user.email,
  user_type: 'student',
  total_courses_enrolled: 5,
});

// Tracker un événement
posthogService.trackCourseViewed(course.id, course.name, isPurchased);

// Tracker une erreur
posthogService.trackApiError('/api/courses', 500, 'Internal server error');

// Reset à la déconnexion
posthogService.reset();
```

### Error Tracking Automatique
PostHog capture automatiquement (via `errorTracking.autocapture`):
- Erreurs JavaScript non gérées
- Rejets de promesses non gérées
- Erreurs React (via `PostHogErrorBoundary`)

Pas besoin de tracker manuellement ces erreurs !

---

## 10. Ressources

- **PostHog Dashboard:** https://us.posthog.com
- **Documentation PostHog:** https://posthog.com/docs
- **Service Code:** `utils/posthogService.ts`
- **Configuration:** `lib/posthog.ts`

---

**Document maintenu par:** Équipe Dev ELearn Mobile  
**Dernière mise à jour:** 24 février 2026  
**Version:** 1.0
