import Search from "@/components/Search";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { Keyboard, Pressable, StyleSheet } from "react-native";

export default function TabOneScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <Pressable
      style={[styles.container, { backgroundColor: colors.background }]}
      onPress={() => Keyboard.dismiss()}
    >
      <Search />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
