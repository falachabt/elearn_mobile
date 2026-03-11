import {Stack} from "expo-router";
import React from "react";

import ChatFab from "@/components/shared/FloatingChatButton";
import {useChatBox} from "@/contexts/chatBotContext";
import NewChatBot from "@/components/shared/NewChatBot";

export const unstable_settings = {
    // Ensure any route can link back to `/`
    initialRouteName: 'index',
};

export default function ProgramLayout() {
    const { closeChat, isChatVisible, currentChatSessionId, initialContextElements } = useChatBox();


    return (
        <>
            <Stack
                key={"learn"}
                initialRouteName="index"
                screenOptions={{
                    headerShown: false,
                    animation: "slide_from_right"
                }}
            >
                <Stack.Screen
                    name="index"
                />
                <Stack.Screen
                    name="anciens-sujets/index"
                />

                <Stack.Screen
                    name="exercices/index"
                />

                <Stack.Screen
                    name="quiz/index"
                />
            </Stack>
                <ChatFab showContextBadge={true}/>
            <NewChatBot
                visible={isChatVisible}
                onClose={closeChat}
                initialContextElements={initialContextElements}
                initialChatSessionId={currentChatSessionId || undefined}
            />

        </>
    );
}
