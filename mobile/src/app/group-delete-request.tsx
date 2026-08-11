import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { groupService, type Group, type GroupDeletionRequest } from '@/services/groupService';

type Theme = ReturnType<typeof useTheme>;

function formatTimeRemaining(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();

  if (diffMs <= 0) {
    return 'Expire sous peu';
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours > 0 ? `${days} j ${remHours} h restants` : `${days} j restants`;
  }

  if (hours > 0) {
    return `${hours} h ${minutes} min restantes`;
  }

  return `${minutes} min restantes`;
}

export default function GroupDeleteRequestScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);

  const [group, setGroup] = useState<Group | null>(null);
  const [deletionRequest, setDeletionRequest] = useState<GroupDeletionRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  // Synchronous guard against a double-tap landing before React re-renders the button's
  // disabled prop — matters even more here, since a double-fire could cast two conflicting
  // votes or send two deletion requests.
  const isSubmittingRef = useRef(false);

  const load = useCallback(() => {
    setIsLoading(true);
    Promise.all([groupService.show(groupId), groupService.getDeletionRequest(groupId)])
      .then(([groupResult, requestResult]) => {
        setGroup(groupResult);
        setDeletionRequest(requestResult);
      })
      .finally(() => setIsLoading(false));
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Live-ticking countdown — re-render every minute so "restantes" stays accurate without
  // requiring a manual refresh.
  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const isOwner = !!group && !!user && group.owner_id === user.id;
  const isPending = deletionRequest?.status === 'pending';
  const isRequester = !!deletionRequest && !!user && deletionRequest.requested_by === user.id;
  // Defensive, not just `deletionRequest?.votes` — `?.` only guards deletionRequest itself, and
  // votes should always be eager-loaded by the API, but a missing/not-yet-loaded array here must
  // never crash the screen.
  const votes = deletionRequest?.votes ?? [];
  const myVote = votes.find((v) => v.user_id === user?.id) ?? null;

  const approvedCount = votes.filter((v) => v.decision === 'approved').length;
  const declinedCount = votes.filter((v) => v.decision === 'declined').length;
  const totalMembers = group?.members_count ?? 0;
  const pendingVoterCount = Math.max(totalMembers - approvedCount - declinedCount, 0);

  async function handlePropose() {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      const created = await groupService.requestDeletion(groupId);

      if (created.status === 'approved') {
        router.replace('/groups');
        return;
      }

      setDeletionRequest(created);
      setConfirmText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleVote(decision: 'approved' | 'declined') {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await groupService.castDeletionVote(groupId, decision);

      if (result.outcome === 'approved') {
        router.replace('/groups');
        return;
      }

      if (result.outcome === 'rejected') {
        router.back();
        return;
      }

      setDeletionRequest(result.deletion_request);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      await groupService.cancelDeletionRequest(groupId);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (isLoading || !group) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  const canConfirmPropose = confirmText.trim().length > 0 && confirmText.trim() === group.name.trim();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {!isPending ? (
          isOwner ? (
            <>
              <View style={[styles.badge, { backgroundColor: `${theme.danger}1A` }]}>
                <Ionicons name="warning-outline" size={28} color={theme.danger} />
              </View>
              <ThemedText type="title" style={styles.title}>
                Supprimer « {group.name} » ?
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                Supprimer une tontine qui a d&apos;autres membres nécessite leur accord — voici comment ça se passe.
              </ThemedText>

              <View style={[styles.infoList, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                <InfoRow
                  theme={theme}
                  icon="people-outline"
                  text={`Tous les membres (${totalMembers}) recevront une notification pour approuver ou refuser.`}
                />
                <InfoRow theme={theme} icon="time-outline" text="Chaque membre a 48 heures pour répondre." />
                <InfoRow
                  theme={theme}
                  icon="checkmark-done-outline"
                  text="Sans réponse après ce délai, le vote d'un membre compte comme une approbation."
                />
                <InfoRow
                  theme={theme}
                  icon="close-circle-outline"
                  text="La suppression n'est bloquée que si la majorité des membres refuse explicitement."
                  last
                />
              </View>

              <View style={[styles.reassurance, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.reassuranceText}>
                  Si la suppression est approuvée, toutes les cotisations, tous les versements et tout l&apos;historique de cette
                  tontine seront définitivement perdus.
                </ThemedText>
              </View>

              <ThemedText type="small" themeColor="textSecondary" style={styles.confirmLabel}>
                Tapez « {group.name} » pour confirmer
              </ThemedText>
              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder={group.name}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              />

              {error && (
                <ThemedText type="small" style={[styles.errorText, { color: theme.danger }]}>
                  {error}
                </ThemedText>
              )}

              <Pressable
                onPress={handlePropose}
                disabled={!canConfirmPropose || isSubmitting}
                style={[
                  styles.dangerButton,
                  { backgroundColor: theme.danger },
                  (!canConfirmPropose || isSubmitting) && styles.buttonDisabled,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText type="smallBold" style={styles.dangerButtonText}>
                    Envoyer la demande de suppression
                  </ThemedText>
                )}
              </Pressable>
            </>
          ) : (
            <View style={styles.emptyState}>
              <ThemedText themeColor="textSecondary">Aucune demande de suppression en cours pour cette tontine.</ThemedText>
            </View>
          )
        ) : (
          <>
            <View style={[styles.badge, { backgroundColor: `${theme.tint}1A` }]}>
              <Ionicons name="people-circle-outline" size={28} color={theme.tint} />
            </View>
            <ThemedText type="title" style={styles.title}>
              Vote de suppression en cours
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {deletionRequest?.requester?.name ?? 'Le créateur'} propose de supprimer « {group.name} ».
            </ThemedText>

            <View style={[styles.countdownBox, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="time-outline" size={18} color={theme.tint} />
              <ThemedText type="smallBold">{deletionRequest && formatTimeRemaining(deletionRequest.expires_at)}</ThemedText>
            </View>

            <View style={[styles.tallyBox, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <View style={styles.tallyRow}>
                <TallyStat label="Approuvé" value={approvedCount} color={theme.income} />
                <TallyStat label="Refusé" value={declinedCount} color={theme.danger} />
                <TallyStat label="Sans réponse" value={pendingVoterCount} color={theme.textSecondary} />
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.tallyHint}>
                Sans réponse après le délai, un membre est compté comme ayant approuvé.
              </ThemedText>
            </View>

            {error && (
              <ThemedText type="small" style={[styles.errorText, { color: theme.danger }]}>
                {error}
              </ThemedText>
            )}

            {isRequester ? (
              <Pressable
                onPress={handleCancel}
                disabled={isSubmitting}
                style={[styles.secondaryButton, { borderColor: theme.danger }, isSubmitting && styles.buttonDisabled]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={theme.danger} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>
                    Annuler la demande
                  </ThemedText>
                )}
              </Pressable>
            ) : (
              <>
                <View style={styles.voteButtons}>
                  <Pressable
                    onPress={() => handleVote('declined')}
                    disabled={isSubmitting}
                    style={[
                      styles.voteButton,
                      {
                        borderColor: theme.danger,
                        backgroundColor: myVote?.decision === 'declined' ? `${theme.danger}1A` : theme.backgroundElement,
                      },
                      isSubmitting && styles.buttonDisabled,
                    ]}
                  >
                    <ThemedText type="smallBold" style={{ color: theme.danger }}>
                      Refuser
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => handleVote('approved')}
                    disabled={isSubmitting}
                    style={[
                      styles.voteButton,
                      {
                        backgroundColor: myVote?.decision === 'approved' ? theme.tint : theme.backgroundElement,
                        borderColor: theme.tint,
                      },
                      isSubmitting && styles.buttonDisabled,
                    ]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={myVote?.decision === 'approved' ? theme.tintForeground : theme.tint} />
                    ) : (
                      <ThemedText
                        type="smallBold"
                        style={{ color: myVote?.decision === 'approved' ? theme.tintForeground : theme.tint }}
                      >
                        Approuver
                      </ThemedText>
                    )}
                  </Pressable>
                </View>

                {myVote && (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.myVoteHint}>
                    Votre vote actuel : {myVote.decision === 'approved' ? 'Approuvé' : 'Refusé'}. Vous pouvez le modifier avant la
                    fin du délai.
                  </ThemedText>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function InfoRow({ icon, text, theme, last }: { icon: keyof typeof Ionicons.glyphMap; text: string; theme: Theme; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <Ionicons name={icon} size={18} color={theme.tint} />
      <ThemedText type="small" style={styles.infoRowText}>
        {text}
      </ThemedText>
    </View>
  );
}

function TallyStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.tallyStat}>
      <ThemedText type="title" style={[styles.tallyValue, { color }]}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  closeButton: {
    padding: Spacing.one,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
    maxWidth: 320,
  },
  infoList: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  infoRowText: {
    flex: 1,
  },
  reassurance: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.five,
  },
  reassuranceText: {
    flex: 1,
  },
  confirmLabel: {
    alignSelf: 'flex-start',
    marginLeft: Spacing.one,
    marginBottom: Spacing.two,
  },
  input: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  errorText: {
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  dangerButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.five,
  },
  dangerButtonText: {
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emptyState: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  countdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.four,
  },
  tallyBox: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.five,
  },
  tallyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tallyStat: {
    alignItems: 'center',
    gap: 2,
  },
  tallyValue: {
    fontSize: 28,
    lineHeight: 34,
  },
  tallyHint: {
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  secondaryButton: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  voteButtons: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  voteButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  myVoteHint: {
    textAlign: 'center',
    marginTop: Spacing.three,
  },
});
