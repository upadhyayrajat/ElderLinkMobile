import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { parentsApi } from "@/src/api/parents";
import type { ParentProfile } from "@/src/types";
import { Plus, ChevronRight } from "lucide-react-native";

function ParentCard({ parent }: { parent: ParentProfile }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(family)/parents/${parent.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{parent.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.name}>{parent.name}</Text>
        <Text style={styles.meta}>{parent.age} yrs · {parent.city}</Text>
      </View>
      <ChevronRight size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function ParentsScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["parents"],
    queryFn: () => parentsApi.list().then((r) => r.data.data),
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>My Parents</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/(family)/parents/new" as any)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#006FFD" style={{ marginTop: 40 }} />
      ) : (data ?? []).length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No parent profiles yet</Text>
          <Text style={styles.emptyText}>Add your parent's profile to start booking care services.</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/(family)/parents/new" as any)}
          >
            <Text style={styles.emptyBtnText}>Add parent profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {(data ?? []).map((p) => <ParentCard key={p.id} parent={p} />)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: "#1A1A2E" },
  addBtn: { backgroundColor: "#006FFD", borderRadius: 10, padding: 8 },
  list: { padding: 20, gap: 10 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EEF4FF", justifyContent: "center", alignItems: "center", marginRight: 14 },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#006FFD" },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#1A1A2E" },
  meta: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 8 },
  emptyText: { fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 24 },
  emptyBtn: { backgroundColor: "#006FFD", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
