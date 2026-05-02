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

function buildCsv(sessions: WorkSession[], settings: UserSettings): string {
  const header = ['Date', 'Start', 'End', 'Duration (h)', 'Gross', 'Net', 'Currency', 'Holiday', 'Note'].join(',');
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

  function renderItem({ item, index }: { item: WorkSession; index: number }) {
    const hours = msToHours(item.durationMs);
    const gross = settings ? hoursToGross(hours, settings.hourlyRate) : 0;
    const breakdown = settings ? calculateTax(gross, settings) : null;
    const date = new Date(item.startTime);
    const isToday = new Date().toDateString() === date.toDateString();

    return (
      <View style={[st.card, { backgroundColor: colors.surface, ...shadowSm(colors.shadow) }]}>
        <View style={st.cardTop}>
          <View style={[st.datePill, { backgroundColor: isToday ? colors.primaryLight : colors.surface2 }]}>
            <Text style={[st.dateDay, { color: isToday ? colors.primary : colors.textSec }]}>
              {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <Text style={[st.dateTime, { color: colors.textMuted }]}>
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={st.deleteBtn}>
            <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={st.cardMain}>
          <Text style={[st.duration, { color: colors.text }]}>{formatDuration(item.durationMs)}</Text>
          <View style={st.earningsCol}>
            {breakdown && (
              <>
                <Text style={[st.netAmount, { color: colors.primary }]}>{formatCurrency(breakdown.net, settings!.currency)}</Text>
                <Text style={[st.grossAmount, { color: colors.textMuted }]}>{formatCurrency(breakdown.gross, settings!.currency)} gross</Text>
              </>
            )}
          </View>
        </View>

        {(item.note || item.manualEntry || item.holidayMode) && (
          <View style={st.cardFooter}>
            {item.manualEntry && (
              <View style={[st.badge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[st.badgeText, { color: colors.primary }]}>{t('history.manualBadge')}</Text>
              </View>
            )}
            {item.holidayMode && (
              <View style={[st.badge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[st.badgeText, { color: '#92400E' }]}>🎉 {t('history.holidayBadge')}</Text>
              </View>
            )}
            {item.note && <Text style={[st.note, { color: colors.textSec }]}>{item.note}</Text>}
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
      data={sessions}
      keyExtractor={(item) => item.id}
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
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  card: { borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  deleteBtn: { padding: 8 },
  datePill: { borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  dateDay: { fontSize: 14, fontWeight: '700' },
  dateTime: { fontSize: 12, marginTop: 1 },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  duration: { fontSize: 34, fontWeight: '200', fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
  earningsCol: { alignItems: 'flex-end', gap: 2 },
  netAmount: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  grossAmount: { fontSize: 12, fontVariant: ['tabular-nums'] },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  note: { fontSize: 13, fontStyle: 'italic' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth: 1.5, alignSelf: 'flex-end', marginBottom: spacing.sm },
  exportText: { fontSize: 13, fontWeight: '700' },
});
