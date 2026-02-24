import React from 'react';

import UpdateBottomSheet from './UpdateBottomSheet';

import { useUpdates } from '@/contexts/UpdatesContext';

/**
 * Affiche la notification de mise à jour OTA via un Modal natif.
 * Placé haut dans l'arbre pour être visible par-dessus tout le contenu.
 */
export default function UpdatesManager() {
  const { isUpdateAvailable, isUpdating, dismissUpdate } = useUpdates();

  const visible = isUpdateAvailable && !isUpdating;

  // Ne rendre que si nécessaire
  if (!visible) return null;

  return (
    <UpdateBottomSheet
      visible={visible}
      onDismiss={dismissUpdate}
    />
  );
}
