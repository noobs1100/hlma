import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
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

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "user";
  createdAt: string;
  updatedAt: string;
};

export default function AdminScreen() {
  const { refreshSession, user: currentUser } = useAuth();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstAdminId = useMemo(() => {
    return (
      users
        .filter((user) => user.role === "admin")
        .slice()
        .sort(
          (left, right) =>
            new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime(),
        )[0]?.id ?? null
    );
  }, [users]);

  const loadUsers = useCallback(async () => {
    setError(null);
    setRefreshing(true);

    try {
      const response = await fetch(
        `${apiUrl}/api/admin/users`,
        getAuthenticatedRequestInit({ method: "GET" }),
      );

      if (!response.ok) {
        let message = "Could not load users.";

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

      const payload = (await response.json()) as AdminUser[];
      setUsers(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong.",
      );
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadUsers();
    }, [loadUsers]),
  );

  const updateUserRole = useCallback(
    async (userId: string, role: AdminUser["role"]) => {
      setUpdatingUserId(userId);
      setError(null);

      try {
        const response = await fetch(
          `${apiUrl}/api/admin/users/${userId}/role`,
          getAuthenticatedRequestInit({
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ role }),
          }),
        );

        if (!response.ok) {
          let message = "Could not update the user role.";

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

        const updatedUser = (await response.json()) as AdminUser;
        setUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === updatedUser.id ? updatedUser : user,
          ),
        );
        await refreshSession();
      } catch (updateError) {
        Alert.alert(
          "Update failed",
          updateError instanceof Error
            ? updateError.message
            : "Something went wrong.",
        );
      } finally {
        setUpdatingUserId(null);
      }
    },
    [refreshSession],
  );

  const confirmRoleChange = useCallback(
    (user: AdminUser) => {
      const nextRole: AdminUser["role"] =
        user.role === "admin" ? "user" : "admin";
      const action = nextRole === "admin" ? "promote" : "demote";

      Alert.alert(
        `${action.charAt(0).toUpperCase()}${action.slice(1)} user`,
        `Are you sure you want to ${action} ${user.name ?? user.email}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: action === "promote" ? "Promote" : "Demote",
            style: action === "demote" ? "destructive" : "default",
            onPress: () => void updateUserRole(user.id, nextRole),
          },
        ],
      );
    },
    [updateUserRole],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Admin Users</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Manage user roles.
        </Text>
      </View>

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
          <CustomButton
            label="Retry"
            onPress={() => void loadUsers()}
            style={styles.retryButton}
          />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadUsers()}
              tintColor={colors.tint}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isUpdating = updatingUserId === item.id;
            const isCurrentUser = currentUser?.id === item.id;
            const isFirstAdmin = firstAdminId === item.id;
            const nextRole = item.role === "admin" ? "user" : "admin";
            const actionLabel = item.role === "admin" ? "Demote" : "Promote";

            return (
              <View
                style={[
                  styles.userCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {item.name?.trim() || item.email}
                  </Text>
                  <Text style={[styles.userEmail, { color: colors.muted }]}>
                    {item.email}
                  </Text>
                  <View style={styles.roleRow}>
                    <Text style={[styles.roleLabel, { color: colors.muted }]}>
                      Role:
                    </Text>
                    <Text
                      style={[
                        styles.roleValue,
                        {
                          color:
                            item.role === "admin" ? "#16a34a" : colors.text,
                        },
                      ]}
                    >
                      {item.role}
                    </Text>
                  </View>
                </View>

                {item.role === "admin" && (isCurrentUser || isFirstAdmin) ? (
                  <View
                    style={[
                      styles.roleButton,
                      {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.roleButtonText, { color: colors.muted }]}
                    >
                      {isCurrentUser && isFirstAdmin
                        ? "Current admin (first admin)"
                        : isFirstAdmin
                          ? "First admin"
                          : "Current admin"}
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    disabled={isUpdating}
                    onPress={() => confirmRoleChange(item)}
                    style={({ pressed }) => [
                      styles.roleButton,
                      {
                        backgroundColor:
                          item.role === "admin" ? "#fee2e2" : colors.tint,
                        borderColor:
                          item.role === "admin" ? "#ef4444" : colors.tint,
                        opacity: pressed || isUpdating ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        {
                          color:
                            item.role === "admin"
                              ? "#dc2626"
                              : colors.background,
                        },
                      ]}
                    >
                      {isUpdating ? "Updating…" : actionLabel}
                    </Text>
                  </Pressable>
                )}

                <Text style={[styles.meta, { color: colors.muted }]}>
                  Current role: {item.role}
                  {item.role === "admin" && isFirstAdmin
                    ? " · The first admin cannot be demoted"
                    : isCurrentUser && item.role === "admin"
                      ? " · You cannot demote yourself"
                      : ` · Next action: ${nextRole}`}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View
              style={[
                styles.stateBlock,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: colors.muted }}>No users found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  loadingList: {
    marginTop: 2,
  },
  stateBlock: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
  },
  retryButton: {
    minWidth: 100,
  },
  userCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  userInfo: {
    gap: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 14,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  roleValue: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  roleButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  meta: {
    fontSize: 12,
  },
});
