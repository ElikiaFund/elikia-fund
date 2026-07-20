import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useVault } from '@/context/vault-context';
import { useTheme } from '@/hooks/use-theme';
import { buildVaultStatementHtml, printAndShareHtml } from '@/lib/pdf';
import { vaultService, type Vault, type VaultMovement } from '@/services/vaultService';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const RECENT_COUNT = 5;

export default function VaultScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { isUnlocked, lock } = useVault();
  const [vault, setVault] = useState<Vault | null>(null);
  const [movements, setMovements] = useState<VaultMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Refetch vault status every time this tab gains focus, and re-lock every time it loses
  // focus — the PIN protects each visit, not just the first. On a failed refetch (offline),
  // keep whatever was last loaded on screen instead of wiping it — a vault that already
  // exists shouldn't suddenly look like it needs activating just because we're offline.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);

      Promise.all([vaultService.getVault(), vaultService.getMovements().catch(() => [])])
        .then(([vaultResult, movementsResult]) => {
          if (!cancelled) {
            setVault(vaultResult);
            setMovements(movementsResult);
            setIsOffline(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setIsOffline(true);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
            setHasLoadedOnce(true);
          }
        });

      return () => {
        cancelled = true;
        lock();
      };
    }, [lock]),
  );

  async function handleExportStatement() {
    if (!vault) {
      return;
    }

    setIsExporting(true);

    try {
      const html = buildVaultStatementHtml({
        userName: user?.name ?? 'Utilisateur Elikia',
        periodLabel: 'Historique complet',
        balance: Number(vault.balance),
        movements: movements.map((m) => ({
          created_at: m.created_at,
          type: m.type,
          amount: Number(m.amount),
          note: m.note,
        })),
      });

      await printAndShareHtml(html, 'Releve-coffre-Elikia-Fund.pdf');
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le relevé. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading && !hasLoadedOnce) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  if (!vault && isOffline) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="cloud-offline-outline" size={28} color={theme.textSecondary} />
        </View>
        <ThemedText type="title" style={styles.title}>
          Vous êtes hors ligne
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Le coffre nécessite une connexion. Reconnectez-vous pour consulter ou activer votre coffre.
        </ThemedText>
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

  const recentMovements = movements.slice(0, RECENT_COUNT);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {isOffline && (
          <View style={[styles.offlineBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.offlineBannerText}>
              Hors ligne, dernières données connues affichées. Les dépôts et retraits nécessitent une connexion.
            </ThemedText>
          </View>
        )}

        <View style={styles.balanceCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Solde du coffre
          </ThemedText>
          <ThemedText type="title" style={styles.balance}>
            {currency.format(Number(vault.balance))}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <VaultAction
            icon="add-circle-outline"
            label="Déposer"
            disabled={isOffline}
            onPress={() => router.push('/vault-transaction?type=deposit')}
          />
          <VaultAction
            icon="arrow-down-circle-outline"
            label="Retirer"
            disabled={isOffline}
            onPress={() => router.push({ pathname: '/vault-transaction', params: { type: 'withdraw', balance: vault.balance } })}
          />
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold">Activité récente</ThemedText>
          {movements.length > 0 && (
            <Pressable onPress={handleExportStatement} disabled={isExporting} style={styles.exportLink}>
              {isExporting ? (
                <ActivityIndicator size="small" color={theme.tint} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={14} color={theme.tint} />
                  <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                    Relevé PDF
                  </ThemedText>
                </>
              )}
            </Pressable>
          )}
        </View>

        {recentMovements.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyMovements}>
            Aucun mouvement pour l&apos;instant.
          </ThemedText>
        ) : (
          <View style={[styles.movementsCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            {recentMovements.map((movement, index) => (
              <View
                key={movement.id}
                style={[
                  styles.movementRow,
                  index < recentMovements.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                ]}
              >
                <Ionicons
                  name={movement.type === 'deposit' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                  size={20}
                  color={movement.type === 'deposit' ? theme.income : theme.danger}
                />
                <View style={styles.movementContent}>
                  <ThemedText type="small">{movement.type === 'deposit' ? 'Dépôt' : 'Retrait'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {dateFormatter.format(new Date(movement.created_at))}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ color: movement.type === 'deposit' ? theme.income : theme.danger }}>
                  {movement.type === 'deposit' ? '+' : '−'} {currency.format(Number(movement.amount))}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        <Pressable style={[styles.lockButton, { borderColor: theme.border }]} onPress={lock}>
          <Ionicons name="lock-closed-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            Verrouiller le coffre
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

function VaultAction({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      disabled={disabled}
      style={[styles.action, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, disabled && styles.actionDisabled]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={disabled ? theme.textSecondary : theme.text} />
      <ThemedText type="small" themeColor={disabled ? 'textSecondary' : 'text'}>
        {label}
      </ThemedText>
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
    marginBottom: Spacing.six,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingVertical: Spacing.four,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.four,
  },
  offlineBannerText: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  exportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyMovements: {
    paddingVertical: Spacing.three,
  },
  movementsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  movementContent: {
    flex: 1,
    gap: 2,
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
