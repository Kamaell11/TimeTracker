import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { deleteSession, getSettings, getSessions } from '../../src/storage';
import { calculateTax, formatCurrency, formatDuration, hoursToGross, msToHours } from '../../src/utils/tax';
import { UserSettings, WorkSession } from '../../src/types';
import { useTheme } from '../../src/context/ThemeContext';
import { radius, shadow, shadowSm, spacing } from '../../src/styles/theme';

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
    Alert.alert(t('history.confirmDelete'), '', [
      { text: t('common.no'), style: 'cancel' },
      { text: t('common.yes'), style: 'destructive', onPress: async () => {
        await deleteSession(id);
        setSessions((prev) => prev.filter((s) => s.id !== id));
      }},
    ]);
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
          <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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

        {(item.note || item.manualEntry) && (
          <View style={st.cardFooter}>
            {item.manualEntry && (
              <View style={[st.badge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[st.badgeText, { color: colors.primary }]}>{t('history.manualBadge')}</Text>
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
});
