import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clearActiveSession, getActiveSession, getSettings, saveSession, setActiveSession } from '../../src/storage';
import { calculateTax, formatCurrency, formatDuration, hoursToGross, msToHours } from '../../src/utils/tax';
import { UserSettings, WorkSession } from '../../src/types';
import { colors, radius, shadow, spacing, typography } from '../../src/styles/theme';

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
      intervalRef.current = setInterval(() => setElapsed(Date.now() - startTime), 1000);
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
    const session: WorkSession = { id: String(endTime), startTime, endTime, durationMs: endTime - startTime };
    await saveSession(session);
    await clearActiveSession();
    setRunning(false);
    setStartTime(null);
    setElapsed(0);
  }

  async function handleSaveManual() {
    const hours = parseFloat(manualHours.replace(',', '.'));
    if (isNaN(hours) || hours <= 0) return;
    const now = Date.now();
    const session: WorkSession = {
      id: String(now), startTime: now - hours * 3600000, endTime: now,
      durationMs: hours * 3600000, note: manualNote || undefined, manualEntry: true,
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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.container} bounces={false}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>TimeTracker</Text>
          <TouchableOpacity onPress={() => router.push('/calculator')} style={styles.calcBtn}>
            <Ionicons name="calculator-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.timerCard, running && styles.timerCardRunning]}>
          <Text style={styles.timerLabel}>{t('timer.elapsed')}</Text>
          <Text style={styles.timerDisplay}>{formatDuration(elapsed)}</Text>
          {running && (
            <View style={styles.runningBadge}>
              <View style={styles.runningDot} />
              <Text style={styles.runningText}>{t('timer.running')}</Text>
            </View>
          )}
        </View>

        {breakdown && (
          <View style={styles.earningsCard}>
            <Text style={styles.sectionLabel}>{t('timer.estimated')}</Text>
            <View style={styles.earningsRow}>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsSmall}>{t('timer.gross')}</Text>
                <Text style={styles.earningsAmount}>{formatCurrency(breakdown.gross, settings!.currency)}</Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsItem}>
                <Text style={styles.earningsSmall}>{t('timer.net')}</Text>
                <Text style={[styles.earningsAmount, styles.earningsNet]}>{formatCurrency(breakdown.net, settings!.currency)}</Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.mainBtn, running ? styles.mainBtnStop : styles.mainBtnStart]}
          onPress={running ? handleStop : handleStart}
          activeOpacity={0.85}
        >
          <Ionicons name={running ? 'stop' : 'play'} size={24} color="#fff" />
          <Text style={styles.mainBtnText}>{running ? t('timer.stop') : t('timer.start')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowManual(true)}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.secondaryBtnText}>{t('timer.addManual')}</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal visible={showManual} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('timer.addManual')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('timer.manualHours')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={manualHours}
              onChangeText={setManualHours}
            />
            <TextInput
              style={styles.input}
              placeholder={t('timer.manualNote')}
              placeholderTextColor={colors.textMuted}
              value={manualNote}
              onChangeText={setManualNote}
            />
            <TouchableOpacity style={[styles.mainBtn, styles.mainBtnStart]} onPress={handleSaveManual}>
              <Text style={styles.mainBtnText}>{t('timer.save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowManual(false)}>
              <Text style={styles.secondaryBtnText}>{t('timer.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm },
  headerTitle: { ...typography.xl, fontWeight: '800', color: colors.text },
  calcBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  timerCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', ...shadow.md },
  timerCardRunning: { borderWidth: 2, borderColor: colors.success },
  timerLabel: { ...typography.sm, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  timerDisplay: { fontSize: 64, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: 2 },
  runningBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, backgroundColor: colors.successLight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm },
  runningDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  runningText: { ...typography.sm, color: colors.success, fontWeight: '600' },
  earningsCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  sectionLabel: { ...typography.xs, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  earningsRow: { flexDirection: 'row', alignItems: 'center' },
  earningsItem: { flex: 1, alignItems: 'center', gap: 2 },
  earningsDivider: { width: 1, height: 40, backgroundColor: colors.border },
  earningsSmall: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  earningsAmount: { ...typography.lg, fontWeight: '700', color: colors.text },
  earningsNet: { color: colors.primary },
  mainBtn: { borderRadius: radius.lg, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  mainBtnStart: { backgroundColor: colors.primary },
  mainBtnStop: { backgroundColor: colors.danger },
  mainBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  secondaryBtn: { borderRadius: radius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  secondaryBtnText: { ...typography.base, color: colors.primary, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.xs },
  sheetTitle: { ...typography.md, fontWeight: '700', color: colors.text },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, ...typography.base, color: colors.text },
});
