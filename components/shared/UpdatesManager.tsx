import React, { useEffect, useRef } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useUpdates } from '@/contexts/UpdatesContext';
import UpdateBottomSheet from './UpdateBottomSheet';

/**
 * Component that automatically shows the update bottom sheet when an update is available.
 * This component should be placed high in the component tree to ensure the bottom sheet
 * is displayed over all other content.
 */
export default function UpdatesManager() {
  const { isUpdateAvailable, isUpdating } = useUpdates();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  // Show bottom sheet when update becomes available
  useEffect(() => {
    if (isUpdateAvailable && !isUpdating) {
      bottomSheetRef.current?.present();
    }
  }, [isUpdateAvailable, isUpdating]);

  return (
    <UpdateBottomSheet
      ref={bottomSheetRef}
    />
  );
}