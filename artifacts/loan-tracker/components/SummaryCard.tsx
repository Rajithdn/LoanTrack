import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  color?: string;
  subtitle?: string;
}

export function SummaryCard({ title, value, icon, color, subtitle }: SummaryCardProps) {
  const c = useColors();
  const iconColor = color ?? c.primary;
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.iconBox, { backgroundColor: iconColor + "1F" }]}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.value, { color: c.foreground }]}>{value}</Text>
      <Text style={[styles.title, { color: c.mutedForeground }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: iconColor }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    minWidth: 140,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
