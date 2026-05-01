import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { deleteSession, getSettings, getSessions } from '../../src/storage';
import { calculateTax, formatCurrency, formatDuration, hoursToGross, msToHours } from '../../src/utils/tax';
import { UserSettings, WorkSession } from '../../src/types';
import { colors, radius, shadow, spacing, typography } from '../../src/styles/theme';

export default function HistoryScreen() {
  const { t } = useTranslation();
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

  function renderItem({ item }: { item: WorkSession }) {
    const hours = msToHours(item.durationMs);
    const gross = settings ? hoursToGross(hours, settings.hourlyRate) : 0;
    const breakdown = settings ? calculateTax(gross, settings) : null;
    const date = new Date(item.startTime);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.dateBlock}>
            <Text style={styles.dayNum}>{date.getDate()}</Text>
            <View>
              <Text style={styles.monthYear}>{date.toLocaleString('default', { month: 'short', year: 'numeric' })}</Text>
              <Text style={styles.time}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {item.note && <Text style={styles.note}>{item.note}</Text>}
        {item.manualEntry && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('history.manualBadge')}</Text>
          </View>
        )}

        <View style={styles.cardBottom}>
          <Text style={styles.duration}>{formatDuration(item.durationMs)}</Text>
          {breakdown && (
            <View style={styles.earnings}>
              <Text style={styles.earningsGross}>{formatCurrency(breakdown.gross, settings!.currency)}</Text>
              <Text style={styles.earningsNet}>{formatCurrency(breakdown.net, settings!.currency)} {t('timer.net')}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="time-outline" size={56} color={colors.textMuted} />
        <Text style={styles.emptyText}>{t('history.empty')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      style={styles.root}
    />
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg },
  list: { padding: spacing.md, gap: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.bg, padding: spacing.xl },
  emptyText: { ...typography.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dateBlock: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayNum: { fontSize: 32, fontWeight: '200', color: colors.text, lineHeight: 36 },
  monthYear: { ...typography.sm, color: colors.textSecondary, fontWeight: '500' },
  time: { ...typography.xs, color: colors.textMuted },
  note: { ...typography.sm, color: colors.textSecondary, fontStyle: 'italic' },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.xs, color: colors.primary, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.xs },
  duration: { fontSize: 28, fontWeight: '300', color: colors.text, fontVariant: ['tabular-nums'] },
  earnings: { alignItems: 'flex-end' },
  earningsGross: { ...typography.sm, color: colors.textSecondary },
  earningsNet: { ...typography.md, fontWeight: '700', color: colors.primary },
});
