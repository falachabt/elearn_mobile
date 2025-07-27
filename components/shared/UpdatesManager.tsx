import React, { useEffect, useState } from 'react';
import { useUpdates } from '@/contexts/UpdatesContext';
import UpdateModal from './UpdateModal';

/**
 * Component that automatically shows the update modal when an update is available.
 * This component should be placed high in the component tree to ensure the modal
 * is displayed over all other content.
 */
export default function UpdatesManager() {
  const { isUpdateAvailable, isUpdating } = useUpdates();
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Show modal when update becomes available
  useEffect(() => {
    if (isUpdateAvailable && !isUpdating) {
      setIsModalVisible(true);
    }
  }, [isUpdateAvailable, isUpdating]);

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  return (
    <UpdateModal
      isVisible={isModalVisible}
      onClose={handleCloseModal}
    />
  );
}