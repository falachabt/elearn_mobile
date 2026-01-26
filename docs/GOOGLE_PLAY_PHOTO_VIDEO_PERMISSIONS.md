# Google Play Photo & Video Permissions Compliance

## Background

Google Play Store has strict policies regarding the use of `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, and related storage permissions. These permissions should **only** be used by apps whose core functionality requires persistent, broad access to all photos and videos on the device.

### Our Situation

Our app, **Elearn Prepa**, was rejected because:
- We declared `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` permissions
- We only use these for **one-time photo/video uploads** in the support ticket feature
- This is not a core feature requiring persistent broad access

### Google Play Policy Reference
- [Photo and Video Permissions Policy](https://support.google.com/googleplay/android-developer/answer/14115180)
- [Android 13+ Granular Media Permissions](https://developer.android.com/about/versions/13/behavior-changes-13#granular-media-permissions)

## Solution

### What We Did

1. **Created a Custom Expo Config Plugin** (`/plugins/withBlockMediaPermissions.js`)
   - Automatically removes media storage permissions from the AndroidManifest
   - Prevents `expo-image-picker` and other packages from adding these permissions
   - Blocks the following permissions:
     - `android.permission.READ_EXTERNAL_STORAGE`
     - `android.permission.WRITE_EXTERNAL_STORAGE`
     - `android.permission.READ_MEDIA_IMAGES`
     - `android.permission.READ_MEDIA_VIDEO`
     - `android.permission.READ_MEDIA_VISUAL_USER_SELECTED`

2. **Applied the Plugin in `app.json`**
   - Added to the plugins array
   - Runs after all other plugins to ensure final manifest is clean

### How It Works

The app's photo/video upload feature in the support ticket system (`/app/(app)/profile/support/[ticketId].tsx`) continues to work without these permissions because:

#### Android 13+ (API Level 33+)
- `expo-image-picker`'s `launchImageLibraryAsync()` automatically uses the **Android Photo Picker**
- The Photo Picker is a system UI that doesn't require any permissions
- Users can select specific photos/videos to share without granting broad access
- This is the recommended approach by Google

#### Android 12 and Below
- Uses **Storage Access Framework (SAF)** via the photo picker
- SAF allows apps to access specific files chosen by the user
- No broad storage access permissions needed
- Fully compliant with Google Play policies

## Code Changes

### Support Feature Code (No Changes Required)

The existing code in `/app/(app)/profile/support/[ticketId].tsx` already works correctly:

```typescript
const pickImage = async () => {
    try {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            // Upload logic...
        }
    } catch (error) {
        console.error('Image picker error:', error);
    }
};
```

This code:
- ✅ Uses `launchImageLibraryAsync()` which triggers the Android Photo Picker on Android 13+
- ✅ Doesn't use `launchCameraAsync()` (which would require CAMERA permission)
- ✅ Only requests one-time access to specific images chosen by the user
- ✅ Fully compliant with Google Play policies

## Verification

To verify the permissions are correctly removed:

```bash
# Run expo prebuild
npx expo prebuild --platform android --clean

# Check the generated AndroidManifest.xml
cat android/app/src/main/AndroidManifest.xml | grep -E "READ_|WRITE_|MEDIA"
```

You should see **no results** if the plugin is working correctly.

## Testing

### Testing on Android 13+ Devices
1. Open the app
2. Navigate to Profile → Support → Create a ticket
3. Tap the attach button
4. The **Android Photo Picker** should open (new system UI)
5. Select a photo
6. Photo should upload successfully

### Testing on Android 12 and Below
1. Same steps as above
2. The photo gallery should open using SAF
3. Photo selection and upload should work normally

## Important Notes

⚠️ **DO NOT**:
- Add `expo-image-picker` plugin configuration that includes photo permissions
- Use `launchCameraAsync()` without adding CAMERA permission configuration
- Manually add READ_MEDIA or storage permissions to the manifest

✅ **DO**:
- Keep the `withBlockMediaPermissions.js` plugin in the plugins array
- Use `launchImageLibraryAsync()` for all photo selection needs
- Test on both Android 13+ and Android 12 devices before submitting to Play Store

## Building for Production

When building for Google Play submission:

```bash
# Build for production
npm run build:production

# Or with EAS
eas build --profile production --platform android
```

The plugin will automatically run during the build process and ensure the manifest is compliant.

## Future Considerations

If we ever need to add features that require direct access to photos/videos:
1. Evaluate if it's truly a core feature requiring persistent broad access
2. If yes, consult Google Play's policy and provide justification in the Developer Console
3. If no, continue using the Photo Picker approach

## Support

If you encounter issues:
1. Verify the plugin is in `app.json` plugins array
2. Clean rebuild: `rm -rf android && npx expo prebuild --platform android`
3. Check the generated AndroidManifest.xml
4. Test on a real device with Android 13+

## References

- [Expo Image Picker Documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Android Photo Picker](https://developer.android.com/training/data-storage/shared/photopicker)
- [Google Play Photo and Video Permissions Policy](https://support.google.com/googleplay/android-developer/answer/14115180)
- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)
