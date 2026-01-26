# Google Play Photo & Video Permissions Compliance

## Background

Google Play Store has strict policies regarding the use of `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, and related storage permissions. These permissions should **only** be used by apps whose core functionality requires persistent, broad access to all photos and videos on the device.

### Our Situation

Our app, **Elearn Prepa**, was rejected because:
- We declared `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` permissions
- We only used these for **one-time photo/video uploads** in the support ticket feature
- This is not a core feature requiring persistent broad access

### Google Play Policy Reference
- [Photo and Video Permissions Policy](https://support.google.com/googleplay/android-developer/answer/14115180)
- [Android 13+ Granular Media Permissions](https://developer.android.com/about/versions/13/behavior-changes-13#granular-media-permissions)

## Solution

### What We Did

We took a comprehensive approach to completely eliminate the need for READ_MEDIA permissions:

1. **Removed `expo-image-picker` Dependency**
   - Completely removed from `package.json`
   - This eliminates the source of the problematic permissions

2. **Disabled Support Ticket Feature**
   - Renamed `supportList.tsx` → `supportList.tsx.disabled`
   - Renamed `support/` folder → `support.disabled/`
   - Feature is preserved but not active in the app

3. **Replaced with WhatsApp Support**
   - Created new `/app/(app)/profile/whatsapp-support.tsx` screen
   - Direct integration with WhatsApp for support
   - Two contact options:
     - **Support Technique**: +237657273753
     - **Support Commercial**: +237651055663
   - No permissions required

4. **Created Custom Expo Config Plugin** (`/plugins/withBlockMediaPermissions.js`)
   - Extra safety layer to block permissions if they're re-added
   - Prevents future permission issues
   - Blocks:
     - `android.permission.READ_EXTERNAL_STORAGE`
     - `android.permission.WRITE_EXTERNAL_STORAGE`
     - `android.permission.READ_MEDIA_IMAGES`
     - `android.permission.READ_MEDIA_VIDEO`
     - `android.permission.READ_MEDIA_VISUAL_USER_SELECTED`

5. **Updated Profile Menu**
   - Changed "Service client" route to use WhatsApp support
   - Seamless user experience

### How It Works Now

The app's support system has been simplified and improved:

#### WhatsApp Support (Active)
- Users navigate to Profile → Service Client
- Opens WhatsApp support screen
- Shows two contact cards with:
  - Contact type (Technical/Commercial)
  - Phone number
  - Operating hours
  - Description
- Tapping "Ouvrir WhatsApp" opens WhatsApp with:
  - Pre-filled contact number
  - Pre-filled message: "Bonjour, j'ai besoin d'aide avec Elearn Prepa."
- Works on all Android versions
- **Zero permissions required**
- Fully compliant with Google Play policies

#### Other Features
- **AI Chat with PDF Upload**: Still works via `expo-document-picker`
  - Uses Storage Access Framework (SAF)
  - No permissions required
  - Compliant with Google Play policies

## Code Changes

### Removed Dependencies

```json
// package.json - REMOVED
"expo-image-picker": "~17.0.8"
```

### New WhatsApp Support Screen

Created `/app/(app)/profile/whatsapp-support.tsx`:
- Clean, modern UI
- Dark mode support
- Contact cards for Technical and Commercial support
- Direct WhatsApp integration
- Info banner explaining the service
- Response time information

### Updated Profile Menu

```typescript
// app/(app)/profile/index.tsx - UPDATED
{
    icon: <MaterialIcons name="support-agent" size={24} />,
    label: 'Service client',
    route: '/profile/whatsapp-support', // Changed from /profile/supportList
}
```

## Verification

### Automated Verification Script

We've created a script to verify the build is compliant:

```bash
# Run after prebuild
./scripts/verify-permissions.sh
```

The script will:
- ✅ Check AndroidManifest.xml for blocked permissions
- ✅ Show all permissions that ARE declared
- ✅ Give clear pass/fail result with next steps

### Manual Verification

To verify the app is compliant:

```bash
# Check for expo-image-picker
grep "expo-image-picker" package.json
# Should return nothing

# Check for active ImagePicker usage
find . -type f \( -name "*.tsx" -o -name "*.ts" \) \
  ! -path "*/node_modules/*" ! -path "*/.disabled/*" ! -name "*.disabled" \
  -exec grep -l "ImagePicker" {} \;
# Should only return useStorage.ts (which just has a comment)

# Run expo prebuild and check manifest
npx expo prebuild --platform android --clean
cat android/app/src/main/AndroidManifest.xml | grep -E "READ_|WRITE_|MEDIA"
# Should return nothing

# Or use the verification script
./scripts/verify-permissions.sh
```

### Expected AndroidManifest Permissions

The AndroidManifest.xml should contain only:

## Testing

### Testing WhatsApp Support
1. Open the app
2. Navigate to Profile → Service client
3. Verify WhatsApp support screen displays correctly
4. Tap "Ouvrir WhatsApp" on either contact card
5. Verify WhatsApp opens with:
   - Correct phone number
   - Pre-filled message
6. Test on both light and dark mode

### Testing Other Features
1. Test AI Chat PDF upload (should still work)
2. Verify no permission prompts appear anywhere
3. Test on Android 13+ and Android 12 devices

## Important Notes

⚠️ **Support Ticket Feature**:
- The old support ticket feature has been **disabled** but **not deleted**
- Files are preserved in `support.disabled/` and `supportList.tsx.disabled`
- Can be re-enabled if needed (but would require alternative solution for images)

⚠️ **DO NOT**:
- Re-add `expo-image-picker` to package.json
- Re-enable the support ticket feature without removing image upload
- Add any permissions that include READ_MEDIA or storage access

✅ **DO**:
- Keep WhatsApp support as the primary support channel
- Use `expo-document-picker` for document uploads (it's SAF-based, no permissions)
- Keep the `withBlockMediaPermissions.js` plugin active

## Building for Production

When building for Google Play submission:

```bash
# Ensure dependencies are clean
npm install

# Build for production
npm run build:production

# Or with EAS
eas build --profile production --platform android
```

The app will:
1. Not include expo-image-picker
2. Not request READ_MEDIA permissions
3. Use WhatsApp for support (no permissions needed)
4. Be fully compliant with Google Play policies

## Future Considerations

If you need to add photo/video features in the future:

1. **Evaluate if it's a core feature** requiring persistent broad access
2. **If YES**: Consult Google Play policy and provide justification
3. **If NO**: Use one of these alternatives:
   - Android Photo Picker (built-in, no permissions on Android 13+)
   - WhatsApp/external app integration
   - Web-based upload interface

## Support

### Re-enabling Support Tickets (If Needed)

To re-enable the support ticket feature without image upload:

1. Rename files back:
   ```bash
   mv app/(app)/profile/supportList.tsx.disabled app/(app)/profile/supportList.tsx
   mv app/(app)/profile/support.disabled app/(app)/profile/support
   ```

2. Remove image picker functionality from `[ticketId].tsx`:
   - Remove `expo-image-picker` import
   - Remove `pickImage` function
   - Remove image upload UI
   - Keep text-only messaging

3. Update route in profile index

### Troubleshooting

If Google Play still reports permission issues:

1. Verify expo-image-picker is not in package.json
2. Run clean build: `rm -rf node_modules package-lock.json && npm install`
3. Check AndroidManifest.xml in build
4. Ensure no other packages add media permissions

## References

- [Expo Image Picker Documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Expo Document Picker Documentation](https://docs.expo.dev/versions/latest/sdk/document-picker/)
- [Android Photo Picker](https://developer.android.com/training/data-storage/shared/photopicker)
- [Google Play Photo and Video Permissions Policy](https://support.google.com/googleplay/android-developer/answer/14115180)
- [Storage Access Framework](https://developer.android.com/guide/topics/providers/document-provider)
- [WhatsApp Business API](https://faq.whatsapp.com/general/how-to-use-click-to-chat)

