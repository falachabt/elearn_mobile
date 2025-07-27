import { useUpdates } from '@/contexts/UpdatesContext';

/**
 * Hook that provides a simplified interface for accessing updates functionality
 * throughout the application.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { hasUpdate, checkNow, isChecking } = useAppUpdates();
 *   
 *   return (
 *     <TouchableOpacity onPress={checkNow} disabled={isChecking}>
 *       <Text>{hasUpdate ? 'Update Available' : 'Check for Updates'}</Text>
 *     </TouchableOpacity>
 *   );
 * }
 * ```
 */
export function useAppUpdates() {
  const {
    isUpdateAvailable,
    isCheckingForUpdate,
    isUpdating,
    updateError,
    checkForUpdates,
    downloadAndApplyUpdate,
    dismissUpdate,
  } = useUpdates();

  return {
    // Status
    hasUpdate: isUpdateAvailable,
    isChecking: isCheckingForUpdate,
    isApplying: isUpdating,
    error: updateError,
    
    // Actions
    checkNow: checkForUpdates,
    applyUpdate: downloadAndApplyUpdate,
    dismissUpdate,
  };
}