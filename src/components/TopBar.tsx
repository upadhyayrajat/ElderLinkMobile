import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

interface TopBarProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function TopBar({ title, onBack, right }: TopBarProps) {
  const router = useRouter();
  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack ?? (() => router.back())}
        activeOpacity={0.7}
      >
        <ArrowLeft size={22} color="#1A1A2E" />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingTop: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A2E", flex: 1, textAlign: "center" },
  right: { width: 38, alignItems: "flex-end" },
});
