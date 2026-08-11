import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCompany } from '@/context/company-context';
import { useTheme } from '@/hooks/use-theme';
import { companyService } from '@/services/companyService';

const CONSEQUENCES = [
  { icon: 'swap-vertical-outline' as const, text: 'Toutes les transactions de cette entreprise seront supprimées définitivement.' },
  { icon: 'pricetags-outline' as const, text: 'Le catalogue de produits et les catégories seront supprimés.' },
  { icon: 'cash-outline' as const, text: "L'historique des sessions de caisse sera supprimé." },
  { icon: 'bar-chart-outline' as const, text: 'Le score de crédit de cette entreprise ne sera plus disponible.' },
];

export default function DeleteCompanyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name: string }>();
  const { refreshCompanies } = useCompany();
  const companyId = Number(params.id);
  const companyName = params.name ?? '';
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Synchronous guard against a double-tap landing before React re-renders the button's
  // disabled prop — this is a destructive, irreversible action, so it matters even more here.
  const isSubmittingRef = useRef(false);

  const canConfirm = confirmText.trim().length > 0 && confirmText.trim() === companyName.trim();

  async function handleDelete() {
    if (!canConfirm || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      await companyService.remove(companyId);
      // Re-resolves the active company from what's left (or clears it to null so the tabs root
      // shows the existing "select/create a company" empty state) — same call the switcher
      // already relies on after creating a company.
      await refreshCompanies();
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.badge, { backgroundColor: `${theme.danger}1A` }]}>
          <Ionicons name="warning-outline" size={28} color={theme.danger} />
        </View>

        <ThemedText type="title" style={styles.title}>
          Supprimer {companyName} ?
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Cette action est irréversible. Voici ce qui sera supprimé avec cette entreprise :
        </ThemedText>

        <View style={[styles.consequenceList, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          {CONSEQUENCES.map((item, index) => (
            <View
              key={item.text}
              style={[
                styles.consequenceRow,
                index < CONSEQUENCES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
              ]}
            >
              <Ionicons name={item.icon} size={18} color={theme.danger} />
              <ThemedText type="small" style={styles.consequenceText}>
                {item.text}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={[styles.reassurance, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.income} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.consequenceText}>
            Votre coffre et vos tontines ne sont pas liés à cette entreprise et resteront intacts.
          </ThemedText>
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.confirmLabel}>
          Tapez « {companyName} » pour confirmer
        </ThemedText>
        <TextInput
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder={companyName}
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
          onPress={handleDelete}
          disabled={!canConfirm || isSubmitting}
          style={[styles.deleteButton, { backgroundColor: theme.danger }, (!canConfirm || isSubmitting) && styles.buttonDisabled]}
        >
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText type="smallBold" style={styles.deleteButtonText}>Supprimer définitivement</ThemedText>}
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.cancelButton} disabled={isSubmitting}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Annuler
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
    maxWidth: 320,
  },
  consequenceList: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  consequenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  consequenceText: {
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
  deleteButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.five,
  },
  deleteButtonText: {
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
  },
});
