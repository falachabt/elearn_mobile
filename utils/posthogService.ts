import { posthog } from '@/lib/posthog';

/**
 * PostHog Observability Service
 * 
 * Centralized service for all PostHog tracking operations for ELearn Mobile.
 * Wraps posthog-react-native to provide a type-safe, ELearn-specific API.
 * 
 * All events follow the convention: `category_action` in snake_case.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface PostHogUserProperties {
  email?: string;
  user_type?: 'student' | 'admin';
  created_at?: string;
  total_courses_enrolled?: number;
  courses_completed?: number;
  total_spent?: number;
  total_points?: number;
  has_payment?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function isPostHogReady(): boolean {
  return !!process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
}

// ─── Service ─────────────────────────────────────────────────────────

export const posthogService = {
  /**
   * Identify a user and attach properties to their profile.
   * Call this on sign-in or when a session is restored.
   */
  identify(userId: string, properties?: PostHogUserProperties): void {
    if (!isPostHogReady()) return;
    posthog.identify(userId, properties);
  },

  /**
   * Reset the PostHog identity (clears distinct_id).
   * Call this on sign-out to unlink the session from the user.
   */
  reset(): void {
    if (!isPostHogReady()) return;
    posthog.reset();
  },

  /**
   * Capture a custom event with optional properties.
   */
  capture(eventName: string, properties?: Record<string, string | number | boolean>): void {
    if (!isPostHogReady()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posthog.capture(eventName, properties as any);
  },

  /**
   * Capture an exception (error tracking).
   */
  captureException(error: Error, context?: Record<string, string | number | boolean>): void {
    if (!isPostHogReady()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posthog.captureException(error, context as any);
  },

  /**
   * Set user properties without triggering an event.
   */
  setPersonProperties(properties: PostHogUserProperties): void {
    if (!isPostHogReady()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posthog.setPersonProperties(properties as any);
  },

  // ─── Auth Events ─────────────────────────────────────────────────

  trackLogin(method: 'password' | 'oauth' | 'biometric'): void {
    this.capture('auth_login', { method });
  },

  trackLoginFailed(error: string): void {
    this.capture('auth_login_failed', { error });
  },

  trackSignupStarted(method: 'email' | 'oauth'): void {
    this.capture('auth_signup_started', { method });
  },

  trackSignupCompleted(method: 'email' | 'oauth'): void {
    this.capture('auth_signup_completed', { method });
  },

  trackSignupFailed(error: string): void {
    this.capture('auth_signup_failed', { error });
  },

  trackOAuthStarted(provider: 'google' | 'apple', context: 'login' | 'register'): void {
    this.capture('auth_oauth_started', { provider, context });
  },

  trackLogout(): void {
    this.capture('auth_logout');
  },

  trackPasswordResetRequested(): void {
    this.capture('auth_password_reset_requested');
  },

  trackOnboardingCompleted(): void {
    this.capture('auth_onboarding_completed');
  },

  trackOnboardingSkipped(): void {
    this.capture('auth_onboarding_skipped');
  },

  // ─── Learning Events ──────────────────────────────────────────────

  trackCourseListViewed(coursesCount: number, filter?: string): void {
    this.capture('learning_course_list_viewed', { courses_count: coursesCount, filter: filter || 'all' });
  },

  trackCourseViewed(courseId: string, courseName: string, isPurchased: boolean): void {
    this.capture('learning_course_viewed', {
      course_id: courseId,
      course_name: courseName,
      is_purchased: isPurchased,
    });
  },

  trackCourseEnrolled(courseId: string, courseName: string, price: number): void {
    this.capture('learning_course_enrolled', {
      course_id: courseId,
      course_name: courseName,
      price,
    });
  },

  trackLessonStarted(lessonId: string, lessonName: string, courseId: string): void {
    this.capture('learning_lesson_started', {
      lesson_id: lessonId,
      lesson_name: lessonName,
      course_id: courseId,
    });
  },

  trackLessonCompleted(lessonId: string, lessonName: string, courseId: string, duration: number): void {
    this.capture('learning_lesson_completed', {
      lesson_id: lessonId,
      lesson_name: lessonName,
      course_id: courseId,
      duration_seconds: duration,
    });
  },

  trackVideoPlayed(videoId: string, lessonId: string): void {
    this.capture('learning_video_played', {
      video_id: videoId,
      lesson_id: lessonId,
    });
  },

  trackVideoPaused(videoId: string, currentTime: number): void {
    this.capture('learning_video_paused', {
      video_id: videoId,
      current_time: currentTime,
    });
  },

  trackVideoCompleted(videoId: string, duration: number): void {
    this.capture('learning_video_completed', {
      video_id: videoId,
      duration_seconds: duration,
    });
  },

  trackProgressUpdated(courseId: string, progressPercentage: number): void {
    this.capture('learning_progress_updated', {
      course_id: courseId,
      progress_percentage: progressPercentage,
    });
  },

  trackCourseCompleted(courseId: string, courseName: string, totalDuration: number): void {
    this.capture('learning_course_completed', {
      course_id: courseId,
      course_name: courseName,
      total_duration_seconds: totalDuration,
    });
  },

  // ─── Quiz Events ────────────────────────────────────────────────

  trackQuizStarted(quizId: string, quizName: string, questionsCount: number): void {
    this.capture('quiz_started', {
      quiz_id: quizId,
      quiz_name: quizName,
      questions_count: questionsCount,
    });
  },

  trackQuizQuestionAnswered(quizId: string, questionId: string, isCorrect: boolean, timeSpent: number): void {
    this.capture('quiz_question_answered', {
      quiz_id: quizId,
      question_id: questionId,
      is_correct: isCorrect,
      time_spent_seconds: timeSpent,
    });
  },

  trackQuizCompleted(quizId: string, score: number, totalQuestions: number, duration: number, passed: boolean): void {
    this.capture('quiz_completed', {
      quiz_id: quizId,
      score,
      total_questions: totalQuestions,
      duration_seconds: duration,
      passed,
    });
  },

  trackQuizAbandoned(quizId: string, questionsAnswered: number, totalQuestions: number): void {
    this.capture('quiz_abandoned', {
      quiz_id: quizId,
      questions_answered: questionsAnswered,
      total_questions: totalQuestions,
    });
  },

  trackQuizRetried(quizId: string, attemptNumber: number): void {
    this.capture('quiz_retried', {
      quiz_id: quizId,
      attempt_number: attemptNumber,
    });
  },

  // ─── Payment Events ────────────────────────────────────────────

  trackPaymentCheckoutViewed(itemType: 'course' | 'program' | 'competition', itemId: string, price: number): void {
    this.capture('payment_checkout_viewed', {
      item_type: itemType,
      item_id: itemId,
      price,
    });
  },

  trackPaymentMethodSelected(method: 'notchpay' | 'mobile_money' | 'card'): void {
    this.capture('payment_method_selected', { method });
  },

  trackPaymentStarted(itemType: string, itemId: string, amount: number, method: string): void {
    this.capture('payment_started', {
      item_type: itemType,
      item_id: itemId,
      amount,
      payment_method: method,
    });
  },

  trackPaymentCompleted(transactionId: string, itemType: string, itemId: string, amount: number, method: string): void {
    this.capture('payment_completed', {
      transaction_id: transactionId,
      item_type: itemType,
      item_id: itemId,
      amount,
      payment_method: method,
    });
  },

  trackPaymentFailed(error: string, itemType: string, amount: number): void {
    this.capture('payment_failed', {
      error,
      item_type: itemType,
      amount,
    });
  },

  trackPromoCodeApplied(promoCode: string, discountAmount: number): void {
    this.capture('payment_promo_code_applied', {
      promo_code: promoCode,
      discount_amount: discountAmount,
    });
  },

  trackCartItemAdded(itemType: string, itemId: string, itemName: string, price: number): void {
    this.capture('payment_cart_item_added', {
      item_type: itemType,
      item_id: itemId,
      item_name: itemName,
      price,
    });
  },

  trackCartItemRemoved(itemType: string, itemId: string): void {
    this.capture('payment_cart_item_removed', {
      item_type: itemType,
      item_id: itemId,
    });
  },

  trackInstallmentPlanSelected(planId: string, installmentsCount: number): void {
    this.capture('payment_installment_plan_selected', {
      plan_id: planId,
      installments_count: installmentsCount,
    });
  },

  // ─── Content Events ────────────────────────────────────────────

  trackPDFViewed(pdfId: string, pdfName: string, source: 'course' | 'archive' | 'competition'): void {
    this.capture('content_pdf_viewed', {
      pdf_id: pdfId,
      pdf_name: pdfName,
      source,
    });
  },

  trackPDFDownloaded(pdfId: string, pdfName: string): void {
    this.capture('content_pdf_downloaded', {
      pdf_id: pdfId,
      pdf_name: pdfName,
    });
  },

  trackArchiveViewed(archiveId: string, archiveName: string, programId: string): void {
    this.capture('content_archive_viewed', {
      archive_id: archiveId,
      archive_name: archiveName,
      program_id: programId,
    });
  },

  trackCorrectionViewed(correctionId: string, archiveId: string): void {
    this.capture('content_correction_viewed', {
      correction_id: correctionId,
      archive_id: archiveId,
    });
  },

  trackSearchPerformed(query: string, resultsCount: number, searchType: 'course' | 'archive' | 'global'): void {
    this.capture('content_search_performed', {
      query,
      results_count: resultsCount,
      search_type: searchType,
    });
  },

  // ─── Engagement Events ─────────────────────────────────────────

  trackDailyStreakAchieved(streakCount: number): void {
    this.capture('engagement_daily_streak_achieved', {
      streak_count: streakCount,
    });
  },

  trackGoalCompleted(goalType: string, goalValue: number): void {
    this.capture('engagement_goal_completed', {
      goal_type: goalType,
      goal_value: goalValue,
    });
  },

  trackNotificationClicked(notificationType: string, notificationId: string): void {
    this.capture('engagement_notification_clicked', {
      notification_type: notificationType,
      notification_id: notificationId,
    });
  },

  trackNotificationPermissionRequested(): void {
    this.capture('engagement_notification_permission_requested');
  },

  trackNotificationPermissionGranted(): void {
    this.capture('engagement_notification_permission_granted');
  },

  trackNotificationPermissionDenied(): void {
    this.capture('engagement_notification_permission_denied');
  },

  trackAppRated(rating: number): void {
    this.capture('engagement_app_rated', { rating });
  },

  trackSupportTicketCreated(category: string): void {
    this.capture('engagement_support_ticket_created', { category });
  },

  trackWhatsappSupportOpened(): void {
    this.capture('engagement_whatsapp_support_opened');
  },

  // ─── Competition Events ────────────────────────────────────────

  trackCompetitionViewed(competitionId: string, competitionName: string): void {
    this.capture('competition_viewed', {
      competition_id: competitionId,
      competition_name: competitionName,
    });
  },

  trackCompetitionRegistered(competitionId: string, competitionName: string, price: number): void {
    this.capture('competition_registered', {
      competition_id: competitionId,
      competition_name: competitionName,
      price,
    });
  },

  trackCompetitionStarted(competitionId: string): void {
    this.capture('competition_started', {
      competition_id: competitionId,
    });
  },

  trackCompetitionCompleted(competitionId: string, score: number, duration: number): void {
    this.capture('competition_completed', {
      competition_id: competitionId,
      score,
      duration_seconds: duration,
    });
  },

  // ─── Navigation Events ─────────────────────────────────────────

  trackScreenViewed(screenName: string, params?: Record<string, string>): void {
    this.capture('nav_screen_viewed', {
      screen_name: screenName,
      ...params,
    });
  },

  trackTabSwitched(fromTab: string, toTab: string): void {
    this.capture('nav_tab_switched', {
      from_tab: fromTab,
      to_tab: toTab,
    });
  },

  trackDeepLinkOpened(linkType: string, destination: string): void {
    this.capture('nav_deep_link_opened', {
      link_type: linkType,
      destination,
    });
  },

  trackBackButtonPressed(currentScreen: string): void {
    this.capture('nav_back_button_pressed', {
      current_screen: currentScreen,
    });
  },

  // ─── Settings Events ───────────────────────────────────────────

  trackSettingsViewed(): void {
    this.capture('settings_viewed');
  },

  trackThemeChanged(theme: 'light' | 'dark' | 'auto'): void {
    this.capture('settings_theme_changed', { theme });
  },

  trackLanguageChanged(language: string): void {
    this.capture('settings_language_changed', { language });
  },

  trackNotificationsToggled(enabled: boolean): void {
    this.capture('settings_notifications_toggled', { enabled });
  },

  trackDownloadQualityChanged(quality: string): void {
    this.capture('settings_download_quality_changed', { quality });
  },

  // ─── Error Events ──────────────────────────────────────────────

  trackError(errorType: string, errorMessage: string, context?: Record<string, string | number | boolean>): void {
    const error = new Error(errorMessage);
    error.name = errorType;
    this.captureException(error, context);
  },

  trackApiError(endpoint: string, statusCode: number, errorMessage: string): void {
    this.capture('error_api_failed', {
      endpoint,
      status_code: statusCode,
      error_message: errorMessage,
    });
  },
};
