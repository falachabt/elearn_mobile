import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { theme } from "@/constants/theme";

/* -------------------------------------------------------------------------- */
/*  Prototype "parcours" : matière -> graphe interconnecté (mock data)         */
/* -------------------------------------------------------------------------- */

type NodeKind = "start" | "lesson" | "quiz" | "exercise" | "activity" | "checkpoint";
type NodeState = "done" | "current" | "locked";

interface PathNode {
  id: string;
  kind: NodeKind;
  label: string;
  col: number; // 0..2
  row: number; // vertical position
  state: NodeState;
}
interface PathEdge {
  from: string;
  to: string;
}
interface Matiere {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  nodes: PathNode[];
  edges: PathEdge[];
}

const MATIERES: Matiere[] = [
  {
    id: "math",
    name: "Mathématiques",
    icon: "calculator-variant",
    color: "#2563EB",
    nodes: [
      { id: "s1", kind: "start", label: "Début", col: 1, row: 0, state: "done" },
      { id: "l1", kind: "lesson", label: "Nombres", col: 0, row: 1, state: "done" },
      { id: "l2", kind: "lesson", label: "Calcul", col: 1, row: 1, state: "done" },
      { id: "l3", kind: "lesson", label: "Géométrie", col: 2, row: 1, state: "done" },
      { id: "q1", kind: "quiz", label: "Quiz 1", col: 0, row: 2, state: "done" },
      { id: "l4", kind: "activity", label: "Activité", col: 1, row: 2, state: "current" },
      { id: "q2", kind: "quiz", label: "Quiz 2", col: 2, row: 2, state: "locked" },
      { id: "q3", kind: "quiz", label: "Quiz 3", col: 0, row: 3, state: "locked" },
      { id: "e1", kind: "exercise", label: "Exercice", col: 2, row: 3, state: "locked" },
      { id: "c1", kind: "checkpoint", label: "Bilan", col: 1, row: 4, state: "locked" },
    ],
    edges: [
      { from: "s1", to: "l1" },
      { from: "s1", to: "l2" },
      { from: "s1", to: "l3" },
      { from: "l1", to: "q1" },
      { from: "q1", to: "q3" },
      { from: "l2", to: "l4" },
      { from: "l3", to: "q2" },
      { from: "q2", to: "e1" },
      { from: "q3", to: "c1" },
      { from: "l4", to: "c1" },
      { from: "e1", to: "c1" },
    ],
  },
  {
    id: "pc",
    name: "Physique-Chimie",
    icon: "flask-outline",
    color: "#7C3AED",
    nodes: [
      { id: "s1", kind: "start", label: "Début", col: 1, row: 0, state: "done" },
      { id: "l1", kind: "lesson", label: "Mécanique", col: 0, row: 1, state: "current" },
      { id: "l2", kind: "lesson", label: "Optique", col: 2, row: 1, state: "locked" },
      { id: "q1", kind: "quiz", label: "Quiz", col: 0, row: 2, state: "locked" },
      { id: "e1", kind: "exercise", label: "Exercice", col: 2, row: 2, state: "locked" },
      { id: "c1", kind: "checkpoint", label: "Bilan", col: 1, row: 3, state: "locked" },
    ],
    edges: [
      { from: "s1", to: "l1" },
      { from: "s1", to: "l2" },
      { from: "l1", to: "q1" },
      { from: "l2", to: "e1" },
      { from: "q1", to: "c1" },
      { from: "e1", to: "c1" },
    ],
  },
];

// --- geometry ---------------------------------------------------------------
const COL_W = 110;
const ROW_H = 124;
const PAD = 28;
const NODE = 62;

const centerX = (col: number) => PAD + col * COL_W + COL_W / 2;
const centerY = (row: number) => PAD + row * ROW_H + ROW_H / 2;

const KIND_META: Record<
  NodeKind,
  {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    tint: string;
    grad: [string, string]; // bright -> deep
  }
> = {
  start: { icon: "flag-variant", tint: "#10B981", grad: ["#34D399", "#059669"] },
  lesson: { icon: "book-open-variant", tint: "#3B82F6", grad: ["#60A5FA", "#2563EB"] },
  quiz: { icon: "lightning-bolt", tint: "#06B6D4", grad: ["#22D3EE", "#0891B2"] },
  exercise: { icon: "pencil", tint: "#A855F7", grad: ["#C084FC", "#9333EA"] },
  activity: { icon: "gesture-tap", tint: "#EC4899", grad: ["#F472B6", "#DB2777"] },
  checkpoint: { icon: "trophy", tint: "#F59E0B", grad: ["#FBBF24", "#F59E0B"] },
};

// --- node -------------------------------------------------------------------
const NodeBubble: React.FC<{ node: PathNode; isDark: boolean; onPress: () => void }> = ({
  node,
  isDark,
  onPress,
}) => {
  const meta = KIND_META[node.kind];
  const pulse = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (node.state !== "current") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [node.state, pulse]);

  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.75] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] });

  const done = node.state === "done";
  const current = node.state === "current";
  const locked = node.state === "locked";

  const isCircle = node.kind === "start" || node.kind === "checkpoint";
  const isDiamond = node.kind === "quiz";
  const isParallelogram = node.kind === "exercise";

  const shapeTransform = [
    isDiamond ? { rotate: "45deg" } : null,
    isParallelogram ? { skewX: "-15deg" } : null,
  ].filter(Boolean) as { rotate?: string; skewX?: string }[];

  const radius = isCircle ? NODE / 2 : isParallelogram ? 12 : isDiamond ? 12 : 18;

  const gradColors: [string, string] = done
    ? meta.grad
    : current
    ? isDark
      ? ["#1F2A44", "#172033"]
      : ["#FFFFFF", "#F4F7FF"]
    : isDark
    ? ["#243042", "#1A2433"]
    : ["#EEF2F7", "#E2E8F0"];

  const borderColor = done ? "rgba(255,255,255,0.35)" : current ? meta.tint : isDark ? "#33415580" : "#CBD5E1";
  const iconColor = done ? "#FFFFFF" : locked ? (isDark ? "#64748B" : "#94A3B8") : meta.tint;

  const shadow = (done || current)
    ? {
        shadowColor: meta.tint,
        shadowOpacity: current ? 0.55 : 0.45,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }
    : {
        shadowColor: "#000",
        shadowOpacity: isDark ? 0.3 : 0.12,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      };

  const onIn = () => Animated.spring(press, { toValue: 0.9, useNativeDriver: true, speed: 40 }).start();
  const onOut = () => Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 24 }).start();

  return (
    <View style={[styles.nodeWrap, { left: centerX(node.col) - NODE / 2, top: centerY(node.row) - NODE / 2 }]}>
      {/* halo (current only) */}
      {current && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            { backgroundColor: meta.tint, opacity: haloOpacity, transform: [{ scale: haloScale }] },
          ]}
        />
      )}

      <Animated.View style={{ transform: [{ scale: current ? press : press }] }}>
        <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} hitSlop={8}>
          <View style={[styles.shapeShadow, { borderRadius: radius, transform: shapeTransform }, shadow]}>
            <LinearGradient
              colors={gradColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[
                styles.shape,
                { borderRadius: radius, borderColor, borderWidth: done ? 1.5 : 2 },
              ]}
            >
              <View style={shapeTransform.length ? { transform: shapeTransform.map((t) => (t.rotate ? { rotate: "-45deg" } : { skewX: "15deg" })) } : undefined}>
                {locked ? (
                  <MaterialCommunityIcons name="lock" size={20} color={iconColor} />
                ) : done ? (
                  <MaterialCommunityIcons name="check-bold" size={22} color={iconColor} />
                ) : (
                  <MaterialCommunityIcons name={meta.icon} size={22} color={iconColor} />
                )}
              </View>
            </LinearGradient>
          </View>
        </Pressable>
      </Animated.View>

      <View style={[styles.labelPill, isDark && styles.labelPillDark, current && { borderColor: meta.tint }]}>
        <Text numberOfLines={1} style={[styles.nodeLabel, isDark && styles.nodeLabelDark, current && { color: meta.tint }]}>
          {node.label}
        </Text>
      </View>
    </View>
  );
};

// --- graph ------------------------------------------------------------------
const edgePath = (x1: number, y1: number, x2: number, y2: number) => {
  const cy = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
};

const PathGraph: React.FC<{ matiere: Matiere; isDark: boolean; onNodePress: (n: PathNode) => void }> = ({
  matiere,
  isDark,
  onNodePress,
}) => {
  const byId = useMemo(() => {
    const m = new Map<string, PathNode>();
    matiere.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [matiere]);

  const maxRow = Math.max(...matiere.nodes.map((n) => n.row));
  const graphW = PAD * 2 + 3 * COL_W;
  const graphH = PAD * 2 + (maxRow + 1) * ROW_H;

  return (
    <View style={{ width: graphW, height: graphH, alignSelf: "center" }}>
      <Svg width={graphW} height={graphH} style={StyleSheet.absoluteFill}>
        <Defs>
          {matiere.edges.map((e, i) => {
            const a = byId.get(e.from)!;
            const b = byId.get(e.to)!;
            return (
              <SvgGradient
                key={`def${i}`}
                id={`edge${i}`}
                x1={centerX(a.col)}
                y1={centerY(a.row)}
                x2={centerX(b.col)}
                y2={centerY(b.row)}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={KIND_META[a.kind].tint} />
                <Stop offset="1" stopColor={KIND_META[b.kind].tint} />
              </SvgGradient>
            );
          })}
        </Defs>

        {/* glow layer (unlocked only) */}
        {matiere.edges.map((e, i) => {
          const a = byId.get(e.from)!;
          const b = byId.get(e.to)!;
          if (b.state === "locked") return null;
          return (
            <Path
              key={`glow${i}`}
              d={edgePath(centerX(a.col), centerY(a.row), centerX(b.col), centerY(b.row))}
              stroke={`url(#edge${i})`}
              strokeWidth={9}
              strokeOpacity={0.22}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}

        {/* main edges */}
        {matiere.edges.map((e, i) => {
          const a = byId.get(e.from)!;
          const b = byId.get(e.to)!;
          const locked = b.state === "locked";
          return (
            <Path
              key={`edge${i}`}
              d={edgePath(centerX(a.col), centerY(a.row), centerX(b.col), centerY(b.row))}
              stroke={locked ? (isDark ? "#2B3648" : "#D9E0EA") : `url(#edge${i})`}
              strokeWidth={locked ? 2.5 : 4}
              strokeLinecap="round"
              strokeDasharray={locked ? "2 9" : undefined}
              fill="none"
            />
          );
        })}
      </Svg>

      {matiere.nodes.map((n) => (
        <NodeBubble key={n.id} node={n} isDark={isDark} onPress={() => onNodePress(n)} />
      ))}
    </View>
  );
};

const LEGEND: { kind: NodeKind; label: string }[] = [
  { kind: "start", label: "Début" },
  { kind: "lesson", label: "Leçon" },
  { kind: "quiz", label: "Quiz" },
  { kind: "exercise", label: "Exercice" },
];

const ParcoursProto = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const [selected, setSelected] = useState(MATIERES[0].id);
  const matiere = MATIERES.find((m) => m.id === selected) ?? MATIERES[0];

  const bg: [string, string] = isDark ? ["#0B1220", "#0F172A"] : ["#FFFFFF", "#EEF2F8"];

  return (
    <LinearGradient colors={bg} style={styles.container}>
      {/* header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, isDark && styles.backBtnDark]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={isDark ? "#F9FAFB" : "#111827"} />
        </Pressable>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>Parcours · prototype</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* matières */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matiereRow}>
        {MATIERES.map((m) => {
          const active = m.id === selected;
          return (
            <Pressable
              key={m.id}
              onPress={() => setSelected(m.id)}
              style={[
                styles.matiereChip,
                isDark && styles.matiereChipDark,
                active && { borderColor: m.color, backgroundColor: m.color + (isDark ? "26" : "16") },
              ]}
            >
              <MaterialCommunityIcons name={m.icon} size={18} color={active ? m.color : isDark ? "#94A3B8" : "#6B7280"} />
              <Text
                style={[
                  styles.matiereText,
                  isDark && styles.matiereTextDark,
                  active && { color: m.color, fontWeight: "800" },
                ]}
              >
                {m.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.graphScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.unitHeader}>
          <View style={[styles.unitBadge, { backgroundColor: matiere.color + (isDark ? "26" : "16") }]}>
            <MaterialCommunityIcons name={matiere.icon} size={16} color={matiere.color} />
            <Text style={[styles.unitBadgeText, { color: matiere.color }]}>Unité 1</Text>
          </View>
          <Text style={[styles.unitTitle, isDark && styles.unitTitleDark]}>{matiere.name}</Text>
          <Text style={[styles.unitSub, isDark && styles.unitSubDark]}>Suis le chemin, débloque étape par étape</Text>
        </View>

        <PathGraph
          matiere={matiere}
          isDark={isDark}
          onNodePress={(n) => {
            if (n.state === "locked") return;
            if (n.kind === "activity" || n.kind === "quiz") {
              router.push("/(app)/activity-proto");
            }
          }}
        />

        {/* legend */}
        <View style={[styles.legend, isDark && styles.legendDark]}>
          {LEGEND.map((l) => (
            <View key={l.kind} style={styles.legendItem}>
              <LinearGradient
                colors={KIND_META[l.kind].grad}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  styles.legendShape,
                  l.kind === "start" && { borderRadius: 13 },
                  l.kind === "lesson" && { borderRadius: 7 },
                  l.kind === "quiz" && { borderRadius: 5, transform: [{ rotate: "45deg" }] },
                  l.kind === "exercise" && { borderRadius: 4, transform: [{ skewX: "-15deg" }] },
                ]}
              />
              <Text style={[styles.legendLabel, isDark && styles.legendLabelDark]}>{l.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 44,
    paddingBottom: 12,
  },
  headerDark: {},
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.05)" },
  backBtnDark: { backgroundColor: "rgba(255,255,255,0.08)" },
  headerTitle: { fontFamily: theme.typography.fontFamily, fontSize: 16, fontWeight: "700", color: "#0F172A" },
  headerTitleDark: { color: "#F9FAFB" },

  matiereRow: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16, gap: 10 },
  matiereChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  matiereChipDark: { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "#1E293B" },
  matiereText: { fontFamily: theme.typography.fontFamily, fontSize: 14, fontWeight: "600", color: "#334155" },
  matiereTextDark: { color: "#CBD5E1" },

  graphScroll: { paddingBottom: 60 },
  unitHeader: { paddingHorizontal: 22, marginBottom: 6 },
  unitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },
  unitBadgeText: { fontFamily: theme.typography.fontFamily, fontSize: 12, fontWeight: "800" },
  unitTitle: { fontFamily: theme.typography.fontFamily, fontSize: 22, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  unitTitleDark: { color: "#F8FAFC" },
  unitSub: { fontFamily: theme.typography.fontFamily, fontSize: 13, color: "#64748B", marginTop: 3 },
  unitSubDark: { color: "#94A3B8" },

  // node
  nodeWrap: { position: "absolute", width: NODE, alignItems: "center" },
  halo: { position: "absolute", top: 0, width: NODE, height: NODE, borderRadius: NODE / 2 },
  shapeShadow: { width: NODE, height: NODE },
  shape: { width: NODE, height: NODE, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  labelPill: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: "transparent",
    maxWidth: NODE + 32,
  },
  labelPillDark: { backgroundColor: "rgba(15,23,42,0.55)" },
  nodeLabel: { fontFamily: theme.typography.fontFamily, fontSize: 11, fontWeight: "700", color: "#475569", textAlign: "center" },
  nodeLabelDark: { color: "#CBD5E1" },

  // legend
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 22,
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  legendDark: { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "#1E293B" },
  legendItem: { alignItems: "center", gap: 9 },
  legendShape: { width: 26, height: 26 },
  legendLabel: { fontFamily: theme.typography.fontFamily, fontSize: 12, color: "#64748B", fontWeight: "600" },
  legendLabelDark: { color: "#94A3B8" },
});

export default ParcoursProto;
