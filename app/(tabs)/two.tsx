import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

interface ScannedItem {
  id: string;
  code: string;
  timestamp: string;
  type: string;
}

const VALID_CODE_PATTERN = /^[A-Za-z0-9+/]{6}(={0,2})$/; // Base64 string of length 6

const validateCode = (code: string): boolean => {
  return VALID_CODE_PATTERN.test(code) && code.length === 6;
};

export default function TabTwoScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [inventory, setInventory] = useState<ScannedItem[]>([]);
  const [invalidCodes, setInvalidCodes] = useState<string[]>([]);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setCameraActive(true);
      if (!permission?.granted) {
        requestPermission();
      }
      return () => {
        setCameraActive(false);
      };
    }, [permission])
  );

  const handleBarcodeScanned = ({ data, type }: { data: string; type?: string }) => {
    if (!scanned) {
      console.log('Scanned Code Data:', data);
      console.log('Code Type:', type);

      if (validateCode(data)) {
        // Check if code already exists in inventory
        const codeExists = inventory.some((item) => item.code === data);

        if (!codeExists) {
          const newItem: ScannedItem = {
            id: data, // Use the code itself as ID to ensure uniqueness
            code: data,
            timestamp: new Date().toLocaleTimeString(),
            type: type || 'unknown',
          };

          setInventory([newItem, ...inventory]);
          console.log('✓ Code added to inventory:', data);
          console.log('Total unique codes:', inventory.length + 1);
        } else {
          console.log('✗ Duplicate code detected:', data);
        }

        setLastScannedCode(data);
        setScanned(true);

        // Auto-reset for continuous scanning
        setTimeout(() => setScanned(false), 500);
      } else {
        if (!invalidCodes.includes(data)) {
          setInvalidCodes([...invalidCodes, data]);
        }
        console.log('✗ Invalid code format:', data);
        setLastScannedCode(null);
        setScanned(true);

        // Auto-reset for continuous scanning
        setTimeout(() => setScanned(false), 50);
      }
    }
  };

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
        <Text style={styles.title}>Camera Permission Required</Text>
        <Text>Please grant camera permission to use the QR scanner.</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}
    >
      <View style={[styles.cameraContainer, { borderColor: Colors[colorScheme].border }]}>
        {cameraActive && (
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'datamatrix'],
            }}
          />
        )}
      </View>

      {lastScannedCode && (
        <View style={[styles.lastScannedContainer, { backgroundColor: Colors[colorScheme].card }]}>
          <Text style={[styles.lastScannedLabel, { color: Colors[colorScheme].muted }]}>
            Last Scanned
          </Text>
          <Text style={[styles.lastScannedCode, { color: Colors[colorScheme].tint }]}>
            {lastScannedCode}
          </Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        <Text style={[styles.statsText, { color: Colors[colorScheme].text }]}>
          Valid: {inventory.length} | Invalid: {invalidCodes.length}
        </Text>
      </View>

      {inventory.length > 0 && (
        <ScrollView
          style={[styles.listContainer, { backgroundColor: Colors[colorScheme].card }]}
          nestedScrollEnabled={true}
        >
          <Text style={[styles.listTitle, { color: Colors[colorScheme].text }]}>
            Inventory List
          </Text>
          <FlatList
            data={inventory}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.inventoryItem,
                  { borderBottomColor: Colors[colorScheme].border },
                ]}
              >
                <Text style={[styles.itemCode, { color: Colors[colorScheme].tint }]}>
                  {item.code}
                </Text>
                <Text style={[styles.itemTime, { color: Colors[colorScheme].muted }]}>
                  {item.timestamp}
                </Text>
              </View>
            )}
            scrollEnabled={false}
          />
        </ScrollView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  cameraContainer: {
    width: 300,
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#ccc',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsContainer: {
    marginTop: 15,
    paddingHorizontal: 20,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastScannedContainer: {
    marginTop: 10,
    marginHorizontal: 10,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lastScannedLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastScannedCode: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  listContainer: {
    marginTop: 15,
    marginHorizontal: 10,
    borderRadius: 8,
    height: 200,
    width: '90%',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  inventoryItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  itemCode: {
    fontSize: 13,
    fontWeight: '500',
  },
  itemTime: {
    fontSize: 11,
    marginTop: 4,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
