import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  BookOpen,
  Delete,
  FlaskConical,
  KeyRound,
  Lock,
  Mail,
  Monitor,
  QrCode,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import {
  EnglishFlagIcon,
  SpanishFlagIcon,
  tr,
  translateAnalyzerStatus,
  translateRole,
} from '@/src/i18n/translations';

const INICIO_PARAMETER_TILES = [
  { id: 'pH', label: 'pH' },
  { id: 'Na', label: 'Na+' },
  { id: 'Glu', label: 'Glu' },
  { id: 'pCO2', label: 'pCO2' },
  { id: 'K', label: 'K+' },
  { id: 'Lac', label: 'Lac' },
  { id: 'pO2', label: 'pO2' },
  { id: 'Ca', label: 'Ca++' },
  { id: 'ctHb', label: 'ctHb' },
  { id: 'Coox', label: 'Coox' },
  { id: 'Cl', label: 'Cl-' },
  { id: 'nBili', label: 'nBili' },
] as const;

interface LoginAndModeScreenProps {
  frameMode?: 'FILL' | '12INCH';
  onToggleFrame?: () => void;
}

export const LoginAndModeScreen: React.FC<LoginAndModeScreenProps> = ({
  frameMode,
  onToggleFrame,
}) => {
  const {
    state,
    currentUser,
    activeMode,
    language,
    setLanguage,
    requireLogin,
    setRequireLogin,
    login,
    loginWithoutAuth,
    setMode,
    logout,
    can,
    setManualModalOpen,
  } = useAnalyzer();
  const [selectedComboUserId, setSelectedComboUserId] = useState<string>(
    requireLogin ? state.users[0]?.id ?? '' : ''
  );
  const [username, setUsername] = useState(
    requireLogin ? state.users[0]?.username ?? 'enf.garcia' : ''
  );
  const [password, setPassword] = useState(
    requireLogin ? state.users[0]?.passwordDemo ?? 'demo123' : ''
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const failedAqcParams = useMemo(() => {
    const failed = new Set<string>();
    state.qcLevels.forEach((lvl) => {
      const latest = state.qcRuns.find((r) => r.levelId === lvl.id);
      if (latest && latest.status !== 'CONFORME') {
        latest.violatedRules.forEach((vr) => failed.add(vr.parameter));
        Object.entries(latest.zScores).forEach(([k, z]) => {
          if (Math.abs(z) >= 2) {
            failed.add(k);
          }
        });
      }
    });
    return failed;
  }, [state.qcLevels, state.qcRuns]);

  const parameterStatusItems = useMemo(() => {
    const analyzerBlocked =
      state.analyzerStatus === 'NO_DISPONIBLE' || state.analyzerStatus === 'MANTENIMIENTO';
    return INICIO_PARAMETER_TILES.map((tile) => {
      const isEnabled =
        tile.id === 'Coox'
          ? (['FO2Hb', 'FCOHb', 'FMetHb', 'FHHb'] as const).some(
              (k) => state.config.parameters[k]?.enabled !== false
            )
          : state.config.parameters[tile.id as keyof typeof state.config.parameters]?.enabled !==
            false;
      const failedAqc =
        tile.id === 'Coox'
          ? ['Coox', 'FO2Hb', 'FCOHb', 'FMetHb', 'FHHb'].some((k) => failedAqcParams.has(k))
          : failedAqcParams.has(tile.id);

      if (analyzerBlocked) {
        return {
          ...tile,
          statusText: tr(language, 'No disponible', 'Unavailable'),
          cls: 'bg-red-200 border-red-500 text-red-950',
        };
      }
      if (!isEnabled) {
        return {
          ...tile,
          statusText: tr(language, 'Desactivado', 'Disabled'),
          cls: 'bg-slate-200 border-slate-400 text-slate-500',
        };
      }
      if (failedAqc) {
        return {
          ...tile,
          statusText: tr(language, 'Advertencia AQC', 'AQC Warning'),
          cls: 'bg-amber-300 border-amber-500 text-amber-950',
        };
      }
      return {
        ...tile,
        statusText: tr(language, 'Activo', 'Active'),
        cls: 'bg-emerald-200 border-emerald-600 text-emerald-950',
      };
    });
  }, [state.analyzerStatus, state.config.parameters, failedAqcParams, language]);

  const handleToggleRequireLogin = () => {
    const next = !requireLogin;
    setRequireLogin(next);
    setErrorMsg(null);
    if (next) {
      if (!selectedComboUserId && state.users[0]) {
        setSelectedComboUserId(state.users[0].id);
        setUsername(state.users[0].username);
        setPassword(state.users[0].passwordDemo);
      }
    } else {
      setSelectedComboUserId('');
      setUsername('');
      setPassword('');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!requireLogin && !username.trim()) {
      loginWithoutAuth();
      return;
    }
    if (!username.trim() || !password.trim()) {
      setErrorMsg(
        tr(
          language,
          'Introduzca identificador de operador y clave.',
          'Please enter operator ID and password.'
        )
      );
      return;
    }
    const res = login(username, password);
    if (!res.ok) {
      setErrorMsg(res.error ?? tr(language, 'Error de autenticación.', 'Authentication error.'));
    }
  };

  const handleUserComboChange = (userId: string) => {
    setSelectedComboUserId(userId);
    if (!userId) {
      setUsername('');
      setPassword('');
      setErrorMsg(null);
      return;
    }
    const chosen = state.users.find((u) => u.id === userId);
    if (chosen) {
      setUsername(chosen.username);
      setPassword(chosen.passwordDemo);
      setErrorMsg(null);
    }
  };

  const appendPinChar = (ch: string) => {
    setPassword((p) => (p.length < 16 ? p + ch : p));
  };

  const simulateOperatorRead = () => {
    const activeUsers = state.users.filter((u) => u.active);
    if (activeUsers.length === 0) return;
    const currentIdx = activeUsers.findIndex((u) => u.id === selectedComboUserId);
    const chosen = activeUsers[(currentIdx + 1) % activeUsers.length];
    setSelectedComboUserId(chosen.id);
    setUsername(chosen.username);
    setPassword(chosen.passwordDemo);
    setErrorMsg(null);
  };

  const renderLanguageToggle = () => (
    <div className="flex items-center gap-1.5">
      <div
        role="group"
        aria-label={tr(language, 'Idioma', 'Language')}
        className="flex items-center bg-slate-200 p-0.5 rounded border border-slate-300"
      >
        <button
          type="button"
          onClick={() => setLanguage('es')}
          title="Español"
          aria-label="Español"
          className={`px-1.5 py-1 rounded flex items-center gap-1 transition-all ${
            language === 'es' ? 'bg-white text-slate-900 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-700'
          }`}
        >
          <SpanishFlagIcon className="w-4 h-3 rounded-[1px]" />
          <span className="text-[10px] font-bold">ES</span>
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          title="English"
          aria-label="English"
          className={`px-1.5 py-1 rounded flex items-center gap-1 transition-all ${
            language === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-700'
          }`}
        >
          <EnglishFlagIcon className="w-4 h-3 rounded-[1px]" />
          <span className="text-[10px] font-bold">EN</span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => setManualModalOpen(true)}
        title={tr(language, 'Manual de características (ES / EN)', 'Feature Manual (EN / ES)')}
        aria-label={tr(language, 'Manual de características (ES / EN)', 'Feature Manual (EN / ES)')}
        className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-[#0B3C6D] transition-colors shadow-xs"
      >
        <BookOpen className="w-4 h-4" />
      </button>
    </div>
  );

  // STEP 2: OPERATOR AUTHENTICATED -> MODE SELECTION
  if (currentUser && !activeMode) {
    const isUnidentifiedLogin = currentUser.id === 'USR-ADMIN-FREE';
    const labAllowed = can('ACCESS_LAB_MODE') && !isUnidentifiedLogin;
    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <header className="bg-[#F6F8FA] text-slate-900 border-b-2 border-[#E8630A] px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-base text-slate-900">
              {state.config.deviceName}
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-xs text-slate-600">{state.config.deviceId}</span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              · {tr(language, 'Selección de Entorno', 'Environment Selection')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {renderLanguageToggle()}
            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-1.5 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-xs font-bold text-slate-800"
            >
              {tr(language, 'Cambiar operador', 'Switch operator')}
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden p-4 flex items-center justify-center bg-[#F8FAFC]">
          <div className="w-full max-w-4xl space-y-3">
            <div className="bg-white border border-slate-300 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#E8630A]/10 border border-[#E8630A]/30 text-[#E8630A] flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    {tr(language, 'Operador identificado', 'Identified operator')}
                  </div>
                  <div className="font-display font-bold text-lg text-slate-900">
                    {isUnidentifiedLogin
                      ? tr(language, 'Administrador (Sin identificación)', 'Administrator (Unidentified)')
                      : currentUser.fullName}
                  </div>
                  <div className="text-xs text-slate-600">
                    {translateRole(language, currentUser.role)} · {currentUser.department}
                  </div>
                </div>
              </div>
              <div className="font-mono text-xs bg-[#F1F4F7] border border-slate-300 rounded px-3 py-1.5 text-slate-700">
                {tr(language, 'Estado:', 'Status:')}{' '}
                <strong>
                  {state.analyzerStatus === 'OPERATIVO'
                    ? tr(language, 'Activo', 'Active')
                    : translateAnalyzerStatus(language, state.analyzerStatus)}
                </strong>{' '}
                · {state.records.length} {tr(language, 'muestras', 'samples')}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMode('CLINICAL')}
                className="text-left bg-white border-2 border-slate-300 hover:border-[#E8630A] active:scale-[0.99] rounded-lg p-5 transition-all flex flex-col justify-between min-h-[190px]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded bg-[#FFF3EB] border border-[#E8630A]/40 text-[#E8630A] flex items-center justify-center">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-700">
                      {tr(language, 'HABILITADO', 'ENABLED')}
                    </span>
                  </div>
                  <h2 className="font-display font-bold text-2xl text-slate-900 mt-4">
                    {tr(language, 'Modo Clínico', 'Clinical Mode')}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {tr(
                      language,
                      'Pantalla de análisis rápido para Enfermería: selección táctil de muestra y parámetros, lectura de código, resultados e histórico.',
                      'Quick analysis screen for Nursing: touch sample and parameter selection, barcode reading, results, and patient history.'
                    )}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-[#E8630A]">
                  <span>{tr(language, 'Entrar en Modo Clínico', 'Enter Clinical Mode')}</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>

              <button
                type="button"
                disabled={!labAllowed}
                onClick={() => labAllowed && setMode('LABORATORY')}
                className={`text-left border-2 rounded-lg p-5 transition-all flex flex-col justify-between min-h-[190px] ${
                  labAllowed
                    ? 'bg-white border-slate-300 hover:border-[#0066B2] active:scale-[0.99] cursor-pointer'
                    : 'bg-[#ECEFF3] border-slate-300 opacity-70 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-11 h-11 rounded flex items-center justify-center border ${
                        labAllowed
                          ? 'bg-[#EDF5FC] border-[#0066B2]/40 text-[#0066B2]'
                          : 'bg-slate-200 border-slate-300 text-slate-500'
                      }`}
                    >
                      {labAllowed ? <FlaskConical className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        labAllowed ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {labAllowed
                        ? tr(language, 'HABILITADO', 'ENABLED')
                        : tr(language, 'RESTRINGIDO', 'RESTRICTED')}
                    </span>
                  </div>
                  <h2 className="font-display font-bold text-2xl text-slate-900 mt-4">
                    {tr(language, 'Modo Laboratorio', 'Laboratory Mode')}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {tr(
                      language,
                      'Control de Calidad Westgard, calibraciones, consumibles, mantenimiento, configuración analítica, auditoría y simulador.',
                      'Westgard Quality Control, calibrations, consumables, maintenance, analytical configuration, audit log, and simulator.'
                    )}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-[#0066B2]">
                  <span>
                    {labAllowed
                      ? tr(language, 'Entrar en Modo Laboratorio', 'Enter Laboratory Mode')
                      : isUnidentifiedLogin
                        ? tr(
                            language,
                            'Solo disponible con operador identificado',
                            'Only available with identified operator'
                          )
                        : tr(
                            language,
                            'Exclusivo Técnico / Facultativo / Admin',
                            'Technician / Specialist / Admin only'
                          )}
                  </span>
                  {labAllowed ? <ArrowRight className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 1: INSTRUMENT LOCK / LOGIN SCREEN
  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Light Instrument Top Bar */}
      <header className="bg-[#F6F8FA] text-slate-900 border-b-2 border-[#E8630A] px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="font-display font-bold text-base text-slate-900">
            {state.config.deviceName}
          </span>
          <span className="text-slate-300">|</span>
          <span className="font-mono text-xs text-slate-600">{state.config.deviceId}</span>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <span className="text-xs text-slate-500 hidden sm:inline">{state.config.location}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono font-semibold text-emerald-700 hidden sm:inline">
            {state.analyzerStatus === 'OPERATIVO'
              ? tr(language, 'Activo', 'Active')
              : translateAnalyzerStatus(language, state.analyzerStatus)}
          </span>
          {renderLanguageToggle()}
          {onToggleFrame && (
            <button
              type="button"
              onClick={onToggleFrame}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-[11px] font-mono text-slate-700"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>
                {frameMode === '12INCH'
                  ? '12" (1280×800)'
                  : tr(language, 'Completa', 'Full Screen')}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-2.5 flex flex-col justify-between gap-1.5 bg-[#F8FAFC]">
        {/* TOP FULL-WIDTH SHORT LIGHT ORANGE POCT COORDINATOR BANNER */}
        <div className="w-full bg-orange-100 border border-orange-300 text-orange-950 rounded-lg px-3 py-1.5 flex items-center gap-2.5 shrink-0">
          <Mail className="w-6 h-6 text-orange-700 shrink-0" />
          <div className="leading-tight flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-xs font-bold">
              {tr(language, 'POCT Coordinador:', 'POCT Coordinator:')}
            </span>
            <span className="text-xs font-medium">
              {tr(language, 'Cambiar cartucho de Medida', 'Replace Measurement Cartridge')}
            </span>
          </div>
        </div>

        {/* HORIZONTAL LINE OF INICIO PARAMETERS (0.75cm x 0.75cm STATUS SQUARES) */}
        <div className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] font-bold text-slate-700 hidden sm:inline shrink-0">
            {tr(language, 'Estado parámetros:', 'Parameter status:')}
          </span>
          <div className="flex items-center justify-center gap-1.5 flex-nowrap mx-auto sm:mx-0">
            {parameterStatusItems.map((item) => (
              <div
                key={item.id}
                title={`${item.label}: ${item.statusText}`}
                aria-label={`${item.label}: ${item.statusText}`}
                className={`w-[0.75cm] h-[0.75cm] shrink-0 rounded border flex items-center justify-center font-mono font-bold text-[8.5px] leading-none tracking-tighter whitespace-nowrap select-none ${item.cls}`}
              >
                {item.label}
              </div>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-2 text-[10px] font-semibold text-slate-600 shrink-0">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-200 border border-emerald-600" />
              OK
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-300 border border-amber-500" />
              QC
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 border border-slate-400" />
              OFF
            </span>
          </div>
        </div>

        {/* CENTERED LOGIN FORM WITH OPERATOR COMBOBOX */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <form
            onSubmit={handleLoginSubmit}
            className="w-full max-w-md bg-white border border-slate-300 rounded-lg p-2.5 sm:p-3 space-y-1.5 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-[#E8630A]" />
                <span>
                  {tr(language, 'Acceso al Terminal del Analizador', 'Analyzer Terminal Access')}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {tr(language, 'Clave demo: demo123', 'Demo PIN: demo123')}
              </span>
            </div>

            {/* Toggle: Identificación obligatoria (Por defecto: NO -> Administrador sin loguear) */}
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border border-slate-200 bg-[#F6F8FA]">
              <div className="leading-tight">
                <div className="text-xs font-bold text-slate-900">
                  {tr(language, 'Identificación obligatoria', 'Login required')}
                </div>
                <div className="text-[10.5px] text-slate-600">
                  {requireLogin
                    ? tr(
                        language,
                        'SÍ: requiere usuario y clave de operador',
                        'YES: requires operator ID and PIN'
                      )
                    : tr(
                        language,
                        'NO: acceso sin identificar (solo Modo Clínico)',
                        'NO: anonymous access (Clinical Mode only)'
                      )}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={requireLogin}
                onClick={handleToggleRequireLogin}
                className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors shrink-0 ${
                  requireLogin
                    ? 'bg-[#E8630A] border-[#D15607] text-white'
                    : 'bg-emerald-600 border-emerald-700 text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white transition-transform" />
                <span>
                  {requireLogin ? tr(language, 'SÍ', 'YES') : tr(language, 'NO', 'NO')}
                </span>
              </button>
            </div>

            {/* Users Combobox above ID Operador */}
            <div>
              <label
                htmlFor="login-operator-combo"
                className="block text-[11.5px] font-semibold text-slate-700 mb-0.5"
              >
                {tr(language, 'Seleccionar Operador', 'Select Operator')}{' '}
                {!requireLogin && tr(language, '(Opcional)', '(Optional)')}
              </label>
              <select
                id="login-operator-combo"
                value={selectedComboUserId}
                onChange={(e) => handleUserComboChange(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E8630A]"
              >
                {!requireLogin && (
                  <option value="">
                    {tr(
                      language,
                      '— Sin identificar (Solo Modo Clínico) —',
                      '— Unidentified (Clinical Mode Only) —'
                    )}
                  </option>
                )}
                {state.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} — {translateRole(language, u.role)} ({u.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="login-operator-id"
                className="block text-[11.5px] font-semibold text-slate-700 mb-0.5"
              >
                {tr(language, 'ID de Operador', 'Operator ID')}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="login-operator-id"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={
                    !requireLogin
                      ? tr(language, 'Opcional (entra solo en Modo Clínico)', 'Optional (Clinical Mode only)')
                      : tr(language, 'Introduzca ID', 'Enter ID')
                  }
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded border border-slate-300 bg-[#F8FAFC] text-sm font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#E8630A]"
                />
                <button
                  type="button"
                  onClick={simulateOperatorRead}
                  title={tr(language, 'Leer código de barras del operador', 'Scan operator barcode')}
                  aria-label={tr(language, 'Código de barras', 'Barcode')}
                  className="px-2 py-1.5 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-slate-800 flex items-center justify-center shrink-0"
                >
                  <Barcode className="w-4 h-4 text-[#E8630A]" />
                </button>
                <button
                  type="button"
                  onClick={simulateOperatorRead}
                  title={tr(language, 'Leer código BIDI del operador', 'Scan operator BIDI code')}
                  aria-label={tr(language, 'Código BIDI', 'BIDI code')}
                  className="px-2 py-1.5 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-slate-800 flex items-center justify-center shrink-0"
                >
                  <QrCode className="w-4 h-4 text-[#0066B2]" />
                </button>
                <button
                  type="button"
                  onClick={simulateOperatorRead}
                  title={tr(language, 'Leer tarjeta NFC del operador', 'Read operator NFC badge')}
                  aria-label={tr(language, 'Lectura NFC', 'NFC read')}
                  className="px-2 py-1.5 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-slate-800 flex items-center gap-1 shrink-0"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 text-emerald-700"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
                    <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
                    <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8" />
                    <path d="M16.37 2a20.16 20.16 0 0 1 0 20" />
                  </svg>
                  <span className="text-[9.5px] font-mono font-bold text-slate-700">NFC</span>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="login-operator-pin"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {tr(language, 'Clave de Acceso', 'Access PIN')}
              </label>
              <div className="flex gap-2">
                <input
                  id="login-operator-pin"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    !requireLogin && !username.trim()
                      ? tr(language, 'No requerida sin identificar', 'Not required if unidentified')
                      : ''
                  }
                  className="flex-1 px-3 py-1.5 rounded border border-slate-300 bg-[#F8FAFC] text-sm font-mono text-slate-900 focus:outline-none focus:border-[#E8630A]"
                />
                <button
                  type="button"
                  onClick={() => setPassword((p) => p.slice(0, -1))}
                  className="px-3 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-slate-700"
                  title={tr(language, 'Borrar carácter', 'Delete character')}
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tactile On-Screen Numeric Keypad */}
            <div className="grid grid-cols-5 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => appendPinChar(digit)}
                  className="py-1 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-[#DFE4EA] active:bg-slate-300 font-mono font-bold text-sm text-slate-800"
                >
                  {digit}
                </button>
              ))}
            </div>

            {errorMsg && (
              <div className="p-2 rounded bg-red-50 border border-red-300 text-xs text-red-800 font-semibold">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 px-4 rounded bg-[#E8630A] hover:bg-[#D15607] active:scale-[0.99] text-white font-display font-bold text-sm flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                <span>
                  {!requireLogin && !username.trim()
                    ? tr(
                        language,
                        'Entrar sin identificarse (Solo Modo Clínico)',
                        'Enter without login (Clinical Mode only)'
                      )
                    : tr(language, 'Desbloquear Analizador', 'Unlock Analyzer')}
                </span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* BOTTOM FULL-WIDTH YELLOW WARNING BANNER */}
        <div className="w-full bg-amber-100 border-2 border-amber-400 text-amber-950 rounded-lg px-3.5 py-2 flex items-center gap-3 shrink-0">
          <AlertTriangle className="w-9 h-9 text-amber-700 shrink-0" />
          <div className="leading-tight">
            <div className="font-display font-bold text-sm sm:text-base text-amber-950">
              {tr(language, 'Es necesario la atención del operador', 'Operator attention required')}
            </div>
            <div className="text-[11px] font-medium text-amber-900 mt-0.5">
              {tr(language, 'Papel agotado', 'Out of printer paper')}
            </div>
            <div className="text-[11px] font-medium text-amber-900">
              {tr(language, 'Cartucho M casi caducado', 'Cartridge M expiring soon')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
