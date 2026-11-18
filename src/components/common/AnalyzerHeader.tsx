import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileClock,
  FlaskConical,
  Folders,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  MonitorPlay,
  Moon,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  Sun,
  Users,
  Wifi,
  WifiOff,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { AnalyzerStatus, QCOverallStatus } from '@/src/types/analyzer';
import {
  EnglishFlagIcon,
  Language,
  localeFor,
  SpanishFlagIcon,
  tr,
  translateRole,
} from '@/src/i18n/translations';

function getStatusMeta(status: AnalyzerStatus, lang: Language) {
  switch (status) {
    case 'OPERATIVO':
      return {
        label: tr(lang, 'Activo', 'Active'),
        cls: 'text-emerald-200',
        Icon: CheckCircle2,
      };
    case 'OPERATIVO_CON_ADVERTENCIAS':
      return {
        label: tr(lang, 'Activo · Adv.', 'Active · Warn'),
        cls: 'text-amber-200',
        Icon: AlertTriangle,
      };
    case 'NO_DISPONIBLE':
      return {
        label: tr(lang, 'No disponible', 'Unavailable'),
        cls: 'text-red-200',
        Icon: XCircle,
      };
    case 'MANTENIMIENTO':
      return {
        label: tr(lang, 'Mantenimiento', 'Maintenance'),
        cls: 'text-sky-200',
        Icon: Wrench,
      };
  }
}

function getQcMeta(qc: QCOverallStatus, lang: Language) {
  switch (qc) {
    case 'CONFORME':
      return { label: tr(lang, 'CCI OK', 'QC OK'), cls: 'text-emerald-200' };
    case 'ADVERTENCIA':
      return { label: tr(lang, 'CCI Adv.', 'QC Warn'), cls: 'text-amber-200' };
    case 'NO_CONFORME':
      return { label: tr(lang, 'CCI Fallo', 'QC Fail'), cls: 'text-red-200 font-bold' };
    case 'BLOQUEADO':
      return { label: tr(lang, 'CCI Bloq.', 'QC Lock'), cls: 'text-red-200 font-bold' };
  }
}

export const AnalyzerHeader: React.FC = () => {
  const {
    state,
    currentUser,
    activeMode,
    themeMode,
    toggleThemeMode,
    language,
    setLanguage,
    desynchronizeEvents,
    toggleDesynchronizeEvents,
    qcOverallStatus,
    unidentifiedCount,
    can,
    setMode,
    logout,
    requestNav,
    setManualModalOpen,
    setScreensaverOpen,
  } = useAnalyzer();

  const [now, setNow] = useState(() => new Date());
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const folderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (folderRef.current && !folderRef.current.contains(e.target as Node)) {
        setShowFolderMenu(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const statusMeta = getStatusMeta(state.analyzerStatus, language);
  const qcMeta = getQcMeta(qcOverallStatus, language);
  const StatusIcon = statusMeta.Icon;

  const formattedDate = now.toLocaleDateString(localeFor(language), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const formattedTime = now.toLocaleTimeString(localeFor(language), {
    hour: '2-digit',
    minute: '2-digit',
  });

  const folderSubmenus: {
    id: string;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] =
    activeMode === 'LABORATORY'
      ? [
          { id: 'RESULTS', label: tr(language, 'Pacientes', 'Patients'), Icon: Users },
          {
            id: 'UNIDENTIFIED',
            label: tr(language, 'Sin identificar', 'Unidentified'),
            Icon: FileClock,
            badge: unidentifiedCount,
          },
          { id: 'QC', label: 'QC', Icon: ShieldAlert },
          { id: 'CALIBRATIONS', label: tr(language, 'Calibraciones', 'Calibrations'), Icon: RefreshCw },
          { id: 'AUDIT', label: tr(language, 'Sucesos', 'Events'), Icon: ClipboardList },
          { id: 'INDICATORS', label: tr(language, 'Estadística', 'Statistics'), Icon: BarChart3 },
        ]
      : [
          { id: 'HISTORY', label: tr(language, 'Pacientes', 'Patients'), Icon: Users },
          {
            id: 'UNIDENTIFIED',
            label: tr(language, 'Sin identificar', 'Unidentified'),
            Icon: FileClock,
            badge: unidentifiedCount,
          },
          { id: 'CRITICALS', label: tr(language, 'Críticos', 'Criticals'), Icon: ShieldAlert },
          { id: 'EVENTS', label: tr(language, 'Sucesos', 'Events'), Icon: ClipboardList },
          { id: 'STATS', label: tr(language, 'Estadística', 'Statistics'), Icon: BarChart3 },
        ];

  const handleSelectSubmenu = (targetId: string) => {
    setShowFolderMenu(false);
    if (activeMode) {
      requestNav(activeMode, targetId);
    }
  };

  const isClinical = activeMode === 'CLINICAL';
  const labAccessAllowed = Boolean(currentUser && can('ACCESS_LAB_MODE') && currentUser.id !== 'USR-ADMIN-FREE');
  const headerClass = isClinical
    ? 'bg-[#8B1A1A] dark:bg-[#2B2E33] border-b-2 border-[#5C0E0E] dark:border-[#8B1A1A]'
    : 'bg-[#0B3C6D] dark:bg-[#2B2E33] border-b-2 border-[#062444] dark:border-[#0B3C6D]';

  return (
    <>
      <header className={`${headerClass} text-white pl-2 pr-1 py-1 shrink-0 relative z-30 transition-colors`}>
        <div className="flex items-center justify-between gap-1 w-full">
          {/* Left: Readiness State + Equipment ID */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`flex items-center gap-1 font-display font-bold text-xs whitespace-nowrap ${statusMeta.cls}`}>
              <StatusIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{statusMeta.label}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-white/80 min-w-0">
              <span className="text-white/30" aria-hidden="true">|</span>
              <span className="font-semibold text-white whitespace-nowrap">
                {state.config.deviceName}
              </span>
              <span className="font-mono text-[10px] text-white/75 whitespace-nowrap hidden md:inline">
                {state.config.deviceId}
              </span>
            </div>

            {/* Flag Language Toggle: English / Spanish next to RAPIDPoint 500e RP500e-01 */}
            <div
              role="group"
              aria-label={tr(language, 'Idioma', 'Language')}
              className="flex items-center bg-black/25 p-0.5 rounded border border-white/30 shrink-0 ml-0.5"
            >
              <button
                type="button"
                onClick={() => setLanguage('en')}
                title="English"
                aria-label="English"
                aria-pressed={language === 'en'}
                className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-all ${
                  language === 'en'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'opacity-75 hover:opacity-100 text-white'
                }`}
              >
                <EnglishFlagIcon className="w-4 h-3 rounded-[1px]" />
                <span className="text-[9.5px] font-bold">EN</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('es')}
                title="Español"
                aria-label="Español"
                aria-pressed={language === 'es'}
                className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-all ${
                  language === 'es'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'opacity-75 hover:opacity-100 text-white'
                }`}
              >
                <SpanishFlagIcon className="w-4 h-3 rounded-[1px]" />
                <span className="text-[9.5px] font-bold">ES</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowFolderMenu(false);
                setShowHelpModal(false);
                setManualModalOpen(true);
              }}
              title={tr(language, 'Manual de características (ES / EN)', 'Feature Manual (EN / ES)')}
              aria-label={tr(language, 'Manual de características (ES / EN)', 'Feature Manual (EN / ES)')}
              className="w-7 h-7 rounded border border-white/30 bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-colors shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-200" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowFolderMenu(false);
                setShowHelpModal(false);
                setScreensaverOpen(true);
              }}
              title={tr(language, 'Protector de pantalla', 'Screen Saver')}
              aria-label={tr(language, 'Protector de pantalla', 'Screen Saver')}
              className="h-7 px-1.5 rounded border border-white/30 bg-white/15 hover:bg-white/25 active:scale-95 flex items-center gap-1 text-white transition-colors shrink-0 whitespace-nowrap"
            >
              <MonitorPlay className="w-3.5 h-3.5 text-amber-200 shrink-0" />
              <span className="hidden lg:inline text-[10px] font-bold">
                {tr(language, 'Protector', 'Screen saver')}
              </span>
            </button>
          </div>

          {/* Center/Right: Status pills, Desync Toggle, Clinical/Lab Mode Toggle, Lock + Right Controls */}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <div className="hidden 2xl:flex items-center gap-1 text-[10.5px]">
              <span
                className={`inline-flex items-center gap-1 font-medium whitespace-nowrap ${
                  state.communicationStatus === 'CONECTADO' ? 'text-emerald-200' : 'text-red-200'
                }`}
              >
                {state.communicationStatus === 'CONECTADO' ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                <span>
                  {state.communicationStatus === 'CONECTADO'
                    ? 'Atellica OK'
                    : tr(language, 'Atellica Off', 'Atellica Off')}
                </span>
              </span>
              <span className="text-white/30" aria-hidden="true">·</span>
              <span className={`inline-flex items-center gap-1 font-medium whitespace-nowrap ${qcMeta.cls}`}>
                <ShieldAlert className="w-3 h-3" />
                <span>{qcMeta.label}</span>
              </span>
            </div>

            {/* Toggle: Desincronizar eventos ON / OFF */}
            <button
              type="button"
              role="switch"
              aria-checked={desynchronizeEvents}
              onClick={toggleDesynchronizeEvents}
              title={tr(
                language,
                'Activar o desactivar desincronización de eventos',
                'Enable or disable event desynchronization'
              )}
              className="flex items-center gap-1 px-1.5 py-1 rounded border border-white/30 bg-black/20 hover:bg-black/30 text-[10px] font-bold text-white transition-colors whitespace-nowrap"
            >
              <span>{tr(language, 'Desincronizar eventos', 'Desync events')}</span>
              <span
                className={`px-1.5 py-0.5 rounded font-mono text-[9.5px] font-extrabold ${
                  desynchronizeEvents
                    ? 'bg-amber-400 text-amber-950'
                    : 'bg-white/25 text-white'
                }`}
              >
                {desynchronizeEvents ? tr(language, 'SÍ', 'ON') : tr(language, 'NO', 'OFF')}
              </span>
            </button>

            {currentUser && activeMode && (
              <>
                {/* Prominent Clinical <-> Laboratory Mode Toggle in Header */}
                <div
                  role="group"
                  aria-label={tr(language, 'Selector de modo Clínico o Laboratorio', 'Clinical or Laboratory mode switch')}
                  className="flex items-center bg-black/25 p-0.5 rounded border border-white/30"
                >
                  <button
                    type="button"
                    onClick={() => setMode('CLINICAL')}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-bold transition-colors whitespace-nowrap ${
                      activeMode === 'CLINICAL'
                        ? 'bg-white text-[#8B1A1A] shadow-xs'
                        : 'text-white/85 hover:text-white'
                    }`}
                  >
                    <Stethoscope className="w-3 h-3" />
                    <span>{tr(language, 'Clínico', 'Clinical')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('LABORATORY')}
                    title={
                      labAccessAllowed
                        ? tr(language, 'Cambiar a Modo Laboratorio', 'Switch to Laboratory Mode')
                        : tr(
                            language,
                            'Requiere usuario autenticado con perfil Laboratorio o Administrador',
                            'Requires authenticated Laboratory or Administrator user'
                          )
                    }
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-bold transition-colors whitespace-nowrap ${
                      activeMode === 'LABORATORY'
                        ? 'bg-white text-[#0B3C6D] shadow-xs'
                        : labAccessAllowed
                          ? 'text-white/85 hover:text-white'
                          : 'text-white/55 hover:text-white/80'
                    }`}
                  >
                    <FlaskConical className="w-3 h-3" />
                    <span>{tr(language, 'Laboratorio', 'Laboratory')}</span>
                    {!labAccessAllowed && <Lock className="w-2.5 h-2.5 opacity-80" />}
                  </button>
                </div>

                <div className="hidden 2xl:block text-right leading-tight text-[10.5px] border-l border-white/25 pl-1.5">
                  <div className="font-semibold text-white whitespace-nowrap max-w-[115px] truncate">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[9.5px] text-white/75 whitespace-nowrap">
                    {translateRole(language, currentUser.role)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  title={tr(language, 'Bloquear / Cambiar operador', 'Lock / Switch operator')}
                  className="flex items-center gap-1 px-1.5 py-1 rounded border border-white/30 bg-white/15 hover:bg-white/25 text-[10.5px] font-bold text-white transition-colors whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{tr(language, 'Bloquear', 'Lock')}</span>
                </button>
              </>
            )}

            {/* Right-pinned Controls: Light/Dark + Help (?) + Folders + Info (i) + Clock */}
            <div className="flex items-center gap-1 pl-1 pr-0.5 border-l border-white/25">

              <button
                type="button"
                onClick={toggleThemeMode}
                title={
                  themeMode === 'light'
                    ? tr(language, 'Cambiar a modo oscuro', 'Switch to dark mode')
                    : tr(language, 'Cambiar a modo claro', 'Switch to light mode')
                }
                aria-label={
                  themeMode === 'light'
                    ? tr(language, 'Cambiar a modo oscuro', 'Switch to dark mode')
                    : tr(language, 'Cambiar a modo claro', 'Switch to light mode')
                }
                className="w-8 h-8 rounded border border-white/30 bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-colors"
              >
                {themeMode === 'light' ? (
                  <Moon className="w-4 h-4 text-amber-200" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-300" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowFolderMenu(false);
                  setShowHelpModal(true);
                }}
                title={tr(language, 'Ayuda del analizador', 'Analyzer help')}
                aria-label={tr(language, 'Ayuda del analizador', 'Analyzer help')}
                className="w-8 h-8 rounded border border-white/30 bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-colors"
              >
                <HelpCircle className="w-5 h-5 text-white" />
              </button>

              <div className="relative" ref={folderRef}>
                <button
                  type="button"
                  onClick={() => setShowFolderMenu((v) => !v)}
                  title={tr(language, 'Carpetas / Menú rápido', 'Folders / Quick menu')}
                  aria-label={tr(language, 'Carpetas / Menú rápido', 'Folders / Quick menu')}
                  className={`w-8 h-8 rounded border flex items-center justify-center transition-colors ${
                    showFolderMenu
                      ? 'bg-white text-slate-900 border-white'
                      : 'bg-white/15 border-white/30 hover:bg-white/25 text-white'
                  }`}
                >
                  <Folders className={`w-5 h-5 ${showFolderMenu ? 'text-[#E8630A]' : 'text-amber-300'}`} />
                </button>

                {showFolderMenu && (
                  <div className="absolute right-0 mt-1.5 w-48 bg-white border-2 border-slate-300 rounded-lg shadow-xl py-1.5 z-50 text-slate-900">
                    <div className="px-3 py-1 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {activeMode === 'LABORATORY'
                        ? tr(language, 'Menú Laboratorio', 'Laboratory Menu')
                        : tr(language, 'Menú Clínico', 'Clinical Menu')}
                    </div>
                    {folderSubmenus.map((item) => {
                      const Icon = item.Icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSubmenu(item.id)}
                          className="w-full px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-[#FFF3EB] hover:text-[#E8630A] flex items-center justify-between gap-2 transition-colors"
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-[#0066B2] shrink-0" />
                            <span>{item.label}</span>
                          </span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-orange-100 border border-orange-400 text-orange-900 font-mono text-[10px] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Icon-only Info button between Folders and Clock -> opens Cartridge Status Screen */}
              <button
                type="button"
                onClick={() => {
                  setShowFolderMenu(false);
                  setShowHelpModal(false);
                  if (activeMode) {
                    requestNav(activeMode, 'CARTRIDGE_STATUS');
                  }
                }}
                title={tr(language, 'Estado de cartuchos del analizador', 'Analyzer cartridge status')}
                aria-label={tr(language, 'Estado de cartuchos del analizador', 'Analyzer cartridge status')}
                className="w-8 h-8 rounded border border-white/30 bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-colors"
              >
                <Info className="w-4 h-4 text-sky-200" />
              </button>

              {/* Stacked Instrument Clock flush against the right edge */}
              <div className="text-right font-mono tabular-nums leading-tight pl-1.5 pr-0.5 border-l border-white/25">
                <div className="text-[11px] font-bold text-white">{formattedTime}</div>
                <div className="text-[9.5px] text-white/75">{formattedDate}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* HELP MODAL (?) */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-400 rounded-xl w-full max-w-xl p-5 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#0066B2]" />
                <h3 className="font-display font-bold text-base text-slate-900">
                  {tr(language, 'Ayuda Rápida del Analizador', 'Analyzer Quick Help')} · {state.config.deviceName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">
                  {tr(language, '1. Preparación de muestra', '1. Sample preparation')}
                </div>
                <p className="mt-0.5">
                  {tr(
                    language,
                    'Invierta suavemente la jeringa heparinada 8–10 veces, elimine cualquier burbuja de aire y purgue las primeras gotas para descartar microcoágulos antes de acoplar al puerto de aspiración.',
                    'Gently invert the heparinized syringe 8–10 times, expel any air bubbles, and purge the first drops to discard microclots before coupling to the sample port.'
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">
                  {tr(
                    language,
                    '2. Detección de coágulo y cambio de puerto de muestra',
                    '2. Clot detection & sample port replacement'
                  )}
                </div>
                <p className="mt-0.5">
                  {tr(
                    language,
                    'Ante un aviso de coágulo, retire el puerto rojo siguiendo el diagrama gráfico, deséchelo en contenedor biológico e inserte un puerto nuevo hasta escuchar el clic.',
                    'When a clot warning occurs, remove the red sample port following the graphic diagram, dispose of it in a biohazard container, and insert a new port until it clicks.'
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">
                  {tr(language, '3. Parámetros con aviso QC y BIDI', '3. QC-flagged parameters & BIDI')}
                </div>
                <p className="mt-0.5">
                  {tr(
                    language,
                    'Los botones en amarillo con superíndice QC indican advertencia de control automático (AQC). En Modo Clínico puede generar el código BIDI en resultados para visualizar el informe anonimizado en un dispositivo móvil.',
                    'Yellow parameter tiles with a QC superscript indicate an Automatic QC (AQC) warning. In Clinical Mode you can generate a BIDI QR code on results to view an anonymized report on a mobile device.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold"
              >
                {tr(language, 'Entendido', 'Got it')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
