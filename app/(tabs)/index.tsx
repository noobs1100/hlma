import Search from "@/components/Search";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { StyleSheet, View } from "react-native";

export default function TabOneScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Search />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
