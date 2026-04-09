import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { router } from "expo-router";
import { Alert, StyleSheet } from "react-native";

import CustomButton from "@/components/CustomButton";
import { Text, View } from "@/components/Themed";
import { useAuth } from "@/providers/auth-provider";

export default function TabThreeScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const { user, logout, isLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Logout",
        onPress: async () => {
          await logout();
          router.replace("/sign-in");
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme].background },
      ]}
    >
      <CustomButton
        label={
          isLoading ? "Loading…" : (user?.name ?? user?.email ?? "Profile")
        }
        onPress={() => {}}
        style={styles.profileButton}
      />
      <Text style={styles.emailText}>
        {isLoading ? "Loading email…" : (user?.email ?? "No email available")}
      </Text>
      <CustomButton
        label="View Racks"
        onPress={() => router.push("/racks")}
        style={styles.button}
      />
      {isAdmin ? (
        <CustomButton
          label="Admin Menu"
          onPress={() => router.push("/admin")}
          style={styles.button}
        />
      ) : null}
      <CustomButton
        label="Logout"
        onPress={handleLogout}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  profileButton: {
    width: "100%",
    height: 50,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "500",
  },
  button: {
    width: "100%",
    height: 50,
  },
});
