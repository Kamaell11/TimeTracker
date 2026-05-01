import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
  clearActiveSession,
  getActiveSession,
  getSettings,
  saveSession,
  setActiveSession,
} from '../../src/storage';
import { calculateTax, formatCurrency, formatDuration, hoursToGross, msToHours } from '../../src/utils/tax';
import { UserSettings, WorkSession } from '../../src/types';

export default function TimerScreen() {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualNote, setManualNote] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, active] = await Promise.all([getSettings(), getActiveSession()]);
      if (cancelled) return;
      setSettings(s);
      if (active) {
        setStartTime(active.startTime);
        setElapsed(Date.now() - active.startTime);
        setRunning(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (running && startTime !== null) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, startTime]);

  async function handleStart() {
    const now = Date.now();
    await setActiveSession(now);
    setStartTime(now);
    setElapsed(0);
    setRunning(true);
  }

  async function handleStop() {
    if (!startTime || !settings) return;
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const session: WorkSession = {
      id: String(endTime),
      startTime,
      endTime,
      durationMs,
    };
    await saveSession(session);
    await clearActiveSession();
    setRunning(false);
    setStartTime(null);
    setElapsed(0);
  }

  async function handleSaveManual() {
    const hours = parseFloat(manualHours.replace(',', '.'));
    if (isNaN(hours) || hours <= 0) return;
    const durationMs = hours * 3600 * 1000;
    const now = Date.now();
    const session: WorkSession = {
      id: String(now),
      startTime: now - durationMs,
      endTime: now,
      durationMs,
      note: manualNote || undefined,
      manualEntry: true,
    };
    await saveSession(session);
    setShowManual(false);
    setManualHours('');
    setManualNote('');
  }

  const hours = msToHours(elapsed);
  const gross = settings ? hoursToGross(hours, settings.hourlyRate) : 0;
  const breakdown = settings ? calculateTax(gross, settings) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.timerBox}>
        <Text style={styles.elapsed}>{formatDuration(elapsed)}</Text>
        {running && <Text style={styles.runningLabel}>{t('timer.running')}</Text>}
      </View>

      {breakdown && (
        <View style={styles.earningsBox}>
          <Text style={styles.earningsLabel}>{t('timer.estimated')}</Text>
          <View style={styles.row}>
            <Text style={styles.earningsSubLabel}>{t('timer.gross')}</Text>
            <Text style={styles.earningsValue}>{formatCurrency(breakdown.gross, settings!.currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.earningsSubLabel}>{t('timer.net')}</Text>
            <Text style={[styles.earningsValue, styles.netValue]}>{formatCurrency(breakdown.net, settings!.currency)}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, running ? styles.btnStop : styles.btnStart]}
        onPress={running ? handleStop : handleStart}
      >
        <Text style={styles.btnText}>{running ? t('timer.stop') : t('timer.start')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowManual(true)}>
        <Text style={styles.btnSecondaryText}>{t('timer.addManual')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/calculator')}>
        <Text style={styles.btnSecondaryText}>{t('calculator.title')}</Text>
      </TouchableOpacity>

      <Modal visible={showManual} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t('timer.addManual')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('timer.manualHours')}
              keyboardType="numeric"
              value={manualHours}
              onChangeText={setManualHours}
            />
            <TextInput
              style={styles.input}
              placeholder={t('timer.manualNote')}
              value={manualNote}
              onChangeText={setManualNote}
            />
            <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={handleSaveManual}>
              <Text style={styles.btnText}>{t('timer.save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowManual(false)}>
              <Text style={styles.btnSecondaryText}>{t('timer.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', padding: 24, gap: 16 },
  timerBox: { alignItems: 'center', marginTop: 32 },
  elapsed: { fontSize: 64, fontWeight: '200', fontVariant: ['tabular-nums'], letterSpacing: 2 },
  runningLabel: { color: '#16a34a', fontSize: 14, marginTop: 4 },
  earningsBox: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, gap: 8 },
  earningsLabel: { fontSize: 13, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsSubLabel: { fontSize: 15, color: '#475569' },
  earningsValue: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  netValue: { color: '#2563eb' },
  btn: { width: '100%', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  btnStart: { backgroundColor: '#2563eb' },
  btnStop: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  btnSecondary: { width: '100%', paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  btnSecondaryText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 16 },
});
