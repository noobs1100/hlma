import { Stack } from "expo-router";

export default function BooksLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "default",
        headerShown: false,
      }}
    >
      <Stack.Screen name="[bookId]/index" options={{ title: "Book Info" }} />
      <Stack.Screen
        name="[bookId]/copies/[copyId]"
        options={{ title: "Copy Info" }}
      />
    </Stack>
  );
}
