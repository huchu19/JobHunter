import type { DashboardStats } from "@/app/lib/applicationStats";

/** Singleton notification preferences (mirrors the Prisma model). */
export interface NotificationSettingsDTO {
  id: string;
  emailEnabled: boolean;
  emailAddress: string | null;
  weeklyDigest: boolean;
  followUpReminders: boolean;
  interviewAlerts: boolean;
  offerCelebration: boolean;
  browserEnabled: boolean;
  updatedAt: string;
  /** Whether the server has an email transport key configured (read-only). */
  emailConfigured?: boolean;
}

export type ReminderType = "follow_up" | "deadline" | "interview" | "offer";

/** A single computed reminder, ready to display or send. */
export interface Reminder {
  type: ReminderType;
  applicationId: string;
  company: string;
  role: string;
  /** ISO timestamp the reminder is anchored to (due date / interview time). */
  dueAt: string;
  message: string;
}

export interface WeeklyDigest {
  generatedAt: string;
  stats: DashboardStats;
  reminders: Reminder[];
}
