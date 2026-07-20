import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { SelectSheet } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { formatCycleLabel } from '@/lib/cycle-format';
import { groupService, TONTINE_MANAGEMENT_FEE_RATE, type Group, type GroupCycle, type PaymentMethod } from '@/services/groupService';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const FREQUENCY_LABELS: Record<Group['frequency'], string> = { weekly: 'hebdomadaire', monthly: 'mensuelle' };
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

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
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isContributing, setIsContributing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isContributeFormOpen, setIsContributeFormOpen] = useState(false);
  const [contributionMethod, setContributionMethod] = useState<PaymentMethod | null>(null);
  const [contributionPhone, setContributionPhone] = useState('+242 ');
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [pendingContributionId, setPendingContributionId] = useState<number | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [decidingRequestId, setDecidingRequestId] = useState<number | null>(null);
  const [isRecipientPickerOpen, setIsRecipientPickerOpen] = useState(false);
  const [isDesignatingRecipient, setIsDesignatingRecipient] = useState(false);
  const [cycles, setCycles] = useState<GroupCycle[]>([]);

  const load = useCallback(() => {
    setIsLoading(true);
    groupService.cycles(Number(id)).then(setCycles).catch(() => {});
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

  function handleContributionPhoneChange(text: string) {
    // Keep the +242 country prefix locked in place — only track the local digits.
    setContributionPhone(text.startsWith('+242 ') ? text : `+242 ${text.replace(/^\+?242\s?/, '')}`);
  }

  async function handleContribute() {
    setError(null);
    setPendingNotice(null);
    setIsContributing(true);

    try {
      const contribution = await groupService.contribute(Number(id), contributionMethod ?? undefined, contributionPhone || undefined);

      if (contribution.status === 'processing') {
        setPendingNotice(`Une demande de confirmation a été envoyée au ${contributionPhone}.`);
        setPendingContributionId(contribution.id);
      } else {
        setIsContributeFormOpen(false);
        setContributionMethod(null);
        setContributionPhone('+242 ');
      }

      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsContributing(false);
    }
  }

  async function handleCheckStatus() {
    if (!pendingContributionId) {
      return;
    }

    setIsCheckingStatus(true);

    try {
      const contribution = await groupService.refreshContributionStatus(Number(id), pendingContributionId);

      if (contribution.status !== 'processing') {
        setPendingNotice(null);
        setPendingContributionId(null);
        setIsContributeFormOpen(false);
        setContributionMethod(null);
        setContributionPhone('');
        load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsCheckingStatus(false);
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

  async function handleApproveRequest(requesterId: number) {
    setDecidingRequestId(requesterId);

    try {
      await groupService.approveRequest(Number(id), requesterId);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setDecidingRequestId(null);
    }
  }

  async function handleDeclineRequest(requesterId: number) {
    setDecidingRequestId(requesterId);

    try {
      await groupService.declineRequest(Number(id), requesterId);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setDecidingRequestId(null);
    }
  }

  async function handleDesignateRecipient(recipientId: number) {
    setIsDesignatingRecipient(true);

    try {
      await groupService.designateRecipient(Number(id), recipientId);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsDesignatingRecipient(false);
    }
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

  if (group.membership_status === 'pending') {
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

        <View style={[styles.container, styles.centered]}>
          <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="time-outline" size={28} color={theme.tint} />
          </View>
          <ThemedText type="title" style={styles.offlineTitle}>
            Demande en attente
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.offlineSubtitle}>
            Votre demande pour rejoindre « {group.name} » a été envoyée au créateur de la tontine. Vous pourrez cotiser
            dès qu&apos;elle sera approuvée.
          </ThemedText>
        </View>
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
            gestion ({TONTINE_MANAGEMENT_FEE_RATE * 100}%) net versé à la tontine :{' '}
            {currency.format(Number(group.contribution_amount) * (1 - TONTINE_MANAGEMENT_FEE_RATE))}
          </ThemedText>
        </View>

        <View style={[styles.cycleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.cycleRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.cycleRowText}>
              {group.schedule_label ?? `Cycle en cours : ${group.current_cycle_period}`}
              {group.cycle_ends_at ? ` · échéance le ${dateTimeFormatter.format(new Date(group.cycle_ends_at))}` : ''}
            </ThemedText>
          </View>
          <View style={styles.cycleRow}>
            <Ionicons name="gift-outline" size={16} color={theme.textSecondary} />
            {group.current_cycle_recipient?.user ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.cycleRowText}>
                Bénéficiaire de ce cycle : <ThemedText type="smallBold">{group.current_cycle_recipient.user.name}</ThemedText>
              </ThemedText>
            ) : group.recipient_mode === 'admin' && group.owner_id === user?.id ? (
              <Pressable onPress={() => setIsRecipientPickerOpen(true)} style={styles.designateLink}>
                <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                  Désigner le bénéficiaire de ce cycle
                </ThemedText>
              </Pressable>
            ) : (
              <ThemedText type="small" themeColor="textSecondary" style={styles.cycleRowText}>
                Bénéficiaire pas encore désigné
              </ThemedText>
            )}
          </View>
        </View>

        {group.owner_id === user?.id && (group.pending_members?.length ?? 0) > 0 && (
          <View style={styles.requestsSection}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Demandes d&apos;adhésion ({group.pending_members?.length})
            </ThemedText>
            <View style={[styles.membersCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {group.pending_members?.map((member, index) => (
                <View
                  key={member.id}
                  style={[
                    styles.requestRow,
                    index < (group.pending_members?.length ?? 0) - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText style={styles.memberName} numberOfLines={1}>
                    {member.name}
                  </ThemedText>
                  {decidingRequestId === member.id ? (
                    <ActivityIndicator size="small" color={theme.tint} />
                  ) : (
                    <View style={styles.requestActions}>
                      <Pressable onPress={() => handleDeclineRequest(member.id)} hitSlop={8} style={styles.requestActionButton}>
                        <Ionicons name="close-circle-outline" size={24} color={theme.danger} />
                      </Pressable>
                      <Pressable onPress={() => handleApproveRequest(member.id)} hitSlop={8} style={styles.requestActionButton}>
                        <Ionicons name="checkmark-circle-outline" size={24} color={theme.income} />
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

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
              onChangeText={handleContributionPhoneChange}
              placeholder="+242 06 000 00 00"
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
            <Pressable onPress={handleCheckStatus} disabled={isCheckingStatus} hitSlop={8}>
              {isCheckingStatus ? (
                <ActivityIndicator size="small" color={theme.tint} />
              ) : (
                <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                  Vérifier
                </ThemedText>
              )}
            </Pressable>
          </View>
        )}

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Membres ({group.members?.length ?? 0}/{group.max_members ?? 1000})
        </ThemedText>
        <View style={[styles.membersCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {group.members?.map((member, index) => {
            const paid = (group.contributions ?? []).some(
              (c) => c.user_id === member.id && c.cycle_period === group.current_cycle_period && c.status === 'succeeded',
            );

            return (
              <View
                key={member.id}
                style={[
                  styles.memberRow,
                  index < (group.members?.length ?? 0) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                ]}
              >
                {member.avatar_url ? (
                  <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="small" style={styles.avatarInitials}>
                      {initials(member.name)}
                    </ThemedText>
                  </View>
                )}
                <ThemedText style={styles.memberName} numberOfLines={1}>
                  {member.name}
                  {member.id === group.owner_id ? ' · Créateur' : ''}
                </ThemedText>
                <Ionicons name={paid ? 'checkmark-circle' : 'time-outline'} size={18} color={paid ? theme.income : theme.textSecondary} />
              </View>
            );
          })}
        </View>

        {cycles.length > 0 && (
          <>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Cycles
            </ThemedText>
            <View style={[styles.membersCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {cycles.map((cycleItem, index) => (
                <Pressable
                  key={cycleItem.cycle_period}
                  onPress={() => router.push({ pathname: '/group-report', params: { id: String(group.id), cycle: cycleItem.cycle_period } })}
                  style={[
                    styles.cycleRowItem,
                    index < cycles.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={styles.cycleRowContent}>
                    <ThemedText type="small">{formatCycleLabel(cycleItem, group.frequency)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {cycleItem.is_current ? 'Cycle en cours' : `${cycleItem.paid_count} / ${cycleItem.members_count} ont cotisé`}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </Pressable>
              ))}
            </View>
          </>
        )}

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

      <SelectSheet
        visible={isRecipientPickerOpen}
        title="Bénéficiaire de ce cycle"
        options={(group.members ?? []).map((member) => ({ label: member.name, value: String(member.id) }))}
        selectedValue={group.current_cycle_recipient?.user_id ? String(group.current_cycle_recipient.user_id) : ''}
        onSelect={(value) => handleDesignateRecipient(Number(value))}
        onClose={() => setIsRecipientPickerOpen(false)}
      />
      {isDesignatingRecipient && (
        <View style={styles.designatingOverlay}>
          <ActivityIndicator color={theme.tint} />
        </View>
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
  badge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
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
  cycleCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.five,
    gap: Spacing.two,
  },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cycleRowText: {
    flex: 1,
  },
  designateLink: {
    flex: 1,
  },
  requestsSection: {
    marginBottom: Spacing.five,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  requestActionButton: {
    padding: Spacing.half,
  },
  designatingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
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
  cycleRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  cycleRowContent: {
    flex: 1,
    gap: 2,
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
  },
  avatarFallback: {
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
