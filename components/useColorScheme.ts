import { useColorScheme as useColorSchemeCore } from 'react-native';

export const useColorScheme = () => {
  const coreScheme = useColorSchemeCore();
  return (coreScheme as string | null) === 'unspecified' ? 'light' : coreScheme;
};
