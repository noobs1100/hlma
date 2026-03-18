import Colors from '@/constants/Colors';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { useColorScheme } from './useColorScheme';

const Search = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Searchbar
      placeholder="Search"
      onChangeText={setSearchQuery}
      value={searchQuery}
      style={[styles.searchArea, { backgroundColor: colors.inputBackground }]}
      placeholderTextColor={colors.inputPlaceholder}
      inputStyle={{ color: colors.inputText }}
      keyboardAppearance={colorScheme === 'dark' ? 'dark' : 'light'}
    />
  );
};

export default Search;

const styles = StyleSheet.create({
  searchArea: {
    margin: 10,
  },
})