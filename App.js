import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { DBProvider }   from './src/context/DBContext';
import { MapProvider }  from './src/context/MapContext';
import { colors }       from './src/utils/theme';

import RoomsScreen      from './src/screens/RoomsScreen';
import CabinetsScreen   from './src/screens/CabinetsScreen';
import ShelvesScreen    from './src/screens/ShelvesScreen';
import ItemsScreen      from './src/screens/ItemsScreen';
import ItemDetailScreen from './src/screens/ItemDetailScreen';
import SettingsScreen   from './src/screens/SettingsScreen';
import MapsListScreen   from './src/screens/MapsListScreen';
import MapScreen        from './src/screens/MapScreen';
import LowStockScreen   from './src/screens/LowStockScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <DBProvider>
        <MapProvider>
          <StatusBar style="light" />
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="Rooms"      component={RoomsScreen} />
              <Stack.Screen name="Cabinets"   component={CabinetsScreen} />
              <Stack.Screen name="Shelves"    component={ShelvesScreen} />
              <Stack.Screen name="Items"      component={ItemsScreen} />
              <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
              <Stack.Screen name="Settings"   component={SettingsScreen} />
              <Stack.Screen name="MapsList"   component={MapsListScreen} />
              <Stack.Screen name="Map"        component={MapScreen} />
              <Stack.Screen name="LowStock"   component={LowStockScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </MapProvider>
      </DBProvider>
    </SafeAreaProvider>
  );
}
