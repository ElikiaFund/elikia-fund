import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { useTheme } from '@/hooks/use-theme';
import { vaultService, type Vault } from '@/services/vaultService';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });

export default function VaultScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isUnlocked, lock } = useVault();
  const [vault, setVault] = useState<Vault | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refetch vault status every time this tab gains focus, and re-lock every time it loses
  // focus — the PIN protects each visit, not just the first.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);

      vaultService
        .getVault()
        .then((result) => {
          if (!cancelled) {
            setVault(result);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });

      return () => {
        cancelled = true;
        lock();
      };
    }, [lock]),
  );

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  if (!vault) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="shield-checkmark-outline" size={28} color={theme.tint} />
        </View>
        <ThemedText type="title" style={styles.title}>
          Protégez votre argent
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Créez un code PIN à 4 chiffres pour activer votre coffre et épargner en toute sécurité.
        </ThemedText>
        <Pressable style={[styles.primaryButton, { backgroundColor: theme.tint }]} onPress={() => router.push('/vault-activate')}>
          <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
            Activer le coffre
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (!isUnlocked) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="lock-closed-outline" size={28} color={theme.tint} />
        </View>
        <ThemedText type="title" style={styles.title}>
          Coffre verrouillé
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Entrez votre code PIN pour consulter votre solde.
        </ThemedText>
        <Pressable style={[styles.primaryButton, { backgroundColor: theme.tint }]} onPress={() => router.push('/vault-unlock')}>
          <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
            Déverrouiller le coffre
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.balanceCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Solde du coffre
          </ThemedText>
          <ThemedText type="title" style={styles.balance}>
            {currency.format(Number(vault.balance))}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <VaultAction icon="add-circle-outline" label="Déposer" onPress={() => router.push('/vault-transaction?type=deposit')} />
          <VaultAction
            icon="arrow-down-circle-outline"
            label="Retirer"
            onPress={() => router.push('/vault-transaction?type=withdraw')}
          />
        </View>

        <Pressable style={[styles.lockButton, { borderColor: theme.border }]} onPress={lock}>
          <Ionicons name="lock-closed-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            Verrouiller le coffre
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function VaultAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable style={[styles.action, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={theme.text} />
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  content: {
    flex: 1,
    padding: Spacing.four,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
    maxWidth: 300,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  balanceCard: {
    marginTop: Spacing.three,
  },
  balance: {
    fontSize: 44,
    lineHeight: 50,
    marginTop: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.six,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingVertical: Spacing.four,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.two,
    marginTop: Spacing.six,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
