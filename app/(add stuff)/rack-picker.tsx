import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useCopyStore } from "@/lib/add-copy-store";
import { getApiBaseUrl } from "@/lib/api-url";
import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";

const apiUrl = getApiBaseUrl();

type Rack = {
  rackId: string;
  room: string;
  cupboard: string;
  rack: string;
  description: string | null;
};

export default function RackPickerScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [racks, setRacks] = useState<Rack[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSelectedRack = useCopyStore((state) => state.setSelectedRack);
  const setPendingRackId = useCopyStore((state) => state.setPendingRackId);

  const filteredRacks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return racks;
    }

    return racks.filter((rack) => {
      const haystack = [
        rack.rackId,
        rack.room,
        rack.cupboard,
        rack.rack,
        rack.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [racks, searchQuery]);

  const loadRacks = useCallback(async () => {
    setError(null);
    setRefreshing(true);

    try {
      const response = await fetch(
        `${apiUrl}/api/racks`,
        getAuthenticatedRequestInit({ method: "GET" }),
      );

      if (!response.ok) {
        let message = "Could not load racks.";

        try {
          const payload = (await response.json()) as { message?: string };
          if (payload?.message) {
            message = payload.message;
          }
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      const payload = (await response.json()) as Rack[];
      setRacks(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong.",
      );
      setRacks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRacks();
  }, [loadRacks]);

  const handleSelectRack = (rack: Rack) => {
    setSelectedRack(rack);
    setPendingRackId(null);
    router.back();
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Select Rack</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Pick a rack to associate with the copy.
      </Text>

      <TextInput
        placeholder="Search racks"
        placeholderTextColor={colors.inputPlaceholder}
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={[
          styles.searchInput,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />

      <Pressable
        onPress={() => void loadRacks()}
        style={({ pressed }) => [
          styles.refreshButton,
          {
            backgroundColor: colors.tint,
            opacity: pressed || refreshing ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.refreshButtonText, { color: colors.background }]}>
          {refreshing ? "Refreshing..." : "Refresh"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(add stuff)/scanner",
            params: { kind: "r", returnTo: "/(add stuff)/rack-picker" },
          })
        }
        style={({ pressed }) => [
          styles.refreshButton,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
            borderWidth: 1,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.refreshButtonText, { color: colors.text }]}>
          Add New Rack
        </Text>
      </Pressable>

      {loading ? (
        <LoadingSkeleton
          density="compact"
          count={4}
          style={styles.loadingList}
        />
      ) : error ? (
        <View
          style={[
            styles.stateBlock,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.text }}>{error}</Text>
        </View>
      ) : filteredRacks.length === 0 ? (
        <View
          style={[
            styles.stateBlock,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.muted }}>No racks found.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredRacks.map((rack) => (
            <Pressable
              key={rack.rackId}
              onPress={() => handleSelectRack(rack)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {rack.rackId}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.muted }]}>
                {rack.room} · {rack.cupboard} · {rack.rack}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.muted }]}>
                {rack.description?.trim() || "No description provided."}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  refreshButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  loadingList: {
    marginTop: 4,
  },
  stateBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    alignItems: "center",
  },
  list: {
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
  },
});
