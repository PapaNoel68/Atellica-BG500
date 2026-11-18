import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import {
  localeFor,
  tr,
  translateClinicalText,
  translateSampleType,
} from '@/src/i18n/translations';
import { SampleType } from '@/src/types/analyzer';

const SAMPLE_COLORS = ['#0066B2', '#0EA5E9', '#16A34A', '#D97706', '#DC2626'];

interface StatisticsDashboardViewProps {
  onBack?: () => void;
}

function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0.0 min';
  if (minutes < 60) return `${minutes.toFixed(1)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h} h ${m} min`;
}

export const StatisticsDashboardView: React.FC<StatisticsDashboardViewProps> = ({ onBack }) => {
  const { state, language, themeMode, unackCriticalCount } = useAnalyzer();
  const locale = localeFor(language);
  const isDark = themeMode === 'dark';

  const gridStroke = isDark ? '#374151' : '#E2E8F0';
  const axisTickColor = isDark ? '#D1D5DB' : '#475569';
  const tooltipStyle: React.CSSProperties = {
    backgroundColor: isDark ? '#1F2124' : '#FFFFFF',
    borderColor: isDark ? '#4B5563' : '#CBD5E1',
    borderRadius: '8px',
    fontSize: '11px',
    color: isDark ? '#F3F4F6' : '#0F172A',
  };

  const metrics = useMemo(() => {
    const nowMs = Date.now();
    const total = state.records.length;

    const bySample = (['Arterial', 'Venosa', 'Capilar'] as SampleType[]).map((type) => ({
      name: translateSampleType(language, type),
      count: state.records.filter((r) => r.sampleType === type).length,
    }));

    // By day
    const dayMap = new Map<string, number>();
    state.records.forEach((r) => {
      const d = new Date(r.timestamp).toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
      });
      dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
    });
    const byDay = Array.from(dayMap.entries())
      .map(([day, count]) => ({ day, count }))
      .reverse();

    // Determinations by operator
    const opMap = new Map<string, number>();
    state.records.forEach((r) => {
      opMap.set(r.operatorName, (opMap.get(r.operatorName) ?? 0) + 1);
    });
    const byOperator = Array.from(opMap.entries())
      .map(([name, count]) => ({
        name: name.split(' ').slice(0, 2).join(' '),
        fullName: name,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Top 10 Logged-in Users (from ACCESOS audit logs)
    const loginMap = new Map<string, { fullName: string; logins: number; lastLogin: string }>();
    state.auditLogs.forEach((log) => {
      if (
        log.module === 'ACCESOS' &&
        (log.action === 'Inicio de sesión' || log.action === 'Acceso sin identificación')
      ) {
        const key = log.userId || log.userName;
        const existing = loginMap.get(key);
        if (existing) {
          existing.logins += 1;
          if (new Date(log.timestamp).getTime() > new Date(existing.lastLogin).getTime()) {
            existing.lastLogin = log.timestamp;
          }
        } else {
          loginMap.set(key, {
            fullName: log.userName,
            logins: 1,
            lastLogin: log.timestamp,
          });
        }
      }
    });

    const top10LoggedUsers = Array.from(loginMap.values())
      .sort((a, b) => b.logins - a.logins)
      .slice(0, 10)
      .map((u, idx) => ({
        rank: idx + 1,
        shortName: `${idx + 1}. ${u.fullName.split(' ').slice(0, 2).join(' ')}`,
        fullName: u.fullName,
        logins: u.logins,
        lastLogin: u.lastLogin,
      }));
    const totalLoginEvents = Array.from(loginMap.values()).reduce((s, u) => s + u.logins, 0);

    // Quality Controls (AQC / CCI) breakdown
    const qcTotal = state.qcRuns.length;
    const qcConform = state.qcRuns.filter((q) => q.status === 'CONFORME').length;
    const qcWarning = state.qcRuns.filter((q) => q.status === 'ADVERTENCIA').length;
    const qcNonConform = state.qcRuns.filter((q) => q.status === 'NO_CONFORME').length;
    const qcPassRate = qcTotal > 0 ? (qcConform / qcTotal) * 100 : 100;

    const qcByLevel = state.qcLevels.map((lvl, idx) => {
      const runs = state.qcRuns.filter((r) => r.levelId === lvl.id);
      return {
        level: tr(language, `Nivel ${idx + 1}`, `Level ${idx + 1}`),
        conforme: runs.filter((r) => r.status === 'CONFORME').length,
        advertencia: runs.filter((r) => r.status === 'ADVERTENCIA').length,
        noConforme: runs.filter((r) => r.status === 'NO_CONFORME').length,
      };
    });

    // Analyzer Unavailable Average Time (Critical errors / unavailable outages)
    const criticalErrors = state.maintenanceErrors.filter((e) => e.severity === 'Crítica');
    const unavailableSource =
      criticalErrors.length > 0
        ? criticalErrors
        : state.maintenanceErrors.filter((e) => e.resolvedAt || e.status !== 'RESUELTA');

    const unavailableEvents = unavailableSource
      .map((err) => {
        const startMs = new Date(err.timestamp).getTime();
        const endMs = err.resolvedAt ? new Date(err.resolvedAt).getTime() : nowMs;
        const durationMin = Math.max(1, (endMs - startMs) / 60000);
        return {
          id: err.id,
          code: err.code,
          description: translateClinicalText(language, err.description),
          status: err.status,
          durationMin,
          timestamp: err.timestamp,
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const totalUnavailableMin = unavailableEvents.reduce((acc, ev) => acc + ev.durationMin, 0);
    const avgUnavailableMin =
      unavailableEvents.length > 0 ? totalUnavailableMin / unavailableEvents.length : 0;
    const maxUnavailableMin =
      unavailableEvents.length > 0
        ? Math.max(...unavailableEvents.map((ev) => ev.durationMin))
        : 0;

    // Incidents, calibrations & processing
    const totalIncidents = state.maintenanceErrors.length;
    const incidentRate =
      total + totalIncidents > 0 ? (totalIncidents / (total + totalIncidents)) * 100 : 0;
    const criticalResultsCount = state.records.filter((r) => r.hasCriticalValues).length;
    const incoherenceCount = state.records.filter((r) => r.validationIssues.length > 0).length;

    const failedCal = state.calibrations.filter(
      (c) => c.status === 'FALLIDA' || c.status === 'INTERRUMPIDA'
    ).length;
    const calOk = state.calibrations.filter((c) => c.status === 'CORRECTA').length;
    const calPassRate =
      state.calibrations.length > 0 ? (calOk / state.calibrations.length) * 100 : 100;

    const avgProcSec =
      total > 0
        ? state.records.reduce((s, r) => s + r.processingSeconds, 0) / total
        : 0;

    const readDurations: number[] = [];
    state.atellicaInbox.forEach((m) => {
      if (m.readAt) {
        const diffMin =
          (new Date(m.readAt).getTime() - new Date(m.receivedAt).getTime()) / 60000;
        if (diffMin >= 0) readDurations.push(diffMin);
      }
    });
    const avgReadMin =
      readDurations.length > 0
        ? readDurations.reduce((a, b) => a + b, 0) / readDurations.length
        : 0;

    const consumableUsage = state.consumables.map((c) => ({
      name: translateClinicalText(language, c.name).split(' ').slice(0, 2).join(' '),
      usedPct: Number((100 - c.levelPercent).toFixed(0)),
      remPct: c.levelPercent,
    }));

    return {
      total,
      bySample,
      byDay,
      byOperator,
      top10LoggedUsers,
      totalLoginEvents,
      qcTotal,
      qcConform,
      qcWarning,
      qcNonConform,
      qcPassRate,
      qcByLevel,
      unavailableEvents,
      totalUnavailableMin,
      avgUnavailableMin,
      maxUnavailableMin,
      totalIncidents,
      incidentRate,
      criticalResultsCount,
      incoherenceCount,
      failedCal,
      calPassRate,
      avgProcSec,
      avgReadMin,
      consumableUsage,
    };
  }, [state, language, locale]);

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0 min-w-0 overflow-hidden">
      {/* Screen Header */}
      <div className="bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-2.5 py-1.5 rounded border border-slate-300 bg-[#F6F8FA] hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{tr(language, 'Volver', 'Back')}</span>
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-[#EDF5FC] border border-[#0066B2]/30 text-[#0066B2] flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
              {tr(
                language,
                'Dashboard de Estadísticas e Indicadores del Analizador',
                'Analyzer Statistics & Utilization Dashboard'
              )}
            </h2>
            <p className="text-[11px] text-slate-500 truncate">
              {tr(
                language,
                'Métricas clínicas, controles de calidad, top 10 usuarios logados y disponibilidad del equipo en tiempo real',
                'Real-time clinical metrics, quality controls, top 10 logged-in users, and analyzer availability'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] shrink-0">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 font-semibold text-slate-700">
            {tr(language, 'Cartucho:', 'Cartridge:')} <strong className="font-mono">{state.counters.cartridgeTests}</strong> tests
          </span>
          <span
            className={`px-2.5 py-1 rounded-lg border font-bold ${
              state.analyzerStatus === 'NO_DISPONIBLE'
                ? 'bg-red-100 border-red-400 text-red-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}
          >
            {state.analyzerStatus === 'NO_DISPONIBLE'
              ? tr(language, 'Analizador No Disponible', 'Analyzer Unavailable')
              : tr(language, 'Equipo Operativo', 'Analyzer Ready')}
          </span>
        </div>
      </div>

      {/* Scrollable Dashboard Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <div className="bg-white border border-slate-200 rounded-xl px-2.5 py-2">
            <div className="text-[10px] text-slate-500 truncate">
              {tr(language, 'Determinaciones', 'Total Tests')}
            </div>
            <div className="font-mono font-bold text-base text-slate-900 tabular-nums mt-0.5">
              {metrics.total}
            </div>
            <div className="text-[9.5px] text-slate-500 truncate">
              {tr(language, 'Incoh.:', 'Incoh.:')} {metrics.incoherenceCount}
            </div>
          </div>

          <div className="bg-white border border-red-200 rounded-xl px-2.5 py-2">
            <div className="text-[10px] text-red-700 font-semibold truncate">
              {tr(language, 'Valores críticos', 'Critical values')}
            </div>
            <div className="font-mono font-bold text-base text-red-900 tabular-nums mt-0.5">
              {metrics.criticalResultsCount}
            </div>
            <div className="text-[9.5px] text-red-700 truncate">
              {tr(language, 'Pend. conf.:', 'Unack.:')} {unackCriticalCount}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-2">
            <div className="text-[10px] text-amber-900 font-bold truncate flex items-center gap-1">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{tr(language, 'T. medio no disp.', 'Avg. Unavail. Time')}</span>
            </div>
            <div className="font-mono font-bold text-base text-amber-950 tabular-nums mt-0.5">
              {formatDurationMinutes(metrics.avgUnavailableMin)}
            </div>
            <div className="text-[9.5px] text-amber-800 truncate">
              {metrics.unavailableEvents.length} {tr(language, 'eventos', 'events')}
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl px-2.5 py-2">
            <div className="text-[10px] text-emerald-800 font-semibold truncate">
              {tr(language, 'QC Conforme', 'QC Pass Rate')}
            </div>
            <div className="font-mono font-bold text-base text-emerald-900 tabular-nums mt-0.5">
              {metrics.qcPassRate.toFixed(1)}%
            </div>
            <div className="text-[9.5px] text-slate-500 truncate">
              {metrics.qcConform}/{metrics.qcTotal} {tr(language, 'ciclos', 'runs')}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-2.5 py-2">
            <div className="text-[10px] text-slate-500 truncate">
              {tr(language, 'QC No Conforme', 'Non-Conf. QC')}
            </div>
            <div className="font-mono font-bold text-base text-slate-900 tabular-nums mt-0.5">
              {metrics.qcNonConform}
            </div>
            <div className="text-[9.5px] text-amber-700 truncate">
              {tr(language, 'Adv.:', 'Warn:')} {metrics.qcWarning}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-2.5 py-2">
            <div className="text-[10px] text-slate-500 truncate">
              {tr(language, '% Incidencias', '% Incidents')}
            </div>
            <div className="font-mono font-bold text-base text-slate-900 tabular-nums mt-0.5">
              {metrics.incidentRate.toFixed(1)}%
            </div>
            <div className="text-[9.5px] text-slate-500 truncate">
              {tr(language, 'Cal. fallidas:', 'Failed cal.:')} {metrics.failedCal}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-2.5 py-2">
            <div className="text-[10px] text-slate-500 truncate">
              {tr(language, 'T. medio proc.', 'Avg. proc. time')}
            </div>
            <div className="font-mono font-bold text-base text-slate-900 tabular-nums mt-0.5">
              {metrics.avgProcSec.toFixed(0)} s
            </div>
            <div className="text-[9.5px] text-slate-500 truncate">
              {tr(language, 'Aspiración + cámara', 'Aspiration + chamber')}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-2.5 py-2">
            <div className="text-[10px] text-slate-500 truncate">
              {tr(language, 'T. medio lectura', 'Avg. read time')}
            </div>
            <div className="font-mono font-bold text-base text-slate-900 tabular-nums mt-0.5">
              {metrics.avgReadMin.toFixed(1)} m
            </div>
            <div className="text-[9.5px] text-slate-500 truncate">
              {state.atellicaInbox.length} {tr(language, 'avisos', 'notices')}
            </div>
          </div>
        </div>

        {/* Medium-Sized Charts Grid (2 columns, comfortable medium height 220px each) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* 1. Quality Controls Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#0066B2]" />
                <h3 className="font-display font-bold text-xs text-slate-900">
                  {tr(language, 'Controles de Calidad (AQC / CCI)', 'Quality Controls (AQC / IQC)')}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900">
                  OK: {metrics.qcConform}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-950">
                  {tr(language, 'Adv', 'Warn')}: {metrics.qcWarning}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-900">
                  {tr(language, 'No Conf', 'Fail')}: {metrics.qcNonConform}
                </span>
              </div>
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.qcByLevel}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="level" tick={{ fontSize: 10.5, fill: axisTickColor }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisTickColor }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar
                    dataKey="conforme"
                    name={tr(language, 'Conforme', 'Compliant')}
                    stackId="qc"
                    fill="#16A34A"
                  />
                  <Bar
                    dataKey="advertencia"
                    name={tr(language, 'Advertencia (1_2s)', 'Warning (1_2s)')}
                    stackId="qc"
                    fill="#D97706"
                  />
                  <Bar
                    dataKey="noConforme"
                    name={tr(language, 'No Conforme', 'Non-Compliant')}
                    stackId="qc"
                    fill="#DC2626"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Top 10 Logged-in Users */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0066B2]" />
                <h3 className="font-display font-bold text-xs text-slate-900">
                  {tr(language, 'Top 10 Usuarios Logados', 'Top 10 Logged-in Users')}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#EDF5FC] border border-[#0066B2]/30 text-[#0066B2] font-mono text-[10px] font-bold">
                {tr(language, 'Total sesiones:', 'Total logins:')} {metrics.totalLoginEvents}
              </span>
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.top10LoggedUsers}
                  layout="vertical"
                  margin={{ top: 2, right: 18, left: 6, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: axisTickColor }}
                  />
                  <YAxis
                    dataKey="shortName"
                    type="category"
                    width={126}
                    tick={{ fontSize: 10, fill: axisTickColor }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: unknown) => [
                      `${value} ${tr(language, 'sesiones', 'logins')}`,
                      tr(language, 'Accesos', 'Logins'),
                    ]}
                  />
                  <Bar
                    dataKey="logins"
                    name={tr(language, 'Sesiones', 'Logins')}
                    fill="#0066B2"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Tests per Day */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col">
            <h3 className="font-display font-bold text-xs text-slate-900 mb-2">
              {tr(language, 'Determinaciones por Día', 'Tests per Day')}
            </h3>
            <div className="h-[215px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: axisTickColor }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisTickColor }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="count"
                    name={tr(language, 'Determinaciones', 'Tests')}
                    fill="#0EA5E9"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Distribution by Sample Type */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col">
            <h3 className="font-display font-bold text-xs text-slate-900 mb-2">
              {tr(language, 'Distribución por Tipo de Muestra', 'Distribution by Sample Type')}
            </h3>
            <div className="h-[215px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.bySample}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={72}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {metrics.bySample.map((_, i) => (
                      <Cell key={i} fill={SAMPLE_COLORS[i % SAMPLE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 5. Tests by Operator */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col">
            <h3 className="font-display font-bold text-xs text-slate-900 mb-2">
              {tr(language, 'Determinaciones por Operador', 'Tests by Operator')}
            </h3>
            <div className="h-[215px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.byOperator} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: axisTickColor }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    tick={{ fontSize: 10, fill: axisTickColor }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="count"
                    name={tr(language, 'Muestras', 'Samples')}
                    fill="#E8630A"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6. Consumables Usage */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col">
            <h3 className="font-display font-bold text-xs text-slate-900 mb-2">
              {tr(
                language,
                'Nivel Restante vs Consumo de Consumibles (%)',
                'Remaining Level vs Consumable Usage (%)'
              )}
            </h3>
            <div className="h-[215px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.consumableUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: axisTickColor }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: axisTickColor }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar
                    dataKey="remPct"
                    name={tr(language, 'Disponible %', 'Available %')}
                    stackId="a"
                    fill="#16A34A"
                  />
                  <Bar
                    dataKey="usedPct"
                    name={tr(language, 'Consumido %', 'Used %')}
                    stackId="a"
                    fill="#94A3B8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Analyzer Unavailability Detail Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#E8630A]" />
              <h3 className="font-display font-bold text-xs sm:text-sm text-slate-900">
                {tr(
                  language,
                  'Tiempo Medio de Analizador No Disponible · Historial de Paradas',
                  'Average Analyzer Unavailable Time · Downtime History'
                )}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="px-2.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-950 font-bold">
                {tr(language, 'Media:', 'Average:')}{' '}
                <span className="font-mono">{formatDurationMinutes(metrics.avgUnavailableMin)}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 font-semibold">
                {tr(language, 'Máximo:', 'Max:')}{' '}
                <span className="font-mono">{formatDurationMinutes(metrics.maxUnavailableMin)}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 font-semibold">
                {tr(language, 'Acumulado:', 'Total:')}{' '}
                <span className="font-mono">{formatDurationMinutes(metrics.totalUnavailableMin)}</span>
              </span>
            </div>
          </div>

          {metrics.unavailableEvents.length === 0 ? (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {tr(
                  language,
                  'No se han registrado periodos de analizador no disponible.',
                  'No analyzer unavailability periods have been recorded.'
                )}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {metrics.unavailableEvents.slice(0, 6).map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-[#F8FAFC] flex items-start justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[11px] text-slate-900">
                        {ev.code}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                          ev.status === 'RESUELTA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-900'
                        }`}
                      >
                        {ev.status === 'RESUELTA'
                          ? tr(language, 'Resuelta', 'Resolved')
                          : tr(language, 'Activa', 'Active')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {ev.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-xs text-amber-900">
                      {formatDurationMinutes(ev.durationMin)}
                    </div>
                    <div className="font-mono text-[9.5px] text-slate-500 mt-0.5">
                      {new Date(ev.timestamp).toLocaleDateString(locale, {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
