import type { Json } from "@/types/supabase";
import type { SecondaryProgram } from "@/types/secondary.type";

export interface SecondaryPreferenceData {
  hasAnsweredTerminaleStep: boolean;
  preferredTrack: string | null;
  preferredClassName: string | null;
  preferredSeriesName: string | null;
  selectedTracks: string[];
  reminderEnabled: boolean;
  reminderTime: string | null;
}

const DEFAULT_PREFERENCES: SecondaryPreferenceData = {
  hasAnsweredTerminaleStep: false,
  preferredTrack: null,
  preferredClassName: null,
  preferredSeriesName: null,
  selectedTracks: [],
  reminderEnabled: false,
  reminderTime: null,
};

export const TERMINALE_TRACK_OPTIONS = [
  { label: "Pas maintenant / Je ne suis pas en terminale", value: null },
  { label: "Terminale A", value: "Terminale A" },
  { label: "Terminale C", value: "Terminale C" },
  { label: "Terminale D", value: "Terminale D" },
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toTrackKey = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/serie/g, "")
    .replace(/[^a-z0-9]/g, "");

const normalizeTrack = (track: string | null | undefined) => {
  if (!track) {
    return {
      preferredTrack: null,
      preferredClassName: null,
      preferredSeriesName: null,
    };
  }

  const normalizedTrack = track.trim();
  if (!normalizedTrack) {
    return {
      preferredTrack: null,
      preferredClassName: null,
      preferredSeriesName: null,
    };
  }

  const [preferredClassName, preferredSeriesName] = normalizedTrack.split(/\s+/);

  return {
    preferredTrack: normalizedTrack,
    preferredClassName: preferredClassName || null,
    preferredSeriesName: preferredSeriesName || null,
  };
};

const normalizeTrackList = (tracks: unknown): string[] => {
  if (!Array.isArray(tracks)) return [];

  const uniqueTracks = new Map<string, string>();
  for (const track of tracks) {
    if (typeof track !== "string" || !track.trim()) continue;
    const normalizedTrack = track.trim();
    uniqueTracks.set(toTrackKey(normalizedTrack), normalizedTrack);
  }

  return Array.from(uniqueTracks.values());
};

export const parseSecondaryPreferences = (
  metadata: unknown
): SecondaryPreferenceData => {
  if (!isRecord(metadata) || !isRecord(metadata.secondaryPreferences)) {
    return DEFAULT_PREFERENCES;
  }

  const preferenceNode = metadata.secondaryPreferences;
  const reminderEnabled =
    typeof preferenceNode.reminderEnabled === "boolean"
      ? preferenceNode.reminderEnabled
      : false;
  const reminderTime =
    typeof preferenceNode.reminderTime === "string"
      ? preferenceNode.reminderTime
      : null;
  const trackValue =
    typeof preferenceNode.preferredTrack === "string"
      ? preferenceNode.preferredTrack
      : null;
  const hasAnsweredTerminaleStep =
    typeof preferenceNode.hasAnsweredTerminaleStep === "boolean"
      ? preferenceNode.hasAnsweredTerminaleStep
      : Boolean(trackValue);
  const selectedTracks = normalizeTrackList(preferenceNode.selectedTracks);

  return {
    hasAnsweredTerminaleStep,
    ...normalizeTrack(trackValue),
    selectedTracks,
    reminderEnabled,
    reminderTime,
  };
};

export const mergeSecondaryPreferences = (
  metadata: unknown,
  updates: Partial<SecondaryPreferenceData>
) => {
  const currentMetadata = isRecord(metadata)
    ? (metadata as Record<string, Json | undefined>)
    : {};
  const currentPreferences = parseSecondaryPreferences(metadata);
  const nextPreferences = {
    ...currentPreferences,
    ...updates,
  };
  const normalizedTrack = normalizeTrack(nextPreferences.preferredTrack);
  const selectedTracks = normalizeTrackList(nextPreferences.selectedTracks);

  return {
    ...currentMetadata,
    secondaryPreferences: {
      ...normalizedTrack,
      hasAnsweredTerminaleStep: nextPreferences.hasAnsweredTerminaleStep,
      selectedTracks: selectedTracks.filter(
        (track) => toTrackKey(track) !== toTrackKey(normalizedTrack.preferredTrack)
      ),
      reminderEnabled: nextPreferences.reminderEnabled,
      reminderTime: nextPreferences.reminderTime,
    },
  };
};

export const formatReminderTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;

export const reminderTimeToDate = (value?: string | null) => {
  const date = new Date();
  const [hours, minutes] = (value ?? "20:00").split(":").map(Number);
  date.setHours(Number.isFinite(hours) ? hours : 20, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date;
};

export const getSecondaryProgramLabel = (program: SecondaryProgram) =>
  `${program.class?.name ?? "Classe"} ${program.serie?.name ?? ""}`.trim();

export const isSameTrack = (left: string | null | undefined, right: string | null | undefined) =>
  Boolean(left) && Boolean(right) && toTrackKey(left) === toTrackKey(right);

export const matchesPreferredSecondaryProgram = (
  program: SecondaryProgram,
  preferences: SecondaryPreferenceData
) => {
  if (!preferences.preferredTrack) {
    return false;
  }

  const preferredTrackKey = toTrackKey(preferences.preferredTrack);
  const programTrackKey = toTrackKey(
    `${program.class?.name ?? ""} ${program.serie?.name ?? ""}`
  );

  return programTrackKey === preferredTrackKey;
};

const hashSeed = (seed: string) =>
  Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);

export const pickDailyItem = <T>(items: T[], seedKey: string) => {
  if (!items.length) return null;

  const utcDateKey = new Date().toISOString().slice(0, 10);
  const index = hashSeed(`${seedKey}:${utcDateKey}`) % items.length;
  return items[index] ?? null;
};
