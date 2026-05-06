import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface NotificationBannerProps {
  message: string;
  type?: "success" | "warning" | "error" | "info";
  onDismiss: () => void;
  duration?: number;
}

export function NotificationBanner({ message, type = "info", onDismiss, duration = 3000 }: NotificationBannerProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  const icons = {
    success: "check-circle" as const,
    warning: "alert-triangle" as const,
    error: "x-circle" as const,
    info: "info" as const,
  };

  const colors = {
    success: c.success,
    warning: c.warning,
    error: c.destructive,
    info: c.primary,
  };

  const tintColor = colors[type];

  // Respect device safe area — on notched/dynamic-island phones the top inset
  // can be 44-59 pt; add 8 pt breathing room below it.
  const topOffset = (insets.top > 0 ? insets.top : Platform.OS === "android" ? 24 : 44) + 8;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(onDismiss);
    }, duration);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.banner, { backgroundColor: tintColor + "F2", opacity, top: topOffset }]}>
      <Feather name={icons[type]} size={16} color="#fff" />
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="x" size={16} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  text: {
    flex: 1,
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
