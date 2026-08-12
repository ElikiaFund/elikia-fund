import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { sheetStyles } from '@/components/select-sheet';
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
const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
const RECENT_COUNT = 5;

const MOVEMENT_META: Record<VaultMovement['type'], { label: string; icon: keyof typeof Ionicons.glyphMap; isCredit: boolean }> = {
  deposit: { label: 'Dépôt', icon: 'arrow-up-circle-outline', isCredit: true },
  withdraw: { label: 'Retrait', icon: 'arrow-down-circle-outline', isCredit: false },
  tontine_payout: { label: 'Versement tontine', icon: 'gift-outline', isCredit: true },
};

// Yabeto's documented "reliable" statuses are pending/processing/succeeded/failed, but
// Stripe-derived extras (requires_confirmation) and undocumented ones (observed in production:
// "incomplete") show up too. Rather than list every transient status we've seen so far
// (guaranteed to miss the next one), terminality is defined by exclusion — matching the
// backend's YabetoStatus — so any status this app doesn't specifically recognize still counts as
// "not resolved yet" instead of silently looking finished.
const TERMINAL_STATUSES = ['succeeded', 'completed', 'failed', 'expired', 'canceled'];
const FAILURE_STATUSES = ['failed', 'expired', 'canceled'];

const KNOWN_STATUS_LABELS: Record<string, string> = {
  succeeded: 'Réussi',
  completed: 'Terminé',
  processing: 'En cours',
  requires_confirmation: 'Confirmation requise',
  failed: 'Échoué',
  expired: 'Expiré',
  canceled: 'Annulé',
};

/** null for a quiet terminal success — every other status (known or not) gets a callout. */
function statusMetaFor(status: string): { label: string; color: 'danger' | 'tint' } | null {
  if (status === 'succeeded' || status === 'completed') {
    return null;
  }

  return { label: KNOWN_STATUS_LABELS[status] ?? status, color: FAILURE_STATUSES.includes(status) ? 'danger' : 'tint' };
}

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
  const [selectedMovement, setSelectedMovement] = useState<VaultMovement | null>(null);
  const [isCheckingMovementStatus, setIsCheckingMovementStatus] = useState(false);

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

  // Derived straight from the already-fetched movements list (server data, not transient local
  // state) — so a deposit/withdrawal stuck `processing` from a past session (app restart, closed
  // mid-flow, etc.) still surfaces a "Vérifier" affordance, not just one created moments ago.
  async function handleCheckMovementStatus(movementId: number) {
    setIsCheckingMovementStatus(true);

    try {
      const updated = await vaultService.refreshMovementStatus(movementId);
      setMovements((current) => current.map((m) => (m.id === updated.id ? updated : m)));

      if (updated.status !== 'processing') {
        // A deposit crediting or a withdrawal refunding both change the balance.
        vaultService.getVault().then(setVault).catch(() => {});
      }
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsCheckingMovementStatus(false);
    }
  }

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
          fee_amount: Number(m.fee_amount),
          net_amount: Number(m.net_amount),
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
  const stuckMovement = movements.find((m) => !TERMINAL_STATUSES.includes(m.status)) ?? null;

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

        {stuckMovement && (
          <View style={[styles.pendingBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.tint }]}>
            <Ionicons name="time-outline" size={16} color={theme.tint} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.pendingBannerText}>
              {MOVEMENT_META[stuckMovement.type].label} en attente de confirmation.
            </ThemedText>
            <Pressable onPress={() => handleCheckMovementStatus(stuckMovement.id)} disabled={isCheckingMovementStatus} hitSlop={8}>
              {isCheckingMovementStatus ? (
                <ActivityIndicator size="small" color={theme.tint} />
              ) : (
                <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                  Vérifier
                </ThemedText>
              )}
            </Pressable>
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
            {recentMovements.map((movement, index) => {
              const meta = MOVEMENT_META[movement.type];
              const statusMeta = statusMetaFor(movement.status);

              return (
                <Pressable
                  key={movement.id}
                  onLongPress={() => setSelectedMovement(movement)}
                  delayLongPress={350}
                  style={({ pressed }) => [
                    styles.movementRow,
                    index < recentMovements.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                    pressed && { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  <Ionicons name={meta.icon} size={20} color={meta.isCredit ? theme.income : theme.danger} />
                  <View style={styles.movementContent}>
                    <ThemedText type="small">{meta.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {dateFormatter.format(new Date(movement.created_at))}
                      {statusMeta ? ' · ' : ''}
                      {statusMeta && <ThemedText type="small" style={{ color: theme[statusMeta.color] }}>{statusMeta.label}</ThemedText>}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold" style={{ color: meta.isCredit ? theme.income : theme.danger }}>
                    {meta.isCredit ? '+' : '−'} {currency.format(Number(movement.amount))}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable style={[styles.lockButton, { borderColor: theme.border }]} onPress={lock}>
          <Ionicons name="lock-closed-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            Verrouiller le coffre
          </ThemedText>
        </Pressable>
      </ScrollView>

      <MovementDetailSheet movement={selectedMovement} onClose={() => setSelectedMovement(null)} />
    </ThemedView>
  );
}

function MovementDetailSheet({ movement, onClose }: { movement: VaultMovement | null; onClose: () => void }) {
  const theme = useTheme();

  if (!movement) {
    return null;
  }

  const meta = MOVEMENT_META[movement.type];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: theme.background }]}>
          <View style={[sheetStyles.handle, { backgroundColor: theme.border }]} />

          <View style={detailStyles.header}>
            <View style={[detailStyles.iconBadge, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name={meta.icon} size={22} color={meta.isCredit ? theme.income : theme.danger} />
            </View>
            <ThemedText type="title" style={detailStyles.amount}>
              {meta.isCredit ? '+' : '−'} {currency.format(Number(movement.amount))}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {meta.label}
            </ThemedText>
          </View>

          <View style={detailStyles.rows}>
            <DetailRow label="Statut" value={KNOWN_STATUS_LABELS[movement.status] ?? movement.status} color={statusMetaFor(movement.status)?.color} />
            <DetailRow label="Date" value={fullDateFormatter.format(new Date(movement.created_at))} />
            {Number(movement.fee_amount) > 0 && (
              <>
                <DetailRow label="Frais" value={currency.format(Number(movement.fee_amount))} />
                <DetailRow label="Montant net" value={currency.format(Number(movement.net_amount))} />
              </>
            )}
            {movement.note && <DetailRow label="Détails" value={movement.note} />}
            {movement.yabeto_reference && <DetailRow label="Référence" value={movement.yabeto_reference} mono />}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, color, mono }: { label: string; value: string; color?: 'danger' | 'tint'; mono?: boolean }) {
  const theme = useTheme();

  return (
    <View style={detailStyles.row}>
      <ThemedText type="small" themeColor="textSecondary" style={detailStyles.rowLabel}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={[detailStyles.rowValue, mono && detailStyles.mono, color && { color: theme[color] }]}>
        {value}
      </ThemedText>
    </View>
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
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.four,
  },
  pendingBannerText: {
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

const detailStyles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  amount: {
    fontSize: 28,
    lineHeight: 34,
  },
  rows: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowLabel: {
    paddingTop: 2,
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
  },
  mono: {
    fontFamily: 'monospace',
  },
});
