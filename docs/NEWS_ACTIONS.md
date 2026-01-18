# 📰 Guide des Actions pour les News

Ce document décrit les différents types d'actions disponibles pour les actualités (news) dans l'application ELearn Mobile.

## 🎯 Types d'Actions Disponibles

### 1. **`none`** - Aucune action
La news est purement informative, aucune action au clic.

```json
{
  "action_type": "none",
  "action_data": null
}
```

**Cas d'usage :** Annonces simples, informations générales

---

### 2. **`detail_page`** - Page de détails
Ouvre la page de détails de la news avec le contenu complet.

```json
{
  "action_type": "detail_page",
  "action_data": null
}
```

**Navigation :** `/(modals)/news/{id}`

**Cas d'usage :** Articles complets, actualités détaillées avec contenu HTML

---

### 3. **`internal_page`** - Navigation interne
Redirige vers une page spécifique de l'application.

```json
{
  "action_type": "internal_page",
  "action_data": {
    "route": "/(app)/profile"
  }
}
```

#### Exemples de routes :

**Profil utilisateur :**
```json
{ "route": "/(app)/profile" }
```

**Cours (Secondary) :**
```json
{ "route": "/(app)/secondary/program/{programId}/courses/{courseId}" }
```

**Quiz :**
```json
{ "route": "/(app)/secondary/program/{programId}/quizzes/{quizId}" }
```

**Learn :**
```json
{ "route": "/(app)/learn/{topicId}" }
```

**Concours Blanc :**
```json
{ "route": "/concours-blanc-register" }
```

**Accueil :**
```json
{ "route": "/(app)/" }
```

**Cas d'usage :** Redirection vers cours, quiz, profil, sections spécifiques de l'app

---

### 4. **`external_link`** - Lien externe
Ouvre un lien web dans le navigateur système.

```json
{
  "action_type": "external_link",
  "action_data": {
    "url": "https://example.com"
  }
}
```

#### Exemples :

**Site web :**
```json
{ "url": "https://elearnbac.com" }
```

**Article de blog :**
```json
{ "url": "https://blog.elearnbac.com/nouveau-cours" }
```

**Documentation :**
```json
{ "url": "https://docs.elearnbac.com" }
```

**Cas d'usage :** Liens vers sites externes, articles, documentation

---

### 5. **`deep_link`** - Deep Link
Ouvre un deep link (peut lancer une autre application).

```json
{
  "action_type": "deep_link",
  "action_data": {
    "deepLink": "whatsapp://send?phone=237123456789"
  }
}
```

#### Exemples :

**WhatsApp :**
```json
{ "deepLink": "whatsapp://send?phone=237123456789&text=Bonjour" }
```

**Email :**
```json
{ "deepLink": "mailto:support@elearnbac.com?subject=Question" }
```

**Téléphone :**
```json
{ "deepLink": "tel:+237123456789" }
```

**Custom scheme :**
```json
{ "deepLink": "elearnbac://profile" }
```

**Cas d'usage :** Contacter le support, partage via apps externes, intégration avec d'autres apps

---

## 📋 Exemple Complet de News

```json
{
  "id": "uuid-123",
  "title": "🎉 Nouveau cours de Physique",
  "subtitle": "Découvrez la mécanique quantique",
  "description": "Un cours complet avec vidéos et exercices",
  "content": "<p>Contenu HTML détaillé...</p>",
  
  "media_type": "image",
  "media_url": "https://cdn.example.com/physique.jpg",
  "thumbnail_url": null,
  
  "status": "published",
  "start_date": "2026-01-18T00:00:00Z",
  "end_date": "2026-02-18T23:59:59Z",
  
  "action_type": "internal_page",
  "action_data": {
    "route": "/(app)/secondary/program/physique/courses/mecanique-quantique"
  },
  
  "target_audience": "concours",
  "is_featured": true,
  "show_badge": true,
  "badge_text": "Nouveau",
  "badge_color": "#10B981",
  
  "priority": 100,
  "display_order": 1,
  "card_style": "full",
  
  "require_authentication": true,
  "show_for_new_users_only": false
}
```

---

## 🎯 Matrice de Décision

| Objectif | Type d'Action | Configuration |
|----------|---------------|---------------|
| Afficher un article complet | `detail_page` | `action_data: null` |
| Rediriger vers un cours | `internal_page` | `route: "/(app)/secondary/program/..."` |
| Ouvrir le profil | `internal_page` | `route: "/(app)/profile"` |
| Inscription concours | `internal_page` | `route: "/concours-blanc-register"` |
| Ouvrir un site web | `external_link` | `url: "https://..."` |
| Contacter sur WhatsApp | `deep_link` | `deepLink: "whatsapp://..."` |
| Envoyer un email | `deep_link` | `deepLink: "mailto:..."` |
| Simple information | `none` | `action_data: null` |

---

## 🔧 Notes Techniques

### Comportement au clic
Lorsqu'un utilisateur clique sur une news :
1. **Feedback haptique** : Vibration légère
2. **Enregistrement de l'interaction** : Comptabilisé dans les statistiques
3. **Exécution de l'action** : Selon le type d'action défini

### Validation
- Les routes internes doivent exister dans l'app
- Les URLs externes doivent être valides (https://)
- Les deep links dépendent des apps installées sur l'appareil

### Sécurité
- Les liens externes s'ouvrent dans le navigateur système
- Les deep links peuvent échouer si l'app cible n'est pas installée
- Toujours valider les URLs côté backend avant insertion

---

## 📱 Notifications Push avec Actions

Les notifications push peuvent utiliser les mêmes types d'actions :

```json
{
  "to": "ExponentPushToken[xxx]",
  "title": "🎉 Nouveau cours disponible !",
  "body": "Découvrez notre cours de Physique",
  "data": {
    "type": "news",
    "id": "news-uuid-123"
  }
}
```

Voir [NOTIFICATIONS.md](./NOTIFICATIONS.md) pour plus de détails sur les notifications.

---

## 🚀 Bonnes Pratiques

1. **Toujours tester** les routes avant de publier une news
2. **Utiliser `detail_page`** pour du contenu riche (HTML)
3. **Privilégier `internal_page`** pour les redirections dans l'app
4. **Valider les URLs** pour les liens externes
5. **Tester les deep links** sur plusieurs appareils
6. **Définir des dates** de début et fin appropriées
7. **Cibler l'audience** correctement (concours, secondary, all)

---

## 📞 Support

Pour toute question sur la configuration des actions des news, contactez l'équipe de développement.
