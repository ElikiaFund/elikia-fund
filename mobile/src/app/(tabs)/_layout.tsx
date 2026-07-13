import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabHeader } from '@/components/tab-header';
import { useTheme } from '@/hooks/use-theme';

const ICON_SIZE = 21;

export default function TabsLayout() {
  const theme = useTheme();
  // Some Android phones render their own gesture/button nav bar below our tab bar — the
  // safe-area bottom inset tells us how tall that reserved system area is, so we can pad
  // for it instead of using one fixed value that's wrong on some devices.
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        header: () => <TabHeader />,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 10,
        },
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Coffre',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'lock-closed' : 'lock-closed-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Tontines',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  focused: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={styles.iconSlot}>
      {focused && <View style={[styles.pill, { backgroundColor: theme.tint }]} />}
      <Ionicons name={name} size={ICON_SIZE} color={focused ? theme.tintForeground : color} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconSlot: {
    width: 48,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    width: 48,
    height: 28,
    borderRadius: 14,
  },
});
