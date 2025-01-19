import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { WebView } from 'react-native-webview';
import { useAuth } from '@/contexts/auth'; // Import the useAuth hook
import { theme } from '@/constants/theme';

type CourseContent = {
    id: string;
    // Add other properties of CourseContent here
};

const SectionDetail = () => {
    const router = useRouter();
    const { sectionId, courseId } = useLocalSearchParams();
    const { session } = useAuth(); // Retrieve the session from the auth context
    const [scrolledToEnd, setScrolledToEnd] = useState(false); // State to track if user has scrolled to end
    const [isListening, setIsListening] = useState(false); // State to track if we should listen to messages

    console.log("sectinId", sectionId)
    // Fetch category data
    const { data: category, error: categoryError, isLoading: categoryLoading, mutate: mutateC } = useSWR(
        sectionId ? `content-${sectionId}` : null,
        async () => {
            const { data } = await supabase
                .from('courses_content')
                .select('*, courses(name)')
                .eq('id', sectionId)
                .single();
            return data;
        }
    );

    // Fetch course data to get sections
    const { data: course, error: courseError, isLoading: courseLoading , mutate } = useSWR(
        courseId ? `course-section-${courseId}` : null,
        async () => {
            const { data } = await supabase
                .from('courses')
                .select('*, courses_content(*)')
                .eq('id', courseId)
                .single();
            return data;
        }
    );

    useEffect( () => {
        mutate(),
        mutateC()
    } , [courseId , sectionId] )

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsListening(true);
        }, 10000); // Start listening after 10 seconds

        return () => clearTimeout(timer); // Cleanup the timer on component unmount
    }, []);

    if (categoryLoading || courseLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#65B741" />
            </View>
        );
    }

    if (categoryError || courseError) {
        return (
            <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>
                    Une erreur s'est produite lors du chargement de la catégorie ou du cours.
                </ThemedText>
            </View>
        );
    }

    const sections = course?.courses_content || [];
    const currentIndex: number = sections.findIndex((section: CourseContent) => section.id == sectionId);
    const previousSection = sections[currentIndex - 1];
    const nextSection = sections[currentIndex + 1];

    console.log(sections.map( (i : any) => i?.id ))
    console.log(currentIndex)
    console.log(previousSection?.id)
    console.log(sectionId)
    console.log(nextSection?.id)

    return (
        <View style={styles.container}>
            {/* Course Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.push(`/(app)/learn/${courseId}/courses/${courseId}`)}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
                </Pressable>
                <View style={styles.headerContent}>
                    <ThemedText style={styles.courseTitle} numberOfLines={1} ellipsizeMode="tail">{category?.name}</ThemedText>
                    <ThemedText style={styles.courseInfo}>
                        {course?.name.length > 15 ? `${course.name.substring(0, 15)}...` : course?.name} • cat  • {sections.length} sections
                    </ThemedText>
                </View>
            </View>
                
            <WebView 
                source={{ 
                    uri: 'https://elearn.ezadrive.com/webview/courseContent/' + sectionId, 
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}` // Set the session token in the headers
                    }, 
                }} 
                style={styles.webView} 
                originWhitelist={['*']}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onShouldStartLoadWithRequest={() => true}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#65B741" />
                    </View>
                )}
                injectedJavaScript={`(function() {
                    function checkIfContentLoaded() {
                        if (document.readyState === 'complete') {
                            document.body.style.userSelect = 'none';
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: "scrolledToEnd",
                                windowInnerHeight: window.innerHeight,
                                windowScrollY: window.scrollY,
                                documentBodyOffsetHeight: document.body.offsetHeight
                            }));
                            window.onscroll = function() {
                                if ((window.innerHeight + window.scrollY+120) >= document.body.offsetHeight) {
                                    window.ReactNativeWebView.postMessage(JSON.stringify({
                                        type: "scrolledToEnd",
                                        windowInnerHeight: window.innerHeight,
                                        windowScrollY: window.scrollY,
                                        documentBodyOffsetHeight: document.body.offsetHeight
                                    }));
                                }
                            };
                        } else {
                            setTimeout(checkIfContentLoaded, 500);
                        }
                    }
                    checkIfContentLoaded();
                })();`}
                onMessage={(event) => {
                    if (!isListening) return; // Ignore messages if not listening
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === "scrolledToEnd") {
                        console.log("User has scrolled to the end of the page", data);
                        setScrolledToEnd(true);
                    }
                }}
            />

            {/* Navigation Buttons */}
            <View style={styles.navigationContainer}>
                {previousSection && (
                    <Pressable
                        style={styles.navigationButton}
                        onPress={() => router.push(`/(app)/learn/${courseId}/courses/${courseId}/lessons/${previousSection.id}`)}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                    </Pressable>
                )}
                {nextSection && (
                    <Pressable
                        style={[styles.navigationButton, !scrolledToEnd && styles.disabledButton]} // Apply disabled style if not scrolled to end
                        onPress={() => scrolledToEnd && router.push(`/(app)/learn/${courseId}/courses/${courseId}/lessons/${nextSection.id}`)} // Only navigate if scrolled to end
                        disabled={!scrolledToEnd} // Disable button if not scrolled to end
                    >
                        <MaterialCommunityIcons name="arrow-right" size={24} color="#FFFFFF" />
                    </Pressable>
                )}
            </View>
        </View>
          
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        marginBottom : 60
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#EF4444',
        textAlign: 'center',
    },
    header: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        marginRight: 12,
    },
    headerContent: {
        flex: 1,
    },
    courseTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    courseInfo: {
        fontSize: 14,
        color: '#6B7280',
    },
    webView: {
        flex: 1,
        left: "-10%",
        width: "120%",
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    navigationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#65B741',
        padding: 12,
        borderRadius: 8,
    },
    disabledButton: {
        backgroundColor: '#A0AEC0', // Change the color to indicate disabled state
    },
    navigationButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        marginLeft: 8,
        marginRight: 8,
    },
});

export default SectionDetail;