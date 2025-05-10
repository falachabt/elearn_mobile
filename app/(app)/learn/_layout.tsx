import {Stack} from "expo-router";
import {Portal} from "@gorhom/portal";
import FloatingChatButton from "@/components/shared/FloatingChatButton";
import ChatBox from "@/components/shared/ChatBot";
import {useState} from "react";
import ChatFab from "@/components/shared/FloatingChatButton";

export const unstable_settings = {
    // Ensure any route can link back to `/`
    initialRouteName: 'index',
};

export default function ProgramLayout() {
    const [chatVisible, setChatVisible] = useState(false);
    const [courses, setCourses] = useState([]);
    const [title, setTitle] = useState('lol');

    const handleOpenChat = () => {
        setChatVisible(true);
    };

    const handleCloseChat = () => {
        setChatVisible(false);
    };

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
                    name="[pdId]"
                />
            </Stack>
                <ChatFab showContextBadge={true}/>
            <ChatBox
                visible={chatVisible}
                onClose={handleCloseChat}
            />

        </>
    );
}