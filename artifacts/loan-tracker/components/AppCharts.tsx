import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";

const screenWidth = Dimensions.get("window").width - 40;

interface LoanBarChartProps {
  labels: string[];
  data: number[];
}

export function LoanBarChart({ labels, data }: LoanBarChartProps) {
  const c = useColors();
  const { isDark } = useTheme();
  if (!labels.length) return <EmptyChart label="No loan data yet" />;

  return (
    <BarChart
      data={{ labels, datasets: [{ data }] }}
      width={screenWidth}
      height={180}
      yAxisLabel="₹"
      yAxisSuffix=""
      chartConfig={{
        backgroundColor: c.card,
        backgroundGradientFrom: c.card,
        backgroundGradientTo: c.card,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(77,124,254,${opacity})`,
        labelColor: () => c.mutedForeground,
        style: { borderRadius: 12 },
        barPercentage: 0.6,
      }}
      style={{ borderRadius: 12 }}
      showValuesOnTopOfBars
      fromZero
      withInnerLines={false}
    />
  );
}

interface PaidPieChartProps {
  paid: number;
  pending: number;
}

export function PaidPieChart({ paid, pending }: PaidPieChartProps) {
  const c = useColors();
  if (paid === 0 && pending === 0) return <EmptyChart label="No payment data yet" />;

  const pieData = [
    { name: "Paid", amount: paid || 0.001, color: c.success, legendFontColor: c.mutedForeground, legendFontSize: 12 },
    { name: "Pending", amount: pending || 0.001, color: c.warning, legendFontColor: c.mutedForeground, legendFontSize: 12 },
  ];

  return (
    <PieChart
      data={pieData}
      width={screenWidth}
      height={160}
      chartConfig={{
        color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
        labelColor: () => c.mutedForeground,
      }}
      accessor="amount"
      backgroundColor="transparent"
      paddingLeft="15"
      absolute={false}
    />
  );
}

interface PaymentLineChartProps {
  labels: string[];
  data: number[];
}

export function PaymentLineChart({ labels, data }: PaymentLineChartProps) {
  const c = useColors();
  if (!labels.length || data.every((v) => v === 0)) return <EmptyChart label="No payment trend data" />;

  return (
    <LineChart
      data={{ labels, datasets: [{ data }] }}
      width={screenWidth}
      height={180}
      yAxisLabel="₹"
      chartConfig={{
        backgroundColor: c.card,
        backgroundGradientFrom: c.card,
        backgroundGradientTo: c.card,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(0,212,170,${opacity})`,
        labelColor: () => c.mutedForeground,
        propsForDots: { r: "4", strokeWidth: "2", stroke: c.accent },
      }}
      bezier
      style={{ borderRadius: 12 }}
      withInnerLines={false}
    />
  );
}

function EmptyChart({ label }: { label: string }) {
  const c = useColors();
  return (
    <View style={[styles.emptyChart, { backgroundColor: c.muted }]}>
      <Text style={[styles.emptyLabel, { color: c.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyChart: {
    height: 120,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyLabel: { fontFamily: "Inter_400Regular", fontSize: 14 },
});
