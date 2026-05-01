import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import { getSettings, saveSettings } from '../../src/storage';
import { Currency, EmploymentType, Language, UserSettings } from '../../src/types';

const EMPLOYMENT_TYPES: EmploymentType[] = ['employment', 'contract', 'b2b_linear', 'b2b_scale', 'b2b_lump'];
const CURRENCIES: Currency[] = ['PLN', 'EUR', 'GBP', 'USD'];
const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polski' },
];
const LUMP_RATES = [0.085, 0.12, 0.14, 0.15, 0.17];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  async function handleSave() {
    if (!settings) return;
    await saveSettings(settings);
    await i18n.changeLanguage(settings.language);
    Alert.alert('', t('settings.saved'));
  }

  function update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  if (!settings) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section label={t('settings.employmentType')}>
        {EMPLOYMENT_TYPES.map((type) => (
          <OptionButton
            key={type}
            label={t(`settings.employment_${type}`)}
            selected={settings.employmentType === type}
            onPress={() => update('employmentType', type)}
          />
        ))}
      </Section>

      <Section label={t('settings.hourlyRate')}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(settings.hourlyRate)}
          onChangeText={(v) => update('hourlyRate', parseFloat(v.replace(',', '.')) || 0)}
        />
      </Section>

      <Section label={t('settings.currency')}>
        <View style={styles.row}>
          {CURRENCIES.map((c) => (
            <OptionButton
              key={c}
              label={c}
              selected={settings.currency === c}
              onPress={() => update('currency', c)}
              compact
            />
          ))}
        </View>
      </Section>

      <Section label={t('settings.language')}>
        <View style={styles.row}>
          {LANGUAGES.map((l) => (
            <OptionButton
              key={l.value}
              label={l.label}
              selected={settings.language === l.value}
              onPress={() => update('language', l.value)}
              compact
            />
          ))}
        </View>
      </Section>

      {(settings.employmentType === 'employment' || settings.employmentType === 'b2b_scale') && (
        <Section label={t('settings.taxRelief')}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('settings.taxRelief')}</Text>
            <Switch
              value={settings.taxReliefEnabled}
              onValueChange={(v) => update('taxReliefEnabled', v)}
              trackColor={{ true: '#2563eb' }}
            />
          </View>
        </Section>
      )}

      {(settings.employmentType === 'b2b_linear' || settings.employmentType === 'b2b_scale' || settings.employmentType === 'b2b_lump') && (
        <Section label={t('settings.b2bZus')}>
          <OptionButton
            label={t('settings.b2bZusPreferential')}
            selected={settings.b2bZusType === 'preferential'}
            onPress={() => update('b2bZusType', 'preferential')}
          />
          <OptionButton
            label={t('settings.b2bZusFull')}
            selected={settings.b2bZusType === 'full'}
            onPress={() => update('b2bZusType', 'full')}
          />
        </Section>
      )}

      {settings.employmentType === 'b2b_lump' && (
        <Section label={t('settings.lumpRate')}>
          <View style={styles.row}>
            {LUMP_RATES.map((r) => (
              <OptionButton
                key={r}
                label={`${(r * 100).toFixed(1)}%`}
                selected={settings.b2bLumpRate === r}
                onPress={() => update('b2bLumpRate', r)}
                compact
              />
            ))}
          </View>
        </Section>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>{t('settings.save')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function OptionButton({ label, selected, onPress, compact }: { label: string; selected: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected, compact && styles.optionCompact]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 13, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  option: { padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  optionSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  optionCompact: { paddingHorizontal: 12, paddingVertical: 10 },
  optionText: { fontSize: 15, color: '#475569' },
  optionTextSelected: { color: '#2563eb', fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, fontSize: 18, fontWeight: '500' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  switchLabel: { fontSize: 15, color: '#475569' },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
