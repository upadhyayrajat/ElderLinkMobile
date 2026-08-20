import { useState } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { Check } from "lucide-react-native";
import { BottomSheet } from "@/src/components/BottomSheet";
import type { City } from "@/src/types";

export function CityPicker({
  visible, onClose, cities, selectedCityId, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  cities: City[];
  selectedCityId?: string;
  onSelect: (city: City) => void;
}) {
  const [filter, setFilter] = useState("");

  const filtered = filter.trim()
    ? cities.filter((c) => c.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : cities;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Select city</Text>
      <TextInput
        style={styles.filterInput}
        placeholder="Search cities"
        placeholderTextColor="#9CA3AF"
        value={filter}
        onChangeText={setFilter}
        autoCorrect={false}
      />
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.emptyText}>No cities match "{filter}"</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => { onSelect(item); onClose(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.rowText}>{item.name}</Text>
            {item.id === selectedCityId && <Check size={18} color="#006FFD" />}
          </TouchableOpacity>
        )}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A2E", marginBottom: 12 },
  filterInput: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#1A1A2E", marginBottom: 8,
  },
  list: { maxHeight: 320 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowText: { fontSize: 16, color: "#1A1A2E" },
  emptyText: { textAlign: "center", color: "#9CA3AF", paddingVertical: 20 },
});
