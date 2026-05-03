import { useCallback, useState } from 'react';
import { FlatList, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { deleteSession, getSettings, getSessions } from '../../src/storage';
import { calculateTax, formatCurrency, formatDuration, hoursToGross, msToHours } from '../../src/utils/tax';
import { UserSettings, WorkSession } from '../../src/types';
import { useTheme } from '../../src/context/ThemeContext';
import { radius, shadow, shadowSm, spacing } from '../../src/styles/theme';

type ListItem =
  | { type: 'month'; key: string; label: string }
  | { type: 'day'; key: string; label: string; totalMs: number }
  | { type: 'session'; key: string; data: WorkSession };

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function buildListItems(sessions: WorkSession[], todayLabel: string, yesterdayLabel: string): ListItem[] {
  const dayTotals = new Map<string, number>();
  for (const s of sessions) {
    const k = dayKey(s.startTime);
    dayTotals.set(k, (dayTotals.get(k) ?? 0) + s.durationMs);
  }

  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86400000).toDateString();

  const items: ListItem[] = [];
  let lastMonth = '';
  let lastDay = '';

  for (const session of sessions) {
    const date = new Date(session.startTime);
    const mKey = `${date.getFullYear()}-${date.getMonth()}`;
    const dKey = dayKey(session.startTime);

    if (mKey !== lastMonth) {
      items.push({
        type: 'month',
        key: `month-${mKey}`,
        label: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      });
      lastMonth = mKey;
      lastDay = '';
    }

    if (dKey !== lastDay) {
      let label: string;
      if (date.toDateString() === todayStr) label = todayLabel;
      else if (date.toDateString() === yesterdayStr) label = yesterdayLabel;
      else label = date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

      items.push({ type: 'day', key: `day-${dKey}`, label, totalMs: dayTotals.get(dKey) ?? 0 });
      lastDay = dKey;
    }

    items.push({ type: 'session', key: session.id, data: session });
  }

  return items;
}

function buildCsv(sessions: WorkSession[], settings: UserSettings): string {
  const header = ['Date', 'Start', 'End', 'Duration (h)', 'Gross', 'Net', 'Currency', 'Project', 'Holiday', 'Note'].join(',');
  const rows = sessions.map((s) => {
    const hours = msToHours(s.durationMs);
    const bd = calculateTax(hoursToGross(hours, settings.hourlyRate), settings);
    const date = new Date(s.startTime);
    return [
      date.toLocaleDateString('en-CA'),
      new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hours.toFixed(2),
      bd.gross.toFixed(2),
      bd.net.toFixed(2),
      settings.currency,
      s.project ?? '',
      s.holidayMode ? 'yes' : 'no',
      s.note ? `"${s.note.replace(/"/g, '""')}"` : '',
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

function downloadCsvWeb(csv: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timetracker-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getSessions(), getSettings()]).then(([s, st]) => { setSessions(s); setSettings(st); });
    }, [])
  );

  async function handleDelete(id: string) {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleExport() {
    if (!settings || sessions.length === 0) return;
    const csv = buildCsv(sessions, settings);
    if (Platform.OS === 'web') {
      downloadCsvWeb(csv);
    } else {
      await Share.share({ message: csv, title: 'TimeTracker export' });
    }
  }

  const listItems = buildListItems(sessions, t('history.today'), t('history.yesterday'));

  function renderItem({ item }: { item: ListItem }) {
    if (item.type === 'month') {
      return (
        <View style={st.monthHeader}>
          <Text style={[st.monthLabel, { color: colors.textMuted }]}>{item.label.toUpperCase()}</Text>
          <View style={[st.monthLine, { backgroundColor: colors.borderLight }]} />
        </View>
      );
    }

    if (item.type === 'day') {
      return (
        <View style={[st.dayHeader, { borderLeftColor: colors.primary }]}>
          <Text style={[st.dayLabel, { color: colors.text }]}>{item.label}</Text>
          <Text style={[st.dayTotal, { color: colors.textMuted }]}>{formatDuration(item.totalMs)} {t('history.dayTotal')}</Text>
        </View>
      );
    }

    const session = item.data;
    const hours = msToHours(session.durationMs);
    const gross = settings ? hoursToGross(hours, settings.hourlyRate) : 0;
    const breakdown = settings ? calculateTax(gross, settings) : null;
    const date = new Date(session.startTime);
    const timeRange = `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    return (
      <View style={[st.card, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
        <View style={st.cardTop}>
          <Text style={[st.timeRange, { color: colors.textMuted }]}>{timeRange}</Text>
          <TouchableOpacity onPress={() => handleDelete(session.id)} style={st.deleteBtn}>
            <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={st.cardMain}>
          <Text style={[st.duration, { color: colors.text }]}>{formatDuration(session.durationMs)}</Text>
          <View style={st.earningsCol}>
            {breakdown && (
              <>
                <Text style={[st.netAmount, { color: colors.primary }]}>{formatCurrency(breakdown.net, settings!.currency)}</Text>
                <Text style={[st.grossAmount, { color: colors.textMuted }]}>{formatCurrency(breakdown.gross, settings!.currency)} gross</Text>
              </>
            )}
          </View>
        </View>

        {(session.note || session.manualEntry || session.holidayMode || session.project) && (
          <View style={st.cardFooter}>
            {session.project && (
              <View style={[st.badge, { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border }]}>
                <Ionicons name="briefcase-outline" size={10} color={colors.textSec} />
                <Text style={[st.badgeText, { color: colors.textSec }]}>{session.project}</Text>
              </View>
            )}
            {session.manualEntry && (
              <View style={[st.badge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[st.badgeText, { color: colors.primary }]}>{t('history.manualBadge')}</Text>
              </View>
            )}
            {session.holidayMode && (
              <View style={[st.badge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[st.badgeText, { color: '#92400E' }]}>🎉 {t('history.holidayBadge')}</Text>
              </View>
            )}
            {session.note && <Text style={[st.note, { color: colors.textSec }]}>{session.note}</Text>}
          </View>
        )}
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={[st.empty, { backgroundColor: colors.bg }]}>
        <View style={[st.emptyIcon, { backgroundColor: colors.surface2 }]}>
          <Ionicons name="time-outline" size={40} color={colors.textMuted} />
        </View>
        <Text style={[st.emptyTitle, { color: colors.text }]}>{t('history.title')}</Text>
        <Text style={[st.emptySubtitle, { color: colors.textSec }]}>{t('history.empty')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={listItems}
      keyExtractor={(item) => item.key}
      renderItem={renderItem}
      contentContainerStyle={[st.list, { backgroundColor: colors.bg }]}
      style={{ backgroundColor: colors.bg }}
      ListHeaderComponent={
        <TouchableOpacity onPress={handleExport} style={[st.exportBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="download-outline" size={17} color={colors.primary} />
          <Text style={[st.exportText, { color: colors.primary }]}>{t('history.exportCsv')}</Text>
        </TouchableOpacity>
      }
    />
  );
}

const st = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  monthLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  monthLine: { flex: 1, height: 1 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: spacing.sm, borderLeftWidth: 3, marginBottom: spacing.xs, marginTop: spacing.sm },
  dayLabel: { fontSize: 14, fontWeight: '700' },
  dayTotal: { fontSize: 12, fontWeight: '500' },
  card: { borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.xs },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteBtn: { padding: 8 },
  timeRange: { fontSize: 13, fontWeight: '500' },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  duration: { fontSize: 34, fontWeight: '200', fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
  earningsCol: { alignItems: 'flex-end', gap: 2 },
  netAmount: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  grossAmount: { fontSize: 12, fontVariant: ['tabular-nums'] },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  note: { fontSize: 13, fontStyle: 'italic' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth: 1.5, alignSelf: 'flex-end', marginBottom: spacing.sm },
  exportText: { fontSize: 13, fontWeight: '700' },
});
