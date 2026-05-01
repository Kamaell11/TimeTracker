import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getSettings } from '../src/storage';
import { calculateTax, formatCurrency, hoursToGross } from '../src/utils/tax';
import { TaxBreakdown, UserSettings } from '../src/types';
import { useTheme } from '../src/context/ThemeContext';
import { radius, shadow, shadowSm, spacing } from '../src/styles/theme';

export default function CalculatorScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [mode, setMode] = useState<'hours' | 'gross'>('hours');
  const [inputValue, setInputValue] = useState('');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [result, setResult] = useState<TaxBreakdown | null>(null);

  useEffect(() => { getSettings().then(setSettings); }, []);

  function calculate() {
    if (!settings) return;
    const num = parseFloat(inputValue.replace(',', '.'));
    if (isNaN(num) || num <= 0) return;
    setResult(calculateTax(mode === 'hours' ? hoursToGross(num, settings.hourlyRate) : num, settings));
  }

  const deductions = result ? result.socialContributions + result.healthInsurance + result.incomeTax : 0;
  const effectiveRate = result && result.gross > 0 ? (deductions / result.gross * 100).toFixed(1) : null;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={[st.container, { backgroundColor: colors.bg }]}>

      {/* Mode tabs */}
      <View style={[st.modeTabs, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
        {(['hours', 'gross'] as const).map((m) => (
          <TouchableOpacity key={m} style={[st.modeTab, mode === m && { backgroundColor: colors.primaryLight }]} onPress={() => { setMode(m); setResult(null); }}>
            <Ionicons name={m === 'hours' ? 'time-outline' : 'cash-outline'} size={16} color={mode === m ? colors.primary : colors.textMuted} />
            <Text style={[st.modeTabText, { color: mode === m ? colors.primary : colors.textSec }, mode === m && st.modeTabTextActive]}>{t(`calculator.${m}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input */}
      <View style={[st.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border, ...shadowSm(colors.shadow) }]}>
        <TextInput
          style={[st.input, { color: colors.text }]}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          value={inputValue}
          onChangeText={(v) => { setInputValue(v); setResult(null); }}
          selectionColor={colors.primary}
        />
        <View style={[st.inputUnit, { backgroundColor: colors.surface2, borderLeftColor: colors.border }]}>
          <Text style={[st.inputUnitText, { color: colors.textSec }]}>{mode === 'hours' ? 'h' : settings?.currency ?? ''}</Text>
        </View>
      </View>

      {/* Calculate button */}
      <TouchableOpacity onPress={calculate} activeOpacity={0.88} style={st.btnWrap}>
        <LinearGradient colors={colors.primaryGrad} style={st.calcBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="calculator" size={20} color="#fff" />
          <Text style={st.calcBtnText}>{t('calculator.calculate')}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Results */}
      {result && settings && (
        <View style={[st.resultCard, { backgroundColor: colors.surface, ...shadow(colors.shadow) }]}>
          <View style={st.resultHeader}>
            <Text style={[st.resultTitle, { color: colors.textMuted }]}>{t('calculator.breakdown')}</Text>
            {effectiveRate && (
              <View style={[st.rateBadge, { backgroundColor: colors.warningLight }]}>
                <Text style={[st.rateBadgeText, { color: colors.warning }]}>{effectiveRate}% tax rate</Text>
              </View>
            )}
          </View>

          <ResultRow label={t('timer.gross')} value={formatCurrency(result.gross, settings.currency)} colors={colors} />
          <View style={[st.divider, { backgroundColor: colors.borderLight }]} />

          {result.socialContributions > 0 && (
            <ResultRow label={t('calculator.socialContributions')} value={`−${formatCurrency(result.socialContributions, settings.currency)}`} colors={colors} accent={colors.danger} />
          )}
          {result.healthInsurance > 0 && (
            <ResultRow label={t('calculator.health')} value={`−${formatCurrency(result.healthInsurance, settings.currency)}`} colors={colors} accent={colors.danger} />
          )}
          {result.extraLines?.map((line) => (
            <ResultRow key={line.label} label={line.label} value={`−${formatCurrency(line.amount, settings.currency)}`} colors={colors} accent={colors.warning} />
          ))}
          <ResultRow label={t('calculator.incomeTax')} value={`−${formatCurrency(result.incomeTax, settings.currency)}`} colors={colors} accent={colors.danger} />

          <View style={[st.divider, { backgroundColor: colors.border }]} />
          <ResultRow label={t('calculator.net')} value={formatCurrency(result.net, settings.currency)} colors={colors} accent={colors.primary} large />
        </View>
      )}
    </ScrollView>
  );
}

function ResultRow({ label, value, colors, accent, large }: { label: string; value: string; colors: any; accent?: string; large?: boolean }) {
  return (
    <View style={rr.row}>
      <Text style={[rr.label, { color: large ? colors.text : colors.textSec }, large && rr.labelLg]}>{label}</Text>
      <Text style={[rr.value, { color: accent ?? colors.text }, large && rr.valueLg]}>{value}</Text>
    </View>
  );
}
const rr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  label: { fontSize: 15, flex: 1 },
  labelLg: { fontSize: 17, fontWeight: '700' },
  value: { fontSize: 15, fontWeight: '500', fontVariant: ['tabular-nums'] },
  valueLg: { fontSize: 26, fontWeight: '800' },
});

const st = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md },
  modeTabs: { flexDirection: 'row', borderRadius: radius.lg, padding: 4 },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: 12, borderRadius: radius.md },
  modeTabText: { fontSize: 14, fontWeight: '600' },
  modeTabTextActive: { fontWeight: '800' },
  inputWrap: { flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1.5 },
  input: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 28, fontWeight: '400' },
  inputUnit: { paddingHorizontal: spacing.md, justifyContent: 'center', borderLeftWidth: 1.5 },
  inputUnitText: { fontSize: 16, fontWeight: '600' },
  btnWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  calcBtn: { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  calcBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  resultCard: { borderRadius: radius.xl, padding: spacing.md, gap: spacing.xs },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  resultTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  rateBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  rateBadgeText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, marginVertical: spacing.xs },
});
