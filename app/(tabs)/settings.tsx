import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';
import { getSettings, saveSettings } from '../../src/storage';
import { Country, Currency, Language, UserSettings, COUNTRY_DEFAULTS, COUNTRY_EMPLOYMENT_TYPES } from '../../src/types';
import { useTheme } from '../../src/context/ThemeContext';
import { radius, shadowSm, spacing } from '../../src/styles/theme';

const COUNTRIES: Country[] = ['PL', 'NO', 'UK', 'DE'];
const CURRENCIES: Currency[] = ['PLN', 'NOK', 'GBP', 'EUR', 'USD'];
const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polski' },
];
const LUMP_RATES = [0.085, 0.12, 0.14, 0.15, 0.17];
const THEME_MODES = [
  { value: 'light', icon: 'sunny-outline', label: 'Light' },
  { value: 'dark', icon: 'moon-outline', label: 'Dark' },
  { value: 'auto', icon: 'contrast-outline', label: 'Auto' },
] as const;

export default function SettingsScreen() {
  const { t, i18n: i18nHook } = useTranslation();
  const { colors, mode, setMode } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [, forceRerender] = useState(0);

  useEffect(() => { getSettings().then(setSettings); }, []);

  function update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
    setUnsaved(true);
  }

  function handleLanguageChange(lang: Language) {
    update('language', lang);
    i18nHook.changeLanguage(lang).then(() => forceRerender(n => n + 1));
  }

  function handleCountryChange(country: Country) {
    const d = COUNTRY_DEFAULTS[country];
    setSettings((prev) => prev ? { ...prev, country, employmentType: d.employmentType, currency: d.currency } : prev);
    setUnsaved(true);
  }

  async function handleSave() {
    if (!settings) return;
    await saveSettings(settings);
    await i18nHook.changeLanguage(settings.language);
    setSaved(true);
    setUnsaved(false);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) return null;

  const employmentTypes = COUNTRY_EMPLOYMENT_TYPES[settings.country];
  const showB2bOptions = ['pl_b2b_linear', 'pl_b2b_scale', 'pl_b2b_lump'].includes(settings.employmentType);
  const showTaxRelief = ['pl_employment', 'pl_b2b_scale'].includes(settings.employmentType);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={[st.container, { backgroundColor: colors.bg }]}>

      {/* Appearance */}
      <SectionHeader title="Appearance" colors={colors} />
      <View style={[st.card, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
        <View style={st.themeRow}>
          {THEME_MODES.map(({ value, icon, label }) => (
            <TouchableOpacity key={value} style={[st.themeBtn, { borderColor: mode === value ? colors.primary : colors.border, backgroundColor: mode === value ? colors.primaryLight : colors.surface2 }]} onPress={() => setMode(value)}>
              <Ionicons name={icon as any} size={20} color={mode === value ? colors.primary : colors.textMuted} />
              <Text style={[st.themeBtnText, { color: mode === value ? colors.primary : colors.textSec }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Language */}
      <SectionHeader title={t('settings.language')} colors={colors} />
      <View style={[st.card, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
        <View style={st.pillRow}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity key={l.value} style={[st.pill, { borderColor: settings.language === l.value ? colors.primary : colors.border, backgroundColor: settings.language === l.value ? colors.primaryLight : 'transparent' }]} onPress={() => handleLanguageChange(l.value)}>
              <Text style={[st.pillText, { color: settings.language === l.value ? colors.primary : colors.textSec }]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Country */}
      <SectionHeader title={t('settings.country')} colors={colors} />
      <View style={[st.card, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
        {COUNTRIES.map((c, i) => (
          <TouchableOpacity key={c} style={[st.row, { borderBottomWidth: i < COUNTRIES.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight }]} onPress={() => handleCountryChange(c)}>
            <Text style={[st.rowText, { color: colors.text }]}>{t(`settings.country_${c}`)}</Text>
            {settings.country === c && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Employment type */}
      <SectionHeader title={t('settings.employmentType')} colors={colors} />
      <View style={[st.card, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
        {employmentTypes.map((type, i) => (
          <TouchableOpacity key={type} style={[st.row, { borderBottomWidth: i < employmentTypes.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight, backgroundColor: settings.employmentType === type ? colors.primaryLight : 'transparent' }]} onPress={() => update('employmentType', type)}>
            <Text style={[st.rowText, { color: settings.employmentType === type ? colors.primary : colors.text, fontWeight: settings.employmentType === type ? '600' : '400' }]}>{t(`settings.employment_${type}`)}</Text>
            {settings.employmentType === type && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Hourly rate */}
      <SectionHeader title={t('settings.hourlyRate')} colors={colors} />
      <View style={[st.card, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
        <View style={[st.rateWrap, { borderColor: colors.border }]}>
          <TextInput
            style={[st.rateInput, { color: colors.text }]}
            keyboardType="numeric"
            value={String(settings.hourlyRate)}
            onChangeText={(v) => update('hourlyRate', parseFloat(v.replace(',', '.')) || 0)}
            selectionColor={colors.primary}
          />
          <View style={[st.rateUnit, { backgroundColor: colors.surface2, borderLeftColor: colors.border }]}>
            <Text style={[st.rateUnitText, { color: colors.textSec }]}>{settings.currency}/h</Text>
          </View>
        </View>
      </View>

      {/* Currency */}
      <SectionHeader title={t('settings.currency')} colors={colors} />
      <View style={[st.card, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
        <View style={st.pillRow}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity key={c} style={[st.pill, { borderColor: settings.currency === c ? colors.primary : colors.border, backgroundColor: settings.currency === c ? colors.primaryLight : 'transparent' }]} onPress={() => update('currency', c)}>
              <Text style={[st.pillText, { color: settings.currency === c ? colors.primary : colors.textSec }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tax relief toggle */}
      {showTaxRelief && (
        <>
          <SectionHeader title="Tax options" colors={colors} />
          <View style={[st.card, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
            <View style={st.switchRow}>
              <View>
                <Text style={[st.switchLabel, { color: colors.text }]}>{t('settings.taxRelief')}</Text>
                <Text style={[st.switchSub, { color: colors.textMuted }]}>30,000 PLN / year</Text>
              </View>
              <Switch value={settings.taxReliefEnabled} onValueChange={(v) => update('taxReliefEnabled', v)} trackColor={{ true: colors.primary }} thumbColor="#fff" />
            </View>
          </View>
        </>
      )}

      {/* Custom tax */}
      <SectionHeader title={t('settings.customTax')} colors={colors} />
      <View style={[st.card, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
        <View style={[st.switchRow, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={[st.switchLabel, { color: colors.text }]}>{t('settings.customTax')}</Text>
            <Text style={[st.switchSub, { color: colors.textMuted }]}>{t('settings.customTaxSub')}</Text>
          </View>
          <Switch value={!!settings.useCustomTax} onValueChange={(v) => update('useCustomTax', v)} trackColor={{ true: colors.primary }} thumbColor="#fff" />
        </View>
        {settings.useCustomTax && (
          <View style={[st.rateWrap, { borderColor: colors.border, margin: spacing.md, marginTop: spacing.sm }]}>
            <TextInput
              style={[st.rateInput, { color: colors.text, fontSize: 18 }]}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={settings.customTaxPercent != null ? String(settings.customTaxPercent) : ''}
              onChangeText={(v) => update('customTaxPercent', parseFloat(v.replace(',', '.')) || 0)}
              selectionColor={colors.primary}
            />
            <View style={[st.rateUnit, { backgroundColor: colors.surface2, borderLeftColor: colors.border }]}>
              <Text style={[st.rateUnitText, { color: colors.textSec }]}>%</Text>
            </View>
          </View>
        )}
      </View>

      {/* B2B ZUS */}
      {showB2bOptions && (
        <>
          <SectionHeader title={t('settings.b2bZus')} colors={colors} />
          <View style={[st.card, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
            {(['preferential', 'full'] as const).map((type, i) => (
              <TouchableOpacity key={type} style={[st.row, { borderBottomWidth: i === 0 ? 1 : 0, borderBottomColor: colors.borderLight, backgroundColor: settings.b2bZusType === type ? colors.primaryLight : 'transparent' }]} onPress={() => update('b2bZusType', type)}>
                <Text style={[st.rowText, { color: settings.b2bZusType === type ? colors.primary : colors.text, fontWeight: settings.b2bZusType === type ? '600' : '400' }]}>{t(`settings.b2bZus${type.charAt(0).toUpperCase() + type.slice(1)}`)}</Text>
                {settings.b2bZusType === type && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Lump rate */}
      {settings.employmentType === 'pl_b2b_lump' && (
        <>
          <SectionHeader title={t('settings.lumpRate')} colors={colors} />
          <View style={[st.card, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
            <View style={st.pillRow}>
              {LUMP_RATES.map((r) => (
                <TouchableOpacity key={r} style={[st.pill, { borderColor: settings.b2bLumpRate === r ? colors.primary : colors.border, backgroundColor: settings.b2bLumpRate === r ? colors.primaryLight : 'transparent' }]} onPress={() => update('b2bLumpRate', r)}>
                  <Text style={[st.pillText, { color: settings.b2bLumpRate === r ? colors.primary : colors.textSec }]}>{(r * 100).toFixed(1)}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Save button */}
      {unsaved && !saved && (
        <View style={[st.unsavedBanner, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
          <Text style={[st.unsavedText, { color: colors.warning }]}>Unsaved changes</Text>
        </View>
      )}
      <TouchableOpacity style={[st.saveBtn, { backgroundColor: saved ? '#059669' : colors.primary }]} onPress={handleSave} activeOpacity={0.85}>
        <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={20} color="#fff" />
        <Text style={st.saveBtnText}>{saved ? t('settings.saved') : t('settings.save')}</Text>
      </TouchableOpacity>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return <Text style={[hst.label, { color: colors.textMuted }]}>{title.toUpperCase()}</Text>;
}
const hst = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, paddingHorizontal: spacing.xs, marginTop: spacing.xs },
});

const st = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: { borderRadius: radius.xl, overflow: 'hidden' },
  themeRow: { flexDirection: 'row', padding: spacing.sm, gap: spacing.sm },
  themeBtn: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1.5 },
  themeBtnText: { fontSize: 12, fontWeight: '700' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, gap: spacing.xs },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5 },
  pillText: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14 },
  rowText: { fontSize: 15 },
  rateWrap: { flexDirection: 'row', margin: spacing.md, borderWidth: 1.5, borderRadius: radius.md, overflow: 'hidden' },
  rateInput: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 22, fontWeight: '600' },
  rateUnit: { paddingHorizontal: spacing.md, justifyContent: 'center', borderLeftWidth: 1.5 },
  rateUnitText: { fontSize: 15, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  switchLabel: { fontSize: 15, fontWeight: '500' },
  switchSub: { fontSize: 12, marginTop: 2 },
  saveBtn: { borderRadius: radius.xl, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  unsavedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, marginTop: spacing.xs },
  unsavedText: { fontSize: 13, fontWeight: '600' },
});
