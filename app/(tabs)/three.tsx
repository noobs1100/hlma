import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Alert, StyleSheet } from 'react-native';

import CustomButton from '@/components/CustomButton';
import { View } from '@/components/Themed';

export default function TabThreeScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {} },
      { text: 'Logout', onPress: () => {} },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      <CustomButton label="Logout" onPress={handleLogout} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  button: {
    width: 100,
    height: 50,
  },
});
