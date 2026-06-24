import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { providersApi, type ProviderSearchResult } from "@/src/api/providers";
import { parentsApi } from "@/src/api/parents";
import { ArrowLeft, Star, Search, ShieldCheck } from "lucide-react-native";

function ProviderCard({ provider, serviceTypeId, serviceName }: {
  provider: ProviderSearchResult;
  serviceTypeId: string;
  serviceName: string;
}) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/(family)/providers/[id]" as any,
          params: {
            id: provider.id,
            serviceTypeId,
            serviceName,
          },
        })
      }
      activeOpacity={0.8}
    >
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarText}>
          {(provider.providerName ?? "?").charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{provider.providerName}</Text>
        <View style={styles.cardRatingRow}>
          <Star size={13} color="#F59E0B" fill="#F59E0B" />
          <Text style={styles.cardRating}>
            {provider.rating.toFixed(1)} ({provider.reviewCount})
          </Text>
          {provider.verificationStatus === "verified" && (
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={11} color="#059669" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        {provider.bio ? (
          <Text style={styles.cardBio} numberOfLines={2}>{provider.bio}</Text>
        ) : null}
        <Text style={styles.trustScore}>Trust score: {provider.trustScore}/100</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ProviderSearchScreen() {
  const { serviceTypeId, serviceName } = useLocalSearchParams<{
    serviceTypeId: string;
    serviceName: string;
  }>();
  const router = useRouter();
  const [city, setCity] = useState("");
  const [searchCity, setSearchCity] = useState("");

  // Pre-fill city from the first parent profile.
  const { data: parents } = useQuery({
    queryKey: ["parents"],
    queryFn: () => parentsApi.list().then((r) => r.data.data),
    onSuccess: (data) => {
      if (data.length > 0 && !city) {
        setCity(data[0].city);
        setSearchCity(data[0].city);
      }
    },
  });

  const { data: providers, isLoading, isError, refetch } = useQuery({
    queryKey: ["providers", serviceTypeId, searchCity],
    queryFn: () =>
      providersApi.search({ serviceTypeId, city: searchCity }).then((r) => r.data.data),
    enabled: !!serviceTypeId && !!searchCity,
  });

  function handleSearch() {
    const trimmed = city.trim();
    if (trimmed.length < 2) {
      Alert.alert("Enter a city", "Please enter the city where your parent lives.");
      return;
    }
    setSearchCity(trimmed);
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1A1A2E" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>{serviceName ?? "Providers"}</Text>
          <Text style={styles.pageSubtitle}>Find a caregiver near your parent</Text>
        </View>
      </View>

      {/* City search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.cityInput}
          placeholder="City (e.g. Delhi, Mumbai)"
          placeholderTextColor="#9CA3AF"
          value={city}
          onChangeText={setCity}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Search size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {!searchCity ? (
        <View style={styles.center}>
          <Text style={styles.hintText}>Enter your parent's city to see available caregivers.</Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator color="#006FFD" style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.hintText}>Could not load providers. Please try again.</Text>
        </View>
      ) : (providers ?? []).length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.hintText}>No verified caregivers found in {searchCity} for this service.</Text>
          <Text style={styles.hintSub}>Try a nearby city or check back later.</Text>
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <ProviderCard
              provider={item}
              serviceTypeId={serviceTypeId}
              serviceName={serviceName ?? ""}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  pageTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E" },
  pageSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 1 },
  searchRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  cityInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: "#1A1A2E" },
  searchBtn: { width: 46, height: 46, backgroundColor: "#006FFD", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  hintText: { fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 8 },
  hintSub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "flex-start", gap: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EEF4FF", justifyContent: "center", alignItems: "center", shrink: 0 },
  cardAvatarText: { fontSize: 20, fontWeight: "700", color: "#006FFD" },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: "#1A1A2E", marginBottom: 4 },
  cardRatingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  cardRating: { fontSize: 13, color: "#374151", fontWeight: "500" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F0FDF4", borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { fontSize: 11, color: "#059669", fontWeight: "600" },
  cardBio: { fontSize: 13, color: "#6B7280", lineHeight: 18, marginBottom: 4 },
  trustScore: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
});
