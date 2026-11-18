import React, { useState } from 'react';
import { Lock, Save, Settings2 } from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { AnalyzerConfig, ParameterKey, WestgardRule } from '@/src/types/analyzer';
import { PARAMETER_ORDER } from '@/src/engines/parameterDefinitions';
import { WESTGARD_RULE_INFO } from '@/src/engines/qcEngine';
import {
  tr,
  translateParameterCategory,
  translateParameterLabel,
  translateParameterShortLabel,
  translateParameterUnit,
  translateRole,
} from '@/src/i18n/translations';

export const LabConfigView: React.FC = () => {
  const { state, language, can, updateAnalyzerConfig } = useAnalyzer();
  const allowed = can('EDIT_ANALYTICAL_CONFIG');

  const [draft, setDraft] = useState<AnalyzerConfig>(() => structuredClone(state.config));
  const [selectedParam, setSelectedParam] = useState<ParameterKey>('pH');

  if (!allowed) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-xl mx-auto space-y-3">
        <Lock className="w-8 h-8 text-slate-400 mx-auto" />
        <h3 className="font-display font-bold text-base text-slate-900">
          {tr(language, 'Configuración Analítica Restringida', 'Restricted Analytical Configuration')}
        </h3>
        <p className="text-xs text-slate-600">
          {tr(language, 'Solo los perfiles ', 'Only ')}
          <strong>{translateRole(language, 'FACULTATIVO_LAB')}</strong>
          {tr(language, ' y ', ' and ')}
          <strong>{translateRole(language, 'ADMINISTRADOR')}</strong>
          {tr(
            language,
            ' tienen permiso para modificar intervalos de referencia, valores críticos, límites delta o reglas de coherencia y QC.',
            ' profiles are authorized to modify reference intervals, critical values, delta limits, or coherence and QC rules.'
          )}
        </p>
      </div>
    );
  }

  const pCfg = draft.parameters[selectedParam];

  const updateParam = (patch: Partial<typeof pCfg>) => {
    setDraft((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [selectedParam]: {
          ...prev.parameters[selectedParam],
          ...patch,
        },
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateAnalyzerConfig(
      draft,
      tr(
        language,
        `Actualización de configuración analítica (parámetro foco: ${pCfg.shortLabel}, reglas coherencia/CCI).`,
        `Analytical configuration update (focus parameter: ${translateParameterShortLabel(language, pCfg.key, pCfg.shortLabel)}, coherence/IQC rules).`
      )
    );
  };

  return (
    <form onSubmit={handleSave} className="h-full flex flex-col gap-2.5 min-h-0 overflow-hidden">
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#0066B2]" />
            <span>{tr(language, 'Configuración Analítica, Reglas de Coherencia y Calidad', 'Analytical Configuration, Coherence & Quality Rules')}</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            {tr(
              language,
              'Todos los cambios se propagan inmediatamente al motor de validación y quedan registrados en Auditoría.',
              'All changes propagate immediately to the validation engine and are logged in the Audit trail.'
            )}
          </p>
        </div>

        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-[#0066B2] hover:bg-[#005291] text-white text-xs font-semibold flex items-center gap-2"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{tr(language, 'Guardar configuración', 'Save configuration')}</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        {/* Parameter Selector */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 shrink-0">
            {tr(language, 'Parámetros Analíticos', 'Analytical Parameters')} ({PARAMETER_ORDER.length})
          </div>
          <div className="divide-y divide-slate-100 flex-1 min-h-0 overflow-y-auto">
            {PARAMETER_ORDER.map((key) => {
              const cfg = draft.parameters[key];
              const active = selectedParam === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedParam(key)}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between ${
                    active ? 'bg-sky-50 font-semibold text-[#0066B2]' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <span>
                    {translateParameterShortLabel(language, cfg.key, cfg.shortLabel)}{' '}
                    <span className="text-[11px] font-normal text-slate-500">({translateParameterUnit(language, cfg.unit)})</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {cfg.visible ? tr(language, 'Visible', 'Visible') : tr(language, 'Oculto', 'Hidden')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Parameter Detail */}
        <div className="lg:col-span-8 flex flex-col gap-2.5 min-h-0 overflow-hidden">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-900">
                  {translateParameterLabel(language, pCfg.key, pCfg.label)} ({translateParameterShortLabel(language, pCfg.key, pCfg.shortLabel)})
                </h3>
                <p className="text-[11px] text-slate-500">
                  {tr(language, 'Categoría:', 'Category:')} {translateParameterCategory(language, pCfg.category)} · {tr(language, 'Origen:', 'Source:')}{' '}
                  {pCfg.kind === 'measured' ? tr(language, 'Medido', 'Measured') : tr(language, 'Calculado', 'Calculated')}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pCfg.visible}
                    onChange={(e) => updateParam({ visible: e.target.checked })}
                    className="w-4 h-4 accent-[#0066B2]"
                  />
                  <span>{tr(language, 'Visible', 'Visible')}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pCfg.enabled}
                    onChange={(e) => updateParam({ enabled: e.target.checked })}
                    className="w-4 h-4 accent-[#0066B2]"
                  />
                  <span>{tr(language, 'Habilitado', 'Enabled')}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{tr(language, 'Ref. Arterial (Mín – Máx)', 'Arterial Ref. (Min – Max)')}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    value={pCfg.refArterial[0]}
                    onChange={(e) =>
                      updateParam({ refArterial: [Number(e.target.value), pCfg.refArterial[1]] })
                    }
                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                  />
                  <input
                    type="number"
                    step="any"
                    value={pCfg.refArterial[1]}
                    onChange={(e) =>
                      updateParam({ refArterial: [pCfg.refArterial[0], Number(e.target.value)] })
                    }
                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{tr(language, 'Ref. Venosa (Mín – Máx)', 'Venous Ref. (Min – Max)')}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    value={pCfg.refVenosa[0]}
                    onChange={(e) =>
                      updateParam({ refVenosa: [Number(e.target.value), pCfg.refVenosa[1]] })
                    }
                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                  />
                  <input
                    type="number"
                    step="any"
                    value={pCfg.refVenosa[1]}
                    onChange={(e) =>
                      updateParam({ refVenosa: [pCfg.refVenosa[0], Number(e.target.value)] })
                    }
                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{tr(language, 'Ref. Capilar (Mín – Máx)', 'Capillary Ref. (Min – Max)')}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    value={pCfg.refCapilar[0]}
                    onChange={(e) =>
                      updateParam({ refCapilar: [Number(e.target.value), pCfg.refCapilar[1]] })
                    }
                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                  />
                  <input
                    type="number"
                    step="any"
                    value={pCfg.refCapilar[1]}
                    onChange={(e) =>
                      updateParam({ refCapilar: [pCfg.refCapilar[0], Number(e.target.value)] })
                    }
                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{tr(language, 'Crítico Bajo', 'Critical Low')}</label>
                <input
                  type="number"
                  step="any"
                  value={pCfg.criticalLow ?? ''}
                  onChange={(e) =>
                    updateParam({
                      criticalLow: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{tr(language, 'Crítico Alto', 'Critical High')}</label>
                <input
                  type="number"
                  step="any"
                  value={pCfg.criticalHigh ?? ''}
                  onChange={(e) =>
                    updateParam({
                      criticalHigh: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{tr(language, 'Límite Delta (±)', 'Delta Limit (±)')}</label>
                <input
                  type="number"
                  step="any"
                  value={pCfg.deltaLimit ?? ''}
                  onChange={(e) =>
                    updateParam({
                      deltaLimit: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{tr(language, 'Unidad informe', 'Report unit')}</label>
                <input
                  type="text"
                  value={pCfg.unit}
                  onChange={(e) => updateParam({ unit: e.target.value })}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Global Coherence & Westgard Settings */}
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs overflow-hidden">
              <h4 className="font-display font-bold text-sm text-slate-900">
                {tr(language, 'Reglas del Motor de Coherencia', 'Coherence Engine Rules')}
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.coherence.enablePhysiologicalChecks}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      coherence: { ...draft.coherence, enablePhysiologicalChecks: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-[#0066B2]"
                />
                <span>{tr(language, 'Activar coherencia fisiológica (Henderson-Hasselbalch, Coox, AG)', 'Enable physiological coherence (Henderson-Hasselbalch, CO-ox, AG)')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.coherence.enableTemporalDeltaChecks}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      coherence: { ...draft.coherence, enableTemporalDeltaChecks: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-[#0066B2]"
                />
                <span>{tr(language, 'Activar comprobación temporal (Delta Check)', 'Enable temporal check (Delta Check)')}</span>
              </label>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{tr(language, 'Δ máx pH H-H', 'Max Δ pH H-H')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draft.coherence.maxPhDiff}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        coherence: { ...draft.coherence, maxPhDiff: Number(e.target.value) },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{tr(language, 'Δ máx HCO3-TCO2', 'Max Δ HCO3-TCO2')}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={draft.coherence.maxHco3Tco2Diff}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        coherence: { ...draft.coherence, maxHco3Tco2Diff: Number(e.target.value) },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs overflow-hidden">
              <h4 className="font-display font-bold text-sm text-slate-900">
                {tr(language, 'Reglas de Control de Calidad (Westgard)', 'Quality Control Rules (Westgard)')}
              </h4>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={draft.qcSettings.blockAnalysisOnQCReject}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      qcSettings: {
                        ...draft.qcSettings,
                        blockAnalysisOnQCReject: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 accent-[#0066B2]"
                />
                <span>{tr(language, 'Bloquear determinaciones si falla regla de rechazo', 'Block determinations if rejection rule fails')}</span>
              </label>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {(Object.keys(WESTGARD_RULE_INFO) as WestgardRule[]).map((rk) => (
                  <label key={rk} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.qcSettings.enabledRules[rk]}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          qcSettings: {
                            ...draft.qcSettings,
                            enabledRules: {
                              ...draft.qcSettings.enabledRules,
                              [rk]: e.target.checked,
                            },
                          },
                        })
                      }
                      className="w-4 h-4 accent-[#0066B2]"
                    />
                    <span className="font-mono font-semibold">{rk}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
