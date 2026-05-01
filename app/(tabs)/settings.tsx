import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';
import { getSettings, saveSettings } from '../../src/storage';
import { Country, Currency, EmploymentType, Language, UserSettings, COUNTRY_DEFAULTS, COUNTRY_EMPLOYMENT_TYPES } from '../../src/types';
import { colors, radius, shadow, spacing, typography } from '../../src/styles/theme';

const COUNTRIES: Country[] = ['PL', 'NO', 'UK', 'DE'];
const CURRENCIES: Currency[] = ['PLN', 'NOK', 'GBP', 'EUR', 'USD'];
const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polski' },
];
const LUMP_RATES = [0.085, 0.12, 0.14, 0.15, 0.17];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { getSettings().then(setSettings); }, []);

  function update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function handleCountryChange(country: Country) {
    const defaults = COUNTRY_DEFAULTS[country];
    setSettings((prev) => prev ? { ...prev, country, employmentType: defaults.employmentType, currency: defaults.currency } : prev);
  }

  async function handleSave() {
    if (!settings) return;
    await saveSettings(settings);
    await i18n.changeLanguage(settings.language);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) return null;

  const employmentTypes = COUNTRY_EMPLOYMENT_TYPES[settings.country];
  const showB2bOptions = ['pl_b2b_linear', 'pl_b2b_scale', 'pl_b2b_lump'].includes(settings.employmentType);
  const showTaxRelief = ['pl_employment', 'pl_b2b_scale'].includes(settings.employmentType);
  const showLumpRate = settings.employmentType === 'pl_b2b_lump';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>

      <Section title={t('settings.country')}>
        <View style={styles.grid}>
          {COUNTRIES.map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, settings.country === c && styles.chipActive]} onPress={() => handleCountryChange(c)}>
              <Text style={[styles.chipText, settings.country === c && styles.chipTextActive]}>{t(`settings.country_${c}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      <Section title={t('settings.employmentType')}>
        {employmentTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.option, settings.employmentType === type && styles.optionActive]}
            onPress={() => update('employmentType', type)}
          >
            <View style={[styles.radio, settings.employmentType === type && styles.radioActive]}>
              {settings.employmentType === type && <View style={styles.radioDot} />}
            </View>
            <Text style={[styles.optionText, settings.employmentType === type && styles.optionTextActive]}>
              {t(`settings.employment_${type}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </Section>

      <Section title={t('settings.hourlyRate')}>
        <View style={styles.rateRow}>
          <TextInput
            style={styles.rateInput}
            keyboardType="numeric"
            value={String(settings.hourlyRate)}
            onChangeText={(v) => update('hourlyRate', parseFloat(v.replace(',', '.')) || 0)}
          />
          <Text style={styles.rateCurrency}>{settings.currency}</Text>
        </View>
      </Section>

      <Section title={t('settings.currency')}>
        <View style={styles.chips}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, settings.currency === c && styles.chipActive]} onPress={() => update('currency', c)}>
              <Text style={[styles.chipText, settings.currency === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      <Section title={t('settings.language')}>
        <View style={styles.chips}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity key={l.value} style={[styles.chip, settings.language === l.value && styles.chipActive]} onPress={() => update('language', l.value)}>
              <Text style={[styles.chipText, settings.language === l.value && styles.chipTextActive]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {showTaxRelief && (
        <Section title={t('settings.taxRelief')}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('settings.taxRelief')}</Text>
            <Switch value={settings.taxReliefEnabled} onValueChange={(v) => update('taxReliefEnabled', v)} trackColor={{ true: colors.primary }} />
          </View>
        </Section>
      )}

      {showB2bOptions && (
        <Section title={t('settings.b2bZus')}>
          {(['preferential', 'full'] as const).map((type) => (
            <TouchableOpacity key={type} style={[styles.option, settings.b2bZusType === type && styles.optionActive]} onPress={() => update('b2bZusType', type)}>
              <View style={[styles.radio, settings.b2bZusType === type && styles.radioActive]}>
                {settings.b2bZusType === type && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.optionText, settings.b2bZusType === type && styles.optionTextActive]}>{t(`settings.b2bZus${type.charAt(0).toUpperCase() + type.slice(1)}`)}</Text>
            </TouchableOpacity>
          ))}
        </Section>
      )}

      {showLumpRate && (
        <Section title={t('settings.lumpRate')}>
          <View style={styles.chips}>
            {LUMP_RATES.map((r) => (
              <TouchableOpacity key={r} style={[styles.chip, settings.b2bLumpRate === r && styles.chipActive]} onPress={() => update('b2bLumpRate', r)}>
                <Text style={[styles.chipText, settings.b2bLumpRate === r && styles.chipTextActive]}>{(r * 100).toFixed(1)}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>
      )}

      <TouchableOpacity style={[styles.saveBtn, saved && styles.saveBtnDone]} onPress={handleSave} activeOpacity={0.85}>
        <Ionicons name={saved ? 'checkmark' : 'save-outline'} size={20} color="#fff" />
        <Text style={styles.saveBtnText}>{saved ? t('settings.saved') : t('settings.save')}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.card}>{children}</View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { gap: spacing.xs },
  title: { ...typography.xs, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: spacing.xs },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm },
});

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  grid: { padding: spacing.sm, gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { ...typography.sm, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionActive: { backgroundColor: colors.primaryLight },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  optionText: { ...typography.base, color: colors.textSecondary, flex: 1 },
  optionTextActive: { color: colors.text, fontWeight: '600' },
  rateRow: { flexDirection: 'row', alignItems: 'center', margin: spacing.md, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  rateInput: { flex: 1, padding: spacing.md, ...typography.lg, fontWeight: '600', color: colors.text },
  rateCurrency: { paddingHorizontal: spacing.md, ...typography.base, color: colors.textSecondary, fontWeight: '600', backgroundColor: colors.bg },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  switchLabel: { ...typography.base, color: colors.text },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  saveBtnDone: { backgroundColor: colors.success },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
