import {
    View,
    ScrollView,
    StyleSheet,
    Pressable,
    ActivityIndicator,
} from "react-native";
import React from "react";
import {ThemedText} from "@/components/ThemedText";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import useSWR from "swr";
import {supabase} from "@/lib/supabase";
import {theme} from "@/constants/theme";
import {useColorScheme} from "@/hooks/useColorScheme";

import {format} from "date-fns";
import {fr} from "date-fns/locale";
import {useAuth} from "@/contexts/auth";

const SkeletonCard = ({isDark}: { isDark: boolean }) => {
    return (
        <View
            style={[
                styles.paymentCard,
                styles.skeletonCard,
                isDark && styles.skeletonCardDark,
            ]}
        >
            <View
                style={[
                    styles.skeletonHeader,
                    styles.skeletonBox,
                    isDark && styles.skeletonBoxDark,
                ]}
            />
            <View
                style={[
                    styles.skeletonRow,
                    styles.skeletonBox,
                    isDark && styles.skeletonBoxDark,
                ]}
            />
            <View
                style={[
                    styles.skeletonRow,
                    styles.skeletonBox,
                    isDark && styles.skeletonBoxDark,
                ]}
            />
            <View
                style={[
                    styles.skeletonPrograms,
                    styles.skeletonBox,
                    isDark && styles.skeletonBoxDark,
                ]}
            />
        </View>
    );
};

const PaymentHistory = () => {
    const router = useRouter();
    const {user} = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    // Fetch user's payment history
    const {data: payments, isLoading} = useSWR(user?.id ? `payments-${user.id}` : null, async () => {
            const {data, error} = await supabase
                .from("payments")
                .select(`
          *,
          cart: carts (
            cart_items (
              program: concours_learningpaths (
                id,
                concour: concours (
                  name,
                  school: schools (name)
                )
              )
            )
          )
        `)
                .eq("user_id", user?.id)
                .order("created_at", {ascending: false});

            if (error) throw error;
            return data;
        }
    );

    // Format payment status for display
    const getStatusColor = (status: any) => {
        switch (status) {
            case "completed":
                return isDark ? "#059669" : "#065F46";
            case "pending":
                return isDark ? "#D97706" : "#92400E";
            case "failed":
                return isDark ? "#DC2626" : "#991B1B";
            default:
                return isDark ? "#6B7280" : "#374151";
        }
    };

    const getStatusIcon = (status: any) => {
        switch (status) {
            case "completed":
                return "check-circle";
            case "pending":
                return "clock-outline";
            case "failed":
                return "close-circle";
            default:
                return "help-circle";
        }
    };

    // Format amount for display
    const formatAmount = (amount: string | number | bigint) => {
        const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "XOF",
            minimumFractionDigits: 0,
        }).format(numericAmount);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, isDark && styles.containerDark]}>
                <View style={[styles.header, isDark && styles.headerDark]}>
                    <View style={[styles.headerIcon, isDark && styles.headerIconDark]}>
                        <MaterialCommunityIcons
                            name="credit-card-outline"
                            size={24}
                            color={isDark ? "#818CF8" : "#2563EB"}
                        />
                    </View>
                    <ThemedText style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
                        Historique des paiements
                    </ThemedText>
                    <Pressable
                        onPress={() => router.back()}
                        style={{padding: 8}}
                    >
                        <MaterialCommunityIcons
                            name="arrow-left"
                            size={24}
                            color={isDark ? "#9CA3AF" : "#6B7280"}
                        />
                    </Pressable>

                </View>
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {[...Array(5)].map((_, index) => (
                        <SkeletonCard key={index} isDark={isDark}/>
                    ))}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={[styles.header, isDark && styles.headerDark]}>
                <View style={[styles.headerIcon, isDark && styles.headerIconDark]}>
                    <MaterialCommunityIcons
                        name="credit-card-outline"
                        size={24}
                        color={isDark ? "#818CF8" : "#2563EB"}
                    />
                </View>
                <ThemedText style={[styles.headerTitle, isDark && styles.headerTitleDark, {flex : 1} ]}>
                    Historique des paiements
                </ThemedText>
                <Pressable
                    onPress={() => router.back()}
                    style={{padding: 8, }}
                >
                    <MaterialCommunityIcons
                        name="close"
                        size={24}
                        color={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                </Pressable>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {payments?.map((payment) => (
                    <Pressable
                        key={payment.id}
                        style={[styles.paymentCard, isDark && styles.paymentCardDark]}
                        onPress={() => {
                            // Handle payment details navigation if needed
                        }}
                    >
                        <View style={styles.paymentHeader}>
                            <View style={styles.paymentInfo}>
                                <ThemedText style={styles.paymentAmount}>
                                    {formatAmount(payment.amount)}
                                </ThemedText>
                                <ThemedText style={styles.paymentDate}>
                                    {format(new Date(payment.created_at), "d MMMM yyyy", {locale: fr})}
                                </ThemedText>
                            </View>
                            <View
                                style={[
                                    styles.statusBadge,
                                    {backgroundColor: getStatusColor(payment.status) + "20"},
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name={getStatusIcon(payment.status)}
                                    size={16}
                                    color={getStatusColor(payment.status)}
                                />
                                <ThemedText
                                    style={[styles.statusText, {color: getStatusColor(payment.status)}]}
                                >
                                    {payment.status === "completed"
                                        ? "Payé"
                                        : payment.status === "pending"
                                            ? "En attente"
                                            : "Échoué"}
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.programsList}>
                            {payment.cart?.cart_items?.map((item: any, index: React.Key) => (
                                <View key={index} style={styles.programItem}>
                                    <MaterialCommunityIcons
                                        name="school"
                                        size={16}
                                        color={isDark ? "#9CA3AF" : "#6B7280"}
                                    />
                                    <ThemedText style={styles.programName} numberOfLines={1}>
                                        {item.program?.concour?.name} - {item.program?.concour?.school?.name}
                                    </ThemedText>
                                </View>
                            ))}
                        </View>

                        <View style={styles.paymentDetails}>
                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons
                                    name="phone"
                                    size={16}
                                    color={isDark ? "#9CA3AF" : "#6B7280"}
                                />
                                <ThemedText style={styles.detailText}>
                                    {payment.phone_number}
                                </ThemedText>
                            </View>
                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons
                                    name="pound"
                                    size={16}
                                    color={isDark ? "#9CA3AF" : "#6B7280"}
                                />
                                <ThemedText style={styles.detailText}>
                                    {payment.payment_provider || "N/A"}
                                </ThemedText>
                            </View>
                        </View>

                        <View style={{flexDirection: "row"}}>
                            <ThemedText style={styles.transactionId}>
                                Transaction: {payment.trx_reference}
                            </ThemedText>
                        </View>
                    </Pressable>
                ))}

                {payments?.length === 0 && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons
                            name="credit-card-off"
                            size={48}
                            color={isDark ? "#4B5563" : "#9CA3AF"}
                        />
                        <ThemedText style={styles.emptyStateText}>
                            Aucun paiement trouvé
                        </ThemedText>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    containerDark: {
        backgroundColor: "#111827",
    },
    content: {
        flex: 1,
        padding: 16,
    },
    paymentCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: theme.border.radius.small,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    paymentCardDark: {
        backgroundColor: "#1F2937",
    },
    skeletonCard: {
        backgroundColor: "#E5E7EB",
        borderRadius: theme.border.radius.small,
        marginBottom: 16,
        padding: 16,
    },
    skeletonCardDark: {
        backgroundColor: "#374151",
    },
    skeletonHeader: {
        height: 20,
        width: "50%",
        marginBottom: 8,
    },
    skeletonRow: {
        height: 14,
        width: "75%",
        marginBottom: 8,
    },
    skeletonPrograms: {
        height: 14,
        width: "90%",
    },
    skeletonBox: {
        backgroundColor: "#D1D5DB",
        borderRadius: 4,
    },
    skeletonBoxDark: {
        backgroundColor: "#4B5563",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerDark: {
        backgroundColor: "#1F2937",
    },
    headerIcon: {
        width: 40,
        height: 40,
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    headerIconDark: {
        backgroundColor: "rgba(129, 140, 248, 0.2)",
    },
    headerTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 19,
        fontWeight: "700",
        color: "#111827",
    },
    headerTitleDark: {
        color: "#FFFFFF",
    },
    paymentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    paymentInfo: {
        flex: 1,
    },
    paymentAmount: {
        fontFamily : theme.typography.fontFamily,
fontSize: 18,
        fontWeight: "600",
        marginBottom: 4,
    },
    paymentDate: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: "#6B7280",
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
        marginLeft: 8,
    },
    statusText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        fontWeight: "500",
        marginLeft: 4,
    },
    programsList: {
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 12,
        marginBottom: 12,
    },
    programItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    programName: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    paymentDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    detailText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: "#6B7280",
        marginLeft: 4,
    },
    transactionId: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        color: "#9CA3AF",
        marginTop: 4,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
    },
    emptyStateText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: "#6B7280",
        marginTop: 16,
        textAlign: "center",
    },
});

export default PaymentHistory;