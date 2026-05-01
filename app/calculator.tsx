import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getSettings } from '../src/storage';
import { calculateTax, formatCurrency, hoursToGross } from '../src/utils/tax';
import { TaxBreakdown, UserSettings } from '../src/types';
import { useEffect } from 'react';

export default function CalculatorScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'hours' | 'gross'>('hours');
  const [inputValue, setInputValue] = useState('');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [result, setResult] = useState<TaxBreakdown | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  function calculate() {
    if (!settings) return;
    const num = parseFloat(inputValue.replace(',', '.'));
    if (isNaN(num) || num <= 0) return;
    const gross = mode === 'hours' ? hoursToGross(num, settings.hourlyRate) : num;
    setResult(calculateTax(gross, settings));
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.modeTabs}>
        <TouchableOpacity style={[styles.modeTab, mode === 'hours' && styles.modeTabActive]} onPress={() => { setMode('hours'); setResult(null); }}>
          <Text style={[styles.modeTabText, mode === 'hours' && styles.modeTabTextActive]}>{t('calculator.hours')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeTab, mode === 'gross' && styles.modeTabActive]} onPress={() => { setMode('gross'); setResult(null); }}>
          <Text style={[styles.modeTabText, mode === 'gross' && styles.modeTabTextActive]}>{t('calculator.gross')}</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder={mode === 'hours' ? t('calculator.hours') : t('calculator.gross')}
        value={inputValue}
        onChangeText={(v) => { setInputValue(v); setResult(null); }}
      />

      <TouchableOpacity style={styles.calcBtn} onPress={calculate}>
        <Text style={styles.calcBtnText}>{t('calculator.calculate')}</Text>
      </TouchableOpacity>

      {result && settings && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>{t('calculator.breakdown')}</Text>
          <Row label={t('timer.gross')} value={formatCurrency(result.gross, settings.currency)} />
          <Row label={t('calculator.zusEmployee')} value={`- ${formatCurrency(result.zusEmployee, settings.currency)}`} accent="#dc2626" />
          <Row label={t('calculator.health')} value={`- ${formatCurrency(result.healthInsurance, settings.currency)}`} accent="#dc2626" />
          <Row label={t('calculator.incomeTax')} value={`- ${formatCurrency(result.incomeTax, settings.currency)}`} accent="#dc2626" />
          <View style={styles.divider} />
          <Row label={t('calculator.net')} value={formatCurrency(result.net, settings.currency)} accent="#2563eb" large />
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value, accent, large }: { label: string; value: string; accent?: string; large?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, large && styles.rowLabelLarge]}>{label}</Text>
      <Text style={[styles.rowValue, large && styles.rowValueLarge, accent ? { color: accent } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  modeTabs: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4 },
  modeTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  modeTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  modeTabText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  modeTabTextActive: { color: '#1e293b', fontWeight: '700' },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 16, fontSize: 20, fontWeight: '500' },
  calcBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  calcBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  resultBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, gap: 10 },
  resultTitle: { fontSize: 13, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 15, color: '#475569' },
  rowLabelLarge: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  rowValue: { fontSize: 15, color: '#1e293b', fontWeight: '500' },
  rowValueLarge: { fontSize: 20, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#e2e8f0' },
});
