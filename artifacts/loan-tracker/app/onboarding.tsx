import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: W, height: H } = Dimensions.get("window");

const GREEN = "#00A86B";
const GREEN_DARK = "#007A4D";
const BLUE = "#0D47A1";
const AMBER = "#F5A623";

const slides = [
  {
    id: 0,
    icon: "trending-up" as const,
    iconBg: "rgba(255,255,255,0.2)",
    title: "Hi, Welcome to\nLoanTracker",
    subtitle:
      "The smartest way to manage loans, track payments, and stay on top of your finances.",
    bg: GREEN,
    accentBg: GREEN_DARK,
  },
  {
    id: 1,
    icon: "credit-card" as const,
    iconBg: "rgba(255,255,255,0.2)",
    title: "Track Every\nPayment",
    subtitle:
      "Record payments via PhonePe, Google Pay, or Cash. Get instant confirmations and real-time notifications.",
    bg: BLUE,
    accentBg: "#0A3580",
  },
  {
    id: 2,
    icon: "shield" as const,
    iconBg: "rgba(255,255,255,0.2)",
    title: "Secure &\nTransparent",
    subtitle:
      "Your loan data is protected with Firebase security. Admins and borrowers each see exactly what they need.",
    bg: GREEN_DARK,
    accentBg: "#005235",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const dotScales = slides.map((_, i) =>
    useRef(new Animated.Value(i === 0 ? 1 : 0.7)).current
  );

  const goTo = (index: number) => {
    Animated.spring(translateX, {
      toValue: -index * W,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
    dotScales.forEach((s, i) => {
      Animated.spring(s, {
        toValue: i === index ? 1 : 0.7,
        useNativeDriver: true,
      }).start();
    });
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      goTo(currentIndex + 1);
    }
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem("onboarding_done", "1");
    router.replace("/login");
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem("onboarding_done", "1");
    router.replace("/login");
  };

  const slide = slides[currentIndex];

  return (
    <View style={styles.root}>
      {/* Slides strip */}
      <Animated.View
        style={[
          styles.slidesStrip,
          { width: W * slides.length, transform: [{ translateX }] },
        ]}
      >
        {slides.map((s) => (
          <View key={s.id} style={[styles.slide, { backgroundColor: s.bg, width: W }]}>
            {/* Decorative circles */}
            <View style={[styles.circle1, { backgroundColor: s.accentBg }]} />
            <View style={[styles.circle2, { backgroundColor: s.accentBg }]} />
            <View style={[styles.circle3, { backgroundColor: "rgba(255,255,255,0.07)" }]} />

            <SafeAreaView edges={["top"]} style={styles.slideInner}>
              {/* Skip button */}
              <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>

              {/* Illustration area */}
              <View style={styles.illustrationArea}>
                {/* Outer ring */}
                <View style={styles.iconOuterRing}>
                  <View style={[styles.iconInnerRing, { backgroundColor: s.accentBg }]}>
                    <View style={styles.iconCircle}>
                      <Feather name={s.icon} size={48} color="#fff" />
                    </View>
                  </View>
                </View>

                {/* Floating stat cards */}
                {s.id === 0 && (
                  <>
                    <View style={[styles.floatCard, styles.floatCardTL]}>
                      <Feather name="dollar-sign" size={14} color={GREEN} />
                      <Text style={styles.floatCardText}>₹5,20,000</Text>
                    </View>
                    <View style={[styles.floatCard, styles.floatCardBR]}>
                      <Feather name="check-circle" size={14} color={GREEN} />
                      <Text style={styles.floatCardText}>Active</Text>
                    </View>
                  </>
                )}
                {s.id === 1 && (
                  <>
                    <View style={[styles.floatCard, styles.floatCardTL]}>
                      <Feather name="smartphone" size={14} color={BLUE} />
                      <Text style={styles.floatCardText}>PhonePe</Text>
                    </View>
                    <View style={[styles.floatCard, styles.floatCardBR]}>
                      <Feather name="bell" size={14} color={BLUE} />
                      <Text style={styles.floatCardText}>Notified!</Text>
                    </View>
                  </>
                )}
                {s.id === 2 && (
                  <>
                    <View style={[styles.floatCard, styles.floatCardTL]}>
                      <Feather name="lock" size={14} color={GREEN_DARK} />
                      <Text style={styles.floatCardText}>Secured</Text>
                    </View>
                    <View style={[styles.floatCard, styles.floatCardBR]}>
                      <Feather name="users" size={14} color={GREEN_DARK} />
                      <Text style={styles.floatCardText}>Roles</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Text */}
              <View style={styles.textArea}>
                <Text style={styles.title}>{s.title}</Text>
                <Text style={styles.subtitle}>{s.subtitle}</Text>
              </View>
            </SafeAreaView>
          </View>
        ))}
      </Animated.View>

      {/* Bottom controls on white card */}
      <View style={styles.bottomCard}>
        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex ? slide.bg : "#D1E8DF",
                  transform: [{ scale: dotScales[i] }],
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {currentIndex < slides.length - 1 ? (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: slide.bg }]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>Next</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.getStartedBtn, { backgroundColor: AMBER }]}
            onPress={handleGetStarted}
            activeOpacity={0.85}
          >
            <Text style={styles.getStartedText}>Let's Get Started</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        )}

        <SafeAreaView edges={["bottom"]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  slidesStrip: {
    flexDirection: "row",
    height: H * 0.72,
  },
  slide: {
    overflow: "hidden",
  },
  circle1: {
    position: "absolute", width: 280, height: 280, borderRadius: 140,
    top: -80, right: -80,
  },
  circle2: {
    position: "absolute", width: 180, height: 180, borderRadius: 90,
    top: 60, left: -60,
  },
  circle3: {
    position: "absolute", width: 120, height: 120, borderRadius: 60,
    bottom: 60, right: 40,
  },
  slideInner: { flex: 1, paddingHorizontal: 28 },
  skipBtn: { alignSelf: "flex-end", paddingVertical: 12, paddingHorizontal: 4 },
  skipText: { color: "rgba(255,255,255,0.75)", fontFamily: "Inter_500Medium", fontSize: 14 },

  // Illustration
  illustrationArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconOuterRing: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  iconInnerRing: {
    width: 156, height: 156, borderRadius: 78,
    alignItems: "center", justifyContent: "center",
  },
  iconCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  floatCard: {
    position: "absolute",
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 5,
  },
  floatCardTL: { top: 10, left: 0 },
  floatCardBR: { bottom: 10, right: 0 },
  floatCardText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0D2B1A" },

  // Text
  textArea: { paddingBottom: 32, gap: 12 },
  title: {
    fontSize: 34, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 42,
  },
  subtitle: {
    fontSize: 15, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)", lineHeight: 22,
  },

  // Bottom
  bottomCard: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 28,
    paddingTop: 28,
    gap: 24,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  dots: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  btnRow: { flexDirection: "row", justifyContent: "flex-end" },
  nextBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 28, paddingVertical: 16,
    borderRadius: 14,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  getStartedBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 18, borderRadius: 14,
    shadowColor: AMBER, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  getStartedText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
