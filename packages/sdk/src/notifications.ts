export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface Notification {
  level: NotificationLevel;
  message: string;
}

export interface NotificationsSDK {
  show(notification: Notification): void;
}
