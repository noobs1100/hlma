import { Link, Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Pressable } from "react-native";

import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAuth } from "@/providers/auth-provider";

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAdmin = user?.role === "admin";

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
        headerBackButtonDisplayMode: "minimal",
        
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Search Books",
          tabBarIcon: ({ color }) => (
            <SymbolView name="magnifyingglass" tintColor={color} size={28} />
          ),
          headerRight: isAdmin
            ? () => (
                <Link href="/modalForSelection" asChild>
                  <Pressable style={{ marginRight: 15 }}>
                    {({ pressed }) => (
                      <SymbolView
                        name="plus.circle"
                        size={25}
                        tintColor={Colors[colorScheme].text}
                        style={{ opacity: pressed ? 0.5 : 1 }}
                      />
                    )}
                  </Pressable>
                </Link>
              )
            : undefined,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: "Scan QR",
          tabBarIcon: ({ color }) => (
            <SymbolView name="qrcode.viewfinder" tintColor={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="three"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <SymbolView name="person.crop.circle" tintColor={color} size={28} />
          ),
        }}
      />
    </Tabs>
  );
}
