import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { deleteSession, getSettings, getSessions } from '../../src/storage';
import { calculateTax, formatCurrency, formatDuration, hoursToGross, msToHours } from '../../src/utils/tax';
import { UserSettings, WorkSession } from '../../src/types';

export default function HistoryScreen() {
  const { t } = useTranslation();
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

  async function handleDelete(id: string) {
    Alert.alert('', t('history.confirmDelete'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: async () => {
          await deleteSession(id);
          setSessions((prev) => prev.filter((s) => s.id !== id));
        },
      },
    ]);
  }

  function renderItem({ item }: { item: WorkSession }) {
    const hours = msToHours(item.durationMs);
    const gross = settings ? hoursToGross(hours, settings.hourlyRate) : 0;
    const breakdown = settings ? calculateTax(gross, settings) : null;
    const date = new Date(item.startTime);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.dateText}>{dateStr} · {timeStr}</Text>
            {item.note && <Text style={styles.noteText}>{item.note}</Text>}
            {item.manualEntry && <Text style={styles.badge}>{t('history.manualBadge')}</Text>}
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>{t('history.delete')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.duration}>{formatDuration(item.durationMs)}</Text>
          {breakdown && (
            <View style={styles.earningsRow}>
              <Text style={styles.grossText}>{formatCurrency(breakdown.gross, settings!.currency)} {t('timer.gross')}</Text>
              <Text style={styles.netText}>{formatCurrency(breakdown.net, settings!.currency)} {t('timer.net')}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('history.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  dateText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  noteText: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: 11, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  deleteBtn: { padding: 4 },
  deleteText: { color: '#dc2626', fontSize: 14, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  duration: { fontSize: 22, fontWeight: '300', fontVariant: ['tabular-nums'] },
  earningsRow: { alignItems: 'flex-end', gap: 2 },
  grossText: { fontSize: 13, color: '#64748b' },
  netText: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
});
