import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Plus,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { MaintenanceIntervention } from '@/src/types/analyzer';
import {
  localeFor,
  tr,
  translateClinicalText,
  translateMaintenanceStatus,
  translateSeverity,
} from '@/src/i18n/translations';

export const LabMaintenanceView: React.FC = () => {
  const {
    state,
    can,
    resolveMaintenanceError,
    logMaintenanceIntervention,
    runDiagnosticCheck,
    setAnalyzerMaintenanceMode,
    language,
  } = useAnalyzer();
  const locale = localeFor(language);

  const [subTab, setSubTab] = useState<'ERRORS' | 'DIAGNOSTICS' | 'INTERVENTIONS'>('ERRORS');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  // New intervention form
  const [intType, setIntType] = useState<MaintenanceIntervention['type']>('Preventivo');
  const [intComp, setIntComp] = useState('');
  const [intDesc, setIntDesc] = useState('');

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingId || !resolutionNote.trim()) return;
    resolveMaintenanceError(resolvingId, resolutionNote.trim());
    setResolvingId(null);
    setResolutionNote('');
  };

  const handleLogIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intDesc.trim()) return;
    logMaintenanceIntervention({
      type: intType,
      technicianName: tr(language, 'Técnico Responsable', 'Lead Technician'),
      component: intComp.trim() || tr(language, 'Puerto de entrada de muestras', 'Sample entry port'),
      description: intDesc.trim(),
      outcome: 'Completado',
    });
    setIntDesc('');
  };

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0 overflow-hidden">
      {/* Header + Counters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-base text-slate-900">
              {tr(language, 'Mantenimiento, Alarmas y Diagnóstico del Equipo', 'Maintenance, Alarms & Instrument Diagnostics')}
            </h2>
            <p className="text-[11px] text-slate-500">
              {tr(
                language,
                'Gestión de errores, comprobación de subsistemas, mantenimiento preventivo/correctivo y contadores',
                'Error management, subsystem diagnostics, preventive/corrective maintenance, and counters'
              )}
            </p>
          </div>

          {can('MANAGE_MAINTENANCE') && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => runDiagnosticCheck(false)}
                className="px-3 py-1.5 rounded-lg bg-[#0066B2] hover:bg-[#005291] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>{tr(language, 'Ejecutar diagnóstico OK', 'Run OK Diagnostic')}</span>
              </button>
              <button
                type="button"
                onClick={() => runDiagnosticCheck(true)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold"
              >
                {tr(language, 'Simular fallo bomba', 'Simulate Pump Failure')}
              </button>
              <button
                type="button"
                onClick={() =>
                  setAnalyzerMaintenanceMode(state.analyzerStatus !== 'MANTENIMIENTO')
                }
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${
                  state.analyzerStatus === 'MANTENIMIENTO'
                    ? 'bg-sky-900 text-white border-sky-900'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>
                  {state.analyzerStatus === 'MANTENIMIENTO'
                    ? tr(language, 'Salir de Mantenimiento', 'Exit Maintenance Mode')
                    : tr(language, 'Activar Modo Mantenimiento', 'Enable Maintenance Mode')}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Counters Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div className="text-[10.5px] text-slate-500">
              {tr(language, 'Muestras totales equipo', 'Total Analyzer Samples')}
            </div>
            <div className="font-mono font-bold text-base text-slate-900 tabular-nums">
              {state.counters.totalSamples}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div className="text-[10.5px] text-slate-500">
              {tr(language, 'Tests cartucho actual', 'Current Cartridge Tests')}
            </div>
            <div className="font-mono font-bold text-base text-slate-900 tabular-nums">
              {state.counters.cartridgeTests}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div className="text-[10.5px] text-slate-500">
              {tr(language, 'Ciclos de aspiración', 'Aspiration Cycles')}
            </div>
            <div className="font-mono font-bold text-base text-slate-900 tabular-nums">
              {state.counters.aspirations}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div className="text-[10.5px] text-slate-500">
              {tr(language, 'Ciclos de lavado', 'Wash Cycles')}
            </div>
            <div className="font-mono font-bold text-base text-slate-900 tabular-nums">
              {state.counters.washCycles}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit shrink-0">
        {(
          [
            {
              id: 'ERRORS',
              label: tr(
                language,
                `Errores e Incidencias (${
                  state.maintenanceErrors.filter((e) => e.status !== 'RESUELTA').length
                } activas)`,
                `Errors & Incidents (${
                  state.maintenanceErrors.filter((e) => e.status !== 'RESUELTA').length
                } active)`
              ),
            },
            { id: 'DIAGNOSTICS', label: tr(language, 'Diagnóstico de Componentes', 'Component Diagnostics') },
            {
              id: 'INTERVENTIONS',
              label: tr(
                language,
                `Historial de Intervenciones (${state.maintenanceInterventions.length})`,
                `Intervention History (${state.maintenanceInterventions.length})`
              ),
            },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ERRORS & ALARMS */}
      {subTab === 'ERRORS' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
          {state.maintenanceErrors.map((err) => (
            <div
              key={err.id}
              className={`bg-white border rounded-xl p-3.5 space-y-2 ${
                err.status === 'RESUELTA'
                  ? 'border-slate-200'
                  : err.severity === 'Crítica' || err.severity === 'Alta'
                    ? 'border-red-300'
                    : 'border-amber-300'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {err.status === 'RESUELTA' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  ) : err.severity === 'Crítica' || err.severity === 'Alta' ? (
                    <XCircle className="w-4 h-4 text-red-700" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                  )}
                  <span className="font-mono font-bold text-sm text-slate-900">{err.code}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {tr(language, 'Gravedad', 'Severity')} {translateSeverity(language, err.severity)}
                  </span>
                </div>
                <div className="text-xs flex items-center gap-3">
                  <span className="font-mono text-slate-500">
                    {new Date(err.timestamp).toLocaleString(locale)}
                  </span>
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded border ${
                      err.status === 'RESUELTA'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {translateMaintenanceStatus(language, err.status)}
                  </span>
                </div>
              </div>

              <p className="text-sm font-medium text-slate-900">
                {translateClinicalText(language, err.description)}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                <div>
                  <div className="font-semibold text-slate-800 mb-1">
                    {tr(language, 'Posible causa:', 'Possible cause:')}
                  </div>
                  <p className="text-slate-600">{translateClinicalText(language, err.possibleCause)}</p>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 mb-1">
                    {tr(language, 'Comprobaciones recomendadas:', 'Recommended checks:')}
                  </div>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                    {err.recommendedChecks.map((c, idx) => (
                      <li key={idx}>{translateClinicalText(language, c)}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {err.status === 'RESUELTA' ? (
                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  {tr(language, 'Resuelta por', 'Resolved by')} <strong>{err.resolvedBy}</strong>{' '}
                  {tr(language, 'el', 'on')}{' '}
                  <span className="font-mono">
                    {err.resolvedAt ? new Date(err.resolvedAt).toLocaleString(locale) : ''}
                  </span>
                  {err.resolutionNote ? ` · ${tr(language, 'Nota:', 'Note:')} "${err.resolutionNote}"` : ''}
                </div>
              ) : (
                can('MANAGE_MAINTENANCE') && (
                  <div>
                    {resolvingId === err.id ? (
                      <form onSubmit={handleResolve} className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          required
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          placeholder={tr(
                            language,
                            'Describa actuación realizada para resolver la alarma...',
                            'Describe action taken to resolve the alarm...'
                          )}
                          className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-slate-300 text-xs"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          {tr(language, 'Confirmar resolución', 'Confirm Resolution')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setResolvingId(null)}
                          className="px-3 py-2 text-xs text-slate-600"
                        >
                          {tr(language, 'Cancelar', 'Cancel')}
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setResolvingId(err.id)}
                        className="px-4 py-2 rounded-lg bg-[#0066B2] hover:bg-[#005291] text-white text-xs font-semibold"
                      >
                        {tr(language, 'Resolver incidencia', 'Resolve Incident')}
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* DIAGNOSTICS */}
      {subTab === 'DIAGNOSTICS' && (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 content-start overflow-hidden">
          {state.diagnosticComponents.map((comp) => (
            <div
              key={comp.id}
              className={`bg-white border rounded-xl p-3 space-y-1.5 ${
                comp.status === 'OK'
                  ? 'border-slate-200'
                  : comp.status === 'ADVERTENCIA'
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-red-300 bg-red-50/30'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{translateClinicalText(language, comp.subsystem)}</span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    comp.status === 'OK'
                      ? 'text-emerald-700'
                      : comp.status === 'ADVERTENCIA'
                        ? 'text-amber-700'
                        : 'text-red-700'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  {translateClinicalText(language, comp.status)}
                </span>
              </div>
              <div className="font-display font-bold text-sm text-slate-900">
                {translateClinicalText(language, comp.name)}
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{translateClinicalText(language, comp.metricLabel)}</span>
                <span className="font-mono font-bold text-slate-900">{comp.metricValue}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                {tr(language, 'Verificado:', 'Checked:')} {new Date(comp.lastCheckedAt).toLocaleString(locale)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INTERVENTIONS LOG + FORM */}
      {subTab === 'INTERVENTIONS' && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 overflow-hidden">
            <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#0066B2]" />
              <span>{tr(language, 'Registrar Intervención Técnica', 'Log Technical Intervention')}</span>
            </h3>
            <form onSubmit={handleLogIntervention} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  {tr(language, 'Tipo', 'Type')}
                </label>
                <select
                  value={intType}
                  onChange={(e) => setIntType(e.target.value as MaintenanceIntervention['type'])}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="Preventivo">{tr(language, 'Preventivo', 'Preventive')}</option>
                  <option value="Correctivo">{tr(language, 'Correctivo', 'Corrective')}</option>
                  <option value="Diagnóstico">{tr(language, 'Diagnóstico', 'Diagnostic')}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  {tr(language, 'Componente', 'Component')}
                </label>
                <input
                  type="text"
                  required
                  value={intComp}
                  onChange={(e) => setIntComp(e.target.value)}
                  placeholder={tr(language, 'Puerto de entrada de muestras', 'Sample entry port')}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  {tr(language, 'Descripción de actuación', 'Action description')}
                </label>
                <textarea
                  required
                  rows={3}
                  value={intDesc}
                  onChange={(e) => setIntDesc(e.target.value)}
                  placeholder={tr(
                    language,
                    'Detalle de limpieza, ajuste o sustitución efectuada...',
                    'Details of cleaning, adjustment, or replacement performed...'
                  )}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={!can('MANAGE_MAINTENANCE')}
                className="px-4 py-2 rounded-lg bg-[#0066B2] hover:bg-[#005291] disabled:opacity-50 text-white text-xs font-semibold"
              >
                {tr(language, 'Registrar intervención', 'Log Intervention')}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 shrink-0">
              {tr(language, 'Historial de Mantenimiento', 'Maintenance History')}
            </div>
            <div className="divide-y divide-slate-100 flex-1 min-h-0 overflow-y-auto">
              {state.maintenanceInterventions.map((item) => (
                <div key={item.id} className="p-4 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {translateClinicalText(language, item.type)} · {translateClinicalText(language, item.component)}
                    </span>
                    <span className="font-mono text-slate-500">
                      {new Date(item.timestamp).toLocaleString(locale)}
                    </span>
                  </div>
                  <p className="text-slate-700">{translateClinicalText(language, item.description)}</p>
                  <div className="text-[11px] text-slate-500">
                    {tr(language, 'Técnico:', 'Technician:')} {item.technicianName} ·{' '}
                    {tr(language, 'Resultado:', 'Outcome:')} {translateClinicalText(language, item.outcome)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
