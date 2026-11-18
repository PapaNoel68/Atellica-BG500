import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PauseCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { CalibrationRecord, CalibrationStatus } from '@/src/types/analyzer';
import {
  localeFor,
  tr,
  translateCalibrationStatus,
  translateCalibrationType,
  translateClinicalText,
} from '@/src/i18n/translations';

const CAL_TYPES: CalibrationRecord['type'][] = [
  'Calibración 1-Punto',
  'Calibración 2-Puntos',
  'Calibración Cooximetría',
  'Calibración Completa',
];

export const LabCalibrationsView: React.FC = () => {
  const { state, can, triggerCalibration, language } = useAnalyzer();
  const locale = localeFor(language);
  const [selectedType, setSelectedType] = useState<CalibrationRecord['type']>('Calibración 2-Puntos');
  const [reason, setReason] = useState('');

  const lastCal = state.calibrations[0];

  const runSimulated = (outcome: CalibrationStatus) => {
    const defaultReason = tr(
      language,
      'Verificación técnica solicitada por Laboratorio',
      'Technical verification requested by Laboratory'
    );
    triggerCalibration(selectedType, outcome, reason.trim() || defaultReason);
  };

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0 overflow-hidden">
      {/* Calibration Execution Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-base text-slate-900">
              {tr(language, 'Gestión y Simulación de Calibraciones', 'Calibration Management & Simulation')}
            </h2>
            <p className="text-[11px] text-slate-500">
              {tr(
                language,
                'Ejecute calibraciones simuladas; una calibración fallida genera una incidencia y sitúa el equipo en NO DISPONIBLE.',
                'Run simulated calibrations; a failed calibration creates an incident and sets the analyzer to UNAVAILABLE.'
              )}
            </p>
          </div>
          {lastCal && (
            <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              {tr(language, 'Próxima calibración programada:', 'Next scheduled calibration:')}{' '}
              <span className="font-mono font-bold text-slate-900">
                {new Date(lastCal.nextDueAt).toLocaleString(locale)}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
              {tr(language, 'Tipo de calibración', 'Calibration type')}
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as CalibrationRecord['type'])}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
            >
              {CAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {translateCalibrationType(language, t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
              {tr(language, 'Motivo / Observación', 'Reason / Note')}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={tr(
                language,
                'Verificación técnica solicitada por Laboratorio',
                'Technical verification requested by Laboratory'
              )}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!can('MANAGE_CALIBRATIONS')}
            onClick={() => runSimulated('CORRECTA')}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{tr(language, 'Simular Calibración Correcta', 'Simulate Passed Calibration')}</span>
          </button>
          <button
            type="button"
            disabled={!can('MANAGE_CALIBRATIONS')}
            onClick={() => runSimulated('FALLIDA')}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{tr(language, 'Simular Calibración Fallida', 'Simulate Failed Calibration')}</span>
          </button>
          <button
            type="button"
            disabled={!can('MANAGE_CALIBRATIONS')}
            onClick={() => runSimulated('PENDIENTE')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{tr(language, 'Simular Pendiente', 'Simulate Pending')}</span>
          </button>
          <button
            type="button"
            disabled={!can('MANAGE_CALIBRATIONS')}
            onClick={() => runSimulated('INTERRUMPIDA')}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
          >
            <PauseCircle className="w-3.5 h-3.5 text-slate-600" />
            <span>{tr(language, 'Simular Interrumpida', 'Simulate Interrupted')}</span>
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white border border-slate-200 rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2 shrink-0">
          <RefreshCw className="w-4 h-4 text-[#0066B2]" />
          <h3 className="font-display font-bold text-xs text-slate-900">
            {tr(language, 'Histórico de Calibraciones', 'Calibration History')} ({state.calibrations.length})
          </h3>
        </div>
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">ID</th>
                <th className="py-2.5 px-3">{tr(language, 'Tipo', 'Type')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Fecha / Hora', 'Date / Time')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Estado', 'Status')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Operador', 'Operator')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Motivo', 'Reason')}</th>
                <th className="py-2.5 px-4">{tr(language, 'Detalle técnico', 'Technical Detail')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.calibrations.map((cal) => (
                <tr key={cal.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-700">{cal.id}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {translateCalibrationType(language, cal.type)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {new Date(cal.timestamp).toLocaleString(locale)}
                  </td>
                  <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                    {cal.status === 'CORRECTA' && (
                      <span className="text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {translateCalibrationStatus(language, cal.status)}
                      </span>
                    )}
                    {cal.status === 'FALLIDA' && (
                      <span className="text-red-700 inline-flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> {translateCalibrationStatus(language, cal.status)}
                      </span>
                    )}
                    {(cal.status === 'PENDIENTE' || cal.status === 'INTERRUMPIDA') && (
                      <span className="text-amber-700 inline-flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {translateCalibrationStatus(language, cal.status)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{cal.operatorName}</td>
                  <td className="py-2.5 px-3 text-slate-600">{translateClinicalText(language, cal.reason)}</td>
                  <td className="py-2.5 px-4 text-slate-600">{translateClinicalText(language, cal.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
