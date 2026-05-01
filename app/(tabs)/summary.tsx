import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, getSessions } from '../../src/storage';
import { calculateTax, formatCurrency, hoursToGross, msToHours } from '../../src/utils/tax';
import { UserSettings, WorkSession } from '../../src/types';
import { useTheme } from '../../src/context/ThemeContext';
import { radius, shadow, shadowSm, spacing } from '../../src/styles/theme';

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
  const { colors } = useTheme();
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
  const totalDeductions = breakdown ? breakdown.socialContributions + breakdown.healthInsurance + breakdown.incomeTax : 0;

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: t('summary.today') },
    { key: 'week', label: t('summary.week') },
    { key: 'month', label: t('summary.month') },
  ];

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={[st.container, { backgroundColor: colors.bg }]}>

      {/* Period selector */}
      <View style={[st.periodWrap, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
        {periods.map(({ key, label }) => (
          <TouchableOpacity key={key} style={[st.periodBtn, period === key && { backgroundColor: colors.primaryLight }]} onPress={() => setPeriod(key)}>
            <Text style={[st.periodText, { color: period === key ? colors.primary : colors.textSec }, period === key && st.periodTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={[st.empty, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
          <Ionicons name="stats-chart-outline" size={40} color={colors.textMuted} />
          <Text style={[st.emptyText, { color: colors.textSec }]}>{t('summary.noData')}</Text>
        </View>
      ) : (
        <>
          {/* Hours card */}
          <LinearGradient colors={colors.primaryGrad} style={st.hoursCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={st.hoursLabel}>{t('summary.totalHours')}</Text>
            <Text style={st.hoursValue}>{totalHours.toFixed(2)}<Text style={st.hoursUnit}>h</Text></Text>
            <Text style={st.sessionCount}>{filtered.length} session{filtered.length !== 1 ? 's' : ''}</Text>
            <View style={st.hoursDecor} />
          </LinearGradient>

          {/* Gross / Tax row */}
          {breakdown && (
            <>
              <View style={st.row}>
                <View style={[st.statCard, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
                  <View style={[st.statIcon, { backgroundColor: colors.surface2 }]}>
                    <Ionicons name="trending-up-outline" size={18} color={colors.textSec} />
                  </View>
                  <Text style={[st.statLabel, { color: colors.textMuted }]}>{t('summary.totalGross')}</Text>
                  <Text style={[st.statValue, { color: colors.text }]}>{formatCurrency(breakdown.gross, settings!.currency)}</Text>
                </View>
                <View style={[st.statCard, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
                  <View style={[st.statIcon, { backgroundColor: colors.dangerLight }]}>
                    <Ionicons name="remove-circle-outline" size={18} color={colors.danger} />
                  </View>
                  <Text style={[st.statLabel, { color: colors.textMuted }]}>{t('summary.taxPaid')}</Text>
                  <Text style={[st.statValue, { color: colors.danger }]}>{formatCurrency(totalDeductions, settings!.currency)}</Text>
                </View>
              </View>

              {/* Net card */}
              <View style={[st.netCard, { backgroundColor: colors.surface, ...shadow(colors.shadow) }]}>
                <View style={st.netLeft}>
                  <Text style={[st.netLabel, { color: colors.textMuted }]}>{t('summary.totalNet')}</Text>
                  <Text style={[st.netValue, { color: colors.primary }]}>{formatCurrency(breakdown.net, settings!.currency)}</Text>
                </View>
                <View style={[st.netBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[st.netBadgeText, { color: colors.primary }]}>
                    {((breakdown.net / breakdown.gross) * 100).toFixed(0)}%
                  </Text>
                  <Text style={[st.netBadgeSub, { color: colors.primary }]}>kept</Text>
                </View>
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  periodWrap: { flexDirection: 'row', borderRadius: radius.lg, padding: 4 },
  periodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md },
  periodText: { fontSize: 13, fontWeight: '600' },
  periodTextActive: { fontWeight: '800' },
  empty: { borderRadius: radius.xl, padding: spacing.xxl, alignItems: 'center', gap: spacing.md },
  emptyText: { fontSize: 15, textAlign: 'center' },
  hoursCard: { borderRadius: radius.xxl, padding: spacing.lg, overflow: 'hidden' },
  hoursLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: spacing.xs },
  hoursValue: { color: '#fff', fontSize: 60, fontWeight: '200', lineHeight: 68 },
  hoursUnit: { fontSize: 28, fontWeight: '300' },
  sessionCount: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: spacing.xs },
  hoursDecor: { position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' },
  row: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm },
  statIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  netCard: { borderRadius: radius.xxl, padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netLeft: { gap: spacing.xs },
  netLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  netValue: { fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'] },
  netBadge: { alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, minWidth: 72 },
  netBadgeText: { fontSize: 26, fontWeight: '800' },
  netBadgeSub: { fontSize: 11, fontWeight: '600', opacity: 0.7 },
});
