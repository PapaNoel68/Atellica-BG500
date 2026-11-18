import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  FlaskConical,
  Package,
  RefreshCw,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { localeFor, tr, translateConsumableStatus } from '@/src/i18n/translations';

interface CartridgeStatusViewProps {
  onBack: () => void;
}

interface CartridgeSpec {
  id: string;
  titleEs: string;
  titleEn: string;
  shortDescEs: string;
  shortDescEn: string;
  lifespanDays: number;
  defaultMaxTests: number;
}

const CARTRIDGE_SPECS: readonly CartridgeSpec[] = [
  {
    id: 'CONS-01',
    titleEs: 'Cartucho de Medida',
    titleEn: 'Measurement Cartridge',
    shortDescEs: 'Capacidad 750 muestras · Duración 28 días',
    shortDescEn: 'Capacity 750 samples · 28-day lifespan',
    lifespanDays: 28,
    defaultMaxTests: 750,
  },
  {
    id: 'CONS-02',
    titleEs: 'Cartucho de Lavado / Desechos (Wash)',
    titleEn: 'Wash / Waste Cartridge',
    shortDescEs: 'Duración 9 días desde instalación',
    shortDescEn: '9-day lifespan from installation',
    lifespanDays: 9,
    defaultMaxTests: 500,
  },
  {
    id: 'CONS-03',
    titleEs: 'Cartucho de AQC',
    titleEn: 'AQC Cartridge',
    shortDescEs: 'Niveles 1, 2 y 3 · Duración 28 días',
    shortDescEn: 'Levels 1, 2 & 3 · 28-day lifespan',
    lifespanDays: 28,
    defaultMaxTests: 150,
  },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const CartridgeStatusView: React.FC<CartridgeStatusViewProps> = ({ onBack }) => {
  const { state, language } = useAnalyzer();
  const [now, setNow] = useState(() => new Date());

  const [nextCalMinutes] = useState<number>(() => randomInt(14, 118));
  const [nextAqcMinutes] = useState<number>(() => randomInt(22, 165));

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const loc = localeFor(language);
  const calEtaTime = new Date(now.getTime() + nextCalMinutes * 60000).toLocaleTimeString(loc, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const aqcEtaTime = new Date(now.getTime() + nextAqcMinutes * 60000).toLocaleTimeString(loc, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const calPercent = Math.min(100, Math.max(8, Math.round((nextCalMinutes / 120) * 100)));
  const aqcPercent = Math.min(100, Math.max(8, Math.round((nextAqcMinutes / 180) * 100)));

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5 p-2.5 sm:p-3 overflow-hidden">
      {/* Top Header with Back Button */}
      <div className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#EDF5FC] border border-[#0066B2]/30 text-[#0066B2] flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
              {tr(language, 'Estado de Cartuchos del Analizador', 'Analyzer Cartridge Status')}
            </h2>
            <p className="text-[11px] text-slate-500 truncate">
              {tr(
                language,
                'Medida (28 días · 750 muestras) · Wash (9 días) · AQC (28 días)',
                'Measurement (28 days · 750 samples) · Wash (9 days) · AQC (28 days)'
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="px-3.5 py-1.5 rounded-lg bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{tr(language, 'Volver', 'Back')}</span>
        </button>
      </div>

      {/* 3 Cartridge Cards with Compact Graphical Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 flex-1 min-h-0 overflow-hidden">
        {CARTRIDGE_SPECS.map((spec) => {
          const item = state.consumables.find((c) => c.id === spec.id);
          const maxTests = spec.id === 'CONS-01' ? 750 : item?.maxTests ?? spec.defaultMaxTests;
          const rawLevel = item?.levelPercent ?? 60;
          const remaining =
            item?.remainingTests !== undefined
              ? Math.min(maxTests, Math.max(0, item.remainingTests))
              : Math.round((rawLevel / 100) * maxTests);
          const analyzed = Math.max(0, maxTests - remaining);
          const sampleRemainPct = Math.min(100, Math.max(0, Math.round((remaining / maxTests) * 100)));

          const installedDt = item?.installedAt
            ? new Date(item.installedAt)
            : new Date(now.getTime() - 4 * 24 * 3600 * 1000);
          const expiryDt = new Date(installedDt.getTime() + spec.lifespanDays * 24 * 3600 * 1000);

          const msLeft = expiryDt.getTime() - now.getTime();
          const daysLeft = Math.max(
            0,
            Math.min(spec.lifespanDays, Math.ceil(msLeft / (24 * 3600 * 1000)))
          );
          const daysRemainPct = Math.min(
            100,
            Math.max(0, Math.round((daysLeft / spec.lifespanDays) * 100))
          );

          const formattedInstall = installedDt.toLocaleString(loc, {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
          const formattedExpiry = expiryDt.toLocaleString(loc, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          const status = item?.status ?? 'OK';
          const isLow = status === 'BAJO' || sampleRemainPct <= 25 || daysLeft <= 3;
          const isEmpty = status === 'AGOTADO' || status === 'CADUCADO' || remaining <= 0 || daysLeft <= 0;

          const tankFillH = Math.max(2, Math.round((sampleRemainPct / 100) * 32));
          const tankFillColor = isEmpty ? '#EF4444' : isLow ? '#F59E0B' : '#10B981';

          return (
            <div
              key={spec.id}
              className={`rounded-xl border-2 p-3 flex flex-col justify-between gap-2 bg-white overflow-hidden ${
                isEmpty
                  ? 'border-red-400'
                  : isLow
                    ? 'border-amber-400'
                    : 'border-slate-300'
              }`}
            >
              {/* Card Top: Title + Status Badge + Mini Graphical Cartridge Tank */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-display font-bold text-sm text-slate-900 leading-tight">
                      {tr(language, spec.titleEs, spec.titleEn)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold shrink-0 ${
                        isEmpty
                          ? 'bg-red-100 border-red-400 text-red-900'
                          : isLow
                            ? 'bg-amber-100 border-amber-400 text-amber-900'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      }`}
                    >
                      {translateConsumableStatus(language, status)}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 mt-0.5 truncate">
                    {tr(language, 'Lote:', 'Lot:')} {item?.lotNumber ?? tr(language, 'N/D', 'N/A')} · {item?.reference ?? spec.id}
                  </div>
                  <div className="text-[10px] font-medium text-[#0066B2] mt-0.5">
                    {tr(language, spec.shortDescEs, spec.shortDescEn)}
                  </div>
                </div>

                {/* Small Graphical Cartridge Liquid Gauge */}
                <div
                  className="flex flex-col items-center shrink-0"
                  title={`${tr(language, 'Nivel disponible:', 'Available level:')} ${sampleRemainPct}%`}
                >
                  <svg viewBox="0 0 28 42" className="w-6 h-9" aria-hidden="true">
                    <rect x="9" y="1" width="10" height="4" rx="1" fill="#94A3B8" />
                    <rect
                      x="3"
                      y="5"
                      width="22"
                      height="35"
                      rx="3"
                      fill="#F1F5F9"
                      stroke="#64748B"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="4.5"
                      y={38.5 - tankFillH}
                      width="19"
                      height={tankFillH}
                      rx="1.5"
                      fill={tankFillColor}
                    />
                    <line x1="5" y1="14" x2="10" y2="14" stroke="#475569" strokeWidth="1" opacity="0.55" />
                    <line x1="5" y1="22" x2="11" y2="22" stroke="#475569" strokeWidth="1" opacity="0.55" />
                    <line x1="5" y1="30" x2="10" y2="30" stroke="#475569" strokeWidth="1" opacity="0.55" />
                  </svg>
                  <span className="font-mono font-bold text-[10px] text-slate-800 leading-none mt-0.5">
                    {sampleRemainPct}%
                  </span>
                </div>
              </div>

              {/* Compact Graphical Consumption Bars */}
              <div className="space-y-2 shrink-0">
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-2.5 py-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="font-semibold text-slate-700">
                      {tr(language, 'Consumo muestras', 'Sample usage')}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {remaining} / {maxTests}
                    </span>
                  </div>
                  <svg viewBox="0 0 200 10" className="w-full h-2.5 rounded-full overflow-hidden" aria-hidden="true">
                    <rect x="0" y="0" width="200" height="10" rx="5" fill="#E2E8F0" />
                    <rect
                      x="0"
                      y="0"
                      width={Math.round((sampleRemainPct / 100) * 200)}
                      height="10"
                      rx="5"
                      fill={tankFillColor}
                    />
                  </svg>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-600">
                    <span>
                      {tr(language, 'Analizadas:', 'Analyzed:')}{' '}
                      <strong className="text-slate-900">{analyzed}</strong>
                    </span>
                    <span>
                      {tr(language, 'Restantes:', 'Remaining:')}{' '}
                      <strong className="text-emerald-700">{remaining}</strong>
                    </span>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-2.5 py-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="font-semibold text-slate-700">
                      {tr(language, `Vida útil (${spec.lifespanDays} días)`, `On-board stability (${spec.lifespanDays} days)`)}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        daysLeft <= 4 ? 'text-amber-700' : 'text-[#0066B2]'
                      }`}
                    >
                      {daysLeft} / {spec.lifespanDays} {tr(language, 'días rest.', 'days left')}
                    </span>
                  </div>
                  <svg viewBox="0 0 200 8" className="w-full h-2 rounded-full overflow-hidden" aria-hidden="true">
                    <rect x="0" y="0" width="200" height="8" rx="4" fill="#E2E8F0" />
                    <rect
                      x="0"
                      y="0"
                      width={Math.round((daysRemainPct / 100) * 200)}
                      height="8"
                      rx="4"
                      fill={daysLeft <= 2 ? '#EF4444' : daysLeft <= 5 ? '#F59E0B' : '#0066B2'}
                    />
                  </svg>
                </div>
              </div>

              {/* Compact Dates Footer */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px] shrink-0">
                <div className="bg-[#F6F8FA] border border-slate-200 rounded px-2 py-1">
                  <div className="text-slate-500">{tr(language, 'Instalación', 'Installed')}</div>
                  <div className="font-mono font-bold text-slate-800 truncate">{formattedInstall}</div>
                </div>
                <div className="bg-[#F6F8FA] border border-slate-200 rounded px-2 py-1">
                  <div className="text-slate-500">{tr(language, 'Fecha caducidad', 'Expiration')}</div>
                  <div className="font-mono font-bold text-slate-900 truncate">{formattedExpiry}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Box: Time to Next Calibration & Time to Next Scheduled AQC */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shrink-0 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <CalendarClock className="w-4 h-4 text-[#0066B2]" />
            <span>
              {tr(language, 'Próximos Procesos Programados del Analizador', 'Upcoming Scheduled Analyzer Processes')}
            </span>
          </div>
          <span className="text-[10.5px] font-mono text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{tr(language, 'Cuenta estimada en minutos', 'Estimated countdown in minutes')}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-sky-200 bg-[#EDF5FC] px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white border border-sky-300 text-[#0066B2] flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {tr(language, 'Tiempo para la próxima calibración', 'Time to next calibration')}
                </div>
                <div className="text-[10.5px] text-slate-600">
                  {tr(language, 'Calibración automática · Hora est.', 'Automatic calibration · Est. time')} {calEtaTime}
                </div>
                <svg viewBox="0 0 144 6" className="w-36 max-w-full h-1.5 rounded-full overflow-hidden mt-1" aria-hidden="true">
                  <rect x="0" y="0" width="144" height="6" rx="3" fill="#BAE6FD" />
                  <rect x="0" y="0" width={Math.round((calPercent / 100) * 144)} height="6" rx="3" fill="#0066B2" />
                </svg>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono font-extrabold text-xl text-[#0066B2] leading-none">
                {nextCalMinutes} min
              </div>
              <div className="text-[9.5px] font-mono text-slate-500 mt-0.5">
                {tr(language, 'restantes', 'remaining')}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-orange-200 bg-[#FFF5ED] px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white border border-orange-300 text-[#E8630A] flex items-center justify-center shrink-0">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {tr(language, 'Tiempo para el próximo AQC programado', 'Time to next scheduled AQC')}
                </div>
                <div className="text-[10.5px] text-slate-600">
                  {tr(language, 'Control automático AutoQC · Hora est.', 'Automatic AutoQC · Est. time')} {aqcEtaTime}
                </div>
                <svg viewBox="0 0 144 6" className="w-36 max-w-full h-1.5 rounded-full overflow-hidden mt-1" aria-hidden="true">
                  <rect x="0" y="0" width="144" height="6" rx="3" fill="#FED7AA" />
                  <rect x="0" y="0" width={Math.round((aqcPercent / 100) * 144)} height="6" rx="3" fill="#E8630A" />
                </svg>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono font-extrabold text-xl text-[#E8630A] leading-none">
                {nextAqcMinutes} min
              </div>
              <div className="text-[9.5px] font-mono text-slate-500 mt-0.5">
                {tr(language, 'restantes', 'remaining')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
