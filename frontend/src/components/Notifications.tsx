"use client";

import { useEffect, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, WifiOff } from "lucide-react";
import { useAppStore } from "@/lib/store";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

const icons: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
  warning: <AlertCircle className="w-4 h-4 text-amber-500" />,
};

const bgColors: Record<NotificationType, string> = {
  success: "bg-emerald-50 border-emerald-200",
  error: "bg-red-50 border-red-200",
  info: "bg-blue-50 border-blue-200",
  warning: "bg-amber-50 border-amber-200",
};

// Global notification store
let notificationListeners: ((n: Notification) => void)[] = [];

export function notify(
  type: NotificationType,
  title: string,
  message?: string,
  duration = 5000
) {
  const notification: Notification = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    type,
    title,
    message,
    duration,
  };
  notificationListeners.forEach((fn) => fn(notification));
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  const addNotification = useCallback((n: Notification) => {
    setNotifications((prev) => [...prev.slice(-4), n]);
    if (n.duration && n.duration > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((x) => x.id !== n.id));
      }, n.duration);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    notificationListeners.push(addNotification);
    return () => {
      notificationListeners = notificationListeners.filter(
        (fn) => fn !== addNotification
      );
    };
  }, [addNotification]);

  // Connection status notifications
  useEffect(() => {
    if (connectionStatus === "error") {
      notify("error", "Connection Lost", "Attempting to reconnect...");
    } else if (connectionStatus === "connected") {
      // Only notify if there were previous notifications about disconnection
      notify("success", "Connected", "WebSocket connection established");
    }
  }, [connectionStatus]);

  return (
    <>
      {/* Connection banner */}
      {connectionStatus === "error" && (
        <div
          className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-sm py-2 px-4 flex items-center justify-center gap-2"
          role="alert"
          aria-live="assertive"
        >
          <WifiOff className="w-4 h-4" />
          <span>Connection lost. Reconnecting...</span>
        </div>
      )}

      {/* Toast notifications */}
      <div
        className="fixed top-4 right-4 z-50 space-y-2 w-80"
        role="log"
        aria-label="Notifications"
        aria-live="polite"
      >
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 p-3 rounded-xl border shadow-lg backdrop-blur-sm animate-fade-in ${bgColors[n.type]}`}
            role="status"
          >
            <div className="mt-0.5 shrink-0">{icons[n.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{n.title}</p>
              {n.message && (
                <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(n.id)}
              className="shrink-0 p-0.5 rounded hover:bg-black/5 text-slate-400"
              aria-label={`Dismiss notification: ${n.title}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
