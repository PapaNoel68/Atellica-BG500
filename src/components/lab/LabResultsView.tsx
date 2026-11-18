import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { BloodGasRecord, ResultValidationStatus, SampleType } from '@/src/types/analyzer';
import { BloodGasReportView } from '@/src/components/common/BloodGasReportView';
import { PARAMETER_ORDER } from '@/src/engines/parameterDefinitions';
import {
  localeFor,
  tr,
  translateSampleType,
  translateValidationStatus,
} from '@/src/i18n/translations';

export const LabResultsView: React.FC = () => {
  const { state, can, pushToast, language } = useAnalyzer();
  const locale = localeFor(language);

  const [query, setQuery] = useState('');
  const [sampleTypeFilter, setSampleTypeFilter] = useState<'ALL' | SampleType>('ALL');
  const [validationFilter, setValidationFilter] = useState<'ALL' | ResultValidationStatus>('ALL');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return state.records.filter((r) => {
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (
          !r.patientId.toLowerCase().includes(q) &&
          !r.sampleNumber.toLowerCase().includes(q) &&
          !r.operatorName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (sampleTypeFilter !== 'ALL' && r.sampleType !== sampleTypeFilter) return false;
      if (validationFilter !== 'ALL' && r.validationStatus !== validationFilter) return false;
      if (onlyIssues && r.validationIssues.length === 0 && !r.hasCriticalValues) return false;
      return true;
    });
  }, [state.records, query, sampleTypeFilter, validationFilter, onlyIssues]);

  const viewingRecord: BloodGasRecord | undefined = useMemo(
    () => (viewingId ? state.records.find((r) => r.id === viewingId) : undefined),
    [state.records, viewingId]
  );

  const exportCsv = () => {
    if (!can('EXPORT_RESULTS')) return;
    const headers =
      language === 'en'
        ? [
            'Sample',
            'Patient',
            'Location',
            'DateTime',
            'SampleType',
            'Operator',
            'ValidationStatus',
            'CriticalAlerts',
            'Inconsistencies',
            ...PARAMETER_ORDER,
          ]
        : [
            'Muestra',
            'Paciente',
            'Ubicacion',
            'FechaHora',
            'TipoMuestra',
            'Operador',
            'EstadoValidacion',
            'AlertasCriticas',
            'Incoherencias',
            ...PARAMETER_ORDER,
          ];
    const rows = filtered.map((r) => [
      r.sampleNumber,
      r.patientId,
      `"${r.patientLocation}"`,
      r.timestamp,
      translateSampleType(language, r.sampleType),
      `"${r.operatorName}"`,
      translateValidationStatus(language, r.validationStatus),
      r.hasCriticalValues ? tr(language, 'SI', 'YES') : 'NO',
      r.validationIssues.length,
      ...PARAMETER_ORDER.map((k) => r.values[k] ?? ''),
    ]);
    const csvContent = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RAPIDPoint500e_${tr(language, 'Resultados', 'Results')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({
      tone: 'success',
      title: 'Exportación CSV generada',
      message: `${filtered.length} determinaciones exportadas.`,
    });
  };

  if (viewingRecord) {
    return (
      <BloodGasReportView
        record={viewingRecord}
        showLabValidationControls
        extraActions={
          <button
            type="button"
            onClick={() => setViewingId(null)}
            className="px-3 py-1 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-[11px] font-bold flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{tr(language, 'Volver', 'Back')}</span>
          </button>
        }
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0 overflow-hidden">
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-base text-slate-900">
              {tr(language, 'Gestión Completa de Resultados y Validación', 'Full Results & Validation Management')}
            </h2>
            <p className="text-[11px] text-slate-500">
              {tr(
                language,
                'Búsqueda avanzada, revisión de coherencia, validación facultativa y exportación CSV',
                'Advanced search, coherence review, specialist validation, and CSV export'
              )}
            </p>
          </div>
          {can('EXPORT_RESULTS') && (
            <button
              type="button"
              onClick={exportCsv}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{tr(language, 'Exportar CSV', 'Export CSV')} ({filtered.length})</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <div className="min-w-[200px] flex-1">
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
              {tr(language, 'Buscar paciente, muestra u operador', 'Search patient, sample, or operator')}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr(language, 'DEMO001, RP-1001, García...', 'DEMO001, RP-1001, Smith...')}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
              {tr(language, 'Muestra', 'Sample')}
            </label>
            <select
              value={sampleTypeFilter}
              onChange={(e) => setSampleTypeFilter(e.target.value as 'ALL' | SampleType)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
            >
              <option value="ALL">{tr(language, 'Todas', 'All')}</option>
              <option value="Arterial">{translateSampleType(language, 'Arterial')}</option>
              <option value="Venosa">{translateSampleType(language, 'Venosa')}</option>
              <option value="Capilar">{translateSampleType(language, 'Capilar')}</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
              {tr(language, 'Validación', 'Validation')}
            </label>
            <select
              value={validationFilter}
              onChange={(e) =>
                setValidationFilter(e.target.value as 'ALL' | ResultValidationStatus)
              }
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
            >
              <option value="ALL">{tr(language, 'Todos', 'All')}</option>
              <option value="PENDIENTE">{translateValidationStatus(language, 'PENDIENTE')}</option>
              <option value="EN_REVISION">{translateValidationStatus(language, 'EN_REVISION')}</option>
              <option value="VALIDADO">{translateValidationStatus(language, 'VALIDADO')}</option>
              <option value="RECHAZADO">{translateValidationStatus(language, 'RECHAZADO')}</option>
            </select>
          </div>

          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={onlyIssues}
              onChange={(e) => setOnlyIssues(e.target.checked)}
              className="w-4 h-4 accent-[#0066B2]"
            />
            <span>{tr(language, 'Solo con alertas / incoherencias', 'Only with alerts / inconsistencies')}</span>
          </label>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white border border-slate-200 rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 z-10">
              <tr>
                <th className="py-2.5 px-3">{tr(language, 'Muestra', 'Sample')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Paciente', 'Patient')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Fecha / Hora', 'Date / Time')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Tipo', 'Type')}</th>
                <th className="py-2.5 px-3 text-right">pH</th>
                <th className="py-2.5 px-3 text-right">pCO2</th>
                <th className="py-2.5 px-3 text-right">pO2</th>
                <th className="py-2.5 px-3 text-right">HCO3-</th>
                <th className="py-2.5 px-3 text-right">K+</th>
                <th className="py-2.5 px-3">{tr(language, 'Incidencias / Coherencia', 'Incidents / Coherence')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Validación', 'Validation')}</th>
                <th className="py-2.5 px-3 text-right">{tr(language, 'Inspeccionar', 'Inspect')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500">
                    {tr(language, 'Sin resultados que coincidan con los criterios.', 'No results matching the selected criteria.')}
                  </td>
                </tr>
              ) : (
                filtered.map((rec) => {
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                        {rec.sampleNumber}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-[#0066B2]">
                        {rec.patientId}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {new Date(rec.timestamp).toLocaleString(locale)}
                      </td>
                      <td className="py-2 px-3 text-slate-700">{translateSampleType(language, rec.sampleType)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {rec.values.pH?.toFixed(3) ?? tr(language, 'N/D', 'N/A')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {rec.values.pCO2?.toFixed(1) ?? tr(language, 'N/D', 'N/A')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {rec.values.pO2?.toFixed(1) ?? tr(language, 'N/D', 'N/A')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {rec.values.HCO3?.toFixed(1) ?? tr(language, 'N/D', 'N/A')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {rec.values.K?.toFixed(2) ?? tr(language, 'N/D', 'N/A')}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {rec.hasCriticalValues ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {tr(language, `Crítico (${rec.validationIssues.length} inc.)`, `Critical (${rec.validationIssues.length} flags)`)}
                          </span>
                        ) : rec.validationIssues.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {rec.validationIssues.length} {tr(language, 'incoherencia(s)', 'inconsistency(ies)')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            OK
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {translateValidationStatus(language, rec.validationStatus)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setViewingId(rec.id)}
                          className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{tr(language, 'Ver', 'View')}</span>
                        </button>
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
