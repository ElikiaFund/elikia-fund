import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupService, TONTINE_MANAGEMENT_FEE_RATE, type Group, type PaymentMethod } from '@/services/groupService';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const FREQUENCY_LABELS: Record<Group['frequency'], string> = { weekly: 'hebdomadaire', monthly: 'mensuelle' };

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function GroupDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isContributing, setIsContributing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isContributeFormOpen, setIsContributeFormOpen] = useState(false);
  const [contributionMethod, setContributionMethod] = useState<PaymentMethod | null>(null);
  const [contributionPhone, setContributionPhone] = useState('');
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    groupService
      .show(Number(id))
      .then((result) => {
        setGroup(result);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleContribute() {
    setError(null);
    setPendingNotice(null);
    setIsContributing(true);

    try {
      const contribution = await groupService.contribute(Number(id), contributionMethod ?? undefined, contributionPhone || undefined);

      if (contribution.status === 'processing') {
        setPendingNotice(`Une demande de confirmation a été envoyée au ${contributionPhone}.`);
      } else {
        setIsContributeFormOpen(false);
        setContributionMethod(null);
        setContributionPhone('');
      }

      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsContributing(false);
    }
  }

  async function handleShare() {
    if (!group) {
      return;
    }

    await Share.share({
      message: `Rejoins ma tontine "${group.name}" sur Elikia Fund avec le code ${group.invite_code}.`,
    });
  }

  if (isLoading && !group) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  if (!group) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Ionicons name="cloud-offline-outline" size={28} color={theme.textSecondary} />
        <ThemedText type="title" style={styles.offlineTitle}>
          {loadFailed ? 'Vous êtes hors ligne' : 'Introuvable'}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.offlineSubtitle}>
          {loadFailed
            ? 'Cette tontine nécessite une connexion. Reconnectez-vous pour la consulter.'
            : "Cette tontine n'existe pas ou plus."}
        </ThemedText>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.offlineBack}>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            Retour
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.headerTitle}>
          {group.name}
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Cotisation {FREQUENCY_LABELS[group.frequency]}
          </ThemedText>
          <ThemedText type="title" style={styles.amount}>
            {currency.format(Number(group.contribution_amount))}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.feeHint}>
            Dont {currency.format(Number(group.contribution_amount) * TONTINE_MANAGEMENT_FEE_RATE)} de frais de
            gestion ({TONTINE_MANAGEMENT_FEE_RATE * 100}%) — net versé à la tontine :{' '}
            {currency.format(Number(group.contribution_amount) * (1 - TONTINE_MANAGEMENT_FEE_RATE))}
          </ThemedText>
        </View>

        {group.has_paid_current_cycle ? (
          <View style={[styles.paidBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.income }]}>
            <Ionicons name="checkmark-circle" size={20} color={theme.income} />
            <ThemedText type="small" style={{ color: theme.income }}>
              Vous avez cotisé pour ce cycle
            </ThemedText>
          </View>
        ) : isContributeFormOpen ? (
          <View style={[styles.contributeForm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.contributeFormLabel}>
              Moyen de paiement
            </ThemedText>
            <View style={styles.methodRow}>
              <Pressable
                onPress={() => setContributionMethod('mtn_momo')}
                style={[
                  styles.methodPill,
                  { borderColor: contributionMethod === 'mtn_momo' ? theme.tint : theme.border },
                  contributionMethod === 'mtn_momo' && { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <ThemedText type="small">MTN Mobile Money</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setContributionMethod('airtel_money')}
                style={[
                  styles.methodPill,
                  { borderColor: contributionMethod === 'airtel_money' ? theme.tint : theme.border },
                  contributionMethod === 'airtel_money' && { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <ThemedText type="small">Airtel Money</ThemedText>
              </Pressable>
            </View>

            <TextInput
              value={contributionPhone}
              onChangeText={setContributionPhone}
              placeholder="Numéro Mobile Money (+242 ...)"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              style={[styles.phoneInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />

            <View style={styles.contributeFormActions}>
              <Pressable
                onPress={() => {
                  setIsContributeFormOpen(false);
                  setError(null);
                }}
                style={styles.cancelButton}
              >
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Annuler
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleContribute}
                disabled={isContributing}
                style={[styles.contributeButton, styles.confirmButton, { backgroundColor: theme.tint }, isContributing && styles.buttonDisabled]}
              >
                {isContributing ? (
                  <ActivityIndicator color={theme.tintForeground} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                    Confirmer la cotisation
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setIsContributeFormOpen(true)}
            style={[styles.contributeButton, { backgroundColor: theme.tint }]}
          >
            <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
              Cotiser maintenant
            </ThemedText>
          </Pressable>
        )}

        {pendingNotice && (
          <View style={[styles.pendingBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Ionicons name="time-outline" size={16} color={theme.tint} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.pendingBannerText}>
              {pendingNotice}
            </ThemedText>
          </View>
        )}

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Membres ({group.members?.length ?? 0}
          {group.max_members ? `/${group.max_members}` : ''})
        </ThemedText>
        <View style={[styles.membersCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {group.members?.map((member, index) => {
            const paid = (group.contributions ?? []).some(
              (c) => c.user_id === member.id && c.cycle_period === group.current_cycle_period,
            );

            return (
              <View
                key={member.id}
                style={[
                  styles.memberRow,
                  index < (group.members?.length ?? 0) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="small" style={styles.avatarInitials}>
                    {initials(member.name)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.memberName} numberOfLines={1}>
                  {member.name}
                  {member.id === group.owner_id ? ' · Créateur' : ''}
                </ThemedText>
                <Ionicons name={paid ? 'checkmark-circle' : 'time-outline'} size={18} color={paid ? theme.income : theme.textSecondary} />
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={() => router.push({ pathname: '/group-report', params: { id: String(group.id) } })}
          style={[styles.reportLink, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        >
          <Ionicons name="document-text-outline" size={18} color={theme.tint} />
          <ThemedText type="smallBold" style={styles.reportLinkText}>
            Rapport du dernier cycle
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </Pressable>

        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Inviter des membres
        </ThemedText>
        <View style={[styles.inviteCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.qrWrap}>
            <QRCode value={group.invite_code} size={140} backgroundColor="#FFFFFF" color="#000000" />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.inviteHint}>
            Code d&apos;invitation
          </ThemedText>
          <ThemedText type="title" style={styles.inviteCode}>
            {group.invite_code}
          </ThemedText>
          <Pressable onPress={handleShare} style={[styles.shareButton, { borderColor: theme.tint }]}>
            <Ionicons name="share-social-outline" size={18} color={theme.tint} />
            <ThemedText type="smallBold" style={{ color: theme.tint }}>
              Partager l&apos;invitation
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
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
  offlineTitle: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  offlineSubtitle: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
    textAlign: 'center',
    maxWidth: 280,
  },
  offlineBack: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 22,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  summaryCard: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  amount: {
    fontSize: 36,
    lineHeight: 42,
    marginTop: Spacing.one,
  },
  feeHint: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  paidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.five,
  },
  contributeButton: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  contributeForm: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.five,
    gap: Spacing.two,
  },
  contributeFormLabel: {
    marginBottom: Spacing.half,
  },
  methodRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  methodPill: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  phoneInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  contributeFormActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  cancelButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  confirmButton: {
    flex: 1,
    marginBottom: 0,
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
  error: {
    textAlign: 'center',
    marginTop: -Spacing.three,
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
  },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.five,
  },
  reportLinkText: {
    flex: 1,
  },
  membersCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    marginBottom: Spacing.five,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontWeight: '700',
  },
  memberName: {
    flex: 1,
  },
  inviteCard: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.four,
  },
  qrWrap: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.three,
    borderRadius: 16,
    marginBottom: Spacing.three,
  },
  inviteHint: {
    marginBottom: Spacing.one,
  },
  inviteCode: {
    fontSize: 24,
    letterSpacing: 4,
    marginBottom: Spacing.four,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
