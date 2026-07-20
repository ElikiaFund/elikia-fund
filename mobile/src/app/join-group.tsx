import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupService, type GroupPreview } from '@/services/groupService';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const FREQUENCY_LABELS = { weekly: 'hebdomadaire', monthly: 'mensuelle' } as const;

export default function JoinGroupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanLocked, setScanLocked] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function lookupGroup(inviteCode: string) {
    const trimmed = inviteCode.trim().toUpperCase();

    if (!trimmed) {
      return;
    }

    setError(null);
    setIsLoadingPreview(true);

    try {
      const result = await groupService.preview(trimmed);
      setPreview(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
      setScanLocked(false);
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function requestToJoin() {
    if (!preview) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const group = await groupService.join(code.trim().toUpperCase());
      router.replace({ pathname: '/group/[id]', params: { id: String(group.id) } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scanLocked || isLoadingPreview) {
      return;
    }

    setScanLocked(true);
    setCode(data);
    lookupGroup(data);
  }

  function reset() {
    setPreview(null);
    setCode('');
    setError(null);
    setScanLocked(false);
  }

  if (preview) {
    const alreadyMember = preview.membership_status === 'approved';
    const alreadyPending = preview.membership_status === 'pending';

    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            {preview.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Vérifiez les informations avant d&apos;envoyer votre demande d&apos;adhésion.
          </ThemedText>

          <View style={[styles.previewCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <PreviewRow label="Créateur" value={preview.owner?.name ?? '—'} />
            <PreviewRow label="Cotisation" value={`${currency.format(Number(preview.contribution_amount))} · ${FREQUENCY_LABELS[preview.frequency]}`} />
            {preview.schedule_label && <PreviewRow label="Échéance" value={preview.schedule_label} />}
            <PreviewRow label="Membres" value={`${preview.members_count ?? 0}${preview.max_members ? ` / ${preview.max_members}` : ''}`} />
          </View>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            </View>
          )}

          {alreadyMember ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.statusHint}>
              Vous êtes déjà membre de cette tontine.
            </ThemedText>
          ) : alreadyPending ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.statusHint}>
              Votre demande d&apos;adhésion est déjà en attente d&apos;approbation.
            </ThemedText>
          ) : (
            <Pressable
              onPress={requestToJoin}
              disabled={isSubmitting}
              style={[styles.button, { backgroundColor: theme.tint }, isSubmitting && styles.buttonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.tintForeground} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                  Demander à rejoindre
                </ThemedText>
              )}
            </Pressable>
          )}

          <Pressable onPress={reset} style={styles.backLink} hitSlop={8}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Essayer un autre code
            </ThemedText>
          </Pressable>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          Rejoindre une tontine
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Entrez le code d&apos;invitation ou scannez le QR code partagé par le créateur.
        </ThemedText>

        <View style={styles.form}>
          <FormField
            label="Code d'invitation"
            placeholder="Ex. AB12CD"
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            maxLength={6}
          />
          <Pressable
            onPress={() => lookupGroup(code)}
            disabled={code.trim().length === 0 || isLoadingPreview}
            style={[
              styles.button,
              { backgroundColor: theme.tint },
              (code.trim().length === 0 || isLoadingPreview) && styles.buttonDisabled,
            ]}
          >
            {isLoadingPreview ? (
              <ActivityIndicator color={theme.tintForeground} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                Continuer
              </ThemedText>
            )}
          </Pressable>
        </View>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <ThemedText type="small" themeColor="textSecondary">
            ou scannez un QR code
          </ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <View style={[styles.scannerFrame, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          {!permission ? (
            <ActivityIndicator color={theme.tint} />
          ) : !permission.granted ? (
            <View style={styles.permissionPrompt}>
              <Ionicons name="camera-outline" size={28} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.permissionText}>
                Autorisez l&apos;accès à la caméra pour scanner un QR code.
              </ThemedText>
              <Pressable onPress={requestPermission} style={[styles.permissionButton, { borderColor: theme.tint }]}>
                <ThemedText type="smallBold" style={{ color: theme.tint }}>
                  Autoriser la caméra
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
            />
          )}
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={styles.previewRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={{ color: theme.text }}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingTop: Spacing.six,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
  },
  form: {
    gap: Spacing.three,
  },
  previewCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.five,
    gap: Spacing.three,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusHint: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  backLink: {
    alignSelf: 'center',
    marginTop: Spacing.four,
    paddingVertical: Spacing.two,
  },
  button: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginVertical: Spacing.five,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  scannerFrame: {
    height: 280,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  permissionPrompt: {
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  permissionText: {
    textAlign: 'center',
    maxWidth: 220,
  },
  permissionButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  errorBox: {
    marginTop: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
