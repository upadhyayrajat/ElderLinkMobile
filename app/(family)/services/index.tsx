import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { servicesApi } from "@/src/api/services";
import type { ServiceType } from "@/src/types";
import { Clock, IndianRupee, ChevronRight } from "lucide-react-native";

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatDuration(minutes: number) {
  return minutes >= 60 ? `${minutes / 60}h` : `${minutes} min`;
}

function ServiceCard({ service }: { service: ServiceType }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/(family)/providers" as any,
          params: { serviceTypeId: service.id, serviceName: service.name },
        })
      }
      activeOpacity={0.8}
    >
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{service.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{service.description}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Clock size={13} color="#6B7280" />
            <Text style={styles.metaText}>{formatDuration(service.durationMinutes)}</Text>
          </View>
          <View style={styles.metaItem}>
            <IndianRupee size={13} color="#6B7280" />
            <Text style={styles.metaText}>From {formatPaise(service.basePriceInPaise)}</Text>
          </View>
        </View>
      </View>
      <ChevronRight size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function ServiceCatalogueScreen() {
  const { data: services, isLoading, isError } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list().then((r) => r.data.data),
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Book a Service</Text>
        <Text style={styles.subtitle}>Choose the type of care you need</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#006FFD" style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load services. Please try again.</Text>
        </View>
      ) : (services ?? []).length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>No services available yet.</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <ServiceCard service={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: "#1A1A2E" },
  subtitle: { fontSize: 15, color: "#6B7280", marginTop: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  errorText: { fontSize: 15, color: "#6B7280", textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardBody: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E", marginBottom: 4 },
  cardDesc: { fontSize: 13, color: "#6B7280", lineHeight: 18, marginBottom: 10 },
  cardMeta: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
});
