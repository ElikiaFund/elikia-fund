import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { sheetStyles } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCompany } from '@/context/company-context';
import { useTheme } from '@/hooks/use-theme';
import type { Company } from '@/services/authService';
import { COMPANY_CATEGORIES } from '@/services/companyService';

type CompanySelectSheetProps = {
  visible: boolean;
  onClose: () => void;
};

function iconFor(category: string) {
  return COMPANY_CATEGORIES.find((c) => c.value === category)?.icon ?? 'briefcase-outline';
}

// A company's required fields (category grid, department, city, optional catalog) are too large
// to replicate well inside a bottom sheet without duplicating most of onboarding.tsx — so "create
// new" reuses that screen instead of an inline mini-form (unlike CategorySelectSheet).
export function CompanySelectSheet({ visible, onClose }: CompanySelectSheetProps) {
  const theme = useTheme();
  const router = useRouter();
  const { companies, activeCompany, selectCompany } = useCompany();

  async function handleSelect(company: Company) {
    if (company.id !== activeCompany?.id) {
      await selectCompany(company.id);
      // Resets to the home tab rather than threading the active company into every pushed
      // screen's own fetch effect — guarantees a fresh, correctly-scoped view everywhere on
      // next visit with far less churn.
      router.replace('/');
    }

    onClose();
  }

  function handleCreate() {
    onClose();
    router.push('/onboarding?mode=create');
  }

  function handleDelete(company: Company) {
    onClose();
    router.push({ pathname: '/delete-company', params: { id: String(company.id), name: company.name } });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: theme.background }]}>
          <View style={[sheetStyles.handle, { backgroundColor: theme.border }]} />
          <ThemedText type="smallBold" style={styles.title}>
            Mes entreprises
          </ThemedText>

          <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
            {companies.map((company) => {
              const selected = company.id === activeCompany?.id;

              return (
                <Pressable
                  key={company.id}
                  onPress={() => handleSelect(company)}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.backgroundElement }]}
                >
                  <View style={styles.optionLabel}>
                    <Ionicons name={iconFor(company.category)} size={18} color={selected ? theme.tint : theme.textSecondary} />
                    <ThemedText style={selected ? { color: theme.tint, fontWeight: '700' } : undefined}>{company.name}</ThemedText>
                  </View>
                  <View style={styles.optionActions}>
                    {selected && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                    <Pressable onPress={() => handleDelete(company)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable onPress={handleCreate} style={styles.createRow}>
            <Ionicons name="add-circle-outline" size={18} color={theme.tint} />
            <ThemedText type="smallBold" style={{ color: theme.tint }}>
              Créer une nouvelle entreprise
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.two,
  },
  optionsList: {
    marginTop: Spacing.one,
    maxHeight: 320,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  optionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  optionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
});
