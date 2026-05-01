import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getSettings, getSessions } from '../../src/storage';
import { calculateTax, formatCurrency, hoursToGross, msToHours } from '../../src/utils/tax';
import { UserSettings, WorkSession } from '../../src/types';

type Period = 'today' | 'week' | 'month';

function startOf(period: Period): number {
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if (period === 'week') {
    const day = now.getDay() || 7;
    const diff = now.getDate() - day + 1;
    return new Date(now.getFullYear(), now.getMonth(), diff).getTime();
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
      Promise.all([getSessions(), getSettings()]).then(([s, st]) => {
        setSessions(s);
        setSettings(st);
      });
    }, [])
  );

  const filtered = sessions.filter((s) => s.startTime >= startOf(period));
  const totalMs = filtered.reduce((acc, s) => acc + s.durationMs, 0);
  const totalHours = msToHours(totalMs);
  const totalGross = settings ? hoursToGross(totalHours, settings.hourlyRate) : 0;
  const breakdown = settings ? calculateTax(totalGross, settings) : null;

  const periods: Period[] = ['today', 'week', 'month'];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.tabs}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.tab, period === p && styles.tabActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
              {t(`summary.${p}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('summary.noData')}</Text>
        </View>
      ) : (
        <View style={styles.cards}>
          <StatCard label={t('summary.totalHours')} value={`${totalHours.toFixed(2)}h`} />
          {breakdown && (
            <>
              <StatCard label={t('summary.totalGross')} value={formatCurrency(breakdown.gross, settings!.currency)} />
              <StatCard label={t('summary.taxPaid')} value={formatCurrency(breakdown.zusEmployee + breakdown.healthInsurance + breakdown.incomeTax, settings!.currency)} accent="#dc2626" />
              <StatCard label={t('summary.totalNet')} value={formatCurrency(breakdown.net, settings!.currency)} accent="#2563eb" large />
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, accent, large }: { label: string; value: string; accent?: string; large?: boolean }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, large && styles.cardValueLarge, accent ? { color: accent } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16 },
  tabs: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  tabTextActive: { color: '#1e293b', fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: '#94a3b8', fontSize: 16 },
  cards: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardLabel: { fontSize: 13, color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  cardValue: { fontSize: 24, fontWeight: '600', color: '#1e293b' },
  cardValueLarge: { fontSize: 32, fontWeight: '700' },
});
