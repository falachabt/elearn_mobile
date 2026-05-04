# Reprise — Auth Phone & Dev Build

## Problème dev build (non résolu)

Dev build (`expo start` + QR code) → Firebase Phone Auth échoue → `auth/app-not-authorized`

### Cause confirmée (adb logcat)
```
18002 Invalid PlayIntegrity token; app not Recognized by Play Store.
17028 NETWORK_ERROR → reCAPTCHA bloqué (proxy/wifi)
```

**Flow Firebase :**
1. Play Integrity → FAIL (dev build pas sur Play Store)
2. reCAPTCHA fallback → FAIL (proxy réseau bloque Google)
→ `auth/app-not-authorized`

### Ce qui est déjà fait
- SHA-1 EAS keystore (`CF:C6:15:3D:BE:36:A6:11:5F:7E:EF:84:C2:C3:0B:D6:48:33:A8:31`) → ajouté Firebase Console ✓
- SHA-1 EAS keystore → ajouté Google Cloud Console API key restrictions ✓
- SHA-1 Google Play Signing (`A1:EC:2B:A5:7D:DC:3A:1C:BE:06:3A:95:A3:68:61:D5:58:B1:E2:F2`) → à ajouter Firebase Console + Google Cloud Console ✓ (à vérifier)
- SMS regions Cameroun + France → autorisés ✓
- Phone Auth activé ✓

### Solutions pour tester le dev build
**Option A — Test phone numbers Firebase (bypass tout) :**
Firebase Console → Authentication → Sign-in method → Téléphone → "Numéros de téléphone pour les tests"
→ Ajoute `+237694650142` / code `123456`

**Option B — Données mobiles :**
Coupe wifi, passe en données mobiles → reCAPTCHA passe

**Option C — Internal test Play Store :**
Fonctionne si SHA-1 Google Play Signing enregistré (voir ci-dessus)

---

## Problème loading screen post-inscription (corrigé)

**Cause :** `isAccountCreating` jamais remis à `false` dans `syncAccountAfterAuth` → SWR `onSuccess` bloquait `setIsLoading(false)` → loading infini.

**Fix appliqué :**
- `contexts/auth.tsx` → `syncAccountAfterAuth` : `setIsAccountCreating(false)` ajouté en success ET catch
- `app/(auth)/_layout.tsx` : loading screen bypass si `pathname.includes('/onboarding')`

---

## Prochaine étape
1. Tester inscription avec données mobiles (sans proxy)
2. Ou ajouter numéro de test Firebase pour dev
3. Vérifier que loading screen ne bloque plus après inscription
