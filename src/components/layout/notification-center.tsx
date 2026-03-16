"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Bell, Check, CheckCheck, Clock, ArrowRight, AlertTriangle, Send, RotateCcw, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  case_id: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  case_submitted: Send,
  case_approved: Check,
  case_returned: RotateCcw,
  case_escalated: AlertTriangle,
  case_assigned: Clock,
  expiry_warning: AlertTriangle,
  info: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  case_submitted: "text-violet-500",
  case_approved: "text-emerald-500",
  case_returned: "text-red-500",
  case_escalated: "text-orange-500",
  case_assigned: "text-blue-500",
  expiry_warning: "text-amber-500",
  info: "text-muted-foreground",
};

function timeAgo(date: string) {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevUnreadRef = useRef(0);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.volume = 0.3;
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const res = await fetch("/api/notifications?limit=20");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications || []);
    const newUnread = data.unreadCount || 0;

    // Play sound if unread count increased (new notification arrived)
    if (newUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
      try { audioRef.current?.play(); } catch {}
    }
    prevUnreadRef.current = newUnread;
    setUnreadCount(newUnread);
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      prevUnreadRef.current = -1; // Don't ding on initial load
      fetchNotifications().then(() => {
        // After first fetch, set prevUnread properly
        setTimeout(() => { prevUnreadRef.current = unreadCount; }, 500);
      });
    }
  }, [user, fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);
          // Play ding
          try { audioRef.current?.play(); } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id?: string) => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { notificationId: id } : { all: true }),
    });
    if (id) {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border/50 bg-card shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={() => markRead()} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground/20" />
                <p className="mt-2 text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                const color = TYPE_COLORS[n.type] || "text-muted-foreground";
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 border-b border-border/20 last:border-0 transition-colors hover:bg-muted/30 cursor-pointer",
                      !n.is_read && "bg-primary/[0.03]"
                    )}
                    onClick={() => {
                      if (!n.is_read) markRead(n.id);
                      if (n.case_id) {
                        setOpen(false);
                        window.location.href = `/cases/${n.case_id}`;
                      }
                    }}
                  >
                    <div className={cn("mt-0.5 shrink-0", color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm truncate", !n.is_read ? "font-semibold" : "font-medium text-muted-foreground")}>
                          {n.title}
                        </p>
                        {!n.is_read && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
