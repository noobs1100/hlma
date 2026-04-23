import { router } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";
import { getApiBaseUrl } from "@/lib/api-url";
import {
  getCachedCopyDetails,
  refreshCopyDetailsCache,
} from "@/lib/offline-cache";
import { useAuth } from "@/providers/auth-provider";

const apiUrl = getApiBaseUrl();
const DEFAULT_BORROW_DAYS = 14;

type Borrower = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Book = {
  bookId: string;
  title: string;
  author: string;
  genre: string;
  isbn: string | null;
  description: string | null;
};

type Rack = {
  rackId: string;
  description: string | null;
  room: string;
  cupboard: string;
  rack: string;
};

type Copy = {
  copyId: string;
  bookId: string;
  rackId: string;
  status: "borrowed" | "available";
  borrowedByUserId: string | null;
  borrowedByUser?: Borrower | null;
  rack?: Rack | null;
};

type Borrow = {
  borrowId: string;
  copyId: string;
  userId: string;
  borrowDate: string;
  expectedReturnDate: string;
  returnDate: string | null;
  user: Borrower | null;
};

type CopyDetailsResponse = {
  copy: Copy;
  book: Book | null;
  borrows: Borrow[];
};

type CopyDetailsScreenProps = {
  copyId: string | null;
  showBackButton?: boolean;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRackLocation(rack: Rack | null) {
  if (!rack) {
    return "Unavailable";
  }

  return `Room ${rack.room} · Cupboard ${rack.cupboard} · Rack ${rack.rack}`;
}

function getExpectedReturnDate() {
  const expectedReturnDate = new Date();
  expectedReturnDate.setDate(
    expectedReturnDate.getDate() + DEFAULT_BORROW_DAYS,
  );

  return expectedReturnDate.toISOString();
}

export default function CopyDetailsScreen({
  copyId,
  showBackButton = false,
}: CopyDetailsScreenProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [details, setDetails] = useState<CopyDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);
  const [returning, setReturning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!copyId) {
      setError("Copy not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let loadedFromCache = false;

    try {
      const cachedDetails = await getCachedCopyDetails(copyId);

      if (cachedDetails) {
        loadedFromCache = true;
        setDetails(cachedDetails);
        setLoading(false);
      }

      const refreshedDetails = await refreshCopyDetailsCache(copyId);

      if (refreshedDetails) {
        setDetails(refreshedDetails);
      }
    } catch (loadError) {
      if (!loadedFromCache) {
        setDetails(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Something went wrong.",
        );
      }
    } finally {
      if (!loadedFromCache) {
        setLoading(false);
      }
    }
  }, [copyId]);

  useFocusEffect(
    useCallback(() => {
      void loadDetails();
    }, [loadDetails]),
  );

  const handleBorrow = useCallback(async () => {
    if (!copyId || !details?.copy) {
      return;
    }

    if (details.copy.status !== "available") {
      Alert.alert("Unavailable", "This copy is already borrowed.");
      return;
    }

    setBorrowing(true);

    try {
      const response = await fetch(
        `${apiUrl}/api/borrows`,
        getAuthenticatedRequestInit({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            copyId,
            expectedReturnDate: getExpectedReturnDate(),
          }),
        }),
      );

      if (!response.ok) {
        let message = "Could not borrow this copy.";

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

      Alert.alert("Borrowed", "The borrow record was created successfully.");
      await loadDetails();
    } catch (borrowError) {
      Alert.alert(
        "Borrow failed",
        borrowError instanceof Error
          ? borrowError.message
          : "Something went wrong.",
      );
    } finally {
      setBorrowing(false);
    }
  }, [copyId, details?.copy, loadDetails]);

  const handleReturn = useCallback(async () => {
    if (!details?.copy || !details.borrows.length) {
      return;
    }

    const activeBorrow = details.borrows.find((borrow) => !borrow.returnDate);

    if (!activeBorrow) {
      Alert.alert("Unavailable", "This copy does not have an active borrow.");
      return;
    }

    setReturning(true);

    try {
      const response = await fetch(
        `${apiUrl}/api/borrows/${activeBorrow.borrowId}/return`,
        getAuthenticatedRequestInit({ method: "POST" }),
      );

      if (!response.ok) {
        let message = "Could not return this copy.";

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

      Alert.alert("Returned", "The copy was returned successfully.");
      await loadDetails();
    } catch (returnError) {
      Alert.alert(
        "Return failed",
        returnError instanceof Error
          ? returnError.message
          : "Something went wrong.",
      );
    } finally {
      setReturning(false);
    }
  }, [details?.borrows, details?.copy, loadDetails]);

  const handleDelete = useCallback(async () => {
    if (!copyId) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(
        `${apiUrl}/api/copies/${copyId}`,
        getAuthenticatedRequestInit({ method: "DELETE" }),
      );

      if (!response.ok) {
        let message = "Could not delete this copy.";

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

      Alert.alert("Deleted", "The copy was deleted successfully.");
      router.back();
    } catch (deleteError) {
      Alert.alert(
        "Delete failed",
        deleteError instanceof Error
          ? deleteError.message
          : "Something went wrong.",
      );
    } finally {
      setDeleting(false);
    }
  }, [copyId]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      "Delete copy",
      "This will delete the copy and its borrow history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void handleDelete(),
        },
      ],
    );
  }, [handleDelete]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextBlock}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Copy Info
          </Text>
          <Text style={[styles.subheading, { color: colors.muted }]}>
            Shows the current copy, borrower, and borrow history.
          </Text>
        </View>

        {showBackButton ? (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>
              Back
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.stateBlock}>
          <ActivityIndicator color={colors.tint} />
          <Text style={{ color: colors.muted }}>Loading copy details…</Text>
        </View>
      ) : error ? (
        <View
          style={[
            styles.stateBlock,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.text }}>{error}</Text>
          <Pressable
            onPress={() => void loadDetails()}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text
              style={[styles.primaryButtonText, { color: colors.background }]}
            >
              Try Again
            </Text>
          </Pressable>
        </View>
      ) : details ? (
        <View style={styles.content}>
          {details.book ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.muted }]}>
                Book
              </Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {details.book.title}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.muted }]}>
                {details.book.author} · {details.book.genre}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.muted }]}>
                ISBN: {details.book.isbn ?? "—"}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardLabel, { color: colors.muted }]}>
              Copy
            </Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {details.copy.copyId}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.muted }]}>
              Rack ID: {details.copy.rackId}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.muted }]}>
              Location: {formatRackLocation(details.copy.rack ?? null)}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.muted }]}>
              Status: {details.copy.status}
            </Text>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Current Borrower
            </Text>
            {details.copy.borrowedByUser ? (
              <View style={styles.infoBlock}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {details.copy.borrowedByUser.name}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.muted }]}>
                  {details.copy.borrowedByUser.email}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.muted }]}>
                  Role: {details.copy.borrowedByUser.role}
                </Text>
              </View>
            ) : (
              <Text style={{ color: colors.muted }}>
                This copy is currently available.
              </Text>
            )}
          </View>

          <Pressable
            disabled={borrowing || details.copy.status !== "available"}
            onPress={() => void handleBorrow()}
            style={({ pressed }) => [
              styles.borrowButton,
              {
                backgroundColor:
                  details.copy.status === "available"
                    ? colors.tint
                    : colors.border,
                opacity: pressed || borrowing ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.borrowButtonText,
                {
                  color:
                    details.copy.status === "available"
                      ? colors.background
                      : colors.muted,
                },
              ]}
            >
              {borrowing
                ? "Borrowing…"
                : details.copy.status === "available"
                  ? "Borrow Copy"
                  : "Already Borrowed"}
            </Text>
          </Pressable>

          {details.copy.status === "borrowed" ? (
            <Pressable
              disabled={returning}
              onPress={() => void handleReturn()}
              style={({ pressed }) => [
                styles.returnButton,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  opacity: pressed || returning ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.returnButtonText, { color: colors.text }]}>
                {returning ? "Returning…" : "Return Copy"}
              </Text>
            </Pressable>
          ) : null}

          {user?.role === "admin" ? (
            <Pressable
              disabled={deleting}
              onPress={confirmDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: "#dc2626",
                  opacity: pressed || deleting ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.deleteButtonText, { color: "#dc2626" }]}>
                {deleting ? "Deleting…" : "Delete Copy"}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Borrow History
            </Text>
            <Text style={[styles.sectionMeta, { color: colors.muted }]}>
              {details.borrows.length} record
              {details.borrows.length === 1 ? "" : "s"}
            </Text>
          </View>

          {details.borrows.length ? (
            <View style={styles.list}>
              {details.borrows.map((borrow) => (
                <View
                  key={borrow.borrowId}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {borrow.user?.name ?? "Unknown borrower"}
                  </Text>
                  <Text style={[styles.cardMeta, { color: colors.muted }]}>
                    Borrowed: {formatDate(borrow.borrowDate)}
                  </Text>
                  <Text style={[styles.cardMeta, { color: colors.muted }]}>
                    Expected return: {formatDate(borrow.expectedReturnDate)}
                  </Text>
                  <Text style={[styles.cardMeta, { color: colors.muted }]}>
                    Returned: {formatDate(borrow.returnDate)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.stateBlock,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: colors.muted }}>
                No borrow history found.
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
    gap: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
  },
  subheading: {
    fontSize: 14,
  },
  backButton: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  stateBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  content: {
    gap: 12,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardMeta: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionMeta: {
    fontSize: 13,
  },
  infoBlock: {
    gap: 2,
  },
  list: {
    gap: 12,
  },
  borrowButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  borrowButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  returnButton: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: "center",
  },
  returnButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  deleteButton: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
