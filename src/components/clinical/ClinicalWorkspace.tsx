import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Check,
  CheckCircle2,
  Clock,
  FileClock,
  FlaskConical,
  HelpCircle,
  History,
  Home,
  Info,
  LayoutGrid,
  Layers,
  Loader2,
  Lock,
  MessageSquarePlus,
  MessageSquareWarning,
  Play,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { NewBloodGasWizard } from '@/src/components/clinical/NewBloodGasWizard';
import { ClinicalHistoryView } from '@/src/components/clinical/ClinicalHistoryView';
import { AtellicaConnectPanel } from '@/src/components/common/AtellicaConnectPanel';
import { BloodGasReportView } from '@/src/components/common/BloodGasReportView';
import { UnidentifiedSamplesView } from '@/src/components/common/UnidentifiedSamplesView';
import { CartridgeStatusView } from '@/src/components/common/CartridgeStatusView';
import { StatisticsDashboardView } from '@/src/components/common/StatisticsDashboardView';
import { CalibrationRecord, MaintenanceError, QCRun, SampleType } from '@/src/types/analyzer';
import {
  generateRandomPatientDemographics,
  PatientDemographics,
} from '@/src/utils/patientDemographics';
import {
  localeFor,
  resolveAtellicaText,
  tr,
  translateAtellicaPriority,
  translateAtellicaStatus,
  translateClinicalText,
  translateSampleType,
} from '@/src/i18n/translations';

type ClinicalTab =
  | 'HOME'
  | 'NEW_SAMPLE'
  | 'AQC'
  | 'CALIBRATE'
  | 'CARTRIDGE_STATUS'
  | 'STATS'
  | 'HISTORY'
  | 'UNIDENTIFIED'
  | 'ATELLICA'
  | 'HELP';
type ParameterDisplayMode = 'INDIVIDUAL' | 'GROUPED';

interface ClinicalWorkspaceProps {
  mode?: 'CLINICAL' | 'LABORATORY';
  hideBottomNav?: boolean;
}

interface AnalyteTile {
  id: string;
  label: string;
}

// 3 columns x 4 rows matching the RAPIDPoint 500e instrument matrix
const ANALYTE_MATRIX: AnalyteTile[] = [
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
];

interface AnalyteGroupToken {
  label: string;
  qcKeys: string[];
}

interface AnalyteGroupTile {
  id: string;
  labelEs: string;
  labelEn: string;
  analytes: string[];
  tokens: AnalyteGroupToken[];
}

const ANALYTE_GROUPS: AnalyteGroupTile[] = [
  {
    id: 'acid_base',
    labelEs: 'Equilibrio ácido-base',
    labelEn: 'Acid-base balance',
    analytes: ['pH', 'pCO2'],
    tokens: [
      { label: 'pH', qcKeys: ['pH'] },
      { label: 'pCO2', qcKeys: ['pCO2'] },
      { label: 'HCO3-', qcKeys: ['HCO3'] },
      { label: 'BE', qcKeys: ['BE'] },
    ],
  },
  {
    id: 'oxygenation',
    labelEs: 'Estado oxigenación',
    labelEn: 'Oxygenation status',
    analytes: ['pO2'],
    tokens: [
      { label: 'pO2', qcKeys: ['pO2'] },
      { label: 'sO2', qcKeys: ['sO2'] },
    ],
  },
  {
    id: 'electrolytes',
    labelEs: 'Estado hidroelectrolítico',
    labelEn: 'Electrolyte balance',
    analytes: ['Na', 'K', 'Ca', 'Cl'],
    tokens: [
      { label: 'Na+', qcKeys: ['Na'] },
      { label: 'K+', qcKeys: ['K'] },
      { label: 'Ca++', qcKeys: ['Ca'] },
      { label: 'Cl-', qcKeys: ['Cl'] },
    ],
  },
  {
    id: 'metabolites',
    labelEs: 'Metabolitos',
    labelEn: 'Metabolites',
    analytes: ['Glu', 'Lac', 'nBili'],
    tokens: [
      { label: 'Glu', qcKeys: ['Glu'] },
      { label: 'Lac', qcKeys: ['Lac'] },
      { label: 'nBili', qcKeys: ['nBili'] },
    ],
  },
  {
    id: 'cooximetry',
    labelEs: 'Cooximetría',
    labelEn: 'CO-oximetry',
    analytes: ['ctHb', 'Coox'],
    tokens: [
      { label: 'ctHb', qcKeys: ['ctHb'] },
      { label: 'FO2Hb', qcKeys: ['FO2Hb', 'Coox'] },
      { label: 'FCOHb', qcKeys: ['FCOHb', 'Coox'] },
      { label: 'FMetHb', qcKeys: ['FMetHb', 'Coox'] },
    ],
  },
];

// Profile 1: "Solo pH" | Profile 2: "Bic y Ca++"
const PRESET_1_IDS = ['pH'];
const PRESET_2_IDS = ['pH', 'pCO2', 'Ca'];

const SyringeIcon: React.FC<{ color: string; variant: SampleType }> = ({ color, variant }) => (
  <svg viewBox="0 0 64 42" className="w-12 h-8 shrink-0" aria-hidden="true">
    {variant === 'Capilar' ? (
      <>
        <rect x="10" y="16" width="44" height="6" rx="2" fill="#E2E8F0" stroke="#475569" strokeWidth="1.5" />
        <rect x="16" y="17.2" width="26" height="3.6" fill={color} />
        <path d="M10 22 C7 26, 7 32, 11 32 C15 32, 15 26, 10 22 Z" fill="#DC2626" />
      </>
    ) : (
      <>
        <line x1="56" y1="19" x2="43" y2="19" stroke="#475569" strokeWidth="2.5" />
        <line x1="56" y1="13" x2="56" y2="25" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="18" y="13" width="25" height="12" rx="1.5" fill="#FFFFFF" stroke="#475569" strokeWidth="1.5" />
        <rect x="19" y="14.5" width="16" height="9" fill={color} opacity="0.85" />
        <polygon points="18,17 10,18.5 10,19.5 18,21" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
        <path d="M10 22 C7 27, 7 34, 11 34 C15 34, 15 27, 10 22 Z" fill="#DC2626" />
      </>
    )}
  </svg>
);

const PortAspirationGraphic: React.FC<{ sampleType: SampleType; blocked: boolean }> = ({
  sampleType,
  blocked,
}) => (
  <svg viewBox="0 0 260 78" className="w-full max-w-[200px] h-12 mx-auto" aria-hidden="true">
    <rect x="8" y="8" width="76" height="62" rx="4" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.5" />
    <line x1="54" y1="8" x2="54" y2="70" stroke="#CBD5E1" strokeWidth="1" />
    <polygon
      points="84,28 102,33 102,45 84,50"
      fill={blocked ? '#DC2626' : '#E8630A'}
      stroke="#475569"
      strokeWidth="1.2"
    />
    <rect x="64" y="33" width="20" height="12" fill="#CBD5E1" stroke="#475569" strokeWidth="1.2" />
    <path d="M32 50 C27 57, 27 65, 33 65 C39 65, 39 57, 32 50 Z" fill="#DC2626" />
    {sampleType === 'Capilar' ? (
      <>
        <rect x="120" y="35" width="108" height="8" rx="2" fill="#FFFFFF" stroke="#334155" strokeWidth="1.5" />
        <rect x="122" y="37" width="70" height="4" fill="#0EA5E9" opacity="0.85" />
      </>
    ) : (
      <>
        <polygon points="116,37 134,33 134,45 116,41" fill="#CBD5E1" stroke="#334155" strokeWidth="1.2" />
        <rect x="134" y="29" width="74" height="20" rx="2" fill="#FFFFFF" stroke="#334155" strokeWidth="1.5" />
        <rect
          x="136"
          y="31"
          width="48"
          height="16"
          fill={sampleType === 'Arterial' ? '#DC2626' : '#7C3AED'}
          opacity="0.82"
        />
        <line x1="208" y1="39" x2="244" y2="39" stroke="#475569" strokeWidth="3.5" />
        <line x1="244" y1="27" x2="244" y2="51" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" />
      </>
    )}
    <path d="M114 39 L105 39" stroke="#E8630A" strokeWidth="2.5" strokeLinecap="round" />
    <polygon points="103,39 109,35 109,43" fill="#E8630A" />
  </svg>
);

export const ClinicalWorkspace: React.FC<ClinicalWorkspaceProps> = ({
  mode = 'CLINICAL',
  hideBottomNav = false,
}) => {
  const isLabMode = mode === 'LABORATORY';
  const {
    state,
    pendingMessagesCount,
    unackCriticalCount,
    markAtellicaRead,
    confirmAtellicaReception,
    triggerDemoAtellicaMessage,
    runAutomaticAQC,
    runQuickCalibration,
    reportIncident,
    navRequest,
    language,
  } = useAnalyzer();
  const locale = localeFor(language);

  const [tab, setTab] = useState<ClinicalTab>('HOME');
  const [quickWizardMode, setQuickWizardMode] = useState(false);
  const [unidentifiedTargetRecordId, setUnidentifiedTargetRecordId] = useState<string | null>(null);
  const [showLastReport, setShowLastReport] = useState(false);
  const [historyOnlyCritical, setHistoryOnlyCritical] = useState(false);
  const [clinicalModal, setClinicalModal] = useState<'EVENTS' | null>(null);

  // Sample & Parameter configuration on Home Screen (ALL active by default)
  const [selectedSampleType, setSelectedSampleType] = useState<SampleType>('Arterial');
  const [paramDisplayMode, setParamDisplayMode] = useState<ParameterDisplayMode>('INDIVIDUAL');
  const [activePreset, setActivePreset] = useState<1 | 2 | null>(null);
  const [selectedAnalytes, setSelectedAnalytes] = useState<string[]>(
    ANALYTE_MATRIX.map((a) => a.id)
  );

  // Home Screen Patient Identification with 3-second demographic verification
  const [quickPatientId, setQuickPatientId] = useState('');
  const [homeCountdown, setHomeCountdown] = useState<number | null>(null);
  const [homeDemographics, setHomeDemographics] = useState<PatientDemographics | null>(null);
  const [homeDemographicsConfirmed, setHomeDemographicsConfirmed] = useState(false);
  const [homeIdError, setHomeIdError] = useState<string | null>(null);

  // AQC Screen state
  const [aqcLevelId, setAqcLevelId] = useState<string>(state.qcLevels[0]?.id ?? 'QCL-1');
  const [aqcSimMode, setAqcSimMode] = useState<'CONFORME' | 'FUERA_DE_RANGO_1_3S'>('CONFORME');
  const [aqcRunning, setAqcRunning] = useState(false);
  const [aqcCountdown, setAqcCountdown] = useState<number | null>(null);
  const [lastAqcRun, setLastAqcRun] = useState<QCRun | null>(null);

  // Quick Calibration Screen state ("Un punto", "Dos puntos", "Completa")
  const [calStep, setCalStep] = useState<'MENU' | 'RUNNING' | 'RESULT'>('MENU');
  const [calSelectedLabel, setCalSelectedLabel] = useState<'Un punto' | 'Dos puntos' | 'Completa' | null>(null);
  const [calCountdown, setCalCountdown] = useState<number>(3);
  const [calResult, setCalResult] = useState<'ACCEPTED' | 'FAILED' | null>(null);

  // Help / Incident reporting & Listado de incidencias state
  const [incTitle, setIncTitle] = useState('');
  const [incDesc, setIncDesc] = useState('');
  const [incSeverity, setIncSeverity] = useState<MaintenanceError['severity']>('Media');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState<string | null>(null);

  const lastRecord = state.records[0];
  const latestAtellica = state.atellicaInbox.find(
    (m) => m.status !== 'Archivado' && m.status !== 'Confirmado'
  );
  const isBlocked =
    state.analyzerStatus === 'NO_DISPONIBLE' ||
    state.analyzerStatus === 'MANTENIMIENTO' ||
    state.qcBlocked;

  useEffect(() => {
    if (!navRequest || navRequest.mode !== mode) return;
    setShowLastReport(false);
    if (navRequest.target === 'HISTORY') {
      setHistoryOnlyCritical(false);
      setUnidentifiedTargetRecordId(null);
      setTab('HISTORY');
    } else if (navRequest.target === 'UNIDENTIFIED') {
      setUnidentifiedTargetRecordId(navRequest.recordId ?? null);
      setTab('UNIDENTIFIED');
    } else if (navRequest.target === 'CRITICALS') {
      setHistoryOnlyCritical(true);
      setUnidentifiedTargetRecordId(null);
      setTab('HISTORY');
    } else if (navRequest.target === 'CARTRIDGE_STATUS') {
      setTab('CARTRIDGE_STATUS');
    } else if (navRequest.target === 'EVENTS') {
      setClinicalModal('EVENTS');
    } else if (navRequest.target === 'STATS') {
      setClinicalModal(null);
      setTab('STATS');
    }
  }, [navRequest, mode]);

  // Latest AQC status per level (1, 2, 3) + failed parameters set (turns parameter squares yellow)
  const { levelStatusList, failedAqcParams } = useMemo(() => {
    const failedParams = new Set<string>();
    const list = state.qcLevels.map((lvl, idx) => {
      const latest = state.qcRuns.find((r) => r.levelId === lvl.id);
      const passed = !latest || latest.status === 'CONFORME';
      if (latest && latest.status !== 'CONFORME') {
        latest.violatedRules.forEach((vr) => failedParams.add(vr.parameter));
        Object.entries(latest.zScores).forEach(([k, z]) => {
          if (Math.abs(z) >= 2) {
            failedParams.add(k);
          }
        });
      }
      return {
        level: lvl,
        shortNumber: idx + 1,
        latest,
        passed,
        statusLabel: !latest
          ? tr(language, 'Sin datos', 'No data')
          : latest.status === 'CONFORME'
            ? tr(language, 'Superado', 'Passed')
            : latest.status === 'ADVERTENCIA'
              ? tr(language, 'Advertencia', 'Warning')
              : tr(language, 'No superado', 'Failed'),
      };
    });
    return { levelStatusList: list, failedAqcParams: failedParams };
  }, [state.qcLevels, state.qcRuns, language]);

  const failedAqcLevels = levelStatusList.filter((item) => !item.passed);
  const hasAqcFailure =
    failedAqcLevels.length > 0 || failedAqcParams.size > 0 || state.qcBlocked;
  const hasCalibrationFailure =
    state.calibrations[0]?.status === 'FALLIDA' ||
    state.calibrations[0]?.status === 'INTERRUMPIDA';
  const showQuickActions = hasAqcFailure || hasCalibrationFailure;

  const analyzerIncidentsList = useMemo(() => {
    const classifyType = (text: string): { key: string; label: string } => {
      const t = text.toLowerCase();
      if (t.includes('reactivo') || t.includes('lavado') || t.includes('cartucho') || t.includes('wash')) {
        return { key: 'REAGENTS', label: tr(language, 'Reactivos', 'Reagents') };
      }
      if (t.includes('temp') || t.includes('térmic') || t.includes('calentador')) {
        return { key: 'TEMP', label: tr(language, 'Temperatura del analizador', 'Analyzer temperature') };
      }
      if (
        t.includes('coágulo') ||
        t.includes('mecánic') ||
        t.includes('válvula') ||
        t.includes('bomba') ||
        t.includes('puerto') ||
        t.includes('aspiración')
      ) {
        return { key: 'MECH', label: tr(language, 'Errores mecánicos', 'Mechanical errors') };
      }
      if (
        t.includes('sensor') ||
        t.includes('electrodo') ||
        t.includes('parámetro') ||
        t.includes('coox') ||
        t.includes('po2') ||
        t.includes('ca++') ||
        t.includes('ph')
      ) {
        return { key: 'PARAMS', label: tr(language, 'Parámetros', 'Parameters') };
      }
      return { key: 'OTHER', label: tr(language, 'Otros errores', 'Other errors') };
    };

    const fromStore = state.maintenanceErrors.map((err) => {
      const cls = classifyType(`${err.description} ${err.possibleCause}`);
      return {
        id: err.id,
        code: err.code,
        errorKey: cls.key,
        errorType: cls.label,
        title: translateClinicalText(language, err.description),
        detail: translateClinicalText(language, err.possibleCause),
        timestamp: err.timestamp,
        severity: err.severity,
        status: err.status,
      };
    });

    const nowMs = Date.now();
    const baselineIncidents = [
      {
        id: 'INC-REF-01',
        code: 'E-REA-204',
        errorKey: 'REAGENTS',
        errorType: tr(language, 'Reactivos', 'Reagents'),
        title: tr(language, 'Burbuja en línea de reactivo calibrador B', 'Air bubble in calibrator reagent line B'),
        detail: tr(language, 'Detectada discontinuidad en aspiración de solución calibradora. Purga automática ejecutada.', 'Discontinuity detected in calibrator solution aspiration. Auto purge executed.'),
        timestamp: new Date(nowMs - 3.2 * 3600 * 1000).toISOString(),
        severity: 'Media' as const,
        status: 'ACTIVA',
      },
      {
        id: 'INC-REF-02',
        code: 'E-PAR-312',
        errorKey: 'PARAMS',
        errorType: tr(language, 'Parámetros', 'Parameters'),
        title: tr(language, 'Deriva de pendiente en electrodo Ca++ / pO2', 'Slope drift in Ca++ / pO2 electrode'),
        detail: tr(language, 'Desviación superior al 1,8 % respecto a calibración nominal; verificar control AQC.', 'Deviation greater than 1.8% from nominal calibration; verify AQC control.'),
        timestamp: new Date(nowMs - 5.5 * 3600 * 1000).toISOString(),
        severity: 'Alta' as const,
        status: 'ACTIVA',
      },
      {
        id: 'INC-REF-03',
        code: 'E-TMP-108',
        errorKey: 'TEMP',
        errorType: tr(language, 'Temperatura del analizador', 'Analyzer temperature'),
        title: tr(language, 'Cámara de medida fuera de rango térmico (36,4 °C)', 'Measurement chamber out of thermal range (36.4 °C)'),
        detail: tr(language, 'Sensor bloque térmico por debajo de 37,0 °C ± 0,2 °C durante precalentamiento.', 'Thermal block sensor below 37.0 °C ± 0.2 °C during warm-up.'),
        timestamp: new Date(nowMs - 9.0 * 3600 * 1000).toISOString(),
        severity: 'Alta' as const,
        status: 'EN_REVISION',
      },
      {
        id: 'INC-REF-04',
        code: 'E-MEC-419',
        errorKey: 'MECH',
        errorType: tr(language, 'Errores mecánicos', 'Mechanical errors'),
        title: tr(language, 'Sobrecarga en válvula rotatoria y bomba peristáltica', 'Rotary valve and peristaltic pump overload'),
        detail: tr(language, 'Resistencia mecánica anómala en ciclo de lavado tras aspiración de muestra viscosa.', 'Abnormal mechanical resistance during wash cycle after viscous sample aspiration.'),
        timestamp: new Date(nowMs - 14.5 * 3600 * 1000).toISOString(),
        severity: 'Media' as const,
        status: 'RESUELTA',
      },
      {
        id: 'INC-REF-05',
        code: 'E-PAR-325',
        errorKey: 'PARAMS',
        errorType: tr(language, 'Parámetros', 'Parameters'),
        title: tr(language, 'Interferencia óptica canal Cooximetría (FCOHb)', 'CO-oximetry optical channel interference (FCOHb)'),
        detail: tr(language, 'Transmitancia reducida en cubeta óptica; ejecutado ciclo de limpieza enzimática.', 'Reduced optical cuvette transmittance; enzymatic cleaning cycle performed.'),
        timestamp: new Date(nowMs - 22.0 * 3600 * 1000).toISOString(),
        severity: 'Baja' as const,
        status: 'RESUELTA',
      },
      {
        id: 'INC-REF-06',
        code: 'E-REA-218',
        errorKey: 'REAGENTS',
        errorType: tr(language, 'Reactivos', 'Reagents'),
        title: tr(language, 'Bajo volumen en solución de lavado A-Wash', 'Low volume in A-Wash rinsing solution'),
        detail: tr(language, 'Nivel inferior al 25 % en cartucho de lavado; programar sustitución preventiva.', 'Wash cartridge level below 25%; schedule preventive replacement.'),
        timestamp: new Date(nowMs - 31.0 * 3600 * 1000).toISOString(),
        severity: 'Media' as const,
        status: 'ACTIVA',
      },
    ];

    return [...fromStore, ...baselineIncidents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [state.maintenanceErrors, language]);

  const filteredIncidents = useMemo(() => {
    if (!incidentTypeFilter) return analyzerIncidentsList;
    return analyzerIncidentsList.filter((item) => item.errorKey === incidentTypeFilter);
  }, [analyzerIncidentsList, incidentTypeFilter]);

  const activeIncidentFilterLabel = useMemo(() => {
    if (!incidentTypeFilter) return null;
    const found = analyzerIncidentsList.find((item) => item.errorKey === incidentTypeFilter);
    return found?.errorType ?? incidentTypeFilter;
  }, [analyzerIncidentsList, incidentTypeFilter]);

  // 3-second countdown clock for Home patient identification
  useEffect(() => {
    if (homeCountdown === null) return;
    if (homeCountdown <= 0) {
      setHomeCountdown(null);
      setHomeDemographics(generateRandomPatientDemographics(quickPatientId));
      return;
    }
    const timer = setTimeout(() => {
      setHomeCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [homeCountdown, quickPatientId]);

  // 3-second countdown chronometer for Quick Calibration ("Un punto", "Dos puntos", "Completa")
  useEffect(() => {
    if (tab !== 'CALIBRATE' || calStep !== 'RUNNING' || !calSelectedLabel) return;
    if (calCountdown <= 0) {
      const calTypeMap: Record<'Un punto' | 'Dos puntos' | 'Completa', CalibrationRecord['type']> = {
        'Un punto': 'Calibración 1-Punto',
        'Dos puntos': 'Calibración 2-Puntos',
        Completa: 'Calibración Completa',
      };
      const outcome = Math.random() < 0.35 ? 'FAILED' : 'ACCEPTED';
      runQuickCalibration(calTypeMap[calSelectedLabel], outcome === 'ACCEPTED' ? 'CORRECTA' : 'FALLIDA');
      setCalResult(outcome);
      setCalStep('RESULT');
      return;
    }
    const timer = setTimeout(() => {
      setCalCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [tab, calStep, calCountdown, calSelectedLabel, runQuickCalibration]);

  const startQuickCalOption = (label: 'Un punto' | 'Dos puntos' | 'Completa') => {
    setCalSelectedLabel(label);
    setCalResult(null);
    setCalCountdown(3);
    setCalStep('RUNNING');
  };

  const startHomeIdentification = (idToUse: string) => {
    const clean = idToUse.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,16}$/.test(clean)) {
      setHomeIdError(
        tr(
          language,
          `ID inválido (4–16 caracteres alfanuméricos, ${isLabMode ? 'ej. LAB-1001' : 'ej. DEMO001'}).`,
          `Invalid ID (4–16 alphanumeric characters, ${isLabMode ? 'e.g. LAB-1001' : 'e.g. DEMO001'}).`
        )
      );
      return;
    }
    setHomeIdError(null);
    if (isLabMode) {
      setHomeDemographics(null);
      setHomeDemographicsConfirmed(true);
      setHomeCountdown(null);
      return;
    }
    setHomeDemographics(null);
    setHomeDemographicsConfirmed(false);
    setHomeCountdown(3);
  };

  const handleQuickIdChange = (val: string) => {
    const upper = val.toUpperCase();
    setQuickPatientId(upper);
    setHomeIdError(null);
    if (!isLabMode) {
      if (homeDemographics && upper.trim() !== homeDemographics.patientId) {
        setHomeDemographics(null);
        setHomeDemographicsConfirmed(false);
      }
      if (homeCountdown !== null) {
        setHomeCountdown(null);
      }
    }
  };

  const simulateQuickScan = () => {
    const demoIds = isLabMode
      ? ['LAB-1001', 'LAB-1002', 'LAB-2045', 'DEMO001']
      : ['DEMO001', 'DEMO002', 'DEMO003', 'DEMO017', 'DEMO018'];
    const pick = demoIds[Math.floor(Math.random() * demoIds.length)];
    setQuickPatientId(pick);
    startHomeIdentification(pick);
  };

  const toggleAnalyte = (id: string) => {
    setActivePreset(null);
    setSelectedAnalytes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleGroup = (groupAnalytes: string[]) => {
    setActivePreset(null);
    setSelectedAnalytes((prev) => {
      const allActive = groupAnalytes.every((a) => prev.includes(a));
      if (allActive) {
        return prev.filter((a) => !groupAnalytes.includes(a));
      }
      return Array.from(new Set([...prev, ...groupAnalytes]));
    });
  };

  const allAnalytesActive = selectedAnalytes.length === ANALYTE_MATRIX.length;
  const toggleAllOrNone = () => {
    setActivePreset(null);
    if (allAnalytesActive) {
      setSelectedAnalytes([]);
    } else {
      setSelectedAnalytes(ANALYTE_MATRIX.map((a) => a.id));
    }
  };

  const applyPreset = (preset: 1 | 2) => {
    setActivePreset(preset);
    setSelectedAnalytes(preset === 1 ? PRESET_1_IDS : PRESET_2_IDS);
  };

  // 2-second countdown chronometer when measuring AQC
  useEffect(() => {
    if (!aqcRunning || aqcCountdown === null) return;
    if (aqcCountdown <= 0) {
      const res = runAutomaticAQC({ levelId: aqcLevelId, mode: aqcSimMode });
      setAqcRunning(false);
      setAqcCountdown(null);
      if (res.ok && res.data) {
        setLastAqcRun(res.data);
      }
      return;
    }
    const timer = setTimeout(() => {
      setAqcCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [aqcRunning, aqcCountdown, aqcLevelId, aqcSimMode, runAutomaticAQC]);

  const handleRunAqc = () => {
    setAqcRunning(true);
    setLastAqcRun(null);
    setAqcCountdown(2);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incTitle.trim() || !incDesc.trim()) return;
    const res = reportIncident(incTitle.trim(), incDesc.trim(), incSeverity);
    if (res.ok) {
      setIncTitle('');
      setIncDesc('');
    }
  };

  const homeBlocksStart =
    !isLabMode &&
    ((quickPatientId.trim().length > 0 && !homeDemographicsConfirmed) || homeCountdown !== null);

  const workspaceBgClass = isLabMode
    ? 'bg-[#EFF6FF] dark:bg-[#1C1E21]'
    : 'bg-[#FEF2F2] dark:bg-[#1C1E21]';

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${workspaceBgClass} relative transition-colors`}>
      {/* Main Touchscreen Viewport (Zero outer vertical scroll on all screens) */}
      <div
        className={`flex-1 min-h-0 flex flex-col overflow-hidden p-2 lg:p-2.5 ${workspaceBgClass} transition-colors`}
      >
        {/* INSTRUMENT READY SCREEN */}
        {tab === 'HOME' && !showLastReport && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            {/* COLUMN 1 (Left 4 cols): Sample Type Tiles + AQC -> Centered Compact Cartridge Status Card -> Atellica Connect Notice */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-1.5 min-h-0">
              {/* 2x2 Tactile Sample Tiles + AQC */}
              <div className="grid grid-cols-2 gap-1.5 shrink-0">
                {(
                  [
                    { type: 'Arterial' as SampleType, label: translateSampleType(language, 'Arterial'), color: '#DC2626' },
                    { type: 'Venosa' as SampleType, label: translateSampleType(language, 'Venosa'), color: '#7C3AED' },
                    { type: 'Capilar' as SampleType, label: translateSampleType(language, 'Capilar'), color: '#0284C7' },
                  ] as const
                ).map((item) => {
                  const active = selectedSampleType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setSelectedSampleType(item.type)}
                      className={`relative rounded border p-2 min-h-[62px] flex flex-col items-center justify-center gap-1 transition-colors ${
                        active
                          ? 'bg-[#C9CFD6] border-[#64748B] shadow-inner'
                          : 'bg-[#F1F4F7] border-slate-300 hover:bg-[#E6EAEF]'
                      }`}
                    >
                      {active && (
                        <Check className="w-4 h-4 text-slate-900 stroke-[3] absolute top-1.5 left-1.5" />
                      )}
                      <SyringeIcon color={item.color} variant={item.type} />
                      <span className="text-[11px] font-bold text-slate-800">{item.label}</span>
                    </button>
                  );
                })}

                {/* AQC Button */}
                <button
                  type="button"
                  onClick={() => {
                    setLastAqcRun(null);
                    setAqcCountdown(null);
                    setAqcRunning(false);
                    setTab('AQC');
                  }}
                  className={`relative rounded border p-2 min-h-[62px] flex flex-col items-center justify-center gap-1 transition-colors ${
                    failedAqcLevels.length > 0
                      ? 'bg-amber-100 border-amber-500 hover:bg-amber-200'
                      : 'bg-[#F1F4F7] border-slate-300 hover:bg-[#E6EAEF]'
                  }`}
                >
                  <FlaskConical
                    className={`w-5 h-5 ${
                      failedAqcLevels.length > 0 ? 'text-amber-800' : 'text-[#0066B2]'
                    }`}
                  />
                  <span className="text-[11px] font-bold text-slate-900">AQC</span>
                  <span
                    className={`text-[10px] font-mono font-semibold ${
                      failedAqcLevels.length > 0 ? 'text-amber-900' : 'text-emerald-700'
                    }`}
                  >
                    {failedAqcLevels.length > 0
                      ? tr(language, `${failedAqcLevels.length} nivel fallo`, `${failedAqcLevels.length} level fail`)
                      : tr(language, 'Niv. 1-3 OK', 'Lvl. 1-3 OK')}
                  </span>
                </button>
              </div>

              {/* Centered Compact Cartridge Remaining Samples & Days Card between Sample Types and Atellica Connect */}
              <div className="my-auto bg-[#F6F8FA] border border-slate-300 rounded px-2.5 py-1.5 space-y-1 shrink-0">
                <div className="text-[11px] font-bold text-slate-800 pb-0.5 border-b border-slate-200/80">
                  {tr(language, 'Estado de los cartuchos', 'Cartridge status')}
                </div>

                {/* Row 1: Measurement Cartridge (M) */}
                <div className="flex items-center gap-2 py-0.5">
                  <div className="relative w-10 h-5 flex items-center justify-start pl-2.5 shrink-0">
                    <img
                      src="/assets/aistudio/cartridge_m.png"
                      alt={tr(language, 'Cartucho de medida', 'Measurement cartridge')}
                      className="max-h-[18px] w-auto object-contain"
                    />
                  </div>
                  <div className="leading-tight min-w-0">
                    <div className="text-[10.5px] font-bold text-slate-900 leading-none">
                      {tr(language, '560 muestras', '560 samples')}
                    </div>
                    <div className="text-[9px] text-slate-600 leading-tight">
                      {tr(language, '5 dias para finalizar', '5 days remaining')}
                    </div>
                  </div>
                </div>

                {/* Row 2: Wash Cartridge (W) with red circle top-left aligned horizontally with yellow circle */}
                <div className="flex items-center gap-2 pt-0.5 border-t border-slate-200/80">
                  <div className="relative w-10 h-5 flex items-center justify-start pl-2.5 shrink-0">
                    <img
                      src="/assets/aistudio/cartridge_w.png"
                      alt={tr(language, 'Cartucho de lavado', 'Wash cartridge')}
                      className="max-h-[17px] w-auto object-contain"
                    />
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-xs absolute top-0 left-0"
                    />
                  </div>
                  <div className="leading-tight min-w-0">
                    <div className="text-[10.5px] font-bold text-slate-900 leading-none">
                      {tr(language, '5 muestras', '5 samples')}
                    </div>
                    <div className="text-[9px] text-slate-600 leading-tight">
                      {tr(language, '1 dias para finalizar', '1 day remaining')}
                    </div>
                  </div>
                </div>

                {/* Row 3: AQC Cartridge with yellow circle top-left aligned horizontally with red circle */}
                <div className="flex items-center gap-2 pt-0.5 border-t border-slate-200/80">
                  <div className="relative w-10 h-5 flex items-center justify-start pl-2.5 shrink-0">
                    <img
                      src="/assets/aistudio/cartridge_aqc.png"
                      alt={tr(language, 'Cartucho AQC', 'AQC cartridge')}
                      className="max-h-[18px] w-auto object-contain"
                    />
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white shadow-xs absolute top-0 left-0"
                    />
                  </div>
                  <div className="leading-tight min-w-0">
                    <div className="text-[10.5px] font-bold text-slate-900 leading-none">
                      {tr(language, '67 muestras', '67 samples')}
                    </div>
                    <div className="text-[9px] text-slate-600 leading-tight">
                      {tr(language, '10 dias para finalizar', '10 days remaining')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Yellow Atellica Connect Box moved down to bottom of Column 1 */}
              <div className="bg-amber-100 border border-amber-400 rounded p-2 space-y-1 text-amber-950 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                    {pendingMessagesCount > 0 || Boolean(latestAtellica) ? (
                      <span
                        title={tr(language, 'Avisos activos en Atellica Connect', 'Active notices in Atellica Connect')}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full border animate-atellica-info-alert shrink-0"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <Info className="w-4 h-4 text-amber-800 shrink-0" />
                    )}
                    <span>Atellica Connect ({pendingMessagesCount})</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => triggerDemoAtellicaMessage()}
                      className="px-2 py-0.5 rounded border border-amber-700/40 bg-white/80 hover:bg-white text-[10px] font-bold text-amber-950 flex items-center gap-1 whitespace-nowrap"
                    >
                      <MessageSquarePlus className="w-3 h-3" />
                      <span>{tr(language, 'Simular', 'Simulate')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('ATELLICA')}
                      className="text-[10px] font-bold text-amber-900 hover:underline whitespace-nowrap"
                    >
                      {tr(language, 'Bandeja', 'Inbox')}
                    </button>
                  </div>
                </div>

                {latestAtellica ? (
                  <div className="bg-amber-200/75 border border-amber-500 rounded p-1.5 space-y-0.5">
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-bold text-amber-950">
                        {translateAtellicaPriority(language, latestAtellica.priority)} · {translateAtellicaStatus(language, latestAtellica.status)}
                      </span>
                      <span className="font-mono text-amber-900 truncate">
                        {resolveAtellicaText(language, latestAtellica, 'sender')}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-amber-950 line-clamp-1">
                      {resolveAtellicaText(language, latestAtellica, 'title')}
                    </div>
                    <p className="text-[10.5px] text-amber-950 line-clamp-2 leading-snug">
                      {resolveAtellicaText(language, latestAtellica, 'body')}
                    </p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {(latestAtellica.status === 'Recibido' ||
                        latestAtellica.status === 'Pendiente de lectura') && (
                        <button
                          type="button"
                          onClick={() => markAtellicaRead(latestAtellica.id)}
                          className="px-2 py-0.5 rounded border border-amber-700/40 bg-white/85 hover:bg-white text-[10px] font-semibold text-amber-950"
                        >
                          {tr(language, 'Marcar leído', 'Mark read')}
                        </button>
                      )}
                      {latestAtellica.status !== 'Confirmado' &&
                        latestAtellica.status !== 'Respondido' && (
                          <button
                            type="button"
                            onClick={() => confirmAtellicaReception(latestAtellica.id)}
                            className="px-2 py-0.5 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-[10px] font-semibold"
                          >
                            {tr(language, 'Confirmar recepción', 'Confirm receipt')}
                          </button>
                        )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-200/75 border border-amber-500 rounded p-1.5 space-y-0.5">
                    <div className="text-[10px] font-bold text-amber-900">
                      {tr(language, 'Mensaje de Atellica Connect · POCT', 'Atellica Connect Message · POCT')}
                    </div>
                    <p className="text-[11px] font-bold text-amber-950 leading-snug">
                      {tr(
                        language,
                        'Antes de iros cambiar el cartucho M, caduca este fin de semana',
                        'Before leaving, replace cartridge M — it expires this weekend'
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2 (Center 4 cols): Toggle Individuales / Agrupados + Parameter Matrix + Quick Profiles below + Latest */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-1.5 min-h-0">
              {/* Toggle Todos/Ninguno + Individuales vs Agrupados */}
              <div className="flex items-center justify-between gap-1.5 bg-[#F6F8FA] border border-slate-300 rounded px-2 py-1 shrink-0">
                <button
                  type="button"
                  onClick={toggleAllOrNone}
                  className={`px-2.5 py-1 rounded border text-[11px] font-bold whitespace-nowrap transition-colors ${
                    allAnalytesActive
                      ? 'bg-[#ECEFF3] border-slate-400 text-slate-900 hover:bg-slate-200'
                      : 'bg-[#E8630A] border-[#D15607] text-white hover:bg-[#D15607]'
                  }`}
                >
                  {allAnalytesActive ? tr(language, 'Ninguno', 'None') : tr(language, 'Todos', 'All')}
                </button>
                <div className="flex items-center bg-[#E3E7ED] p-0.5 rounded border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setParamDisplayMode('INDIVIDUAL')}
                    className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors ${
                      paramDisplayMode === 'INDIVIDUAL'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span>{tr(language, 'Individuales', 'Individual')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setParamDisplayMode('GROUPED')}
                    className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors ${
                      paramDisplayMode === 'GROUPED'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>{tr(language, 'Agrupados', 'Grouped')}</span>
                  </button>
                </div>
              </div>

              {/* Parameter Grid: Individual 3x4 OR Grouped 5 compact blocks sized to share space with Quick Profiles */}
              {paramDisplayMode === 'INDIVIDUAL' ? (
                <div className="flex-1 min-h-0 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-1.5 w-full max-w-[300px]">
                    {ANALYTE_MATRIX.map((tile) => {
                      const selected = selectedAnalytes.includes(tile.id);
                      const failedAqc = failedAqcParams.has(tile.id);
                      return (
                        <button
                          key={tile.id}
                          type="button"
                          onClick={() => toggleAnalyte(tile.id)}
                          title={
                            failedAqc
                              ? tr(language, `${tile.label}: advertencia QC`, `${tile.label}: QC warning`)
                              : `${tile.label}`
                          }
                          className={`relative rounded border px-2 py-1 h-[40px] flex items-center justify-center font-display font-bold text-sm transition-colors ${
                            failedAqc
                              ? 'bg-amber-300 border-amber-500 text-amber-950'
                              : selected
                                ? 'bg-[#C9CFD6] border-[#64748B] text-slate-950'
                                : 'bg-[#F1F4F7] border-slate-300 text-slate-400 hover:bg-[#E6EAEF]'
                          }`}
                        >
                          {selected && (
                            <Check
                              className={`w-3.5 h-3.5 stroke-[3] absolute top-1 left-1 ${
                                failedAqc ? 'text-amber-950' : 'text-slate-900'
                              }`}
                            />
                          )}
                          <span className="leading-none">
                            {tile.label}
                            {failedAqc && (
                              <sup className="ml-0.5 text-[9px] font-mono font-extrabold text-amber-950">
                                QC
                              </sup>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-hidden">
                  {ANALYTE_GROUPS.map((grp) => {
                    const allSelected = grp.analytes.every((a) => selectedAnalytes.includes(a));
                    const someSelected = grp.analytes.some((a) => selectedAnalytes.includes(a));
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => toggleGroup(grp.analytes)}
                        className={`relative flex-1 min-h-0 rounded border px-2 py-1 text-left flex items-center justify-between gap-1.5 transition-colors overflow-hidden ${
                          allSelected
                            ? 'bg-[#C9CFD6] border-[#64748B] text-slate-950'
                            : someSelected
                              ? 'bg-[#E2E7ED] border-slate-400 text-slate-800'
                              : 'bg-[#F1F4F7] border-slate-300 text-slate-400 hover:bg-[#E6EAEF]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 w-full">
                          <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                            {allSelected && <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />}
                          </div>
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="text-[11px] font-bold truncate">
                              {language === 'en' ? grp.labelEn : grp.labelEs}
                            </div>
                            <div className="text-[9.5px] font-mono flex flex-wrap items-center gap-x-1 gap-y-0 mt-0.5 leading-tight">
                              {grp.tokens.map((tok, i) => {
                                const hasQcWarn = tok.qcKeys.some((k) => failedAqcParams.has(k));
                                return (
                                  <React.Fragment key={tok.label}>
                                    {i > 0 && <span className="text-slate-400">·</span>}
                                    {hasQcWarn ? (
                                      <span className="px-1 py-0 rounded bg-amber-300 border border-amber-500 font-bold text-amber-950 leading-tight">
                                        {tok.label}
                                        <sup className="ml-0.5 text-[7.5px] font-extrabold">QC</sup>
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">{tok.label}</span>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Compact Profiles ("Solo pH" & "Bic y Ca++") placed below the parameter squares */}
              <div className="bg-[#F6F8FA] border border-slate-300 rounded p-2 space-y-1.5 shrink-0">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">{tr(language, 'Perfiles rápidos', 'Quick profiles')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreset(null);
                      setSelectedAnalytes(ANALYTE_MATRIX.map((a) => a.id));
                    }}
                    className="font-semibold text-[#0066B2] hover:underline"
                  >
                    {tr(language, 'Todos', 'All')} ({selectedAnalytes.length}/{ANALYTE_MATRIX.length})
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset(1)}
                    className={`relative rounded border px-2 py-1 text-left transition-colors ${
                      activePreset === 1
                        ? 'bg-[#C9CFD6] border-[#64748B] text-slate-950'
                        : 'bg-white border-slate-300 text-slate-800 hover:bg-[#ECEFF3]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold">{tr(language, 'Solo pH', 'pH only')}</span>
                      {activePreset === 1 && <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />}
                    </div>
                    <div className="font-mono text-[9.5px] text-slate-600">pH</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset(2)}
                    className={`relative rounded border px-2 py-1 text-left transition-colors ${
                      activePreset === 2
                        ? 'bg-[#C9CFD6] border-[#64748B] text-slate-950'
                        : 'bg-white border-slate-300 text-slate-800 hover:bg-[#ECEFF3]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold">{tr(language, 'Bic y Ca++', 'Bic & Ca++')}</span>
                      {activePreset === 2 && <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />}
                    </div>
                    <div className="font-mono text-[9.5px] text-slate-600">HCO3- · Ca++</div>
                  </button>
                </div>
              </div>

              {/* Subtle 1-line last determination readout */}
              {lastRecord && (
                <div className="bg-[#F6F8FA] border border-slate-300 rounded px-3 py-1 text-[11px] flex items-center justify-between gap-2 shrink-0">
                  <span className="text-slate-600 truncate">
                    {tr(language, 'Último paciente:', 'Latest patient:')}{' '}
                    <strong className="font-mono text-slate-900">{lastRecord.patientId}</strong> ·{' '}
                    <span className="font-mono">
                      pH {lastRecord.values.pH?.toFixed(3) ?? tr(language, 'N/D', 'N/A')}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLastReport(true)}
                    className="font-bold text-[#0066B2] hover:underline whitespace-nowrap"
                  >
                    {tr(language, 'Ver informe', 'View report')}
                  </button>
                </div>
              )}
            </div>

            {/* COLUMN 3 (Right 4 cols): Críticos + Conditional Acciones rápidas + Port & Start/Medición rápida + Patient/Lab ID below */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-1.5 min-h-0">
              {unackCriticalCount > 0 && (
                <div className="px-2.5 py-1 rounded bg-red-50 border border-red-300 text-[11px] text-red-900 flex items-center justify-between gap-2 shrink-0">
                  <span className="font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-700 shrink-0" />
                    {tr(
                      language,
                      `${unackCriticalCount} crítica(s) sin confirmar`,
                      `${unackCriticalCount} unacknowledged critical`
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTab('HISTORY')}
                    className="font-bold underline"
                  >
                    {tr(language, 'Confirmar', 'Acknowledge')}
                  </button>
                </div>
              )}

              {/* Acciones rápidas box: only visible if there are AQC or Calibration failures */}
              {showQuickActions && (
                <div className="bg-[#F6F8FA] border border-slate-300 rounded px-2.5 py-1.5 space-y-1 shrink-0">
                  <div className="text-[11px] font-bold text-slate-800">
                    {tr(language, 'Acciones rápidas', 'Quick actions')}
                  </div>
                  <div
                    className={`grid gap-1.5 ${
                      hasAqcFailure && hasCalibrationFailure ? 'grid-cols-2' : 'grid-cols-1'
                    }`}
                  >
                    {hasAqcFailure && (
                      <button
                        type="button"
                        onClick={() => {
                          setLastAqcRun(null);
                          setAqcCountdown(null);
                          setAqcRunning(false);
                          setTab('AQC');
                        }}
                        className="px-2 py-1 rounded border border-[#0066B2] bg-[#EDF5FC] hover:bg-sky-100 text-[11px] font-bold text-[#0066B2]"
                      >
                        AQC
                      </button>
                    )}
                    {hasCalibrationFailure && (
                      <button
                        type="button"
                        onClick={() => {
                          setCalStep('MENU');
                          setCalSelectedLabel(null);
                          setCalResult(null);
                          setTab('CALIBRATE');
                        }}
                        className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-900"
                      >
                        {tr(language, 'Calibrar', 'Calibrate')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Aspiration Diagram + Medición rápida & Iniciar Buttons */}
              <div className="flex-1 min-h-0 flex flex-col justify-center gap-1 bg-white border border-slate-200 rounded p-2">
                <PortAspirationGraphic sampleType={selectedSampleType} blocked={isBlocked} />
                <div className="text-center text-[11px] text-slate-600">
                  {homeBlocksStart
                    ? tr(language, 'Valide los datos demográficos para continuar', 'Validate patient demographics to continue')
                    : isBlocked
                      ? tr(language, 'Analizador bloqueado — revise AQC o estado', 'Analyzer locked — check AQC or status')
                      : tr(
                          language,
                          `Muestra ${translateSampleType(language, selectedSampleType)} · ${selectedAnalytes.length} parámetros`,
                          `${translateSampleType(language, selectedSampleType)} sample · ${selectedAnalytes.length} parameters`
                        )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={isBlocked}
                    onClick={() => {
                      setQuickWizardMode(true);
                      setTab('NEW_SAMPLE');
                    }}
                    title={tr(
                      language,
                      'Iniciar gasometría inmediata sin identificación previa del paciente',
                      'Start immediate blood gas measurement without prior patient identification'
                    )}
                    className="w-full min-h-[42px] px-3 py-1.5 rounded border-2 border-[#0066B2] bg-[#EDF5FC] hover:bg-sky-100 disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed active:scale-[0.99] text-[#0066B2] font-display font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <FileClock className="w-4 h-4 shrink-0" />
                    <span>{tr(language, 'Medición rápida', 'Quick measurement')}</span>
                  </button>

                  <button
                    type="button"
                    disabled={homeBlocksStart}
                    onClick={() => {
                      setQuickWizardMode(false);
                      setTab('NEW_SAMPLE');
                    }}
                    className="w-full min-h-[42px] px-4 py-1.5 rounded bg-[#E8630A] hover:bg-[#D15607] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed active:scale-[0.99] text-white font-display font-bold text-base flex items-center justify-between transition-all shadow-xs"
                  >
                    <span className="mx-auto pl-2 flex items-center gap-1.5">
                      {homeBlocksStart && <Lock className="w-4 h-4" />}
                      <span>{tr(language, 'Iniciar', 'Start')}</span>
                    </span>
                    <Play className="w-4 h-4 fill-current shrink-0" />
                  </button>
                </div>
              </div>

              {/* Patient / Lab ID Textbox & Barcode Button BELOW Iniciar & Medición rápida */}
              <div className="bg-[#F6F8FA] border border-slate-300 rounded p-2 space-y-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={simulateQuickScan}
                    title={
                      isLabMode
                        ? tr(language, 'Leer código de muestra', 'Scan sample barcode')
                        : tr(language, 'Leer código de barras del paciente', 'Scan patient barcode')
                    }
                    className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 shrink-0"
                  >
                    <Barcode className="w-4 h-4 text-[#E8630A]" />
                  </button>
                  <input
                    type="text"
                    value={quickPatientId}
                    onChange={(e) => handleQuickIdChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        startHomeIdentification(quickPatientId);
                      }
                    }}
                    placeholder={
                      isLabMode
                        ? tr(language, 'Nº Laboratorio (Opcional)', 'Lab No. (Optional)')
                        : tr(language, 'Nº Historia Clínica (Opcional)', 'Medical Record No. (Optional)')
                    }
                    className="flex-1 min-w-0 px-2 py-1 rounded border border-slate-300 bg-white text-xs font-mono uppercase text-slate-900 focus:outline-none focus:border-[#E8630A]"
                  />
                  {quickPatientId.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => startHomeIdentification(quickPatientId)}
                      className="px-2 py-1 rounded bg-[#0066B2] hover:bg-[#005291] text-white text-[11px] font-bold whitespace-nowrap"
                    >
                      {isLabMode
                        ? tr(language, 'Nº Laboratorio', 'Lab No.')
                        : tr(language, 'Nº Historia Clínica', 'MRN')}
                    </button>
                  )}
                </div>

                {homeIdError && (
                  <div className="text-[11px] text-red-700 font-semibold">{homeIdError}</div>
                )}

                {!isLabMode && homeCountdown !== null && (
                  <div className="bg-[#FFF8F3] border border-[#E8630A] rounded p-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-900">
                      <span className="w-5 h-5 rounded-full bg-[#E8630A] text-white font-mono flex items-center justify-center tabular-nums">
                        {homeCountdown}
                      </span>
                      <span>
                        {tr(
                          language,
                          `Buscando demográficos (${homeCountdown} s)...`,
                          `Fetching demographics (${homeCountdown} s)...`
                        )}
                      </span>
                    </div>
                    <Loader2 className="w-4 h-4 text-[#E8630A] animate-spin shrink-0" />
                  </div>
                )}

                {!isLabMode && homeDemographics && homeCountdown === null && (
                  <div
                    className={`rounded border p-1.5 text-[11px] space-y-1 ${
                      homeDemographicsConfirmed
                        ? 'bg-emerald-50 border-emerald-400'
                        : 'bg-amber-50 border-amber-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="truncate">{homeDemographics.fullName}</span>
                      <span className="font-mono text-[#0066B2] shrink-0">
                        {homeDemographics.sex === 'Femenino'
                          ? tr(language, 'Mujer', 'Female')
                          : tr(language, 'Varón', 'Male')}{' '}
                        · {homeDemographics.ageYears}
                        {tr(language, 'a', 'y')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 font-mono text-[10px]">
                      <span>
                        {tr(language, 'F. Nac:', 'DOB:')} {homeDemographics.birthDate}
                      </span>
                      {homeDemographicsConfirmed && (
                        <span className="text-emerald-800 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {tr(language, 'Validados', 'Validated')}
                        </span>
                      )}
                    </div>
                    {!homeDemographicsConfirmed && (
                      <button
                        type="button"
                        onClick={() => setHomeDemographicsConfirmed(true)}
                        className="w-full py-1 rounded bg-[#E8630A] hover:bg-[#D15607] text-white font-bold text-[11px]"
                      >
                        {tr(language, 'Confirmar demográficos', 'Confirm demographics')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW FULL LAST REPORT (Compact without extra header so no vertical scroll) */}
        {tab === 'HOME' && showLastReport && lastRecord && (
          <BloodGasReportView
            record={lastRecord}
            showBidiButton={!isLabMode}
            extraActions={
              <button
                type="button"
                onClick={() => setShowLastReport(false)}
                className="px-3 py-1 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-[11px] font-bold"
              >
                {tr(language, 'Volver a Inicio', 'Back to Home')}
              </button>
            }
          />
        )}

        {/* AQC AUTOMATIC QUALITY CONTROL SCREEN (EMBEDDED — NOT A POPUP) */}
        {tab === 'AQC' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between bg-white border border-slate-300 rounded-lg p-4 overflow-y-auto gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <FlaskConical className="w-5 h-5 text-[#0066B2]" />
                <div>
                  <h2 className="font-display font-bold text-base text-slate-900">
                    {tr(language, 'Control de Calidad Automático (AQC)', 'Automatic Quality Control (AQC)')}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {tr(
                      language,
                      'Seleccione el nivel 1, 2 o 3 para ejecutar el cartucho AutoQC',
                      'Select level 1, 2, or 3 to run the AutoQC cartridge'
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={aqcRunning}
                onClick={() => setTab('HOME')}
                className="px-4 py-2 rounded bg-[#E8630A] hover:bg-[#D15607] disabled:opacity-45 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{tr(language, 'Volver', 'Back')}</span>
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-3xl w-full mx-auto space-y-4">
              {failedAqcLevels.length > 0 ? (
                <div className="p-3 rounded-lg bg-amber-100 border border-amber-400 text-xs text-amber-950 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      {tr(language, 'Niveles con control no superado:', 'Levels with failed QC:')}
                    </div>
                    <div className="mt-0.5">
                      {failedAqcLevels
                        .map((f) =>
                          tr(
                            language,
                            `Nivel ${f.shortNumber} (${f.statusLabel})`,
                            `Level ${f.shortNumber} (${f.statusLabel})`
                          )
                        )
                        .join(' · ')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-semibold">
                    {tr(
                      language,
                      'Todos los niveles AQC (1, 2 y 3) superados correctamente.',
                      'All AQC levels (1, 2, and 3) passed successfully.'
                    )}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {levelStatusList.map((item) => {
                  const selected = aqcLevelId === item.level.id;
                  return (
                    <button
                      key={item.level.id}
                      type="button"
                      onClick={() => setAqcLevelId(item.level.id)}
                      className={`p-3.5 rounded-lg border-2 text-left transition-colors ${
                        selected
                          ? 'border-[#E8630A] bg-[#FFF8F3]'
                          : !item.passed
                            ? 'border-amber-400 bg-amber-100'
                            : 'border-slate-200 bg-[#F6F8FA] hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-sm text-slate-900">
                          {tr(language, `Nivel ${item.shortNumber}`, `Level ${item.shortNumber}`)}
                        </span>
                        <span
                          className={`text-[10.5px] font-bold ${
                            item.passed ? 'text-emerald-700' : 'text-amber-900'
                          }`}
                        >
                          {item.statusLabel}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1 truncate">
                        {translateClinicalText(language, item.level.name)}
                      </div>
                      <div className="text-[10.5px] font-mono text-slate-500 mt-0.5">
                        {tr(language, 'Lote:', 'Lot:')} {item.level.lotNumber}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F6F8FA] border border-slate-200 rounded-lg p-3 text-xs">
                <span className="font-semibold text-slate-700">
                  {tr(language, 'Modo de prueba AQC:', 'AQC test mode:')}
                </span>
                <select
                  value={aqcSimMode}
                  onChange={(e) =>
                    setAqcSimMode(e.target.value as 'CONFORME' | 'FUERA_DE_RANGO_1_3S')
                  }
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-medium"
                >
                  <option value="CONFORME">
                    {tr(language, 'Ciclo automático conforme', 'Compliant automatic cycle')}
                  </option>
                  <option value="FUERA_DE_RANGO_1_3S">
                    {tr(language, 'Simular nivel no superado (Westgard 1_3s)', 'Simulate failed level (Westgard 1_3s)')}
                  </option>
                </select>
              </div>

              {aqcRunning && aqcCountdown !== null && (
                <div className="p-3.5 rounded-lg bg-[#FFF8F3] border-2 border-[#E8630A] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-[#E8630A] text-white font-mono font-bold text-lg flex items-center justify-center tabular-nums">
                      {aqcCountdown}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {tr(language, 'Midiendo cartucho AutoQC...', 'Measuring AutoQC cartridge...')}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {tr(
                          language,
                          `Resultados disponibles en ${aqcCountdown} segundo(s)`,
                          `Results available in ${aqcCountdown} second(s)`
                        )}
                      </div>
                    </div>
                  </div>
                  <Loader2 className="w-5 h-5 text-[#E8630A] animate-spin shrink-0" />
                </div>
              )}

              {lastAqcRun && !aqcRunning && (
                <div
                  className={`p-3.5 rounded-lg border text-xs ${
                    lastAqcRun.status === 'CONFORME'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-amber-100 border-amber-400 text-amber-950'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>
                      {tr(language, 'Resultado', 'Result')} {translateClinicalText(language, lastAqcRun.levelName)}:{' '}
                      {lastAqcRun.status === 'CONFORME'
                        ? tr(language, 'CONFORME', 'COMPLIANT')
                        : lastAqcRun.status === 'ADVERTENCIA'
                          ? tr(language, 'ADVERTENCIA', 'WARNING')
                          : tr(language, 'RECHAZADO', 'REJECTED')}
                    </span>
                    <span className="font-mono text-[11px]">
                      pH {lastAqcRun.values.pH.toFixed(3)} · K+ {lastAqcRun.values.K.toFixed(2)}
                    </span>
                  </div>
                  {lastAqcRun.violatedRules.length > 0 && (
                    <div className="mt-1 text-[11px]">
                      {tr(language, 'Desviación:', 'Deviation:')}{' '}
                      {lastAqcRun.violatedRules.map((v) => `${v.parameter} (${v.rule})`).join(', ')}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={aqcRunning}
                  onClick={() => setTab('HOME')}
                  className="px-4 py-2 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 disabled:opacity-50 text-xs font-bold text-slate-800"
                >
                  {tr(language, 'Volver a Inicio', 'Back to Home')}
                </button>
                <button
                  type="button"
                  disabled={aqcRunning}
                  onClick={handleRunAqc}
                  className="px-5 py-2.5 rounded bg-[#E8630A] hover:bg-[#D15607] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2"
                >
                  {aqcRunning ? (
                    <>
                      <Clock className="w-4 h-4 animate-pulse" />
                      <span>
                        {tr(language, `Midiendo AQC (${aqcCountdown ?? 0} s)...`, `Measuring AQC (${aqcCountdown ?? 0} s)...`)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>{tr(language, 'Ejecutar AQC seleccionado', 'Run Selected AQC')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CALIBRATE QUICK SCREEN ("Un punto", "Dos puntos", "Completa" + 3s countdown) */}
        {tab === 'CALIBRATE' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between bg-white border border-slate-300 rounded-lg p-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-[#0066B2]" />
                <div>
                  <h2 className="font-display font-bold text-base text-slate-900">
                    {tr(language, 'Calibración del Analizador', 'Analyzer Calibration')}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {tr(
                      language,
                      'Seleccione el tipo de calibración que desea ejecutar',
                      'Select the calibration type to run'
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={calStep === 'RUNNING'}
                onClick={() => setTab('HOME')}
                className="px-4 py-2 rounded bg-[#E8630A] hover:bg-[#D15607] disabled:opacity-45 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{tr(language, 'Volver', 'Back')}</span>
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center min-h-0">
              {calStep === 'MENU' && (
                <div className="w-full max-w-sm flex flex-col gap-3">
                  {(['Un punto', 'Dos puntos', 'Completa'] as const).map((opt) => {
                    const optLabel =
                      opt === 'Un punto'
                        ? tr(language, 'Un punto', 'One point')
                        : opt === 'Dos puntos'
                          ? tr(language, 'Dos puntos', 'Two points')
                          : tr(language, 'Completa', 'Full');
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => startQuickCalOption(opt)}
                        className="w-full py-4 px-5 rounded-lg border-2 border-slate-300 bg-[#F6F8FA] hover:bg-[#EDF5FC] hover:border-[#0066B2] text-slate-900 font-display font-bold text-base flex items-center justify-between transition-colors shadow-xs"
                      >
                        <span>{optLabel}</span>
                        <Play className="w-4 h-4 text-[#0066B2] fill-current" />
                      </button>
                    );
                  })}
                </div>
              )}

              {calStep === 'RUNNING' && (
                <div className="w-full max-w-md bg-[#F6F8FA] border-2 border-[#E8630A] rounded-xl p-6 flex flex-col items-center text-center gap-4">
                  <div className="w-24 h-24 rounded-full bg-[#E8630A] text-white flex flex-col items-center justify-center shadow-md">
                    <span className="font-mono font-bold text-4xl leading-none tabular-nums">
                      {calCountdown}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider mt-1">
                      {tr(language, 'seg', 'sec')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="font-display font-bold text-base text-slate-900 flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 text-[#E8630A]" />
                      <span>
                        {tr(
                          language,
                          `Calibración «${calSelectedLabel}» en curso...`,
                          `Calibration "${
                            calSelectedLabel === 'Un punto'
                              ? 'One point'
                              : calSelectedLabel === 'Dos puntos'
                                ? 'Two points'
                                : 'Full'
                          }" in progress...`
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {tr(
                        language,
                        'Verificando soluciones calibradoras, pendiente de electrodos y referencia óptica.',
                        'Verifying calibration solutions, electrode slope, and optical reference.'
                      )}
                    </p>
                  </div>
                  <Loader2 className="w-6 h-6 text-[#E8630A] animate-spin" />
                </div>
              )}

              {calStep === 'RESULT' && calResult === 'ACCEPTED' && (
                <div className="w-full max-w-md bg-emerald-50 border-2 border-emerald-500 rounded-xl p-6 flex flex-col items-center text-center gap-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-700" />
                  <div className="font-display font-bold text-xl text-emerald-950">
                    {tr(language, 'Calibración aceptada', 'Calibration accepted')}
                  </div>
                  <p className="text-xs text-emerald-800">
                    {tr(
                      language,
                      `Calibración «${calSelectedLabel}» completada dentro de tolerancias.`,
                      `Calibration "${
                        calSelectedLabel === 'Un punto'
                          ? 'One point'
                          : calSelectedLabel === 'Dos puntos'
                            ? 'Two points'
                            : 'Full'
                      }" completed within tolerance.`
                    )}
                  </p>
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setCalStep('MENU')}
                      className="px-4 py-2 rounded border border-emerald-600 bg-white hover:bg-emerald-100 text-xs font-bold text-emerald-900"
                    >
                      {tr(language, 'Otra calibración', 'Another calibration')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('HOME')}
                      className="px-5 py-2 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold"
                    >
                      {tr(language, 'Volver', 'Back')}
                    </button>
                  </div>
                </div>
              )}

              {calStep === 'RESULT' && calResult === 'FAILED' && (
                <div className="w-full max-w-md bg-red-50 border-2 border-red-500 rounded-xl p-6 flex flex-col items-center text-center gap-4">
                  <XCircle className="w-12 h-12 text-red-700" />
                  <div className="font-display font-bold text-xl text-red-950 leading-snug">
                    {tr(language, 'Fallo Calibración', 'Calibration Failed')}
                    <br />
                    <span className="text-base font-semibold text-red-900">
                      {tr(language, 'Se repite calibración', 'Repeating calibration')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    {calSelectedLabel && (
                      <button
                        type="button"
                        onClick={() => startQuickCalOption(calSelectedLabel)}
                        className="px-4 py-2 rounded bg-[#0066B2] hover:bg-[#005291] text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{tr(language, 'Repetir calibración', 'Repeat calibration')}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setTab('HOME')}
                      className="px-5 py-2 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold"
                    >
                      {tr(language, 'Volver', 'Back')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CARTRIDGE STATUS SCREEN (FROM HEADER INFO BUTTON) */}
        {tab === 'CARTRIDGE_STATUS' && (
          <CartridgeStatusView onBack={() => setTab('HOME')} />
        )}

        {/* EMBEDDED STATISTICS DASHBOARD SCREEN (NOT A POPUP) */}
        {tab === 'STATS' && (
          <StatisticsDashboardView onBack={() => setTab('HOME')} />
        )}

        {/* REDUCED BLOOD GAS WIZARD */}
        {tab === 'NEW_SAMPLE' && (
          <NewBloodGasWizard
            mode={mode}
            quickMeasurement={quickWizardMode}
            initialSampleType={selectedSampleType}
            initialPatientId={quickPatientId}
            initialDemographics={isLabMode ? null : homeDemographics}
            initialDemographicsConfirmed={isLabMode ? true : homeDemographicsConfirmed}
            onClose={() => {
              setQuickWizardMode(false);
              setTab('HOME');
            }}
          />
        )}

        {/* CLINICAL HISTORY */}
        {tab === 'HISTORY' && <ClinicalHistoryView initialOnlyCritical={historyOnlyCritical} />}

        {/* UNIDENTIFIED / DEFERRED IDENTIFICATION SAMPLES */}
        {tab === 'UNIDENTIFIED' && (
          <UnidentifiedSamplesView
            initialRecordId={unidentifiedTargetRecordId}
            onBackToHome={() => {
              setUnidentifiedTargetRecordId(null);
              setTab('HOME');
            }}
          />
        )}

        {/* ATELLICA CONNECT */}
        {tab === 'ATELLICA' && <AtellicaConnectPanel />}

        {/* HELP & INCIDENTS (Zero Vertical Scroll - Click any error to filter by error type) */}
        {tab === 'HELP' && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
            <div className="lg:col-span-6 bg-white border border-slate-300 rounded-lg p-3.5 flex flex-col gap-2 min-h-0 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#E8630A]" />
                  <div>
                    <h3 className="font-display font-bold text-sm sm:text-base text-slate-900">
                      {tr(language, 'Listado de incidencias', 'Incident List')} ({filteredIncidents.length})
                    </h3>
                    <p className="text-[10.5px] text-slate-500">
                      {tr(
                        language,
                        'Pulse sobre una incidencia para filtrar por su tipo de error',
                        'Click an incident to filter by its error type'
                      )}
                    </p>
                  </div>
                </div>

                {incidentTypeFilter && (
                  <button
                    type="button"
                    onClick={() => setIncidentTypeFilter(null)}
                    className="px-2.5 py-1 rounded bg-[#EDF5FC] border border-[#0066B2] text-[#0066B2] text-[11px] font-bold flex items-center gap-1 hover:bg-sky-100"
                  >
                    <span>
                      {tr(language, 'Filtro:', 'Filter:')} {activeIncidentFilterLabel}
                    </span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                {filteredIncidents.map((inc) => {
                  const isActiveFilter = incidentTypeFilter === inc.errorKey;
                  const typeBadgeCls =
                    inc.errorKey === 'REAGENTS'
                      ? 'bg-sky-100 border-sky-300 text-sky-900'
                      : inc.errorKey === 'PARAMS'
                        ? 'bg-amber-100 border-amber-400 text-amber-950'
                        : inc.errorKey === 'TEMP'
                          ? 'bg-orange-100 border-orange-300 text-orange-950'
                          : inc.errorKey === 'MECH'
                            ? 'bg-red-100 border-red-300 text-red-900'
                            : 'bg-slate-100 border-slate-300 text-slate-800';

                  return (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() =>
                        setIncidentTypeFilter((prev) =>
                          prev === inc.errorKey ? null : inc.errorKey
                        )
                      }
                      className={`w-full text-left p-2 rounded border transition-colors ${
                        isActiveFilter
                          ? 'border-[#0066B2] bg-[#EDF5FC]'
                          : 'border-slate-200 bg-[#F8FAFC] hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold ${typeBadgeCls}`}
                          >
                            {inc.errorType}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-slate-600">
                            {inc.code}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(inc.timestamp).toLocaleString(locale, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1">{inc.title}</div>
                      <div className="text-[11px] text-slate-600 leading-snug mt-0.5">
                        {inc.detail}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-6 bg-white border border-slate-300 rounded-lg p-4 space-y-3 overflow-hidden">
              <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#E8630A]" />
                <span>
                  {tr(
                    language,
                    'Notificar Incidencia Técnica al Coordinador (Atellica Connect)',
                    'Report Technical Incident to Coordinator (Atellica Connect)'
                  )}
                </span>
              </h3>

              <form onSubmit={handleReportSubmit} className="space-y-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr(language, 'Motivo / Título breve', 'Reason / Brief Title')}
                  </label>
                  <input
                    type="text"
                    required
                    value={incTitle}
                    onChange={(e) => setIncTitle(e.target.value)}
                    placeholder={tr(
                      language,
                      'Ej. Fuga en puerto o lector de códigos lento',
                      'e.g. Port leak or slow barcode scanner'
                    )}
                    className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:outline-none focus:border-[#E8630A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr(language, 'Gravedad percibida', 'Perceived Severity')}
                  </label>
                  <select
                    value={incSeverity}
                    onChange={(e) => setIncSeverity(e.target.value as MaintenanceError['severity'])}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-xs"
                  >
                    <option value="Baja">{tr(language, 'Baja (informativa)', 'Low (informational)')}</option>
                    <option value="Media">{tr(language, 'Media (revisión técnica)', 'Medium (technical review)')}</option>
                    <option value="Alta">{tr(language, 'Alta (afecta a determinaciones)', 'High (affects measurements)')}</option>
                    <option value="Crítica">{tr(language, 'Crítica (detiene uso clínico)', 'Critical (halts clinical use)')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr(language, 'Descripción', 'Description')}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={incDesc}
                    onChange={(e) => setIncDesc(e.target.value)}
                    placeholder={tr(
                      language,
                      'Detalle lo observado en el analizador...',
                      'Describe what was observed on the analyzer...'
                    )}
                    className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{tr(language, 'Registrar incidencia', 'Log Incident')}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* CLINICAL SUBMENU MODAL: SUCESOS */}
      {clinicalModal === 'EVENTS' && (
        <div className="absolute inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-400 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-[#F6F8FA] flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-900">
                {tr(language, 'Sucesos e Incidencias Recientes', 'Recent Events & Incidents')}
              </h3>
              <button
                type="button"
                onClick={() => setClinicalModal(null)}
                className="p-1.5 rounded border border-slate-300 hover:bg-slate-200 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2 text-xs">
              {state.auditLogs.slice(0, 15).map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded border border-slate-200 bg-slate-50 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {log.module} · {translateClinicalText(language, log.action)}
                    </div>
                    <div className="text-slate-600 mt-0.5">{translateClinicalText(language, log.details)}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {tr(language, 'Operador:', 'Operator:')} {log.userName}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString(locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM INSTRUMENT SOFTKEY BAR */}
      {!hideBottomNav && (
        <nav
          aria-label={tr(language, 'Navegación táctil Modo Clínico', 'Clinical Mode Touch Navigation')}
          className="bg-[#FEE2E2] dark:bg-[#26282C] border-t border-red-200 dark:border-neutral-700 px-2.5 py-1.5 grid grid-cols-5 gap-2 shrink-0"
        >
          {(
            [
              { id: 'HOME', label: tr(language, 'Inicio', 'Home'), Icon: Home },
              { id: 'NEW_SAMPLE', label: tr(language, 'Asistente', 'Wizard'), Icon: PlusCircle },
              { id: 'HISTORY', label: tr(language, 'Histórico', 'History'), Icon: History },
              {
                id: 'ATELLICA',
                label: tr(
                  language,
                  `Avisos Coordinador (${pendingMessagesCount})`,
                  `Coordinator Notices (${pendingMessagesCount})`
                ),
                Icon: MessageSquareWarning,
              },
              { id: 'HELP', label: tr(language, 'Incidencias', 'Incidents'), Icon: HelpCircle },
            ] as const
          ).map((item) => {
            const Icon = item.Icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'HISTORY') setHistoryOnlyCritical(false);
                  if (item.id === 'NEW_SAMPLE') setQuickWizardMode(false);
                  setTab(item.id);
                  setShowLastReport(false);
                }}
                className={`min-h-[42px] px-2 py-1.5 rounded border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  active
                    ? 'bg-[#C9CFD6] border-[#E8630A] text-slate-950'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#E8630A]' : 'text-slate-600'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};
