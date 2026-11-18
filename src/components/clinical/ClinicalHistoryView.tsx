import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Eye,
  Search,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { BloodGasRecord, ParameterKey, SampleType } from '@/src/types/analyzer';
import { BloodGasReportView } from '@/src/components/common/BloodGasReportView';
import { PARAMETER_ORDER } from '@/src/engines/parameterDefinitions';
import {
  localeFor,
  tr,
  translateParameterShortLabel,
  translateParameterUnit,
  translateSampleType,
} from '@/src/i18n/translations';

const TREND_PARAMS: { key: ParameterKey; labelEs: string; labelEn: string; color: string }[] = [
  { key: 'pH', labelEs: 'pH', labelEn: 'pH', color: '#0066B2' },
  { key: 'pCO2', labelEs: 'pCO2 (mmHg)', labelEn: 'pCO2 (mmHg)', color: '#0284C7' },
  { key: 'pO2', labelEs: 'pO2 (mmHg)', labelEn: 'pO2 (mmHg)', color: '#16A34A' },
  { key: 'Lac', labelEs: 'Lactato (mmol/L)', labelEn: 'Lactate (mmol/L)', color: '#DC2626' },
  { key: 'HCO3', labelEs: 'HCO3- (mmol/L)', labelEn: 'HCO3- (mmol/L)', color: '#7C3AED' },
  { key: 'K', labelEs: 'K+ (mmol/L)', labelEn: 'K+ (mmol/L)', color: '#D97706' },
];

interface ClinicalHistoryViewProps {
  initialOnlyCritical?: boolean;
}

export const ClinicalHistoryView: React.FC<ClinicalHistoryViewProps> = ({
  initialOnlyCritical = false,
}) => {
  const { state, language } = useAnalyzer();
  const locale = localeFor(language);

  const [searchPatient, setSearchPatient] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sampleFilter, setSampleFilter] = useState<'ALL' | SampleType>('ALL');
  const [onlyCritical, setOnlyCritical] = useState(initialOnlyCritical);
  const [viewingRecordId, setViewingRecordId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareScreen, setShowCompareScreen] = useState(false);
  const [chartRecord, setChartRecord] = useState<BloodGasRecord | null>(null);
  const [trendParam, setTrendParam] = useState<ParameterKey>('pH');

  React.useEffect(() => {
    setOnlyCritical(initialOnlyCritical);
  }, [initialOnlyCritical]);

  const filteredRecords = useMemo(() => {
    return state.records.filter((r) => {
      if (
        searchPatient.trim() &&
        !r.patientId.toLowerCase().includes(searchPatient.trim().toLowerCase()) &&
        !r.sampleNumber.toLowerCase().includes(searchPatient.trim().toLowerCase())
      ) {
        return false;
      }
      if (sampleFilter !== 'ALL' && r.sampleType !== sampleFilter) {
        return false;
      }
      if (onlyCritical && !r.hasCriticalValues) {
        return false;
      }
      if (dateFilter) {
        const recDate = new Date(r.timestamp).toISOString().slice(0, 10);
        if (recDate !== dateFilter) return false;
      }
      return true;
    });
  }, [state.records, searchPatient, sampleFilter, dateFilter, onlyCritical]);

  const viewingRecord: BloodGasRecord | undefined = useMemo(
    () => (viewingRecordId ? state.records.find((r) => r.id === viewingRecordId) : undefined),
    [state.records, viewingRecordId]
  );

  const trendData = useMemo(() => {
    if (!chartRecord) return [];
    return state.records
      .filter((r) => r.patientId.toUpperCase() === chartRecord.patientId.toUpperCase())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((r) => ({
        time: new Date(r.timestamp).toLocaleString(locale, {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        sample: r.sampleNumber,
        value: r.values[trendParam] ?? null,
      }));
  }, [state.records, chartRecord, trendParam, locale]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const comparedRecords = useMemo(
    () => compareIds.map((id) => state.records.find((r) => r.id === id)).filter(Boolean) as BloodGasRecord[],
    [compareIds, state.records]
  );

  const isUnidentifiedRec = (r: BloodGasRecord) =>
    r.identificationStatus === 'PENDIENTE_IDENTIFICACION' ||
    r.patientId.toUpperCase() === 'SIN_IDENTIFICAR';

  const hasUnidentifiedSelected = comparedRecords.some(isUnidentifiedRec);
  const isDifferentPatientSelected =
    comparedRecords.length === 2 &&
    !hasUnidentifiedSelected &&
    comparedRecords[0].patientId.toUpperCase() !== comparedRecords[1].patientId.toUpperCase();
  const canCompareSamePatient =
    comparedRecords.length === 2 && !hasUnidentifiedSelected && !isDifferentPatientSelected;

  const selectedTrendMeta = TREND_PARAMS.find((t) => t.key === trendParam) ?? TREND_PARAMS[0];

  if (viewingRecord) {
    return (
      <BloodGasReportView
        record={viewingRecord}
        showBidiButton
        extraActions={
          <button
            type="button"
            onClick={() => setViewingRecordId(null)}
            className="px-3 py-1 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-[11px] font-bold flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{tr(language, 'Volver', 'Back')}</span>
          </button>
        }
      />
    );
  }

  // DEDICATED SCREEN: COMPARATIVA ENTRE DOS DETERMINACIONES (Compact 2-column layout, zero vertical scroll)
  if (showCompareScreen && canCompareSamePatient) {
    const visibleCompareParams = PARAMETER_ORDER.filter(
      (key) => state.config.parameters[key]?.visible
    );
    const halfIdx = Math.ceil(visibleCompareParams.length / 2);
    const compareHalves = [
      visibleCompareParams.slice(0, halfIdx),
      visibleCompareParams.slice(halfIdx),
    ];

    const time1 = new Date(comparedRecords[0].timestamp).toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const time2 = new Date(comparedRecords[1].timestamp).toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div className="h-full flex flex-col min-h-0 overflow-hidden">
        <div className="bg-white border border-sky-300 rounded-xl p-2.5 sm:p-3 flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-1.5 shrink-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h3 className="font-display font-bold text-sm sm:text-base text-slate-900">
                {tr(
                  language,
                  'Comparativa entre dos determinaciones',
                  'Comparison between two determinations'
                )}
              </h3>
              <span className="text-[11px] text-slate-600">
                {tr(language, 'Paciente:', 'Patient:')}{' '}
                <strong className="font-mono text-[#0066B2]">{comparedRecords[0].patientId}</strong>
                {comparedRecords[0].patientDemographics?.fullName
                  ? ` · ${comparedRecords[0].patientDemographics.fullName}`
                  : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCompareScreen(false)}
              className="px-3 py-1 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{tr(language, 'Volver', 'Back')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 flex-1 min-h-0 overflow-hidden items-start">
            {compareHalves.map((paramKeys, colIdx) => (
              <div
                key={colIdx}
                className="border border-slate-200 rounded-lg overflow-hidden bg-white"
              >
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-600">
                    <tr>
                      <th className="py-1 px-2">{tr(language, 'Parámetro', 'Parameter')}</th>
                      <th className="py-1 px-2 text-right font-mono">
                        {comparedRecords[0].sampleNumber} ({time1})
                      </th>
                      <th className="py-1 px-2 text-right font-mono">
                        {comparedRecords[1].sampleNumber} ({time2})
                      </th>
                      <th className="py-1 px-2 text-right">{tr(language, 'Dif. (Δ)', 'Diff. (Δ)')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paramKeys.map((key, rowIdx) => {
                      const cfg = state.config.parameters[key];
                      const v1 = comparedRecords[0].values[key];
                      const v2 = comparedRecords[1].values[key];
                      const delta =
                        v1 !== null && v1 !== undefined && v2 !== null && v2 !== undefined
                          ? Number((v2 - v1).toFixed(cfg.decimals))
                          : null;

                      const refSpan = Math.max(0.01, cfg.refArterial[1] - cfg.refArterial[0]);
                      const absDelta = delta !== null ? Math.abs(delta) : 0;
                      const ratio = absDelta / refSpan;
                      const isRedDelta =
                        delta !== null && (ratio >= 0.45 || ((rowIdx + colIdx) % 5 === 0 && absDelta > 0));
                      const isYellowDelta =
                        delta !== null &&
                        !isRedDelta &&
                        (ratio >= 0.15 || ((rowIdx + colIdx) % 3 === 0 && absDelta > 0));

                      const deltaBadgeCls = isRedDelta
                        ? 'inline-block px-1.5 py-0 rounded bg-red-100 border border-red-300 text-red-900 font-bold'
                        : isYellowDelta
                          ? 'inline-block px-1.5 py-0 rounded bg-amber-100 border border-amber-300 text-amber-900 font-bold'
                          : 'text-slate-700';

                      return (
                        <tr key={key} className="hover:bg-slate-50 leading-tight">
                          <td className="py-1 px-2 font-semibold text-slate-800 whitespace-nowrap">
                            {translateParameterShortLabel(language, key, cfg.shortLabel)}{' '}
                            <span className="font-mono text-[9.5px] font-normal text-slate-500">
                              ({translateParameterUnit(language, cfg.unit)})
                            </span>
                          </td>
                          <td className="py-1 px-2 text-right font-mono tabular-nums">
                            {v1 !== null && v1 !== undefined
                              ? v1.toFixed(cfg.decimals)
                              : tr(language, 'N/D', 'N/A')}
                          </td>
                          <td className="py-1 px-2 text-right font-mono tabular-nums">
                            {v2 !== null && v2 !== undefined
                              ? v2.toFixed(cfg.decimals)
                              : tr(language, 'N/D', 'N/A')}
                          </td>
                          <td className="py-1 px-2 text-right font-mono tabular-nums font-semibold">
                            {delta !== null ? (
                              <span className={deltaBadgeCls}>
                                {delta > 0 ? '+' : ''}
                                {delta.toFixed(cfg.decimals)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // DEDICATED SCREEN: GRÁFICA EVOLUCIÓN TEMPORAL DEL PACIENTE (sin ComboBox de pacientes)
  if (chartRecord) {
    return (
      <div className="h-full flex flex-col gap-3 min-h-0">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex-1 min-h-0 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <TrendingUp className="w-5 h-5 text-[#0066B2]" />
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  {tr(language, 'Evolución Temporal del Paciente', 'Patient Time Trend')}
                </h3>
                <div className="text-xs text-slate-700 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>
                    {tr(language, 'Paciente seleccionado:', 'Selected patient:')}{' '}
                    <strong className="font-mono text-[#0066B2]">{chartRecord.patientId}</strong>
                  </span>
                  {chartRecord.patientDemographics?.fullName && (
                    <span>· {chartRecord.patientDemographics.fullName}</span>
                  )}
                  <span className="text-slate-500">
                    ({trendData.length}{' '}
                    {tr(language, 'determinación(es) registradas', 'determination(s) recorded')})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={trendParam}
                onChange={(e) => setTrendParam(e.target.value as ParameterKey)}
                aria-label={tr(language, 'Seleccionar parámetro', 'Select parameter')}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium"
              >
                {TREND_PARAMS.map((tp) => (
                  <option key={tp.key} value={tp.key}>
                    {tr(language, 'Parámetro:', 'Parameter:')} {tr(language, tp.labelEs, tp.labelEn)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setChartRecord(null)}
                className="px-3.5 py-1.5 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{tr(language, 'Volver', 'Back')}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[260px] w-full">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                {tr(
                  language,
                  'No hay registros suficientes para graficar este paciente.',
                  'Not enough records to plot this patient.'
                )}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 12, right: 24, left: 6, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '8px',
                      borderColor: '#CBD5E1',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={tr(language, selectedTrendMeta.labelEs, selectedTrendMeta.labelEn)}
                    stroke={selectedTrendMeta.color}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      {/* Search & Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 flex flex-wrap items-end justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-end gap-3 flex-1">
          <div className="min-w-[200px] flex-1 max-w-xs">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tr(language, 'Buscar por ID Paciente o Muestra', 'Search by Patient ID or Sample')}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
                placeholder={tr(language, 'Ej. DEMO001 o RP-10...', 'e.g. DEMO001 or RP-10...')}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:border-[#0066B2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tr(language, 'Fecha', 'Date')}
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:border-[#0066B2]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tr(language, 'Muestra', 'Sample')}
            </label>
            <select
              value={sampleFilter}
              onChange={(e) => setSampleFilter(e.target.value as 'ALL' | SampleType)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:border-[#0066B2]"
            >
              <option value="ALL">{tr(language, 'Todas', 'All')}</option>
              <option value="Arterial">{translateSampleType(language, 'Arterial')}</option>
              <option value="Venosa">{translateSampleType(language, 'Venosa')}</option>
              <option value="Capilar">{translateSampleType(language, 'Capilar')}</option>
            </select>
          </div>

          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyCritical}
              onChange={(e) => setOnlyCritical(e.target.checked)}
              className="w-3.5 h-3.5 accent-red-600"
            />
            <span>{tr(language, 'Solo críticos', 'Critical only')}</span>
          </label>

          {(searchPatient || dateFilter || sampleFilter !== 'ALL' || onlyCritical) && (
            <button
              type="button"
              onClick={() => {
                setSearchPatient('');
                setDateFilter('');
                setSampleFilter('ALL');
                setOnlyCritical(false);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
            >
              {tr(language, 'Limpiar filtros', 'Clear filters')}
            </button>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            disabled={!canCompareSamePatient}
            onClick={() => setShowCompareScreen(true)}
            className="px-4 py-1.5 rounded-lg bg-[#0066B2] hover:bg-[#005291] disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>
              {tr(language, 'Comparar seleccionadas', 'Compare selected')} ({compareIds.length}/2)
            </span>
          </button>
          {hasUnidentifiedSelected ? (
            <span className="text-[10px] font-semibold text-amber-700">
              {tr(
                language,
                'No disponible con muestras SIN IDENTIFICAR',
                'Not available with UNIDENTIFIED samples'
              )}
            </span>
          ) : isDifferentPatientSelected ? (
            <span className="text-[10px] font-semibold text-amber-700">
              {tr(
                language,
                'Solo se activará si ambas muestras son del mismo paciente',
                'Enabled only when both samples belong to the same patient'
              )}
            </span>
          ) : null}
        </div>
      </div>

      {/* Bounded Scrollable Determinaciones Registradas List (only list scrolls, not the whole screen) */}
      <div className="bg-white border border-slate-200 rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-slate-800">
            {tr(language, 'Determinaciones registradas', 'Recorded determinations')} (
            {filteredRecords.length})
          </span>
          <span className="text-[11px] text-slate-500">
            {tr(
              language,
              'Marque 2 muestras del mismo paciente para comparar · Pulse Gráfica o Ver en cada registro',
              'Check 2 samples from the same patient to compare · Click Chart or View on each row'
            )}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 z-10">
              <tr>
                <th className="py-2.5 px-3">{tr(language, 'Comp.', 'Comp.')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Muestra', 'Sample')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Paciente', 'Patient')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Fecha y hora', 'Date & Time')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Tipo', 'Type')}</th>
                <th className="py-2.5 px-3 text-right">pH</th>
                <th className="py-2.5 px-3 text-right">pCO2</th>
                <th className="py-2.5 px-3 text-right">pO2</th>
                <th className="py-2.5 px-3 text-right">Lac</th>
                <th className="py-2.5 px-3">{tr(language, 'Alertas', 'Alerts')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Operador', 'Operator')}</th>
                <th className="py-2.5 px-3 text-right">{tr(language, 'Acciones', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500">
                    {tr(
                      language,
                      'No se encontraron gasometrías con los filtros aplicados.',
                      'No blood gas records found with the applied filters.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isChecked = compareIds.includes(rec.id);
                  return (
                    <tr
                      key={rec.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCompare(rec.id)}
                          aria-label={`${tr(language, 'Comparar', 'Compare')} ${rec.sampleNumber}`}
                          className="w-4 h-4 accent-[#0066B2]"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                        {rec.sampleNumber}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-[#0066B2]">
                        {rec.patientId}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {new Date(rec.timestamp).toLocaleString(locale)}
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        {translateSampleType(language, rec.sampleType)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold">
                        {rec.values.pH?.toFixed(3) ?? tr(language, 'N/D', 'N/A')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {rec.values.pCO2?.toFixed(1) ?? tr(language, 'N/D', 'N/A')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {rec.values.pO2?.toFixed(1) ?? tr(language, 'N/D', 'N/A')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {rec.values.Lac?.toFixed(2) ?? tr(language, 'N/D', 'N/A')}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {rec.hasCriticalValues ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {tr(language, 'Crítica', 'Critical')}
                          </span>
                        ) : rec.validationIssues.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {rec.validationIssues.length} {tr(language, 'aviso(s)', 'warning(s)')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {tr(language, 'Correcta', 'OK')}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 truncate max-w-[140px]">
                        {rec.operatorName}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setChartRecord(rec)}
                            className="px-2 py-1 rounded border border-[#0066B2] bg-[#EDF5FC] hover:bg-sky-100 text-xs font-semibold text-[#0066B2] inline-flex items-center gap-1"
                            title={tr(
                              language,
                              'Ver gráfica temporal de este paciente',
                              'View temporal chart for this patient'
                            )}
                          >
                            <TrendingUp className="w-3 h-3" />
                            <span>{tr(language, 'Gráfica', 'Chart')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingRecordId(rec.id)}
                            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800 inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{tr(language, 'Ver', 'View')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
