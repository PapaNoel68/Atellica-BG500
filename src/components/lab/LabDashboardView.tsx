import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  MessageSquareWarning,
  Package,
  RefreshCw,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import {
  localeFor,
  tr,
  translateAnalyzerStatus,
  translateCalibrationStatus,
  translateCalibrationType,
  translateClinicalText,
  translateConsumableStatus,
  translateSampleType,
  translateSeverity,
  translateValidationStatus,
} from '@/src/i18n/translations';

export type LabSection =
  | 'DASHBOARD'
  | 'MEASURE'
  | 'CARTRIDGE_STATUS'
  | 'UNIDENTIFIED'
  | 'QC'
  | 'CALIBRATIONS'
  | 'CONSUMABLES'
  | 'MAINTENANCE'
  | 'RESULTS'
  | 'INDICATORS'
  | 'CONFIG'
  | 'AUDIT'
  | 'ATELLICA'
  | 'ADMIN'
  | 'DEMO_CENTER';

interface LabDashboardViewProps {
  onNavigate: (section: LabSection) => void;
}

export const LabDashboardView: React.FC<LabDashboardViewProps> = ({ onNavigate }) => {
  const {
    state,
    qcOverallStatus,
    pendingMessagesCount,
    activeErrorsCount,
    unackCriticalCount,
    language,
  } = useAnalyzer();
  const locale = localeFor(language);

  const lastCal = state.calibrations[0];
  const lowConsumables = state.consumables.filter((c) => c.status !== 'OK');
  const pendingValidation = state.records.filter(
    (r) => r.validationStatus === 'PENDIENTE' || r.validationStatus === 'EN_REVISION'
  ).length;
  const openQC = state.qcNonConformities.filter((nc) => nc.status !== 'RESUELTA').length;

  const availabilityPct =
    state.analyzerStatus === 'OPERATIVO'
      ? '99.4%'
      : state.analyzerStatus === 'OPERATIVO_CON_ADVERTENCIAS'
        ? '96.8%'
        : '0.0%';

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-display font-bold text-base text-slate-900">
            {tr(language, 'Consola de Supervisión de Laboratorio y POCT', 'Laboratory & POCT Supervision Console')}
          </h2>
          <p className="text-[11px] text-slate-500">
            {tr(
              language,
              'Visión consolidada de disponibilidad, control de calidad, calibraciones, consumibles y trazabilidad',
              'Consolidated view of uptime, quality control, calibrations, consumables, and traceability'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('DEMO_CENTER')}
          className="px-3.5 py-1.5 rounded-lg bg-[#0066B2] hover:bg-[#005291] text-white text-xs font-semibold"
        >
          {tr(language, 'Abrir Centro de Simulación', 'Open Simulation Center')}
        </button>
      </div>

      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => onNavigate('MAINTENANCE')}
          className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-2.5"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{tr(language, 'Estado y Disponibilidad', 'Status & Availability')}</span>
            <Activity className="w-3.5 h-3.5 text-[#0066B2]" />
          </div>
          <div className="font-mono font-bold text-xl text-slate-900 mt-0.5 tabular-nums">
            {availabilityPct}
          </div>
          <div className="text-[11px] font-semibold text-slate-700">
            {translateAnalyzerStatus(language, state.analyzerStatus)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('RESULTS')}
          className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-2.5"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{tr(language, 'Determinaciones', 'Measurements')}</span>
            <FlaskConical className="w-3.5 h-3.5 text-[#0066B2]" />
          </div>
          <div className="font-mono font-bold text-xl text-slate-900 mt-0.5 tabular-nums">
            {state.records.length}
          </div>
          <div className="text-[11px] text-slate-600">
            {tr(
              language,
              `${pendingValidation} pendientes/revisión · ${unackCriticalCount} críticas s/c`,
              `${pendingValidation} pending/review · ${unackCriticalCount} unack critical`
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('QC')}
          className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-2.5"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{tr(language, 'Control de Calidad (CCI)', 'Quality Control (IQC)')}</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div
            className={`font-display font-bold text-lg mt-0.5 ${
              qcOverallStatus === 'CONFORME'
                ? 'text-emerald-700'
                : qcOverallStatus === 'ADVERTENCIA'
                  ? 'text-amber-700'
                  : 'text-red-700'
            }`}
          >
            {translateClinicalText(language, qcOverallStatus)}
          </div>
          <div className="text-[11px] text-slate-600">
            {tr(
              language,
              `${state.qcRuns.length} controles · ${openQC} no conformidades`,
              `${state.qcRuns.length} controls · ${openQC} non-conformities`
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('ATELLICA')}
          className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-2.5"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Atellica Connect</span>
            <MessageSquareWarning className="w-3.5 h-3.5 text-[#0066B2]" />
          </div>
          <div className="font-mono font-bold text-xl text-slate-900 mt-0.5 tabular-nums">
            {pendingMessagesCount}
          </div>
          <div className="text-[11px] text-slate-600">
            {tr(
              language,
              `Mensajes pendientes · ${state.atellicaInbox.length} recibidos`,
              `Pending messages · ${state.atellicaInbox.length} received`
            )}
          </div>
        </button>
      </div>

      {/* Middle Row: Calibrations, Consumables, Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0">
        {/* Calibrations Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#0066B2]" />
                <span>{tr(language, 'Calibraciones', 'Calibrations')}</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('CALIBRATIONS')}
                className="text-xs font-semibold text-[#0066B2] hover:underline"
              >
                {tr(language, 'Gestionar', 'Manage')}
              </button>
            </div>
            {lastCal ? (
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {translateCalibrationType(language, lastCal.type)}
                    </span>
                    <span
                      className={`font-bold ${
                        lastCal.status === 'CORRECTA'
                          ? 'text-emerald-700'
                          : lastCal.status === 'FALLIDA'
                            ? 'text-red-700'
                            : 'text-amber-700'
                      }`}
                    >
                      {translateCalibrationStatus(language, lastCal.status)}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 mt-1">
                    {new Date(lastCal.timestamp).toLocaleString(locale)}
                  </div>
                  <p className="text-slate-600 mt-1.5">{translateClinicalText(language, lastCal.details)}</p>
                </div>
                <div className="text-[11px] text-slate-500">
                  {tr(language, 'Próxima calibración programada:', 'Next scheduled calibration:')}{' '}
                  <span className="font-mono text-slate-700">
                    {new Date(lastCal.nextDueAt).toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Consumables Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#0066B2]" />
                <span>{tr(language, 'Consumibles y Reactivos', 'Consumables & Reagents')}</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('CONSUMABLES')}
                className="text-xs font-semibold text-[#0066B2] hover:underline"
              >
                {tr(language, 'Inventario', 'Inventory')} ({state.consumables.length})
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              {state.consumables.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2">
                  <span className="text-slate-700 truncate">{translateClinicalText(language, c.name)}</span>
                  <span
                    className={`font-mono font-semibold whitespace-nowrap ${
                      c.status === 'OK'
                        ? 'text-emerald-700'
                        : c.status === 'BAJO'
                          ? 'text-amber-700'
                          : 'text-red-700'
                    }`}
                  >
                    {c.levelPercent}% ({translateConsumableStatus(language, c.status)})
                  </span>
                </div>
              ))}
            </div>
          </div>
          {lowConsumables.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-amber-800 font-medium">
              {tr(
                language,
                `${lowConsumables.length} consumible(s) requieren atención o reposición.`,
                `${lowConsumables.length} consumable(s) require attention or replacement.`
              )}
            </div>
          )}
        </div>

        {/* Active Incidents & Alerts */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-600" />
                <span>{tr(language, 'Incidencias y Alertas Activas', 'Active Incidents & Alerts')}</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('MAINTENANCE')}
                className="text-xs font-semibold text-[#0066B2] hover:underline"
              >
                {tr(language, 'Mantenimiento', 'Maintenance')}
              </button>
            </div>

            {activeErrorsCount === 0 && openQC === 0 && unackCriticalCount === 0 ? (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  {tr(
                    language,
                    'Sin incidencias técnicas activas ni bloqueos pendientes.',
                    'No active technical incidents or pending locks.'
                  )}
                </span>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {state.maintenanceErrors
                  .filter((e) => e.status !== 'RESUELTA')
                  .slice(0, 3)
                  .map((err) => (
                    <div
                      key={err.id}
                      className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-900"
                    >
                      <div className="font-mono font-bold">
                        {err.code} · {translateSeverity(language, err.severity)}
                      </div>
                      <div className="line-clamp-2 mt-0.5">{translateClinicalText(language, err.description)}</div>
                    </div>
                  ))}
                {openQC > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                    {tr(
                      language,
                      `${openQC} no conformidad(es) de Control de Calidad abiertas.`,
                      `${openQC} open Quality Control non-conformity(ies).`
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Latest Determinations Table */}
      <div className="bg-white border border-slate-200 rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <h3 className="font-display font-bold text-xs text-slate-900">
            {tr(language, 'Últimos Resultados Registrados', 'Latest Recorded Results')}
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('RESULTS')}
            className="text-xs font-semibold text-[#0066B2] hover:underline"
          >
            {tr(language, 'Ver gestión completa', 'View full management')}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">{tr(language, 'Muestra', 'Sample')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Paciente', 'Patient')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Fecha / Hora', 'Date / Time')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Tipo', 'Type')}</th>
                <th className="py-2.5 px-3 text-right">pH</th>
                <th className="py-2.5 px-3 text-right">pCO2</th>
                <th className="py-2.5 px-3 text-right">pO2</th>
                <th className="py-2.5 px-3 text-right">K+</th>
                <th className="py-2.5 px-3 text-right">Lac</th>
                <th className="py-2.5 px-4">{tr(language, 'Coherencia / Alertas', 'Coherence / Alerts')}</th>
                <th className="py-2.5 px-4">{tr(language, 'Validación', 'Validation')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.records.slice(0, 7).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                    {r.sampleNumber}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-[#0066B2]">
                    {r.patientId}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {new Date(r.timestamp).toLocaleString(locale)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{translateSampleType(language, r.sampleType)}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                    {r.values.pH?.toFixed(3) ?? tr(language, 'N/D', 'N/A')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {r.values.pCO2?.toFixed(1) ?? tr(language, 'N/D', 'N/A')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {r.values.pO2?.toFixed(1) ?? tr(language, 'N/D', 'N/A')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {r.values.K?.toFixed(2) ?? tr(language, 'N/D', 'N/A')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {r.values.Lac?.toFixed(2) ?? tr(language, 'N/D', 'N/A')}
                  </td>
                  <td className="py-2.5 px-4">
                    {r.hasCriticalValues ? (
                      <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {tr(language, 'Crítico', 'Critical')}
                      </span>
                    ) : r.validationIssues.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {r.validationIssues.length} {tr(language, 'obs.', 'flags')}
                      </span>
                    ) : (
                      <span className="text-emerald-700">{tr(language, 'Conforme', 'Compliant')}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-700">
                    {translateValidationStatus(language, r.validationStatus)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
