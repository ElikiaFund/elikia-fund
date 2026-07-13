import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SelectOption = { label: string; value: string };

// Shared by any bottom sheet in the app (this one, and the custom-range calendar sheet in
// transactions.tsx) so they all slide up/dismiss/round the same way.
export const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    maxHeight: '75%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.three,
  },
});

type SelectSheetProps = {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

export function SelectSheet({ visible, title, options, selectedValue, onSelect, onClose }: SelectSheetProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: theme.background }]}>
          <View style={[sheetStyles.handle, { backgroundColor: theme.border }]} />
          <ThemedText type="smallBold" style={styles.title}>
            {title}
          </ThemedText>
          <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
            {options.map((option) => {
              const selected = option.value === selectedValue;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.backgroundElement }]}
                >
                  <ThemedText style={selected ? { color: theme.tint, fontWeight: '700' } : undefined}>{option.label}</ThemedText>
                  {selected && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                </Pressable>
              );
            })}
          </ScrollView>
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
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
});
