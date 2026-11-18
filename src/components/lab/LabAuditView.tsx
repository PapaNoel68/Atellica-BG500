import React, { useMemo, useState } from 'react';
import { ClipboardList, Lock, Search } from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { AuditModule } from '@/src/types/analyzer';
import {
  localeFor,
  tr,
  translateClinicalText,
  translateRole,
} from '@/src/i18n/translations';

const MODULES: ('ALL' | AuditModule)[] = [
  'ALL',
  'ACCESOS',
  'DETERMINACIONES',
  'CONTROL_CALIDAD',
  'CALIBRACIONES',
  'CONSUMIBLES',
  'MANTENIMIENTO',
  'COMUNICACIONES',
  'CONFIGURACION',
  'USUARIOS',
  'SIMULADOR',
];

function translateAuditModule(lang: 'es' | 'en', mod: 'ALL' | AuditModule): string {
  if (lang === 'es') {
    return mod === 'ALL' ? 'Todos los módulos' : mod;
  }
  const map: Record<'ALL' | AuditModule, string> = {
    ALL: 'All modules',
    ACCESOS: 'ACCESS',
    DETERMINACIONES: 'DETERMINATIONS',
    CONTROL_CALIDAD: 'QUALITY_CONTROL',
    CALIBRACIONES: 'CALIBRATIONS',
    CONSUMIBLES: 'CONSUMABLES',
    MANTENIMIENTO: 'MAINTENANCE',
    COMUNICACIONES: 'COMMUNICATIONS',
    CONFIGURACION: 'CONFIGURATION',
    USUARIOS: 'USERS',
    SIMULADOR: 'SIMULATOR',
  };
  return map[mod] ?? mod;
}

export const LabAuditView: React.FC = () => {
  const { state, language, can } = useAnalyzer();
  const locale = localeFor(language);

  const [userFilter, setUserFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'ALL' | AuditModule>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [actionQuery, setActionQuery] = useState('');

  const filtered = useMemo(() => {
    return state.auditLogs.filter((entry) => {
      if (
        userFilter.trim() &&
        !entry.userName.toLowerCase().includes(userFilter.trim().toLowerCase())
      ) {
        return false;
      }
      if (moduleFilter !== 'ALL' && entry.module !== moduleFilter) return false;
      if (dateFilter && new Date(entry.timestamp).toISOString().slice(0, 10) !== dateFilter) {
        return false;
      }
      if (actionQuery.trim()) {
        const q = actionQuery.trim().toLowerCase();
        const actMatch =
          entry.action.toLowerCase().includes(q) ||
          translateClinicalText(language, entry.action).toLowerCase().includes(q);
        const detMatch =
          entry.details.toLowerCase().includes(q) ||
          translateClinicalText(language, entry.details).toLowerCase().includes(q);
        if (!actMatch && !detMatch) return false;
      }
      return true;
    });
  }, [state.auditLogs, userFilter, moduleFilter, dateFilter, actionQuery, language]);

  if (!can('VIEW_AUDIT')) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-xl mx-auto space-y-3">
        <Lock className="w-8 h-8 text-slate-400 mx-auto" />
        <h3 className="font-display font-bold text-base text-slate-900">
          {tr(language, 'Registro de Auditoría Restringido', 'Restricted Audit Trail')}
        </h3>
        <p className="text-xs text-slate-600">
          {tr(language, 'Solo los perfiles ', 'Only ')}
          <strong>{translateRole(language, 'FACULTATIVO_LAB')}</strong>
          {tr(language, ' y ', ' and ')}
          <strong>{translateRole(language, 'ADMINISTRADOR')}</strong>
          {tr(
            language,
            ' están autorizados para consultar el registro completo de auditoría.',
            ' profiles are authorized to view the full audit trail.'
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0 overflow-hidden">
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#0066B2]" />
              <span>{tr(language, 'Registro Cronológico de Auditoría y Trazabilidad', 'Chronological Audit & Traceability Log')}</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              {tr(
                language,
                'Trazabilidad inmutable de accesos, determinaciones, controles, calibraciones, configuración y comunicaciones',
                'Immutable traceability of logins, determinations, QC, calibrations, configuration, and communications'
              )}
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-600">
            {filtered.length} {tr(language, 'eventos', 'events')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">{tr(language, 'Usuario', 'User')}</label>
            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder={tr(language, 'Ej. Elena, Carlos...', 'E.g. Elena, Carlos...')}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">{tr(language, 'Módulo', 'Module')}</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value as 'ALL' | AuditModule)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
            >
              {MODULES.map((m) => (
                <option key={m} value={m}>
                  {translateAuditModule(language, m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">{tr(language, 'Fecha', 'Date')}</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">{tr(language, 'Acción o detalle', 'Action or detail')}</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={actionQuery}
                onChange={(e) => setActionQuery(e.target.value)}
                placeholder={tr(language, 'Buscar texto...', 'Search text...')}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 z-10">
              <tr>
                <th className="py-2.5 px-4">{tr(language, 'Fecha / Hora', 'Date / Time')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Usuario', 'User')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Perfil', 'Profile')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Módulo', 'Module')}</th>
                <th className="py-2.5 px-3">{tr(language, 'Acción', 'Action')}</th>
                <th className="py-2.5 px-4">{tr(language, 'Detalle', 'Detail')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    {tr(language, 'No existen registros de auditoría para los filtros seleccionados.', 'No audit records found for the selected filters.')}
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString(locale)}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {entry.userName}
                    </td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      {translateRole(language, entry.userRole)}
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-[#0066B2] whitespace-nowrap">
                      {translateAuditModule(language, entry.module)}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {translateClinicalText(language, entry.action)}
                    </td>
                    <td className="py-2 px-4 text-slate-600">
                      {translateClinicalText(language, entry.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
