import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Barcode,
  CheckCircle2,
  Clock,
  Droplets,
  HelpCircle,
  Loader2,
  Lock,
  Play,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Syringe,
  UserCheck,
  Wind,
  X,
  XCircle,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import {
  BloodGasRecord,
  ClinicalProfileScenario,
  SampleType,
  SimulatedOutcome,
} from '@/src/types/analyzer';
import { BloodGasReportView } from '@/src/components/common/BloodGasReportView';
import {
  generateRandomPatientDemographics,
  PatientDemographics,
} from '@/src/utils/patientDemographics';
import {
  localeFor,
  tr,
  translateClinicalScenario,
  translateClinicalText,
  translateSampleType,
} from '@/src/i18n/translations';

interface NewBloodGasWizardProps {
  onClose: () => void;
  mode?: 'CLINICAL' | 'LABORATORY';
  quickMeasurement?: boolean;
  initialSampleType: SampleType;
  initialPatientId?: string;
  initialDemographics?: PatientDemographics | null;
  initialDemographicsConfirmed?: boolean;
}

const LOCATIONS = [
  'UCI Polivalente · Box Central',
  'UCI Box 01',
  'UCI Box 02',
  'Urgencias Críticos',
  'Urgencias Box 04',
  'Reanimación Quirúrgica',
  'Quirófano 3',
  'Neonatología UCIN',
  'Neumología Planta 4',
];

const SCENARIOS: ClinicalProfileScenario[] = [
  'Normal',
  'Acidosis metabólica',
  'Acidosis respiratoria',
  'Alcalosis metabólica',
  'Alcalosis respiratoria',
  'Trastorno mixto',
  'Hipoxemia',
  'Hiperlactatemia',
  'Alteración electrolítica',
  'Alteración cooximetría',
];

const OUTCOMES: {
  id: SimulatedOutcome;
  labelEs: string;
  labelEn: string;
  descEs: string;
  descEn: string;
}[] = [
  { id: 'OK', labelEs: 'Análisis correcto', labelEn: 'Normal analysis', descEs: 'Flujo completo sin incidencias mecánicas.', descEn: 'Complete workflow without mechanical incidents.' },
  { id: 'RESULTADO_CRITICO', labelEs: 'Resultado crítico', labelEn: 'Critical result', descEs: 'Simula valores críticos que exigen confirmación.', descEn: 'Simulates critical values requiring confirmation.' },
  { id: 'INCOHERENCIA_FORZADA', labelEs: 'Incoherencia fisiológica', labelEn: 'Physiological inconsistency', descEs: 'Dispara el motor de coherencia para revisión.', descEn: 'Triggers coherence engine for review.' },
  { id: 'PARAMETRO_NO_DISPONIBLE', labelEs: 'Parámetro no disponible', labelEn: 'Parameter unavailable', descEs: 'Emite N/D en Ca++ y FMetHb.', descEn: 'Outputs N/A for Ca++ and FMetHb.' },
  { id: 'MUESTRA_INSUFICIENTE', labelEs: 'Muestra insuficiente', labelEn: 'Insufficient sample', descEs: 'Aborta análisis con alarma E-112.', descEn: 'Aborts analysis with alarm E-112.' },
  { id: 'COAGULO', labelEs: 'Coágulo detectado', labelEn: 'Clot detected', descEs: 'Aborta análisis con alarma E-304.', descEn: 'Aborts analysis with alarm E-304.' },
  { id: 'ERROR_ASPIRACION', labelEs: 'Error de aspiración', labelEn: 'Aspiration error', descEs: 'Fallo de vacío con alarma E-208.', descEn: 'Vacuum fault with alarm E-208.' },
  { id: 'ERROR_ANALITICO', labelEs: 'Error analítico', labelEn: 'Analytical error', descEs: 'Fallo de sensor con alarma E-419.', descEn: 'Sensor failure with alarm E-419.' },
];

function formatProvisionalBgId(existingRecords: BloodGasRecord[]): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const base = `BG-${yyyy}-${mm}-${dd}-${hh}-${min}`;
  const used = new Set(existingRecords.map((r) => r.analysisUniqueId).filter(Boolean) as string[]);
  if (!used.has(base)) return base;
  let seq = 2;
  while (used.has(`${base}-${String(seq).padStart(2, '0')}`)) {
    seq += 1;
  }
  return `${base}-${String(seq).padStart(2, '0')}`;
}

export const NewBloodGasWizard: React.FC<NewBloodGasWizardProps> = ({
  onClose,
  mode = 'CLINICAL',
  quickMeasurement = false,
  initialSampleType,
  initialPatientId = '',
  initialDemographics = null,
  initialDemographicsConfirmed = false,
}) => {
  const { state, currentUser, executeBloodGas, setClotPortOverlayOpen, pushToast, language } = useAnalyzer();
  const isLabMode = mode === 'LABORATORY';

  // Reduced 3-step wizard (quickMeasurement starts directly in Step 2 - Camera Analysis):
  // 1 = Paciente (+ Demográficos en Clínico) + Preparación de muestra
  // 2 = Análisis en cámara
  // 3 = Resultados completos
  const [step, setStep] = useState<1 | 2 | 3>(quickMeasurement ? 2 : 1);

  const sampleType: SampleType = initialSampleType;

  // Step 1A: Identification
  const [patientId, setPatientId] = useState(initialPatientId);
  const [patientLocation, setPatientLocation] = useState(LOCATIONS[0]);
  const [fio2, setFio2] = useState<string>('21');
  const [temperatureC, setTemperatureC] = useState<string>('37.0');
  const [patientError, setPatientError] = useState<string | null>(null);

  // Demographics (only used in CLINICAL mode)
  const [countdown, setCountdown] = useState<number | null>(null);
  const [demographics, setDemographics] = useState<PatientDemographics | null>(
    isLabMode || quickMeasurement ? null : initialDemographics
  );
  const [demographicsConfirmed, setDemographicsConfirmed] = useState<boolean>(
    isLabMode || quickMeasurement ? true : initialDemographicsConfirmed
  );

  // Step 1B: Preparation checklist (all start UNCHECKED; "Obligatorio" toggle)
  const [prepRequired, setPrepRequired] = useState<boolean>(true);
  const [homogenized, setHomogenized] = useState<boolean>(false);
  const [bubblesRemoved, setBubblesRemoved] = useState<boolean>(false);
  const [noClots, setNoClots] = useState<boolean>(false);
  const [sufficientVolume, setSufficientVolume] = useState<boolean>(false);
  const [extractionMinutesAgo, setExtractionMinutesAgo] = useState<string>('4');

  // Step 2: Simulation config & 3-second countdown chronometer
  const [provisionalId, setProvisionalId] = useState<string>(() =>
    formatProvisionalBgId(state.records)
  );
  const [quickReference, setQuickReference] = useState('');
  const [showProvisionalTicketModal, setShowProvisionalTicketModal] = useState(false);
  const [scenario, setScenario] = useState<ClinicalProfileScenario>('Normal');
  const [outcome, setOutcome] = useState<SimulatedOutcome>('OK');
  const [isProcessing, setIsProcessing] = useState(false);
  const [measureCountdown, setMeasureCountdown] = useState<number | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);

  // Step 3: Result
  const [completedRecord, setCompletedRecord] = useState<BloodGasRecord | null>(null);

  const isAnalyzerBlocked =
    state.analyzerStatus === 'NO_DISPONIBLE' ||
    state.analyzerStatus === 'MANTENIMIENTO';

  const cleanPatientId = patientId.trim().toUpperCase();
  const isPatientIdFormatValid = /^[A-Z0-9-]{4,16}$/.test(cleanPatientId);

  const existingPatientRecords = cleanPatientId
    ? state.records.filter((r) => r.patientId.toUpperCase() === cleanPatientId)
    : [];
  const hasRecentDuplicate = existingPatientRecords.some(
    (r) => Date.now() - new Date(r.timestamp).getTime() < 2 * 3600 * 1000
  );

  const allPrepChecked = homogenized && bubblesRemoved && noClots && sufficientVolume;
  const clinicalUnlocked = isLabMode || demographicsConfirmed;
  const canContinueStep1 =
    isPatientIdFormatValid &&
    clinicalUnlocked &&
    countdown === null &&
    (!prepRequired || allPrepChecked);

  const triggerIdentification = (idToLookup: string) => {
    const clean = idToLookup.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,16}$/.test(clean)) {
      setPatientError(
        tr(
          language,
          `Formato inválido. Use 4–16 caracteres alfanuméricos o guiones (${isLabMode ? 'ej. LAB001' : 'ej. DEMO001'}).`,
          `Invalid format. Use 4–16 alphanumeric characters or hyphens (${isLabMode ? 'e.g. LAB001' : 'e.g. DEMO001'}).`
        )
      );
      return;
    }
    setPatientError(null);
    if (isLabMode) {
      // Lab mode: NO demographic lookup or validation
      setDemographics(null);
      setDemographicsConfirmed(true);
      setCountdown(null);
      return;
    }
    setDemographics(null);
    setDemographicsConfirmed(false);
    setCountdown(3);
  };

  // Auto-trigger 3s countdown on mount in CLINICAL mode if an ID arrived from Home without validated demographics
  useEffect(() => {
    if (!quickMeasurement && !isLabMode && initialPatientId.trim() && !initialDemographics && countdown === null) {
      triggerIdentification(initialPatientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3-second countdown timer for demographic lookup (CLINICAL only)
  useEffect(() => {
    if (isLabMode || countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      setDemographics(generateRandomPatientDemographics(cleanPatientId));
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, cleanPatientId, isLabMode]);

  const handlePatientIdChange = (val: string) => {
    const upper = val.toUpperCase();
    setPatientId(upper);
    setPatientError(null);
    if (!isLabMode) {
      if (demographics && upper.trim() !== demographics.patientId) {
        setDemographics(null);
        setDemographicsConfirmed(false);
      }
      if (countdown !== null) {
        setCountdown(null);
      }
    }
  };

  const simulateBarcodeScan = () => {
    const demoIds = isLabMode
      ? ['LAB-1001', 'LAB-1002', 'LAB-2045', 'DEMO001', 'DEMO002']
      : ['DEMO001', 'DEMO002', 'DEMO003', 'DEMO017', 'DEMO018', 'DEMO019'];
    const pick = demoIds[Math.floor(Math.random() * demoIds.length)];
    setPatientId(pick);
    triggerIdentification(pick);
  };

  const handleTogglePrep1 = (checked: boolean) => {
    setHomogenized(checked);
    if (!checked && !isLabMode) {
      setBubblesRemoved(false);
      setNoClots(false);
      setSufficientVolume(false);
    }
  };

  const handleTogglePrep2 = (checked: boolean) => {
    setBubblesRemoved(checked);
    if (!checked && !isLabMode) {
      setNoClots(false);
      setSufficientVolume(false);
    }
  };

  const handleTogglePrep3 = (checked: boolean) => {
    setNoClots(checked);
    if (!checked && !isLabMode) {
      setSufficientVolume(false);
    }
  };

  const handleActivateAllPrep = () => {
    if (!clinicalUnlocked) return;
    setHomogenized(true);
    setBubblesRemoved(true);
    setNoClots(true);
    setSufficientVolume(true);
    if (!isPatientIdFormatValid) {
      setPatientError(
        tr(
          language,
          `Introduzca un ${isLabMode ? 'Nº Laboratorio' : 'Nº Historia Clínica'} válido.`,
          `Enter a valid ${isLabMode ? 'Lab No.' : 'Medical Record No.'}.`
        )
      );
      return;
    }
    const fio2Num = Number(fio2);
    if (fio2 !== '' && (Number.isNaN(fio2Num) || fio2Num < 21 || fio2Num > 100)) {
      setPatientError(tr(language, 'La FiO2 debe situarse entre 21% y 100%.', 'FiO2 must be between 21% and 100%.'));
      return;
    }
    setPatientError(null);
    setStep(2);
  };

  const validateStep1AndAdvance = () => {
    if (!isPatientIdFormatValid) {
      setPatientError(
        tr(
          language,
          `Introduzca un ${isLabMode ? 'Nº Laboratorio' : 'Nº Historia Clínica'} válido.`,
          `Enter a valid ${isLabMode ? 'Lab No.' : 'Medical Record No.'}.`
        )
      );
      return;
    }
    if (!isLabMode && (!demographics || !demographicsConfirmed)) {
      setPatientError(tr(language, 'Debe validar los datos demográficos del paciente antes de continuar.', 'Validate patient demographics before continuing.'));
      return;
    }
    if (prepRequired && !allPrepChecked) {
      setPatientError(tr(language, 'Preparación de Muestra es obligatoria: marque todos los puntos para continuar.', 'Sample Preparation is mandatory: check all items to continue.'));
      return;
    }
    const fio2Num = Number(fio2);
    if (fio2 !== '' && (Number.isNaN(fio2Num) || fio2Num < 21 || fio2Num > 100)) {
      setPatientError(tr(language, 'La FiO2 debe situarse entre 21% y 100%.', 'FiO2 must be between 21% and 100%.'));
      return;
    }
    setPatientError(null);
    setStep(2);
  };

  const startProcessing = () => {
    setProcessError(null);
    setIsProcessing(true);
    setMeasureCountdown(3);
  };

  useEffect(() => {
    if (!isProcessing || measureCountdown === null) return;

    if (measureCountdown <= 0) {
      const trimmedMinutes = extractionMinutesAgo.trim();
      const parsedExtractionMinutes =
        trimmedMinutes !== '' &&
        trimmedMinutes.toLowerCase() !== 'desconocido' &&
        trimmedMinutes.toLowerCase() !== 'unknown' &&
        !Number.isNaN(Number(trimmedMinutes))
          ? Number(trimmedMinutes)
          : undefined;

      const res = executeBloodGas({
        patientId: quickMeasurement ? 'SIN IDENTIFICAR' : cleanPatientId,
        patientDemographics:
          !quickMeasurement && !isLabMode && demographics
            ? {
                fullName: demographics.fullName,
                sex: demographics.sex,
                birthDate: demographics.birthDate,
                ageYears: demographics.ageYears,
              }
            : undefined,
        patientLocation: quickMeasurement
          ? 'Pendiente de identificación'
          : isLabMode
            ? 'Laboratorio Central / POCT'
            : patientLocation,
        sampleType,
        operatorName: currentUser?.fullName,
        fio2: quickMeasurement ? undefined : fio2 ? Number(fio2) : undefined,
        temperatureC: quickMeasurement ? undefined : temperatureC ? Number(temperatureC) : undefined,
        extractionMinutesAgo: quickMeasurement ? undefined : parsedExtractionMinutes,
        scenario,
        outcome,
        isQuickMeasurement: quickMeasurement,
        provisionalId: quickMeasurement ? provisionalId : undefined,
        quickReference: quickMeasurement ? quickReference.trim() || undefined : undefined,
        measuredMode: mode,
        preanalyticalChecklist: {
          homogenized: quickMeasurement ? true : homogenized,
          bubblesRemoved: quickMeasurement ? true : bubblesRemoved,
          noClots: quickMeasurement ? true : noClots,
          sufficientVolume: quickMeasurement ? true : sufficientVolume,
        },
      });
      setIsProcessing(false);
      setMeasureCountdown(null);
      if (res.ok && res.data) {
        setCompletedRecord(res.data);
        setStep(3);
      } else {
        setProcessError(translateClinicalText(language, res.error ?? tr(language, 'Error durante el análisis simulado.', 'Error during simulated analysis.')));
        if (outcome === 'COAGULO') {
          setClotPortOverlayOpen(true);
        }
      }
      return;
    }

    const timer = setTimeout(() => {
      setMeasureCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    isProcessing,
    measureCountdown,
    cleanPatientId,
    isLabMode,
    demographics,
    patientLocation,
    sampleType,
    currentUser?.fullName,
    fio2,
    temperatureC,
    extractionMinutesAgo,
    scenario,
    outcome,
    provisionalId,
    quickReference,
    homogenized,
    bubblesRemoved,
    noClots,
    sufficientVolume,
    executeBloodGas,
    setClotPortOverlayOpen,
    quickMeasurement,
    mode,
  ]);

  const resetWizard = () => {
    setStep(1);
    setPatientId('');
    setProvisionalId(formatProvisionalBgId(state.records));
    setQuickReference('');
    setDemographics(null);
    setDemographicsConfirmed(isLabMode);
    setCountdown(null);
    setHomogenized(false);
    setBubblesRemoved(false);
    setNoClots(false);
    setSufficientVolume(false);
    setCompletedRecord(null);
    setProcessError(null);
    setMeasureCountdown(null);
    if (quickMeasurement) {
      setStep(2);
    }
  };

  const stepsMeta = quickMeasurement
    ? [
        { num: 2, label: tr(language, '1. Análisis Rápido en Cámara', '1. Quick Chamber Analysis') },
        { num: 3, label: tr(language, '2. Resultados (Identificación Diferida)', '2. Results (Deferred ID)') },
      ]
    : [
        {
          num: 1,
          label: isLabMode
            ? tr(language, '1. Nº Laboratorio y Preparación', '1. Lab No. & Prep')
            : tr(language, '1. Nº Historia Clínica, Demográficos y Preparación', '1. Record No., Demographics & Prep'),
        },
        { num: 2, label: tr(language, '2. Análisis en Cámara', '2. Chamber Analysis') },
        { num: 3, label: tr(language, '3. Resultados', '3. Results') },
      ];

  const prepItems = [
    {
      idx: 1,
      checked: homogenized,
      onChange: handleTogglePrep1,
      enabled: clinicalUnlocked,
      title: tr(language, 'Homogeneización suave (8–10 inversiones)', 'Gentle mixing (8–10 inversions)'),
      icon: (
        <motion.div
          animate={{ rotate: [-24, 24, -24] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-7 h-7 rounded bg-sky-100 text-[#0066B2] flex items-center justify-center shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </motion.div>
      ),
    },
    {
      idx: 2,
      checked: bubblesRemoved,
      onChange: handleTogglePrep2,
      enabled: clinicalUnlocked && (isLabMode || homogenized),
      title: tr(language, 'Eliminación completa de burbujas de aire', 'Complete air bubble removal'),
      icon: (
        <motion.div
          animate={{ y: [2, -3, 2], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-7 h-7 rounded bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0"
        >
          <Wind className="w-3.5 h-3.5" />
        </motion.div>
      ),
    },
    {
      idx: 3,
      checked: noClots,
      onChange: handleTogglePrep3,
      enabled: clinicalUnlocked && (isLabMode || (homogenized && bubblesRemoved)),
      title: tr(language, 'Sin coágulos visibles (purga inicial)', 'No visible clots (initial purge)'),
      icon: (
        <motion.div
          animate={{ scale: [1, 1.16, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-7 h-7 rounded bg-rose-100 text-rose-700 flex items-center justify-center shrink-0"
        >
          <Droplets className="w-3.5 h-3.5" />
        </motion.div>
      ),
    },
    {
      idx: 4,
      checked: sufficientVolume,
      onChange: setSufficientVolume,
      enabled: clinicalUnlocked && (isLabMode || (homogenized && bubblesRemoved && noClots)),
      title:
        sampleType === 'Capilar'
          ? tr(language, 'Capilar heparinizado lleno (> 100 µL)', 'Heparinized capillary filled (> 100 µL)')
          : tr(language, 'Volumen suficiente (> 0,5 mL heparina litio)', 'Sufficient volume (> 0.5 mL lithium heparin)'),
      icon: (
        <motion.div
          animate={{ x: [-2, 2, -2] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-7 h-7 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"
        >
          <Syringe className="w-3.5 h-3.5" />
        </motion.div>
      ),
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
      {/* Compact Top Wizard Bar (hidden on Step 3 so full results fit without vertical scroll) */}
      {step !== 3 && (
        <div className="bg-[#F6F8FA] border border-slate-300 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
            aria-label={tr(language, 'Volver a pantalla principal', 'Back to home screen')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-display font-bold text-sm text-slate-900 flex flex-wrap items-center gap-2">
              <span>
                {quickMeasurement
                  ? tr(
                      language,
                      `Medición Rápida (Identificación Diferida) · Muestra ${translateSampleType(language, sampleType)}`,
                      `Quick Measurement (Deferred ID) · ${translateSampleType(language, sampleType)} Sample`
                    )
                  : tr(
                      language,
                      `Determinación Gasométrica · Muestra ${translateSampleType(language, sampleType)}`,
                      `Blood Gas Determination · ${translateSampleType(language, sampleType)} Sample`
                    )}
              </span>
              {quickMeasurement && (
                <span className="px-2 py-0.5 rounded-full bg-orange-100 border border-orange-400 text-orange-950 text-[10px] font-mono font-bold">
                  {tr(language, 'ID Provisional:', 'Provisional ID:')} {provisionalId}
                </span>
              )}
            </h2>
            <p className="text-[10.5px] text-slate-600">
              {tr(language, 'Operador:', 'Operator:')} <strong>{currentUser?.fullName}</strong> ·{' '}
              {isLabMode
                ? tr(language, 'Modo Laboratorio', 'Laboratory Mode')
                : tr(language, 'Modo Clínico', 'Clinical Mode')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {stepsMeta.map((s) => {
            const isCurrent = step === s.num;
            const isDone = step > s.num;
            const isLocked = !quickMeasurement && s.num > 1 && !canContinueStep1 && step === 1;
            return (
              <div
                key={s.num}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap border ${
                  isCurrent
                    ? 'bg-[#E8630A] text-white border-[#E8630A]'
                    : isDone
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : isLocked
                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                        : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {isLocked && <Lock className="w-3 h-3" />}
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Blocked State Guard (only MANTENIMIENTO / NO_DISPONIBLE, no QC/Cal block) */}
      {isAnalyzerBlocked && step < 3 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-2.5 flex items-start gap-2.5 shrink-0">
          <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <div className="text-xs text-red-900">
            <span className="font-bold">
              {tr(language, 'Analizador no disponible: ', 'Analyzer unavailable: ')}
            </span>
            {state.analyzerStatus === 'MANTENIMIENTO'
              ? tr(
                  language,
                  'El equipo se encuentra actualmente en modo MANTENIMIENTO.',
                  'The instrument is currently in MAINTENANCE mode.'
                )
              : tr(
                  language,
                  'El analizador está en estado NO DISPONIBLE por incidencia crítica o consumible agotado.',
                  'The analyzer is UNAVAILABLE due to a critical incident or depleted consumable.'
                )}
          </div>
        </div>
      )}

      {/* PASO 1: IDENTIFICACIÓN (+ DEMOGRÁFICOS EN CLÍNICO) + PREPARACIÓN */}
      {step === 1 && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch overflow-hidden">
          {/* Left 7 cols: Patient/Lab ID + Demographics (Clinical only) + Temp/FiO2/Location */}
          <div className="lg:col-span-7 bg-white border border-slate-300 rounded-lg p-3.5 space-y-2.5 flex flex-col justify-between overflow-hidden">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="font-display font-bold text-sm text-slate-900">
                  {isLabMode
                    ? tr(language, '1A. Identificación de Muestra de Laboratorio', '1A. Laboratory Sample Identification')
                    : tr(language, '1A. Nº Historia Clínica y Validación Demográfica', '1A. Medical Record No. & Demographic Validation')}
                </h3>
                <span className="font-mono text-[11px] font-bold text-[#0066B2]">
                  {tr(language, 'Muestra:', 'Sample:')} {translateSampleType(language, sampleType)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isLabMode ? tr(language, 'Nº Laboratorio', 'Lab No.') : tr(language, 'Nº Historia Clínica', 'Medical Record No.')}
                  </label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => handlePatientIdChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        triggerIdentification(patientId);
                      }
                    }}
                    placeholder={isLabMode ? tr(language, 'Ej. LAB-1001', 'e.g. LAB-1001') : tr(language, 'Ej. DEMO001', 'e.g. DEMO001')}
                    className="w-full px-3 py-2 rounded border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:border-[#E8630A]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={() => triggerIdentification(patientId)}
                    className="w-full px-3 py-2 rounded border border-[#0066B2] bg-[#EDF5FC] hover:bg-sky-100 text-xs font-bold text-[#0066B2] whitespace-nowrap"
                  >
                    {isLabMode ? tr(language, 'Nº Laboratorio', 'Lab No.') : tr(language, 'Nº Historia Clínica', 'Record No.')}
                  </button>
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={simulateBarcodeScan}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Barcode className="w-4 h-4 text-[#E8630A]" />
                    <span>{tr(language, 'Código', 'Barcode')}</span>
                  </button>
                </div>
              </div>

              {/* 3-Second Countdown Clock (CLINICAL MODE ONLY) */}
              {!isLabMode && countdown !== null && (
                <div className="bg-[#FFF8F3] border-2 border-[#E8630A] rounded-lg p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#E8630A] text-white font-mono font-bold text-lg flex items-center justify-center tabular-nums">
                      {countdown}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#E8630A]" />
                        <span>
                          {tr(language, `Consultando datos demográficos del paciente (${cleanPatientId})...`, `Retrieving patient demographics (${cleanPatientId})...`)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {tr(language, `Recuperando nombre, sexo y fecha de nacimiento en ${countdown} s`, `Retrieving name, sex, and date of birth in ${countdown} s`)}
                      </p>
                    </div>
                  </div>
                  <Loader2 className="w-5 h-5 text-[#E8630A] animate-spin shrink-0" />
                </div>
              )}

              {/* Revealed Random Demographics + Mandatory Validation (CLINICAL MODE ONLY) */}
              {!isLabMode && demographics && countdown === null && (
                <div
                  className={`rounded-lg border-2 p-2.5 space-y-2 ${
                    demographicsConfirmed
                      ? 'bg-emerald-50/60 border-emerald-400'
                      : 'bg-amber-50/70 border-amber-400'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <UserCheck className={`w-4 h-4 ${demographicsConfirmed ? 'text-emerald-700' : 'text-amber-700'}`} />
                      <span>
                        {demographicsConfirmed
                          ? tr(language, 'Demográficos validados por el operador', 'Demographics validated by operator')
                          : tr(language, 'Demográficos recuperados — Validación obligatoria', 'Demographics retrieved — Validation mandatory')}
                      </span>
                    </span>
                    <span className="font-mono text-xs font-bold text-[#0066B2]">
                      {tr(language, 'NHC:', 'MRN:')} {demographics.patientId}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white border border-slate-200 rounded p-2">
                      <div className="text-[10px] text-slate-500">{tr(language, 'Nombre y apellidos', 'Full name')}</div>
                      <div className="font-bold text-slate-900 truncate">{demographics.fullName}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-2">
                      <div className="text-[10px] text-slate-500">{tr(language, 'Sexo', 'Sex')}</div>
                      <div className="font-bold text-slate-900">
                        {demographics.sex === 'Femenino' ? tr(language, 'Femenino', 'Female') : tr(language, 'Masculino', 'Male')}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-2">
                      <div className="text-[10px] text-slate-500">{tr(language, 'Fecha de nacimiento', 'Date of birth')}</div>
                      <div className="font-mono font-bold text-slate-900">
                        {demographics.birthDate} ({demographics.ageYears} {tr(language, 'a', 'y')})
                      </div>
                    </div>
                  </div>

                  {!demographicsConfirmed ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDemographicsConfirmed(true);
                        setPatientError(null);
                      }}
                      className="w-full py-2 px-4 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{tr(language, 'Confirmar y validar datos demográficos', 'Confirm & validate demographics')}</span>
                    </button>
                  ) : (
                    <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{tr(language, 'Identidad confirmada. Parámetros y preparación desbloqueados.', 'Identity confirmed. Parameters and preparation unlocked.')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Location, FiO2, Temp: hidden in CLINICAL mode until demographics are validated */}
              {(isLabMode || demographicsConfirmed) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      {tr(language, 'Ubicación asistencial', 'Care location')}
                    </label>
                    <select
                      value={patientLocation}
                      onChange={(e) => setPatientLocation(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-xs text-slate-900"
                    >
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      FiO2 (%)
                    </label>
                    <input
                      type="number"
                      min={21}
                      max={100}
                      value={fio2}
                      onChange={(e) => setFio2(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      {tr(language, 'Temperatura (°C)', 'Temperature (°C)')}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={28}
                      max={43}
                      value={temperatureC}
                      onChange={(e) => setTemperatureC(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {existingPatientRecords.length > 0 && (
                <div
                  className={`p-2 rounded border text-[11px] flex items-center gap-2 ${
                    hasRecentDuplicate
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-sky-50 border-sky-200 text-sky-950'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {hasRecentDuplicate
                      ? tr(language, `Aviso: determinación reciente previa para ${cleanPatientId} (<2 h).`, `Notice: recent prior determination for ${cleanPatientId} (<2 h).`)
                      : tr(language, `Registro con ${existingPatientRecords.length} determinaciones previas (Delta Check activo).`, `Patient has ${existingPatientRecords.length} prior determinations (Delta Check active).`)}
                  </span>
                </div>
              )}

              {patientError && (
                <div className="p-2 rounded bg-red-50 border border-red-200 text-xs text-red-800 font-semibold">
                  {patientError}
                </div>
              )}
            </div>
          </div>

          {/* Right 5 cols: Sample Preparation with "Obligatorio" check + "Activar todos" + sequential activation */}
          <div className="lg:col-span-5 bg-white border border-slate-300 rounded-lg p-3.5 flex flex-col justify-between space-y-2 overflow-hidden">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                <h3 className="font-display font-bold text-sm text-slate-900">
                  {tr(language, 'Preparación de Muestra', 'Sample Preparation')}
                </h3>

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-800 cursor-pointer select-none bg-[#F1F4F7] border border-slate-300 rounded px-2 py-1">
                    <input
                      type="checkbox"
                      checked={prepRequired}
                      onChange={(e) => setPrepRequired(e.target.checked)}
                      className="w-3.5 h-3.5 accent-[#E8630A]"
                    />
                    <span>{tr(language, 'Obligatorio', 'Mandatory')}</span>
                  </label>

                  <button
                    type="button"
                    disabled={!clinicalUnlocked}
                    onClick={handleActivateAllPrep}
                    className="px-2.5 py-1 rounded border border-[#0066B2] bg-[#EDF5FC] hover:bg-sky-100 disabled:opacity-45 disabled:cursor-not-allowed text-[10.5px] leading-tight font-bold text-[#0066B2] text-center"
                  >
                    <span className="block">{tr(language, 'Activar Todos', 'Activate All')}</span>
                    <span className="block">{tr(language, 'y Analizar', '& Analyze')}</span>
                  </button>
                </div>
              </div>

              {!clinicalUnlocked && (
                <div className="p-2 rounded bg-slate-100 border border-slate-300 text-[11px] text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>
                    {tr(language, 'Inhabilitado hasta introducir el Nº Historia Clínica (3 s) y validar los datos demográficos.', 'Disabled until entering Medical Record No. (3 s) and validating demographics.')}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                {prepItems.map((item) => (
                  <label
                    key={item.idx}
                    className={`px-2.5 py-1.5 rounded border flex items-center gap-2 text-xs font-medium transition-opacity ${
                      !item.enabled
                        ? 'opacity-45 pointer-events-none bg-slate-100 border-slate-200 text-slate-500'
                        : item.checked
                          ? 'bg-emerald-50/60 border-emerald-400 text-slate-900 cursor-pointer'
                          : 'bg-white border-slate-300 text-slate-900 cursor-pointer hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!item.enabled}
                      checked={item.checked}
                      onChange={(e) => item.onChange(e.target.checked)}
                      className="w-4 h-4 accent-emerald-700 shrink-0"
                    />
                    {item.icon}
                    <span className="leading-snug">{item.title}</span>
                  </label>
                ))}

                <div className={!clinicalUnlocked ? 'opacity-45 pointer-events-none pt-1' : 'pt-1'}>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {tr(language, 'Minutos desde la extracción', 'Minutes since collection')}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={!clinicalUnlocked}
                      value={extractionMinutesAgo}
                      onChange={(e) => setExtractionMinutesAgo(e.target.value)}
                      className="w-36 px-2.5 py-1.5 rounded border border-slate-300 text-xs font-mono"
                    />
                    <button
                      type="button"
                      disabled={!clinicalUnlocked}
                      onClick={() => setExtractionMinutesAgo(tr(language, 'Desconocido', 'Unknown'))}
                      title={tr(language, 'Establecer tiempo de extracción como Desconocido', 'Set collection time to Unknown')}
                      aria-label={tr(language, 'Desconocido', 'Unknown')}
                      className="px-2 py-1.5 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-slate-700 flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-[#0066B2]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-xs font-bold text-slate-800"
              >
                {tr(language, 'Cancelar', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={!canContinueStep1}
                onClick={validateStep1AndAdvance}
                className="px-5 py-2.5 rounded bg-[#E8630A] hover:bg-[#D15607] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2"
              >
                <span>{tr(language, 'Continuar a Análisis', 'Continue to Analysis')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASO 2: PROCESAMIENTO Y SIMULACIÓN */}
      {step === 2 && (
        <div className="flex-1 min-h-0 flex flex-col justify-between bg-white border border-slate-300 rounded-lg p-4 space-y-3 max-w-4xl w-full mx-auto overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                {quickMeasurement
                  ? tr(
                      language,
                      'Medición Rápida · Aspiración y Procesamiento en Cámara Analítica',
                      'Quick Measurement · Aspiration & Analytical Chamber Processing'
                    )
                  : tr(
                      language,
                      'Paso 2. Aspiración y Procesamiento en Cámara Analítica',
                      'Step 2. Aspiration & Analytical Chamber Processing'
                    )}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {quickMeasurement
                  ? tr(
                      language,
                      'Identificación diferida (se asignará paciente después en Carpetas → Sin identificar)',
                      'Deferred identification (assign patient later in Folders → Unidentified)'
                    )
                  : isLabMode
                    ? `${tr(language, 'Nº Laboratorio:', 'Lab No.:')} ${cleanPatientId}`
                    : `${tr(language, 'Paciente:', 'Patient:')} ${demographics?.fullName} (${cleanPatientId})`}{' '}
                · {tr(language, 'Muestra', 'Sample')}{' '}
                <strong>{translateSampleType(language, sampleType)}</strong> ·{' '}
                {tr(language, 'Operador:', 'Operator:')} <strong>{currentUser?.fullName}</strong>
              </p>
            </div>
          </div>

          {!isProcessing && (
            <div className="space-y-3">
              {quickMeasurement && (
                <div className="bg-orange-50/80 border border-orange-300 rounded-lg p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-orange-200">
                    <span className="text-xs font-bold text-slate-900">
                      {tr(language, 'Número ID Provisional', 'Provisional ID Number')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded bg-white border border-orange-400 font-mono text-xs font-bold text-orange-950 select-all">
                        {provisionalId}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowProvisionalTicketModal(true)}
                        title={tr(language, 'Imprimir ticket de ID Provisional', 'Print Provisional ID ticket')}
                        aria-label={tr(language, 'Imprimir ticket de ID Provisional', 'Print Provisional ID ticket')}
                        className="p-1 rounded border border-orange-400 bg-white hover:bg-orange-100 text-[#0066B2] transition-colors shadow-xs"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-900">
                      {tr(language, 'Referencia', 'Reference')}
                    </label>
                    <input
                      type="text"
                      value={quickReference}
                      onChange={(e) => setQuickReference(e.target.value)}
                      placeholder={tr(
                        language,
                        'Ej. UCI Box 4, Cama 12, J.M.P.',
                        'e.g. ICU Box 4, Bed 12, J.M.P.'
                      )}
                      className="w-full px-3 py-1.5 rounded border border-orange-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#E8630A]"
                    />
                    <p className="text-[11px] text-slate-600">
                      {tr(
                        language,
                        'Introduce cama, ubicación, siglas que te ayuden a identificar al paciente posteriormente',
                        'Enter bed, location, or initials to help identify the patient later'
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#F6F8FA] border border-slate-200 rounded-lg p-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr(language, 'Perfil fisiopatológico simulado', 'Simulated pathophysiological profile')}
                  </label>
                  <select
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value as ClinicalProfileScenario)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-sm text-slate-900"
                  >
                    {SCENARIOS.map((sc) => (
                      <option key={sc} value={sc}>
                        {translateClinicalScenario(language, sc)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr(language, 'Resultado del ciclo de análisis', 'Analysis cycle outcome')}
                  </label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as SimulatedOutcome)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-sm text-slate-900"
                  >
                    {OUTCOMES.map((o) => (
                      <option key={o.id} value={o.id}>
                        {tr(language, o.labelEs, o.labelEn)} — {tr(language, o.descEs, o.descEn)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="bg-[#F6F8FA] border-2 border-[#E8630A] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-[#E8630A] text-white flex flex-col items-center justify-center shadow-sm shrink-0">
                  <span className="font-mono font-bold text-3xl leading-none tabular-nums">
                    {measureCountdown ?? 0}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider mt-0.5">
                    {tr(language, 'seg', 'sec')}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-display font-bold text-base text-slate-900">
                    <Clock className="w-4 h-4 text-[#E8630A]" />
                    <span>
                      {tr(
                        language,
                        'Medición en curso · Cronómetro cuenta atrás',
                        'Measurement in progress · Countdown timer'
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    {measureCountdown === 3
                      ? tr(
                          language,
                          'Aspirando muestra y verificando integridad (burbujas y microcoágulos)...',
                          'Aspirating sample and checking integrity (bubbles & microclots)...'
                        )
                      : measureCountdown === 2
                        ? tr(
                            language,
                            'Midiendo pH, gases (pCO2/pO2), electrolitos ISE y cooximetría a 37,0 °C...',
                            'Measuring pH, gases (pCO2/pO2), ISE electrolytes & CO-oximetry at 37.0 °C...'
                          )
                        : tr(
                            language,
                            'Ejecutando Motor de Validación e Interpretación Fisiológica...',
                            'Running Validation & Physiological Interpretation Engine...'
                          )}
                  </p>
                  <div className="text-[11px] font-mono text-slate-500">
                    {tr(language, 'Muestra', 'Sample')} {translateSampleType(language, sampleType)} ·{' '}
                    {quickMeasurement
                      ? `${tr(language, 'Número ID Provisional:', 'Provisional ID Number:')} ${provisionalId}`
                      : cleanPatientId}
                  </div>
                </div>
              </div>
              <Loader2 className="w-7 h-7 text-[#E8630A] animate-spin shrink-0" />
            </div>
          )}

          {processError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-300 flex items-start gap-2.5">
              <XCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <div className="text-xs text-red-900 space-y-0.5">
                <div className="font-bold text-sm">
                  {tr(language, 'Análisis interrumpido', 'Analysis interrupted')}
                </div>
                <p>{processError}</p>
                <p className="text-red-700">
                  {tr(
                    language,
                    'La incidencia se ha registrado en el historial técnico y auditoría del analizador.',
                    'The incident has been logged in the analyzer technical history and audit trail.'
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => (quickMeasurement ? onClose() : setStep(1))}
              className="px-4 py-2 rounded border border-slate-300 bg-[#ECEFF3] text-xs font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-50"
            >
              {quickMeasurement ? tr(language, 'Cancelar', 'Cancel') : tr(language, 'Atrás', 'Back')}
            </button>
            <button
              type="button"
              disabled={isProcessing || isAnalyzerBlocked}
              onClick={startProcessing}
              className="px-6 py-2.5 rounded bg-[#E8630A] hover:bg-[#D15607] disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isProcessing
                  ? tr(language, 'Analizando...', 'Analyzing...')
                  : quickMeasurement
                    ? tr(language, 'Iniciar medición rápida', 'Start quick measurement')
                    : tr(language, 'Iniciar análisis simulado', 'Start simulated analysis')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: RESULTADOS COMPLETOS */}
      {step === 3 && completedRecord && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <BloodGasReportView
            record={completedRecord}
            autoOpenCriticalPopup
            showBidiButton={!isLabMode}
            fallbackDemographics={!isLabMode ? demographics : null}
            extraActions={
              <>
                <button
                  type="button"
                  onClick={resetWizard}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{tr(language, 'Nueva muestra', 'New sample')}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold"
                >
                  {tr(language, 'Volver a Inicio', 'Back to Home')}
                </button>
              </>
            }
          />
        </div>
      )}
      {/* POPUP: TICKET DE NÚMERO ID PROVISIONAL */}
      {showProvisionalTicketModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-4"
          onClick={() => setShowProvisionalTicketModal(false)}
        >
          <div
            className="bg-white border-2 border-slate-400 rounded-xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 border-b border-slate-200 bg-[#F6F8FA] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#0066B2]" />
                <span className="font-display font-bold text-sm text-slate-900">
                  {tr(language, 'Ticket · ID Provisional', 'Ticket · Provisional ID')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowProvisionalTicketModal(false)}
                className="p-1 rounded border border-slate-300 hover:bg-slate-200 text-slate-700"
                aria-label={tr(language, 'Cerrar', 'Close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-200/80">
              <div className="mx-auto max-w-[320px] bg-[#FCFBF7] border border-slate-300 shadow-md px-4 py-3.5 font-mono text-[11px] leading-relaxed text-slate-900">
                <div className="text-center border-b border-dashed border-slate-400 pb-2 mb-2.5">
                  <div className="font-bold text-xs tracking-wide">
                    {state.config.deviceName} · {tr(language, 'MEDICIÓN RÁPIDA', 'QUICK MEASUREMENT')}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    {state.config.deviceId} · {new Date().toLocaleString(localeFor(language))}
                  </div>
                </div>

                <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-2.5 mb-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600 shrink-0">{tr(language, 'Número:', 'Number:')}</span>
                    <strong className="text-right text-slate-950 break-all">{provisionalId}</strong>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600 shrink-0">{tr(language, 'Servicio:', 'Service:')}</span>
                    <strong className="text-right text-slate-900">
                      {translateClinicalText(language, currentUser?.department || state.config.location)}
                    </strong>
                  </div>
                  {quickReference.trim() !== '' && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-600 shrink-0">{tr(language, 'Referencia:', 'Reference:')}</span>
                      <strong className="text-right text-slate-900 break-words">
                        {quickReference.trim()}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="text-center text-[9.5px] text-slate-500">
                  {tr(language, 'Identificación diferida pendiente de asignar', 'Deferred identification pending assignment')}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowProvisionalTicketModal(false)}
                className="px-3.5 py-2 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-xs font-bold text-slate-800"
              >
                {tr(language, 'Cerrar', 'Close')}
              </button>
              <button
                type="button"
                onClick={() => {
                  pushToast({
                    tone: 'success',
                    title: tr(language, 'Ticket enviado a impresora', 'Ticket sent to printer'),
                    message: `${provisionalId}${quickReference.trim() ? ` · ${quickReference.trim()}` : ''}`,
                  });
                  setShowProvisionalTicketModal(false);
                }}
                className="px-3.5 py-2 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{tr(language, 'Mandar a impresora', 'Send to printer')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
