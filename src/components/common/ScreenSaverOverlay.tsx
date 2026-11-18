import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightCircle,
  Droplets,
  MonitorCheck,
  Play,
  RefreshCw,
  Syringe,
  UserCheck,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { localeFor, tr } from '@/src/i18n/translations';

interface StepGraphicProps {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  language: 'es' | 'en';
}

const AnimatedStepIllustration: React.FC<StepGraphicProps> = ({ step, language }) => {
  switch (step) {
    case 1:
      return (
        <svg viewBox="0 0 220 96" className="w-full h-24" aria-hidden="true">
          {/* Syringe barrel */}
          <rect x="34" y="24" width="72" height="24" rx="3" fill="#FFFFFF" stroke="#475569" strokeWidth="2" />
          {/* Animated blood column filling */}
          <rect x="36" y="27" width="32" height="18" rx="1.5" fill="#DC2626" className="ss-anim-blood" />
          {/* Needle */}
          <polygon points="34,33 16,36 34,39" fill="#94A3B8" stroke="#475569" strokeWidth="1.2" />
          <line x1="16" y1="36" x2="6" y2="36" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          {/* Animated plunger sliding */}
          <g className="ss-anim-plunger">
            <rect x="68" y="27" width="5" height="18" fill="#334155" />
            <line x1="73" y1="36" x2="108" y2="36" stroke="#475569" strokeWidth="4" />
            <line x1="108" y1="26" x2="108" y2="46" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
          </g>
          {/* Capillary tube below */}
          <rect x="44" y="64" width="128" height="11" rx="4" fill="#E2E8F0" stroke="#475569" strokeWidth="1.8" />
          <rect x="47" y="66.5" width="76" height="6" rx="2" fill="#DC2626" className="ss-anim-blood" />
          <text x="150" y="39" fontSize="10" fontWeight="700" fill="#CBD5E1">
            {tr(language, 'Jeringa', 'Syringe')}
          </text>
          <text x="180" y="73" fontSize="10" fontWeight="700" fill="#CBD5E1">
            {tr(language, 'Capilar', 'Capillary')}
          </text>
        </svg>
      );

    case 2:
      return (
        <svg viewBox="0 0 220 96" className="w-full h-24" aria-hidden="true">
          {/* Circular agitation motion arrows */}
          <path
            d="M 52 24 A 36 36 0 0 1 164 24"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeDasharray="5 4"
          />
          <polygon points="164,24 156,18 159,28" fill="#38BDF8" />
          <path
            d="M 168 72 A 36 36 0 0 1 56 72"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeDasharray="5 4"
          />
          <polygon points="56,72 64,78 61,68" fill="#38BDF8" />
          {/* Rocking syringe */}
          <g className="ss-anim-rock">
            <rect x="74" y="38" width="66" height="20" rx="3" fill="#FFFFFF" stroke="#334155" strokeWidth="2" />
            <rect x="76" y="40.5" width="46" height="15" rx="1.5" fill="#DC2626" />
            <circle cx="90" cy="46" r="2.2" fill="#FCA5A5" />
            <circle cx="106" cy="50" r="2" fill="#FCA5A5" />
            <polygon points="74,45 58,48 74,51" fill="#94A3B8" stroke="#334155" strokeWidth="1.2" />
            <line x1="140" y1="48" x2="160" y2="48" stroke="#475569" strokeWidth="3.5" />
            <line x1="160" y1="39" x2="160" y2="57" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        </svg>
      );

    case 3:
      return (
        <svg viewBox="0 0 220 96" className="w-full h-24" aria-hidden="true">
          {/* Angled syringe tip at top-left */}
          <g transform="rotate(24 55 24)">
            <rect x="26" y="14" width="56" height="18" rx="2.5" fill="#FFFFFF" stroke="#475569" strokeWidth="1.8" />
            <rect x="28" y="16.5" width="42" height="13" fill="#DC2626" />
            <polygon points="82,20 100,23 82,26" fill="#CBD5E1" stroke="#475569" strokeWidth="1.2" />
          </g>
          {/* Animated falling drop 1 & drop 2 */}
          <path
            d="M 104 38 C 98 46, 98 53, 104 53 C 110 53, 110 46, 104 38 Z"
            fill="#EF4444"
            className="ss-anim-drop-1"
          />
          <path
            d="M 116 38 C 110 46, 110 53, 116 53 C 122 53, 122 46, 116 38 Z"
            fill="#DC2626"
            className="ss-anim-drop-2"
          />
          {/* Gauze / discard pad */}
          <rect x="74" y="70" width="90" height="18" rx="4" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.8" />
          <line x1="84" y1="75" x2="154" y2="75" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 3" />
          <circle cx="110" cy="79" r="5" fill="#DC2626" opacity="0.75" />
          <text x="172" y="82" fontSize="10" fontWeight="700" fill="#FCA5A5">
            ×2
          </text>
        </svg>
      );

    case 4:
      return (
        <svg viewBox="0 0 220 96" className="w-full h-24" aria-hidden="true">
          {/* Analyzer chassis & port on left */}
          <rect x="14" y="16" width="64" height="64" rx="6" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
          <rect x="64" y="39" width="16" height="18" rx="2" fill="#CBD5E1" stroke="#475569" strokeWidth="1.5" />
          <polygon points="80,35 98,41 98,55 80,61" fill="#E8630A" stroke="#FDBA74" strokeWidth="1.5" />
          {/* Moving syringe inserting into port */}
          <g className="ss-anim-insert">
            <polygon points="100,45 118,41 118,55 100,51" fill="#CBD5E1" stroke="#334155" strokeWidth="1.2" />
            <rect x="118" y="37" width="62" height="22" rx="2.5" fill="#FFFFFF" stroke="#334155" strokeWidth="1.8" />
            <rect x="120" y="39.5" width="44" height="17" fill="#DC2626" />
            <line x1="180" y1="48" x2="202" y2="48" stroke="#94A3B8" strokeWidth="3.5" />
            <line x1="202" y1="38" x2="202" y2="58" stroke="#CBD5E1" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 134 25 L 106 25" stroke="#FBBF24" strokeWidth="2.8" strokeLinecap="round" />
            <polygon points="103,25 111,20 111,30" fill="#FBBF24" />
          </g>
        </svg>
      );

    case 5:
      return (
        <svg viewBox="0 0 220 96" className="w-full h-24" aria-hidden="true">
          {/* Miniature touchscreen */}
          <rect x="30" y="14" width="160" height="68" rx="8" fill="#0F172A" stroke="#64748B" strokeWidth="2" />
          {/* Animated Analyze button */}
          <g className="ss-anim-press">
            <rect x="58" y="31" width="104" height="34" rx="6" fill="#E8630A" stroke="#FDBA74" strokeWidth="1.5" />
            <polygon points="75,41 75,55 87,48" fill="#FFFFFF" />
            <text x="95" y="52" fontSize="12" fontWeight="800" fill="#FFFFFF">
              {tr(language, 'ANALIZAR', 'ANALYZE')}
            </text>
          </g>
          {/* Expanding tap ripple */}
          <circle
            cx="148"
            cy="52"
            r="12"
            fill="none"
            stroke="#FDE047"
            strokeWidth="2.5"
            className="ss-anim-ripple"
          />
          <circle cx="148" cy="52" r="4" fill="#FEF08A" />
        </svg>
      );

    case 6:
      return (
        <svg viewBox="0 0 220 96" className="w-full h-24" aria-hidden="true">
          {/* Patient form card */}
          <rect x="28" y="12" width="164" height="72" rx="7" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
          <rect x="28" y="12" width="164" height="16" rx="7" fill="#0066B2" />
          <text x="38" y="23.5" fontSize="9.5" fontWeight="700" fill="#FFFFFF">
            {tr(language, 'DATOS DEL PACIENTE', 'PATIENT RECORD')}
          </text>
          {/* Barcode icon on left */}
          <g transform="translate(38, 36)">
            <rect x="0" y="0" width="3" height="28" fill="#0F172A" />
            <rect x="5" y="0" width="1.5" height="28" fill="#0F172A" />
            <rect x="9" y="0" width="4" height="28" fill="#0F172A" />
            <rect x="15" y="0" width="2" height="28" fill="#0F172A" />
            <rect x="19" y="0" width="3.5" height="28" fill="#0F172A" />
            <rect x="25" y="0" width="1.5" height="28" fill="#0F172A" />
            {/* Animated red scanner laser */}
            <line x1="-3" y1="14" x2="30" y2="14" stroke="#EF4444" strokeWidth="2.5" className="ss-anim-scan" />
          </g>
          {/* Animated form lines filling in */}
          <rect x="80" y="37" width="84" height="7" rx="2" fill="#0284C7" className="ss-anim-line" />
          <rect x="80" y="50" width="96" height="7" rx="2" fill="#64748B" className="ss-anim-line" />
          <rect x="80" y="63" width="68" height="7" rx="2" fill="#16A34A" className="ss-anim-line" />
          {/* Checkmark badge */}
          <circle cx="174" cy="66" r="9" fill="#16A34A" />
          <polyline points="169,66 173,70 180,62" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
};

export const ScreenSaverOverlay: React.FC = () => {
  const { screensaverOpen, setScreensaverOpen, language, state } = useAnalyzer();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!screensaverOpen) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [screensaverOpen]);

  if (!screensaverOpen) return null;

  const steps: {
    num: 1 | 2 | 3 | 4 | 5 | 6;
    displayNum: string;
    title: string;
    Icon: React.ComponentType<{ className?: string }>;
    accentCls: string;
  }[] = [
    {
      num: 1,
      displayNum: '1',
      title: tr(
        language,
        'SACAR LA MUESTRA CON DISPOSITIVOS ADECUADOS (jeringa o capilar)',
        'COLLECT SAMPLE WITH APPROPRIATE DEVICES (syringe or capillary)'
      ),
      Icon: Syringe,
      accentCls: 'border-rose-400/50 bg-rose-500/15 text-rose-300',
    },
    {
      num: 2,
      displayNum: '2',
      title: tr(language, 'AGITAR LA MUESTRA', 'MIX / AGITATE THE SAMPLE'),
      Icon: RefreshCw,
      accentCls: 'border-sky-400/50 bg-sky-500/15 text-sky-300',
    },
    {
      num: 3,
      displayNum: '3',
      title: tr(
        language,
        'DESECHAR DOS GOTAS DE SANGRE Y DESCARTAR COÁGULOS',
        'DISCARD TWO BLOOD DROPS AND CHECK FOR CLOTS'
      ),
      Icon: Droplets,
      accentCls: 'border-red-400/50 bg-red-500/15 text-red-300',
    },
    {
      num: 4,
      displayNum: '4',
      title: tr(
        language,
        'PONER LA MUESTRA EN EL MUESTREADOR',
        'PLACE THE SAMPLE IN THE SAMPLER PORT'
      ),
      Icon: ArrowRightCircle,
      accentCls: 'border-orange-400/50 bg-orange-500/15 text-orange-300',
    },
    {
      num: 5,
      displayNum: '5',
      title: tr(language, 'PULSAR ANALIZAR', 'PRESS ANALYZE'),
      Icon: Play,
      accentCls: 'border-amber-400/50 bg-amber-500/15 text-amber-300',
    },
    {
      num: 6,
      displayNum: '6',
      title: tr(
        language,
        'RELLENAR LOS CAMPOS DEL PACIENTE',
        'FILL IN PATIENT FIELDS'
      ),
      Icon: UserCheck,
      accentCls: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300',
    },
  ];

  const timeText = now.toLocaleTimeString(localeFor(language), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr(language, 'Protector de pantalla del analizador', 'Analyzer Screen Saver')}
      className="absolute inset-0 z-50 bg-gradient-to-br from-[#0F172A] via-[#132238] to-[#0B1120] text-white flex flex-col justify-between p-3 sm:p-4 gap-3 overflow-hidden select-none"
    >
      {/* Top Bright Neon Yellow Warning Banner */}
      <div className="bg-[#FFE600] border-4 border-[#CA8A04] rounded-xl px-4 py-3 flex items-center justify-center gap-4 shadow-xl shrink-0">
        <AlertTriangle className="w-11 h-11 sm:w-12 sm:h-12 text-red-700 stroke-[2.6] animate-pulse shrink-0" />
        <div className="text-center sm:text-left">
          <div className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-slate-950 uppercase leading-tight">
            {tr(
              language,
              'Es necesario la atención del operador',
              'Operator attention required'
            )}
          </div>
          <div className="text-xs sm:text-sm font-bold text-amber-950 mt-0.5">
            {tr(
              language,
              'Siga las instrucciones gráficas para procesar correctamente una muestra de gasometría',
              'Follow the graphical instructions below to properly process a blood gas sample'
            )}
          </div>
        </div>
        <AlertTriangle className="hidden sm:block w-11 h-11 sm:w-12 sm:h-12 text-red-700 stroke-[2.6] animate-pulse shrink-0" />
      </div>

      {/* 6 Animated Sample-Processing Step Cards (3x2 grid) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-0.5">
        {steps.map(({ num, displayNum, title, Icon, accentCls }) => (
          <div
            key={num}
            className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-lg"
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center font-mono font-extrabold text-sm shrink-0 ${accentCls}`}
              >
                {displayNum}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  <Icon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{tr(language, `Paso ${displayNum}`, `Step ${displayNum}`)}</span>
                </div>
                <div className="font-display font-bold text-xs sm:text-[13px] text-white leading-snug mt-0.5">
                  {title}
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1.5 flex items-center justify-center">
              <AnimatedStepIllustration step={num} language={language} />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Bar with Instrument Info + Exit Screensaver Button */}
      <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <span className="font-display font-bold text-white">
            {state.config.deviceName} · <span className="font-mono text-sky-300">{state.config.deviceId}</span>
          </span>
          <span className="text-slate-500" aria-hidden="true">|</span>
          <span className="font-mono font-bold text-amber-300 tabular-nums">{timeText}</span>
        </div>

        <button
          type="button"
          onClick={() => setScreensaverOpen(false)}
          className="px-5 py-2.5 rounded-lg bg-[#E8630A] hover:bg-[#D15607] active:scale-[0.99] text-white font-display font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg border border-orange-400/50 transition-all"
        >
          <MonitorCheck className="w-4 h-4 shrink-0" />
          <span>
            {tr(language, 'Finalizar protector de pantalla', 'Exit Screen Saver')}
          </span>
        </button>
      </div>
    </div>
  );
};
