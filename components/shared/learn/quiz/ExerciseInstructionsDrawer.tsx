import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {ThemedText} from '@/components/ThemedText';
import {theme} from '@/constants/theme';
import {supabase} from '@/lib/supabase';
import {useColorScheme} from '@/hooks/useColorScheme';
import Markdown, {RenderImageFunction} from 'react-native-markdown-display';
import FitImage from "react-native-fit-image";
import {HapticType, useHaptics} from "@/hooks/useHaptics";

const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get('window');

type ExerciseInstructionsDrawerProps = {
    quizId: string;
    visible: boolean;
    onClose: () => void;
};

type ExerciseData = {
    name: string;
    enonce: string | null;
};

// Global cache for image dimensions to prevent recalculation
const imageDimensionsCache: Record<string, { width: number; height: number }> = {};

// Define styles outside the component to prevent recreation on each render
const createStyles = (isDark: boolean) => StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
    },
    contentContainerDark: {
        backgroundColor: '#1F2937',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    headerDark: {
        backgroundColor: '#1F2937',
        borderBottomColor: '#374151',
    },
    title: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 16,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    errorContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        marginTop: 12,
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#EF4444',
        borderRadius: 4,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '500',
    },
    instructionTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    instructionTitleDark: {
        color: '#FFFFFF',
    },
    instructionsContainer: {
        marginBottom: 24,
    },
    noContentText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6B7280',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 20,
    },
    imageContainer: {
        marginVertical: 10,
        alignItems: 'center',
        width: '100%',
    },
    imageLoadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? '#374151' : '#F3F4F6',
        borderRadius: 8,
        width: '100%',
        height: 150,
    },
    imageErrorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: isDark ? '#374151' : '#F3F4F6',
        borderRadius: 8,
        width: '100%',
    },
    imageErrorText: {
        marginTop: 8,
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
    },
    markdownImage: {
        borderRadius: 8,
        width: '100%',
    },
    imageCaption: {
        marginTop: 8,
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        color: '#6B7280',
    },
});

// Helper function to get image dimensions with caching
const getImageDimensions = (src: string): Promise<{ width: number, height: number }> => {
    return new Promise((resolve, reject) => {
        // Check cache first
        if (imageDimensionsCache[src]) {
            resolve(imageDimensionsCache[src]);
            return;
        }

        // Not in cache, fetch dimensions
        Image.getSize(
            src,
            (width, height) => {
                // Store in cache
                imageDimensionsCache[src] = {width, height};
                resolve({width, height});
            },
            (error) => {
                console.error('Error getting image dimensions:', error);
                reject(error);
            }
        );
    });
};

// Separate Image component to prevent unnecessary re-renders of the parent
const MarkdownImage = React.memo(({src, alt, isDark}: { src: string; alt?: string; isDark: boolean }) => {
    const [loadingState, setLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
    const imageWidth = SCREEN_WIDTH - 64; // Full width minus padding
    const styles = useMemo(() => createStyles(isDark), [isDark]);

    // Reference to track if the component is mounted
    const isMounted = useRef(true);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Pre-calculate the image height based on the source dimensions - only once per src
    useEffect(() => {
        if (!src) {
            setLoadingState('error');
            return;
        }

        let cancelled = false;

        const loadImageDimensions = async () => {
            try {
                // Check if we already have dimensions in our cache
                const dimensions = await getImageDimensions(src);

                if (cancelled || !isMounted.current) return;

                // Calculate the height proportionally to our desired width
                const aspectRatio = dimensions.width / dimensions.height;
                const calculatedHeight = imageWidth / aspectRatio;

                setImageDimensions({
                    width: imageWidth,
                    height: calculatedHeight
                });
            } catch (error) {
                if (cancelled || !isMounted.current) return;
                setLoadingState('error');
            }
        };

        loadImageDimensions();

        return () => {
            cancelled = true;
        };
    }, [src, imageWidth]);

    // Create a source object with cache control for better performance
    const imageSource = useMemo(() => {
        if (!src) return null;
        return {
            uri: src,
            cache: 'force-cache' as const  // Use force-cache to avoid reloading
        };
    }, [src]);

    // Handle image load/error events
    const handleLoad = useCallback(() => {
        setLoadingState('loaded');
    }, []);

    const handleError = useCallback(() => {
        setLoadingState('error');
    }, []);

    // No image source, show error
    if (!imageSource) {
        return (
            <View style={styles.imageErrorContainer}>
                <MaterialCommunityIcons name="image-off" size={24} color="#EF4444"/>
                <ThemedText style={styles.imageErrorText}>Image invalide</ThemedText>
            </View>
        );
    }

    return (
        <View style={styles.imageContainer}>
            {loadingState === 'loading' && (
                <View style={styles.imageLoadingContainer}>
                    <ActivityIndicator size="small" color={theme.color.primary[500]}/>
                </View>
            )}

            {/* Always render the image, but hide it until loaded */}
            <Image
                source={imageSource}
                style={[
                    styles.markdownImage,
                    imageDimensions && {height: imageDimensions.height},
                    {display: loadingState === 'loaded' ? 'flex' : 'none'}
                ]}
                resizeMode="contain"
                onLoad={handleLoad}
                onError={handleError}
            />

            {loadingState === 'error' && (
                <View style={styles.imageErrorContainer}>
                    <MaterialCommunityIcons name="image-off" size={24} color="#EF4444"/>
                    <ThemedText style={styles.imageErrorText}>Impossible de charger l'image</ThemedText>
                </View>
            )}

            {alt && loadingState === 'loaded' && (
                <ThemedText style={styles.imageCaption}>{alt}</ThemedText>
            )}
        </View>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for memoization
    return prevProps.src === nextProps.src &&
        prevProps.alt === nextProps.alt &&
        prevProps.isDark === nextProps.isDark;
});

export default function ExerciseInstructionsDrawer({
                                                       quizId,
                                                       visible,
                                                       onClose
                                                   }: ExerciseInstructionsDrawerProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const {trigger} = useHaptics();
    const [exerciseData, setExerciseData] = useState<ExerciseData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Memoize contentKey to force Markdown to not re-render images
    const contentKey = useRef(Date.now().toString());

    // Animation values
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Track if we've already fetched data
    const hasLoaded = useRef(false);

    // Memoize styles to prevent recreation on each render
    const styles = useMemo(() => createStyles(isDark), [isDark]);

    useEffect(() => {
        if (visible && (!exerciseData || error) && !hasLoaded.current) {
            fetchExerciseData();
        }
    }, [visible, exerciseData, error]);

    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, slideAnim]);

    const fetchExerciseData = async () => {
        if (!visible) return; // Don't fetch if not visible
        if (!isLoading && exerciseData && !error) return; // Don't fetch if we already have data

        setIsLoading(true);
        setError(null);
        try {
            // Fetch exercise data from the quiz table
            const {data, error} = await supabase
                .from('quiz')
                .select('name, enonce')
                .eq('id', quizId)
                .single();

            if (error) throw error;

            if (data) {
                setExerciseData({
                    name: data.name || 'Exercice',
                    enonce: data.enonce || ''
                });
                hasLoaded.current = true;
            }
        } catch (err) {
            console.error('Error fetching exercise data:', err);
            setError('Impossible de charger les instructions de l\'exercice');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = useCallback(() => {
        trigger(HapticType.LIGHT)
        onClose();
    }, [onClose]);

    // Configure custom image renderer
    const renderImage = useCallback((
        node: { attributes: { src: any; alt: any; }; },
        children: any,
        parent: any,
        styles: { _VIEW_SAFE_image: any; },
        allowedImageHandlers: { filter: (arg0: (value: any) => any) => { (): any; new(): any; length: number; }; },
        defaultImageHandler: null,
    ) => {
        const {src, alt} = node.attributes;

        // we check that the source starts with at least one of the elements in allowedImageHandlers
        const show =
            allowedImageHandlers.filter((value) => {
                return src.toLowerCase().startsWith(value.toLowerCase());
            }).length > 0;

        if (show === false && defaultImageHandler === null) {
            return null;
        }

        const imageProps = {
            indicator: false,
            style: styles._VIEW_SAFE_image,
            source: {
                uri: src,
            },
            accessible: false,
            accessibilityLabel: undefined,
            key: undefined
        };

        if (alt) {
            imageProps.accessible = true;
            imageProps.accessibilityLabel = alt;
        }

        delete imageProps.key

        // @ts-ignore
        return <FitImage key={"soemid"} {...imageProps} />;
    }, [isDark]);

    // Define markdown styles based on the theme
    const markdownStyles = useMemo(() => ({
        body: {
            color: isDark ? '#FFFFFF' : '#000000',
            fontFamily: theme.typography.fontFamily,
            fontSize: 16,
        },
        heading1: {
            fontFamily: theme.typography.fontFamily,
            fontSize: 24,
            marginTop: 10,
            marginBottom: 10,
            fontWeight: 'bold',
            color: isDark ? '#FFFFFF' : '#000000',
        },
        heading2: {
            fontFamily: theme.typography.fontFamily,
            fontSize: 20,
            marginTop: 10,
            marginBottom: 10,
            fontWeight: 'bold',
            color: isDark ? '#FFFFFF' : '#000000',
        },
        heading3: {
            fontFamily: theme.typography.fontFamily,
            fontSize: 18,
            marginTop: 8,
            marginBottom: 8,
            fontWeight: 'bold',
            color: isDark ? '#FFFFFF' : '#000000',
        },
        link: {
            color: theme.color.primary[500],
            textDecorationLine: 'underline',
        },
        blockquote: {
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            padding: 10,
            borderLeftWidth: 4,
            borderLeftColor: theme.color.primary[500],
            marginVertical: 10,
        },
        code_block: {
            backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
            padding: 12,
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 14,
        },
        code_inline: {
            backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
            padding: 4,
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 14,
        },
        list_item: {
            marginVertical: 4,
            flexDirection: 'row',
        },
        // We'll handle image styling directly in the renderImage function
        image: {
            marginVertical: 10,
            // width: '100%',
        },
        table: {
            borderWidth: 1,
            borderColor: isDark ? '#4B5563' : '#D1D5DB',
            marginVertical: 10,
        },
        th: {
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            padding: 8,
            borderWidth: 1,
            borderColor: isDark ? '#4B5563' : '#D1D5DB',
        },
        td: {
            padding: 8,
            borderWidth: 1,
            borderColor: isDark ? '#4B5563' : '#D1D5DB',
        },
    }), [isDark]);

    // Don't render anything if not visible
    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.modalContainer}>
                <Animated.View
                    style={[
                        styles.contentContainer,
                        isDark && styles.contentContainerDark,
                        {
                            transform: [
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [SCREEN_HEIGHT, 0]
                                    })
                                }
                            ]
                        }
                    ]}
                >
                    {/* Header */}
                    <View style={[styles.header, isDark && styles.headerDark]}>
                        <ThemedText style={styles.title}>Instructions de l'exercice</ThemedText>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
                        >
                            <MaterialCommunityIcons
                                name="close"
                                size={24}
                                color={isDark ? '#FFFFFF' : '#000000'}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollViewContent}
                        showsVerticalScrollIndicator={true}
                        removeClippedSubviews={false} // Important: prevent view recycling
                    >
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={theme.color.primary[500]}/>
                                <ThemedText style={styles.loadingText}>Chargement des instructions...</ThemedText>
                            </View>
                        ) : error ? (
                            <View style={styles.errorContainer}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#EF4444"/>
                                <ThemedText style={styles.errorText}>{error}</ThemedText>
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={fetchExerciseData}
                                >
                                    <ThemedText style={styles.retryButtonText}>Réessayer</ThemedText>
                                </TouchableOpacity>
                            </View>
                        ) : exerciseData ? (
                            <>
                                <ThemedText style={[styles.instructionTitle, isDark && styles.instructionTitleDark]}>
                                    {exerciseData.name}
                                </ThemedText>

                                {exerciseData.enonce ? (
                                    <View style={styles.instructionsContainer}>
                                        <Markdown
                                            key={contentKey.current} // Use stable key to prevent re-renders
                                            style={markdownStyles as any}
                                            allowedImageHandlers={['data:image/png;base64', 'data:image/gif;base64', 'data:image/jpeg;base64', 'https://', 'http://']}
                                            rules={{
                                                /*@ts-ignore */
                                                image: renderImage
                                            }}
                                            allowFontScaling={false}
                                        >
                                            {exerciseData.enonce}
                                        </Markdown>
                                    </View>
                                ) : (
                                    <ThemedText style={styles.noContentText}>
                                        Aucune instruction disponible pour cet exercice.
                                    </ThemedText>
                                )}
                            </>
                        ) : (
                            <ThemedText style={styles.noContentText}>
                                Aucune donnée d'exercice trouvée.
                            </ThemedText>
                        )}
                    </ScrollView>
                </Animated.View>
            </SafeAreaView>
        </Modal>
    );
}