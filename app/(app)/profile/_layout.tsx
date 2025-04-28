import {Stack} from "expo-router";

export const unstable_settings = {
    // Ensure any route can link back to `/`
    initialRouteName: 'index',
};

export default function ProgramLayout() {
    return (
        <Stack
            key={"profile"}
            initialRouteName="index"
            screenOptions={{
                headerShown: false,
                animation: "slide_from_right"

            }}
        >

            <Stack.Screen name="index" />
            <Stack.Screen name="paiements" />
            <Stack.Screen name="editProfile" />
            <Stack.Screen name="support/[ticketId]"/>
            <Stack.Screen name="supportList"/>

        </Stack>
    );
}