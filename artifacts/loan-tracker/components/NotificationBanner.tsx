import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface NotificationBannerProps {
  message: string;
  type?: "success" | "warning" | "error" | "info";
  onDismiss: () => void;
  duration?: number;
}

export function NotificationBanner({ message, type = "info", onDismiss, duration = 3000 }: NotificationBannerProps) {
  const c = useColors();
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

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(onDismiss);
    }, duration);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.banner, { backgroundColor: tintColor + "F2", opacity }]}>
      <Feather name={icons[type]} size={16} color="#fff" />
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity onPress={onDismiss}>
        <Feather name="x" size={16} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  text: {
    flex: 1,
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
