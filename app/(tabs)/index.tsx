import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Keyboard, Pressable, StyleSheet } from 'react-native';


import Search from '@/components/Search';
import { View } from '@/components/Themed';

export default function TabOneScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
  
    <Pressable style={styles.container} onPress={() => Keyboard.dismiss()}>
      <Search/>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
