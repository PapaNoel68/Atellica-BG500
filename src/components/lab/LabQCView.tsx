import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Play,
  Plus,
  ShieldAlert,
  Unlock,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import {
  computeQCStats,
  detectTrendOrShift,
  QC_PARAMETERS,
  QCParamKey,
  WESTGARD_RULE_INFO,
} from '@/src/engines/qcEngine';
import { QCNonConformity, WestgardRule } from '@/src/types/analyzer';
import {
  localeFor,
  tr,
  translateClinicalText,
  translateParameterShortLabel,
  translateWestgardDesc,
} from '@/src/i18n/translations';

export const LabQCView: React.FC = () => {
  const {
    state,
    can,
    runQC,
    createQCLevel,
    updateQCLot,
    updateQCNonConformity,
    setQCBlocked,
    language,
  } = useAnalyzer();
  const locale = localeFor(language);

  const [selectedLevelId, setSelectedLevelId] = useState<string>(state.qcLevels[1]?.id ?? state.qcLevels[0]?.id);
  const [selectedParam, setSelectedParam] = useState<QCParamKey>('pO2');
  const [subTab, setSubTab] = useState<'CHARTS' | 'MANUAL' | 'LOTS' | 'NON_CONFORMITIES'>('CHARTS');

  // Manual entry state
  const activeLevel = state.qcLevels.find((l) => l.id === selectedLevelId) ?? state.qcLevels[0];
  const [manualVals, setManualVals] = useState<Record<QCParamKey, string>>(() => {
    const init = {} as Record<QCParamKey, string>;
    QC_PARAMETERS.forEach((p) => {
      init[p.key] = String(activeLevel?.targets[p.key].mean ?? '');
    });
    return init;
  });

  // Lot edit state
  const [lotInput, setLotInput] = useState(activeLevel?.lotNumber ?? '');
  const [expInput, setExpInput] = useState(activeLevel?.expiryDate ?? '');

  // New QC Level modal/form
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelLot, setNewLevelLot] = useState('');
  const [newLevelExp, setNewLevelExp] = useState('2027-06-30');

  // NC editing state
  const [editingNC, setEditingNC] = useState<QCNonConformity | null>(null);
  const [ncCauses, setNcCauses] = useState('');
  const [ncInvestigation, setNcInvestigation] = useState('');
  const [ncCorrective, setNcCorrective] = useState('');

  const handleSelectLevel = (id: string) => {
    setSelectedLevelId(id);
    const lvl = state.qcLevels.find((l) => l.id === id);
    if (lvl) {
      const next = {} as Record<QCParamKey, string>;
      QC_PARAMETERS.forEach((p) => {
        next[p.key] = String(lvl.targets[p.key].mean);
      });
      setManualVals(next);
      setLotInput(lvl.lotNumber);
      setExpInput(lvl.expiryDate);
    }
  };

  const runsForLevel = useMemo(
    () =>
      state.qcRuns
        .filter((r) => r.levelId === activeLevel?.id)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [state.qcRuns, activeLevel]
  );

  const chartData = useMemo(() => {
    return runsForLevel.slice(-25).map((r, idx) => ({
      idx: idx + 1,
      time: new Date(r.timestamp).toLocaleString(locale, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      val: r.values[selectedParam],
      z: r.zScores[selectedParam],
      status: r.status,
    }));
  }, [runsForLevel, selectedParam, locale]);

  const target = activeLevel?.targets[selectedParam];
  const stats = useMemo(() => computeQCStats(runsForLevel, selectedParam), [runsForLevel, selectedParam]);
  const trendNote = useMemo(() => detectTrendOrShift(runsForLevel, selectedParam), [runsForLevel, selectedParam]);
  const paramMeta = QC_PARAMETERS.find((p) => p.key === selectedParam) ?? QC_PARAMETERS[0];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLevel) return;
    const parsed = {} as Record<QCParamKey, number>;
    for (const p of QC_PARAMETERS) {
      const num = Number(manualVals[p.key]);
      if (Number.isNaN(num)) return;
      parsed[p.key] = num;
    }
    runQC({ levelId: activeLevel.id, manualValues: parsed });
    setSubTab('CHARTS');
  };

  const handleCreateLevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim() || !newLevelLot.trim() || !activeLevel) return;
    createQCLevel({
      name: newLevelName.trim(),
      lotNumber: newLevelLot.trim(),
      expiryDate: newLevelExp,
      active: true,
      targets: structuredClone(activeLevel.targets),
    });
    setNewLevelName('');
    setNewLevelLot('');
  };

  const openNCEditor = (nc: QCNonConformity) => {
    setEditingNC(nc);
    setNcCauses(nc.possibleCauses);
    setNcInvestigation(nc.investigation);
    setNcCorrective(nc.correctiveAction);
  };

  const saveNC = (resolve: boolean) => {
    if (!editingNC) return;
    updateQCNonConformity(editingNC.id, {
      possibleCauses: ncCauses,
      investigation: ncInvestigation,
      correctiveAction: ncCorrective,
      status: resolve ? 'RESUELTA' : 'EN_INVESTIGACION',
    });
    setEditingNC(null);
  };

  const openNCs = state.qcNonConformities.filter((nc) => nc.status !== 'RESUELTA');

  return (
    <div className="h-full flex flex-col gap-2 min-h-0 overflow-hidden">
      {/* Top Controls & Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div>
          <h2 className="font-display font-bold text-base text-slate-900">
            {tr(language, 'Control de Calidad Interno (CCI) y Reglas de Westgard', 'Internal Quality Control (IQC) & Westgard Rules')}
          </h2>
          <p className="text-[11px] text-slate-500">
            {tr(
              language,
              'Gráficos Levey-Jennings, detección de tendencias/desplazamientos y gestión de no conformidades',
              'Levey-Jennings charts, trend/shift detection, and non-conformity management'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {can('MANAGE_QC') && (
            <>
              <button
                type="button"
                onClick={() => runQC({ levelId: activeLevel.id, mode: 'CONFORME' })}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{tr(language, 'Simular QC Conforme', 'Simulate Compliant QC')}</span>
              </button>
              <button
                type="button"
                onClick={() => runQC({ levelId: activeLevel.id, mode: 'ADVERTENCIA_1_2S' })}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
              >
                {tr(language, 'Simular 1_2s (Adv.)', 'Simulate 1_2s (Warn.)')}
              </button>
              <button
                type="button"
                onClick={() => runQC({ levelId: activeLevel.id, mode: 'FUERA_DE_RANGO_1_3S' })}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                {tr(language, 'Simular 1_3s (Rechazo)', 'Simulate 1_3s (Reject)')}
              </button>
              <button
                type="button"
                onClick={() => setQCBlocked(!state.qcBlocked)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${
                  state.qcBlocked
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                {state.qcBlocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>
                  {state.qcBlocked
                    ? tr(language, 'Bloqueo Activo (Desbloquear)', 'Lock Active (Unlock)')
                    : tr(language, 'Bloquear por QC', 'Lock by QC')}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-navigation + Level Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(
            [
              { id: 'CHARTS', label: tr(language, 'Levey-Jennings e Histórico', 'Levey-Jennings & History') },
              { id: 'MANUAL', label: tr(language, 'Introducir Control Manual', 'Enter Manual Control') },
              { id: 'LOTS', label: tr(language, 'Niveles y Lotes', 'Levels & Lots') },
              {
                id: 'NON_CONFORMITIES',
                label: tr(
                  language,
                  `No Conformidades (${openNCs.length} abiertas)`,
                  `Non-Conformities (${openNCs.length} open)`
                ),
              },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                subTab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeLevel?.id}
            onChange={(e) => handleSelectLevel(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
          >
            {state.qcLevels.map((l) => (
              <option key={l.id} value={l.id}>
                {translateClinicalText(language, l.name)} · {tr(language, 'Lote', 'Lot')} {l.lotNumber}
              </option>
            ))}
          </select>

          <select
            value={selectedParam}
            onChange={(e) => setSelectedParam(e.target.value as QCParamKey)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
          >
            {QC_PARAMETERS.map((p) => (
              <option key={p.key} value={p.key}>
                {tr(language, 'Parámetro:', 'Parameter:')}{' '}
                {translateParameterShortLabel(language, p.key, p.label)} ({p.unit})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LEVEY-JENNINGS CHART & HISTORY */}
      {subTab === 'CHARTS' && target && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
          {/* Stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl p-2">
              <div className="text-[10.5px] text-slate-500">
                {tr(language, 'Valor asignado (Media)', 'Assigned Value (Mean)')}
              </div>
              <div className="font-mono font-bold text-base text-slate-900 tabular-nums">
                {target.mean.toFixed(paramMeta.decimals)} {paramMeta.unit}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-2">
              <div className="text-[10.5px] text-slate-500">
                {tr(language, 'DE asignada (±1s / ±3s)', 'Assigned SD (±1s / ±3s)')}
              </div>
              <div className="font-mono font-bold text-base text-slate-900 tabular-nums">
                ±{target.sd.toFixed(paramMeta.decimals)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-2">
              <div className="text-[10.5px] text-slate-500">
                {tr(language, 'Media obtenida', 'Obtained Mean')} (n={stats.n})
              </div>
              <div className="font-mono font-bold text-base text-[#0066B2] tabular-nums">
                {stats.mean.toFixed(paramMeta.decimals)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-2">
              <div className="text-[10.5px] text-slate-500">
                {tr(language, 'DE obtenida', 'Obtained SD')}
              </div>
              <div className="font-mono font-bold text-base text-slate-900 tabular-nums">
                {stats.sd.toFixed(paramMeta.decimals + 1)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-2">
              <div className="text-[10.5px] text-slate-500">
                {tr(language, 'Coef. Variación (CV%)', 'Coeff. Variation (CV%)')}
              </div>
              <div className="font-mono font-bold text-base text-slate-900 tabular-nums">
                {stats.cv.toFixed(2)}%
              </div>
            </div>
          </div>

          {trendNote && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-[11px] text-amber-950 flex items-center gap-2 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                <strong>{tr(language, 'Análisis de tendencia/desplazamiento:', 'Trend/shift analysis:')}</strong>{' '}
                {translateClinicalText(language, trendNote)}
              </span>
            </div>
          )}

          {/* Levey-Jennings Chart + Westgard Rules Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 shrink-0">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold text-xs text-slate-900">
                  {tr(language, 'Gráfico Levey-Jennings', 'Levey-Jennings Chart')} —{' '}
                  {translateClinicalText(language, activeLevel.name)} ·{' '}
                  {translateParameterShortLabel(language, paramMeta.key, paramMeta.label)}
                </h3>
                <div className="text-[10.5px] font-mono text-slate-500">
                  {tr(language, 'Límites Westgard: ±2 DE (Adv.) · ±3 DE (Rechazo)', 'Westgard Limits: ±2 SD (Warn.) · ±3 SD (Reject)')}
                </div>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 28, left: 4, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      domain={[
                        Number((target.mean - 3.6 * target.sd).toFixed(paramMeta.decimals)),
                        Number((target.mean + 3.6 * target.sd).toFixed(paramMeta.decimals)),
                      ]}
                    />
                    <Tooltip
                      formatter={(value: unknown) => [
                        `${Number(value).toFixed(paramMeta.decimals)} ${paramMeta.unit}`,
                        translateParameterShortLabel(language, paramMeta.key, paramMeta.label),
                      ]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.time ? `Control: ${payload[0].payload.time}` : ''
                      }
                    />
                    <ReferenceLine y={target.mean} stroke="#0F172A" strokeWidth={1.5} label={{ value: tr(language, 'Media', 'Mean'), position: 'right', fontSize: 9 }} />
                    <ReferenceLine y={target.mean + target.sd} stroke="#94A3B8" strokeDasharray="3 3" />
                    <ReferenceLine y={target.mean - target.sd} stroke="#94A3B8" strokeDasharray="3 3" />
                    <ReferenceLine y={target.mean + 2 * target.sd} stroke="#D97706" strokeDasharray="4 4" label={{ value: '+2s', position: 'right', fontSize: 9, fill: '#B45309' }} />
                    <ReferenceLine y={target.mean - 2 * target.sd} stroke="#D97706" strokeDasharray="4 4" label={{ value: '-2s', position: 'right', fontSize: 9, fill: '#B45309' }} />
                    <ReferenceLine y={target.mean + 3 * target.sd} stroke="#DC2626" label={{ value: '+3s', position: 'right', fontSize: 9, fill: '#DC2626' }} />
                    <ReferenceLine y={target.mean - 3 * target.sd} stroke="#DC2626" label={{ value: '-3s', position: 'right', fontSize: 9, fill: '#DC2626' }} />
                    <Line
                      type="monotone"
                      dataKey="val"
                      stroke="#0066B2"
                      strokeWidth={2}
                      dot={{ r: 3.5, fill: '#0066B2' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Active Westgard Rules Legend */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-900 mb-1.5">
                {tr(language, 'Reglas de Westgard activas', 'Active Westgard Rules')}
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                {(Object.keys(WESTGARD_RULE_INFO) as WestgardRule[]).map((rk) => {
                  const info = WESTGARD_RULE_INFO[rk];
                  const enabled = state.config.qcSettings.enabledRules[rk];
                  const typeLabel =
                    info.type === 'Rechazo'
                      ? tr(language, 'Rechazo', 'Rejection')
                      : tr(language, 'Advertencia', 'Warning');
                  return (
                    <div
                      key={rk}
                      className={`p-1.5 rounded border ${
                        enabled ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/50 border-slate-200 opacity-55'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-bold text-slate-900">{info.title}</span>
                        <span
                          className={`text-[9.5px] font-semibold ${
                            info.type === 'Rechazo' ? 'text-red-700' : 'text-amber-700'
                          }`}
                        >
                          {enabled ? typeLabel : 'Off'}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-slate-600 line-clamp-1">
                        {translateWestgardDesc(language, rk, info.desc)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* QC Run History Table */}
          <div className="bg-white border border-slate-200 rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="px-3.5 py-1.5 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 shrink-0">
              {tr(language, 'Histórico de Controles', 'Control History')} —{' '}
              {translateClinicalText(language, activeLevel.name)} ({runsForLevel.length}{' '}
              {tr(language, 'mediciones', 'runs')})
            </div>
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 z-10">
                  <tr>
                    <th className="py-2 px-3">{tr(language, 'Fecha / Hora', 'Date / Time')}</th>
                    <th className="py-2 px-3">{tr(language, 'Lote', 'Lot')}</th>
                    <th className="py-2 px-3 text-right">pH</th>
                    <th className="py-2 px-3 text-right">pCO2</th>
                    <th className="py-2 px-3 text-right">pO2</th>
                    <th className="py-2 px-3 text-right">Na+</th>
                    <th className="py-2 px-3 text-right">K+</th>
                    <th className="py-2 px-3 text-right">Lac</th>
                    <th className="py-2 px-3">{tr(language, 'Estado', 'Status')}</th>
                    <th className="py-2 px-3">{tr(language, 'Reglas / Operador', 'Rules / Operator')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...runsForLevel].reverse().map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {new Date(run.timestamp).toLocaleString(locale)}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">{run.lotNumber}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{run.values.pH.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{run.values.pCO2.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{run.values.pO2.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{run.values.Na.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{run.values.K.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{run.values.Lac.toFixed(2)}</td>
                      <td className="py-2 px-3 font-semibold whitespace-nowrap">
                        {run.status === 'CONFORME' ? (
                          <span className="text-emerald-700 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {tr(language, 'Conforme', 'Compliant')}
                          </span>
                        ) : run.status === 'ADVERTENCIA' ? (
                          <span className="text-amber-700 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> {tr(language, 'Advertencia', 'Warning')}
                          </span>
                        ) : (
                          <span className="text-red-700 inline-flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> {tr(language, 'No Conforme', 'Non-Compliant')}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {run.violatedRules.length > 0
                          ? run.violatedRules.map((v) => `${v.parameter} (${v.rule})`).join(', ')
                          : run.operatorName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL QC ENTRY */}
      {subTab === 'MANUAL' && activeLevel && (
        <form onSubmit={handleManualSubmit} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 max-w-4xl shrink-0">
          <div>
            <h3 className="font-display font-bold text-sm text-slate-900">
              {tr(language, 'Introducción Manual de Resultado de Control', 'Manual Quality Control Result Entry')} —{' '}
              {translateClinicalText(language, activeLevel.name)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {tr(language, 'Lote activo:', 'Active lot:')}{' '}
              <span className="font-mono font-semibold">{activeLevel.lotNumber}</span>.{' '}
              {tr(
                language,
                'Se aplicarán automáticamente todas las reglas Westgard configuradas.',
                'All configured Westgard rules will be applied automatically.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QC_PARAMETERS.map((p) => {
              const t = activeLevel.targets[p.key];
              return (
                <div key={p.key} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {translateParameterShortLabel(language, p.key, p.label)} ({p.unit})
                  </label>
                  <div className="text-[10.5px] font-mono text-slate-500 mb-1">
                    {tr(language, 'Diana:', 'Target:')} {t.mean} ± {t.sd}
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={manualVals[p.key]}
                    onChange={(e) => setManualVals({ ...manualVals, [p.key]: e.target.value })}
                    className="w-full px-2.5 py-1 rounded border border-slate-300 bg-white text-xs font-mono focus:outline-none focus:border-[#0066B2]"
                  />
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={!can('MANAGE_QC')}
            className="px-4 py-2 rounded-lg bg-[#0066B2] hover:bg-[#005291] disabled:opacity-50 text-white text-xs font-semibold"
          >
            {tr(language, 'Evaluar y registrar control manual', 'Evaluate and Log Manual QC')}
          </button>
        </form>
      )}

      {/* LEVELS & LOTS MANAGEMENT */}
      {subTab === 'LOTS' && activeLevel && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="font-display font-bold text-sm text-slate-900">
              {tr(language, 'Actualizar Lote del Nivel Seleccionado', 'Update Lot for Selected Level')} (
              {translateClinicalText(language, activeLevel.name)})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr(language, 'Número de lote', 'Lot number')}
                </label>
                <input
                  type="text"
                  value={lotInput}
                  onChange={(e) => setLotInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr(language, 'Caducidad', 'Expiry date')}
                </label>
                <input
                  type="date"
                  value={expInput}
                  onChange={(e) => setExpInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateQCLot(activeLevel.id, lotInput, expInput)}
              className="px-4 py-1.5 rounded-lg bg-[#0066B2] hover:bg-[#005291] text-white text-xs font-semibold"
            >
              {tr(language, 'Guardar lote y caducidad', 'Save Lot & Expiry')}
            </button>
          </div>

          <form onSubmit={handleCreateLevel} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#0066B2]" />
              <span>{tr(language, 'Crear Nuevo Nivel de Control', 'Create New Control Level')}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr(language, 'Nombre nivel', 'Level name')}
                </label>
                <input
                  type="text"
                  required
                  value={newLevelName}
                  onChange={(e) => setNewLevelName(e.target.value)}
                  placeholder={tr(language, 'Ej. Nivel 4 (Especial)', 'e.g. Level 4 (Special)')}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr(language, 'Lote', 'Lot')}
                </label>
                <input
                  type="text"
                  required
                  value={newLevelLot}
                  onChange={(e) => setNewLevelLot(e.target.value)}
                  placeholder="AQC-26001"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr(language, 'Caducidad', 'Expiry')}
                </label>
                <input
                  type="date"
                  required
                  value={newLevelExp}
                  onChange={(e) => setNewLevelExp(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              {tr(language, 'Crear nivel de control', 'Create Control Level')}
            </button>
          </form>
        </div>
      )}

      {/* NON-CONFORMITIES MANAGEMENT */}
      {subTab === 'NON_CONFORMITIES' && (
        <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
          {state.qcNonConformities.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              {tr(
                language,
                'No hay controles no conformes registrados. Puede simular un fallo 1_3s desde la barra superior para probar el flujo completo de gestión.',
                'No non-compliant QC runs recorded. You can simulate a 1_3s failure from the top bar to test the full management workflow.'
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
              {state.qcNonConformities.map((nc) => (
                <div key={nc.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-red-700">{nc.id}</span>
                      <span className="mx-2 text-slate-300">·</span>
                      <span className="font-bold text-sm text-slate-900">
                        {translateClinicalText(language, nc.levelName)} — {nc.parameter} ({tr(language, 'Regla', 'Rule')} {nc.rule})
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded border ${
                        nc.status === 'RESUELTA'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      {translateClinicalText(language, nc.status)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <strong>{tr(language, 'Posibles causas:', 'Possible causes:')}</strong>{' '}
                      {nc.possibleCauses ? translateClinicalText(language, nc.possibleCauses) : tr(language, 'Pendiente', 'Pending')}
                    </div>
                    <div>
                      <strong>{tr(language, 'Investigación:', 'Investigation:')}</strong>{' '}
                      {nc.investigation ? translateClinicalText(language, nc.investigation) : tr(language, 'Pendiente de documentar', 'Pending documentation')}
                    </div>
                    <div>
                      <strong>{tr(language, 'Acción correctiva:', 'Corrective action:')}</strong>{' '}
                      {nc.correctiveAction ? translateClinicalText(language, nc.correctiveAction) : tr(language, 'Pendiente de documentar', 'Pending documentation')}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>
                      {tr(language, 'Responsable:', 'Responsible:')} {nc.responsibleName} · {tr(language, 'Detectado:', 'Detected:')}{' '}
                      <span className="font-mono">{new Date(nc.detectedAt).toLocaleString(locale)}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {nc.status !== 'RESUELTA' && (
                        <>
                          <button
                            type="button"
                            onClick={() => runQC({ levelId: activeLevel.id, mode: 'CONFORME' })}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800"
                          >
                            {tr(language, 'Repetir control', 'Repeat Control')}
                          </button>
                          <button
                            type="button"
                            onClick={() => openNCEditor(nc)}
                            className="px-3 py-1.5 rounded-lg bg-[#0066B2] hover:bg-[#005291] text-white text-xs font-semibold"
                          >
                            {tr(language, 'Investigar / Resolver', 'Investigate / Resolve')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editingNC && (
            <div className="bg-white border border-sky-300 rounded-xl p-5 space-y-4">
              <h4 className="font-display font-bold text-sm text-slate-900">
                {tr(language, 'Documentar Investigación y Acción Correctiva', 'Document Investigation & Corrective Action')} ({editingNC.id})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr(language, 'Posibles causas', 'Possible causes')}
                  </label>
                  <textarea
                    rows={3}
                    value={ncCauses}
                    onChange={(e) => setNcCauses(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr(language, 'Investigación realizada', 'Investigation performed')}
                  </label>
                  <textarea
                    rows={3}
                    value={ncInvestigation}
                    onChange={(e) => setNcInvestigation(e.target.value)}
                    placeholder={tr(
                      language,
                      'Ej. Revisión de lote, caducidad, lavado y calibración 2-puntos...',
                      'e.g. Lot review, expiry check, wash cycle, and 2-point calibration...'
                    )}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr(language, 'Acción correctiva y repetición', 'Corrective action & repeat run')}
                  </label>
                  <textarea
                    rows={3}
                    value={ncCorrective}
                    onChange={(e) => setNcCorrective(e.target.value)}
                    placeholder={tr(
                      language,
                      'Ej. Cartucho purgado y repetición de Nivel 2 conforme...',
                      'e.g. Cartridge purged and Level 2 repeat passed...'
                    )}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveNC(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800"
                >
                  {tr(language, 'Guardar en investigación', 'Save Under Investigation')}
                </button>
                <button
                  type="button"
                  onClick={() => saveNC(true)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {tr(language, 'Resolver y desbloquear equipo', 'Resolve & Unlock Analyzer')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNC(null)}
                  className="px-3 py-2 text-xs text-slate-500"
                >
                  {tr(language, 'Cancelar', 'Cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
