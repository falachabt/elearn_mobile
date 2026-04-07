import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  SchedulableTriggerInputTypes,
} from "expo-notifications";
import { Platform } from "react-native";

import { SecondaryDailyContent } from "@/types/secondary.type";

const SECONDARY_DAILY_REMINDER_KEY = "@secondary_daily_reminder_notification_id";

type PendingReminderTarget =
  | {
      type: "course";
      programId: string;
      courseId: number;
      dailyContentItemId: string;
    }
  | {
      type: "quiz";
      programId: string;
      quizId: string;
      dailyContentItemId: string;
    }
  | {
      type: "exercise";
      programId: string;
      exerciseId: string;
      dailyContentItemId: string;
    };

const getTriggerDate = (reminderTime: string) => {
  const [hoursPart, minutesPart] = reminderTime.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const triggerDate = new Date();
  triggerDate.setHours(hours, minutes, 0, 0);

  if (triggerDate.getTime() <= Date.now()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  return triggerDate;
};

const getFirstPendingTarget = (
  dailyContents: SecondaryDailyContent[]
): PendingReminderTarget | null => {
  for (const dailyContent of dailyContents) {
    const pendingQuiz = dailyContent.quizzes.find((item) => !item.isCompleted);
    if (pendingQuiz) {
      return {
        type: "quiz",
        programId: dailyContent.programId,
        quizId: pendingQuiz.quizId,
        dailyContentItemId: pendingQuiz.dailyContentItemId,
      };
    }

    const pendingExercise = dailyContent.exercises.find(
      (item) => !item.isCompleted
    );
    if (pendingExercise) {
      return {
        type: "exercise",
        programId: dailyContent.programId,
        exerciseId: pendingExercise.exerciseId,
        dailyContentItemId: pendingExercise.dailyContentItemId,
      };
    }

    const pendingCourse = dailyContent.courses.find((item) => !item.isCompleted);
    if (pendingCourse) {
      return {
        type: "course",
        programId: dailyContent.programId,
        courseId: pendingCourse.courseId,
        dailyContentItemId: pendingCourse.dailyContentItemId,
      };
    }
  }

  return null;
};

const cancelStoredSecondaryDailyReminder = async () => {
  const notificationId = await AsyncStorage.getItem(SECONDARY_DAILY_REMINDER_KEY);
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId).catch(
      () => undefined
    );
    await AsyncStorage.removeItem(SECONDARY_DAILY_REMINDER_KEY);
  }
};

export async function syncSecondaryDailyReminder(options: {
  dailyContents: SecondaryDailyContent[];
  reminderEnabled: boolean;
  reminderTime?: string | null;
}) {
  if (Platform.OS === "web") return;

  await cancelStoredSecondaryDailyReminder();

  if (!options.reminderEnabled || !options.reminderTime) {
    return;
  }

  const pendingCount = options.dailyContents.reduce(
    (total, dailyContent) => total + (dailyContent.pendingCount ?? 0),
    0
  );

  if (pendingCount <= 0) {
    return;
  }

  const triggerDate = getTriggerDate(options.reminderTime);
  const target = getFirstPendingTarget(options.dailyContents);

  if (!triggerDate || !target) {
    return;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Contenu du jour à faire",
      body:
        pendingCount === 1
          ? "Votre quiz, exercice ou cours du jour vous attend."
          : `${pendingCount} contenus du jour restent à terminer.`,
      data:
        target.type === "quiz"
          ? {
              type: "quiz",
              programId: target.programId,
              quizId: target.quizId,
              dailyContentItemId: target.dailyContentItemId,
            }
          : target.type === "exercise"
            ? {
                type: "exercise",
                programId: target.programId,
                exerciseId: target.exerciseId,
                dailyContentItemId: target.dailyContentItemId,
              }
            : {
                type: "course",
                programId: target.programId,
                courseId: String(target.courseId),
                dailyContentItemId: target.dailyContentItemId,
              },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  await AsyncStorage.setItem(SECONDARY_DAILY_REMINDER_KEY, notificationId);
}

export async function clearSecondaryDailyReminder() {
  if (Platform.OS === "web") return;
  await cancelStoredSecondaryDailyReminder();
}
