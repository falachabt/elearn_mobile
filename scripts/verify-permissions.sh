#!/bin/bash

# Script to verify READ_MEDIA permissions are completely blocked
# Run this after building to ensure Google Play compliance

echo "==================================================="
echo "Google Play READ_MEDIA Permissions Verification"
echo "==================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Check if AndroidManifest.xml exists
if [ ! -f "android/app/src/main/AndroidManifest.xml" ]; then
    echo -e "${YELLOW}⚠️  AndroidManifest.xml not found${NC}"
    echo "   Run 'npx expo prebuild --platform android --clean' first"
    echo ""
    exit 1
fi

echo "✓ AndroidManifest.xml found"
echo ""

# List of permissions that should NOT be present
BLOCKED_PERMISSIONS=(
    "READ_EXTERNAL_STORAGE"
    "WRITE_EXTERNAL_STORAGE"
    "READ_MEDIA_IMAGES"
    "READ_MEDIA_VIDEO"
    "READ_MEDIA_AUDIO"
    "READ_MEDIA_VISUAL_USER_SELECTED"
)

echo "Checking for blocked permissions..."
echo ""

# Check each permission
for permission in "${BLOCKED_PERMISSIONS[@]}"; do
    if grep -q "android.permission.$permission" android/app/src/main/AndroidManifest.xml; then
        echo -e "${RED}❌ FOUND: android.permission.$permission${NC}"
        FAILED=1
    else
        echo -e "${GREEN}✓ NOT FOUND: android.permission.$permission${NC}"
    fi
done

echo ""
echo "---------------------------------------------------"
echo ""

# Show all permissions that ARE present
echo "Permissions that ARE declared in the manifest:"
echo ""
grep "uses-permission" android/app/src/main/AndroidManifest.xml | while read -r line; do
    echo "  $line"
done

echo ""
echo "==================================================="
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ SUCCESS: No READ_MEDIA permissions found!${NC}"
    echo -e "${GREEN}   The app is compliant with Google Play policy.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Build for production: eas build --profile production --platform android"
    echo "  2. Submit to Google Play Store"
    echo "  3. Should be approved ✓"
    echo ""
else
    echo -e "${RED}❌ FAILURE: READ_MEDIA permissions detected!${NC}"
    echo -e "${RED}   The app will be rejected by Google Play.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Ensure package.json does NOT have expo-image-picker"
    echo "  2. Check that withBlockMediaPermissions.js plugin is LAST in app.json plugins array"
    echo "  3. Run: rm -rf android && npx expo prebuild --platform android --clean"
    echo "  4. Re-run this script"
    echo ""
    exit 1
fi
