import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompanySelectSheet } from '@/components/company-select-sheet';
import { ThemedText } from '@/components/themed-text';
import { Wordmark } from '@/components/wordmark';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCompany } from '@/context/company-context';
import { useTheme } from '@/hooks/use-theme';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Shared, minimal header for every authenticated tab — deliberately doesn't repeat the
// active screen's name (the tab bar + each screen's own heading already convey that).
export function TabHeader() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const router = useRouter();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  return (
    <View style={{ backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.row}>
        <Wordmark size={16} />

        <Pressable
          onPress={() => setIsSwitcherOpen(true)}
          hitSlop={8}
          style={[styles.companyChip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        >
          <ThemedText type="small" numberOfLines={1} style={styles.companyChipLabel}>
            {activeCompany?.name ?? 'Aucune entreprise'}
          </ThemedText>
          <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
        </Pressable>

        <Pressable onPress={() => router.push('/profile')} hitSlop={8}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" style={styles.avatarInitials}>
                {user ? initials(user.name) : ''}
              </ThemedText>
            </View>
          )}
        </Pressable>
      </View>

      <CompanySelectSheet visible={isSwitcherOpen} onClose={() => setIsSwitcherOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  companyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
    marginHorizontal: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
  },
  companyChipLabel: {
    flexShrink: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontWeight: '700',
  },
});
