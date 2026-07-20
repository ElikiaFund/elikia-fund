import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { profileService } from '@/services/profileService';
import { CATALOG_ENABLED_CATEGORIES } from '@/services/productService';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function comingSoon() {
  Alert.alert('Bientôt disponible', 'Cette fonctionnalité arrive prochainement.');
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const hasCatalog = user?.company ? (CATALOG_ENABLED_CATEGORIES as readonly string[]).includes(user.company.category) : false;

  function handleLogout() {
    Alert.alert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: logout },
    ]);
  }

  async function handleChangeAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Photothèque indisponible', "Autorisez l'accès à vos photos pour changer votre avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setIsUploadingAvatar(true);

    try {
      await profileService.uploadAvatar(result.assets[0].uri);
      await refreshUser();
    } catch {
      Alert.alert('Erreur', "Impossible de mettre à jour l'avatar. Veuillez réessayer.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable onPress={handleChangeAvatar} disabled={isUploadingAvatar} style={({ pressed }) => pressed && styles.avatarPressed}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="title" style={styles.avatarInitials}>
                  {user ? initials(user.name) : ''}
                </ThemedText>
              </View>
            )}
            <View style={[styles.avatarBadge, { backgroundColor: theme.tint, borderColor: theme.background }]}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color={theme.tintForeground} />
              ) : (
                <Ionicons name="camera" size={14} color={theme.tintForeground} />
              )}
            </View>
          </Pressable>
          <ThemedText type="title" style={styles.name}>
            {user?.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{user?.email}</ThemedText>
        </View>

        <ProfileSection title="Compte">
          <ProfileRow icon="person-outline" label="Informations personnelles" onPress={() => router.push('/edit-profile')} />
          <ProfileRow
            icon="shield-checkmark-outline"
            label="Sécurité et code PIN"
            onPress={comingSoon}
            last={!hasCatalog}
          />
          {hasCatalog && (
            <ProfileRow icon="pricetags-outline" label="Produits & services" onPress={() => router.push('/products')} last />
          )}
        </ProfileSection>

        <ProfileSection title="Préférences">
          <ProfileRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} last />
        </ProfileSection>

        <ProfileSection title="Assistance">
          <ProfileRow icon="help-circle-outline" label="Aide et support" onPress={comingSoon} />
          <ProfileRow icon="document-text-outline" label="Conditions d'utilisation" onPress={comingSoon} last />
        </ProfileSection>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pressed && { backgroundColor: theme.backgroundSelected },
          ]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.danger} />
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            Se déconnecter
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>{children}</View>
    </View>
  );
}

function ProfileRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}
    >
      <Ionicons name={icon} size={20} color={theme.textSecondary} />
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  avatarPressed: {
    opacity: 0.85,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: Spacing.three,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: Spacing.three - 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    lineHeight: 28,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    marginLeft: Spacing.one,
    marginBottom: Spacing.two,
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  rowLabel: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
});
