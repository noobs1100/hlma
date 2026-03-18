import Colors from '@/constants/Colors';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useColorScheme } from './useColorScheme';

interface CustomButtonProps {
  label: string;
  onPress: () => void;
  style?: object;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  label,
  onPress,
  style,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.tint,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: colors.background }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CustomButton;
