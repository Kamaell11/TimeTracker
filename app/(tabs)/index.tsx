import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
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
import { calculateHolidayPay, calculateTax, formatCurrency, formatDuration, hoursToGross, msToHours } from '../../src/utils/tax';
import { UserSettings } from '../../src/types';
import { useTheme } from '../../src/context/ThemeContext';
import { radius, shadow, spacing } from '../../src/styles/theme';

type SavedSummary = { durationMs: number; gross: number; net: number; currency: string };

export default function TimerScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualBreakMinutes, setManualBreakMinutes] = useState('0');
  const [holidayMode, setHolidayMode] = useState(false);
  const [savedSummary, setSavedSummary] = useState<SavedSummary | null>(null);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakMinutesInput, setBreakMinutesInput] = useState('0');
  const [pendingStop, setPendingStop] = useState<{ endTime: number; startTime: number; rawDurationMs: number; isHoliday: boolean } | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [stopNote, setStopNote] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        pulse.stop();
      };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      pulseAnim.setValue(1);
    }
  }, [running, startTime]);

  async function handleStart() {
    setSavedSummary(null);
    const now = Date.now();
    await setActiveSession(now);
    setStartTime(now);
    setElapsed(0);
    setRunning(true);
  }

  function resolveGrossAndNet(hours: number, s: UserSettings): { gross: number; net: number } {
    if (holidayMode && s.country === 'NO' && s.noBasicRate) {
      const hp = calculateHolidayPay(
        hours,
        s.hourlyRate,
        s.noBasicRate,
        s.noHolidaySupplementPct ?? 100,
        s.noKongensTilleggHours ?? 7.5,
      );
      const bd = calculateTax(hp.totalGross, s);
      return { gross: hp.totalGross, net: bd.net };
    }
    const bd = calculateTax(hoursToGross(hours, s.hourlyRate), s);
    return { gross: bd.gross, net: bd.net };
  }

  function handleStop() {
    if (!startTime || !settings || pendingStop) return;
    const endTime = Date.now();
    const rawDurationMs = endTime - startTime;
    const isHoliday = holidayMode && settings.country === 'NO';
    const suggested = !isHoliday && settings.autoBreakEnabled && rawDurationMs >= (settings.autoBreakThresholdHours ?? 6) * 3600000
      ? (settings.autoBreakMinutes ?? 30) : 0;
    setPendingStop({ endTime, startTime, rawDurationMs, isHoliday });
    setBreakMinutesInput(String(suggested));
    setShowBreakModal(true);
  }

  async function handleConfirmStop() {
    if (!pendingStop || !settings) return;
    const { endTime, startTime: st, rawDurationMs, isHoliday } = pendingStop;
    const breakMin = Math.max(0, parseInt(breakMinutesInput) || 0);
    const durationMs = Math.max(0, rawDurationMs - (isHoliday ? 0 : breakMin * 60000));
    await saveSession({ id: String(endTime), startTime: st, endTime, durationMs, holidayMode: isHoliday, project: selectedProject, note: stopNote.trim() || undefined });
    await clearActiveSession();
    const { gross, net } = resolveGrossAndNet(msToHours(durationMs), settings);
    setRunning(false);
    setStartTime(null);
    setElapsed(0);
    setShowBreakModal(false);
    setPendingStop(null);
    setSelectedProject(undefined);
    setStopNote('');
    setSavedSummary({ durationMs, gross, net, currency: settings.currency });
  }

  function handleCancelStop() {
    setShowBreakModal(false);
    setPendingStop(null);
  }

  async function handleSaveManual() {
    const hours = parseFloat(manualHours.replace(',', '.'));
    if (isNaN(hours) || hours <= 0 || !settings) return;
    const now = Date.now();
    const isHoliday = holidayMode && settings.country === 'NO';
    const rawDurationMs = hours * 3600000;
    const breakMin = Math.max(0, parseInt(manualBreakMinutes) || 0);
    const durationMs = Math.max(0, rawDurationMs - (isHoliday ? 0 : breakMin * 60000));
    const effectiveHours = msToHours(durationMs);
    await saveSession({ id: String(now), startTime: now - rawDurationMs, endTime: now, durationMs, note: manualNote || undefined, manualEntry: true, holidayMode: isHoliday, project: selectedProject });
    const { gross, net } = resolveGrossAndNet(effectiveHours, settings);
    setShowManual(false);
    setManualHours('');
    setManualNote('');
    setManualBreakMinutes('0');
    setSelectedProject(undefined);
    setSavedSummary({ durationMs, gross, net, currency: settings.currency });
  }

  function openManual() {
    const defaultBreak = settings?.autoBreakEnabled ? String(settings.autoBreakMinutes ?? 30) : '0';
    setManualBreakMinutes(defaultBreak);
    setShowManual(true);
  }

  const hours = msToHours(elapsed);
  const liveHolidayPay = holidayMode && settings?.country === 'NO' && settings.noBasicRate && running
    ? calculateHolidayPay(hours, settings.hourlyRate, settings.noBasicRate, settings.noHolidaySupplementPct ?? 100, settings.noKongensTilleggHours ?? 7.5)
    : null;
  const gross = liveHolidayPay ? liveHolidayPay.totalGross : settings ? hoursToGross(hours, settings.hourlyRate) : 0;
  const breakdown = settings && running ? calculateTax(gross, settings) : null;

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Gradient hero */}
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

      {/* Bottom card */}
      <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} bounces={false}>
        <View style={[st.card, { backgroundColor: colors.surface, ...shadow(colors.shadow) }]}>

          {/* Live earnings while running */}
          {breakdown && running && (
            <View style={[st.earningsRow, { backgroundColor: colors.surface2, borderRadius: radius.lg }]}>
              <View style={st.earningsItem}>
                <Text style={[st.earningsLabel, { color: colors.textMuted }]}>{t('timer.gross').toUpperCase()}</Text>
                <Text style={[st.earningsValue, { color: colors.textSec }]}>{formatCurrency(breakdown.gross, settings!.currency)}</Text>
              </View>
              <View style={[st.earningsSep, { backgroundColor: colors.border }]} />
              <View style={st.earningsItem}>
                <Text style={[st.earningsLabel, { color: colors.textMuted }]}>{t('timer.net').toUpperCase()}</Text>
                <Text style={[st.earningsValue, { color: colors.primary }]}>{formatCurrency(breakdown.net, settings!.currency)}</Text>
              </View>
            </View>
          )}

          {/* Session saved summary */}
          {savedSummary && !running && (
            <View style={[st.savedCard, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
              <View style={st.savedHeader}>
                <View style={st.savedIconRow}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  <Text style={[st.savedTitle, { color: colors.success }]}>{t('timer.sessionSaved')}</Text>
                </View>
                <TouchableOpacity onPress={() => setSavedSummary(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={18} color={colors.success} />
                </TouchableOpacity>
              </View>
              <Text style={[st.savedDuration, { color: colors.text }]}>{formatDuration(savedSummary.durationMs)}</Text>
              <View style={st.savedRow}>
                <View style={st.savedItem}>
                  <Text style={[st.savedLabel, { color: colors.textSec }]}>{t('timer.gross')}</Text>
                  <Text style={[st.savedAmount, { color: colors.text }]}>{formatCurrency(savedSummary.gross, savedSummary.currency)}</Text>
                </View>
                <View style={[st.savedSep, { backgroundColor: colors.success, opacity: 0.2 }]} />
                <View style={st.savedItem}>
                  <Text style={[st.savedLabel, { color: colors.textSec }]}>Net</Text>
                  <Text style={[st.savedAmount, { color: colors.success }]}>{formatCurrency(savedSummary.net, savedSummary.currency)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Holiday mode toggle (Norway only) */}
          {settings?.country === 'NO' && !running && (
            <TouchableOpacity onPress={() => setHolidayMode(v => !v)} activeOpacity={0.85} style={[st.holidayRow, { backgroundColor: holidayMode ? '#FEF3C7' : colors.surface2, borderColor: holidayMode ? '#F59E0B' : colors.border }]}>
              <View style={st.holidayLeft}>
                <Text style={{ fontSize: 20 }}>🎉</Text>
                <View>
                  <Text style={[st.holidayLabel, { color: holidayMode ? '#92400E' : colors.text }]}>{t('timer.holidayMode')}</Text>
                  <Text style={[st.holidaySub, { color: holidayMode ? '#B45309' : colors.textMuted }]}>{t('timer.holidayModeSub')}</Text>
                </View>
              </View>
              <Switch value={holidayMode} onValueChange={setHolidayMode} trackColor={{ true: '#F59E0B' }} thumbColor="#fff" />
            </TouchableOpacity>
          )}

          {/* Live holiday breakdown */}
          {liveHolidayPay && running && (
            <View style={[st.holidayBreakdown, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
              <Text style={[st.holidayBreakdownTitle, { color: '#92400E' }]}>🎉 {t('timer.holidayMode')}</Text>
              <View style={st.holidayBreakdownRows}>
                <View style={st.holidayBreakdownRow}>
                  <Text style={{ color: '#78350F', fontSize: 12 }}>{t('timer.regularPay')}</Text>
                  <Text style={{ color: '#78350F', fontSize: 12, fontWeight: '600' }}>{formatCurrency(liveHolidayPay.regularPay, settings!.currency)}</Text>
                </View>
                <View style={st.holidayBreakdownRow}>
                  <Text style={{ color: '#78350F', fontSize: 12 }}>{t('timer.holidaySupplement')}</Text>
                  <Text style={{ color: '#78350F', fontSize: 12, fontWeight: '600' }}>{formatCurrency(liveHolidayPay.holidaySupplement, settings!.currency)}</Text>
                </View>
                <View style={st.holidayBreakdownRow}>
                  <Text style={{ color: '#78350F', fontSize: 12 }}>Kongens tillegg</Text>
                  <Text style={{ color: '#78350F', fontSize: 12, fontWeight: '600' }}>{formatCurrency(liveHolidayPay.kongensTillegg, settings!.currency)}</Text>
                </View>
                {liveHolidayPay.breakDeductionHours > 0 && (
                  <View style={st.holidayBreakdownRow}>
                    <Text style={{ color: '#78350F', fontSize: 12 }}>{t('timer.breakDeduction')}</Text>
                    <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>−30 min</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Start / Stop button */}
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

          <TouchableOpacity style={[st.secBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]} onPress={openManual}>
            <Ionicons name="add-outline" size={18} color={colors.primary} />
            <Text style={[st.secBtnText, { color: colors.primary }]}>{t('timer.addManual')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Manual entry sheet */}
      <Modal visible={showManual} transparent animationType="slide">
        <View style={st.overlay}>
          <View style={[st.sheet, { backgroundColor: colors.surface }]}>
            <View style={[st.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[st.sheetTitle, { color: colors.text }]}>{t('timer.addManual')}</Text>
            <TextInput
              style={[st.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface2 }]}
              placeholder={t('timer.manualHours')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={manualHours}
              onChangeText={setManualHours}
            />
            <TextInput
              style={[st.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface2 }]}
              placeholder={t('timer.manualNote')}
              placeholderTextColor={colors.textMuted}
              value={manualNote}
              onChangeText={setManualNote}
            />
            <View style={st.breakRow}>
              <Text style={[st.breakRowLabel, { color: colors.textSec }]}>{t('timer.manualBreak')}</Text>
              <View style={st.breakChips}>
                {[0, 15, 30, 45].map(min => (
                  <TouchableOpacity
                    key={min}
                    onPress={() => setManualBreakMinutes(String(min))}
                    style={[st.breakChip, { borderColor: colors.border }, manualBreakMinutes === String(min) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <Text style={[st.breakChipText, { color: colors.textSec }, manualBreakMinutes === String(min) && { color: '#fff' }]}>
                      {min === 0 ? t('timer.breakNone') : `${min} min`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[st.breakInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface2 }]}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={manualBreakMinutes}
                onChangeText={setManualBreakMinutes}
              />
            </View>
            {(settings?.projects?.length ?? 0) > 0 && (
              <View style={st.breakRow}>
                <Text style={[st.breakRowLabel, { color: colors.textSec }]}>{t('timer.project')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    <TouchableOpacity
                      onPress={() => setSelectedProject(undefined)}
                      style={[st.breakChip, { borderColor: colors.border }, !selectedProject && { backgroundColor: colors.surface2 }]}
                    >
                      <Text style={[st.breakChipText, { color: colors.textSec }]}>{t('timer.noProject')}</Text>
                    </TouchableOpacity>
                    {settings!.projects!.map(p => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setSelectedProject(p)}
                        style={[st.breakChip, { borderColor: colors.border }, selectedProject === p && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      >
                        <Text style={[st.breakChipText, { color: colors.textSec }, selectedProject === p && { color: '#fff' }]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
            {settings?.country === 'NO' && (
              <TouchableOpacity onPress={() => setHolidayMode(v => !v)} activeOpacity={0.85} style={[st.holidayRow, { backgroundColor: holidayMode ? '#FEF3C7' : colors.surface2, borderColor: holidayMode ? '#F59E0B' : colors.border }]}>
                <View style={st.holidayLeft}>
                  <Text style={{ fontSize: 18 }}>🎉</Text>
                  <Text style={[st.holidayLabel, { color: holidayMode ? '#92400E' : colors.text }]}>{t('timer.holidayMode')}</Text>
                </View>
                <Switch value={holidayMode} onValueChange={setHolidayMode} trackColor={{ true: '#F59E0B' }} thumbColor="#fff" />
              </TouchableOpacity>
            )}
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

      {/* Break confirmation modal */}
      <Modal visible={showBreakModal} transparent animationType="slide">
        <View style={st.overlay}>
          <View style={[st.sheet, { backgroundColor: colors.surface }]}>
            <View style={[st.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[st.sheetTitle, { color: colors.text }]}>{t('timer.breakModal')}</Text>
            {pendingStop && (
              <Text style={[st.breakWorkedText, { color: colors.textMuted }]}>
                {t('timer.breakWorked')}: {formatDuration(pendingStop.rawDurationMs)}
              </Text>
            )}
            <View style={st.breakChips}>
              {[0, 15, 30, 45].map(min => (
                <TouchableOpacity
                  key={min}
                  onPress={() => setBreakMinutesInput(String(min))}
                  style={[st.breakChip, { borderColor: colors.border }, breakMinutesInput === String(min) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <Text style={[st.breakChipText, { color: colors.textSec }, breakMinutesInput === String(min) && { color: '#fff' }]}>
                    {min === 0 ? t('timer.breakNone') : `${min} min`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[st.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface2 }]}
              placeholder={t('timer.breakLabel')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={breakMinutesInput}
              onChangeText={setBreakMinutesInput}
            />
            <TextInput
              style={[st.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface2 }]}
              placeholder={t('timer.stopNote')}
              placeholderTextColor={colors.textMuted}
              value={stopNote}
              onChangeText={setStopNote}
              returnKeyType="done"
            />
            {(settings?.projects?.length ?? 0) > 0 && (
              <View style={st.breakRow}>
                <Text style={[st.breakRowLabel, { color: colors.textSec }]}>{t('timer.project')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    <TouchableOpacity
                      onPress={() => setSelectedProject(undefined)}
                      style={[st.breakChip, { borderColor: colors.border }, !selectedProject && { backgroundColor: colors.surface2 }]}
                    >
                      <Text style={[st.breakChipText, { color: colors.textSec }]}>{t('timer.noProject')}</Text>
                    </TouchableOpacity>
                    {settings!.projects!.map(p => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setSelectedProject(p)}
                        style={[st.breakChip, { borderColor: colors.border }, selectedProject === p && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      >
                        <Text style={[st.breakChipText, { color: colors.textSec }, selectedProject === p && { color: '#fff' }]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
            <TouchableOpacity onPress={handleConfirmStop} activeOpacity={0.88} style={st.btnWrap}>
              <LinearGradient colors={['#DC2626', '#B91C1C']} style={st.mainBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="stop" size={20} color="#fff" />
                <Text style={st.mainBtnText}>{t('timer.breakConfirm')}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[st.secBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]} onPress={handleCancelStop}>
              <Text style={[st.secBtnText, { color: colors.textSec }]}>{t('timer.breakContinue')}</Text>
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
  // Saved session card
  savedCard: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1.5 },
  savedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savedIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  savedTitle: { fontSize: 14, fontWeight: '700' },
  savedDuration: { fontSize: 36, fontWeight: '200', fontVariant: ['tabular-nums'], letterSpacing: 1 },
  savedRow: { flexDirection: 'row', alignItems: 'center' },
  savedItem: { flex: 1, gap: 2 },
  savedSep: { width: 1, height: 32, marginHorizontal: spacing.md },
  savedLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  savedAmount: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // Buttons
  btnWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  mainBtn: { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  mainBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  secBtn: { borderRadius: radius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1.5 },
  secBtnText: { fontSize: 15, fontWeight: '600' },
  // Manual entry sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.lg, gap: spacing.md },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  sheetTitle: { fontSize: 20, fontWeight: '700' },
  input: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, fontSize: 17 },
  breakRow: { gap: spacing.xs },
  breakRowLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  breakChips: { flexDirection: 'row', gap: spacing.xs },
  breakChip: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  breakChipText: { fontSize: 13, fontWeight: '600' },
  breakInput: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.sm, fontSize: 16, textAlign: 'center' },
  breakWorkedText: { fontSize: 14, marginBottom: spacing.xs },
  holidayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, gap: spacing.sm },
  holidayLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  holidayLabel: { fontSize: 14, fontWeight: '600' },
  holidaySub: { fontSize: 11, marginTop: 1 },
  holidayBreakdown: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, borderWidth: 1.5 },
  holidayBreakdownTitle: { fontSize: 13, fontWeight: '700', marginBottom: spacing.xs },
  holidayBreakdownRows: { gap: 4 },
  holidayBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
