import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getSettings } from '../src/storage';
import { calculateTax, formatCurrency, hoursToGross } from '../src/utils/tax';
import { TaxBreakdown, UserSettings } from '../src/types';
import { colors, radius, shadow, spacing, typography } from '../src/styles/theme';

export default function CalculatorScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'hours' | 'gross'>('hours');
  const [inputValue, setInputValue] = useState('');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [result, setResult] = useState<TaxBreakdown | null>(null);

  useEffect(() => { getSettings().then(setSettings); }, []);

  function calculate() {
    if (!settings) return;
    const num = parseFloat(inputValue.replace(',', '.'));
    if (isNaN(num) || num <= 0) return;
    const gross = mode === 'hours' ? hoursToGross(num, settings.hourlyRate) : num;
    setResult(calculateTax(gross, settings));
  }

  const taxTotal = result ? result.socialContributions + result.healthInsurance + result.incomeTax : 0;
  const effectiveRate = result && result.gross > 0 ? (taxTotal / result.gross * 100).toFixed(1) : null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.modeTabs}>
        {(['hours', 'gross'] as const).map((m) => (
          <TouchableOpacity key={m} style={[styles.modeTab, mode === m && styles.modeTabActive]} onPress={() => { setMode(m); setResult(null); }}>
            <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>{t(`calculator.${m}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder={mode === 'hours' ? '0.0' : '0.00'}
          placeholderTextColor={colors.textMuted}
          value={inputValue}
          onChangeText={(v) => { setInputValue(v); setResult(null); }}
        />
        <Text style={styles.inputUnit}>{mode === 'hours' ? 'h' : settings?.currency ?? ''}</Text>
      </View>

      <TouchableOpacity style={styles.calcBtn} onPress={calculate} activeOpacity={0.85}>
        <Ionicons name="calculator" size={20} color="#fff" />
        <Text style={styles.calcBtnText}>{t('calculator.calculate')}</Text>
      </TouchableOpacity>

      {result && settings && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>{t('calculator.breakdown')}</Text>
            {effectiveRate && <Text style={styles.effectiveRate}>{effectiveRate}% effective tax</Text>}
          </View>

          <Row label={t('timer.gross')} value={formatCurrency(result.gross, settings.currency)} />
          <View style={styles.divider} />
          <Row label={t('calculator.socialContributions')} value={`− ${formatCurrency(result.socialContributions, settings.currency)}`} color={colors.danger} />
          {result.healthInsurance > 0 && (
            <Row label={t('calculator.health')} value={`− ${formatCurrency(result.healthInsurance, settings.currency)}`} color={colors.danger} />
          )}
          {result.extraLines?.map((line) => (
            <Row key={line.label} label={line.label} value={`− ${formatCurrency(line.amount, settings.currency)}`} color={colors.warning} />
          ))}
          <Row label={t('calculator.incomeTax')} value={`− ${formatCurrency(result.incomeTax, settings.currency)}`} color={colors.danger} />
          <View style={styles.divider} />
          <Row label={t('calculator.net')} value={formatCurrency(result.net, settings.currency)} color={colors.primary} large />
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value, color, large }: { label: string; value: string; color?: string; large?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, large && rowStyles.labelLarge]}>{label}</Text>
      <Text style={[rowStyles.value, large && rowStyles.valueLarge, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  label: { ...typography.base, color: colors.textSecondary, flex: 1 },
  labelLarge: { ...typography.md, fontWeight: '700', color: colors.text },
  value: { ...typography.base, color: colors.text, fontWeight: '500', fontVariant: ['tabular-nums'] },
  valueLarge: { ...typography.xl, fontWeight: '800' },
});

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg },
  container: { padding: spacing.md, gap: spacing.md },
  modeTabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, padding: 4, ...shadow.sm },
  modeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md },
  modeTabActive: { backgroundColor: colors.primaryLight },
  modeTabText: { ...typography.sm, color: colors.textSecondary, fontWeight: '600' },
  modeTabTextActive: { color: colors.primary, fontWeight: '700' },
  inputRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm, borderWidth: 1.5, borderColor: colors.border },
  input: { flex: 1, padding: spacing.md, fontSize: 24, fontWeight: '500', color: colors.text },
  inputUnit: { paddingHorizontal: spacing.md, alignSelf: 'center', ...typography.md, color: colors.textSecondary, fontWeight: '600', backgroundColor: colors.bg },
  calcBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  calcBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  resultCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, ...shadow.sm },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  resultTitle: { ...typography.sm, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  effectiveRate: { ...typography.sm, color: colors.warning, fontWeight: '700', backgroundColor: '#FEF3C7', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});
