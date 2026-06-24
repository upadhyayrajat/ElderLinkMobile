import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { parentsApi } from "@/src/api/parents";
import { sosApi } from "@/src/api/sos";

export default function SosScreen() {
  const [triggering, setTriggering] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const { data: parents, isLoading } = useQuery({
    queryKey: ["parents"],
    queryFn: () => parentsApi.list().then((r) => r.data.data),
  });

  async function handleSos(parentProfileId: string) {
    Alert.alert(
      "Trigger SOS Alert?",
      "This will immediately notify all family members. Use only in a real emergency.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "YES — Send SOS",
          style: "destructive",
          onPress: () => triggerSos(parentProfileId),
        },
      ]
    );
  }

  async function triggerSos(parentProfileId: string) {
    setTriggering(true);
    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
    } catch {
      // Location optional — SOS still fires without it
    }

    try {
      await sosApi.trigger(parentProfileId, latitude, longitude);
      setTriggered(true);
      setTimeout(() => setTriggered(false), 10_000);
    } catch (err: any) {
      Alert.alert("Failed", err?.response?.data?.error ?? "Could not send SOS. Call emergency services directly.");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Emergency SOS</Text>
      <Text style={styles.subtitle}>
        Immediately alerts all family members with your location.
      </Text>

      {triggered && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✓ SOS alert sent — family notified</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color="#EF4444" style={{ marginTop: 40 }} />
      ) : (parents ?? []).length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Add a parent profile first to use SOS.</Text>
        </View>
      ) : (
        (parents ?? []).map((parent) => (
          <TouchableOpacity
            key={parent.id}
            style={[styles.sosBtn, triggering && styles.sosBtnDisabled]}
            onPress={() => handleSos(parent.id)}
            disabled={triggering}
            activeOpacity={0.85}
          >
            {triggering ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Text style={styles.sosBtnLabel}>SOS</Text>
                <Text style={styles.sosBtnParent}>for {parent.name}</Text>
              </>
            )}
          </TouchableOpacity>
        ))
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>In a medical emergency</Text>
        <Text style={styles.infoText}>
          Also call 112 (emergency) or 102 (ambulance) immediately.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF5F5" },
  content: { padding: 24, paddingTop: 60, alignItems: "center" },
  title: { fontSize: 24, fontWeight: "800", color: "#991B1B" },
  subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center", marginTop: 6, marginBottom: 28 },
  successBanner: { backgroundColor: "#D1FAE5", borderRadius: 12, padding: 14, marginBottom: 20, width: "100%" },
  successText: { color: "#065F46", fontWeight: "700", textAlign: "center", fontSize: 15 },
  sosBtn: {
    width: 200, height: 200, borderRadius: 100, backgroundColor: "#EF4444",
    justifyContent: "center", alignItems: "center", marginBottom: 24,
    shadowColor: "#EF4444", shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  sosBtnDisabled: { opacity: 0.6 },
  sosBtnLabel: { color: "#fff", fontSize: 40, fontWeight: "900" },
  sosBtnParent: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 4 },
  empty: { paddingVertical: 40 },
  emptyText: { fontSize: 15, color: "#6B7280", textAlign: "center" },
  infoBox: { backgroundColor: "#FEF3C7", borderRadius: 12, padding: 16, width: "100%", marginTop: 12 },
  infoTitle: { fontSize: 14, fontWeight: "700", color: "#92400E", marginBottom: 4 },
  infoText: { fontSize: 14, color: "#78350F" },
});
