import React from "react";
import {  useLocalSearchParams } from "expo-router";

import QuizDetailView from "@/components/shared/learn/quiz/QuizDetailView";

const QuizDetail: React.FC = () => {
    const { quizId, pdId } = useLocalSearchParams();


    return (
        <QuizDetailView 
            quizId={String(quizId)} 
            programId={String(pdId)} 
            basePath="/(app)/learn"
        />
    );
};

export default QuizDetail;