import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, getSessions } from '../../src/storage';
import { calculateTax, formatCurrency, hoursToGross, msToHours } from '../../src/utils/tax';
import { UserSettings, WorkSession } from '../../src/types';
import { colors, radius, shadow, spacing, typography } from '../../src/styles/theme';

type Period = 'today' | 'week' | 'month';

function startOf(period: Period): number {
  const now = new Date();
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (period === 'week') {
    const day = now.getDay() || 7;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1).getTime();
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

export default function SummaryScreen() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('month');
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getSessions(), getSettings()]).then(([s, st]) => { setSessions(s); setSettings(st); });
    }, [])
  );

  const filtered = sessions.filter((s) => s.startTime >= startOf(period));
  const totalMs = filtered.reduce((acc, s) => acc + s.durationMs, 0);
  const totalHours = msToHours(totalMs);
  const totalGross = settings ? hoursToGross(totalHours, settings.hourlyRate) : 0;
  const breakdown = settings ? calculateTax(totalGross, settings) : null;
  const totalTax = breakdown ? breakdown.socialContributions + breakdown.healthInsurance + breakdown.incomeTax : 0;

  const periods: { key: Period; icon: string }[] = [
    { key: 'today', icon: 'today-outline' },
    { key: 'week', icon: 'calendar-outline' },
    { key: 'month', icon: 'calendar-number-outline' },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.periodRow}>
        {periods.map(({ key, icon }) => (
          <TouchableOpacity
            key={key}
            style={[styles.periodBtn, period === key && styles.periodBtnActive]}
            onPress={() => setPeriod(key)}
          >
            <Ionicons name={icon as any} size={16} color={period === key ? colors.primary : colors.textSecondary} />
            <Text style={[styles.periodText, period === key && styles.periodTextActive]}>{t(`summary.${key}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bar-chart-outline" size={52} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t('summary.noData')}</Text>
        </View>
      ) : (
        <View style={styles.cards}>
          <View style={styles.hoursCard}>
            <Text style={styles.hoursLabel}>{t('summary.totalHours')}</Text>
            <Text style={styles.hoursValue}>{totalHours.toFixed(2)}<Text style={styles.hoursUnit}>h</Text></Text>
            <Text style={styles.sessionCount}>{filtered.length} session{filtered.length !== 1 ? 's' : ''}</Text>
          </View>

          {breakdown && (
            <>
              <View style={styles.row}>
                <MoneyCard label={t('summary.totalGross')} value={formatCurrency(breakdown.gross, settings!.currency)} />
                <MoneyCard label={t('summary.taxPaid')} value={formatCurrency(totalTax, settings!.currency)} color={colors.danger} />
              </View>
              <View style={[styles.netCard]}>
                <Text style={styles.netLabel}>{t('summary.totalNet')}</Text>
                <Text style={styles.netValue}>{formatCurrency(breakdown.net, settings!.currency)}</Text>
              </View>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function MoneyCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={[cardStyles.card]}>
      <Text style={cardStyles.label}>{label}</Text>
      <Text style={[cardStyles.value, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  label: { ...typography.xs, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.xs },
  value: { ...typography.lg, fontWeight: '700', color: colors.text },
});

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg },
  container: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  periodRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, padding: 4, ...shadow.sm },
  periodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: 10, borderRadius: radius.md },
  periodBtnActive: { backgroundColor: colors.primaryLight },
  periodText: { ...typography.sm, color: colors.textSecondary, fontWeight: '600' },
  periodTextActive: { color: colors.primary, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingTop: 80 },
  emptyText: { ...typography.base, color: colors.textSecondary, textAlign: 'center' },
  cards: { gap: spacing.md },
  hoursCard: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg },
  hoursLabel: { ...typography.sm, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs },
  hoursValue: { fontSize: 52, fontWeight: '200', color: '#fff', lineHeight: 60 },
  hoursUnit: { fontSize: 24, fontWeight: '300' },
  sessionCount: { ...typography.sm, color: 'rgba(255,255,255,0.6)', marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  netCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, ...shadow.md, borderLeftWidth: 4, borderLeftColor: colors.primary },
  netLabel: { ...typography.sm, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs },
  netValue: { ...typography.xxl, fontWeight: '800', color: colors.primary },
});
