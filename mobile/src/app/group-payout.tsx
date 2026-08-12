import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PinCodeInput } from '@/components/pin-code-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCycleLabel } from '@/lib/cycle-format';
import { ApiError } from '@/services/apiService';
import { groupService, type PayoutPreview, type PayoutResult } from '@/services/groupService';
import { vaultService } from '@/services/vaultService';

type Step = 'info' | 'pin' | 'success';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function GroupPayoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [preview, setPreview] = useState<PayoutPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [step, setStep] = useState<Step>('info');
  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PayoutResult | null>(null);

  const loadPreview = useCallback(() => {
    setIsLoading(true);
    groupService
      .previewPayout(Number(id))
      .then((data) => {
        setPreview(data);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadPreview();
    }, [loadPreview]),
  );

  function disabledReason(): string | null {
    if (!preview || preview.can_payout) {
      return null;
    }

    if (preview.round_status === 'completed') {
      return preview.blocked_reason;
    }

    if (preview.already_paid_out) {
      return null;
    }

    if (!preview.recipient) {
      return "Aucun bénéficiaire n'est désigné pour ce cycle.";
    }

    if (!preview.recipient.vault_activated) {
      return `${preview.recipient.name} n'a pas encore activé son coffre. Le versement sera possible dès que ce sera fait.`;
    }

    if (!preview.all_paid) {
      return "Tous les membres n'ont pas encore cotisé pour ce cycle.";
    }

    return null;
  }

  async function handlePinChange(text: string) {
    setPin(text);
    setError(null);
    setHasError(false);

    if (text.length !== 4) {
      return;
    }

    setIsSubmitting(true);

    try {
      await vaultService.verifyPin(text);
    } catch (e) {
      setIsSubmitting(false);

      if (e instanceof ApiError && e.status === 404) {
        router.replace('/vault-activate');
        return;
      }

      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
      setHasError(true);
      setPin('');
      return;
    }

    try {
      const cyclePeriod = preview && preview.round_status === 'active' ? preview.cycle_period : undefined;
      const payout = await groupService.payoutCycle(Number(id), cyclePeriod);
      setResult(payout);
      setStep('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
      setStep('info');
      loadPreview();
    } finally {
      setIsSubmitting(false);
    }
  }

  const reason = disabledReason();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        {step !== 'success' && (
          <Pressable
            onPress={() => (step === 'pin' ? setStep('info') : router.back())}
            style={styles.backButton}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
        )}
        <ThemedText type="smallBold" style={styles.headerTitle}>
          Verser la cagnotte
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading && !preview ? (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : !preview ? (
        <View style={[styles.container, styles.centered]}>
          <Ionicons name="cloud-offline-outline" size={28} color={theme.textSecondary} />
          <ThemedText type="title" style={styles.offlineTitle}>
            {loadFailed ? 'Vous êtes hors ligne' : 'Introuvable'}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.offlineSubtitle}>
            Impossible de charger les informations de ce versement.
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {step === 'info' && preview.round_status === 'completed' && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {preview.group_name}
              </ThemedText>
              <ThemedText type="smallBold" style={styles.amountLabel}>
                Tour terminé
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.progressHint}>
                {preview.blocked_reason}
              </ThemedText>
            </View>
          )}

          {step === 'info' && preview.round_status === 'active' && (
            <>
              <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {preview.group_name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.cycleLabel}>
                  {formatCycleLabel(preview, preview.frequency)}
                </ThemedText>

                <ThemedText type="small" themeColor="textSecondary" style={styles.amountLabel}>
                  {preview.all_paid ? 'Montant à verser' : 'Montant actuel (cotisations en cours)'}
                </ThemedText>
                <ThemedText type="title" style={styles.amount}>
                  {currency.format(preview.amount)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.progressHint}>
                  {preview.paid_count}/{preview.members_count} membres ont cotisé
                </ThemedText>
              </View>

              {preview.goal && (
                <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Cette cagnotte financera :
                  </ThemedText>
                  <ThemedText type="smallBold" style={styles.cycleLabel}>
                    {preview.goal.goal_text}
                  </ThemedText>
                </View>
              )}

              <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                  Destinataire
                </ThemedText>
                {preview.recipient ? (
                  <View style={styles.recipientRow}>
                    {preview.recipient.avatar_url ? (
                      <Image source={{ uri: preview.recipient.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.backgroundSelected }]}>
                        <ThemedText type="small" style={styles.avatarInitials}>
                          {initials(preview.recipient.name)}
                        </ThemedText>
                      </View>
                    )}
                    <View style={styles.recipientInfo}>
                      <ThemedText type="smallBold">{preview.recipient.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Versé sur son coffre Elikia Fund
                      </ThemedText>
                    </View>
                    <Ionicons
                      name={preview.recipient.vault_activated ? 'checkmark-circle' : 'alert-circle'}
                      size={20}
                      color={preview.recipient.vault_activated ? theme.income : theme.danger}
                    />
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Aucun bénéficiaire désigné pour ce cycle.
                  </ThemedText>
                )}
              </View>

              {preview.already_paid_out ? (
                <View style={[styles.settledBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.income }]}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.income} />
                  <ThemedText type="small" style={{ color: theme.income }}>
                    Cagnotte déjà versée{preview.recipient ? ` à ${preview.recipient.name}` : ''}
                    {preview.paid_out_at ? ` le ${new Date(preview.paid_out_at).toLocaleDateString('fr-FR')}` : ''}.
                  </ThemedText>
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={() => setStep('pin')}
                    disabled={!preview.can_payout}
                    style={[
                      styles.primaryButton,
                      { backgroundColor: theme.tint },
                      !preview.can_payout && styles.buttonDisabled,
                    ]}
                  >
                    <Ionicons name="cash-outline" size={16} color={theme.tintForeground} />
                    <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                      Verser la cagnotte
                    </ThemedText>
                  </Pressable>
                  {reason && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.reasonText}>
                      {reason}
                    </ThemedText>
                  )}
                </>
              )}
            </>
          )}

          {step === 'pin' && preview.round_status === 'active' && (
            <View style={styles.pinContent}>
              <ThemedText type="title" style={styles.pinTitle}>
                Confirmez avec votre code PIN
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.pinSubtitle}>
                Versement de {currency.format(preview.amount)} à {preview.recipient?.name ?? 'le bénéficiaire'}
              </ThemedText>

              <View style={styles.pinArea}>
                <PinCodeInput value={pin} onChange={handlePinChange} hasError={hasError} autoFocus />
              </View>

              <View style={styles.feedback}>
                {isSubmitting && <ActivityIndicator color={theme.tint} />}
                {error && (
                  <ThemedText type="small" style={{ color: theme.danger }}>
                    {error}
                  </ThemedText>
                )}
              </View>
            </View>
          )}

          {step === 'success' && result && (
            <View style={styles.pinContent}>
              <View style={[styles.successBadge, { backgroundColor: theme.tint }]}>
                <Ionicons name="checkmark" size={32} color={theme.tintForeground} />
              </View>
              <ThemedText type="title" style={styles.pinTitle}>
                Versement effectué
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.pinSubtitle}>
                {currency.format(result.amount)} ont été versés à {result.recipient.user?.name ?? 'le bénéficiaire'}, crédités
                sur son coffre.
              </ThemedText>

              <Pressable onPress={() => router.back()} style={[styles.primaryButton, { backgroundColor: theme.tint }]}>
                <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                  Terminé
                </ThemedText>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 22,
  },
  backButton: {
    width: 22,
  },
  offlineTitle: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  offlineSubtitle: {
    marginTop: Spacing.two,
    textAlign: 'center',
    maxWidth: 280,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  cycleLabel: {
    marginTop: 2,
  },
  amountLabel: {
    marginTop: Spacing.four,
  },
  amount: {
    fontSize: 36,
    lineHeight: 42,
    marginTop: Spacing.one,
  },
  progressHint: {
    marginTop: Spacing.two,
  },
  sectionLabel: {
    marginBottom: Spacing.three,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  recipientInfo: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontWeight: '700',
  },
  settledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.three,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 14,
    paddingVertical: Spacing.three,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  reasonText: {
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  pinContent: {
    flex: 1,
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    paddingTop: Spacing.six,
  },
  pinTitle: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 32,
  },
  pinSubtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.six,
    maxWidth: 300,
  },
  pinArea: {
    minHeight: 64,
  },
  feedback: {
    marginTop: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 24,
  },
  successBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
});
