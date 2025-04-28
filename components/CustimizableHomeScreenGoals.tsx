import React, {ComponentProps, useEffect, useState} from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {theme} from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import {STORAGE_KEY_CUSTOM_GOALS} from "@/constants/storage-keys";


// Type qui extrait le type exact accepté par la propriété 'name' de MaterialCommunityIcons
type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_MARGIN = 12;
const GOAL_CARD_WIDTH = (width - 2 * HORIZONTAL_PADDING - 2 * CARD_MARGIN) / 3;


interface CustomizableGoalsProps {
    isDarkMode: boolean;
    toDayXp: number;
    toDayExo: number;
    toDayTime: number;
}

interface GoalItem {
    icon: MaterialIconName;
    title: string;
    current: number;
    total: number;
    unit: string;
    options: number[];
}

// Tag selector component for choosing values
interface TagSelectorProps {
    options: number[];
    selectedValue: number;
    onSelect: (value: number) => void;
    unit: string;
    isDarkMode: boolean;
}

const TagSelector = ({ options, selectedValue, onSelect, unit, isDarkMode }: TagSelectorProps) => {
    const { trigger } = useHaptics();

    return (
        <View style={styles.tagContainer}>
            <View style={styles.tagWrapContainer}>
                {options.map((item) => (
                    <TouchableOpacity
                        key={item.toString()}
                        style={[
                            styles.tagButton,
                            isDarkMode && styles.tagButtonDark,
                            selectedValue === item && styles.tagButtonSelected,
                            isDarkMode && selectedValue === item && styles.tagButtonSelectedDark
                        ]}
                        onPress={() => {
                            // Provide haptic feedback when selecting a tag
                            trigger(HapticType.SELECTION);
                            onSelect(item);
                        }}
                    >
                        <Text
                            style={[
                                styles.tagText,
                                isDarkMode && styles.tagTextDark,
                                selectedValue === item && styles.tagTextSelected
                            ]}
                        >
                            {item} {unit}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const CustomizableGoals = ({ isDarkMode, toDayXp, toDayExo, toDayTime }: CustomizableGoalsProps) => {
    const { trigger } = useHaptics();

    // Default goals with predefined options
    const defaultGoals = [
        {
            icon: 'lightning-bolt' as MaterialIconName,
            title: 'Minutes',
            current: Number((toDayTime / (1000 * 60)).toFixed(1)),
            total: 30,
            unit: 'min',
            options: [15, 30, 45, 60, 90, 120]
        },
        {
            icon: 'star' as MaterialIconName,
            title: 'Points XP',
            current: toDayXp,
            total: 250,
            unit: 'XP',
            options: [100, 250, 500, 750, 1000, 1500]
        },
        {
            icon: 'medal' as MaterialIconName,
            title: 'Quiz',
            current: toDayExo,
            total: 3,
            unit: 'ex',
            options: [1, 2, 3, 5, 7, 10]
        }
    ];

    // State for goals and modal
    const [goals, setGoals] = useState<GoalItem[]>(defaultGoals);
    const [showModal, setShowModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState<number | null>(null);

    // Load custom goals on mount
    useEffect(() => {
        loadCustomGoals();
    }, []);

    // Update current values when props change
    useEffect(() => {
        updateCurrentValues();
    }, [toDayXp, toDayExo, toDayTime]);

    // Load custom goals from AsyncStorage
    const loadCustomGoals = async () => {
        try {
            const storedGoals = await AsyncStorage.getItem(STORAGE_KEY_CUSTOM_GOALS);
            if (storedGoals) {
                const customGoals = JSON.parse(storedGoals);

                // Merge saved target values with current progress values
                const mergedGoals = defaultGoals.map((defaultGoal, index) => {
                    return {
                        ...defaultGoal,
                        total: customGoals[index]?.total || defaultGoal.total
                    };
                });

                setGoals(mergedGoals);
            }
        } catch (error) {
            console.error('Error loading custom goals:', error);
        }
    };

    // Update current values without changing goals
    const updateCurrentValues = () => {
        setGoals(prevGoals => {
            return [
                {
                    ...prevGoals[0],
                    current: Number((toDayTime / (1000 * 60)).toFixed(1))
                },
                {
                    ...prevGoals[1],
                    current: toDayXp
                },
                {
                    ...prevGoals[2],
                    current: toDayExo
                }
            ];
        });
    };

    // Save custom goals to AsyncStorage
    const saveCustomGoals = async () => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_GOALS, JSON.stringify(goals));
            setEditingGoal(null);
        } catch (error) {
            console.error('Error saving custom goals:', error);
        }
    };

    // Open modal to edit goal
    const handleEditGoal = (index: React.SetStateAction<number | null>) => {
        setEditingGoal(index);
        setShowModal(true);

        // Add strong haptic feedback when opening edit mode
        trigger(HapticType.HEAVY);
    };

    // Save edited goal value
    const handleTagSelect = (value: number) => {
        if (editingGoal !== null) {
            // Strong haptic feedback when changing value
            trigger(HapticType.MEDIUM);

            const updatedGoals = [...goals];
            updatedGoals[editingGoal] = {
                ...updatedGoals[editingGoal],
                total: value
            };
            setGoals(updatedGoals);
            saveCustomGoals();
        }
    };

    // Reset goals to default values
    const handleResetGoals = () => {
        // Add extra strong haptic feedback for reset action
        trigger(HapticType.HEAVY);

        setGoals(defaultGoals);
        AsyncStorage.removeItem(STORAGE_KEY_CUSTOM_GOALS);
        setShowModal(false);
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text numberOfLines={1} style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}>
                    Objectifs du jour
                </Text>
                <TouchableOpacity
                    style={styles.customizeButton}
                    onPress={() => {
                        trigger(HapticType.HEAVY);
                        setShowModal(true);
                        setEditingGoal(null);
                    }}
                >
                    <MaterialCommunityIcons name="cog-outline" size={20} color={theme.color.primary[500]} />
                    <Text style={styles.customizeText}>Personnaliser</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.goalsRow}>
                {goals.map((goal, index) => {
                    const isGoalMet = goal.current >= goal.total;
                    return (
                        <TouchableOpacity
                            key={index}
                            style={isDarkMode ? styles.goalCardDark : styles.goalCard}
                            onPress={() => handleEditGoal(index)}
                        >
                            <View style={styles.goalIcon}>
                                <MaterialCommunityIcons
                                    name={goal.icon as MaterialIconName}
                                    size={22}
                                    color={isGoalMet ? theme.color.primary[500] : theme.color.error}
                                />
                            </View>
                            <Text numberOfLines={2} style={isDarkMode ? styles.goalTitleDark : styles.goalTitle}>
                                {goal.title}
                            </Text>
                            <View style={styles.goalProgressBar}>
                                <View
                                    style={[
                                        styles.goalProgressFill,
                                        {
                                            width: `${Math.min((goal.current / goal.total) * 100, 100)}%`,
                                            backgroundColor: isGoalMet ? theme.color.primary[500] : theme.color.error
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.goalMetrics}>
                                <Text style={[styles.currentValue, {color: isGoalMet ? theme.color.primary[500] : theme.color.error}]}>
                                    {goal.current}
                                </Text>
                                <Text style={styles.totalValue}>/{goal.total} {goal.unit}</Text>
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Goal Customization Modal */}
            <Modal
                visible={showModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
                                Personnaliser vos objectifs
                            </Text>
                            <Pressable onPress={() => {
                                // Light haptic feedback when closing modal
                                trigger(HapticType.LIGHT);
                                setShowModal(false);
                                setEditingGoal(null);
                            }}>
                                <MaterialCommunityIcons
                                    name="close"
                                    size={24}
                                    color={isDarkMode ? '#FFFFFF' : '#111827'}
                                />
                            </Pressable>
                        </View>

                        {editingGoal !== null ? (
                            <>
                                <View style={styles.modalSection}>
                                    <Text style={[styles.modalSectionTitle, isDarkMode && styles.modalSectionTitleDark]}>
                                        Modifier l'objectif : {goals[editingGoal].title}
                                    </Text>

                                    {/* Tag values display */}
                                    <View style={styles.goalValueContainer}>
                                        <View style={[styles.modalIconContainer, isDarkMode && styles.modalIconContainerDark]}>
                                            <MaterialCommunityIcons
                                                name={goals[editingGoal].icon}
                                                size={24}
                                                color={theme.color.primary[500]}
                                            />
                                        </View>
                                        <Text style={[styles.currentGoalText, isDarkMode && styles.currentGoalTextDark]}>
                                            Objectif actuel: {goals[editingGoal].total} {goals[editingGoal].unit}
                                        </Text>
                                    </View>

                                    <Text style={[styles.tagSelectorLabel, isDarkMode && styles.tagSelectorLabelDark]}>
                                        Sélectionnez une nouvelle valeur :
                                    </Text>

                                    {/* Tag Selector */}
                                    <TagSelector
                                        options={goals[editingGoal].options}
                                        selectedValue={goals[editingGoal].total}
                                        onSelect={handleTagSelect}
                                        unit={goals[editingGoal].unit}
                                        isDarkMode={isDarkMode}
                                    />
                                </View>

                                <Pressable
                                    style={[styles.modalButton, isDarkMode && styles.modalButtonDark]}
                                    onPress={() => {
                                        // Medium haptic feedback when closing edit mode
                                        trigger(HapticType.MEDIUM);
                                        setEditingGoal(null);
                                    }}
                                >
                                    <Text style={styles.modalButtonText}>Terminer</Text>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <ScrollView style={styles.goalsList}>
                                    {goals.map((goal, index) => (
                                        <Pressable
                                            key={index}
                                            style={[styles.goalItem, isDarkMode && styles.goalItemDark]}
                                            onPress={() => handleEditGoal(index)}
                                        >
                                            <View style={styles.goalItemLeft}>
                                                <View style={[styles.modalIconContainer, isDarkMode && styles.modalIconContainerDark]}>
                                                    <MaterialCommunityIcons name={goal.icon as MaterialIconName} size={24} color={theme.color.primary[500]} />
                                                </View>
                                                <View>
                                                    <Text style={[styles.goalItemTitle, isDarkMode && styles.goalItemTitleDark]}>
                                                        {goal.title}
                                                    </Text>
                                                    <Text style={[styles.goalItemSubtitle, isDarkMode && styles.goalItemSubtitleDark]}>
                                                        Objectif: {goal.total} {goal.unit}
                                                    </Text>
                                                </View>
                                            </View>
                                            <MaterialCommunityIcons
                                                name="pencil-outline"
                                                size={20}
                                                color={isDarkMode ? '#CCCCCC' : '#6B7280'}
                                            />
                                        </Pressable>
                                    ))}
                                </ScrollView>

                                <View style={styles.modalButtonsContainer}>
                                    <Pressable
                                        style={[styles.resetButton, isDarkMode && styles.resetButtonDark]}
                                        onPress={handleResetGoals}
                                    >
                                        <Text style={[styles.resetButtonText, isDarkMode && styles.resetButtonTextDark]}>
                                            Réinitialiser
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        style={[styles.closeButton, isDarkMode && styles.closeButtonDark]}
                                        onPress={() => {
                                            // Medium haptic feedback when closing modal
                                            trigger(HapticType.MEDIUM);
                                            setShowModal(false);
                                        }}
                                    >
                                        <Text style={styles.closeButtonText}>Fermer</Text>
                                    </Pressable>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    sectionTitleDark: {
        fontFamily : theme.typography.fontFamily,
fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    customizeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    customizeText: {
        color: theme.color.primary[500],
        fontWeight: '600',
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        marginLeft: 4,
    },
    goalsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    goalCard: {
        width: GOAL_CARD_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.small,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    goalCardDark: {
        width: GOAL_CARD_WIDTH,
        backgroundColor: theme.color.dark.background.secondary,
        borderRadius: theme.border.radius.small,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    goalIcon: {
        width: 36,
        height: 36,
        borderRadius: theme.border.radius.small,
        backgroundColor: `${theme.color.primary[500]}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    goalTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 13,
        lineHeight: 16,
        fontWeight: '500',
        color: '#1A1A1A',
        height: 32,
    },
    goalTitleDark: {
        fontFamily : theme.typography.fontFamily,
fontSize: 13,
        lineHeight: 16,
        fontWeight: '500',
        color: '#FFFFFF',
        height: 32,
    },
    goalProgressBar: {
        height: 4,
        backgroundColor: '#EEE',
        borderRadius: 2,
        marginBottom: 8,
    },
    goalProgressFill: {
        height: '100%',
        backgroundColor: theme.color.primary[500],
        borderRadius: 2,
    },
    goalMetrics: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        textAlign: 'center',
    },
    currentValue: {
        color: theme.color.primary[500],
        fontWeight: '600',
    },
    totalValue: {
        color: '#666',
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
        maxHeight: '80%',
    },
    modalContentDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    modalTitleDark: {
        color: '#FFFFFF',
    },
    modalSection: {
        marginBottom: 16,
    },
    modalSectionTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 16,
    },
    modalSectionTitleDark: {
        color: '#FFFFFF',
    },

    // Tag selector styles
    tagContainer: {
        marginVertical: 10,
    },
    tagWrapContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    tagButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tagButtonDark: {
        backgroundColor: '#374151',
        borderColor: '#4B5563',
    },
    tagButtonSelected: {
        backgroundColor: `${theme.color.primary[500]}15`,
        borderColor: theme.color.primary[500],
    },
    tagButtonSelectedDark: {
        backgroundColor: `${theme.color.primary[500]}25`,
        borderColor: theme.color.primary[500],
    },
    tagText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: '#374151',
    },
    tagTextDark: {
        color: '#E5E7EB',
    },
    tagTextSelected: {
        color: theme.color.primary[500],
        fontWeight: '600',
    },
    tagSelectorLabel: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    tagSelectorLabelDark: {
        color: '#D1D5DB',
    },
    goalValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    currentGoalText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#111827',
        marginLeft: 12,
    },
    currentGoalTextDark: {
        color: '#FFFFFF',
    },

    // Goal list in modal
    goalsList: {
        marginBottom: 16,
        maxHeight: 250,
    },
    goalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        marginBottom: 8,
    },
    goalItemDark: {
        backgroundColor: '#374151',
    },
    goalItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${theme.color.primary[500]}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    modalIconContainerDark: {
        backgroundColor: `${theme.color.primary[500]}25`,
    },
    goalItemTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    goalItemTitleDark: {
        color: '#FFFFFF',
    },
    goalItemSubtitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: '#6B7280',
    },
    goalItemSubtitleDark: {
        color: '#D1D5DB',
    },

    // Modal buttons
    modalButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        backgroundColor: theme.color.primary[500],
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    modalButtonDark: {
        backgroundColor: theme.color.primary[600],
    },
    modalButtonText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    resetButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    resetButtonDark: {
        borderColor: '#4B5563',
    },
    resetButtonText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    resetButtonTextDark: {
        color: '#FFFFFF',
    },
    closeButton: {
        flex: 1,
        backgroundColor: theme.color.primary[500],
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginLeft: 8,
    },
    closeButtonDark: {
        backgroundColor: theme.color.primary[600],
    },
    closeButtonText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
    },
});

export default CustomizableGoals;