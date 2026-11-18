import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AnalyzerConfig,
  AnalyzerStatus,
  AnalyzerStoreState,
  AtellicaMessage,
  AtellicaMessagePriority,
  AtellicaMessageType,
  AuditLogEntry,
  AuditModule,
  BloodGasRecord,
  CalibrationRecord,
  CalibrationStatus,
  ClinicalProfileScenario,
  ConsumableItem,
  MaintenanceError,
  MaintenanceIntervention,
  OperatingMode,
  ParameterValues,
  Permission,
  QCLevel,
  QCNonConformity,
  QCOverallStatus,
  QCRun,
  ResultValidationStatus,
  SampleExtendedMetadata,
  SampleType,
  SentAtellicaMessage,
  SentMessageCategory,
  SimulatedOutcome,
  UserAccount,
  UserRole,
} from '@/src/types/analyzer';
import { createDemoSeedState } from '@/src/data/demoSeed';
import { clearPersistedState, loadPersistedState, savePersistedState } from '@/src/db/indexedDb';
import { hasPermission } from '@/src/engines/parameterDefinitions';
import { buildBloodGasRecord } from '@/src/engines/analysisEngine';
import { evaluateQCRun, QCParamKey, simulateQCValues } from '@/src/engines/qcEngine';
import { Language, translateClinicalText } from '@/src/i18n/translations';

export interface ToastItem {
  id: string;
  tone: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
}

interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

interface AnalyzerContextValue {
  state: AnalyzerStoreState;
  hydrated: boolean;
  currentUser: UserAccount | null;
  activeMode: OperatingMode | null;
  qcOverallStatus: QCOverallStatus;
  pendingMessagesCount: number;
  activeErrorsCount: number;
  unackCriticalCount: number;
  unidentifiedCount: number;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  can: (permission: Permission) => boolean;

  // Auth & Navigation Mode
  requireLogin: boolean;
  setRequireLogin: (required: boolean) => void;
  login: (username: string, password: string) => ActionResult<UserAccount>;
  loginWithoutAuth: () => ActionResult<UserAccount>;
  logout: () => void;
  setMode: (mode: OperatingMode) => ActionResult;
  themeMode: 'light' | 'dark';
  toggleThemeMode: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  desynchronizeEvents: boolean;
  toggleDesynchronizeEvents: () => void;
  desyncPopupMode: 'ON' | 'OFF' | null;
  dismissDesyncPopup: () => void;
  clotPortOverlayOpen: boolean;
  setClotPortOverlayOpen: (open: boolean) => void;
  loginAtellicaPopupOpen: boolean;
  dismissLoginAtellicaPopup: () => void;
  confirmLoginAtellicaPopup: () => void;
  manualModalOpen: boolean;
  setManualModalOpen: (open: boolean) => void;
  screensaverOpen: boolean;
  setScreensaverOpen: (open: boolean) => void;
  navRequest: { mode: OperatingMode; target: string; nonce: number; recordId?: string } | null;
  requestNav: (mode: OperatingMode, target: string, recordId?: string) => void;

  // Blood Gas Analysis & Clinical
  executeBloodGas: (input: {
    patientId: string;
    patientDemographics?: BloodGasRecord['patientDemographics'];
    patientLocation: string;
    sampleType: SampleType;
    operatorName?: string;
    fio2?: number;
    temperatureC?: number;
    extractionMinutesAgo?: number;
    scenario: ClinicalProfileScenario;
    outcome: SimulatedOutcome;
    preanalyticalChecklist: BloodGasRecord['preanalyticalChecklist'];
    customMeasured?: ParameterValues;
    isQuickMeasurement?: boolean;
    provisionalId?: string;
    quickReference?: string;
    measuredMode?: OperatingMode;
  }) => ActionResult<BloodGasRecord>;
  identifyBloodGasRecord: (input: {
    recordId: string;
    patientId: string;
    patientDemographics?: BloodGasRecord['patientDemographics'];
    patientLocation: string;
    sampleType: SampleType;
    fio2?: number;
    temperatureC?: number;
    sampleMetadata: SampleExtendedMetadata;
    isCorrection?: boolean;
  }) => ActionResult<BloodGasRecord>;
  transmitRecordToLis: (recordId: string) => ActionResult<BloodGasRecord>;
  acknowledgeCriticalAlert: (recordId: string, note?: string) => ActionResult;
  setRecordValidationStatus: (recordId: string, status: ResultValidationStatus) => ActionResult;
  reportIncident: (title: string, description: string, severity: MaintenanceError['severity']) => ActionResult;

  // QC & Clinical AQC
  runQC: (input: {
    levelId: string;
    mode?: 'CONFORME' | 'ADVERTENCIA_1_2S' | 'FUERA_DE_RANGO_1_3S';
    manualValues?: Record<QCParamKey, number>;
  }) => ActionResult<QCRun>;
  runAutomaticAQC: (input: {
    levelId: string;
    mode?: 'CONFORME' | 'ADVERTENCIA_1_2S' | 'FUERA_DE_RANGO_1_3S';
  }) => ActionResult<QCRun>;
  createQCLevel: (level: Omit<QCLevel, 'id'>) => ActionResult;
  updateQCLot: (levelId: string, lotNumber: string, expiryDate: string) => ActionResult;
  updateQCNonConformity: (
    ncId: string,
    patch: Partial<Pick<QCNonConformity, 'possibleCauses' | 'investigation' | 'correctiveAction' | 'status' | 'repeatedRunId'>>
  ) => ActionResult;
  setQCBlocked: (blocked: boolean) => ActionResult;

  // Calibrations
  triggerCalibration: (
    type: CalibrationRecord['type'],
    outcome: CalibrationStatus,
    reason: string
  ) => ActionResult<CalibrationRecord>;
  runQuickCalibration: (
    type: CalibrationRecord['type'],
    outcome: CalibrationStatus
  ) => ActionResult<CalibrationRecord>;

  // Consumables
  replaceConsumable: (consumableId: string, newLot: string, newExpiry: string) => ActionResult;
  simulateConsumableStatus: (consumableId: string, levelPercent: number, status?: ConsumableItem['status']) => ActionResult;

  // Maintenance & Diagnostics
  resolveMaintenanceError: (errorId: string, resolutionNote: string) => ActionResult;
  triggerMaintenanceError: (input: {
    code: string;
    description: string;
    possibleCause: string;
    recommendedChecks: string[];
    severity: MaintenanceError['severity'];
    forceUnavailable?: boolean;
  }) => ActionResult;
  logMaintenanceIntervention: (input: Omit<MaintenanceIntervention, 'id' | 'timestamp'>) => ActionResult;
  runDiagnosticCheck: (forceComponentFault?: boolean) => ActionResult;
  setAnalyzerMaintenanceMode: (enabled: boolean) => ActionResult;

  // Atellica Connect Communications
  markAtellicaRead: (messageId: string) => ActionResult;
  confirmAtellicaReception: (messageId: string) => ActionResult;
  archiveAtellicaMessage: (messageId: string) => ActionResult;
  sendAtellicaOutbox: (input: {
    category: SentMessageCategory;
    subject: string;
    body: string;
    relatedMessageId?: string;
  }) => ActionResult<SentAtellicaMessage>;
  simulateIncomingAtellica: (input: {
    title: string;
    body: string;
    type: AtellicaMessageType;
    priority: AtellicaMessagePriority;
    sender: string;
    titleEs?: string;
    titleEn?: string;
    bodyEs?: string;
    bodyEn?: string;
    senderEs?: string;
    senderEn?: string;
  }) => ActionResult<AtellicaMessage>;
  triggerDemoAtellicaMessage: () => ActionResult<AtellicaMessage>;
  setCommunicationStatus: (status: AnalyzerStoreState['communicationStatus']) => ActionResult;

  // Config & Users & Demo Center
  updateAnalyzerConfig: (newConfig: AnalyzerConfig, summary: string) => ActionResult;
  addUser: (user: Omit<UserAccount, 'id'>) => ActionResult;
  updateUser: (userId: string, patch: Partial<Pick<UserAccount, 'role' | 'active' | 'department' | 'fullName'>>) => ActionResult;
  restoreOperationalState: () => ActionResult;
  resetDemoDatabase: () => Promise<ActionResult>;
}

const AnalyzerContext = createContext<AnalyzerContextValue | null>(null);

const GUEST_ADMIN_USER: UserAccount = {
  id: 'USR-ADMIN-FREE',
  username: 'admin.libre',
  passwordDemo: '',
  fullName: 'Administrador (Sin identificación)',
  role: 'ADMINISTRADOR',
  department: 'Acceso Libre · POCT',
  active: true,
};

function computeAnalyzerStatus(next: AnalyzerStoreState, manualMaintenance = false): AnalyzerStatus {
  if (manualMaintenance || next.analyzerStatus === 'MANTENIMIENTO') {
    return 'MANTENIMIENTO';
  }
  const hasCriticalError = next.maintenanceErrors.some(
    (e) => e.status !== 'RESUELTA' && e.severity === 'Crítica'
  );
  const hasExhaustedCartridge = next.consumables.some(
    (c) => (c.category === 'Cartucho' || c.category === 'Solución') && (c.status === 'AGOTADO' || c.status === 'CADUCADO')
  );
  if (hasCriticalError || hasExhaustedCartridge) {
    return 'NO_DISPONIBLE';
  }

  const hasWarningError = next.maintenanceErrors.some((e) => e.status !== 'RESUELTA');
  const hasFailedLastCal = next.calibrations[0]?.status === 'FALLIDA';
  const hasLowConsumable = next.consumables.some((c) => c.status === 'BAJO' || c.status === 'AGOTADO');
  const hasPendingCal = next.calibrations[0]?.status === 'PENDIENTE' || next.calibrations[0]?.status === 'INTERRUMPIDA';
  const hasOpenQC = next.qcNonConformities.some((nc) => nc.status !== 'RESUELTA');
  const hasDiagWarn = next.diagnosticComponents.some((d) => d.status !== 'OK');

  if (
    hasWarningError ||
    hasFailedLastCal ||
    hasLowConsumable ||
    hasPendingCal ||
    hasOpenQC ||
    hasDiagWarn ||
    next.communicationStatus === 'DESCONECTADO'
  ) {
    return 'OPERATIVO_CON_ADVERTENCIAS';
  }

  return 'OPERATIVO';
}

export const AnalyzerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AnalyzerStoreState>(() => createDemoSeedState());
  const [hydrated, setHydrated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('rp500e_user_id');
    } catch {
      return null;
    }
  });
  const [activeMode, setActiveMode] = useState<OperatingMode | null>(() => {
    try {
      const uid = sessionStorage.getItem('rp500e_user_id');
      const m = sessionStorage.getItem('rp500e_mode');
      if (uid === GUEST_ADMIN_USER.id && m === 'LABORATORY') {
        return 'CLINICAL';
      }
      return m === 'CLINICAL' || m === 'LABORATORY' ? m : null;
    } catch {
      return null;
    }
  });
  const [requireLogin, setRequireLoginState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rp500e_require_login') === 'true';
    } catch {
      return false;
    }
  });
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('rp500e_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const setRequireLogin = useCallback((required: boolean) => {
    setRequireLoginState(required);
    try {
      localStorage.setItem('rp500e_require_login', String(required));
    } catch {
      // ignore
    }
  }, []);

  const [desynchronizeEvents, setDesynchronizeEvents] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rp500e_desync_events') === 'true';
    } catch {
      return false;
    }
  });
  const [desyncPopupMode, setDesyncPopupMode] = useState<'ON' | 'OFF' | null>(null);

  const [language, setLanguageState] = useState<Language>(() => {
    try {
      return localStorage.getItem('rp500e_lang') === 'es' ? 'es' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('rp500e_lang', lang);
    } catch {
      // ignore
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next: Language = prev === 'es' ? 'en' : 'es';
      try {
        localStorage.setItem('rp500e_lang', next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('rp500e_theme', next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleDesynchronizeEvents = useCallback(() => {
    setDesynchronizeEvents((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('rp500e_desync_events', String(next));
      } catch {
        // ignore
      }
      setDesyncPopupMode(next ? 'ON' : 'OFF');
      return next;
    });
  }, []);

  const dismissDesyncPopup = useCallback(() => {
    setDesyncPopupMode(null);
  }, []);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [clotPortOverlayOpen, setClotPortOverlayOpen] = useState(false);
  const [loginAtellicaPopupOpen, setLoginAtellicaPopupOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [screensaverOpen, setScreensaverOpen] = useState(false);
  const [navRequest, setNavRequest] = useState<{
    mode: OperatingMode;
    target: string;
    nonce: number;
    recordId?: string;
  } | null>(null);

  const requestNav = useCallback((mode: OperatingMode, target: string, recordId?: string) => {
    setNavRequest({ mode, target, nonce: Date.now(), recordId });
  }, []);

  useEffect(() => {
    let mounted = true;
    loadPersistedState().then((persisted) => {
      if (!mounted) return;
      if (persisted && persisted.records && persisted.config) {
        const freshSeed = createDemoSeedState();
        const existingUserIds = new Set((persisted.users ?? []).map((u) => u.id));
        const mergedUsers = [
          ...(persisted.users ?? []),
          ...freshSeed.users.filter((u) => !existingUserIds.has(u.id)),
        ];

        const existingAuditIds = new Set((persisted.auditLogs ?? []).map((a) => a.id));
        const hasSeededLogins = (persisted.auditLogs ?? []).some((a) =>
          a.id.startsWith('AUD-LOG-')
        );
        const mergedAuditLogs = hasSeededLogins
          ? persisted.auditLogs
          : [
              ...(persisted.auditLogs ?? []),
              ...freshSeed.auditLogs.filter(
                (a) => a.id.startsWith('AUD-LOG-') && !existingAuditIds.has(a.id)
              ),
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const existingErrorIds = new Set((persisted.maintenanceErrors ?? []).map((e) => e.id));
        const hasResolvedCritical = (persisted.maintenanceErrors ?? []).some(
          (e) => e.severity === 'Crítica' && e.status === 'RESUELTA'
        );
        const mergedErrors = hasResolvedCritical
          ? persisted.maintenanceErrors
          : [
              ...(persisted.maintenanceErrors ?? []),
              ...freshSeed.maintenanceErrors.filter(
                (e) => e.severity === 'Crítica' && !existingErrorIds.has(e.id)
              ),
            ];

        const cleaned: AnalyzerStoreState = {
          ...persisted,
          users: mergedUsers,
          auditLogs: mergedAuditLogs,
          maintenanceErrors: mergedErrors,
          qcBlocked: false,
        };
        cleaned.analyzerStatus = computeAnalyzerStatus(cleaned);
        setState(cleaned);
      } else {
        const seed = createDemoSeedState();
        setState(seed);
        savePersistedState(seed);
      }
      setHydrated(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback((updater: (prev: AnalyzerStoreState) => AnalyzerStoreState) => {
    setState((prev) => {
      const next = updater(prev);
      savePersistedState(next);
      return next;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `TST-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const currentUser = useMemo(() => {
    if (currentUserId === GUEST_ADMIN_USER.id) {
      return GUEST_ADMIN_USER;
    }
    return state.users.find((u) => u.id === currentUserId) ?? null;
  }, [state.users, currentUserId]);

  const can = useCallback(
    (permission: Permission) => hasPermission(currentUser?.role, permission),
    [currentUser]
  );

  const appendAudit = (
    prev: AnalyzerStoreState,
    user: UserAccount | null,
    module: AuditModule,
    action: string,
    details: string
  ): AuditLogEntry[] => {
    const entry: AuditLogEntry = {
      id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      userId: user?.id ?? 'SYSTEM',
      userName: user?.fullName ?? 'Sistema',
      userRole: user?.role ?? 'ADMINISTRADOR',
      module,
      action,
      details,
    };
    return [entry, ...prev.auditLogs].slice(0, 400);
  };

  const requirePermission = useCallback(
    (permission: Permission, actionName: string): ActionResult => {
      if (!currentUser) {
        return { ok: false, error: 'Sesión no iniciada.' };
      }
      if (!hasPermission(currentUser.role, permission)) {
        persist((prev) => ({
          ...prev,
          auditLogs: appendAudit(
            prev,
            currentUser,
            'ACCESOS',
            'Acción bloqueada por permisos',
            `Intento no autorizado de "${actionName}" por perfil ${currentUser.role}.`
          ),
        }));
        pushToast({
          tone: 'error',
          title: 'Acción denegada',
          message: `El perfil ${currentUser.role} no tiene permiso para ${actionName}.`,
        });
        return { ok: false, error: `Permiso insuficiente para ${actionName}.` };
      }
      return { ok: true };
    },
    [currentUser, persist, pushToast]
  );

  const login = useCallback(
    (username: string, password: string): ActionResult<UserAccount> => {
      const found = state.users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      );
      if (!found) {
        return { ok: false, error: 'Usuario no encontrado en el registro del analizador.' };
      }
      if (!found.active) {
        return { ok: false, error: 'Cuenta desactivada. Contacte con el Administrador.' };
      }
      if (found.passwordDemo !== password) {
        return { ok: false, error: 'Contraseña incorrecta.' };
      }

      const now = new Date().toISOString();
      setNavRequest(null);
      setClotPortOverlayOpen(false);
      setCurrentUserId(found.id);
      setActiveMode(null);
      setLoginAtellicaPopupOpen(true);
      try {
        sessionStorage.setItem('rp500e_user_id', found.id);
        sessionStorage.removeItem('rp500e_mode');
      } catch {
        // ignore
      }

      persist((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === found.id ? { ...u, lastLogin: now } : u)),
        auditLogs: appendAudit(
          prev,
          found,
          'ACCESOS',
          'Inicio de sesión',
          `Acceso autorizado como ${found.fullName} (${found.role}).`
        ),
      }));
      return { ok: true, data: found };
    },
    [state.users, persist]
  );

  const loginWithoutAuth = useCallback((): ActionResult<UserAccount> => {
    setNavRequest(null);
    setClotPortOverlayOpen(false);
    setCurrentUserId(GUEST_ADMIN_USER.id);
    setActiveMode(null);
    setLoginAtellicaPopupOpen(true);
    try {
      sessionStorage.setItem('rp500e_user_id', GUEST_ADMIN_USER.id);
      sessionStorage.removeItem('rp500e_mode');
    } catch {
      // ignore
    }
    persist((prev) => ({
      ...prev,
      auditLogs: appendAudit(
        prev,
        GUEST_ADMIN_USER,
        'ACCESOS',
        'Acceso sin identificación',
        'Acceso directo sin identificación con derechos de Administrador.'
      ),
    }));
    return { ok: true, data: GUEST_ADMIN_USER };
  }, [persist]);

  const dismissLoginAtellicaPopup = useCallback(() => {
    setLoginAtellicaPopupOpen(false);
  }, []);

  const confirmLoginAtellicaPopup = useCallback(() => {
    setLoginAtellicaPopupOpen(false);
    if (currentUser) {
      persist((prev) => ({
        ...prev,
        auditLogs: appendAudit(
          prev,
          currentUser,
          'COMUNICACIONES',
          'Confirmación lectura aviso Atellica al login',
          'Confirmada lectura de aviso: "Antes de iros cambiar el cartucho M, caduca este fin de semana".'
        ),
      }));
    }
    pushToast({
      tone: 'success',
      title: 'Lectura confirmada',
      message: 'Aviso de Atellica Connect registrado en auditoría.',
    });
  }, [currentUser, persist, pushToast]);

  const logout = useCallback(() => {
    const user = currentUser;
    setNavRequest(null);
    setClotPortOverlayOpen(false);
    setCurrentUserId(null);
    setActiveMode(null);
    setLoginAtellicaPopupOpen(false);
    try {
      sessionStorage.removeItem('rp500e_user_id');
      sessionStorage.removeItem('rp500e_mode');
    } catch {
      // ignore
    }
    if (user) {
      persist((prev) => ({
        ...prev,
        auditLogs: appendAudit(prev, user, 'ACCESOS', 'Cierre de sesión', `Sesión finalizada por ${user.fullName}.`),
      }));
    }
  }, [currentUser, persist]);

  const setMode = useCallback(
    (mode: OperatingMode): ActionResult => {
      if (!currentUser) return { ok: false, error: 'Debe iniciar sesión.' };
      if (mode === 'LABORATORY' && currentUser.id === GUEST_ADMIN_USER.id) {
        persist((prev) => ({
          ...prev,
          auditLogs: appendAudit(
            prev,
            currentUser,
            'ACCESOS',
            'Acceso a Modo Laboratorio denegado',
            'Intento de acceso a Modo Laboratorio sin identificación de operador.'
          ),
        }));
        pushToast({
          tone: 'error',
          title: 'Solo disponible en Modo Clínico',
          message: 'La opción sin identificar solo está disponible para Modo Clínico.',
        });
        return { ok: false, error: 'La opción sin identificar solo está disponible para Modo Clínico.' };
      }
      if (mode === 'LABORATORY' && !hasPermission(currentUser.role, 'ACCESS_LAB_MODE')) {
        persist((prev) => ({
          ...prev,
          auditLogs: appendAudit(
            prev,
            currentUser,
            'ACCESOS',
            'Acceso a Modo Laboratorio denegado',
            `Perfil ${currentUser.role} intentó acceder a Modo Laboratorio.`
          ),
        }));
        pushToast({
          tone: 'error',
          title: 'Acceso restringido',
          message: 'El perfil Enfermería solo está autorizado para Modo Clínico.',
        });
        return { ok: false, error: 'El perfil actual no tiene acceso al Modo Laboratorio.' };
      }
      setNavRequest(null);
      setClotPortOverlayOpen(false);
      setActiveMode(mode);
      try {
        sessionStorage.setItem('rp500e_mode', mode);
      } catch {
        // ignore
      }
      persist((prev) => ({
        ...prev,
        auditLogs: appendAudit(
          prev,
          currentUser,
          'ACCESOS',
          'Selección de entorno',
          `Cambio a ${mode === 'CLINICAL' ? 'Modo Clínico' : 'Modo Laboratorio'}.`
        ),
      }));
      return { ok: true };
    },
    [currentUser, persist, pushToast]
  );

  const executeBloodGas: AnalyzerContextValue['executeBloodGas'] = useCallback(
    (input) => {
      const check = requirePermission('PERFORM_ANALYSIS', 'realizar gasometría');
      if (!check.ok || !currentUser) return { ok: false, error: check.error };

      if (state.analyzerStatus === 'MANTENIMIENTO') {
        return { ok: false, error: 'Equipo en modo MANTENIMIENTO. No se permiten determinaciones.' };
      }
      if (state.analyzerStatus === 'NO_DISPONIBLE') {
        return {
          ok: false,
          error: 'Analizador NO DISPONIBLE (incidencia crítica o consumible agotado).',
        };
      }

      const now = new Date().toISOString();

      // Handle preanalytical/mechanical failure simulations (no clinical result emitted)
      if (
        input.outcome === 'MUESTRA_INSUFICIENTE' ||
        input.outcome === 'COAGULO' ||
        input.outcome === 'ERROR_ASPIRACION' ||
        input.outcome === 'ERROR_ANALITICO'
      ) {
        const errorMap: Record<
          'MUESTRA_INSUFICIENTE' | 'COAGULO' | 'ERROR_ASPIRACION' | 'ERROR_ANALITICO',
          {
            code: string;
            desc: string;
            cause: string;
            checks: string[];
            severity: MaintenanceError['severity'];
          }
        > = {
          MUESTRA_INSUFICIENTE: {
            code: 'E-112',
            desc: `Muestra insuficiente detectada en puerto de entrada (Paciente ${input.patientId}).`,
            cause: 'Volumen aspirado inferior a 100 µL o presencia de burbuja de aire en punta de jeringa.',
            checks: [
              'Comprobar llenado mínimo de jeringa/capilar (>100 µL).',
              'Purgar burbuja apical antes de presentar la muestra.',
            ],
            severity: 'Baja',
          },
          COAGULO: {
            code: 'E-304',
            desc: `Detección de coágulo en circuito de aspiración (Paciente ${input.patientId}).`,
            cause: 'Falta de homogeneización o jeringa sin anticoagulante heparina balanceada.',
            checks: [
              'Ejecutar lavado intensivo automático.',
              'Repetir extracción asegurando inversión suave 10 veces.',
            ],
            severity: 'Alta',
          },
          ERROR_ASPIRACION: {
            code: 'E-208',
            desc: `Error de aspiración en bomba peristáltica (Paciente ${input.patientId}).`,
            cause: 'Obstrucción parcial de sonda o sellado deficiente contra el puerto luer.',
            checks: [
              'Verificar acoplamiento firme de jeringa sin aguja.',
              'Ejecutar diagnóstico de fluídica si se repite.',
            ],
            severity: 'Media',
          },
          ERROR_ANALITICO: {
            code: 'E-419',
            desc: `Error analítico de lectura en bloque de sensores (Paciente ${input.patientId}).`,
            cause: 'Inestabilidad transitoria de electrodo o interferencia química severa.',
            checks: [
              'Ejecutar calibración de 1 punto y verificar estado de sensores.',
              'Repetir análisis con nueva muestra.',
            ],
            severity: 'Alta',
          },
        };

        const info = errorMap[input.outcome];
        const newErr: MaintenanceError = {
          id: `ERR-${Date.now().toString(36).toUpperCase()}`,
          code: info.code,
          timestamp: now,
          description: info.desc,
          possibleCause: info.cause,
          recommendedChecks: info.checks,
          severity: info.severity,
          status: 'ACTIVA',
        };

        persist((prev) => {
          const nextState: AnalyzerStoreState = {
            ...prev,
            maintenanceErrors: [newErr, ...prev.maintenanceErrors],
            counters: {
              ...prev.counters,
              aspirations: prev.counters.aspirations + 1,
              washCycles: prev.counters.washCycles + 1,
            },
            auditLogs: appendAudit(
              prev,
              currentUser,
              'DETERMINACIONES',
              `Fallo de análisis (${info.code})`,
              `${info.desc} Operador: ${input.operatorName || currentUser.fullName}.`
            ),
          };
          nextState.analyzerStatus = computeAnalyzerStatus(nextState);
          return nextState;
        });

        pushToast({
          tone: 'error',
          title: `Incidencia ${info.code}`,
          message: info.desc,
        });
        return { ok: false, error: `${info.code}: ${info.desc}` };
      }

      const isQuick = Boolean(input.isQuickMeasurement);
      const nowDate = new Date(now);
      let uniqueQuickId: string | undefined;
      if (isQuick) {
        const base =
          input.provisionalId && /^BG-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}/.test(input.provisionalId)
            ? input.provisionalId
            : `BG-${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(
                2,
                '0'
              )}-${String(nowDate.getDate()).padStart(2, '0')}-${String(nowDate.getHours()).padStart(
                2,
                '0'
              )}-${String(nowDate.getMinutes()).padStart(2, '0')}`;
        const usedIds = new Set(
          state.records.map((r) => r.analysisUniqueId).filter(Boolean) as string[]
        );
        if (!usedIds.has(base)) {
          uniqueQuickId = base;
        } else {
          let seq = 2;
          while (usedIds.has(`${base}-${String(seq).padStart(2, '0')}`)) {
            seq += 1;
          }
          uniqueQuickId = `${base}-${String(seq).padStart(2, '0')}`;
        }
      }

      const sampleNum = uniqueQuickId ?? `RP-${String(1001 + state.records.length).padStart(4, '0')}`;
      const record = buildBloodGasRecord({
        sampleNumber: sampleNum,
        analysisUniqueId: uniqueQuickId,
        isQuickMeasurement: isQuick,
        quickReference: isQuick ? input.quickReference : undefined,
        measuredMode: input.measuredMode ?? activeMode ?? 'CLINICAL',
        identificationStatus: isQuick ? 'PENDIENTE_IDENTIFICACION' : 'IDENTIFICADA_TRANSMITIDA',
        patientId: isQuick ? 'SIN IDENTIFICAR' : input.patientId,
        patientDemographics: isQuick ? undefined : input.patientDemographics,
        patientLocation: isQuick ? 'Pendiente de asignar' : input.patientLocation,
        sampleType: input.sampleType,
        operatorId: currentUser.id,
        operatorName: input.operatorName || currentUser.fullName,
        fio2: input.fio2,
        temperatureC: input.temperatureC,
        extractionMinutesAgo: input.extractionMinutesAgo,
        processingSeconds: 56 + Math.floor(Math.random() * 8),
        scenario: input.scenario,
        outcome: input.outcome,
        previousRecords: isQuick ? [] : state.records,
        config: state.config,
        timestamp: now,
        preanalyticalChecklist: input.preanalyticalChecklist,
        customMeasured: input.customMeasured,
      });

      persist((prev) => {
        const updatedConsumables = prev.consumables.map((c) => {
          if (c.id === 'CONS-01' && c.remainingTests !== undefined && c.maxTests) {
            const rem = Math.max(0, c.remainingTests - 1);
            const pct = Math.round((rem / c.maxTests) * 100);
            return {
              ...c,
              remainingTests: rem,
              levelPercent: pct,
              status: rem === 0 ? ('AGOTADO' as const) : pct <= 20 ? ('BAJO' as const) : ('OK' as const),
            };
          }
          if (c.id === 'CONS-02') {
            const maxT = c.maxTests ?? 500;
            const currentRem = c.remainingTests ?? Math.round((c.levelPercent / 100) * maxT);
            const rem = Math.max(0, currentRem - 1);
            const pct = Number(((rem / maxT) * 100).toFixed(1));
            return {
              ...c,
              maxTests: maxT,
              remainingTests: rem,
              levelPercent: pct,
              status: rem === 0 ? ('AGOTADO' as const) : pct <= 20 ? ('BAJO' as const) : ('OK' as const),
            };
          }
          return c;
        });

        const nextState: AnalyzerStoreState = {
          ...prev,
          records: [record, ...prev.records],
          consumables: updatedConsumables,
          counters: {
            ...prev.counters,
            totalSamples: prev.counters.totalSamples + 1,
            cartridgeTests: prev.counters.cartridgeTests + 1,
            aspirations: prev.counters.aspirations + 1,
            washCycles: prev.counters.washCycles + 1,
          },
          auditLogs: appendAudit(
            prev,
            currentUser,
            'DETERMINACIONES',
            isQuick ? 'Medición rápida (Pendiente de identificación)' : 'Gasometría completada',
            isQuick
              ? `Análisis ${record.analysisUniqueId ?? record.sampleNumber} (${record.sampleType}) guardado como PENDIENTE DE IDENTIFICACIÓN. No transmitido a LIS.`
              : `Muestra ${record.sampleNumber} (${record.sampleType}) · Paciente ${record.patientId} · Alertas críticas: ${record.hasCriticalValues ? 'SÍ' : 'No'} · Incoherencias: ${record.validationIssues.length}.`
          ),
        };
        nextState.analyzerStatus = computeAnalyzerStatus(nextState);
        return nextState;
      });

      if (isQuick) {
        pushToast({
          tone: 'warning',
          title: 'Medición rápida guardada',
          message: `ID único ${record.analysisUniqueId} guardado como PENDIENTE DE IDENTIFICACIÓN.`,
        });
      } else if (record.hasCriticalValues) {
        pushToast({
          tone: 'error',
          title: 'Resultado Crítico Detectado',
          message: `Muestra ${record.sampleNumber} (${record.patientId}) requiere confirmación de lectura.`,
        });
      } else if (record.validationIssues.length > 0) {
        pushToast({
          tone: 'warning',
          title: 'Avisos de Validación',
          message: `Se han detectado ${record.validationIssues.length} observaciones de coherencia.`,
        });
      } else {
        pushToast({
          tone: 'success',
          title: 'Gasometría completada',
          message: `Muestra ${record.sampleNumber} almacenada en histórico.`,
        });
      }

      return { ok: true, data: record };
    },
    [activeMode, currentUser, persist, pushToast, requirePermission, state.analyzerStatus, state.config, state.records]
  );

  const identifyBloodGasRecord: AnalyzerContextValue['identifyBloodGasRecord'] = useCallback(
    (input) => {
      if (!currentUser) return { ok: false, error: 'Sesión no iniciada.' };
      const target = state.records.find((r) => r.id === input.recordId);
      if (!target) return { ok: false, error: 'Análisis no encontrado.' };

      const cleanPatient = input.patientId.trim().toUpperCase();
      if (!/^[A-Z0-9-]{4,16}$/.test(cleanPatient)) {
        return { ok: false, error: 'Introduzca un identificador de paciente/laboratorio válido.' };
      }

      const alreadyIdentified =
        target.identificationStatus !== undefined &&
        target.identificationStatus !== 'PENDIENTE_IDENTIFICACION';
      if (alreadyIdentified && !input.isCorrection && target.patientId !== cleanPatient) {
        return {
          ok: false,
          error:
            'Este análisis ya está asociado a un paciente. Utilice la operación auditada de Corrección de identificación.',
        };
      }

      const now = new Date().toISOString();
      const actionType = alreadyIdentified ? 'CORRECCION_IDENTIFICACION' : 'IDENTIFICACION_INICIAL';
      const auditEntry = {
        timestamp: now,
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: actionType as 'IDENTIFICACION_INICIAL' | 'CORRECCION_IDENTIFICACION',
        previousPatientId: target.patientId,
        newPatientId: cleanPatient,
        details: alreadyIdentified
          ? `Corrección auditada de identificación en ${target.analysisUniqueId ?? target.sampleNumber}: ${target.patientId} -> ${cleanPatient} (${input.patientLocation}).`
          : `Identificación completada para ${target.analysisUniqueId ?? target.sampleNumber}: paciente ${cleanPatient} (${input.sampleMetadata.service || input.patientLocation}).`,
      };

      // Update ONLY identifying & sample metadata; NEVER mutate target.values, target.flags, or original operator/timestamp
      const updatedRecord: BloodGasRecord = {
        ...target,
        patientId: cleanPatient,
        patientDemographics: input.patientDemographics ?? target.patientDemographics,
        patientLocation: input.patientLocation,
        sampleType: input.sampleType,
        fio2: input.fio2,
        temperatureC: input.temperatureC,
        sampleMetadata: input.sampleMetadata,
        identificationStatus: 'IDENTIFICADA_PENDIENTE_LIS',
        identifiedAt: now,
        identifiedById: currentUser.id,
        identifiedByName: currentUser.fullName,
        identificationAudit: [...(target.identificationAudit ?? []), auditEntry],
      };

      persist((prev) => ({
        ...prev,
        records: prev.records.map((r) => (r.id === target.id ? updatedRecord : r)),
        auditLogs: appendAudit(
          prev,
          currentUser,
          'DETERMINACIONES',
          alreadyIdentified ? 'Corrección de identificación' : 'Identificación posterior completada',
          auditEntry.details
        ),
      }));

      pushToast({
        tone: 'success',
        title: alreadyIdentified ? 'Identificación corregida' : 'Identificación guardada',
        message: `${target.analysisUniqueId ?? target.sampleNumber} asociada a ${cleanPatient} (lista para imprimir y enviar a LIS).`,
      });
      return { ok: true, data: updatedRecord };
    },
    [currentUser, persist, pushToast, state.records]
  );

  const transmitRecordToLis: AnalyzerContextValue['transmitRecordToLis'] = useCallback(
    (recordId) => {
      if (!currentUser) return { ok: false, error: 'Sesión no iniciada.' };
      const target = state.records.find((r) => r.id === recordId);
      if (!target) return { ok: false, error: 'Análisis no encontrado.' };
      if (target.identificationStatus === 'PENDIENTE_IDENTIFICACION') {
        pushToast({
          tone: 'error',
          title: 'Transmisión bloqueada',
          message: 'No se pueden enviar resultados al LIS mientras estén pendientes de identificación.',
        });
        return { ok: false, error: 'Muestra pendiente de identificación.' };
      }

      const now = new Date().toISOString();
      const updatedRecord: BloodGasRecord = {
        ...target,
        identificationStatus: 'IDENTIFICADA_TRANSMITIDA',
        lisTransmittedAt: now,
        lisTransmittedBy: currentUser.fullName,
        identificationAudit: [
          ...(target.identificationAudit ?? []),
          {
            timestamp: now,
            userId: currentUser.id,
            userName: currentUser.fullName,
            action: 'ENVIO_LIS',
            newPatientId: target.patientId,
            details: `Resultado ${target.analysisUniqueId ?? target.sampleNumber} (Paciente ${target.patientId}) transmitido a LIS/HCE por ${currentUser.fullName}.`,
          },
        ],
      };

      persist((prev) => ({
        ...prev,
        records: prev.records.map((r) => (r.id === target.id ? updatedRecord : r)),
        auditLogs: appendAudit(
          prev,
          currentUser,
          'COMUNICACIONES',
          'Transmisión a LIS completada',
          `Enviado resultado ${target.analysisUniqueId ?? target.sampleNumber} (Paciente ${target.patientId}) a LIS/HCE.`
        ),
      }));

      pushToast({
        tone: 'success',
        title: 'Enviado a LIS',
        message: `Resultado ${target.analysisUniqueId ?? target.sampleNumber} transmitido correctamente.`,
      });
      return { ok: true, data: updatedRecord };
    },
    [currentUser, persist, pushToast, state.records]
  );

  const acknowledgeCriticalAlert = useCallback(
    (recordId: string, note?: string): ActionResult => {
      const check = requirePermission('CONFIRM_CRITICAL_ALERT', 'confirmar lectura de alerta crítica');
      if (!check.ok || !currentUser) return check;
      const now = new Date().toISOString();
      persist((prev) => ({
        ...prev,
        records: prev.records.map((r) =>
          r.id === recordId
            ? {
                ...r,
                criticalAck: {
                  acknowledged: true,
                  userId: currentUser.id,
                  userName: currentUser.fullName,
                  timestamp: now,
                  note: note || 'Lectura de valores críticos confirmada por operador.',
                },
              }
            : r
        ),
        auditLogs: appendAudit(
          prev,
          currentUser,
          'DETERMINACIONES',
          'Confirmación de alerta crítica',
          `Confirmada lectura de valores críticos en registro ${recordId}.`
        ),
      }));
      pushToast({ tone: 'success', title: 'Alerta crítica confirmada', message: 'Registro trazado en auditoría.' });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const setRecordValidationStatus = useCallback(
    (recordId: string, status: ResultValidationStatus): ActionResult => {
      if (!currentUser) return { ok: false, error: 'Sesión no iniciada.' };
      const allowClinicalNursingAction =
        activeMode === 'CLINICAL' && hasPermission(currentUser.role, 'PERFORM_ANALYSIS');
      if (!allowClinicalNursingAction) {
        const check = requirePermission('VALIDATE_RESULTS', 'validar o rechazar resultados');
        if (!check.ok) return check;
      }
      const now = new Date().toISOString();
      persist((prev) => ({
        ...prev,
        records: prev.records.map((r) =>
          r.id === recordId
            ? {
                ...r,
                validationStatus: status,
                validatedBy: currentUser.fullName,
                validatedAt: now,
              }
            : r
        ),
        auditLogs: appendAudit(
          prev,
          currentUser,
          'DETERMINACIONES',
          status === 'RECHAZADO' ? 'Muestra cancelada' : `Validación de resultado (${status})`,
          `Registro ${recordId} marcado como ${status} por ${currentUser.fullName}.`
        ),
      }));
      pushToast({
        tone: status === 'RECHAZADO' ? 'warning' : 'success',
        title:
          language === 'en'
            ? status === 'RECHAZADO'
              ? 'Sample cancelled'
              : status === 'VALIDADO'
                ? 'Results validated'
                : `Status updated: ${status}`
            : status === 'RECHAZADO'
              ? 'Muestra cancelada'
              : status === 'VALIDADO'
                ? 'Resultados validados'
                : `Estado actualizado: ${status}`,
      });
      return { ok: true };
    },
    [activeMode, currentUser, language, persist, pushToast, requirePermission]
  );

  const reportIncident = useCallback(
    (title: string, description: string, severity: MaintenanceError['severity']): ActionResult => {
      const check = requirePermission('REPORT_INCIDENT', 'registrar incidencia');
      if (!check.ok || !currentUser) return check;
      const now = new Date().toISOString();
      const err: MaintenanceError = {
        id: `ERR-${Date.now().toString(36).toUpperCase()}`,
        code: 'INC-USR',
        timestamp: now,
        description: `${title}: ${description}`,
        possibleCause: 'Incidencia notificada manualmente por operador.',
        recommendedChecks: ['Revisar descripción del operador y verificar estado del equipo.'],
        severity,
        status: 'ACTIVA',
      };
      persist((prev) => {
        const next: AnalyzerStoreState = {
          ...prev,
          maintenanceErrors: [err, ...prev.maintenanceErrors],
          auditLogs: appendAudit(prev, currentUser, 'MANTENIMIENTO', 'Registro de incidencia', `${title} (${severity}).`),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });
      pushToast({ tone: 'warning', title: 'Incidencia registrada', message: title });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const runQC: AnalyzerContextValue['runQC'] = useCallback(
    (input) => {
      const check = requirePermission('MANAGE_QC', 'ejecutar control de calidad');
      if (!check.ok || !currentUser) return { ok: false, error: check.error };
      const level = state.qcLevels.find((l) => l.id === input.levelId);
      if (!level) return { ok: false, error: 'Nivel de control no encontrado.' };

      const now = new Date().toISOString();
      const vals = input.manualValues ?? simulateQCValues(level, input.mode ?? 'CONFORME');
      const run = evaluateQCRun({
        level,
        values: vals,
        priorRunsForLevel: state.qcRuns,
        qcSettings: state.config.qcSettings,
        operatorId: currentUser.id,
        operatorName: currentUser.fullName,
        timestamp: now,
      });

      const newNCs: QCNonConformity[] = [];
      if (run.status === 'NO_CONFORME') {
        const rejectRules = run.violatedRules.filter((v) => v.severity === 'REJECT');
        rejectRules.forEach((vr) => {
          newNCs.push({
            id: `NC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
            qcRunId: run.id,
            levelName: level.name,
            parameter: vr.parameter,
            rule: vr.rule,
            detectedAt: now,
            possibleCauses: vr.description,
            investigation: '',
            correctiveAction: '',
            status: 'ABIERTA',
            responsibleName: currentUser.fullName,
          });
        });
      }

      persist((prev) => {
        const next: AnalyzerStoreState = {
          ...prev,
          qcRuns: [run, ...prev.qcRuns],
          qcNonConformities: [...newNCs, ...prev.qcNonConformities],
          qcBlocked: false,
          auditLogs: appendAudit(
            prev,
            currentUser,
            'CONTROL_CALIDAD',
            `Control ${level.name}: ${run.status}`,
            `Lote ${level.lotNumber} · Reglas activadas: ${run.violatedRules.length > 0 ? run.violatedRules.map((v) => `${v.parameter} (${v.rule})`).join(', ') : 'Ninguna'}.`
          ),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });

      if (run.status === 'NO_CONFORME') {
        pushToast({
          tone: 'warning',
          title: `CCI No Conforme (${level.name})`,
          message: 'Se ha registrado una no conformidad (medición de muestras activa).',
        });
      } else if (run.status === 'ADVERTENCIA') {
        pushToast({ tone: 'warning', title: `Advertencia CCI (${level.name})`, message: 'Regla 1_2s detectada.' });
      } else {
        pushToast({ tone: 'success', title: `CCI Conforme (${level.name})`, message: 'Dentro de criterios Westgard.' });
      }

      return { ok: true, data: run };
    },
    [currentUser, persist, pushToast, requirePermission, state.config.qcSettings, state.qcLevels, state.qcRuns]
  );

  const runAutomaticAQC: AnalyzerContextValue['runAutomaticAQC'] = useCallback(
    (input) => {
      const check = requirePermission('PERFORM_ANALYSIS', 'ejecutar control de calidad automático (AQC)');
      if (!check.ok || !currentUser) return { ok: false, error: check.error };
      const level = state.qcLevels.find((l) => l.id === input.levelId);
      if (!level) return { ok: false, error: 'Nivel de control AQC no encontrado.' };

      const now = new Date().toISOString();
      const vals = simulateQCValues(level, input.mode ?? 'CONFORME');
      const run = evaluateQCRun({
        level,
        values: vals,
        priorRunsForLevel: state.qcRuns,
        qcSettings: state.config.qcSettings,
        operatorId: currentUser.id,
        operatorName: currentUser.fullName,
        timestamp: now,
      });

      const newNCs: QCNonConformity[] = [];
      if (run.status === 'NO_CONFORME') {
        const rejectRules = run.violatedRules.filter((v) => v.severity === 'REJECT');
        rejectRules.forEach((vr) => {
          newNCs.push({
            id: `NC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
            qcRunId: run.id,
            levelName: level.name,
            parameter: vr.parameter,
            rule: vr.rule,
            detectedAt: now,
            possibleCauses: vr.description,
            investigation: '',
            correctiveAction: '',
            status: 'ABIERTA',
            responsibleName: currentUser.fullName,
          });
        });
      }

      persist((prev) => {
        const nextConsumables = prev.consumables.map((c) => {
          if (c.id !== 'CONS-03') return c;
          const nextRemaining = Math.max(0, (c.remainingTests ?? 100) - 1);
          const nextPct = c.maxTests ? Math.max(0, Math.round((nextRemaining / c.maxTests) * 100)) : Math.max(0, c.levelPercent - 1);
          return {
            ...c,
            remainingTests: nextRemaining,
            levelPercent: nextPct,
            status: nextPct === 0 ? ('AGOTADO' as const) : nextPct <= 25 ? ('BAJO' as const) : ('OK' as const),
          };
        });

        const next: AnalyzerStoreState = {
          ...prev,
          qcRuns: [run, ...prev.qcRuns],
          qcNonConformities: [...newNCs, ...prev.qcNonConformities],
          qcBlocked: false,
          consumables: nextConsumables,
          auditLogs: appendAudit(
            prev,
            currentUser,
            'CONTROL_CALIDAD',
            `AQC Automático (${level.name}): ${run.status}`,
            `Ejecución automática AQC · Lote ${level.lotNumber} · Resultado: ${run.status}.`
          ),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });

      if (run.status === 'NO_CONFORME') {
        pushToast({
          tone: 'warning',
          title: `AQC ${level.name}: NO SUPERADO`,
          message: 'Desviación Westgard detectada (parámetro marcado en amarillo).',
        });
      } else if (run.status === 'ADVERTENCIA') {
        pushToast({ tone: 'warning', title: `AQC ${level.name}: Advertencia`, message: 'Regla 1_2s detectada.' });
      } else {
        pushToast({ tone: 'success', title: `AQC ${level.name}: Superado`, message: 'Control automático conforme.' });
      }

      return { ok: true, data: run };
    },
    [currentUser, persist, pushToast, requirePermission, state.config.qcSettings, state.qcLevels, state.qcRuns]
  );

  const createQCLevel = useCallback(
    (level: Omit<QCLevel, 'id'>): ActionResult => {
      const check = requirePermission('MANAGE_QC', 'crear nivel de control');
      if (!check.ok || !currentUser) return check;
      const newLevel: QCLevel = { ...level, id: `QCL-${Date.now().toString(36).toUpperCase()}` };
      persist((prev) => ({
        ...prev,
        qcLevels: [...prev.qcLevels, newLevel],
        auditLogs: appendAudit(prev, currentUser, 'CONTROL_CALIDAD', 'Nuevo nivel de control', `${newLevel.name} (Lote ${newLevel.lotNumber}).`),
      }));
      pushToast({ tone: 'success', title: 'Nivel de control creado', message: newLevel.name });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const updateQCLot = useCallback(
    (levelId: string, lotNumber: string, expiryDate: string): ActionResult => {
      const check = requirePermission('MANAGE_QC', 'actualizar lote de control');
      if (!check.ok || !currentUser) return check;
      persist((prev) => ({
        ...prev,
        qcLevels: prev.qcLevels.map((l) => (l.id === levelId ? { ...l, lotNumber, expiryDate } : l)),
        auditLogs: appendAudit(prev, currentUser, 'CONTROL_CALIDAD', 'Actualización de lote QC', `Nivel ${levelId} → Lote ${lotNumber}.`),
      }));
      pushToast({ tone: 'success', title: 'Lote actualizado', message: lotNumber });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const updateQCNonConformity = useCallback(
    (
      ncId: string,
      patch: Partial<Pick<QCNonConformity, 'possibleCauses' | 'investigation' | 'correctiveAction' | 'status' | 'repeatedRunId'>>
    ): ActionResult => {
      const check = requirePermission('MANAGE_QC', 'gestionar no conformidad de QC');
      if (!check.ok || !currentUser) return check;
      const now = new Date().toISOString();
      persist((prev) => {
        const updatedNCs = prev.qcNonConformities.map((nc) =>
          nc.id === ncId
            ? {
                ...nc,
                ...patch,
                responsibleName: currentUser.fullName,
                resolvedAt: patch.status === 'RESUELTA' ? now : nc.resolvedAt,
              }
            : nc
        );
        const stillOpen = updatedNCs.some((nc) => nc.status !== 'RESUELTA');
        const next: AnalyzerStoreState = {
          ...prev,
          qcNonConformities: updatedNCs,
          qcBlocked: stillOpen ? prev.qcBlocked : false,
          auditLogs: appendAudit(
            prev,
            currentUser,
            'CONTROL_CALIDAD',
            'Actualización no conformidad QC',
            `No conformidad ${ncId} actualizada a estado ${patch.status ?? 'en curso'}.`
          ),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });
      pushToast({ tone: 'info', title: 'No conformidad actualizada' });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const setQCBlocked = useCallback(
    (blocked: boolean): ActionResult => {
      const check = requirePermission('MANAGE_QC', 'modificar bloqueo por QC');
      if (!check.ok || !currentUser) return check;
      persist((prev) => {
        const next: AnalyzerStoreState = {
          ...prev,
          qcBlocked: blocked,
          auditLogs: appendAudit(
            prev,
            currentUser,
            'CONTROL_CALIDAD',
            blocked ? 'Bloqueo de determinaciones por QC' : 'Desbloqueo de determinaciones por QC',
            `Estado de bloqueo QC modificado a ${blocked ? 'BLOQUEADO' : 'ACTIVO'} por ${currentUser.fullName}.`
          ),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });
      pushToast({
        tone: blocked ? 'warning' : 'success',
        title: blocked ? 'Determinaciones bloqueadas por QC' : 'Bloqueo QC levantado',
      });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const triggerCalibration = useCallback(
    (
      type: CalibrationRecord['type'],
      outcome: CalibrationStatus,
      reason: string
    ): ActionResult<CalibrationRecord> => {
      const check = requirePermission('MANAGE_CALIBRATIONS', 'ejecutar calibración');
      if (!check.ok || !currentUser) return { ok: false, error: check.error };
      const now = new Date().toISOString();
      const nextDue = new Date(Date.now() + state.config.autoCalibrationIntervalHours * 3600 * 1000).toISOString();

      const detailsMap: Record<CalibrationStatus, string> = {
        CORRECTA: 'Pendientes de electrodos, deriva cero y verificación óptica dentro de tolerancia.',
        FALLIDA: 'Fallo de pendiente en electrodo pO2/pCO2 fuera de tolerancia. Requiere revisión técnica.',
        PENDIENTE: 'Calibración programada pendiente de ejecución por el operador.',
        INTERRUMPIDA: 'Secuencia de calibración interrumpida antes de completar el lavado final.',
      };

      const record: CalibrationRecord = {
        id: `CAL-${Date.now().toString(36).toUpperCase()}`,
        type,
        timestamp: now,
        status: outcome,
        operatorName: currentUser.fullName,
        reason,
        nextDueAt: nextDue,
        details: detailsMap[outcome],
      };

      persist((prev) => {
        let errs = prev.maintenanceErrors;
        if (outcome === 'FALLIDA') {
          errs = [
            {
              id: `ERR-${Date.now().toString(36).toUpperCase()}`,
              code: 'CAL-502',
              timestamp: now,
              description: `Fallo en ${type}: pendiente de electrodo fuera de rango aceptable.`,
              possibleCause: 'Burbuja en solución calibradora, cartucho agotado o desgaste de sensor.',
              recommendedChecks: [
                'Comprobar nivel de cartucho de lavado/calibración.',
                'Repetir calibración completa de 2 puntos.',
                'Inspeccionar diagnóstico de electrodos.',
              ],
              severity: 'Crítica',
              status: 'ACTIVA',
            },
            ...prev.maintenanceErrors,
          ];
        }
        const next: AnalyzerStoreState = {
          ...prev,
          calibrations: [record, ...prev.calibrations],
          maintenanceErrors: errs,
          counters: { ...prev.counters, washCycles: prev.counters.washCycles + 1 },
          auditLogs: appendAudit(
            prev,
            currentUser,
            'CALIBRACIONES',
            `${type}: ${outcome}`,
            `Motivo: ${reason}.`
          ),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });

      pushToast({
        tone: outcome === 'CORRECTA' ? 'success' : outcome === 'FALLIDA' ? 'error' : 'warning',
        title: `${type}: ${outcome}`,
        message: detailsMap[outcome],
      });
      return { ok: true, data: record };
    },
    [currentUser, persist, pushToast, requirePermission, state.config.autoCalibrationIntervalHours]
  );

  const runQuickCalibration = useCallback(
    (
      type: CalibrationRecord['type'],
      outcome: CalibrationStatus
    ): ActionResult<CalibrationRecord> => {
      const check = requirePermission('PERFORM_ANALYSIS', 'ejecutar calibración rápida');
      if (!check.ok || !currentUser) return { ok: false, error: check.error };
      const now = new Date().toISOString();
      const nextDue = new Date(
        Date.now() + state.config.autoCalibrationIntervalHours * 3600 * 1000
      ).toISOString();

      const details =
        outcome === 'CORRECTA'
          ? 'Calibración aceptada desde acciones rápidas.'
          : 'Fallo Calibración. Se repite calibración.';

      const record: CalibrationRecord = {
        id: `CAL-${Date.now().toString(36).toUpperCase()}`,
        type,
        timestamp: now,
        status: outcome,
        operatorName: currentUser.fullName,
        reason: 'Acción rápida desde pantalla Listo',
        nextDueAt: nextDue,
        details,
      };

      persist((prev) => {
        const next: AnalyzerStoreState = {
          ...prev,
          calibrations: [record, ...prev.calibrations],
          counters: { ...prev.counters, washCycles: prev.counters.washCycles + 1 },
          auditLogs: appendAudit(
            prev,
            currentUser,
            'CALIBRACIONES',
            `${type}: ${outcome === 'CORRECTA' ? 'Calibración aceptada' : 'Fallo Calibración'}`,
            details
          ),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });

      return { ok: true, data: record };
    },
    [currentUser, persist, requirePermission, state.config.autoCalibrationIntervalHours]
  );

  const replaceConsumable = useCallback(
    (consumableId: string, newLot: string, newExpiry: string): ActionResult => {
      const check = requirePermission('MANAGE_CONSUMABLES', 'sustituir consumible');
      if (!check.ok || !currentUser) return check;
      const now = new Date().toISOString();
      persist((prev) => {
        const next: AnalyzerStoreState = {
          ...prev,
          consumables: prev.consumables.map((c) =>
            c.id === consumableId
              ? {
                  ...c,
                  lotNumber: newLot,
                  expiryDate: newExpiry,
                  installedAt: now,
                  levelPercent: 100,
                  remainingTests: c.maxTests ?? c.remainingTests,
                  status: 'OK',
                }
              : c
          ),
          auditLogs: appendAudit(
            prev,
            currentUser,
            'CONSUMIBLES',
            'Sustitución de consumible',
            `Consumible ${consumableId} sustituido (Lote ${newLot}, Cad. ${newExpiry}).`
          ),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });
      pushToast({ tone: 'success', title: 'Consumible sustituido', message: `Lote ${newLot} instalado al 100%.` });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const simulateConsumableStatus = useCallback(
    (consumableId: string, levelPercent: number, forcedStatus?: ConsumableItem['status']): ActionResult => {
      const check = requirePermission('MANAGE_CONSUMABLES', 'modificar estado de consumible');
      if (!check.ok || !currentUser) return check;
      persist((prev) => {
        const next: AnalyzerStoreState = {
          ...prev,
          consumables: prev.consumables.map((c) => {
            if (c.id !== consumableId) return c;
            const status: ConsumableItem['status'] =
              forcedStatus ?? (levelPercent <= 0 ? 'AGOTADO' : levelPercent <= 25 ? 'BAJO' : 'OK');
            return {
              ...c,
              levelPercent,
              remainingTests: c.maxTests ? Math.round((levelPercent / 100) * c.maxTests) : c.remainingTests,
              status,
            };
          }),
          auditLogs: appendAudit(
            prev,
            currentUser,
            'CONSUMIBLES',
            'Actualización estado consumible',
            `Consumible ${consumableId} ajustado a ${levelPercent}% (${forcedStatus ?? 'automático'}).`
          ),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });
      return { ok: true };
    },
    [currentUser, persist, requirePermission]
  );

  const resolveMaintenanceError = useCallback(
    (errorId: string, resolutionNote: string): ActionResult => {
      const check = requirePermission('MANAGE_MAINTENANCE', 'resolver incidencia técnica');
      if (!check.ok || !currentUser) return check;
      const now = new Date().toISOString();
      persist((prev) => {
        const next: AnalyzerStoreState = {
          ...prev,
          maintenanceErrors: prev.maintenanceErrors.map((e) =>
            e.id === errorId
              ? {
                  ...e,
                  status: 'RESUELTA',
                  resolvedBy: currentUser.fullName,
                  resolvedAt: now,
                  resolutionNote,
                }
              : e
          ),
          auditLogs: appendAudit(
            prev,
            currentUser,
            'MANTENIMIENTO',
            'Resolución de alarma/error',
            `Error ${errorId} resuelto: ${resolutionNote}`
          ),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });
      pushToast({ tone: 'success', title: 'Incidencia resuelta' });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const triggerMaintenanceError: AnalyzerContextValue['triggerMaintenanceError'] = useCallback(
    (input) => {
      const check = requirePermission('MANAGE_MAINTENANCE', 'generar alarma técnica');
      if (!check.ok || !currentUser) return check;
      const now = new Date().toISOString();
      const newErr: MaintenanceError = {
        id: `ERR-${Date.now().toString(36).toUpperCase()}`,
        code: input.code,
        timestamp: now,
        description: input.description,
        possibleCause: input.possibleCause,
        recommendedChecks: input.recommendedChecks,
        severity: input.severity,
        status: 'ACTIVA',
      };
      persist((prev) => {
        const next: AnalyzerStoreState = {
          ...prev,
          maintenanceErrors: [newErr, ...prev.maintenanceErrors],
          auditLogs: appendAudit(prev, currentUser, 'MANTENIMIENTO', `Alarma técnica ${input.code}`, input.description),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });
      pushToast({ tone: 'error', title: `Alarma ${input.code}`, message: input.description });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const logMaintenanceIntervention = useCallback(
    (input: Omit<MaintenanceIntervention, 'id' | 'timestamp'>): ActionResult => {
      const check = requirePermission('MANAGE_MAINTENANCE', 'registrar intervención técnica');
      if (!check.ok || !currentUser) return check;
      const now = new Date().toISOString();
      const item: MaintenanceIntervention = {
        ...input,
        id: `MNT-${Date.now().toString(36).toUpperCase()}`,
        timestamp: now,
      };
      persist((prev) => ({
        ...prev,
        maintenanceInterventions: [item, ...prev.maintenanceInterventions],
        auditLogs: appendAudit(prev, currentUser, 'MANTENIMIENTO', `Mantenimiento ${input.type}`, `${input.component}: ${input.description}`),
      }));
      pushToast({ tone: 'success', title: 'Intervención registrada' });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const runDiagnosticCheck = useCallback(
    (forceComponentFault = false): ActionResult => {
      const check = requirePermission('MANAGE_MAINTENANCE', 'ejecutar diagnóstico del analizador');
      if (!check.ok || !currentUser) return check;
      const now = new Date().toISOString();
      persist((prev) => {
        const updated = prev.diagnosticComponents.map((c, idx) => {
          if (forceComponentFault && idx === 1) {
            return { ...c, status: 'ADVERTENCIA' as const, metricValue: '-275 mbar (bajo)', lastCheckedAt: now };
          }
          return {
            ...c,
            status: 'OK' as const,
            metricValue:
              c.id === 'CMP-1'
                ? '37.01 °C'
                : c.id === 'CMP-2'
                  ? '-415 mbar'
                  : c.id === 'CMP-3'
                    ? '99.5 %'
                    : c.metricValue.replace(' (bajo)', ''),
            lastCheckedAt: now,
          };
        });
        const next: AnalyzerStoreState = {
          ...prev,
          diagnosticComponents: updated,
          auditLogs: appendAudit(
            prev,
            currentUser,
            'MANTENIMIENTO',
            'Diagnóstico completo de componentes',
            forceComponentFault ? 'Detectada advertencia de vacío en bomba peristáltica.' : 'Todos los subsistemas verificados OK.'
          ),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });
      pushToast({
        tone: forceComponentFault ? 'warning' : 'success',
        title: forceComponentFault ? 'Diagnóstico con advertencias' : 'Diagnóstico superado (8/8 OK)',
      });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const setAnalyzerMaintenanceMode = useCallback(
    (enabled: boolean): ActionResult => {
      const check = requirePermission('MANAGE_MAINTENANCE', 'cambiar modo mantenimiento');
      if (!check.ok || !currentUser) return check;
      persist((prev) => {
        const next: AnalyzerStoreState = {
          ...prev,
          analyzerStatus: enabled ? 'MANTENIMIENTO' : 'OPERATIVO',
          auditLogs: appendAudit(
            prev,
            currentUser,
            'MANTENIMIENTO',
            enabled ? 'Activación modo mantenimiento' : 'Salida de modo mantenimiento',
            `Estado cambiado por ${currentUser.fullName}.`
          ),
        };
        if (!enabled) {
          next.analyzerStatus = computeAnalyzerStatus(next, false);
        }
        return next;
      });
      pushToast({ tone: enabled ? 'warning' : 'success', title: enabled ? 'Equipo en MANTENIMIENTO' : 'Modo mantenimiento finalizado' });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const markAtellicaRead = useCallback(
    (messageId: string): ActionResult => {
      const check = requirePermission('CONFIRM_MESSAGE_READ', 'marcar mensaje como leído');
      if (!check.ok || !currentUser) return check;
      const now = new Date().toISOString();
      persist((prev) => ({
        ...prev,
        atellicaInbox: prev.atellicaInbox.map((m) => {
          if (m.id !== messageId) return m;
          if (m.status === 'Leído' || m.status === 'Confirmado' || m.status === 'Respondido') return m;
          return {
            ...m,
            status: 'Leído',
            readAt: now,
            readBy: currentUser.fullName,
            history: [
              ...m.history,
              {
                timestamp: now,
                userId: currentUser.id,
                userName: currentUser.fullName,
                previousStatus: m.status,
                newStatus: 'Leído',
                actionType: 'LECTURA',
              },
            ],
          };
        }),
        auditLogs: appendAudit(prev, currentUser, 'COMUNICACIONES', 'Lectura de mensaje Atellica', `Mensaje ${messageId} marcado como Leído.`),
      }));
      return { ok: true };
    },
    [currentUser, persist, requirePermission]
  );

  const confirmAtellicaReception = useCallback(
    (messageId: string): ActionResult => {
      const check = requirePermission('CONFIRM_MESSAGE_READ', 'confirmar recepción de mensaje');
      if (!check.ok || !currentUser) return check;
      const now = new Date().toISOString();
      persist((prev) => ({
        ...prev,
        atellicaInbox: prev.atellicaInbox.map((m) => {
          if (m.id !== messageId) return m;
          return {
            ...m,
            status: 'Confirmado',
            readAt: m.readAt ?? now,
            readBy: m.readBy ?? currentUser.fullName,
            confirmedAt: now,
            confirmedBy: currentUser.fullName,
            history: [
              ...m.history,
              {
                timestamp: now,
                userId: currentUser.id,
                userName: currentUser.fullName,
                previousStatus: m.status,
                newStatus: 'Confirmado',
                actionType: 'CONFIRMACION_RECEPCION',
              },
            ],
          };
        }),
        auditLogs: appendAudit(
          prev,
          currentUser,
          'COMUNICACIONES',
          'Confirmación de recepción Atellica',
          `Mensaje ${messageId} confirmado por ${currentUser.fullName}.`
        ),
      }));
      pushToast({ tone: 'success', title: 'Recepción confirmada', message: `Acuse registrado para ${messageId}.` });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const archiveAtellicaMessage = useCallback(
    (messageId: string): ActionResult => {
      const check = requirePermission('CONFIRM_MESSAGE_READ', 'archivar mensaje');
      if (!check.ok || !currentUser) return check;
      const now = new Date().toISOString();
      persist((prev) => ({
        ...prev,
        atellicaInbox: prev.atellicaInbox.map((m) =>
          m.id === messageId
            ? {
                ...m,
                status: 'Archivado',
                history: [
                  ...m.history,
                  {
                    timestamp: now,
                    userId: currentUser.id,
                    userName: currentUser.fullName,
                    previousStatus: m.status,
                    newStatus: 'Archivado',
                    actionType: 'ARCHIVO',
                  },
                ],
              }
            : m
        ),
        auditLogs: appendAudit(prev, currentUser, 'COMUNICACIONES', 'Mensaje archivado', `Mensaje ${messageId} archivado.`),
      }));
      return { ok: true };
    },
    [currentUser, persist, requirePermission]
  );

  const sendAtellicaOutbox: AnalyzerContextValue['sendAtellicaOutbox'] = useCallback(
    (input) => {
      const check = requirePermission('REPORT_INCIDENT', 'enviar comunicación a Atellica Connect');
      if (!check.ok || !currentUser) return { ok: false, error: check.error };
      const now = new Date().toISOString();
      const sent: SentAtellicaMessage = {
        id: `OUT-${Date.now().toString(36).toUpperCase()}`,
        category: input.category,
        subject: input.subject,
        body: input.body,
        sentAt: now,
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        relatedMessageId: input.relatedMessageId,
        deliveryStatus:
          state.communicationStatus === 'CONECTADO'
            ? 'Confirmado por middleware (simulado)'
            : 'Enviado (simulado)',
      };

      persist((prev) => ({
        ...prev,
        atellicaOutbox: [sent, ...prev.atellicaOutbox],
        atellicaInbox: input.relatedMessageId
          ? prev.atellicaInbox.map((m) =>
              m.id === input.relatedMessageId
                ? {
                    ...m,
                    status: 'Respondido',
                    history: [
                      ...m.history,
                      {
                        timestamp: now,
                        userId: currentUser.id,
                        userName: currentUser.fullName,
                        previousStatus: m.status,
                        newStatus: 'Respondido',
                        actionType: 'RESPUESTA',
                      },
                    ],
                  }
                : m
            )
          : prev.atellicaInbox,
        auditLogs: appendAudit(
          prev,
          currentUser,
          'COMUNICACIONES',
          `Envío a Atellica (${input.category})`,
          `${input.subject}`
        ),
      }));

      pushToast({ tone: 'success', title: 'Mensaje enviado (simulado)', message: input.subject });
      return { ok: true, data: sent };
    },
    [currentUser, persist, pushToast, requirePermission, state.communicationStatus]
  );

  const simulateIncomingAtellica: AnalyzerContextValue['simulateIncomingAtellica'] = useCallback(
    (input) => {
      const check = requirePermission('SIMULATE_ATELLICA', 'simular recepción de mensaje Atellica Connect');
      if (!check.ok || !currentUser) return { ok: false, error: check.error };
      const now = new Date().toISOString();
      const titleEs = input.titleEs ?? translateClinicalText('es', input.title);
      const titleEn = input.titleEn ?? translateClinicalText('en', input.title);
      const bodyEs = input.bodyEs ?? translateClinicalText('es', input.body);
      const bodyEn = input.bodyEn ?? translateClinicalText('en', input.body);
      const senderEs = input.senderEs ?? translateClinicalText('es', input.sender);
      const senderEn = input.senderEn ?? translateClinicalText('en', input.sender);

      const resolvedTitle = language === 'en' ? titleEn : titleEs;
      const resolvedBody = language === 'en' ? bodyEn : bodyEs;
      const resolvedSender = language === 'en' ? senderEn : senderEs;

      const msg: AtellicaMessage = {
        id: `MSG-${Date.now().toString(36).toUpperCase()}`,
        title: resolvedTitle,
        body: resolvedBody,
        titleEs,
        titleEn,
        bodyEs,
        bodyEn,
        sender: resolvedSender,
        senderEs,
        senderEn,
        type: input.type,
        priority: input.priority,
        receivedAt: now,
        status: 'Pendiente de lectura',
        history: [
          {
            timestamp: now,
            userId: 'SYSTEM',
            userName: 'Middleware Atellica Connect',
            previousStatus: 'Recibido',
            newStatus: 'Pendiente de lectura',
            actionType: 'RECEPCION_SISTEMA',
          },
        ],
      };

      persist((prev) => ({
        ...prev,
        atellicaInbox: [msg, ...prev.atellicaInbox],
        auditLogs: appendAudit(
          prev,
          currentUser,
          'COMUNICACIONES',
          'Recepción simulada Atellica Connect',
          `Nuevo mensaje "${titleEs}" (${input.priority}).`
        ),
      }));

      pushToast({
        tone: input.priority === 'Urgente' ? 'error' : 'info',
        title: 'Nuevo mensaje de Atellica Connect',
        message: resolvedTitle,
      });
      return { ok: true, data: msg };
    },
    [currentUser, language, persist, pushToast, requirePermission]
  );

  const triggerDemoAtellicaMessage = useCallback((): ActionResult<AtellicaMessage> => {
    if (!currentUser) return { ok: false, error: 'Sesión no iniciada.' };
    const templates: {
      titleEs: string;
      titleEn: string;
      bodyEs: string;
      bodyEn: string;
      type: AtellicaMessageType;
      priority: AtellicaMessagePriority;
      senderEs: string;
      senderEn: string;
    }[] = [
      {
        titleEs: 'Verificación de Control de Calidad Nivel 2',
        titleEn: 'Level 2 Quality Control Verification',
        bodyEs: 'Se solicita verificar el estado del control de calidad nivel 2 antes de continuar con la actividad analítica.',
        bodyEn: 'Please verify Level 2 quality control status before continuing analytical activity.',
        type: 'Aviso de control de calidad',
        priority: 'Alta',
        senderEs: 'Atellica Connect · Supervisión POCT',
        senderEn: 'Atellica Connect · POCT Supervision',
      },
      {
        titleEs: 'Revisión de consumibles en RP500e-01',
        titleEn: 'Consumables review on RP500e-01',
        bodyEs: 'Recordatorio: incidencia registrada en el analizador RP500e-01. Revisar estado de consumibles.',
        bodyEn: 'Reminder: incident logged on analyzer RP500e-01. Review consumables status.',
        type: 'Aviso de mantenimiento',
        priority: 'Urgente',
        senderEs: 'Atellica Connect · Gestión Técnica',
        senderEn: 'Atellica Connect · Technical Management',
      },
      {
        titleEs: 'Actualización de Procedimiento Operativo (POE-POCT-04)',
        titleEn: 'Standard Operating Procedure Update (POE-POCT-04)',
        bodyEs: 'Se ha actualizado el procedimiento operativo de utilización del gasómetro.',
        bodyEn: 'The blood gas analyzer operating procedure has been updated.',
        type: 'Actualización de procedimientos',
        priority: 'Normal',
        senderEs: 'Coordinación de Calidad POCT',
        senderEn: 'POCT Quality Coordination',
      },
      {
        titleEs: 'Revisión de muestras insuficientes',
        titleEn: 'Insufficient samples review',
        bodyEs: 'El Laboratorio solicita revisar las incidencias relacionadas con muestras insuficientes.',
        bodyEn: 'Laboratory requests reviewing incidents related to insufficient samples.',
        type: 'Aviso operativo',
        priority: 'Alta',
        senderEs: 'Laboratorio Central · Bioquímica Urgencias',
        senderEn: 'Central Laboratory · Emergency Biochemistry',
      },
    ];
    const tpl = templates[state.atellicaInbox.length % templates.length];
    const now = new Date().toISOString();
    const activeTitle = language === 'en' ? tpl.titleEn : tpl.titleEs;
    const activeBody = language === 'en' ? tpl.bodyEn : tpl.bodyEs;
    const activeSender = language === 'en' ? tpl.senderEn : tpl.senderEs;

    const msg: AtellicaMessage = {
      id: `MSG-${Date.now().toString(36).toUpperCase()}`,
      title: activeTitle,
      body: activeBody,
      titleEs: tpl.titleEs,
      titleEn: tpl.titleEn,
      bodyEs: tpl.bodyEs,
      bodyEn: tpl.bodyEn,
      sender: activeSender,
      senderEs: tpl.senderEs,
      senderEn: tpl.senderEn,
      type: tpl.type,
      priority: tpl.priority,
      receivedAt: now,
      status: 'Pendiente de lectura',
      history: [
        {
          timestamp: now,
          userId: 'SYSTEM',
          userName: 'Middleware Atellica Connect',
          previousStatus: 'Recibido',
          newStatus: 'Pendiente de lectura',
          actionType: 'RECEPCION_SISTEMA',
        },
      ],
    };
    persist((prev) => ({
      ...prev,
      atellicaInbox: [msg, ...prev.atellicaInbox],
      auditLogs: appendAudit(
        prev,
        currentUser,
        'COMUNICACIONES',
        'Simulación de mensaje Atellica',
        `Recepción simulada de "${tpl.titleEs}" (${tpl.priority}).`
      ),
    }));
    pushToast({
      tone: tpl.priority === 'Urgente' ? 'error' : 'info',
      title: 'Mensaje recibido de Atellica Connect',
      message: activeTitle,
    });
    return { ok: true, data: msg };
  }, [currentUser, language, persist, pushToast, state.atellicaInbox.length]);

  const setCommunicationStatus = useCallback(
    (status: AnalyzerStoreState['communicationStatus']): ActionResult => {
      const check = requirePermission('MANAGE_MAINTENANCE', 'modificar estado de comunicación');
      if (!check.ok || !currentUser) return check;
      persist((prev) => {
        const next: AnalyzerStoreState = {
          ...prev,
          communicationStatus: status,
          auditLogs: appendAudit(prev, currentUser, 'COMUNICACIONES', `Estado de enlace: ${status}`, `Enlace Atellica Connect cambiado a ${status}.`),
        };
        next.analyzerStatus = computeAnalyzerStatus(next);
        return next;
      });
      pushToast({
        tone: status === 'CONECTADO' ? 'success' : 'warning',
        title: `Comunicaciones: ${status}`,
      });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const updateAnalyzerConfig = useCallback(
    (newConfig: AnalyzerConfig, summary: string): ActionResult => {
      const check = requirePermission('EDIT_ANALYTICAL_CONFIG', 'modificar configuración analítica');
      if (!check.ok || !currentUser) return check;
      persist((prev) => ({
        ...prev,
        config: newConfig,
        auditLogs: appendAudit(prev, currentUser, 'CONFIGURACION', 'Actualización de configuración analítica', summary),
      }));
      pushToast({ tone: 'success', title: 'Configuración guardada', message: summary });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const addUser = useCallback(
    (user: Omit<UserAccount, 'id'>): ActionResult => {
      const check = requirePermission('MANAGE_USERS', 'crear usuario');
      if (!check.ok || !currentUser) return check;
      if (state.users.some((u) => u.username.toLowerCase() === user.username.toLowerCase())) {
        return { ok: false, error: 'El identificador de usuario ya existe.' };
      }
      const created: UserAccount = { ...user, id: `USR-${Date.now().toString(36).toUpperCase()}` };
      persist((prev) => ({
        ...prev,
        users: [...prev.users, created],
        auditLogs: appendAudit(prev, currentUser, 'USUARIOS', 'Alta de usuario', `Usuario ${created.username} (${created.role}) creado.`),
      }));
      pushToast({ tone: 'success', title: 'Usuario creado', message: created.fullName });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission, state.users]
  );

  const updateUser = useCallback(
    (userId: string, patch: Partial<Pick<UserAccount, 'role' | 'active' | 'department' | 'fullName'>>): ActionResult => {
      const check = requirePermission('MANAGE_USERS', 'modificar usuario');
      if (!check.ok || !currentUser) return check;
      persist((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
        auditLogs: appendAudit(prev, currentUser, 'USUARIOS', 'Modificación de usuario', `Usuario ${userId} actualizado.`),
      }));
      pushToast({ tone: 'info', title: 'Perfil de usuario actualizado' });
      return { ok: true };
    },
    [currentUser, persist, pushToast, requirePermission]
  );

  const restoreOperationalState = useCallback((): ActionResult => {
    const check = requirePermission('MANAGE_MAINTENANCE', 'restaurar estado operativo');
    if (!check.ok || !currentUser) return check;
    const now = new Date().toISOString();
    persist((prev) => {
      const next: AnalyzerStoreState = {
        ...prev,
        analyzerStatus: 'OPERATIVO',
        communicationStatus: 'CONECTADO',
        qcBlocked: false,
        maintenanceErrors: prev.maintenanceErrors.map((e) =>
          e.status === 'RESUELTA'
            ? e
            : { ...e, status: 'RESUELTA', resolvedBy: currentUser.fullName, resolvedAt: now, resolutionNote: 'Resuelto mediante restauración operativa de demostración.' }
        ),
        qcNonConformities: prev.qcNonConformities.map((nc) =>
          nc.status === 'RESUELTA'
            ? nc
            : { ...nc, status: 'RESUELTA', resolvedAt: now, correctiveAction: nc.correctiveAction || 'Verificación operativa completada.' }
        ),
        consumables: prev.consumables.map((c) =>
          c.status === 'AGOTADO' || c.status === 'CADUCADO' || c.status === 'BAJO'
            ? { ...c, levelPercent: 85, remainingTests: c.maxTests ? Math.round(c.maxTests * 0.85) : c.remainingTests, status: 'OK' }
            : c
        ),
        diagnosticComponents: prev.diagnosticComponents.map((d) => ({ ...d, status: 'OK', lastCheckedAt: now })),
        calibrations:
          prev.calibrations[0]?.status !== 'CORRECTA'
            ? [
                {
                  id: `CAL-${Date.now().toString(36).toUpperCase()}`,
                  type: 'Calibración 2-Puntos',
                  timestamp: now,
                  status: 'CORRECTA',
                  operatorName: currentUser.fullName,
                  reason: 'Restauración operativa del sistema',
                  nextDueAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
                  details: 'Todos los sensores recalibrados correctamente.',
                },
                ...prev.calibrations,
              ]
            : prev.calibrations,
        auditLogs: appendAudit(prev, currentUser, 'SIMULADOR', 'Restauración de estado operativo', 'Equipo restaurado a estado OPERATIVO nominal.'),
      };
      next.analyzerStatus = computeAnalyzerStatus(next, false);
      return next;
    });
    pushToast({ tone: 'success', title: 'Estado operativo restaurado', message: 'Analizador en estado OPERATIVO.' });
    return { ok: true };
  }, [currentUser, persist, pushToast, requirePermission]);

  const resetDemoDatabase = useCallback(async (): Promise<ActionResult> => {
    const check = requirePermission('RESET_DEMO', 'restaurar todos los datos de demostración');
    if (!check.ok) return check;
    await clearPersistedState();
    const fresh = createDemoSeedState();
    await savePersistedState(fresh);
    setState(fresh);
    pushToast({ tone: 'success', title: 'Datos de demostración restaurados', message: 'Base de datos reinicializada.' });
    return { ok: true };
  }, [pushToast, requirePermission]);

  const qcOverallStatus: QCOverallStatus = useMemo(() => {
    if (state.qcBlocked) return 'BLOQUEADO';
    const openNC = state.qcNonConformities.some((nc) => nc.status !== 'RESUELTA');
    if (openNC) return 'NO_CONFORME';
    const latestByLevel = state.qcLevels.map((lvl) =>
      state.qcRuns.find((r) => r.levelId === lvl.id)
    );
    if (latestByLevel.some((r) => r?.status === 'NO_CONFORME')) return 'NO_CONFORME';
    if (latestByLevel.some((r) => r?.status === 'ADVERTENCIA')) return 'ADVERTENCIA';
    return 'CONFORME';
  }, [state.qcBlocked, state.qcLevels, state.qcNonConformities, state.qcRuns]);

  const pendingMessagesCount = useMemo(
    () => state.atellicaInbox.filter((m) => m.status === 'Recibido' || m.status === 'Pendiente de lectura').length,
    [state.atellicaInbox]
  );

  const activeErrorsCount = useMemo(
    () => state.maintenanceErrors.filter((e) => e.status !== 'RESUELTA').length,
    [state.maintenanceErrors]
  );

  const unackCriticalCount = useMemo(
    () => state.records.filter((r) => r.hasCriticalValues && !r.criticalAck.acknowledged).length,
    [state.records]
  );

  const unidentifiedCount = useMemo(
    () => state.records.filter((r) => r.identificationStatus === 'PENDIENTE_IDENTIFICACION').length,
    [state.records]
  );

  const value: AnalyzerContextValue = {
    state,
    hydrated,
    currentUser,
    activeMode,
    qcOverallStatus,
    pendingMessagesCount,
    activeErrorsCount,
    unackCriticalCount,
    unidentifiedCount,
    toasts,
    dismissToast,
    pushToast,
    can,
    requireLogin,
    setRequireLogin,
    login,
    loginWithoutAuth,
    logout,
    setMode,
    themeMode,
    toggleThemeMode,
    language,
    setLanguage,
    toggleLanguage,
    desynchronizeEvents,
    toggleDesynchronizeEvents,
    desyncPopupMode,
    dismissDesyncPopup,
    clotPortOverlayOpen,
    setClotPortOverlayOpen,
    loginAtellicaPopupOpen,
    dismissLoginAtellicaPopup,
    confirmLoginAtellicaPopup,
    manualModalOpen,
    setManualModalOpen,
    screensaverOpen,
    setScreensaverOpen,
    navRequest,
    requestNav,
    executeBloodGas,
    identifyBloodGasRecord,
    transmitRecordToLis,
    acknowledgeCriticalAlert,
    setRecordValidationStatus,
    reportIncident,
    runQC,
    runAutomaticAQC,
    createQCLevel,
    updateQCLot,
    updateQCNonConformity,
    setQCBlocked,
    triggerCalibration,
    runQuickCalibration,
    replaceConsumable,
    simulateConsumableStatus,
    resolveMaintenanceError,
    triggerMaintenanceError,
    logMaintenanceIntervention,
    runDiagnosticCheck,
    setAnalyzerMaintenanceMode,
    markAtellicaRead,
    confirmAtellicaReception,
    archiveAtellicaMessage,
    sendAtellicaOutbox,
    simulateIncomingAtellica,
    triggerDemoAtellicaMessage,
    setCommunicationStatus,
    updateAnalyzerConfig,
    addUser,
    updateUser,
    restoreOperationalState,
    resetDemoDatabase,
  };

  return <AnalyzerContext.Provider value={value}>{children}</AnalyzerContext.Provider>;
};

export function useAnalyzer() {
  const ctx = useContext(AnalyzerContext);
  if (!ctx) throw new Error('useAnalyzer debe usarse dentro de AnalyzerProvider');
  return ctx;
}
