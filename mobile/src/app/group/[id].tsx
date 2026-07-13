import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupService, type Group } from '@/services/groupService';

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

  const load = useCallback(() => {
    setIsLoading(true);
    groupService
      .show(Number(id))
      .then(setGroup)
      .finally(() => setIsLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleContribute() {
    setError(null);
    setIsContributing(true);

    try {
      await groupService.contribute(Number(id));
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

  if (isLoading || !group) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.tint} />
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
        </View>

        {group.has_paid_current_cycle ? (
          <View style={[styles.paidBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.income }]}>
            <Ionicons name="checkmark-circle" size={20} color={theme.income} />
            <ThemedText type="small" style={{ color: theme.income }}>
              Vous avez cotisé pour ce cycle
            </ThemedText>
          </View>
        ) : (
          <Pressable
            onPress={handleContribute}
            disabled={isContributing}
            style={[styles.contributeButton, { backgroundColor: theme.tint }, isContributing && styles.buttonDisabled]}
          >
            {isContributing ? (
              <ActivityIndicator color={theme.tintForeground} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                Cotiser maintenant
              </ThemedText>
            )}
          </Pressable>
        )}

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Membres ({group.members?.length ?? 0})
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
  error: {
    textAlign: 'center',
    marginTop: -Spacing.three,
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
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
