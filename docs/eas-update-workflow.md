# EAS Update Workflow Enhancement

This document describes the enhanced EAS Update workflow that allows specifying both the EAS profile and app version at runtime.

## Overview

The enhanced workflow provides dynamic control over:
- **Platform**: Choose between Android, iOS, or both platforms
- **EAS Profile**: Select from development, preview, or production profiles
- **App Version**: Set the version number that will be updated in app.json
- **Update Message**: Customize the update message

## Usage

### Manual Workflow Trigger

1. Go to GitHub Actions in your repository
2. Select "EAS Update" workflow
3. Click "Run workflow"
4. Fill in the required parameters:
   - **Platform**: android | ios | all
   - **EAS Profile**: development | preview | production
   - **App Version**: Semantic version (e.g., 1.0.5)
   - **Update Message**: Optional custom message

### Workflow Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `platform` | choice | Yes | android | Target platform(s) for the update |
| `eas_profile` | choice | Yes | production | EAS profile to use for the update |
| `app_version` | string | Yes | 1.0.4 | Version to set in app.json |
| `update_message` | string | No | Mise à jour | Custom message for the update |

### EAS Profiles

The workflow supports all profiles defined in `eas.json`:

- **production**: Production builds with auto-increment
- **preview**: Internal distribution builds (APK for Android)
- **development**: Development client builds for testing

### Platform Support

- **android**: Updates Android platform only
- **ios**: Updates iOS platform only
- **all**: Updates both Android and iOS platforms

## Implementation Details

### Scripts

#### `scripts/update-version.js`
- Updates the version field in `app.json`
- Validates semantic version format (X.Y.Z)
- Provides clear error messages for invalid inputs

#### `scripts/test-workflow.js`
- Validates the update-version script functionality
- Tests workflow configuration syntax
- Ensures no breaking changes to app.json

### Workflow Steps

1. **Checkout repository**: Gets the latest code
2. **Setup Node.js**: Installs Node.js 18
3. **Install dependencies**: Installs Yarn and project dependencies
4. **Install EAS CLI**: Installs the latest EAS CLI
5. **Update app version**: Runs the version update script
6. **Switch platform imports**: Configures imports for native platform
7. **Run EAS Update**: Executes the EAS update with specified parameters

### Error Handling

- Version validation ensures semantic versioning format
- Script exits with proper error codes on failure
- Clear error messages for debugging

## Migration from Previous Workflow

The previous `eas-update-android.yml` workflow has been enhanced and renamed to `eas-update.yml`. Key changes:

1. **Platform selection**: Now supports iOS and all platforms, not just Android
2. **Profile selection**: Can specify any EAS profile, not just production
3. **Version management**: Automatically updates app.json version
4. **Enhanced inputs**: More flexible input parameters

## Testing

Run the test suite to validate the workflow:

```bash
node scripts/test-workflow.js
```

This will test:
- Version update script functionality
- Workflow configuration syntax
- Error handling scenarios