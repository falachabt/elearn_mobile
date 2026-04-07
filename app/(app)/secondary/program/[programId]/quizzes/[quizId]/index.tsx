import React from "react";
import { useLocalSearchParams } from "expo-router";

import QuizDetailView from "@/components/shared/learn/quiz/QuizDetailView";

const QuizDetail: React.FC = () => {
    const { quizId, programId, dailyContentItemId } = useLocalSearchParams();

    return (
        <QuizDetailView 
            quizId={String(quizId)} 
            programId={String(programId)} 
            dailyContentItemId={
                typeof dailyContentItemId === "string"
                    ? dailyContentItemId
                    : undefined
            }
            basePath="/(app)/secondary/program"
        />
    );
};

export default QuizDetail;
