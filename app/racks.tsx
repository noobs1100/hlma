import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import CustomButton from "@/components/CustomButton";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { getApiBaseUrl } from "@/lib/api-url";
import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";
import { useAuth } from "@/providers/auth-provider";

const apiUrl = getApiBaseUrl();

type Rack = {
  rackId: string;
  room: string;
  cupboard: string;
  rack: string;
  description: string | null;
};

export default function RacksScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const params = useLocalSearchParams<{ selectedRackId?: string }>();
  const selectedRackIdFromParams = useMemo(() => {
    if (typeof params.selectedRackId === "string" && params.selectedRackId) {
      return params.selectedRackId;
    }

    return null;
  }, [params.selectedRackId]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(
    selectedRackIdFromParams,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingRackId, setDeletingRackId] = useState<string | null>(null);

  const selectedRack = useMemo(
    () => racks.find((rack) => rack.rackId === selectedRackId) ?? null,
    [racks, selectedRackId],
  );

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
          // Keep default error message.
        }

        throw new Error(message);
      }

      const payload = (await response.json()) as Rack[];
      setRacks(payload);

      if (selectedRackIdFromParams) {
        setSelectedRackId(selectedRackIdFromParams);
      } else if (
        !selectedRackId ||
        !payload.some((rack) => rack.rackId === selectedRackId)
      ) {
        setSelectedRackId(payload[0]?.rackId ?? null);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong.",
      );
      setRacks([]);
      setSelectedRackId(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRackId, selectedRackIdFromParams]);

  useFocusEffect(
    useCallback(() => {
      void loadRacks();
    }, [loadRacks]),
  );

  useEffect(() => {
    if (selectedRackIdFromParams) {
      setSelectedRackId(selectedRackIdFromParams);
    }
  }, [selectedRackIdFromParams]);

  const handleDeleteRack = useCallback(async () => {
    if (!selectedRack) {
      return;
    }

    setDeletingRackId(selectedRack.rackId);

    try {
      const response = await fetch(
        `${apiUrl}/api/racks/${selectedRack.rackId}`,
        getAuthenticatedRequestInit({ method: "DELETE" }),
      );

      if (!response.ok) {
        let message = "Could not delete the rack.";

        try {
          const payload = (await response.json()) as { message?: string };
          if (payload?.message) {
            message = payload.message;
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      Alert.alert("Deleted", "The rack was deleted successfully.");
      await loadRacks();
    } catch (deleteError) {
      Alert.alert(
        "Delete failed",
        deleteError instanceof Error
          ? deleteError.message
          : "Something went wrong.",
      );
    } finally {
      setDeletingRackId(null);
    }
  }, [loadRacks, selectedRack]);

  const confirmDeleteRack = useCallback(() => {
    if (!selectedRack) {
      return;
    }

    Alert.alert(
      "Delete rack",
      "This will delete the rack only if no copies are assigned to it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void handleDeleteRack(),
        },
      ],
    );
  }, [handleDeleteRack, selectedRack]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Rack List</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Select a rack to view its details.
      </Text>

      <CustomButton
        label={refreshing ? "Refreshing..." : "Refresh"}
        onPress={() => void loadRacks()}
        style={styles.refreshButton}
      />

      {loading ? (
        <LoadingSkeleton count={4} density="compact" style={styles.loadingList} />
      ) : error ? (
        <View
          style={[
            styles.stateBlock,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error}
          </Text>
        </View>
      ) : racks.length === 0 ? (
        <View
          style={[
            styles.stateBlock,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.muted }}>No racks found.</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.listSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Racks
            </Text>
            {racks.map((rack) => {
              const isSelected = rack.rackId === selectedRackId;

              return (
                <Pressable
                  key={rack.rackId}
                  onPress={() => setSelectedRackId(rack.rackId)}
                  style={[
                    styles.rackItem,
                    {
                      backgroundColor: isSelected ? colors.tint : colors.card,
                      borderColor: isSelected ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rackItemTitle,
                      { color: isSelected ? colors.background : colors.text },
                    ]}
                  >
                    {rack.rackId}
                  </Text>
                  <Text
                    style={[
                      styles.rackItemMeta,
                      { color: isSelected ? colors.background : colors.muted },
                    ]}
                  >
                    {rack.room} · {rack.cupboard} · {rack.rack}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.detailCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Detail
            </Text>
            {selectedRack ? (
              <View style={styles.detailFields}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>
                  Rack ID
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedRack.rackId}
                </Text>

                <Text style={[styles.detailLabel, { color: colors.muted }]}>
                  Room
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedRack.room}
                </Text>

                <Text style={[styles.detailLabel, { color: colors.muted }]}>
                  Cupboard
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedRack.cupboard}
                </Text>

                <Text style={[styles.detailLabel, { color: colors.muted }]}>
                  Rack
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedRack.rack}
                </Text>

                <Text style={[styles.detailLabel, { color: colors.muted }]}>
                  Description
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedRack.description?.trim() ||
                    "No description provided."}
                </Text>

                {user?.role === "admin" ? (
                  <Pressable
                    disabled={deletingRackId === selectedRack.rackId}
                    onPress={confirmDeleteRack}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      {
                        backgroundColor: colors.inputBackground,
                        borderColor: "#dc2626",
                        opacity:
                          pressed || deletingRackId === selectedRack.rackId
                            ? 0.85
                            : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.deleteButtonText, { color: "#dc2626" }]}
                    >
                      {deletingRackId === selectedRack.rackId
                        ? "Deleting…"
                        : "Delete Rack"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Text style={{ color: colors.muted }}>
                Tap a rack to see details.
              </Text>
            )}
          </View>
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
  refreshButton: {
    alignSelf: "flex-start",
    minWidth: 110,
  },
  stateBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
  },
  loadingList: {
    marginTop: 2,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
  },
  content: {
    gap: 16,
  },
  listSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  rackItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  rackItemTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  rackItemMeta: {
    fontSize: 13,
    fontWeight: "500",
  },
  detailCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  detailFields: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 8,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  deleteButton: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
