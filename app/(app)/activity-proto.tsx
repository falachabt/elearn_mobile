import React, { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { theme } from "@/constants/theme";
import { HapticType, useHaptics } from "@/hooks/useHaptics";

/* -------------------------------------------------------------------------- */
/*  Prototype "activité interactive" (Duolingo-like) : 4 types de blocs        */
/*    choice | cloze (texte à trous) | dragfill (glisser la formule) | match   */
/* -------------------------------------------------------------------------- */

type Block =
  | { kind: "choice"; prompt: string; options: string[]; correct: number }
  | { kind: "cloze"; prompt: string; before: string; after: string; bank: string[]; answer: string }
  | {
      kind: "dragfill";
      prompt: string;
      template: (string | { slot: number })[];
      slots: string[]; // expected token per slot index
      bank: string[];
    }
  | { kind: "match"; prompt: string; pairs: [string, string][] };

const BLOCKS: Block[] = [
  {
    kind: "choice",
    prompt: "Quel est le théorème reliant les côtés d'un triangle rectangle ?",
    options: ["Théorème de Thalès", "Théorème de Pythagore", "Loi des sinus"],
    correct: 1,
  },
  {
    kind: "cloze",
    prompt: "Complète le théorème de Pythagore",
    before: "Dans un triangle rectangle :  a² + b² = ",
    after: "",
    bank: ["c²", "2c", "c", "ab"],
    answer: "c²",
  },
  {
    kind: "dragfill",
    prompt: "Complète l'identité remarquable",
    template: ["(a + b)² = a² + ", { slot: 0 }, " + ", { slot: 1 }],
    slots: ["2ab", "b²"],
    bank: ["2ab", "b²", "a²", "ab"],
  },
  {
    kind: "match",
    prompt: "Associe chaque fonction à sa dérivée",
    pairs: [
      ["x²", "2x"],
      ["sin x", "cos x"],
      ["eˣ", "eˣ"],
    ],
  },
];

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ----------------------------- choice block ------------------------------- */
const ChoiceBlock: React.FC<{
  block: Extract<Block, { kind: "choice" }>;
  checked: boolean;
  value: number | null;
  onChange: (v: number) => void;
  isDark: boolean;
}> = ({ block, checked, value, onChange, isDark }) => (
  <View style={{ gap: 12 }}>
    {block.options.map((opt, i) => {
      const selected = value === i;
      const right = checked && i === block.correct;
      const wrong = checked && selected && i !== block.correct;
      return (
        <Pressable
          key={i}
          disabled={checked}
          onPress={() => onChange(i)}
          style={[
            styles.optRow,
            isDark && styles.optRowDark,
            selected && !checked && styles.optSelected,
            right && styles.optRight,
            wrong && styles.optWrong,
          ]}
        >
          <Text style={[styles.optText, isDark && styles.optTextDark, (right || wrong) && { color: "#FFFFFF" }]}>
            {opt}
          </Text>
          {right && <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />}
          {wrong && <MaterialCommunityIcons name="close-circle" size={20} color="#FFFFFF" />}
        </Pressable>
      );
    })}
  </View>
);

/* ------------------------------ cloze block ------------------------------- */
const ClozeBlock: React.FC<{
  block: Extract<Block, { kind: "cloze" }>;
  checked: boolean;
  value: string | null;
  onChange: (v: string | null) => void;
  isDark: boolean;
}> = ({ block, checked, value, onChange, isDark }) => {
  const bank = useMemo(() => shuffle(block.bank), [block]);
  const correct = checked && value === block.answer;
  const wrong = checked && value !== block.answer;
  return (
    <View style={{ gap: 18 }}>
      <View style={[styles.sentence, isDark && styles.sentenceDark]}>
        <Text style={[styles.sentenceText, isDark && styles.sentenceTextDark]}>{block.before}</Text>
        <Pressable
          onPress={() => !checked && onChange(null)}
          style={[
            styles.blank,
            value && styles.blankFilled,
            correct && styles.blankRight,
            wrong && styles.blankWrong,
          ]}
        >
          <Text style={[styles.blankText, value ? { color: "#FFFFFF" } : { color: "#94A3B8" }]}>
            {value ?? "____"}
          </Text>
        </Pressable>
        <Text style={[styles.sentenceText, isDark && styles.sentenceTextDark]}>{block.after}</Text>
      </View>

      <View style={styles.bankRow}>
        {bank.map((w) => {
          const used = value === w;
          return (
            <Pressable
              key={w}
              disabled={checked || used}
              onPress={() => onChange(w)}
              style={[styles.chip, isDark && styles.chipDark, used && styles.chipUsed]}
            >
              <Text style={[styles.chipText, isDark && styles.chipTextDark, used && { color: "#CBD5E1" }]}>{w}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

/* ----------------------------- dragfill block ----------------------------- */
type Rect = { x: number; y: number; w: number; h: number };

// Offsets of the formula row / bank row relative to the block root, so token
// drop points and slot rects share one coordinate space. One dragfill on screen.
const formulaOffset = { current: { x: 0, y: 0 } };
const bankOffset = { current: { x: 0, y: 0 } };

const DraggableToken: React.FC<{
  label: string;
  onDrop: (label: string, cx: number, cy: number) => void;
  isDark: boolean;
  disabled: boolean;
}> = ({ label, onDrop, isDark, disabled }) => {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const z = useSharedValue(0);
  const base = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 });

  // Runs on JS thread: read the ref layout and report the drop center.
  const finish = (translationX: number, translationY: number) => {
    const cx = base.current.x + base.current.w / 2 + translationX;
    const cy = base.current.y + base.current.h / 2 + translationY;
    onDrop(label, cx, cy);
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
      z.value = 1;
    })
    .onEnd((e) => {
      runOnJS(finish)(e.translationX, e.translationY);
      tx.value = withSpring(0);
      ty.value = withSpring(0);
      z.value = 0;
    });

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: z.value ? 1.08 : 1 }],
    zIndex: z.value ? 50 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={(ev) => {
          const { x, y, width, height } = ev.nativeEvent.layout;
          base.current = { x, y, w: width, h: height };
        }}
        style={[styles.token, isDark && styles.tokenDark, disabled && styles.tokenDisabled, aStyle]}
      >
        <Text style={[styles.tokenText, isDark && styles.tokenTextDark]}>{label}</Text>
      </Animated.View>
    </GestureDetector>
  );
};

const DragFillBlock: React.FC<{
  block: Extract<Block, { kind: "dragfill" }>;
  checked: boolean;
  value: (string | null)[];
  onChange: (v: (string | null)[]) => void;
  isDark: boolean;
}> = ({ block, checked, value, onChange, isDark }) => {
  const slotRects = useRef<Record<number, Rect>>({});
  const placed = value;

  const handleDrop = (label: string, cx: number, cy: number) => {
    if (checked) return;
    let target: number | null = null;
    for (const k of Object.keys(slotRects.current)) {
      const idx = Number(k);
      const r = slotRects.current[idx];
      if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
        target = idx;
        break;
      }
    }
    if (target === null) return;
    const next = [...placed];
    // remove label from any other slot first
    const prevIdx = next.indexOf(label);
    if (prevIdx >= 0) next[prevIdx] = null;
    next[target] = label;
    onChange(next);
  };

  const usedLabels = new Set(placed.filter(Boolean) as string[]);

  return (
    <View style={{ gap: 22 }}>
      {/* formula with slots */}
      <View
        style={[styles.formula, isDark && styles.formulaDark]}
        onLayout={(ev) => {
          formulaOffset.current = { x: ev.nativeEvent.layout.x, y: ev.nativeEvent.layout.y };
        }}
      >
        {block.template.map((part, i) => {
          if (typeof part === "string") {
            return (
              <Text key={i} style={[styles.formulaText, isDark && styles.formulaTextDark]}>
                {part}
              </Text>
            );
          }
          const idx = part.slot;
          const filled = placed[idx];
          const right = checked && filled === block.slots[idx];
          const wrong = checked && filled !== block.slots[idx];
          return (
            <Pressable
              key={i}
              onPress={() => {
                if (checked || !filled) return;
                const next = [...placed];
                next[idx] = null;
                onChange(next);
              }}
              onLayout={(ev) => {
                const { x, y, width, height } = ev.nativeEvent.layout;
                // layout is relative to the formula row; add the formula row offset
                slotRects.current[idx] = {
                  x: x + formulaOffset.current.x,
                  y: y + formulaOffset.current.y,
                  w: width,
                  h: height,
                };
              }}
              style={[
                styles.slot,
                filled && styles.slotFilled,
                right && styles.slotRight,
                wrong && styles.slotWrong,
              ]}
            >
              <Text style={[styles.slotText, filled ? { color: "#FFFFFF" } : { color: "#94A3B8" }]}>
                {filled ?? "  ?  "}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* token bank */}
      <View
        style={styles.bankRow}
        onLayout={(ev) => {
          bankOffset.current = { x: ev.nativeEvent.layout.x, y: ev.nativeEvent.layout.y };
        }}
      >
        {block.bank.map((label) => (
          <DraggableToken
            key={label}
            label={label}
            isDark={isDark}
            disabled={checked || usedLabels.has(label)}
            onDrop={(lbl, cx, cy) =>
              handleDrop(lbl, cx + bankOffset.current.x, cy + bankOffset.current.y)
            }
          />
        ))}
      </View>
      <Text style={[styles.hint, isDark && styles.hintDark]}>Glisse les étiquettes dans les cases ·  touche une case remplie pour la vider</Text>
    </View>
  );
};

/* ------------------------------ match block ------------------------------- */
const MatchBlock: React.FC<{
  block: Extract<Block, { kind: "match" }>;
  checked: boolean;
  value: Record<number, number>; // leftIndex -> rightIndex
  onChange: (v: Record<number, number>) => void;
  isDark: boolean;
}> = ({ block, checked, value, onChange, isDark }) => {
  const rights = useMemo(() => shuffle(block.pairs.map((p, i) => ({ text: p[1], i }))), [block]);
  const [activeLeft, setActiveLeft] = useState<number | null>(null);

  const pickLeft = (li: number) => {
    if (checked) return;
    setActiveLeft(li === activeLeft ? null : li);
  };
  const pickRight = (ri: number) => {
    if (checked || activeLeft === null) return;
    const next = { ...value };
    // remove ri if used elsewhere
    for (const k of Object.keys(next)) if (next[Number(k)] === ri) delete next[Number(k)];
    next[activeLeft] = ri;
    onChange(next);
    setActiveLeft(null);
  };

  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      <View style={{ flex: 1, gap: 10 }}>
        {block.pairs.map((p, li) => {
          const connected = value[li] !== undefined;
          const right = checked && value[li] === li; // correct pairing means rightIndex === li
          const wrong = checked && connected && value[li] !== li;
          return (
            <Pressable
              key={li}
              onPress={() => pickLeft(li)}
              style={[
                styles.matchCell,
                isDark && styles.matchCellDark,
                activeLeft === li && styles.matchActive,
                connected && !checked && styles.matchConnected,
                right && styles.optRight,
                wrong && styles.optWrong,
              ]}
            >
              <Text style={[styles.matchText, isDark && styles.matchTextDark, (right || wrong) && { color: "#FFF" }]}>
                {p[0]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1, gap: 10 }}>
        {rights.map((r) => {
          const usedByLeft = Object.keys(value).find((k) => value[Number(k)] === r.i);
          return (
            <Pressable
              key={r.i}
              onPress={() => pickRight(r.i)}
              style={[
                styles.matchCell,
                isDark && styles.matchCellDark,
                usedByLeft !== undefined && !checked && styles.matchConnected,
              ]}
            >
              <Text style={[styles.matchText, isDark && styles.matchTextDark]}>{r.text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

/* ------------------------------ main screen ------------------------------- */
const ActivityProto = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { trigger } = useHaptics();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [xp, setXp] = useState(0);
  const [done, setDone] = useState(false);

  const block = BLOCKS[index];
  const value = answers[index];

  const setValue = (v: any) => setAnswers((prev) => ({ ...prev, [index]: v }));

  const canCheck = (() => {
    if (checked) return true;
    switch (block.kind) {
      case "choice":
        return value !== undefined && value !== null;
      case "cloze":
        return !!value;
      case "dragfill":
        return Array.isArray(value) && value.filter(Boolean).length === block.slots.length;
      case "match":
        return value && Object.keys(value).length === block.pairs.length;
    }
  })();

  const evaluate = (): boolean => {
    switch (block.kind) {
      case "choice":
        return value === block.correct;
      case "cloze":
        return value === block.answer;
      case "dragfill":
        return block.slots.every((s, i) => (value as (string | null)[])?.[i] === s);
      case "match":
        return block.pairs.every((_, li) => (value as Record<number, number>)?.[li] === li);
    }
  };

  const onCheck = () => {
    if (!checked) {
      const ok = evaluate();
      setChecked(true);
      setCorrect(ok);
      if (ok) setXp((x) => x + 10);
      trigger(ok ? HapticType.SUCCESS : HapticType.ERROR);
    } else {
      // continue
      if (index + 1 >= BLOCKS.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
        setChecked(false);
        setCorrect(false);
      }
    }
  };

  const progress = (index + (checked ? 1 : 0)) / BLOCKS.length;

  if (done) {
    return (
      <LinearGradient colors={isDark ? ["#0B1220", "#0F172A"] : ["#FFFFFF", "#ECFDF5"]} style={styles.container}>
        <View style={styles.finish}>
          <View style={styles.finishIcon}>
            <MaterialCommunityIcons name="trophy" size={56} color="#F59E0B" />
          </View>
          <Text style={[styles.finishTitle, isDark && { color: "#F8FAFC" }]}>Activité terminée !</Text>
          <View style={styles.finishStats}>
            <View style={[styles.statPill, { backgroundColor: "#FEF3C7" }]}>
              <MaterialCommunityIcons name="star-four-points" size={18} color="#D97706" />
              <Text style={[styles.statPillText, { color: "#B45309" }]}>+{xp} XP</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: "#DCFCE7" }]}>
              <MaterialCommunityIcons name="fire" size={18} color="#16A34A" />
              <Text style={[styles.statPillText, { color: "#15803D" }]}>Série 7</Text>
            </View>
          </View>
          <Pressable onPress={() => router.back()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Continuer</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={isDark ? ["#0B1220", "#0F172A"] : ["#FFFFFF", "#F4F7FB"]} style={styles.container}>
      {/* top bar: close + progress */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={26} color={isDark ? "#94A3B8" : "#64748B"} />
        </Pressable>
        <View style={[styles.progressTrack, isDark && styles.progressTrackDark]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.xpTag}>
          <MaterialCommunityIcons name="star-four-points" size={14} color="#F59E0B" />
          <Text style={styles.xpTagText}>{xp}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.kindTag, isDark && styles.kindTagDark]}>
          {block.kind === "choice" ? "QUIZ" : block.kind === "match" ? "ASSOCIER" : block.kind === "dragfill" ? "GLISSER-DÉPOSER" : "TEXTE À TROUS"}
        </Text>
        <Text style={[styles.prompt, isDark && styles.promptDark]}>{block.prompt}</Text>

        <View style={{ marginTop: 24 }}>
          {block.kind === "choice" && (
            <ChoiceBlock block={block} checked={checked} value={value ?? null} onChange={setValue} isDark={isDark} />
          )}
          {block.kind === "cloze" && (
            <ClozeBlock block={block} checked={checked} value={value ?? null} onChange={setValue} isDark={isDark} />
          )}
          {block.kind === "dragfill" && (
            <DragFillBlock
              block={block}
              checked={checked}
              value={Array.isArray(value) ? value : block.slots.map(() => null)}
              onChange={setValue}
              isDark={isDark}
            />
          )}
          {block.kind === "match" && (
            <MatchBlock block={block} checked={checked} value={value ?? {}} onChange={setValue} isDark={isDark} />
          )}
        </View>
      </ScrollView>

      {/* feedback banner */}
      {checked && (
        <View style={[styles.feedback, correct ? styles.feedbackOk : styles.feedbackKo]}>
          <MaterialCommunityIcons name={correct ? "check-circle" : "close-circle"} size={24} color="#FFFFFF" />
          <Text style={styles.feedbackText}>{correct ? "Correct ! +10 XP" : "Pas tout à fait…"}</Text>
        </View>
      )}

      {/* action button */}
      <View style={styles.footer}>
        <Pressable
          onPress={onCheck}
          disabled={!canCheck}
          style={[
            styles.primaryBtn,
            !canCheck && styles.primaryBtnDisabled,
            checked && (correct ? styles.btnOk : styles.btnKo),
          ]}
        >
          <Text style={styles.primaryBtnText}>{checked ? "Continuer" : "Vérifier"}</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12 },
  progressTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: "#E2E8F0", overflow: "hidden" },
  progressTrackDark: { backgroundColor: "#1E293B" },
  progressFill: { height: "100%", borderRadius: 6, backgroundColor: "#10B981" },
  xpTag: { flexDirection: "row", alignItems: "center", gap: 3 },
  xpTagText: { fontFamily: theme.typography.fontFamily, fontSize: 14, fontWeight: "800", color: "#F59E0B" },

  body: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30 },
  kindTag: { fontFamily: theme.typography.fontFamily, fontSize: 12, fontWeight: "800", letterSpacing: 1, color: "#3B82F6" },
  kindTagDark: { color: "#60A5FA" },
  prompt: { fontFamily: theme.typography.fontFamily, fontSize: 22, fontWeight: "800", color: "#0F172A", marginTop: 8, lineHeight: 30 },
  promptDark: { color: "#F1F5F9" },

  // choice
  optRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  optRowDark: { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "#1E293B" },
  optSelected: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  optRight: { borderColor: "#10B981", backgroundColor: "#10B981" },
  optWrong: { borderColor: "#EF4444", backgroundColor: "#EF4444" },
  optText: { fontFamily: theme.typography.fontFamily, fontSize: 16, fontWeight: "600", color: "#1E293B" },
  optTextDark: { color: "#E2E8F0" },

  // cloze
  sentence: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", padding: 18, borderRadius: 16, backgroundColor: "#F1F5F9" },
  sentenceDark: { backgroundColor: "rgba(255,255,255,0.05)" },
  sentenceText: { fontFamily: theme.typography.fontFamily, fontSize: 18, color: "#0F172A", lineHeight: 30 },
  sentenceTextDark: { color: "#E2E8F0" },
  blank: { minWidth: 64, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 2, borderStyle: "dashed", borderColor: "#94A3B8", alignItems: "center" },
  blankFilled: { borderStyle: "solid", borderColor: "#3B82F6", backgroundColor: "#3B82F6" },
  blankRight: { borderStyle: "solid", borderColor: "#10B981", backgroundColor: "#10B981" },
  blankWrong: { borderStyle: "solid", borderColor: "#EF4444", backgroundColor: "#EF4444" },
  blankText: { fontFamily: theme.typography.fontFamily, fontSize: 18, fontWeight: "700" },
  bankRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#CBD5E1" },
  chipDark: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "#334155" },
  chipUsed: { opacity: 0.4 },
  chipText: { fontFamily: theme.typography.fontFamily, fontSize: 16, fontWeight: "700", color: "#1E293B" },
  chipTextDark: { color: "#E2E8F0" },

  // dragfill
  formula: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", padding: 18, borderRadius: 16, backgroundColor: "#F1F5F9", rowGap: 8 },
  formulaDark: { backgroundColor: "rgba(255,255,255,0.05)" },
  formulaText: { fontFamily: theme.typography.fontFamily, fontSize: 20, color: "#0F172A", fontWeight: "600" },
  formulaTextDark: { color: "#E2E8F0" },
  slot: { minWidth: 56, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 2, borderStyle: "dashed", borderColor: "#94A3B8", alignItems: "center", marginHorizontal: 2 },
  slotFilled: { borderStyle: "solid", borderColor: "#3B82F6", backgroundColor: "#3B82F6" },
  slotRight: { borderStyle: "solid", borderColor: "#10B981", backgroundColor: "#10B981" },
  slotWrong: { borderStyle: "solid", borderColor: "#EF4444", backgroundColor: "#EF4444" },
  slotText: { fontFamily: theme.typography.fontFamily, fontSize: 18, fontWeight: "800" },
  token: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#3B82F6", shadowColor: "#3B82F6", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  tokenDark: { backgroundColor: "#172033", borderColor: "#3B82F6" },
  tokenDisabled: { opacity: 0.35 },
  tokenText: { fontFamily: theme.typography.fontFamily, fontSize: 17, fontWeight: "800", color: "#1D4ED8" },
  tokenTextDark: { color: "#93C5FD" },
  hint: { fontFamily: theme.typography.fontFamily, fontSize: 12, color: "#94A3B8" },
  hintDark: { color: "#64748B" },

  // match
  matchCell: { padding: 16, borderRadius: 14, borderWidth: 2, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", alignItems: "center" },
  matchCellDark: { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "#1E293B" },
  matchActive: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  matchConnected: { borderColor: "#A855F7", backgroundColor: "#FAF5FF" },
  matchText: { fontFamily: theme.typography.fontFamily, fontSize: 16, fontWeight: "700", color: "#1E293B" },
  matchTextDark: { color: "#E2E8F0" },

  // feedback + footer
  feedback: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22, paddingVertical: 14 },
  feedbackOk: { backgroundColor: "#10B981" },
  feedbackKo: { backgroundColor: "#EF4444" },
  feedbackText: { fontFamily: theme.typography.fontFamily, fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30 },
  primaryBtn: { backgroundColor: "#10B981", borderRadius: 16, paddingVertical: 16, alignItems: "center", shadowColor: "#10B981", shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  primaryBtnDisabled: { backgroundColor: "#CBD5E1", shadowOpacity: 0 },
  primaryBtnText: { fontFamily: theme.typography.fontFamily, fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
  btnOk: { backgroundColor: "#059669" },
  btnKo: { backgroundColor: "#DC2626" },

  // finish
  finish: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 18 },
  finishIcon: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  finishTitle: { fontFamily: theme.typography.fontFamily, fontSize: 26, fontWeight: "800", color: "#0F172A" },
  finishStats: { flexDirection: "row", gap: 12, marginVertical: 8 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  statPillText: { fontFamily: theme.typography.fontFamily, fontSize: 16, fontWeight: "800" },
});

export default ActivityProto;
