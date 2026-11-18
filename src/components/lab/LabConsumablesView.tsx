import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Package, RefreshCw } from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { ConsumableCategory, ConsumableItem } from '@/src/types/analyzer';
import {
  localeFor,
  tr,
  translateClinicalText,
  translateConsumableCategory,
  translateConsumableStatus,
} from '@/src/i18n/translations';

export const LabConsumablesView: React.FC = () => {
  const { state, can, replaceConsumable, simulateConsumableStatus, language } = useAnalyzer();
  const locale = localeFor(language);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ConsumableCategory>('ALL');
  const [replacingItem, setReplacingItem] = useState<ConsumableItem | null>(null);
  const [newLot, setNewLot] = useState('');
  const [newExpiry, setNewExpiry] = useState('2027-08-31');

  const filtered = state.consumables.filter(
    (c) => categoryFilter === 'ALL' || c.category === categoryFilter
  );

  const startReplace = (item: ConsumableItem) => {
    setReplacingItem(item);
    setNewLot(`${item.lotNumber.split('-')[0]}-${Math.floor(1000 + Math.random() * 8999)}`);
    const lifespanDays =
      item.id === 'CONS-02' ? 9 : item.id === 'CONS-01' || item.id === 'CONS-03' ? 28 : 180;
    setNewExpiry(new Date(Date.now() + lifespanDays * 24 * 3600 * 1000).toISOString().slice(0, 10));
  };

  const confirmReplace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingItem || !newLot.trim()) return;
    replaceConsumable(replacingItem.id, newLot.trim(), newExpiry);
    setReplacingItem(null);
  };

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0 overflow-hidden">
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-display font-bold text-base text-slate-900">
            {tr(language, 'Inventario de Consumibles, Cartuchos y Reactivos', 'Consumables, Cartridges & Reagents Inventory')}
          </h2>
          <p className="text-[11px] text-slate-500">
            {tr(
              language,
              'Control de lotes, caducidades, nivel disponible, consumo estimado y registro de sustituciones',
              'Control of lots, expiry dates, available level, estimated usage, and replacement logging'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['ALL', 'Cartucho', 'Reactivo', 'Solución', 'Sensor', 'Control', 'Otro'] as const).map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'ALL' ? tr(language, 'Todos', 'All') : translateConsumableCategory(language, cat)}
              </button>
            )
          )}
        </div>
      </div>

      {replacingItem && (
        <form
          onSubmit={confirmReplace}
          className="bg-sky-50 border border-sky-300 rounded-xl p-3 space-y-2.5 shrink-0"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-xs text-slate-900">
              {tr(language, 'Registrar Sustitución:', 'Log Replacement:')} {translateClinicalText(language, replacingItem.name)} ({replacingItem.reference})
            </h3>
            <button
              type="button"
              onClick={() => setReplacingItem(null)}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              {tr(language, 'Cancelar', 'Cancel')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                {tr(language, 'Nuevo lote', 'New lot')}
              </label>
              <input
                type="text"
                required
                value={newLot}
                onChange={(e) => setNewLot(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                {tr(language, 'Nueva caducidad', 'New expiry date')}
              </label>
              <input
                type="date"
                required
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-[#0066B2] hover:bg-[#005291] text-white text-xs font-semibold"
            >
              {tr(language, 'Confirmar instalación (100%)', 'Confirm Installation (100%)')}
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
        {filtered.map((c) => {
          const daysLeft = Math.ceil(
            (new Date(c.expiryDate).getTime() - Date.now()) / (24 * 3600 * 1000)
          );
          return (
            <div
              key={c.id}
              className={`bg-white border rounded-xl p-4 space-y-2.5 ${
                c.status === 'AGOTADO' || c.status === 'CADUCADO'
                  ? 'border-red-300'
                  : c.status === 'BAJO'
                    ? 'border-amber-300'
                    : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-[#0066B2]" />
                    <span>{translateConsumableCategory(language, c.category)}</span>
                    <span>·</span>
                    <span className="font-mono">{c.reference}</span>
                  </div>
                  <h3 className="font-display font-bold text-sm text-slate-900 mt-1">
                    {translateClinicalText(language, c.name)}
                  </h3>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded border whitespace-nowrap ${
                    c.status === 'OK'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : c.status === 'BAJO'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {translateConsumableStatus(language, c.status)}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    {tr(language, 'Disponibilidad:', 'Availability:')}{' '}
                    <strong className="font-mono text-slate-900">{c.levelPercent}%</strong>
                    {c.remainingTests !== undefined && (
                      <span className="font-mono text-slate-500 ml-1.5">
                        ({c.remainingTests} / {c.maxTests} tests)
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {tr(language, 'Consumo:', 'Usage:')} ~{c.estimatedConsumptionPerDay}/{tr(language, 'día', 'day')}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      c.status === 'OK'
                        ? 'bg-emerald-600'
                        : c.status === 'BAJO'
                          ? 'bg-amber-500'
                          : 'bg-red-600'
                    }`}
                    style={{ width: `${c.levelPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <div>
                  <span className="text-slate-500 block">{tr(language, 'Lote', 'Lot')}</span>
                  <span className="font-mono font-semibold text-slate-900">{c.lotNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{tr(language, 'Caducidad', 'Expiry')}</span>
                  <span
                    className={`font-mono font-semibold ${
                      daysLeft <= 15 ? 'text-amber-700' : 'text-slate-900'
                    }`}
                  >
                    {c.expiryDate} ({daysLeft}d)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{tr(language, 'Instalado', 'Installed')}</span>
                  <span className="font-mono text-slate-700">
                    {new Date(c.installedAt).toLocaleDateString(locale)}
                  </span>
                </div>
              </div>

              {can('MANAGE_CONSUMABLES') && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => simulateConsumableStatus(c.id, 15, 'BAJO')}
                      className="px-2.5 py-1 rounded border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-medium"
                    >
                      {tr(language, 'Simular bajo (15%)', 'Simulate low (15%)')}
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateConsumableStatus(c.id, 0, 'AGOTADO')}
                      className="px-2.5 py-1 rounded border border-red-300 bg-red-50 text-red-900 text-[11px] font-medium"
                    >
                      {tr(language, 'Simular agotado', 'Simulate depleted')}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => startReplace(c)}
                    className="px-3 py-1.5 rounded-lg bg-[#0066B2] hover:bg-[#005291] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{tr(language, 'Sustituir', 'Replace')}</span>
                  </button>
                </div>
              )}

              {daysLeft <= 15 && c.status === 'OK' && (
                <div className="text-[11px] text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {tr(language, `Próximo a caducidad (${daysLeft} días).`, `Expiring soon (${daysLeft} days).`)}
                  </span>
                </div>
              )}
              {c.status === 'OK' && daysLeft > 15 && (
                <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {tr(language, 'Estado óptimo para operación analítica.', 'Optimal status for analytical operation.')}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
