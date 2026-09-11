import {
    View,
    ScrollView,
    StyleSheet,
} from "react-native";
import React from "react";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import useSWR from "swr";
import {format} from "date-fns";
import {fr} from "date-fns/locale";

import {supabase} from "@/lib/supabase";
import {theme} from "@/constants/theme";
import {useColorScheme} from "@/hooks/useColorScheme";
import {ThemedText} from "@/components/ThemedText";
import {useAuth} from "@/contexts/auth";
import {SECONDARY_PLAN_LABELS, SecondaryPlan} from "@/types/secondaryPayment.types";

type PaymentSource = "program" | "competition" | "secondary";

type UnifiedPayment = {
    id: string;
    source: PaymentSource;
    amount: number;
    status: string;
    date: string | null;
    itemLabel: string;
    subLabel?: string;
};

const SOURCE_META: Record<PaymentSource, { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }> = {
    program: {label: "Prépa", icon: "school"},
    competition: {label: "Concours blanc", icon: "trophy-outline"},
    secondary: {label: "Secondaire", icon: "book-open-variant"},
};

async function fetchAllPayments(userId: string): Promise<UnifiedPayment[]> {
    const [programRes, competitionRes, secondaryRes] = await Promise.all([
        supabase
            .from("user_program_payments")
            .select("id, amount, payment_status, payment_date, created_at, concours_learningpaths(concour:concours(name, school:schools(name)))")
            .eq("user_id", userId)
            .order("created_at", {ascending: false}),
        supabase
            .from("user_competition_payments")
            .select("id, amount, payment_status, payment_date, created_at, concours(name)")
            .eq("user_id", userId)
            .order("created_at", {ascending: false}),
        supabase
            .from("user_secondary_payments")
            .select("id, amount, payment_status, payment_date, created_at, plan, program_id")
            .eq("user_id", userId)
            .order("created_at", {ascending: false}),
    ]);

    const programPayments: UnifiedPayment[] = ((programRes.data as any[]) ?? []).map((p) => ({
        id: `program-${p.id}`,
        source: "program",
        amount: p.amount,
        status: p.payment_status ?? "pending",
        date: p.payment_date || p.created_at,
        itemLabel: p.concours_learningpaths?.concour
            ? `${p.concours_learningpaths.concour.name}${
                p.concours_learningpaths.concour.school?.name ? " - " + p.concours_learningpaths.concour.school.name : ""
            }`
            : "Programme",
    }));

    const competitionPayments: UnifiedPayment[] = ((competitionRes.data as any[]) ?? []).map((p) => ({
        id: `competition-${p.id}`,
        source: "competition",
        amount: p.amount,
        status: p.payment_status ?? "pending",
        date: p.payment_date || p.created_at,
        itemLabel: p.concours?.name || "Concours blanc",
    }));

    // Pas de FK program_id -> secondary_programs : résolution manuelle en 2e requête.
    const secondaryRows = (secondaryRes.data as any[]) ?? [];
    const programIds = [...new Set(secondaryRows.map((p) => p.program_id).filter(Boolean))];
    const secondaryProgramsById: Record<string, { className?: string; serieName?: string }> = {};
    if (programIds.length > 0) {
        const {data: programs} = await supabase
            .from("secondary_programs")
            .select("id, class:secondary_classes(name), serie:secondary_series(name)")
            .in("id", programIds);
        (programs as any[] ?? []).forEach((prog) => {
            secondaryProgramsById[prog.id] = {className: prog.class?.name, serieName: prog.serie?.name};
        });
    }

    const secondaryPayments: UnifiedPayment[] = secondaryRows.map((p) => {
        const prog = p.program_id ? secondaryProgramsById[p.program_id] : undefined;
        const itemLabel = [prog?.className, prog?.serieName].filter(Boolean).join(" ") || "Secondaire";
        return {
            id: `secondary-${p.id}`,
            source: "secondary",
            amount: p.amount,
            status: p.payment_status ?? "pending",
            date: p.payment_date || p.created_at,
            itemLabel,
            subLabel: p.plan ? SECONDARY_PLAN_LABELS[p.plan as SecondaryPlan] : undefined,
        };
    });

    return [...programPayments, ...competitionPayments, ...secondaryPayments].sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
    });
}

const SkeletonCard = ({isDark}: { isDark: boolean }) => {
    return (
        <View
            style={[
                styles.paymentCard,
                styles.skeletonCard,
                isDark && styles.skeletonCardDark,
            ]}
        >
            <View style={[styles.skeletonHeader, styles.skeletonBox, isDark && styles.skeletonBoxDark]}/>
            <View style={[styles.skeletonRow, styles.skeletonBox, isDark && styles.skeletonBoxDark]}/>
        </View>
    );
};

const STATUS_META: Record<string, { label: string; icon: string; color: (isDark: boolean) => string }> = {
    completed: {label: "Payé", icon: "check-circle", color: (isDark) => (isDark ? "#059669" : "#065F46")},
    pending: {label: "En attente", icon: "clock-outline", color: (isDark) => (isDark ? "#D97706" : "#92400E")},
    processing: {label: "En attente", icon: "clock-outline", color: (isDark) => (isDark ? "#D97706" : "#92400E")},
    initialized: {label: "En attente", icon: "clock-outline", color: (isDark) => (isDark ? "#D97706" : "#92400E")},
    failed: {label: "Échoué", icon: "close-circle", color: (isDark) => (isDark ? "#DC2626" : "#991B1B")},
    canceled: {label: "Annulé", icon: "cancel", color: (isDark) => (isDark ? "#6B7280" : "#374151")},
    expired: {label: "Expiré", icon: "alert-circle-outline", color: (isDark) => (isDark ? "#DC2626" : "#991B1B")},
};

const PaymentHistory = () => {
    const router = useRouter();
    const {user} = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const {data: payments, isLoading} = useSWR(
        user?.id ? `all-payments-${user.id}` : null,
        () => fetchAllPayments(user!.id)
    );

    const formatAmount = (amount: number) => `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;

    const statusMeta = (status: string) =>
        STATUS_META[status] || {label: status, icon: "help-circle", color: (d: boolean) => (d ? "#9CA3AF" : "#6B7280")};

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
                <ThemedText style={[styles.headerTitle, isDark && styles.headerTitleDark, {flex: 1}]}>
                    Historique des paiements
                </ThemedText>
                <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                    onPress={() => router.back()}
                    style={{padding: 8}}
                />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {isLoading && [...Array(5)].map((_, index) => <SkeletonCard key={index} isDark={isDark}/>)}

                {!isLoading && payments?.map((payment) => {
                    const meta = statusMeta(payment.status);
                    const sourceMeta = SOURCE_META[payment.source];
                    return (
                        <View key={payment.id} style={[styles.paymentCard, isDark && styles.paymentCardDark]}>
                            <View style={styles.paymentHeader}>
                                <View style={styles.paymentInfo}>
                                    <View style={styles.sourceTag}>
                                        <MaterialCommunityIcons
                                            name={sourceMeta.icon}
                                            size={13}
                                            color={isDark ? "#9CA3AF" : "#6B7280"}
                                        />
                                        <ThemedText style={styles.sourceTagText}>{sourceMeta.label}</ThemedText>
                                    </View>
                                    <ThemedText style={styles.paymentAmount}>
                                        {formatAmount(payment.amount)}
                                    </ThemedText>
                                    <ThemedText style={styles.paymentDate}>
                                        {payment.date
                                            ? format(new Date(payment.date), "d MMMM yyyy", {locale: fr})
                                            : "--"}
                                    </ThemedText>
                                </View>
                                <View style={[styles.statusBadge, {backgroundColor: meta.color(isDark) + "20"}]}>
                                    <MaterialCommunityIcons name={meta.icon as any} size={16} color={meta.color(isDark)}/>
                                    <ThemedText style={[styles.statusText, {color: meta.color(isDark)}]}>
                                        {meta.label}
                                    </ThemedText>
                                </View>
                            </View>

                            <View style={styles.itemRow}>
                                <MaterialCommunityIcons
                                    name="bookmark-outline"
                                    size={16}
                                    color={isDark ? "#9CA3AF" : "#6B7280"}
                                />
                                <ThemedText style={styles.itemLabel} numberOfLines={2}>
                                    {payment.itemLabel}
                                    {payment.subLabel ? ` — ${payment.subLabel}` : ""}
                                </ThemedText>
                            </View>
                        </View>
                    );
                })}

                {!isLoading && payments?.length === 0 && (
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
        paddingBottom: 80,
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
        fontFamily: theme.typography.fontFamily,
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
    sourceTag: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    sourceTagText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: "#6B7280",
        marginLeft: 4,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    paymentAmount: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 4,
    },
    paymentDate: {
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: "500",
        marginLeft: 4,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 12,
    },
    itemLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
    },
    emptyStateText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: "#6B7280",
        marginTop: 16,
        textAlign: "center",
    },
});

export default PaymentHistory;
