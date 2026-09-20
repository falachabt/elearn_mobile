import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/auth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CreatePostModal } from '@/components/shared/feed/CreatePostModal';
import type { TaggableContentResult } from '@/services/feed.service';

interface CreatePostContextValue {
  // tag optionnel : pré-remplit le composer avec ce contenu déjà tagué —
  // utilisé par le bouton "Partager sur le fil" des écrans de contenu
  // (cours/leçon/quiz/exercice/document, secondaire comme prépa).
  openCreatePost: (tag?: TaggableContentResult) => void;
  // Incrémenté à chaque post publié avec succès — l'écran du fil s'y abonne
  // pour se rafraîchir même quand le composer a été ouvert depuis un autre
  // écran (donc sans passer par un useFocusEffect classique).
  lastPostCreatedAt: number;
}

const CreatePostContext = createContext<CreatePostContextValue | null>(null);

export function useCreatePost() {
  const ctx = useContext(CreatePostContext);
  if (!ctx) throw new Error('useCreatePost must be used within a CreatePostProvider');
  return ctx;
}

// Monté une seule fois à la racine du groupe (app) (_layout.tsx) pour que
// n'importe quel écran (feed, cours, quiz, exercice, document...) puisse
// ouvrir le composer de post sans avoir à porter sa propre instance de
// CreatePostModal.
export function CreatePostProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme !== 'light';
  const [visible, setVisible] = useState(false);
  const [initialTag, setInitialTag] = useState<TaggableContentResult | null>(null);
  const [lastPostCreatedAt, setLastPostCreatedAt] = useState(0);

  const openCreatePost = useCallback((tag?: TaggableContentResult) => {
    setInitialTag(tag ?? null);
    setVisible(true);
  }, []);

  const value = useMemo(() => ({ openCreatePost, lastPostCreatedAt }), [openCreatePost, lastPostCreatedAt]);

  return (
    <CreatePostContext.Provider value={value}>
      {children}
      {authUser?.authId && (
        <CreatePostModal
          visible={visible}
          onClose={() => setVisible(false)}
          onSuccess={() => {
            setVisible(false);
            setLastPostCreatedAt(Date.now());
          }}
          userId={authUser.authId}
          isDarkMode={isDarkMode}
          initialTaggedContent={initialTag}
        />
      )}
    </CreatePostContext.Provider>
  );
}
