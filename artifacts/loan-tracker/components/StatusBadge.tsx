import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

type StatusValue = "pending" | "confirmed" | "rejected" | "active" | "completed";

interface StatusBadgeProps {
  status: StatusValue;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const c = useColors();

  const config: Record<StatusValue, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Feather>["name"] }> = {
    pending:   { label: "Pending",   color: c.warning,     bg: c.warning + "22",     icon: "clock" },
    confirmed: { label: "Confirmed", color: c.success,     bg: c.success + "22",     icon: "check-circle" },
    rejected:  { label: "Rejected",  color: c.destructive, bg: c.destructive + "20", icon: "x-circle" },
    active:    { label: "Active",    color: c.primary,     bg: c.primary + "22",     icon: "activity" },
    completed: { label: "Completed", color: c.success,     bg: c.success + "22",     icon: "check-circle" },
  };

  const { label, color, bg, icon } = config[status] ?? config.pending;
  const fontSize = size === "sm" ? 11 : 13;
  const iconSize = size === "sm" ? 11 : 13;
  const padH = size === "sm" ? 8 : 12;
  const padV = size === "sm" ? 3 : 5;

  return (
    <View style={[styles.badge, { backgroundColor: bg, paddingHorizontal: padH, paddingVertical: padV }]}>
      <Feather name={icon} size={iconSize} color={color} />
      <Text style={[styles.label, { color, fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  label: {
    fontFamily: "Inter_600SemiBold",
  },
});
