import { createContext, useContext } from "react";
import type { RefObject } from "react";
import type { View } from "react-native";

export interface TabBarTourRefs {
  homeTabRef: RefObject<View | null>;
  manuelTabRef: RefObject<View | null>;
  secondaryTabRef: RefObject<View | null>;
  learnTabRef: RefObject<View | null>;
  profileTabRef: RefObject<View | null>;
}

export const TabBarTourContext = createContext<TabBarTourRefs | null>(null);

export function useTabBarTourRefs(): TabBarTourRefs {
  const context = useContext(TabBarTourContext);

  if (!context) {
    throw new Error("useTabBarTourRefs must be used within TabBarTourContext");
  }

  return context;
}
