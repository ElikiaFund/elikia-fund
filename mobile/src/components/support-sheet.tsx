import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { sheetStyles } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { contactService, type ContactInfo } from '@/services/contactService';
import { supportService } from '@/services/supportService';

type SupportSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function SupportSheet({ visible, onClose }: SupportSheetProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [email, setEmail] = useState(user?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsEmail = !user?.email;

  useEffect(() => {
    if (visible) {
      contactService.get().then(setContact);
    }
  }, [visible]);

  function handleClose() {
    setSubject('');
    setMessage('');
    setError(null);
    setIsSubmitted(false);
    onClose();
  }

  const canSubmit = email.trim().length > 0 && subject.trim().length > 0 && message.trim().length > 0;

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      await supportService.create({ email: email.trim(), subject: subject.trim(), message: message.trim() });
      setIsSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasContactInfo = contact && (contact.support_email || contact.phone || contact.whatsapp || contact.address || contact.hours);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={sheetStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          <View style={[sheetStyles.sheet, styles.sheetOverride, { backgroundColor: theme.background }]}>
            <View style={[sheetStyles.handle, { backgroundColor: theme.border }]} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <ThemedText type="title" style={styles.title}>
                Aide et support
              </ThemedText>

              {isSubmitted ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={48} color={theme.tint} />
                  <ThemedText type="smallBold" style={styles.successTitle}>
                    Message envoyé
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.successText}>
                    Nous vous répondrons bientôt à {email}.
                  </ThemedText>
                  <Pressable onPress={handleClose} style={[styles.button, { backgroundColor: theme.tint }]}>
                    <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                      Fermer
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <>
                  {hasContactInfo && (
                    <View style={[styles.contactSection, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                      {contact?.support_email && (
                        <ContactRow
                          icon="mail-outline"
                          label={contact.support_email}
                          onPress={() => Linking.openURL(`mailto:${contact.support_email}`)}
                        />
                      )}
                      {contact?.phone && (
                        <ContactRow icon="call-outline" label={contact.phone} onPress={() => Linking.openURL(`tel:${contact.phone}`)} />
                      )}
                      {contact?.whatsapp && (
                        <ContactRow
                          icon="logo-whatsapp"
                          label={contact.whatsapp}
                          onPress={() => Linking.openURL(`https://wa.me/${contact.whatsapp!.replace(/[^0-9]/g, '')}`)}
                        />
                      )}
                      {contact?.address && <ContactRow icon="location-outline" label={contact.address} />}
                      {contact?.hours && <ContactRow icon="time-outline" label={contact.hours} last />}
                    </View>
                  )}

                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    Envoyer un message
                  </ThemedText>

                  {needsEmail && (
                    <View style={styles.field}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                        Votre e-mail
                      </ThemedText>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="vous@exemple.com"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                      />
                    </View>
                  )}

                  <View style={styles.field}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                      Sujet
                    </ThemedText>
                    <TextInput
                      value={subject}
                      onChangeText={setSubject}
                      placeholder="Ex. Problème avec une transaction"
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                    />
                  </View>

                  <View style={styles.field}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                      Message
                    </ThemedText>
                    <TextInput
                      value={message}
                      onChangeText={setMessage}
                      placeholder="Décrivez votre problème ou votre question…"
                      placeholderTextColor={theme.textSecondary}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      style={[
                        styles.input,
                        styles.textarea,
                        { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      ]}
                    />
                  </View>

                  {error && (
                    <View style={[styles.errorBox, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
                      <ThemedText type="small" style={{ color: theme.danger }}>
                        {error}
                      </ThemedText>
                    </View>
                  )}

                  <Pressable
                    onPress={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                    style={[styles.button, { backgroundColor: theme.tint }, (!canSubmit || isSubmitting) && styles.buttonDisabled]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={theme.tintForeground} />
                    ) : (
                      <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                        Envoyer
                      </ThemedText>
                    )}
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ContactRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.contactRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        onPress && pressed && { backgroundColor: theme.backgroundSelected },
      ]}
    >
      <Ionicons name={icon} size={18} color={theme.tint} />
      <ThemedText style={styles.contactLabel}>{label}</ThemedText>
      {onPress && <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sheetOverride: {
    maxHeight: '90%',
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: Spacing.three,
  },
  contactSection: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: Spacing.four,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  contactLabel: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.three,
  },
  field: {
    marginBottom: Spacing.three,
  },
  fieldLabel: {
    marginBottom: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  textarea: {
    minHeight: 100,
  },
  errorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.six,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  successBox: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  successTitle: {
    marginTop: Spacing.two,
  },
  successText: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
});
