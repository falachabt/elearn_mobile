import React from "react";
import { useLocalSearchParams } from "expo-router";

// On réutilise directement le composant de learn qui est déjà complet
// Il récupère les params automatiquement via useLocalSearchParams
export { default } from "../../../../../../learn/[pdId]/quizzes/[quizId]/[attemptId]/index";
