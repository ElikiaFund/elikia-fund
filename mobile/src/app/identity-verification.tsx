import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCompany } from '@/context/company-context';
import { useTheme } from '@/hooks/use-theme';
import { companyService, type ConnectStatus } from '@/services/companyService';

type Copy = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; action: string | null };

function copyFor(status: ConnectStatus): Copy {
  if (status.is_connect_ready) {
    return {
      icon: 'shield-checkmark',
      title: 'Identité vérifiée',
      body: 'Vos dépôts, retraits et cotisations sont maintenant ouverts. Votre argent reste sur votre propre compte Yabeto.',
      action: null,
    };
  }

  switch (status.verification_status) {
    case 'documents_submitted':
    case 'in_review':
      return {
        icon: 'time-outline',
        title: 'Vérification en cours',
        body: 'Yabeto examine vos documents. Cela prend généralement peu de temps : vous pourrez déposer et retirer dès que ce sera validé.',
        action: null,
      };
    case 'needs_info':
      return {
        icon: 'document-text-outline',
        title: 'Informations complémentaires demandées',
        body: 'Yabeto a besoin de précisions pour terminer la vérification. Reprenez là où vous vous êtes arrêté.',
        action: 'Compléter la vérification',
      };
    case 'rejected':
      return {
        icon: 'close-circle-outline',
        title: 'Vérification refusée',
        body: "Yabeto n'a pas pu valider votre identité. Vous pouvez reprendre la vérification ou contacter le support Elikia Fund.",
        action: 'Reprendre la vérification',
      };
    case 'created':
      return {
        icon: 'id-card-outline',
        title: 'Vérification commencée',
        body: "Terminez la vérification pour ouvrir votre coffre et vos tontines. Gardez votre pièce d'identité à portée de main.",
        action: 'Continuer la vérification',
      };
    default:
      return {
        icon: 'id-card-outline',
        title: 'Vérifiez votre identité',
        body:
          "Pour protéger votre argent, notre partenaire de paiement Yabeto vérifie l'identité de chaque entreprise avant tout dépôt ou retrait. " +
          "Prévoyez votre pièce d'identité et quelques minutes. Vous indiquerez aussi le numéro Mobile Money qui recevra vos retraits.",
        action: 'Vérifier mon identité',
      };
  }
}

export default function IdentityVerificationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ companyId?: string }>();
  const { activeCompany } = useCompany();
  const companyId = params.companyId ? Number(params.companyId) : (activeCompany?.id ?? null);

  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (companyId === null) {
      return;
    }

    try {
      setStatus(await companyService.getConnectStatus(companyId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // On Android the browser promise resolves as soon as the page opens, not when it closes, so
  // coming back to the app is the only reliable "the merchant may have finished" signal.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  async function handleStartVerification() {
    if (companyId === null || isOpening) {
      return;
    }

    setIsOpening(true);
    setError(null);

    try {
      const { onboarding_url } = await companyService.requestOnboardingLink(companyId);
      await WebBrowser.openBrowserAsync(onboarding_url, { dismissButtonStyle: 'close' });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsOpening(false);
    }
  }

  const copy = status ? copyFor(status) : null;
  const isApproved = status?.is_connect_ready === true;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8} accessibilityLabel="Fermer">
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>

        {isLoading && !status ? (
          <View style={styles.content}>
            <ActivityIndicator color={theme.tint} />
          </View>
        ) : (
          <View style={styles.content}>
            {copy && (
              <>
                <View style={[styles.badge, { backgroundColor: isApproved ? theme.tint : theme.backgroundElement }]}>
                  <Ionicons name={copy.icon} size={30} color={isApproved ? theme.tintForeground : theme.tint} />
                </View>
                <ThemedText type="title" style={styles.title}>
                  {copy.title}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                  {copy.body}
                </ThemedText>
              </>
            )}

            {error && (
              <ThemedText type="small" style={[styles.error, { color: theme.danger }]}>
                {error}
              </ThemedText>
            )}

            {copy?.action && (
              <Pressable
                onPress={handleStartVerification}
                disabled={isOpening}
                style={[styles.primaryButton, { backgroundColor: theme.tint }, isOpening && styles.buttonDisabled]}
              >
                {isOpening ? (
                  <ActivityIndicator color={theme.tintForeground} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                    {copy.action}
                  </ThemedText>
                )}
              </Pressable>
            )}

            {status && !isApproved && (
              <Pressable onPress={refresh} style={styles.secondaryButton} hitSlop={8}>
                <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                  Actualiser le statut
                </ThemedText>
              </Pressable>
            )}

            {isApproved && (
              <Pressable onPress={() => router.back()} style={[styles.primaryButton, { backgroundColor: theme.tint }]}>
                <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                  Terminé
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  headerRow: {
    height: 32,
    justifyContent: 'center',
  },
  backButton: {
    width: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    marginBottom: Spacing.six,
    maxWidth: 320,
  },
  error: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  secondaryButton: {
    marginTop: Spacing.four,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
