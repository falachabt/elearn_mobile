# Strategie de test

## Objectif

Mettre en place des tests qui securisent la logique critique de l'application sans rendre la maintenance penible.

## 1. Definir le perimetre d'un test

Le perimetre d'un test doit repondre a une seule question.

Exemples:

- `utils/pricing.ts` : "pour 3 programmes, le total applique bien la formule Avantage"
- `components/settings/SettingsItem.tsx` : "si on appuie sur la ligne, le callback est appele"
- `hooks/useCart.ts` : "si l'ajout au panier echoue, le cache SWR est revalide"

Si un test essaie de valider rendu + navigation + API + analytics en meme temps, il devient fragile et peu utile.

## 2. Types de tests utiles pour cette application

### Tests unitaires

A privilegier en premier.

Cibles:

- `utils/`
- logique pure dans `services/`
- helpers de mapping, prix, dates, permissions, validations

Caracteristiques:

- rapides
- stables
- pas de reseau
- peu ou pas de mocks

### Tests de rendu

Pour les composants reutilisables et stables.

Cibles:

- badges, cartes, lignes de parametres, composants de liste
- composants d'etat vide, chargement, erreur

Verifier:

- le bon texte apparait
- la bonne variante est affichee
- un callback est appele sur interaction

Eviter:

- tester chaque style exact
- figer des snapshots gigantesques d'ecrans complets

### Tests d'integration

A introduire apres la base unitaire.

Cibles:

- hooks relies a SWR
- services relies a Supabase ou NotchPay
- ecrans critiques avec providers mockes

Verifier:

- les appels partent avec les bons parametres
- les etats de chargement / succes / erreur sont bien geres

### Tests end-to-end

Pas necessaires pour commencer, mais utiles plus tard sur les parcours critiques:

- connexion
- onboarding
- achat / paiement
- passage d'un quiz

## 3. Ordre recommande pour ce projet

1. Tester la logique metier pure
2. Tester les composants reutilisables avec peu de dependances
3. Tester les hooks critiques avec mocks
4. Ajouter ensuite quelques tests end-to-end sur les parcours vitaux

## 4. Ce qu'il ne faut pas tester

- les details internes d'Expo, React Native ou Supabase
- les bibliotheques tierces elles-memes
- les styles pixel-perfect
- les snapshots de pages entieres qui changent tout le temps

## 5. Base actuellement mise en place

Tests presents:

- snapshot simple sur `ThemedText`
- tests unitaires sur `utils/pricing.ts`
- test de rendu / interaction sur `components/settings/SettingsItem.tsx`
- tests d'integration sur `contexts/useAppConfig.tsx`
- tests de hook sur `hooks/secondary/useDocumentActions.ts`
- tests de rendu sur `components/shared/news/NewsList.tsx`
- tests de modal sur `components/shared/learn/quiz/ResultModal.tsx`

## 6. Commandes utiles

```bash
npm test
npm run test:watch
npm run test:ci
```

## 8. Tests relies a la vraie base

Oui, c'est possible, mais ils doivent rester optionnels.

Pourquoi:

- plus lents
- dependants du reseau
- dependants des secrets d'environnement
- plus fragiles si les donnees changent en base

Approche recommandee:

- par defaut: tests avec mocks, stables et rapides
- en option: smoke tests live pour verifier que Supabase retourne bien des donnees reelles

Exemple present:

- `contexts/__tests__/useAppConfig.live.test.tsx`

Activation:

```bash
$env:RUN_LIVE_SUPABASE_TESTS="1"
npx jest contexts/__tests__/useAppConfig.live.test.tsx --runInBand
```

## 7. Prochaines cibles recommandees

- `hooks/useCart.ts`
- `hooks/usePayment.ts`
- `services/payment.service.ts`
- composants de quiz et de paiement les plus reutilises
