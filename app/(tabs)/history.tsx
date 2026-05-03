import { useCallback, useState } from 'react';
import { FlatList, Modal, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { deleteSession, getSettings, getSessions } from '../../src/storage';
import { calculateTax, formatCurrency, formatDuration, hoursToGross, msToHours } from '../../src/utils/tax';
import { UserSettings, WorkSession } from '../../src/types';
import { useTheme } from '../../src/context/ThemeContext';
import { radius, shadowSm, spacing } from '../../src/styles/theme';

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
  const header = ['Date', 'Start', 'End', 'Duration (h)', 'Gross', 'Tax & Social', 'Net', 'Currency', 'Project', 'Holiday', 'Note'].join(',');
  const rows = sessions.map((s) => {
    const hours = msToHours(s.durationMs);
    const bd = calculateTax(hoursToGross(hours, settings.hourlyRate), settings);
    const deductions = bd.socialContributions + bd.healthInsurance + bd.incomeTax;
    const date = new Date(s.startTime);
    return [
      date.toLocaleDateString('en-CA'),
      new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hours.toFixed(2),
      bd.gross.toFixed(2),
      deductions.toFixed(2),
      bd.net.toFixed(2),
      settings.currency,
      s.project ?? '',
      s.holidayMode ? 'yes' : 'no',
      s.note ? `"${s.note.replace(/"/g, '""')}"` : '',
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

function buildPdfHtml(sessions: WorkSession[], settings: UserSettings, t: (k: string) => string): string {
  const totalMs = sessions.reduce((a, s) => a + s.durationMs, 0);
  const totalHours = msToHours(totalMs);
  const totalGross = hoursToGross(totalHours, settings.hourlyRate);
  const totalBd = calculateTax(totalGross, settings);
  const totalDeductions = totalBd.socialContributions + totalBd.healthInsurance + totalBd.incomeTax;

  const generated = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

  const rows = sessions.map((s) => {
    const hours = msToHours(s.durationMs);
    const bd = calculateTax(hoursToGross(hours, settings.hourlyRate), settings);
    const deductions = bd.socialContributions + bd.healthInsurance + bd.incomeTax;
    const date = new Date(s.startTime);
    const dateStr = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const tags = [
      s.holidayMode ? '🎉' : '',
      s.manualEntry ? '✎' : '',
    ].filter(Boolean).join(' ');

    return `
      <tr>
        <td>${dateStr}</td>
        <td>${timeStr}</td>
        <td class="num">${hours.toFixed(2)}h</td>
        <td>${s.project ? `<span class="project">${s.project}</span>` : ''}</td>
        <td class="num">${bd.gross.toFixed(2)}</td>
        <td class="num red">-${deductions.toFixed(2)}</td>
        <td class="num green"><strong>${bd.net.toFixed(2)}</strong></td>
        <td>${s.note ? `<span class="note">${s.note}</span>` : ''}${tags ? ` <span class="tag">${tags}</span>` : ''}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #6366F1; }
  .logo { font-size: 22px; font-weight: 800; color: #6366F1; letter-spacing: -0.5px; }
  .logo span { color: #8B5CF6; }
  .meta { text-align: right; color: #6b7280; font-size: 10px; line-height: 1.8; }
  .summary { display: flex; gap: 12px; margin-bottom: 24px; }
  .stat { flex: 1; background: #f8f7ff; border: 1px solid #e0e0ff; border-radius: 10px; padding: 14px 16px; }
  .stat-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; margin-bottom: 4px; }
  .stat-value { font-size: 18px; font-weight: 800; color: #1a1a2e; }
  .stat-value.primary { color: #6366F1; }
  .stat-value.green { color: #059669; }
  .stat-value.red { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  thead tr { background: #6366F1; color: #fff; }
  thead th { padding: 9px 10px; text-align: left; font-weight: 700; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th.num { text-align: right; }
  tbody tr:nth-child(even) { background: #fafafa; }
  tbody tr:hover { background: #f0f0ff; }
  td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.red { color: #dc2626; }
  td.green { color: #059669; }
  .project { background: #ede9fe; color: #5b21b6; border-radius: 4px; padding: 2px 6px; font-size: 9px; font-weight: 700; }
  .note { color: #6b7280; font-style: italic; }
  .tag { color: #9ca3af; font-size: 10px; }
  tfoot tr { background: #1a1a2e; color: #fff; font-weight: 700; }
  tfoot td { padding: 10px; border: none; }
  tfoot td.num { text-align: right; }
  tfoot td.green { color: #34d399; }
  tfoot td.red { color: #f87171; }
  .footer { margin-top: 20px; text-align: center; color: #9ca3af; font-size: 9px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Time<span>Tracker</span></div>
      <div style="color:#6b7280;font-size:10px;margin-top:4px;">${t('history.pdfReportTitle')}</div>
    </div>
    <div class="meta">
      <div>${generated}</div>
      <div>${sessions.length} ${t('history.pdfSessions')}</div>
      <div>${settings.currency} · ${settings.employmentType.replace(/_/g, ' ')}</div>
    </div>
  </div>

  <div class="summary">
    <div class="stat">
      <div class="stat-label">${t('history.pdfTotalHours')}</div>
      <div class="stat-value primary">${totalHours.toFixed(2)}h</div>
    </div>
    <div class="stat">
      <div class="stat-label">${t('history.pdfTotalGross')}</div>
      <div class="stat-value">${totalBd.gross.toFixed(2)} ${settings.currency}</div>
    </div>
    <div class="stat">
      <div class="stat-label">${t('history.pdfTax')}</div>
      <div class="stat-value red">-${totalDeductions.toFixed(2)} ${settings.currency}</div>
    </div>
    <div class="stat">
      <div class="stat-label">${t('history.pdfTotalNet')}</div>
      <div class="stat-value green">${totalBd.net.toFixed(2)} ${settings.currency}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${t('history.pdfDate')}</th>
        <th>${t('history.pdfTime')}</th>
        <th class="num">${t('history.pdfDuration')}</th>
        <th>${t('history.pdfProject')}</th>
        <th class="num">${t('history.pdfGross')}</th>
        <th class="num">${t('history.pdfTax')}</th>
        <th class="num">${t('history.pdfNet')}</th>
        <th>${t('history.pdfNote')}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="2"><strong>${t('history.pdfSummary')}</strong></td>
        <td class="num">${totalHours.toFixed(2)}h</td>
        <td></td>
        <td class="num">${totalBd.gross.toFixed(2)}</td>
        <td class="num red">-${totalDeductions.toFixed(2)}</td>
        <td class="num green">${totalBd.net.toFixed(2)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">TimeTracker · ${generated}</div>
</body>
</html>`;
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getSessions(), getSettings()]).then(([s, st]) => { setSessions(s); setSettings(st); });
    }, [])
  );

  async function handleDelete(id: string) {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleExportCsv() {
    if (!settings || sessions.length === 0) return;
    setShowExportModal(false);
    await new Promise(r => setTimeout(r, 350));
    const csv = buildCsv(sessions, settings);
    if (Platform.OS === 'web') {
      downloadCsvWeb(csv);
    } else {
      await Share.share({ message: csv, title: 'TimeTracker export' });
    }
  }

  async function handleExportPdf() {
    if (!settings || sessions.length === 0) return;
    setShowExportModal(false);
    setExporting(true);
    await new Promise(r => setTimeout(r, 350));
    try {
      const html = buildPdfHtml(sessions, settings, t);
      if (Platform.OS === 'web') {
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); w.print(); }
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'TimeTracker Report' });
        } else {
          await Print.printAsync({ html });
        }
      }
    } finally {
      setExporting(false);
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
    <>
      <FlatList
        data={listItems}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={[st.list, { backgroundColor: colors.bg }]}
        style={{ backgroundColor: colors.bg }}
        ListHeaderComponent={
          <TouchableOpacity
            onPress={() => setShowExportModal(true)}
            style={[st.exportBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            disabled={exporting}
          >
            <Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={17} color={colors.primary} />
            <Text style={[st.exportText, { color: colors.primary }]}>
              {exporting ? '...' : t('history.export')}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Export format modal */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setShowExportModal(false)}>
          <View style={[st.exportSheet, { backgroundColor: colors.surface }]}>
            <View style={st.exportSheetHeader}>
              <Text style={[st.exportSheetTitle, { color: colors.textMuted }]}>{t('history.exportChoose')}</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleExportPdf} style={[st.exportOption, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
              <View style={[st.exportIconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="document-text-outline" size={22} color="#DC2626" />
              </View>
              <View style={st.exportOptionText}>
                <Text style={[st.exportOptionTitle, { color: colors.text }]}>{t('history.exportPdf')}</Text>
                <Text style={[st.exportOptionSub, { color: colors.textMuted }]}>Table with hours, earnings & tax</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleExportCsv} style={st.exportOption}>
              <View style={[st.exportIconWrap, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="grid-outline" size={22} color="#059669" />
              </View>
              <View style={st.exportOptionText}>
                <Text style={[st.exportOptionTitle, { color: colors.text }]}>{t('history.exportCsv')}</Text>
                <Text style={[st.exportOptionSub, { color: colors.textMuted }]}>Raw data for spreadsheets</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  exportSheet: { width: '100%', borderRadius: radius.xxl, overflow: 'hidden', paddingTop: spacing.md },
  exportSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  exportSheetTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  exportOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  exportIconWrap: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  exportOptionText: { flex: 1 },
  exportOptionTitle: { fontSize: 15, fontWeight: '700' },
  exportOptionSub: { fontSize: 12, marginTop: 2 },
});
