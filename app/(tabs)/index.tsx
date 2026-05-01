import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clearActiveSession, getActiveSession, getSettings, saveSession, setActiveSession } from '../../src/storage';
import { calculateTax, formatCurrency, formatDuration, hoursToGross, msToHours } from '../../src/utils/tax';
import { UserSettings, WorkSession } from '../../src/types';
import { useTheme } from '../../src/context/ThemeContext';
import { radius, shadow, shadowSm, spacing } from '../../src/styles/theme';

export default function TimerScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [savedSummary, setSavedSummary] = useState<{ durationMs: number; gross: number; net: number; currency: string } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const summarySlide = useRef(new Animated.Value(300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    let cancelled = false;
    (async () => {
      const [s, active] = await Promise.all([getSettings(), getActiveSession()]);
      if (cancelled) return;
      setSettings(s);
      if (active) { setStartTime(active.startTime); setElapsed(Date.now() - active.startTime); setRunning(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (running && startTime !== null) {
      intervalRef.current = setInterval(() => setElapsed(Date.now() - startTime), 1000);
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); pulse.stop(); };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      pulseAnim.setValue(1);
    }
  }, [running, startTime]);

  async function handleStart() {
    const now = Date.now();
    await setActiveSession(now);
    setStartTime(now);
    setElapsed(0);
    setRunning(true);
  }

  function showSummary(durationMs: number, gross: number, net: number, currency: string) {
    setSavedSummary({ durationMs, gross, net, currency });
    summarySlide.setValue(300);
    Animated.spring(summarySlide, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }).start();
  }

  function dismissSummary() {
    Animated.timing(summarySlide, { toValue: 300, duration: 220, useNativeDriver: true }).start(() => setSavedSummary(null));
  }

  async function handleStop() {
    if (!startTime || !settings) return;
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    await saveSession({ id: String(endTime), startTime, endTime, durationMs });
    await clearActiveSession();
    const bd = calculateTax(hoursToGross(msToHours(durationMs), settings.hourlyRate), settings);
    setRunning(false); setStartTime(null); setElapsed(0);
    showSummary(durationMs, bd.gross, bd.net, settings.currency);
  }

  async function handleSaveManual() {
    const hours = parseFloat(manualHours.replace(',', '.'));
    if (isNaN(hours) || hours <= 0 || !settings) return;
    const now = Date.now();
    const durationMs = hours * 3600000;
    await saveSession({ id: String(now), startTime: now - durationMs, endTime: now, durationMs, note: manualNote || undefined, manualEntry: true });
    const bd = calculateTax(hoursToGross(hours, settings.hourlyRate), settings);
    setShowManual(false); setManualHours(''); setManualNote('');
    showSummary(durationMs, bd.gross, bd.net, settings.currency);
  }

  const hours = msToHours(elapsed);
  const gross = settings ? hoursToGross(hours, settings.hourlyRate) : 0;
  const breakdown = settings ? calculateTax(gross, settings) : null;
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.lg, gap: spacing.md },
    input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 17, color: colors.text, backgroundColor: colors.surface2 },
  });

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Gradient hero ── */}
      <LinearGradient colors={colors.timerGrad} style={st.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <SafeAreaView>
          <View style={st.heroTop}>
            <Text style={st.appName}>TimeTracker</Text>
            <TouchableOpacity onPress={() => router.push('/calculator')} style={st.calcBtn}>
              <Ionicons name="calculator-outline" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>

          <Animated.View style={[st.timerWrap, { transform: [{ scale: running ? pulseAnim : 1 }] }]}>
            <Text style={st.timerLabel}>{t('timer.elapsed')}</Text>
            <Text style={st.timerDisplay}>{formatDuration(elapsed)}</Text>
            {running && (
              <View style={st.liveBadge}>
                <View style={st.liveDot} />
                <Text style={st.liveText}>{t('timer.running')}</Text>
              </View>
            )}
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Bottom card ── */}
      <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} bounces={false}>
        <View style={[st.card, { backgroundColor: colors.surface, ...shadow(colors.shadow) }]}>

          {breakdown && (
            <View style={[st.earningsRow, { backgroundColor: colors.surface2, borderRadius: radius.lg }]}>
              <View style={st.earningsItem}>
                <Text style={[st.earningsLabel, { color: colors.textMuted }]}>{t('timer.gross')}</Text>
                <Text style={[st.earningsValue, { color: colors.textSec }]}>{formatCurrency(breakdown.gross, settings!.currency)}</Text>
              </View>
              <View style={[st.earningsSep, { backgroundColor: colors.border }]} />
              <View style={st.earningsItem}>
                <Text style={[st.earningsLabel, { color: colors.textMuted }]}>{t('timer.net')}</Text>
                <Text style={[st.earningsValue, { color: colors.primary }]}>{formatCurrency(breakdown.net, settings!.currency)}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={running ? handleStop : handleStart} activeOpacity={0.88} style={st.btnWrap}>
            <LinearGradient
              colors={running ? ['#DC2626', '#B91C1C'] : ['#6366F1', '#8B5CF6']}
              style={st.mainBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Ionicons name={running ? 'stop' : 'play'} size={26} color="#fff" />
              <Text style={st.mainBtnText}>{running ? t('timer.stop') : t('timer.start')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={[st.secBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]} onPress={() => setShowManual(true)}>
            <Ionicons name="add-outline" size={18} color={colors.primary} />
            <Text style={[st.secBtnText, { color: colors.primary }]}>{t('timer.addManual')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Session saved summary ── */}
      {savedSummary && (
        <View style={st.summaryOverlay} pointerEvents="box-none">
          <TouchableOpacity style={st.summaryBackdrop} activeOpacity={1} onPress={dismissSummary} />
          <Animated.View style={[st.summarySheet, { backgroundColor: colors.surface, transform: [{ translateY: summarySlide }] }]}>
            <View style={[st.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={[st.summaryCheck, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            </View>
            <Text style={[st.summaryTitle, { color: colors.text }]}>Session saved</Text>
            <Text style={[st.summaryDuration, { color: colors.textSec }]}>{formatDuration(savedSummary.durationMs)}</Text>
            <View style={[st.summaryEarnings, { backgroundColor: colors.surface2, borderRadius: radius.lg }]}>
              <View style={st.summaryEarningsItem}>
                <Text style={[st.summaryEarningsLabel, { color: colors.textMuted }]}>GROSS</Text>
                <Text style={[st.summaryEarningsValue, { color: colors.textSec }]}>{formatCurrency(savedSummary.gross, savedSummary.currency)}</Text>
              </View>
              <View style={[st.earningsSep, { backgroundColor: colors.border }]} />
              <View style={st.summaryEarningsItem}>
                <Text style={[st.summaryEarningsLabel, { color: colors.textMuted }]}>NET</Text>
                <Text style={[st.summaryEarningsValue, { color: colors.primary }]}>{formatCurrency(savedSummary.net, savedSummary.currency)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={dismissSummary} activeOpacity={0.88} style={st.btnWrap}>
              <LinearGradient colors={colors.primaryGrad} style={st.mainBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={st.mainBtnText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      <Modal visible={showManual} transparent animationType="slide">
        <View style={st.overlay}>
          <View style={s.sheet}>
            <View style={[st.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[st.sheetTitle, { color: colors.text }]}>{t('timer.addManual')}</Text>
            <TextInput style={s.input} placeholder={t('timer.manualHours')} placeholderTextColor={colors.textMuted} keyboardType="numeric" value={manualHours} onChangeText={setManualHours} />
            <TextInput style={s.input} placeholder={t('timer.manualNote')} placeholderTextColor={colors.textMuted} value={manualNote} onChangeText={setManualNote} />
            <TouchableOpacity onPress={handleSaveManual} activeOpacity={0.88} style={st.btnWrap}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} style={st.mainBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={st.mainBtnText}>{t('timer.save')}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[st.secBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]} onPress={() => setShowManual(false)}>
              <Text style={[st.secBtnText, { color: colors.textSec }]}>{t('timer.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl + spacing.xl },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm, marginBottom: spacing.xl },
  appName: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  calcBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  timerWrap: { alignItems: 'center', paddingBottom: spacing.lg },
  timerLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: spacing.sm },
  timerDisplay: { color: '#fff', fontSize: 68, fontWeight: '200', fontVariant: ['tabular-nums'], letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  scroll: { flex: 1, marginTop: -(spacing.xxl + spacing.lg) },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  card: { borderRadius: radius.xxl, padding: spacing.lg, gap: spacing.md },
  earningsRow: { flexDirection: 'row', padding: spacing.md },
  earningsItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  earningsLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  earningsValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  earningsSep: { width: 1, marginHorizontal: spacing.sm },
  btnWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  mainBtn: { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  mainBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  secBtn: { borderRadius: radius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1.5 },
  secBtnText: { fontSize: 15, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  sheetTitle: { fontSize: 20, fontWeight: '700' },
  summaryOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 100 },
  summaryBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  summarySheet: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.lg, gap: spacing.md, alignItems: 'center' },
  summaryCheck: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  summaryDuration: { fontSize: 44, fontWeight: '200', fontVariant: ['tabular-nums'], letterSpacing: 1 },
  summaryEarnings: { flexDirection: 'row', width: '100%', padding: spacing.md },
  summaryEarningsItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  summaryEarningsLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  summaryEarningsValue: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
