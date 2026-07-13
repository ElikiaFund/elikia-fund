import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupService, type Group, type GroupMember } from '@/services/groupService';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const FREQUENCY_LABELS: Record<Group['frequency'], string> = { weekly: 'Hebdomadaire', monthly: 'Mensuelle' };

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function GroupsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);

      groupService
        .list()
        .then((result) => {
          if (!cancelled) {
            setGroups(result);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.list}>
          <GroupCardSkeleton />
          <GroupCardSkeleton />
          <GroupCardSkeleton />
        </View>
      </ThemedView>
    );
  }

  if (groups.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContent}>
          <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="people-outline" size={28} color={theme.tint} />
          </View>
          <ThemedText type="title" style={styles.title}>
            Épargnez ensemble
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Créez une tontine avec vos proches ou rejoignez-en une grâce à un code d&apos;invitation.
          </ThemedText>

          <View style={styles.cards}>
            <EntryCard
              icon="add"
              iconBackground={theme.tint}
              iconColor={theme.tintForeground}
              title="Créer une tontine"
              subtitle="Montant, fréquence et invitations"
              onPress={() => router.push('/create-group')}
            />
            <EntryCard
              icon="qr-code-outline"
              iconBackground={theme.backgroundSelected}
              iconColor={theme.text}
              title="Rejoindre une tontine"
              subtitle="Avec un code ou un QR code"
              onPress={() => router.push('/join-group')}
            />
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.smallAction, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={() => router.push('/create-group')}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.tint} />
            <ThemedText type="small">Créer</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.smallAction, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={() => router.push('/join-group')}
          >
            <Ionicons name="enter-outline" size={18} color={theme.tint} />
            <ThemedText type="small">Rejoindre</ThemedText>
          </Pressable>
        </View>

        {groups.map((group) => (
          <Pressable
            key={group.id}
            onPress={() => router.push({ pathname: '/group/[id]', params: { id: String(group.id) } })}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              pressed && { backgroundColor: theme.backgroundSelected },
            ]}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardHeading}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {group.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {FREQUENCY_LABELS[group.frequency]} · {currency.format(Number(group.contribution_amount))}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: group.has_paid_current_cycle ? theme.income : theme.backgroundSelected },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{ color: group.has_paid_current_cycle ? theme.tintForeground : theme.textSecondary }}
                >
                  {group.has_paid_current_cycle ? 'À jour' : 'En attente'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.cardBottom}>
              <AvatarStack members={group.members ?? []} theme={theme} />
              <ThemedText type="small" themeColor="textSecondary">
                {group.members_count} membre{(group.members_count ?? 0) > 1 ? 's' : ''}
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={styles.chevron} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

function AvatarStack({ members, theme }: { members: GroupMember[]; theme: ReturnType<typeof useTheme> }) {
  const visible = members.slice(0, 3);
  const overflow = members.length - visible.length;

  return (
    <View style={styles.avatarStack}>
      {visible.map((member, index) => (
        <View
          key={member.id}
          style={[
            styles.stackAvatar,
            { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundElement, marginLeft: index === 0 ? 0 : -10 },
          ]}
        >
          <ThemedText type="small" style={styles.stackAvatarInitials}>
            {initials(member.name)}
          </ThemedText>
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={[
            styles.stackAvatar,
            { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundElement, marginLeft: -10 },
          ]}
        >
          <ThemedText type="small" style={styles.stackAvatarInitials}>
            +{overflow}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function GroupCardSkeleton() {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardHeading}>
          <Skeleton width={140} height={16} />
          <Skeleton width={100} height={13} style={styles.skeletonGap} />
        </View>
        <Skeleton width={64} height={22} borderRadius={999} />
      </View>
      <View style={[styles.cardBottom, styles.skeletonGap]}>
        <Skeleton width={72} height={28} borderRadius={14} />
      </View>
    </View>
  );
}

function EntryCard({
  icon,
  iconBackground,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBackground: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable style={[styles.entryCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]} onPress={onPress}>
      <View style={[styles.groupIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.cardContent}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    padding: Spacing.four,
    paddingTop: Spacing.six,
    alignItems: 'center',
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
  cards: {
    width: '100%',
    gap: Spacing.three,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  smallAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.three,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.three,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardHeading: {
    flex: 1,
    gap: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  stackAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatarInitials: {
    fontSize: 10,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 'auto',
  },
  skeletonGap: {
    marginTop: Spacing.one,
  },
});
