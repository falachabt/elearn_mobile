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
import { Href, useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Modal from 'react-native-modal';

import { logger } from '@/utils/logger';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { theme } from '@/constants/theme';
import { getCategoryTheme } from '@/constants/categoryThemes';
import { useAuth } from '@/contexts/auth';
import { useNavigation } from '@/contexts/NavigationContext';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import {
  getLearningPathUnits,
  getCompletedStepIds,
  getMilestoneSteps,
  markStepsCompleted,
  getCourseProgressMap,
  LpUnit,
  LpMilestone,
  LpStepWithLabel,
  CourseProgress,
} from '@/services/learningPath.service';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_SPACING = 96;
const CENTER_X = SCREEN_WIDTH / 2;
const AMPLITUDE = Math.min(SCREEN_WIDTH / 2 - 90, 90);

type MilestoneStatus = 'done' | 'current' | 'locked';

interface PathItem extends LpMilestone {
  categoryName: string;
}

// Mélange les catégories entre elles au lieu d'un bloc par matière : chaque
// jalon reçoit un ratio (sa position relative dans SA matière), puis on
// trie tout par ratio. Une matière à 20 cours et une à 10 s'entrelacent
// alors naturellement ~2 pour 1 au lieu que l'une bloque l'autre pendant
// des mois.
function interleaveByCategory(units: LpUnit[]): PathItem[] {
  const enriched = units.flatMap((unit) =>
    unit.milestones.map((m, i) => ({
      ...m,
      categoryName: unit.title,
      ratio: unit.milestones.length <= 1 ? 0 : i / (unit.milestones.length - 1),
      unitOrder: unit.order_index,
    }))
  );
  enriched.sort((a, b) => a.ratio - b.ratio || a.unitOrder - b.unitOrder);
  return enriched.map(({ ratio: _ratio, unitOrder: _unitOrder, ...item }) => item);
}

function getProgressFraction(
  item: PathItem,
  courseProgress: Map<number, CourseProgress>,
  completedMilestoneIds: Set<string>
): number {
  if (item.type === 'lesson' && item.ref_course_id) {
    const cp = courseProgress.get(item.ref_course_id);
    if (!cp || cp.totalSections === 0) return 0;
    return Math.min(1, cp.completedSections / cp.totalSections);
  }
  return completedMilestoneIds.has(item.id) ? 1 : 0;
}

function isItemDone(
  item: PathItem,
  courseProgress: Map<number, CourseProgress>,
  completedMilestoneIds: Set<string>
): boolean {
  if (item.type === 'lesson' && item.ref_course_id) {
    return courseProgress.get(item.ref_course_id)?.isCompleted === true;
  }
  return completedMilestoneIds.has(item.id);
}

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

// Chemin organique : alterne toujours de côté (évite qu'un nœud et son
// voisin atterrissent du même côté et que les étiquettes se chevauchent),
// mais fait varier l'amplitude du swing pour ne pas retomber sur un
// zigzag parfaitement régulier gauche/droite/gauche/droite.
function getOrganicPoints(seed: number, count: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let y = 70;

  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const swing = 0.55 + seededRandom(seed * 13.37 + i * 7.91) * 0.45;
    const x = CENTER_X + side * swing * AMPLITUDE;

    const spacingJitter = (seededRandom(seed * 5.21 + i * 3.13) - 0.5) * 10;
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

const NODE_RADIUS_RATIO = 0.16;

// Nœud en View pure (pas de <Svg> par item, cause du crash Canvas
// résolu ailleurs). Icône = celle de la matière (categoryThemes.ts),
// pas du type lesson/practice : verrouillé = même icône, grisée. Barre
// de progression fine collée à la bordure basse plutôt qu'un anneau
// (l'anneau SVG par nœud a été abandonné après les crashs).
const MilestoneNode = React.memo(
  ({
    item,
    status,
    fraction,
    x,
    y,
    isDark,
    onPress,
  }: {
    item: PathItem;
    status: MilestoneStatus;
    fraction: number;
    x: number;
    y: number;
    isDark: boolean;
    onPress: (item: PathItem, status: MilestoneStatus) => void;
  }) => {
    const { trigger } = useHaptics();
    const shakeX = useRef(new Animated.Value(0)).current;
    const isLocked = status === 'locked';
    const isCurrent = status === 'current';
    const isDone = status === 'done';
    const size = isCurrent ? 66 : 56;
    const radius = size * NODE_RADIUS_RATIO;

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
      onPress(item, status);
    };

    const categoryTheme = getCategoryTheme(item.categoryName);
    const categoryColor = categoryTheme.primary;
    const categoryIcon = categoryTheme.icon as keyof typeof MaterialCommunityIcons.glyphMap;
    const iconColor = isLocked ? (isDark ? '#64748B' : '#94A3B8') : categoryColor;
    const borderColor = isLocked ? (isDark ? '#334155' : '#E2E8F0') : categoryColor;
    const cardColor = isLocked ? (isDark ? '#1E293B' : '#F1F5F9') : isDone ? categoryColor : isDark ? '#0F172A' : '#FFFFFF';
    const pct = Math.max(0, Math.min(100, Math.round(fraction * 100)));

    return (
      <View style={[styles.nodeWrap, { left: x - size / 2, top: y - size / 2, width: size, height: size + 6 }]}>
        <Animated.View style={{ width: size, height: size, transform: [{ translateX: shakeX }] }}>
          <Pressable
            onPress={handlePress}
            style={[
              styles.node,
              { width: size, height: size, borderRadius: radius, borderWidth: 3, borderColor, backgroundColor: cardColor },
            ]}
          >
            <MaterialCommunityIcons
              name={categoryIcon}
              size={isDone ? 22 : 24}
              color={isDone ? '#FFFFFF' : iconColor}
            />
            {isCurrent && pct > 0 && (
              <View style={styles.nodeProgressTrack}>
                <View style={[styles.nodeProgressFill, { width: `${pct}%`, backgroundColor: categoryColor }]} />
              </View>
            )}
          </Pressable>
        </Animated.View>
        <Text
          numberOfLines={2}
          style={[
            styles.nodeLabel,
            isDark && styles.nodeLabelDark,
            { top: size + 6, width: 92, left: size / 2 - 46 },
          ]}
        >
          {item.title}
        </Text>
      </View>
    );
  },
  (prev, next) =>
    prev.status === next.status &&
    prev.fraction === next.fraction &&
    prev.x === next.x &&
    prev.y === next.y &&
    prev.isDark === next.isDark &&
    prev.item.id === next.item.id
);

// Nombre de jalons par segment de <Svg>. Un seul grand Svg couvrant tout
// le chemin (150+ jalons ≈ 15 000dp de haut) se transforme, sur un écran
// haute densité, en un bitmap qui dépasse la limite de Canvas d'Android
// ("Canvas: trying to draw too large bitmap", crash confirmé par logcat).
// Découper en segments plus courts garde chaque bitmap sous la limite.
const CHUNK_SIZE = 12;

// Position Y (dans le contenu du ScrollView) du jalon "current", en
// rejouant le même calcul de segments que PathSegment. Utilisé pour
// déposer l'utilisateur directement sur son étape active à l'ouverture,
// sans qu'il ait à scroller manuellement s'il est déjà loin dans l'arbre.
function computeScrollTargetY(items: PathItem[], currentIndex: number): number {
  if (currentIndex < 0 || items.length === 0) return 0;

  const seed = hashToSeed(items[0].id);
  const points = getOrganicPoints(seed, items.length);

  let offsetY = 0;
  for (let start = 0; start < items.length; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, items.length);
    const chunkPoints = points.slice(start, end);
    const chunkTop = chunkPoints[0].y - 70;

    if (currentIndex >= start && currentIndex < end) {
      return offsetY + (points[currentIndex].y - chunkTop);
    }

    const chunkHeight = chunkPoints[chunkPoints.length - 1].y + 70 - chunkTop;
    offsetY += chunkHeight;
  }

  return offsetY;
}

const PathSegment = ({
  items,
  points,
  statuses,
  fractions,
  isDark,
  onMilestonePress,
}: {
  items: PathItem[];
  points: { x: number; y: number }[];
  statuses: Record<string, MilestoneStatus>;
  fractions: Record<string, number>;
  isDark: boolean;
  onMilestonePress: (item: PathItem, status: MilestoneStatus) => void;
}) => {
  const top = points[0].y - 70;
  const bottom = points[points.length - 1].y + 70;
  const height = bottom - top;
  const localPoints = useMemo(() => points.map((p) => ({ x: p.x, y: p.y - top })), [points, top]);

  const doneUpTo = items.findIndex((item) => statuses[item.id] !== 'done');
  const donePoints = doneUpTo === -1 ? localPoints : localPoints.slice(0, doneUpTo + 1);

  const pathD = useMemo(() => buildSmoothPath(localPoints), [localPoints]);
  const donePathD = useMemo(() => buildSmoothPath(donePoints), [donePoints]);

  const trackColor = isDark ? '#334155' : '#E2E8F0';

  return (
    <View style={{ width: SCREEN_WIDTH, height }}>
      <Svg width={SCREEN_WIDTH} height={height} style={StyleSheet.absoluteFill}>
        <Path
          d={pathD}
          stroke={trackColor}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="2 14"
          fill="none"
        />
        <Path
          d={donePathD}
          stroke={theme.color.primary[500]}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="2 14"
          fill="none"
        />
      </Svg>
      {items.map((item, i) => (
        <MilestoneNode
          key={item.id}
          item={item}
          status={statuses[item.id] || 'locked'}
          fraction={fractions[item.id] || 0}
          x={localPoints[i].x}
          y={localPoints[i].y}
          isDark={isDark}
          onPress={onMilestonePress}
        />
      ))}
    </View>
  );
};

const PathTrail = ({
  items,
  statuses,
  fractions,
  isDark,
  onMilestonePress,
}: {
  items: PathItem[];
  statuses: Record<string, MilestoneStatus>;
  fractions: Record<string, number>;
  isDark: boolean;
  onMilestonePress: (item: PathItem, status: MilestoneStatus) => void;
}) => {
  const seed = useMemo(() => (items[0] ? hashToSeed(items[0].id) : 0), [items]);
  const points = useMemo(() => getOrganicPoints(seed, items.length), [seed, items.length]);

  const chunks = useMemo(() => {
    const result: { items: PathItem[]; points: { x: number; y: number }[] }[] = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      result.push({ items: items.slice(i, i + CHUNK_SIZE), points: points.slice(i, i + CHUNK_SIZE) });
    }
    return result;
  }, [items, points]);

  return (
    <View>
      {chunks.map((chunk, i) => (
        <PathSegment
          key={i}
          items={chunk.items}
          points={chunk.points}
          statuses={statuses}
          fractions={fractions}
          isDark={isDark}
          onMilestonePress={onMilestonePress}
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
  return (
    <ErrorBoundary>
      <LearningPathScreenContent />
    </ErrorBoundary>
  );
}

function LearningPathScreenContent() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();
  const { getCoursePath, getQuizPath, getExercicePath } = useNavigation();

  const [pathItems, setPathItems] = useState<PathItem[]>([]);
  const [completedMilestoneIds, setCompletedMilestoneIds] = useState<Set<string>>(new Set());
  const [courseProgress, setCourseProgress] = useState<Map<number, CourseProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [practiceMilestone, setPracticeMilestone] = useState<PathItem | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const pendingScrollY = useRef<number | null>(null);

  const loadPath = useCallback(async () => {
    if (!programId) return;
    setLoading(true);

    try {
      const fetchedUnits = await getLearningPathUnits(programId);
      const items = interleaveByCategory(fetchedUnits);
      const courseIds = items
        .filter((item) => item.type === 'lesson' && item.ref_course_id != null)
        .map((item) => item.ref_course_id as number);

      const [completedStepIds, progressMap] = await Promise.all([
        user?.id ? getCompletedStepIds(user.id) : Promise.resolve(new Set<string>()),
        user?.id ? getCourseProgressMap(user.id, courseIds) : Promise.resolve(new Map<number, CourseProgress>()),
      ]);

      let completedMilestones = new Set<string>();
      if (completedStepIds.size > 0) {
        const { data, error } = await supabase
          .from('lp_steps')
          .select('milestone_id')
          .in('id', Array.from(completedStepIds));
        if (error) throw error;
        completedMilestones = new Set((data ?? []).map((r) => r.milestone_id));
      }

      const currentIndex = items.findIndex((item) => !isItemDone(item, progressMap, completedMilestones));
      const targetY = computeScrollTargetY(items, currentIndex);
      // Laisse de la marge au-dessus de l'étape active plutôt que de la
      // coller tout en haut de l'écran.
      pendingScrollY.current = currentIndex === -1 ? null : Math.max(0, targetY - 220);

      setPathItems(items);
      setCompletedMilestoneIds(completedMilestones);
      setCourseProgress(progressMap);
    } catch (error) {
      logger.error('Error loading learning path:', error);
    } finally {
      setLoading(false);
    }
  }, [programId, user?.id]);

  // Recharge à chaque retour sur l'écran (pas juste au montage) : la
  // progression de lecture d'un cours change pendant qu'on en est sorti.
  useFocusEffect(
    useCallback(() => {
      loadPath();
    }, [loadPath])
  );

  const fractions = useMemo(() => {
    const map: Record<string, number> = {};
    pathItems.forEach((item) => {
      map[item.id] = getProgressFraction(item, courseProgress, completedMilestoneIds);
    });
    return map;
  }, [pathItems, courseProgress, completedMilestoneIds]);

  // Un seul chemin séquentiel : puisque les matières sont déjà entrelacées
  // (interleaveByCategory), avancer dans l'ordre touche naturellement
  // toutes les matières au lieu d'en finir une avant de voir les autres.
  const statuses = useMemo(() => {
    const map: Record<string, MilestoneStatus> = {};
    const currentIndex = pathItems.findIndex((item) => !isItemDone(item, courseProgress, completedMilestoneIds));
    pathItems.forEach((item, i) => {
      if (isItemDone(item, courseProgress, completedMilestoneIds)) map[item.id] = 'done';
      else if (i === currentIndex) map[item.id] = 'current';
      else map[item.id] = 'locked';
    });
    return map;
  }, [pathItems, courseProgress, completedMilestoneIds]);

  const handleMilestonePress = useCallback(
    async (item: PathItem, status: MilestoneStatus) => {
      if (status === 'locked') return;

      if (item.type === 'practice') {
        setPracticeMilestone(item);
        return;
      }

      if (item.type === 'lesson' && item.ref_course_id) {
        router.push(getCoursePath(String(item.ref_course_id)) as Href);
      }
    },
    [router, getCoursePath]
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

      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, isDark && styles.backButtonDark]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={isDark ? '#F9FAFB' : '#111827'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>Parcours</Text>
        <View style={{ width: 38 }} />
      </View>

      {pathItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="map-marker-path" size={48} color="#CBD5E1" />
          <Text style={[styles.emptyText, isDark && styles.textDark]}>Parcours pas encore disponible.</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          onContentSizeChange={() => {
            if (pendingScrollY.current != null) {
              scrollViewRef.current?.scrollTo({ y: pendingScrollY.current, animated: false });
              pendingScrollY.current = null;
            }
          }}
        >
          <PathTrail
            items={pathItems}
            statuses={statuses}
            fractions={fractions}
            isDark={isDark}
            onMilestonePress={handleMilestonePress}
          />
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
    paddingTop: 12,
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
  textDark: { color: '#F8FAFC' },
  subTextDark: { color: '#94A3B8' },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  content: { paddingBottom: 60, paddingTop: 20 },
  nodeWrap: { position: 'absolute', alignItems: 'center' },
  node: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeProgressTrack: {
    position: 'absolute',
    bottom: 5,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    overflow: 'hidden',
  },
  nodeProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  nodeLabel: {
    position: 'absolute',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  nodeLabelDark: { color: '#CBD5E1' },
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
