import { useEffect, useRef, useState } from "react";
import { useNavigation as useRNNavigation } from "@react-navigation/native";

interface UseLeaveDocumentInterceptOptions {
  /** Skip the sheet entirely when false (e.g. document already completed). */
  enabled: boolean;
  onMarkComplete: () => void | Promise<void>;
  onPin: () => void | Promise<void>;
}

/**
 * Intercepts real navigation-away from a document viewer screen (back button,
 * iOS swipe-back, or navigating elsewhere) and shows a confirmation sheet
 * asking the user to mark the document complete or pin it for later, instead
 * of leaving silently. Aliased `useNavigation` import: the app already has its
 * own `useNavigation` (route-builder helper) in contexts/NavigationContext,
 * this hook needs React Navigation's real one for `beforeRemove`.
 */
export function useLeaveDocumentIntercept({
  enabled,
  onMarkComplete,
  onPin,
}: UseLeaveDocumentInterceptOptions) {
  const navigation = useRNNavigation();
  const [showSheet, setShowSheet] = useState(false);
  const handledRef = useRef(false);
  const pendingActionRef = useRef<unknown>(null);

  useEffect(() => {
    const subscription = navigation.addListener("beforeRemove", (e: any) => {
      if (handledRef.current || !enabled) return;
      e.preventDefault();
      pendingActionRef.current = e.data.action;
      setShowSheet(true);
    });
    return subscription;
  }, [navigation, enabled]);

  const proceedLeave = () => {
    handledRef.current = true;
    setShowSheet(false);
    if (pendingActionRef.current) {
      navigation.dispatch(pendingActionRef.current as never);
    }
  };

  const handleMarkComplete = async () => {
    await onMarkComplete();
    proceedLeave();
  };

  const handlePin = async () => {
    await onPin();
    proceedLeave();
  };

  const handleDismiss = () => {
    proceedLeave();
  };

  return { showSheet, handleMarkComplete, handlePin, handleDismiss };
}
