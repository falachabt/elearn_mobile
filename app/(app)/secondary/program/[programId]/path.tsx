// app/(app)/secondary/program/[programId]/path.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { Href, useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Modal from 'react-native-modal';

import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useNavigation } from '@/contexts/NavigationContext';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import {
  getLearningPathUnits,
  getCompletedStepIds,
  getMilestoneSteps,
  markStepsCompleted,
  LpUnit,
  LpMilestone,
  LpStepWithLabel,
} from '@/services/learningPath.service';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_SPACING = 90;
const CENTER_X = SCREEN_WIDTH / 2;
const AMPLITUDE = Math.min(SCREEN_WIDTH / 2 - 90, 90);

type MilestoneStatus = 'done' | 'current' | 'locked';

// Petit hash déterministe (même seed -> toujours la même valeur) pour
// varier légèrement chaque nœud sans que la position ne saute d'un
// rendu à l'autre.
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashToSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1000000;
  }
  return hash;
}

// Chemin organique : combine deux ondes de fréquences différentes plus
// un léger bruit par nœud, pour éviter le zigzag parfaitement régulier
// gauche/droite/gauche/droite qui a l'air artificiel.
function getOrganicPoints(seed: number, count: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let y = 66;

  for (let i = 0; i < count; i++) {
    const wave = Math.sin(i * 0.9 + seed) * 0.65 + Math.sin(i * 0.37 + seed * 1.7) * 0.35;
    const jitter = (seededRandom(seed * 13.37 + i * 7.91) - 0.5) * 0.35;
    const t = Math.max(-1, Math.min(1, wave + jitter));
    const x = CENTER_X + t * AMPLITUDE;

    const spacingJitter = (seededRandom(seed * 5.21 + i * 3.13) - 0.5) * 18;
    if (i > 0) y += BASE_SPACING + spacingJitter;

    points.push({ x, y });
  }

  return points;
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.slice(1).reduce((d, node, i) => {
    const prev = points[i];
    const midY = (prev.y + node.y) / 2;
    return `${d} C${prev.x},${midY} ${node.x},${midY} ${node.x},${node.y}`;
  }, `M${points[0].x},${points[0].y}`);
}

const MilestoneIcon = (type: LpMilestone['type']): keyof typeof MaterialCommunityIcons.glyphMap => {
  if (type === 'practice') return 'dumbbell';
  if (type === 'checkpoint') return 'flag-checkered';
  return 'book-open-variant';
};

const CurrentPulse = ({ size }: { size: number }) => {
  const scale = useRef(new Animated.Value(0.86)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.28, duration: 1300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      scale.setValue(0.86);
      opacity.setValue(0.55);
    };
  }, [scale, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        { width: size + 18, height: size + 18, borderRadius: (size + 18) / 2, transform: [{ scale }], opacity },
      ]}
    />
  );
};

const MilestoneNode = ({
  milestone,
  status,
  x,
  y,
  isDark,
  onPress,
}: {
  milestone: LpMilestone;
  status: MilestoneStatus;
  x: number;
  y: number;
  isDark: boolean;
  onPress: (milestone: LpMilestone, status: MilestoneStatus) => void;
}) => {
  const { trigger } = useHaptics();
  const shakeX = useRef(new Animated.Value(0)).current;
  const isLocked = status === 'locked';
  const isCurrent = status === 'current';
  const size = isCurrent ? 68 : 56;

  const handlePress = () => {
    if (isLocked) {
      trigger(HapticType.WARNING);
      Animated.sequence([
        Animated.timing(shakeX, { toValue: -5, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 5, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 55, useNativeDriver: true }),
      ]).start();
    } else {
      trigger(HapticType.MEDIUM);
    }
    onPress(milestone, status);
  };

  const baseColor = isLocked ? (isDark ? '#334155' : '#E2E8F0') : isCurrent ? theme.color.primary[500] : theme.color.primary[600];
  const rimColor = isLocked ? (isDark ? '#475569' : '#CBD5E1') : theme.color.primary[700];

  return (
    <View style={[styles.nodeWrap, { left: x - size / 2, top: y - size / 2, width: size, height: size + 6 }]}>
      {isCurrent && <CurrentPulse size={size} />}
      <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
        {/* Base plus sombre décalée vers le bas : illusion de bouton 3D bombé */}
        <View
          style={[
            styles.nodeRim,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: rimColor, top: 5 },
          ]}
        />
        <Pressable
          onPress={handlePress}
          style={[
            styles.node,
            { width: size, height: size - 5, borderRadius: size / 2, backgroundColor: baseColor },
          ]}
        >
          <MaterialCommunityIcons
            name={status === 'done' ? 'check-bold' : isLocked ? 'lock' : MilestoneIcon(milestone.type)}
            size={status === 'done' || isLocked ? 24 : 26}
            color={isLocked ? (isDark ? '#64748B' : '#94A3B8') : '#FFFFFF'}
          />
        </Pressable>
      </Animated.View>
      <Text
        numberOfLines={2}
        style={[
          styles.nodeLabel,
          isDark && styles.nodeLabelDark,
          { top: size + 6, width: 100, left: size / 2 - 50 },
        ]}
      >
        {milestone.title}
      </Text>
    </View>
  );
};

const UnitSerpentine = ({
  unit,
  statuses,
  isDark,
  onMilestonePress,
}: {
  unit: LpUnit;
  statuses: Record<string, MilestoneStatus>;
  isDark: boolean;
  onMilestonePress: (milestone: LpMilestone, status: MilestoneStatus) => void;
}) => {
  const points = useMemo(
    () => getOrganicPoints(hashToSeed(unit.id), unit.milestones.length),
    [unit.id, unit.milestones.length]
  );

  const height = (points[points.length - 1]?.y ?? 60) + 70;
  const doneUpTo = unit.milestones.findIndex((m) => statuses[m.id] !== 'done');
  const donePoints = doneUpTo === -1 ? points : points.slice(0, doneUpTo + 1);

  const pathD = useMemo(() => buildSmoothPath(points), [points]);
  const donePathD = useMemo(() => buildSmoothPath(donePoints), [donePoints]);

  return (
    <View style={{ width: SCREEN_WIDTH, height }}>
      <Svg width={SCREEN_WIDTH} height={height} style={StyleSheet.absoluteFill}>
        <Path
          d={pathD}
          stroke={isDark ? '#334155' : '#E2E8F0'}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="2 14"
          fill="none"
        />
        <Path d={donePathD} stroke={theme.color.primary[500]} strokeWidth={5} strokeLinecap="round" fill="none" />
      </Svg>
      {unit.milestones.map((m, i) => (
        <MilestoneNode
          key={m.id}
          milestone={m}
          status={statuses[m.id] || 'locked'}
          x={points[i].x}
          y={points[i].y}
          isDark={isDark}
          onPress={onMilestonePress}
        />
      ))}
    </View>
  );
};

const PracticeSheet = ({
  visible,
  milestone,
  isDark,
  onClose,
  onStepPress,
}: {
  visible: boolean;
  milestone: LpMilestone | null;
  isDark: boolean;
  onClose: () => void;
  onStepPress: (step: LpStepWithLabel) => void;
}) => {
  const insets = useSafeAreaInsets();
  const [steps, setSteps] = useState<LpStepWithLabel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !milestone) return;
    let cancelled = false;
    setLoading(true);
    getMilestoneSteps(milestone.id).then((data) => {
      if (!cancelled) {
        setSteps(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, milestone]);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={sheetStyles.modal}
      backdropOpacity={0.5}
      propagateSwipe
      swipeDirection="down"
      onSwipeComplete={onClose}
      useNativeDriver
    >
      <View style={[sheetStyles.sheet, isDark && sheetStyles.sheetDark, { paddingBottom: 20 + insets.bottom }]}>
        <View style={[sheetStyles.handle, isDark && sheetStyles.handleDark]} />
        <Text style={[sheetStyles.title, isDark && sheetStyles.titleDark]}>{milestone?.title}</Text>

        {loading ? (
          <ActivityIndicator size="small" color={theme.color.primary[500]} style={{ marginVertical: 20 }} />
        ) : steps.length === 0 ? (
          <Text style={[sheetStyles.empty, isDark && sheetStyles.emptyDark]}>Rien à pratiquer ici pour l'instant.</Text>
        ) : (
          <ScrollView style={{ maxHeight: 360 }}>
            {steps.map((step) => (
              <TouchableOpacity
                key={step.id}
                style={[sheetStyles.row, isDark && sheetStyles.rowDark]}
                onPress={() => onStepPress(step)}
              >
                <MaterialCommunityIcons
                  name={step.step_type === 'quiz' ? 'pencil-box-multiple-outline' : 'card-text-outline'}
                  size={20}
                  color={theme.color.primary[500]}
                />
                <Text style={[sheetStyles.rowLabel, isDark && sheetStyles.rowLabelDark]} numberOfLines={1}>
                  {step.label}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

export default function LearningPathScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();
  const { getCoursePath, getQuizPath, getExercicePath } = useNavigation();
  const insets = useSafeAreaInsets();

  const [units, setUnits] = useState<LpUnit[]>([]);
  const [completedMilestoneIds, setCompletedMilestoneIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [practiceMilestone, setPracticeMilestone] = useState<LpMilestone | null>(null);

  const loadPath = useCallback(async () => {
    if (!programId) return;
    setLoading(true);

    const [fetchedUnits, completedStepIds] = await Promise.all([
      getLearningPathUnits(programId),
      user?.id ? getCompletedStepIds(user.id) : Promise.resolve(new Set<string>()),
    ]);

    let completedMilestones = new Set<string>();
    if (completedStepIds.size > 0) {
      const { data } = await supabase
        .from('lp_steps')
        .select('milestone_id')
        .in('id', Array.from(completedStepIds));
      completedMilestones = new Set((data ?? []).map((r) => r.milestone_id));
    }

    setUnits(fetchedUnits);
    setCompletedMilestoneIds(completedMilestones);
    setLoading(false);
  }, [programId, user?.id]);

  useEffect(() => {
    loadPath();
  }, [loadPath]);

  // Chaque matière avance indépendamment des autres : le premier jalon
  // non terminé DE CHAQUE unité est "current", pas un seul jalon
  // "current" global — sinon il faudrait finir les 39 cours de maths
  // avant de voir la moindre étape de géographie.
  const statuses = useMemo(() => {
    const map: Record<string, MilestoneStatus> = {};
    units.forEach((unit) => {
      const currentIndex = unit.milestones.findIndex((m) => !completedMilestoneIds.has(m.id));
      unit.milestones.forEach((m, i) => {
        if (completedMilestoneIds.has(m.id)) map[m.id] = 'done';
        else if (i === currentIndex) map[m.id] = 'current';
        else map[m.id] = 'locked';
      });
    });
    return map;
  }, [units, completedMilestoneIds]);

  const handleMilestonePress = useCallback(
    async (milestone: LpMilestone, status: MilestoneStatus) => {
      if (status === 'locked') return;

      if (milestone.type === 'practice') {
        setPracticeMilestone(milestone);
        return;
      }

      if (milestone.type === 'lesson' && milestone.ref_course_id) {
        if (user?.id) {
          const steps = await getMilestoneSteps(milestone.id);
          markStepsCompleted(user.id, steps.map((s) => s.id)).then(loadPath);
        }
        router.push(getCoursePath(String(milestone.ref_course_id)) as Href);
      }
    },
    [user?.id, router, getCoursePath, loadPath]
  );

  const handlePracticeStepPress = useCallback(
    (step: LpStepWithLabel) => {
      setPracticeMilestone(null);
      if (user?.id) {
        markStepsCompleted(user.id, [step.id]).then(loadPath);
      }
      if (step.step_type === 'quiz') {
        router.push(getQuizPath(step.ref_id) as Href);
      } else {
        router.push(getExercicePath(step.ref_id) as Href);
      }
    },
    [user?.id, router, getQuizPath, getExercicePath, loadPath]
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, isDark && styles.headerDark, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, isDark && styles.backButtonDark]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={isDark ? '#F9FAFB' : '#111827'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>Parcours</Text>
        <View style={styles.headerStats}>
          <MaterialCommunityIcons name="fire" size={18} color="#EF4444" />
          <Text style={[styles.headerStatText, isDark && styles.textDark]}>{user?.user_streaks?.current_streak || 0}</Text>
          <MaterialCommunityIcons name="star" size={18} color="#F59E0B" style={{ marginLeft: 10 }} />
          <Text style={[styles.headerStatText, isDark && styles.textDark]}>{user?.user_xp?.total_xp || 0}</Text>
        </View>
      </View>

      {units.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="map-marker-path" size={48} color="#CBD5E1" />
          <Text style={[styles.emptyText, isDark && styles.textDark]}>Parcours pas encore disponible.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {units.map((unit) => {
            const doneCount = unit.milestones.filter((m) => statuses[m.id] === 'done').length;
            const unitDone = doneCount === unit.milestones.length;

            return (
              <View key={unit.id} style={styles.unitBlock}>
                <View style={styles.unitHeaderRow}>
                  <Text style={[styles.unitTitle, isDark && styles.textDark]}>{unit.title}</Text>
                  {unitDone ? (
                    <MaterialCommunityIcons name="check-decagram" size={18} color={theme.color.primary[500]} />
                  ) : (
                    <Text style={[styles.unitProgress, isDark && styles.subTextDark]}>
                      {doneCount}/{unit.milestones.length}
                    </Text>
                  )}
                </View>

                <UnitSerpentine unit={unit} statuses={statuses} isDark={isDark} onMilestonePress={handleMilestonePress} />
              </View>
            );
          })}
        </ScrollView>
      )}

      <PracticeSheet
        visible={!!practiceMilestone}
        milestone={practiceMilestone}
        isDark={isDark}
        onClose={() => setPracticeMilestone(null)}
        onStepPress={handlePracticeStepPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  containerDark: { backgroundColor: theme.color.dark.background.primary },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: theme.color.dark.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  backButtonDark: { backgroundColor: '#374151' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#0F172A' },
  headerStats: { flexDirection: 'row', alignItems: 'center' },
  headerStatText: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginLeft: 4 },
  textDark: { color: '#F8FAFC' },
  subTextDark: { color: '#94A3B8' },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  content: { paddingBottom: 60 },
  unitBlock: { marginTop: 20 },
  unitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  unitTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  unitProgress: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  nodeWrap: { position: 'absolute', alignItems: 'center' },
  nodeRim: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  node: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  nodeLabel: {
    position: 'absolute',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  nodeLabelDark: { color: '#CBD5E1' },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: theme.color.primary[500],
  },
});

const sheetStyles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    backgroundColor: theme.color.light.background.primary,
    borderTopLeftRadius: theme.border.radius.large,
    borderTopRightRadius: theme.border.radius.large,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  sheetDark: { backgroundColor: theme.color.dark.background.primary },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.color.light.border, alignSelf: 'center', marginBottom: 12 },
  handleDark: { backgroundColor: theme.color.dark.border },
  title: { fontSize: 16, fontWeight: '700', color: theme.color.light.text.primary, marginBottom: 12 },
  titleDark: { color: '#F8FAFC' },
  empty: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 20 },
  emptyDark: { color: '#94A3B8' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowDark: { borderBottomColor: theme.color.dark.border },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.color.light.text.primary },
  rowLabelDark: { color: '#F8FAFC' },
});
