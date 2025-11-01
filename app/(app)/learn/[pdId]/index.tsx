import {Image, Platform, Pressable, ScrollView, StyleSheet, View} from "react-native";
import React, {useEffect, useState, useCallback} from "react";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useLocalSearchParams, useRouter} from "expo-router";
import useSWR from 'swr';

import {ThemedText} from "@/components/ThemedText";
import {theme} from "@/constants/theme";
import {useColorScheme} from "@/hooks/useColorScheme";
import {useAuth} from "@/contexts/auth";
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import {useProgramProgress} from "@/hooks/useProgramProgress";
import {useUser} from "@/contexts/useUserInfo";
import {supabase} from '@/lib/supabase';
import { ProgramPaymentService } from '@/services/program-payment.service';

interface ActionCard {
    id: string;
    title: string;
    subtitle?: string;
    progress?: {
        current: number;
        total: number;
        percentage: number;
    };
    icon: JSX.Element;
    route: string;
    color: string;
    rightContent?: React.ReactNode;
    isShopCard?: boolean;
    routeParams?: Record<string, any>;
}

interface ProgramData {
    id: string;
    title: string;
    description?: string;
    image?: string;
    duration?: number;
    course_count?: number;
    quiz_count?: number;
    total_duration?: number;
    course_learningpath?: Array<{id: string}>;
    quiz_learningpath?: Array<{id: string}>;
    concours_learningpaths?: Array<{
        id: string;
        price?: number;
        isActive?: boolean;
        concour?: {
            id: string;
            name?: string;
            description?: string;
            dates?: any;
            nextDate?: string;
            study_cycles?: {
                level?: number;
            };
            school_id?: string;
            school?: {
                id: string;
                name?: string;
                imageUrl?: string;
                sigle?: string;
                localisation?: string;
            };
            concours_archives?: Array<{id: string}>;
        };
    }>;
}

const ProgramDetails = () => {
    const local = useLocalSearchParams();
    const id = local.pdId as string;
    const {trigger} = useHaptics();
    const {user } = useAuth();
    const { isLearningPathEnrolled, getProgramAccessStatus } = useUser();
    const accessStatus = getProgramAccessStatus(id);
    const isEnrolled = isLearningPathEnrolled(id);
    const isExpired = accessStatus.isExpired;


    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    // Fetch program data independently of enrollment
    const fetchProgramData = async (programId: string): Promise<ProgramData> => {
        const {data, error} = await supabase
            .from('learning_paths')
            .select(`
                id,
                title,
                description,
                image,
                duration,
                course_count,
                quiz_count,
                total_duration,
                course_learningpath(id),
                quiz_learningpath(id),
                concours_learningpaths(id,
                    price,
                    isActive,
                    concour:concours(
                        id,
                        name,
                        description,
                        dates,
                        nextDate,
                        study_cycles(level),
                        school_id,
                        school:schools(
                            id,
                            name,
                            imageUrl,
                            sigle,
                            localisation
                        ),
                        concours_archives(id)
                    )
                )
            `)
            .eq('id', programId)
            .single();


        if (error) {
            console.error("[ProgramDetails] Erreur dans fetchProgramData:", error);
            throw error;
        }
        // @ts-ignore
        return data;
    };

    // Always fetch program data
    const {data: program, error: programError, isLoading: programLoading} = useSWR<ProgramData>(
        id ? `program-${id}` : null,
        () => fetchProgramData(id)
    );

    // Only fetch progress data if enrolled
    const {
        courseProgress,
        quizProgress,
        exercisesProgress,
        archiveProgress,
        totalProgress,
        isLoading: progressLoading,
        error: progressError
    } = useProgramProgress(isEnrolled ? id : "", isEnrolled ? (user?.id || "") : "");
    
    // LOG: Suivi des états d'erreur
    useEffect(() => {
        if (programError) {
            console.error("[ProgramDetails] Erreur détectée lors du chargement du PROGRAMME:", programError);
        }
        if (progressError) {
            // C'est le log qui nous intéresse le plus pour notre problème !
            console.error("[ProgramDetails] Erreur détectée lors du chargement de la PROGRESSION:", progressError);
            console.error("[ProgramDetails] Progress error details:", progressError);
        }
    }, [programError, progressError]);

    // Combine loading and error states
    const hasError = programError || (isEnrolled && progressError);

    // Combine loading states
    const isLoading = programLoading || (isEnrolled && progressLoading);

    // Prepare action cards
    const [actionCards, setActionCards] = useState<ActionCard[]>([]);

    // Ajout : état pour l'id du programme (concours_learningpaths.id)
    const [programId, setProgramId] = useState<string | null>(null);
    const [activeInstallment, setActiveInstallment] = useState<any>(null);

    // Récupérer l'id du programme à partir du learning path id
    useEffect(() => {
        const fetchProgramId = async () => {
            if (id) {
                const { data, error } = await supabase
                    .from("concours_learningpaths")
                    .select("id")
                    .eq("learningPathId", id)
                    .single();
                if (!error && data?.id) {
                    setProgramId(data.id);
                } else {
                    setProgramId(null);
                }
            } else {
                setProgramId(null);
            }
        };
        fetchProgramId();
    }, [id]);

    // Utiliser l'id du programme pour récupérer le dernier paiement (échelonné ou non)
    useEffect(() => {
        const fetchInstallment = async () => {
            if (programId) {
                // Récupère le dernier paiement (même expiré)
                const payment = await ProgramPaymentService.getLatestPayment(programId);
                if (payment && payment.is_installment) {
                    setActiveInstallment(payment);
                } else {
                    setActiveInstallment(null);
                }
            } else {
                setActiveInstallment(null);
            }
        };
        fetchInstallment();
    }, [isEnrolled, programId]);

    // Update actionCards when program or progress data changes
    useEffect(() => {
        if (program) {
            const cards: ActionCard[] = [];

            // Affiche la carte shop si non inscrit ou paiement expiré
            if (!isEnrolled || isExpired) {
                cards.push({
                    id: "shop",
                    title: isExpired
                        ? "Votre accès a expiré"
                        : "Débloquer le programme complet",
                    subtitle: isExpired
                        ? "Votre accès au programme a expiré. Veuillez payer la prochaine échéance pour continuer à suivre ce programme."
                        : "Accédez à tous les contenus du programme",
                    icon: (
                        <MaterialCommunityIcons
                            name="cart"
                            size={24}
                            color="#FFFFFF"
                        />
                    ),
                    route: `/(app)/learn/${id}/payment`,
                    routeParams: { selectedProgramId : id  },
                    color: isExpired
                        ? "#F59E0B" // orange pour accès expiré
                        : (isDark ? "#6EE7B7" : "#4CAF50"),
                    isShopCard: true,
                    rightContent: (
                        <View style={styles.shopCardIndicator}>
                            <MaterialCommunityIcons
                                name="arrow-right"
                                size={20}
                                color="#FFFFFF"
                            />
                        </View>
                    ),
                });
            }

            // Add regular content cards
            // @ts-ignore
            cards.push(
                {
                    id: "courses",
                    title: "Cours",
                    subtitle: isEnrolled ? "Continuez votre apprentissage" : "Accédez aux cours du programme",
                    progress: isEnrolled ? {
                        current: courseProgress?.completed || 0,
                        total: program.course_count || 0,
                        percentage: courseProgress?.percentage || 0,
                    } : undefined,
                    icon: (
                        <MaterialCommunityIcons
                            name="book-open-page-variant"
                            size={24}
                            color={isDark ? "#6EE7B7" : "#4CAF50"}
                        />
                    ),
                    route: `/(app)/learn/${id}/courses`,
                    color: isDark ? "#6EE7B7" : "#4CAF50",
                    rightContent: isEnrolled ? (
                        <View style={styles.progressIndicator}>
                            <ThemedText
                                style={[styles.progressText, isDark && styles.progressTextDark]}
                            >
                                {courseProgress?.completed}/
                                {program.course_learningpath?.length || 0}
                            </ThemedText>
                            <ThemedText
                                style={[
                                    styles.progressLabel,
                                    isDark && styles.progressLabelDark,
                                ]}
                            >
                                cours complétés
                            </ThemedText>
                        </View>
                    ) : undefined,
                },
                {
                    id: "practice",
                    title: "Quiz",
                    subtitle: isEnrolled ? "Testez vos connaissances" : "Accédez aux quiz d'évaluation",
                    progress: isEnrolled ? {
                        current: quizProgress?.completed || 0,
                        total: program.quiz_learningpath?.length || 0,
                        percentage: quizProgress?.percentage || 0,
                    } : undefined,
                    icon: (
                        <MaterialCommunityIcons
                            name="pencil-box-multiple"
                            size={24}
                            color={isDark ? "#60A5FA" : "#2196F3"}
                        />
                    ),
                    route: `/(app)/learn/${id}/quizzes`,
                    color: isDark ? "#60A5FA" : "#2196F3",
                    rightContent: isEnrolled ? (
                        <View style={styles.progressIndicator}>
                            <ThemedText
                                style={[styles.progressText, isDark && styles.progressTextDark]}
                            >
                                {quizProgress?.completed}/
                                {program.quiz_learningpath?.length || 0}
                            </ThemedText>
                            <ThemedText
                                style={[
                                    styles.progressLabel,
                                    isDark && styles.progressLabelDark,
                                ]}
                            >
                                quiz complétés
                            </ThemedText>
                        </View>
                    ) : undefined,
                },
                {
                    id: "exos",
                    title: "Exercices de révision",
                    subtitle: isEnrolled ? "Mémorisez efficacement" : "Accédez aux exercices de révision",
                    progress: isEnrolled ? {
                        current: exercisesProgress?.completed || 0,
                        total: exercisesProgress?.total || 0,
                        percentage: exercisesProgress?.percentage || 0,
                    } : undefined,
                    icon: (
                        <MaterialCommunityIcons
                            name="card-text-outline"
                            size={24}
                            color={isDark ? "#E879F9" : "#9C27B0"}
                        />
                    ),
                    route: `/(app)/learn/${id}/exercices`,
                    color: isDark ? "#E879F9" : "#9C27B0",
                    rightContent: isEnrolled ? (
                        <View style={styles.progressIndicator}>
                            <ThemedText
                                style={[styles.progressText, isDark && styles.progressTextDark]}
                            >
                                {exercisesProgress?.completed}/
                                {exercisesProgress?.total || 0}
                            </ThemedText>
                            <ThemedText
                                style={[
                                    styles.progressLabel,
                                    isDark && styles.progressLabelDark,
                                ]}
                            >
                                exercices complétés
                            </ThemedText>
                        </View>
                    ) : undefined,
                },
                {
                    id: "pastExams",
                    title: "Anciens sujets",
                    subtitle: isEnrolled ? "Sujets des années précédentes" : "Accédez aux annales du concours",
                    icon: (
                        <MaterialCommunityIcons
                            name="file-document-multiple"
                            size={24}
                            color={isDark ? "#FBBF24" : "#FF9800"}
                        />
                    ),
                    
                    route: `/(app)/manuel/anciens-sujets/${program.concours_learningpaths?.concour?.id || "default-id"}`,
                    color: isDark ? "#FBBF24" : "#FF9800",

                },
            );

            // Ajout de la carte paiement échelonné si actif ou expiré
            if (activeInstallment) {
                const currentInstallment = activeInstallment.current_installment || 1;
                const totalInstallments = activeInstallment.total_installments || 1;
                const paidAmount = (activeInstallment.amount || 0) * currentInstallment;
                const totalAmount = activeInstallment.total_amount || 0;
                const remainingAmount = totalAmount - paidAmount;
                const nextPaymentDueDate = activeInstallment.next_payment_due_date
                    ? new Date(activeInstallment.next_payment_due_date)
                    : null;
                const formattedNextPaymentDate = nextPaymentDueDate
                    ? nextPaymentDueDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Non défini';

                // Vérifie si le paiement est expiré ou échoué
                const isExpiredInstallment = activeInstallment.expiry_date && new Date(activeInstallment.expiry_date) < new Date();
                const isFailed = activeInstallment.payment_status === 'failed' || activeInstallment.payment_status === 'canceled';

                cards.push({
                    id: "installmentRecap",
                    title: "Paiement échelonné",
                    subtitle: (isExpiredInstallment || isFailed)
                        ? `Votre paiement est expiré ou échoué.\nPayé: ${paidAmount} FCFA / ${totalAmount} FCFA\nRestant: ${remainingAmount} FCFA\nProchaine échéance: ${formattedNextPaymentDate}\nVeuillez payer la prochaine échéance pour continuer à accéder au programme.`
                        : `Payé: ${paidAmount} FCFA / ${totalAmount} FCFA\nRestant: ${remainingAmount} FCFA\nProchaine échéance: ${formattedNextPaymentDate}`,
                    icon: (
                        <MaterialCommunityIcons
                            name="credit-card-clock"
                            size={24}
                            color={isExpiredInstallment || isFailed ? "#F59E0B" : "#F59E0B"}
                        />
                    ),
                    route: `/(app)/learn/${id}/payment`,
                    routeParams: { selectedProgramId: id },
                    color: isExpiredInstallment || isFailed ? "#F59E0B" : (isDark ? "#F59E0B" : "#F59E0B"),
                    rightContent: (
                        <View style={styles.progressIndicator}>
                            <ThemedText style={[styles.progressText, isDark && styles.progressTextDark]}>
                                {currentInstallment}/{totalInstallments}
                            </ThemedText>
                            <ThemedText style={[styles.progressLabel, isDark && styles.progressLabelDark]}>
                                versements effectués
                            </ThemedText>
                        </View>
                    ),
                });
            }

            setActionCards(cards);
        }
    // Ajout de la dépendance activeInstallment
    }, [program, courseProgress, quizProgress, exercisesProgress, archiveProgress, id, isDark, isEnrolled, activeInstallment, isExpired]);

    // Handle card press
    const handleCardPress = (card: ActionCard) => {
        trigger(HapticType.LIGHT);
        if (card.routeParams) {
            router.push({
                pathname: card.route,
                params: card.routeParams
            } as any);
        } else {
            router.push(card.route as any);
        }
    };

    // Render individual action card
    const ActionCard = ({card}: { card: ActionCard }) => (
        <Pressable
            style={[
                styles.card,
                isDark && styles.cardDark,
                card.isShopCard && (
                    card.color === "#F59E0B"
                        ? (isDark ? styles.shopCardExpiredDark : styles.shopCardExpired)
                        : (isDark ? styles.shopCardDark : styles.shopCard)
                )
            ]}
            onPress={() => handleCardPress(card)}
        >
            <View style={styles.cardMain}>
                <View
                    style={[
                        styles.iconContainer,
                        card.isShopCard ?
                            {backgroundColor: card.color} :
                            {backgroundColor: card.color + (isDark ? "20" : "10")}
                    ]}
                >
                    {card.icon}
                </View>
                <View style={styles.cardContent}>
                    <ThemedText
                        style={[
                            styles.cardTitle,
                            isDark && styles.cardTitleDark,
                            card.isShopCard && styles.shopCardTitle
                        ]}
                    >
                        {card.title}
                    </ThemedText>
                    {card.subtitle && (
                        <ThemedText
                            style={[
                                styles.cardSubtitle,
                                isDark && styles.cardSubtitleDark,
                                card.isShopCard && styles.shopCardSubtitle
                            ]}
                        >
                            {card.subtitle}
                        </ThemedText>
                    )}
                </View>
                {card.rightContent}
            </View>

            {card.progress && !card.isShopCard && (
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${card.progress?.percentage}%`,
                                    backgroundColor: card.color,
                                },
                            ]}
                        />
                    </View>
                </View>
            )}
        </Pressable>
    );

    // --- Logique de rendu ---
    if (isLoading) {
        return (
            <View style={[styles.container, isDark && styles.containerDark, styles.loadingContainer]}>
                <ThemedText style={[styles.loadingText, isDark && styles.loadingTextDark]}>
                    {progressLoading ? "Chargement de votre progression..." : "Chargement du programme..."}
                </ThemedText>
            </View>
        );
    }

    if (hasError || !program) {
        // LOG: Confirme que l'on affiche l'écran d'erreur
        console.error(`[ProgramDetails] Rendu du bloc d'erreur. (hasError: ${!!hasError}, !program: ${!program}, progressError: ${!!progressError})`);
        return (
            <View style={[styles.container, isDark && styles.containerDark, styles.loadingContainer]}>
                <ThemedText style={[styles.errorText, isDark && styles.errorTextDark]}>
                    Une erreur est survenue lors du chargement du programme.
                    {progressError ? " Erreur lors du chargement de votre progression" : " Erreur lors du chargement du programme"}
                </ThemedText>
                {/* Ajout : notification accès refusé si expiry */}
                {activeInstallment && activeInstallment.expiry_date && new Date(activeInstallment.expiry_date) < new Date() && (
                    <ThemedText style={[styles.errorText, isDark && styles.errorTextDark]}>
                        Votre accès à ce programme a expiré. Veuillez renouveler votre paiement pour continuer.
                    </ThemedText>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={[styles.header, isDark && styles.headerDark]}>
                <Image
                    source={{
                        uri: `https://api.dicebear.com/9.x/thumbs/png?seed=${program?.title}`,
                    }}
                    style={styles.headerImage}
                />
                <View style={styles.headerContent}>
                    <ThemedText
                        style={[styles.programTitle, isDark && styles.programTitleDark]}
                    >
                        {program?.concours_learningpaths &&
                         program.concours_learningpaths?.concour?.school?.name ?
                         program.concours_learningpaths.concour.school.name : ''}
                    </ThemedText>
                    <ThemedText
                        numberOfLines={1}
                        style={[styles.concoursName, isDark && styles.concoursNameDark]}
                    >
                        {program?.concours_learningpaths  &&
                         program.concours_learningpaths?.concour?.name || ''}

                    </ThemedText>
                    {!isEnrolled && (
                        <View style={styles.enrollmentStatus}>
                            <MaterialCommunityIcons
                                name="information-outline"
                                size={14}
                                color={isDark ? "#60A5FA" : "#2196F3"}
                            />
                            <ThemedText style={[styles.enrollmentStatusText, isDark && styles.enrollmentStatusTextDark]}>
                                Aperçu du programme - Non inscrit
                            </ThemedText>
                        </View>
                    )}
                </View>
            </View>

            {isEnrolled && (
                <View style={[styles.overallProgressContainer, isDark && styles.overallProgressContainerDark]}>
                    <ThemedText style={[styles.overallProgressLabel, isDark && styles.overallProgressLabelDark]}>
                        Progression globale: {totalProgress}%
                    </ThemedText>
                    <View style={[styles.progressBar, isDark && styles.progressBarDark, styles.overallProgressBar]}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${totalProgress}%`,
                                    backgroundColor: isDark ? "#6EE7B7" : "#4CAF50",
                                },
                            ]}
                        />
                    </View>
                </View>
            )}

            <ScrollView
                style={[
                    styles.container,
                    isDark && styles.containerDark,
                    {marginBottom: 80},
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.cardsContainer}>
                    {actionCards.map((card) => (
                        <ActionCard key={card.id} card={card}/>
                    ))}
                </View>
            </ScrollView>
        </View>
    );

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        paddingBottom: 40,
    },
    containerDark: {
        backgroundColor: "#111827",
    },
    header: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        display: "flex",
        flexDirection: "row",
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: "#374151",
    },
    headerImage: {
        width: 70,
        height: 70,
        borderRadius: 50,
    },
    headerContent: {
        flex: 1,
        justifyContent: "center",
    },
    programTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: "bold",
        color: "#111827",
        marginBottom: 8,
    },
    programTitleDark: {
        color: "#FFFFFF",
    },
    concoursName: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: "#4CAF50",
        fontWeight: "600",
    },
    concoursNameDark: {
        color: "#6EE7B7",
    },
    enrollmentStatus: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        gap: 4,
    },
    enrollmentStatusText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: "#2196F3",
        fontWeight: "500",
    },
    enrollmentStatusTextDark: {
        color: "#60A5FA",
    },
    overallProgressContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    overallProgressContainerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: "#374151",
    },
    overallProgressLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
        color: "#111827",
    },
    overallProgressLabelDark: {
        color: "#FFFFFF",
    },
    overallProgressBar: {
        height: 6,
    },
    cardsContainer: {
        padding: 16,
        gap: 12,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: theme.border.radius.small,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    cardDark: {
        backgroundColor: "#374151",
    },
    shopCard: {
        backgroundColor: "#4CAF50",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: {width: 0, height: 3},
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    shopCardDark: {
        backgroundColor: "#6EE7B7",
    },
    // Ajout : style pour carte shop expirée
    shopCardExpired: {
        backgroundColor: "#F59E0B",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: {width: 0, height: 3},
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    shopCardExpiredDark: {
        backgroundColor: "#F59E0B",
    },
    cardMain: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    cardContent: {
        flex: 1,
        marginLeft: 12,
    },
    cardTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
    },
    cardTitleDark: {
        color: "#FFFFFF",
    },
    shopCardTitle: {
        color: "#FFFFFF",
        fontWeight: "bold",
    },
    cardSubtitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },
    cardSubtitleDark: {
        color: "#9CA3AF",
    },
    shopCardSubtitle: {
        color: "rgba(255, 255, 255, 0.9)",
    },
    progressIndicator: {
        alignItems: "flex-end",
    },
    progressText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: "600",
        color: "#4B5563",
    },
    progressTextDark: {
        color: "#D1D5DB",
    },
    progressLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: "#6B7280",
    },
    progressLabelDark: {
        color: "#9CA3AF",
    },
    shopCardIndicator: {
        alignItems: "center",
        justifyContent: "center",
    },
    progressBarContainer: {
        marginTop: 12,
    },
    progressBar: {
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        overflow: "hidden",
    },
    progressBarDark: {
        backgroundColor: "#4B5563",
    },
    progressFill: {
        height: "100%",
        borderRadius: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: "#6B7280",
    },
    loadingTextDark: {
        color: "#9CA3AF",
    },
    errorText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: "#EF4444",
        textAlign: "center",
    },
    errorTextDark: {
        color: "#F87171",
    },
});

export default ProgramDetails;
