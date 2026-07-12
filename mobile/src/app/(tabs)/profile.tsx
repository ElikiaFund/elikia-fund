import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Profil</ThemedText>

      {user && (
        <ThemedView style={styles.info}>
          <ThemedText type="smallBold">{user.name}</ThemedText>
          <ThemedText themeColor="textSecondary">{user.email}</ThemedText>
        </ThemedView>
      )}

      <Pressable style={styles.logoutButton} onPress={logout}>
        <ThemedText type="smallBold">Se déconnecter</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  info: {
    marginTop: Spacing.four,
    gap: Spacing.one,
  },
  logoutButton: {
    marginTop: Spacing.six,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8E8E93',
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
