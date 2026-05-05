import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

const GREEN = "#00A86B";
const GREEN_DARK = "#007A4D";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}

export function ScreenHeader({ title, subtitle, right, onBack }: ScreenHeaderProps) {
  return (
    <View style={styles.headerBg}>
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.row}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={styles.titles}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right && <View>{right}</View>}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBg: {
    backgroundColor: GREEN,
    paddingBottom: 20,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute", width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -40,
  },
  circle2: {
    position: "absolute", width: 110, height: 110, borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.06)", bottom: -20, left: 20,
  },
  safeArea: { paddingHorizontal: 20, paddingTop: 8 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  titles: { flex: 1 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },
});
