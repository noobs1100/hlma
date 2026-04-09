import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider } from "@/providers/auth-provider";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "index",
};

export default function RootLayout() {
  // Expo Router uses Error Boundaries to catch errors in the navigation tree.

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="sign-up" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          <Stack.Screen
            name="modalForSelection"
            options={{ title: "Click on Any One " }}
          />
          <Stack.Screen
            name="(add stuff)/scanner"
            options={{ presentation: "modal", title: "Scan Rack Code" }}
          />
          <Stack.Screen
            name="(add stuff)/book"
            options={{ presentation: "modal", title: "Add New Book" }}
          />
          <Stack.Screen
            name="(add stuff)/copy"
            options={{ title: "Add New Copy" }}
          />
          <Stack.Screen
            name="(add stuff)/book-picker"
            options={{ presentation: "modal", title: "Select Book" }}
          />
          <Stack.Screen
            name="(add stuff)/rack-picker"
            options={{ presentation: "modal", title: "Select Rack" }}
          />
          <Stack.Screen name="racks" options={{ title: "Racks" }} />
          <Stack.Screen name="books" options={{ title: "Info", headerBackTitle: "Search"}}/>
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
