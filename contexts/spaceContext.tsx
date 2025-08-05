import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SpaceType = 'secondary' | 'prepa';

interface SpaceContextType {
  currentSpace: SpaceType;
  setCurrentSpace: (space: SpaceType) => Promise<void>;
  isLoading: boolean;
}

const SpaceContext = createContext<SpaceContextType | undefined>(undefined);

interface SpaceProviderProps {
  children: ReactNode;
}

export const SpaceProvider: React.FC<SpaceProviderProps> = ({ children }) => {
  const [currentSpace, setCurrentSpaceState] = useState<SpaceType>('prepa'); // Default to prepa for existing users
  const [isLoading, setIsLoading] = useState(true);

  // Initialize space from storage
  useEffect(() => {
    const initializeSpace = async () => {
      try {
        const savedSpace = await AsyncStorage.getItem('selectedSpace');
        if (savedSpace && (savedSpace === 'secondary' || savedSpace === 'prepa')) {
          setCurrentSpaceState(savedSpace as SpaceType);
        }
      } catch (error) {
        console.error('Error loading space from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSpace();
  }, []);

  const setCurrentSpace = async (space: SpaceType) => {
    try {
      await AsyncStorage.setItem('selectedSpace', space);
      setCurrentSpaceState(space);
    } catch (error) {
      console.error('Error saving space to storage:', error);
      throw error;
    }
  };

  const value: SpaceContextType = {
    currentSpace,
    setCurrentSpace,
    isLoading,
  };

  return (
    <SpaceContext.Provider value={value}>
      {children}
    </SpaceContext.Provider>
  );
};

export const useSpace = (): SpaceContextType => {
  const context = useContext(SpaceContext);
  if (context === undefined) {
    throw new Error('useSpace must be used within a SpaceProvider');
  }
  return context;
};