import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AirtelLogo } from '@/components/brand/airtel-logo';
import { MtnLogo } from '@/components/brand/mtn-logo';
import { PinCodeInput } from '@/components/pin-code-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { vaultService, type PaymentMethod } from '@/services/vaultService';

type TransactionKind = 'deposit' | 'withdraw';
type Step = 'amount' | 'method' | 'phone' | 'pin' | 'success';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });

export default function VaultTransactionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; balance?: string }>();
  const kind: TransactionKind = params.type === 'withdraw' ? 'withdraw' : 'deposit';
  const availableBalance = params.balance ? Number(params.balance) : null;

  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState('+242 ');
  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultStatus, setResultStatus] = useState<string>('completed');

  const amountValue = Number(amount.replace(',', '.'));
  const title = kind === 'deposit' ? 'Déposer' : 'Retirer';
  const isPending = resultStatus === 'processing';
  const exceedsBalance = kind === 'withdraw' && availableBalance !== null && amountValue > availableBalance;

  function handlePhoneChange(text: string) {
    // Keep the +242 country prefix locked in place — only track the local digits.
    setPhone(text.startsWith('+242 ') ? text : `+242 ${text.replace(/^\+?242\s?/, '')}`);
  }

  async function handlePinChange(text: string) {
    setPin(text);
    setError(null);
    setHasError(false);

    if (text.length === 4 && method) {
      setIsSubmitting(true);

      try {
        const result =
          kind === 'deposit'
            ? await vaultService.deposit(amountValue, text, method, phone)
            : await vaultService.withdraw(amountValue, text, method, phone);
        setResultStatus(result.movement.status);
        setStep('success');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
        setHasError(true);
        setPin('');
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            {step !== 'amount' && step !== 'success' && (
              <Pressable
                onPress={() => setStep(step === 'pin' ? 'phone' : step === 'phone' ? 'method' : 'amount')}
                style={styles.backButton}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={22} color={theme.text} />
              </Pressable>
            )}
          </View>

          {step === 'amount' && (
            <View style={styles.content}>
              <ThemedText type="title" style={styles.title}>
                {title}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                {kind === 'deposit' ? 'Combien voulez-vous déposer ?' : 'Combien voulez-vous retirer ?'}
              </ThemedText>

              <View style={styles.amountRow}>
                <ThemedText type="title" style={[styles.currencySign, { color: theme.textSecondary }]}>
                  FCFA
                </ThemedText>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  autoFocus
                  style={[styles.amountInput, { color: theme.text }]}
                />
              </View>

              {kind === 'withdraw' && availableBalance !== null && (
                <ThemedText
                  type="small"
                  themeColor={exceedsBalance ? undefined : 'textSecondary'}
                  style={[styles.balanceHint, exceedsBalance && { color: theme.danger }]}
                >
                  {exceedsBalance
                    ? `Solde insuffisant · disponible ${currency.format(availableBalance)}`
                    : `Solde disponible : ${currency.format(availableBalance)}`}
                </ThemedText>
              )}

              <Pressable
                onPress={() => setStep('method')}
                disabled={!(amountValue > 0) || exceedsBalance}
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.tint },
                  (!(amountValue > 0) || exceedsBalance) && styles.buttonDisabled,
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                  Continuer
                </ThemedText>
              </Pressable>
            </View>
          )}

          {step === 'method' && (
            <View style={styles.content}>
              <ThemedText type="title" style={styles.title}>
                Moyen de paiement
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                Choisissez comment {kind === 'deposit' ? 'déposer' : 'retirer'} {currency.format(amountValue)}.
              </ThemedText>

              <View style={styles.methods}>
                <MethodCard
                  logo={<MtnLogo size={40} />}
                  label="MTN Mobile Money"
                  selected={method === 'mtn_momo'}
                  onPress={() => setMethod('mtn_momo')}
                />
                <MethodCard
                  logo={<AirtelLogo size={40} />}
                  label="Airtel Money"
                  selected={method === 'airtel_money'}
                  onPress={() => setMethod('airtel_money')}
                />
              </View>

              <Pressable
                onPress={() => setStep('phone')}
                disabled={!method}
                style={[styles.primaryButton, { backgroundColor: theme.tint }, !method && styles.buttonDisabled]}
              >
                <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                  Continuer
                </ThemedText>
              </Pressable>
            </View>
          )}

          {step === 'phone' && (
            <View style={styles.content}>
              <ThemedText type="title" style={styles.title}>
                Numéro Mobile Money
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                Le numéro qui recevra la demande de confirmation.
              </ThemedText>

              <View style={[styles.phoneRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="+242 06 000 00 00"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                  autoFocus
                  style={[styles.phoneInput, { color: theme.text }]}
                />
              </View>

              <Pressable
                onPress={() => setStep('pin')}
                disabled={phone.replace('+242 ', '').trim().length < 6}
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.tint },
                  phone.replace('+242 ', '').trim().length < 6 && styles.buttonDisabled,
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                  Continuer
                </ThemedText>
              </Pressable>
            </View>
          )}

          {step === 'pin' && (
            <View style={styles.content}>
              <ThemedText type="title" style={styles.title}>
                Confirmez avec votre code PIN
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                {title} de {currency.format(amountValue)}
              </ThemedText>

              <View style={styles.pinArea}>
                <PinCodeInput value={pin} onChange={handlePinChange} hasError={hasError} autoFocus />
              </View>

              <View style={styles.feedback}>
                {isSubmitting && <ActivityIndicator color={theme.tint} />}
                {error && (
                  <ThemedText type="small" style={{ color: theme.danger }}>
                    {error}
                  </ThemedText>
                )}
              </View>
            </View>
          )}

          {step === 'success' && (
            <View style={styles.content}>
              <View style={[styles.successBadge, { backgroundColor: isPending ? theme.backgroundSelected : theme.tint }]}>
                <Ionicons
                  name={isPending ? 'time-outline' : 'checkmark'}
                  size={32}
                  color={isPending ? theme.tint : theme.tintForeground}
                />
              </View>
              <ThemedText type="title" style={styles.title}>
                {isPending ? 'Confirmation en attente' : kind === 'deposit' ? 'Dépôt effectué' : 'Retrait effectué'}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                {isPending
                  ? `Une demande de confirmation a été envoyée au ${phone}. Le coffre se mettra à jour automatiquement une fois le paiement confirmé.`
                  : `${currency.format(amountValue)} ${kind === 'deposit' ? 'ont été ajoutés à' : 'ont été retirés de'} votre coffre.`}
              </ThemedText>

              <Pressable onPress={() => router.back()} style={[styles.primaryButton, { backgroundColor: theme.tint }]}>
                <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                  Terminé
                </ThemedText>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function MethodCard({
  logo,
  label,
  selected,
  onPress,
}: {
  logo: React.ReactNode;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.methodCard,
        { backgroundColor: theme.backgroundElement, borderColor: selected ? theme.tint : theme.border },
      ]}
    >
      {logo}
      <ThemedText type="smallBold" style={styles.methodLabel}>
        {label}
      </ThemedText>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? theme.tint : theme.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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
  title: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.six,
    maxWidth: 300,
  },
  balanceHint: {
    marginTop: -Spacing.four,
    marginBottom: Spacing.four,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.six,
  },
  currencySign: {
    fontSize: 20,
  },
  amountInput: {
    fontSize: 44,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'center',
  },
  methods: {
    width: '100%',
    gap: Spacing.three,
    marginBottom: Spacing.five,
  },
  phoneRow: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.five,
  },
  phoneInput: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: Spacing.three,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: Spacing.three,
  },
  methodLabel: {
    flex: 1,
  },
  pinArea: {
    minHeight: 64,
  },
  feedback: {
    marginTop: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 24,
  },
  successBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
