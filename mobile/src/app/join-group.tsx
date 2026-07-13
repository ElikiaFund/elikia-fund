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
import { groupService } from '@/services/groupService';

export default function JoinGroupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanLocked, setScanLocked] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function attemptJoin(inviteCode: string) {
    const trimmed = inviteCode.trim().toUpperCase();

    if (!trimmed) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const group = await groupService.join(trimmed);
      router.replace({ pathname: '/group/[id]', params: { id: String(group.id) } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
      setScanLocked(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scanLocked || isSubmitting) {
      return;
    }

    setScanLocked(true);
    setCode(data);
    attemptJoin(data);
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
            onPress={() => attemptJoin(code)}
            disabled={code.trim().length === 0 || isSubmitting}
            style={[
              styles.button,
              { backgroundColor: theme.tint },
              (code.trim().length === 0 || isSubmitting) && styles.buttonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.tintForeground} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                Rejoindre
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
