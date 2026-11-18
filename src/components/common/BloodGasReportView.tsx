import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  FileWarning,
  Info,
  Lock,
  Printer,
  QrCode,
  Send,
  ShieldAlert,
  Smartphone,
  Stethoscope,
  Wifi,
  X,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import {
  AbnormalityFlag,
  BloodGasRecord,
  IncoherenceLevel,
  ParameterConfig,
  ParameterKey,
} from '@/src/types/analyzer';
import { getReferenceRange, PARAMETER_ORDER } from '@/src/engines/parameterDefinitions';
import { detectArterialVenousMismatch } from '@/src/engines/validationEngine';
import { PatientDemographics } from '@/src/utils/patientDemographics';
import {
  Language,
  localeFor,
  tr,
  translateClinicalText,
  translateParameterLabel,
  translateParameterShortLabel,
  translateParameterUnit,
  translateSampleType,
  translateValidationStatus,
} from '@/src/i18n/translations';

interface BloodGasReportViewProps {
  record: BloodGasRecord;
  showLabValidationControls?: boolean;
  autoOpenCriticalPopup?: boolean;
  showBidiButton?: boolean;
  fallbackDemographics?: PatientDemographics | null;
  onGoToIdentify?: () => void;
  extraActions?: React.ReactNode;
}

const HIGH_DELTA_THRESHOLDS: Record<ParameterKey, number> = {
  pH: 0.04,
  pCO2: 5.0,
  pO2: 12.0,
  Na: 4.0,
  K: 0.4,
  Ca: 0.08,
  Cl: 4.0,
  Glu: 25,
  Lac: 0.8,
  ctHb: 1.2,
  FO2Hb: 5.0,
  FCOHb: 1.5,
  FMetHb: 1.0,
  FHHb: 5.0,
  nBili: 0.8,
  HCO3: 3.0,
  BE: 3.0,
  sO2: 4.0,
  TCO2: 3.0,
  AnionGap: 3.5,
  pO2FiO2: 45,
};

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface ComputedDelta {
  isHigh: boolean;
  diff: number;
  prevVal: number;
  formatted: string;
  sourceLabel: string;
}

function computeDeltaForParam(
  key: ParameterKey,
  val: number | null | undefined,
  cfg: ParameterConfig,
  record: BloodGasRecord,
  previousRecord: BloodGasRecord | null,
  simLabel: string
): ComputedDelta | null {
  if (val === null || val === undefined) return null;
  const threshold = HIGH_DELTA_THRESHOLDS[key];

  const realPrev = previousRecord?.values[key];
  if (previousRecord && realPrev !== null && realPrev !== undefined) {
    const diff = Number((val - realPrev).toFixed(cfg.decimals));
    if (Math.abs(diff) >= threshold) {
      return {
        isHigh: true,
        diff,
        prevVal: realPrev,
        formatted: `${diff > 0 ? '+' : ''}${diff.toFixed(cfg.decimals)}`,
        sourceLabel: previousRecord.sampleNumber,
      };
    }
    const anyRealHigh = PARAMETER_ORDER.some((k) => {
      const cur = record.values[k];
      const prv = previousRecord.values[k];
      return (
        cur !== null &&
        cur !== undefined &&
        prv !== null &&
        prv !== undefined &&
        Math.abs(cur - prv) >= HIGH_DELTA_THRESHOLDS[k]
      );
    });
    if (anyRealHigh) {
      return {
        isHigh: false,
        diff,
        prevVal: realPrev,
        formatted: '',
        sourceLabel: previousRecord.sampleNumber,
      };
    }
  }

  const seed = hashString(`${record.id}:${record.sampleNumber}:${key}`);
  const triggerHigh = seed % 4 === 0;
  if (!triggerHigh) return null;

  const sign = (seed >> 3) % 2 === 0 ? 1 : -1;
  const multiplier = 1.25 + ((seed % 100) / 100) * 1.1;
  const rawDiff = sign * threshold * multiplier;
  const diff = Number(rawDiff.toFixed(cfg.decimals));
  if (Math.abs(diff) < threshold) return null;

  const prevVal = Number((val - diff).toFixed(cfg.decimals));
  return {
    isHigh: true,
    diff,
    prevVal,
    formatted: `${diff > 0 ? '+' : ''}${diff.toFixed(cfg.decimals)}`,
    sourceLabel: simLabel,
  };
}

function getPatientInitials(fullName?: string, seedId?: string): string {
  if (fullName && fullName.trim().length > 0) {
    return fullName
      .trim()
      .split(/\s+/)
      .map((part) => `${part[0].toUpperCase()}.`)
      .join(' ');
  }
  const FALLBACK_INITIALS = ['A. G. M.', 'L. R. P.', 'C. M. S.', 'M. T. V.', 'E. F. L.', 'J. D. N.'];
  const idx = hashString(seedId ?? 'ID') % FALLBACK_INITIALS.length;
  return FALLBACK_INITIALS[idx];
}

function maskHistoryId(id: string): string {
  const clean = id.trim();
  if (clean.length <= 2) return clean;
  return '*'.repeat(clean.length - 2) + clean.slice(-2);
}

function extractUnitAndBed(
  location: string,
  seedId: string,
  lang: Language
): { unit: string; bed: string } {
  const trimmed = location.trim();
  const defaultUnit = tr(lang, 'Unidad Clínica', 'Clinical Unit');
  const bedPrefix = tr(lang, 'Cama', 'Bed');
  if (trimmed.includes('·')) {
    const [u, b] = trimmed.split('·').map((s) => s.trim());
    return { unit: u || defaultUnit, bed: b || `${bedPrefix} 01` };
  }
  const boxMatch = trimmed.match(/^(.*?)\s+(Box\s*\d+|Cama\s*\d+|Bed\s*\d+)$/i);
  if (boxMatch) {
    return { unit: boxMatch[1].trim(), bed: boxMatch[2].trim() };
  }
  const bedNum = String((hashString(seedId) % 18) + 1).padStart(2, '0');
  return { unit: trimmed || tr(lang, 'Hospitalización', 'Inpatient'), bed: `${bedPrefix} ${bedNum}` };
}

function getFlagDisplay(flag: AbnormalityFlag | undefined, lang: Language) {
  switch (flag) {
    case 'CRITICAL_HIGH':
      return {
        text: tr(lang, '↑↑ Crít.', '↑↑ Crit.'),
        fullText: tr(lang, '↑↑ Crítico alto', '↑↑ Critical high'),
        short: '!!↑',
        cls: 'text-red-800 bg-red-100 border-red-300 font-bold',
      };
    case 'CRITICAL_LOW':
      return {
        text: tr(lang, '↓↓ Crít.', '↓↓ Crit.'),
        fullText: tr(lang, '↓↓ Crítico bajo', '↓↓ Critical low'),
        short: '!!↓',
        cls: 'text-red-800 bg-red-100 border-red-300 font-bold',
      };
    case 'HIGH':
      return {
        text: tr(lang, '↑ Alto', '↑ High'),
        fullText: tr(lang, '↑ Alto', '↑ High'),
        short: '↑',
        cls: 'text-amber-800 bg-amber-50 border-amber-200 font-semibold',
      };
    case 'LOW':
      return {
        text: tr(lang, '↓ Bajo', '↓ Low'),
        fullText: tr(lang, '↓ Bajo', '↓ Low'),
        short: '↓',
        cls: 'text-sky-800 bg-sky-50 border-sky-200 font-semibold',
      };
    case 'ND':
      return {
        text: tr(lang, 'N/D', 'N/A'),
        fullText: tr(lang, 'N/D', 'N/A'),
        short: tr(lang, 'N/D', 'N/A'),
        cls: 'text-slate-600 bg-slate-100 border-slate-300 font-medium',
      };
    default:
      return {
        text: 'OK',
        fullText: 'Normal',
        short: '',
        cls: 'text-emerald-800 bg-emerald-50/70 border-emerald-200',
      };
  }
}

function getIncoherenceStyle(level: IncoherenceLevel) {
  switch (level) {
    case 'Crítica':
      return { box: 'bg-red-50 border-red-300 text-red-950', badge: 'text-red-800 font-bold', Icon: AlertOctagon };
    case 'Requiere revisión':
      return { box: 'bg-amber-50 border-amber-300 text-amber-950', badge: 'text-amber-800 font-bold', Icon: FileWarning };
    case 'Advertencia':
      return { box: 'bg-amber-50/60 border-amber-200 text-slate-900', badge: 'text-amber-700 font-semibold', Icon: AlertTriangle };
    default:
      return { box: 'bg-sky-50 border-sky-200 text-slate-900', badge: 'text-sky-800 font-semibold', Icon: Info };
  }
}

const BidiMatrixSvg: React.FC<{ payload: string; label: string }> = ({ payload, label }) => {
  const size = 21;
  const cells = useMemo(() => {
    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    const drawFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const border = r === 0 || r === 6 || c === 0 || c === 6;
          const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[r0 + r][c0 + c] = border || inner;
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    for (let i = 8; i < size - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    const seed = hashString(payload);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= size - 8;
        const inBottomLeft = r >= size - 8 && c < 8;
        const isTiming = r === 6 || c === 6;
        if (inTopLeft || inTopRight || inBottomLeft || isTiming) continue;
        const bit = hashString(`${seed}-${r}-${c}`) % 11;
        grid[r][c] = bit < 5;
      }
    }
    return grid;
  }, [payload]);

  return (
    <svg
      viewBox={`0 0 ${size + 2} ${size + 2}`}
      className="w-44 h-44 mx-auto bg-white p-1.5 border border-slate-300 rounded-lg"
      role="img"
      aria-label={label}
    >
      <rect x={0} y={0} width={size + 2} height={size + 2} fill="#FFFFFF" />
      {cells.map((row, r) =>
        row.map((filled, c) =>
          filled ? <rect key={`${r}-${c}`} x={c + 1} y={r + 1} width={1} height={1} fill="#0F172A" /> : null
        )
      )}
    </svg>
  );
};

export const BloodGasReportView: React.FC<BloodGasReportViewProps> = ({
  record: recordProp,
  showLabValidationControls = false,
  autoOpenCriticalPopup = false,
  showBidiButton = false,
  fallbackDemographics = null,
  onGoToIdentify,
  extraActions,
}) => {
  const {
    state,
    activeMode,
    language,
    can,
    acknowledgeCriticalAlert,
    setRecordValidationStatus,
    transmitRecordToLis,
    requestNav,
    pushToast,
  } = useAnalyzer();

  // Always resolve against live store state so immediate validations/LIS/ack reflect without stale props
  const record = state.records.find((r) => r.id === recordProp.id) ?? recordProp;

  const [ackNote, setAckNote] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ABNORMAL' | 'MEASURED' | 'CALCULATED'>('ALL');
  const [showCriticalPopup, setShowCriticalPopup] = useState<boolean>(
    Boolean(autoOpenCriticalPopup && record.hasCriticalValues && !record.criticalAck.acknowledged)
  );
  const [showPrintPopup, setShowPrintPopup] = useState(false);
  const [showBidiPopup, setShowBidiPopup] = useState(false);
  const [showMobilePopup, setShowMobilePopup] = useState(false);
  const [inspectedDeltaKey, setInspectedDeltaKey] = useState<ParameterKey | null>(null);

  useEffect(() => {
    setShowCriticalPopup(
      Boolean(autoOpenCriticalPopup && record.hasCriticalValues && !record.criticalAck.acknowledged)
    );
  }, [record.id, record.hasCriticalValues, record.criticalAck.acknowledged, autoOpenCriticalPopup]);

  const effectiveDemographics = record.patientDemographics ?? fallbackDemographics ?? null;
  const mismatch = useMemo(
    () => detectArterialVenousMismatch(record.sampleType, record.values),
    [record.sampleType, record.values]
  );

  const previousRecord = useMemo(() => {
    const currentMs = new Date(record.timestamp).getTime();
    const candidates = state.records
      .filter(
        (r) =>
          r.id !== record.id &&
          r.patientId.toUpperCase() === record.patientId.toUpperCase() &&
          new Date(r.timestamp).getTime() <= currentMs
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return candidates[0] ?? null;
  }, [state.records, record.id, record.patientId, record.timestamp]);

  const visibleParams = PARAMETER_ORDER.filter((key) => {
    const cfg = state.config.parameters[key];
    if (!cfg || !cfg.visible || !cfg.enabled) return false;
    if (filterMode === 'MEASURED') return cfg.kind === 'measured';
    if (filterMode === 'CALCULATED') return cfg.kind === 'calculated';
    if (filterMode === 'ABNORMAL') {
      const f = record.flags[key];
      return f && f !== 'NORMAL';
    }
    return true;
  });

  const allReportParams = PARAMETER_ORDER.filter((key) => {
    const cfg = state.config.parameters[key];
    return Boolean(cfg && cfg.visible && cfg.enabled);
  });

  const simPrevLabel = tr(language, 'Prev. simulado', 'Simulated prior');

  const deltaMap = useMemo(() => {
    const map: Partial<Record<ParameterKey, ComputedDelta | null>> = {};
    for (const key of PARAMETER_ORDER) {
      const cfg = state.config.parameters[key];
      if (!cfg) continue;
      map[key] = computeDeltaForParam(key, record.values[key], cfg, record, previousRecord, simPrevLabel);
    }
    return map;
  }, [record, previousRecord, state.config.parameters, simPrevLabel]);

  const splitIndex = Math.ceil(visibleParams.length / 2);
  const leftParams = visibleParams.slice(0, splitIndex);
  const rightParams = visibleParams.slice(splitIndex);

  const initials = getPatientInitials(effectiveDemographics?.fullName, record.patientId);
  const maskedHistory = maskHistoryId(record.patientId);
  const { unit, bed } = extractUnitAndBed(record.patientLocation, record.id, language);
  const mobileSexRaw =
    effectiveDemographics?.sex ??
    (hashString(record.patientId) % 2 === 0 ? 'Masculino' : 'Femenino');
  const mobileSex =
    language === 'en'
      ? mobileSexRaw === 'Masculino'
        ? 'Male'
        : 'Female'
      : mobileSexRaw === 'Masculino'
        ? 'Hombre'
        : 'Mujer';
  const mobileAge =
    effectiveDemographics?.ageYears ??
    (24 + (hashString(`${record.patientId}-age`) % 62));

  const handleAcknowledge = (e: React.FormEvent) => {
    e.preventDefault();
    acknowledgeCriticalAlert(record.id, ackNote.trim() || undefined);
    setAckNote('');
    setShowCriticalPopup(false);
  };

  const isPendingId = record.identificationStatus === 'PENDIENTE_IDENTIFICACION';
  const isIdentifiedPendingLis = record.identificationStatus === 'IDENTIFICADA_PENDIENTE_LIS';
  const isClinicalNursingView = activeMode === 'CLINICAL' && !showLabValidationControls;
  const isValidated = record.validationStatus === 'VALIDADO';
  const isCancelled = record.validationStatus === 'RECHAZADO';
  const directPrintBlocked = isPendingId || (isClinicalNursingView && !isValidated);

  const handleApproveAndPrint = () => {
    if (isPendingId || isCancelled) return;
    const valRes = setRecordValidationStatus(record.id, 'VALIDADO');
    if (!valRes.ok) return;
    if (isIdentifiedPendingLis) {
      transmitRecordToLis(record.id);
    }
    setShowPrintPopup(true);
  };

  const handleCancelSample = () => {
    if (isCancelled) return;
    setRecordValidationStatus(record.id, 'RECHAZADO');
  };

  const handleConfirmThermalPrint = () => {
    if (isPendingId) return;
    pushToast({
      tone: 'success',
      title: tr(language, 'Ticket enviado a impresora térmica', 'Ticket sent to thermal printer'),
      message: tr(
        language,
        `Impresión completada para muestra ${record.sampleNumber} (${record.patientId}).`,
        `Print completed for sample ${record.sampleNumber} (${record.patientId}).`
      ),
    });
    setShowPrintPopup(false);
  };

  const handleExternalPrint = () => {
    if (isPendingId) return;
    pushToast({
      tone: 'success',
      title: tr(language, 'Enviado a impresora externa', 'Sent to external printer'),
      message: tr(
        language,
        `Informe completo enviado a impresora externa de red para muestra ${record.sampleNumber} (${record.patientId}).`,
        `Full report sent to external network printer for sample ${record.sampleNumber} (${record.patientId}).`
      ),
    });
    setShowPrintPopup(false);
  };

  const getFullDeltaDetails = (key: ParameterKey) => {
    const cfg = state.config.parameters[key];
    const val = record.values[key];
    const ndText = tr(language, 'N/D', 'N/A');
    const shortLabel = cfg ? translateParameterShortLabel(language, key, cfg.shortLabel) : key;
    const fullName = cfg ? translateParameterLabel(language, key, cfg.label) : key;
    const unitLabel = cfg ? translateParameterUnit(language, cfg.unit) : '';
    if (!cfg || val === null || val === undefined) {
      return {
        label: shortLabel,
        fullName,
        unit: unitLabel,
        currentFormatted: ndText,
        previousFormatted: ndText,
        deltaFormatted: ndText,
        sourceLabel: tr(language, 'Sin dato previo', 'No prior data'),
        isHigh: false,
        diff: 0,
      };
    }

    const mapped = deltaMap[key];
    if (mapped) {
      return {
        label: shortLabel,
        fullName,
        unit: unitLabel,
        currentFormatted: val.toFixed(cfg.decimals),
        previousFormatted: mapped.prevVal.toFixed(cfg.decimals),
        deltaFormatted: `${mapped.diff > 0 ? '+' : ''}${mapped.diff.toFixed(cfg.decimals)}`,
        sourceLabel: mapped.sourceLabel,
        isHigh: mapped.isHigh,
        diff: mapped.diff,
      };
    }

    const realPrev = previousRecord?.values[key];
    if (previousRecord && realPrev !== null && realPrev !== undefined) {
      const diff = Number((val - realPrev).toFixed(cfg.decimals));
      return {
        label: shortLabel,
        fullName,
        unit: unitLabel,
        currentFormatted: val.toFixed(cfg.decimals),
        previousFormatted: realPrev.toFixed(cfg.decimals),
        deltaFormatted: `${diff > 0 ? '+' : ''}${diff.toFixed(cfg.decimals)}`,
        sourceLabel: previousRecord.sampleNumber,
        isHigh: Math.abs(diff) >= HIGH_DELTA_THRESHOLDS[key],
        diff,
      };
    }

    const threshold = HIGH_DELTA_THRESHOLDS[key];
    const seed = hashString(`${record.id}:${record.sampleNumber}:${key}:inspect`);
    const sign = (seed >> 2) % 2 === 0 ? 1 : -1;
    const minStep = Math.pow(10, -cfg.decimals);
    const rawDiff = sign * Math.max(minStep, threshold * (0.2 + ((seed % 50) / 100)));
    const diff = Number(rawDiff.toFixed(cfg.decimals));
    const prevVal = Number((val - diff).toFixed(cfg.decimals));

    return {
      label: shortLabel,
      fullName,
      unit: unitLabel,
      currentFormatted: val.toFixed(cfg.decimals),
      previousFormatted: prevVal.toFixed(cfg.decimals),
      deltaFormatted: `${diff > 0 ? '+' : ''}${diff.toFixed(cfg.decimals)}`,
      sourceLabel: simPrevLabel,
      isHigh: Math.abs(diff) >= threshold,
      diff,
    };
  };

  const inspectedDelta = inspectedDeltaKey ? getFullDeltaDetails(inspectedDeltaKey) : null;

  const renderMiniTable = (keys: ParameterKey[]) => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-slate-200 text-[9px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-50">
          <th className="py-0.5 px-1.5">{tr(language, 'Parám', 'Param')}</th>
          <th className="py-0.5 px-1 text-right">{tr(language, 'Result.', 'Result')}</th>
          <th className="py-0.5 px-1 text-right">Delta</th>
          <th className="py-0.5 px-1 text-right">{tr(language, 'Ref.', 'Ref')}</th>
          <th className="py-0.5 px-1 text-center">{tr(language, 'Est.', 'Flag')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-[10.5px] leading-tight">
        {keys.map((key) => {
          const cfg = state.config.parameters[key];
          const val = record.values[key];
          const flag = record.flags[key];
          const flagMeta = getFlagDisplay(flag, language);
          const [refLow, refHigh] = getReferenceRange(cfg, record.sampleType);
          const delta = deltaMap[key];
          const shortLabel = translateParameterShortLabel(language, key, cfg.shortLabel);
          const unitLabel = translateParameterUnit(language, cfg.unit);

          return (
            <tr
              key={key}
              onDoubleClick={() => setInspectedDeltaKey(key)}
              title={tr(
                language,
                'Doble clic para ver resultado actual, previo y valor de delta',
                'Double-click to view current, previous and delta values'
              )}
              className="hover:bg-sky-50/80 transition-colors bg-white cursor-pointer select-none"
            >
              <td className="py-[1.5px] px-1.5 whitespace-nowrap">
                <span className="font-bold text-slate-900">{shortLabel}</span>
                <span className="text-[9px] text-slate-400 ml-1">{unitLabel}</span>
              </td>
              <td className="py-[1.5px] px-1 text-right font-mono tabular-nums font-bold text-slate-900">
                {val === null || val === undefined ? tr(language, 'N/D', 'N/A') : val.toFixed(cfg.decimals)}
              </td>
              <td
                className="py-[1.5px] px-1 text-right font-mono tabular-nums text-[10px] whitespace-nowrap"
                title={
                  delta?.isHigh
                    ? `${tr(language, 'Previo', 'Prior')} (${delta.sourceLabel}): ${delta.prevVal.toFixed(cfg.decimals)} ${unitLabel}`
                    : undefined
                }
              >
                {delta?.isHigh ? (
                  <span
                    className={`inline-block px-1 rounded font-bold ${
                      delta.diff > 0
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-sky-100 text-sky-900'
                    }`}
                  >
                    {delta.formatted}
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="py-[1.5px] px-1 text-right font-mono tabular-nums text-[9.5px] text-slate-500 whitespace-nowrap">
                {refLow.toFixed(cfg.decimals)}–{refHigh.toFixed(cfg.decimals)}
              </td>
              <td className="py-[1.5px] px-1 text-center">
                <span
                  className={`inline-block px-1 py-0 rounded border text-[9px] leading-tight whitespace-nowrap ${flagMeta.cls}`}
                >
                  {flagMeta.text}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-1.5">
      {/* Compact Top Sample Metadata & Actions Bar */}
      <div className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 flex flex-wrap items-center justify-between gap-1.5">
        <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
          <span className="font-mono font-bold text-slate-900 text-xs">
            {record.analysisUniqueId ?? record.sampleNumber}
          </span>
          {record.identificationStatus && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9.5px] font-bold ${
                isPendingId
                  ? 'bg-orange-100 border-orange-400 text-orange-950'
                  : isIdentifiedPendingLis
                    ? 'bg-sky-100 border-sky-400 text-sky-950'
                    : 'bg-emerald-100 border-emerald-400 text-emerald-950'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPendingId
                    ? 'bg-orange-500'
                    : isIdentifiedPendingLis
                      ? 'bg-sky-600'
                      : 'bg-emerald-600'
                }`}
              />
              <span>
                {isPendingId
                  ? tr(language, 'Pendiente ID', 'Pending ID')
                  : isIdentifiedPendingLis
                    ? tr(language, 'Identificada · Pendiente LIS', 'Identified · Pending LIS')
                    : tr(language, 'Identificada y transmitida', 'Identified & transmitted')}
              </span>
            </span>
          )}
          <span>·</span>
          <span>
            ID{' '}
            <strong
              className={`font-mono ${isPendingId ? 'text-orange-800' : 'text-slate-900'}`}
            >
              {record.patientId}
            </strong>
          </span>
          {effectiveDemographics && (
            <>
              <span>·</span>
              <span className="font-semibold text-slate-800">{effectiveDemographics.fullName}</span>
            </>
          )}
          {record.quickReference && (
            <>
              <span>·</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-50 border border-orange-300 text-orange-900 font-semibold">
                {tr(language, 'Ref:', 'Ref:')} {record.quickReference}
              </span>
            </>
          )}
          <span>·</span>
          <span>{record.patientLocation}</span>
          <span>·</span>
          <span className="font-semibold text-[#0066B2]">
            {translateSampleType(language, record.sampleType)}
          </span>
          <span>·</span>
          <span className="font-mono">{new Date(record.timestamp).toLocaleString(localeFor(language))}</span>
          {record.fio2 !== undefined && (
            <>
              <span>·</span>
              <span className="font-mono">FiO2 {record.fio2}%</span>
            </>
          )}
          {record.temperatureC !== undefined && (
            <>
              <span>·</span>
              <span className="font-mono">{record.temperatureC.toFixed(1)} °C</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {record.hasCriticalValues && (
            <button
              type="button"
              onClick={() => setShowCriticalPopup(true)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 border transition-colors ${
                record.criticalAck.acknowledged
                  ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                  : 'bg-red-600 border-red-700 text-white hover:bg-red-700 animate-pulse'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>
                {record.criticalAck.acknowledged
                  ? tr(language, 'Críticos confirmados', 'Criticals confirmed')
                  : tr(language, 'Alerta Críticos', 'Critical Alert')}
              </span>
            </button>
          )}

          {isIdentifiedPendingLis && (
            <button
              type="button"
              onClick={() => transmitRecordToLis(record.id)}
              className="px-2.5 py-1 rounded bg-[#0066B2] hover:bg-[#005291] text-white text-[11px] font-bold flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{tr(language, 'Enviar a LIS', 'Send to LIS')}</span>
            </button>
          )}

          {showBidiButton && (
            <button
              type="button"
              disabled={isPendingId}
              onClick={() => setShowBidiPopup(true)}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed text-[11px] font-bold text-slate-800 flex items-center gap-1"
              title={
                isPendingId
                  ? tr(
                      language,
                      'Identifique la muestra antes de generar el código BIDI',
                      'Identify sample before generating BIDI code'
                    )
                  : tr(
                      language,
                      'Generar código BIDI para visor móvil anonimizado',
                      'Generate BIDI QR code for anonymized mobile viewer'
                    )
              }
            >
              <QrCode className="w-3.5 h-3.5 text-[#E8630A]" />
              <span>BIDI</span>
            </button>
          )}

          <button
            type="button"
            disabled={directPrintBlocked}
            onClick={() => {
              if (!directPrintBlocked) setShowPrintPopup(true);
            }}
            title={
              isPendingId
                ? tr(
                    language,
                    'Impresión bloqueada hasta identificar la muestra',
                    'Printing blocked until sample is identified'
                  )
                : isClinicalNursingView && !isValidated
                  ? tr(
                      language,
                      'En Modo Enfermería debe validar los resultados antes de imprimir',
                      'In Nursing Mode you must validate results before printing'
                    )
                  : tr(language, 'Imprimir ticket térmico', 'Print thermal ticket')
            }
            className="px-2.5 py-1 rounded border border-[#0066B2] bg-[#EDF5FC] hover:bg-sky-100 disabled:opacity-45 disabled:cursor-not-allowed text-[11px] font-bold text-[#0066B2] flex items-center gap-1"
          >
            {directPrintBlocked ? <Lock className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
            <span>{tr(language, 'Imprimir', 'Print')}</span>
          </button>

          {showLabValidationControls && can('VALIDATE_RESULTS') && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRecordValidationStatus(record.id, 'VALIDADO')}
                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
              >
                {tr(language, 'Validar', 'Validate')}
              </button>
              <button
                type="button"
                onClick={() => setRecordValidationStatus(record.id, 'EN_REVISION')}
                className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold"
              >
                {tr(language, 'Revisión', 'Review')}
              </button>
              <button
                type="button"
                onClick={() => setRecordValidationStatus(record.id, 'RECHAZADO')}
                className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold"
              >
                {tr(language, 'Rechazar', 'Reject')}
              </button>
            </div>
          )}

          {extraActions}
        </div>
      </div>

      {/* Compact Unidentified Warning Strip (ORANGE) */}
      {isPendingId && (
        <div className="bg-orange-100 border border-orange-400 rounded-lg px-2.5 py-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-orange-950">
          <div className="flex items-center gap-1.5 font-semibold">
            <FileClock className="w-3.5 h-3.5 text-orange-700 shrink-0" />
            <span>
              <strong>{tr(language, 'PENDIENTE DE IDENTIFICACIÓN:', 'PENDING IDENTIFICATION:')}</strong>{' '}
              {tr(
                language,
                'Resultado no asociado a ningún paciente. Impresión y transmisión al LIS bloqueadas hasta su identificación.',
                'Result not linked to any patient. Printing and LIS transmission are blocked until identified.'
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onGoToIdentify) {
                onGoToIdentify();
              } else {
                requestNav(activeMode ?? 'CLINICAL', 'UNIDENTIFIED', record.id);
              }
            }}
            className="px-2.5 py-0.5 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-[10.5px] font-bold shrink-0"
          >
            {tr(language, 'Identificar ahora', 'Identify now')}
          </button>
        </div>
      )}

      {/* Compact Arterial <-> Venous Mismatch Warning Strip */}
      {mismatch !== 'NONE' && (
        <div className="bg-amber-100 border border-amber-500 rounded-lg px-2.5 py-1 flex items-center justify-between gap-2 text-[11px] text-amber-950">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />
            <span>
              {mismatch === 'ART_LOOKS_VENOUS'
                ? tr(
                    language,
                    `AVISO DE MUESTRA: Declarada como Arterial, pero parece Venosa (pO2 ${record.values.pO2?.toFixed(1) ?? 'N/D'} mmHg, sO2 ${record.values.sO2?.toFixed(1) ?? 'N/D'}%).`,
                    `SAMPLE WARNING: Declared as Arterial, but looks Venous (pO2 ${record.values.pO2?.toFixed(1) ?? 'N/A'} mmHg, sO2 ${record.values.sO2?.toFixed(1) ?? 'N/A'}%).`
                  )
                : tr(
                    language,
                    `AVISO DE MUESTRA: Declarada como Venosa, pero parece Arterial (pO2 ${record.values.pO2?.toFixed(1) ?? 'N/D'} mmHg, sO2 ${record.values.sO2?.toFixed(1) ?? 'N/D'}%).`,
                    `SAMPLE WARNING: Declared as Venous, but looks Arterial (pO2 ${record.values.pO2?.toFixed(1) ?? 'N/A'} mmHg, sO2 ${record.values.sO2?.toFixed(1) ?? 'N/A'}%).`
                  )}
            </span>
          </div>
        </div>
      )}

      {/* ZERO-SCROLL 2-COLUMN SPLIT BODY: Left = Compact 2-Col Parameters + Nursing Actions | Right = Interpretation + Validation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">
        {/* LEFT 7 COLS: TOP & COMPACT PARAMETERS TABLE + NURSING VALIDATION BAR */}
        <div className="lg:col-span-7 flex flex-col gap-1.5">
          <div className="bg-white border border-slate-300 rounded-lg overflow-hidden">
            <div className="px-2.5 py-1 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-[#F6F8FA]">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900">
                <span>
                  {tr(language, 'Parámetros Analíticos', 'Analytical Parameters')} ({visibleParams.length})
                </span>
                <span className="text-[9.5px] font-medium text-[#0066B2]">
                  · {tr(language, 'Doble clic para ver actual, previo y delta', 'Double-click for current, prior & delta')}
                </span>
              </div>
              <div className="flex items-center gap-0.5 p-0.5 bg-slate-200/70 rounded">
                {(
                  [
                    { id: 'ALL', label: tr(language, 'Todos', 'All') },
                    { id: 'ABNORMAL', label: tr(language, 'Alterados', 'Abnormal') },
                    { id: 'MEASURED', label: tr(language, 'Medidos', 'Measured') },
                    { id: 'CALCULATED', label: tr(language, 'Calc.', 'Calc.') },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterMode(tab.id)}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-semibold transition-colors whitespace-nowrap ${
                      filterMode === tab.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {visibleParams.length === 0 ? (
              <div className="py-5 text-center text-xs text-slate-500">
                {tr(
                  language,
                  'No hay parámetros que coincidan con el filtro seleccionado.',
                  'No parameters match the selected filter.'
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                <div className="overflow-x-auto">{renderMiniTable(leftParams)}</div>
                <div className="overflow-x-auto">
                  {rightParams.length > 0 && renderMiniTable(rightParams)}
                </div>
              </div>
            )}
          </div>

          {/* Nursing / Clinical Mode Validation Action Bar Below Results List */}
          {isClinicalNursingView && (
            <div className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-bold text-slate-700">
                  {tr(language, 'Validación Enfermería:', 'Nursing Validation:')}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${
                    isValidated
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
                      : isCancelled
                        ? 'bg-red-100 border-red-400 text-red-950'
                        : 'bg-amber-100 border-amber-400 text-amber-950'
                  }`}
                >
                  {isValidated
                    ? tr(language, 'Validado', 'Validated')
                    : isCancelled
                      ? tr(language, 'Muestra cancelada', 'Sample cancelled')
                      : tr(language, 'Pendiente de validar', 'Pending validation')}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isPendingId || isCancelled}
                  onClick={handleApproveAndPrint}
                  title={
                    isPendingId
                      ? tr(
                          language,
                          'Identifique la muestra antes de dar por buenos e imprimir',
                          'Identify sample before approving and printing'
                        )
                      : isCancelled
                        ? tr(language, 'Muestra cancelada', 'Sample cancelled')
                        : tr(
                            language,
                            'Validar resultados, enviar a LIS y abrir ticket de impresión',
                            'Validate results, send to LIS, and open print ticket'
                          )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-45 disabled:cursor-not-allowed text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {tr(language, 'Dar por buenos e imprimir/enviar', 'Approve and print/send')}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isCancelled}
                  onClick={handleCancelSample}
                  className="px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 disabled:opacity-45 disabled:cursor-not-allowed text-red-900 text-[11px] font-bold flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{tr(language, 'Cancelar la muestra', 'Cancel sample')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 5 COLS: ULTRA-COMPACT CLINICAL INTERPRETATION + VALIDATION/INCOHERENCE */}
        <div className="lg:col-span-5 space-y-1.5">
          <div className="bg-white border border-slate-300 rounded-lg p-2 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 pb-1">
              <div className="flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-[#0066B2] shrink-0" />
                <h4 className="font-display font-bold text-[11px] text-slate-900">
                  {tr(language, 'Interpretación Clínica Automática', 'Automated Clinical Interpretation')}
                </h4>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-amber-200 border border-amber-400 text-amber-950 text-[9.5px] font-bold leading-tight">
                {tr(
                  language,
                  'Solo a título informativo. Interpretar según estado del paciente',
                  'For informational purposes only. Interpret per patient status'
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1 text-[10px] leading-tight">
              <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <span className="font-bold text-slate-700">
                  {tr(language, '1. Primaria:', '1. Primary:')}{' '}
                </span>
                <span className="text-slate-900 font-medium">
                  {translateClinicalText(language, record.interpretation.primaryDisorder)}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <span className="font-bold text-slate-700">
                  {tr(language, '2. Compensación:', '2. Compensation:')}{' '}
                </span>
                <span className="text-slate-800">
                  {translateClinicalText(language, record.interpretation.expectedCompensation)}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <span className="font-bold text-slate-700">
                  {tr(language, '3. Trastorno mixto:', '3. Mixed disorder:')}{' '}
                </span>
                <span className="text-slate-800">
                  {translateClinicalText(language, record.interpretation.mixedDisorderPossible)}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <span className="font-bold text-slate-700">
                  {tr(language, '4. Hallazgos:', '4. Findings:')}{' '}
                </span>
                <span className="text-slate-800">
                  {record.interpretation.additionalFindings
                    .slice(0, 3)
                    .map((f) => translateClinicalText(language, f))
                    .join(' · ')}
                </span>
              </div>
            </div>

            {record.interpretation.limitations.length > 0 && (
              <div className="bg-amber-50/80 border border-amber-200 rounded px-2 py-0.5 text-[9.5px] text-amber-950 leading-tight line-clamp-2">
                <strong>{tr(language, 'Limitación:', 'Limitation:')}</strong>{' '}
                {translateClinicalText(language, record.interpretation.limitations[0])}
              </div>
            )}
          </div>

          {record.validationIssues.length > 0 ? (
            <div className="bg-white border border-slate-300 rounded-lg p-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-display font-bold text-[11px] text-slate-900 flex items-center gap-1">
                  <FileWarning className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {tr(language, 'Validación y Coherencia', 'Validation & Coherence')} ({record.validationIssues.length})
                  </span>
                </h4>
              </div>
              <div className="space-y-1">
                {record.validationIssues.slice(0, 2).map((issue) => {
                  const st = getIncoherenceStyle(issue.level);
                  const Icon = st.Icon;
                  return (
                    <div key={issue.id} className={`rounded border px-2 py-1 ${st.box}`}>
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="font-bold flex items-center gap-1 truncate">
                          <Icon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{translateClinicalText(language, issue.title)}</span>
                        </span>
                        <span className={`shrink-0 text-[9.5px] ${st.badge}`}>
                          {translateClinicalText(language, issue.level)}
                        </span>
                      </div>
                      <p className="text-[9.5px] leading-tight line-clamp-1">
                        {translateClinicalText(language, issue.explanation)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg px-2.5 py-1 text-[10.5px] text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="font-semibold">
                {tr(
                  language,
                  'Validación fisiológica y analítica conforme · Sin incoherencias.',
                  'Physiological & analytical validation compliant · No inconsistencies.'
                )}
              </span>
            </div>
          )}

          {!isClinicalNursingView && (
            <div className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-[10.5px] text-slate-700 flex items-center justify-between">
              <span className="font-semibold">{tr(language, 'Estado validación:', 'Validation status:')}</span>
              <span className="font-mono font-bold text-slate-900">
                {translateValidationStatus(language, record.validationStatus)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* POPUP: ALERTA POR VALORES CRÍTICOS */}
      {showCriticalPopup && record.hasCriticalValues && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border-2 border-red-600 bg-white p-5 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-start justify-between gap-3 border-b border-red-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-red-950">
                    {tr(language, 'Alerta por Valores Críticos', 'Critical Values Alert')}
                  </h3>
                  <p className="text-xs text-red-700">
                    {tr(language, 'Muestra', 'Sample')} {record.sampleNumber} · ID {record.patientId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCriticalPopup(false)}
                className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-700"
                aria-label={tr(language, 'Cerrar alerta crítica', 'Close critical alert')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">
                {tr(language, 'Parámetros fuera de rango crítico:', 'Parameters outside critical range:')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {record.criticalParameters.map((k) => {
                  const cfg = state.config.parameters[k];
                  const val = record.values[k];
                  const flagMeta = getFlagDisplay(record.flags[k], language);
                  return (
                    <div
                      key={k}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-bold text-red-950">
                          {translateParameterShortLabel(language, k, cfg.shortLabel)}
                        </div>
                        <div className="text-[10px] text-red-700">{flagMeta.fullText}</div>
                      </div>
                      <div className="font-mono font-bold text-sm text-red-900">
                        {val !== null && val !== undefined ? val.toFixed(cfg.decimals) : tr(language, 'N/D', 'N/A')}{' '}
                        <span className="text-[10px] font-normal">{translateParameterUnit(language, cfg.unit)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {record.criticalAck.acknowledged ? (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>{tr(language, 'Lectura crítica confirmada', 'Critical reading confirmed')}</span>
                </div>
                <p>
                  {tr(language, 'Confirmada por', 'Confirmed by')} <strong>{record.criticalAck.userName}</strong>{' '}
                  {tr(language, 'el', 'on')}{' '}
                  <span className="font-mono">
                    {record.criticalAck.timestamp
                      ? new Date(record.criticalAck.timestamp).toLocaleString(localeFor(language))
                      : ''}
                  </span>
                  {record.criticalAck.note ? ` · ${tr(language, 'Nota', 'Note')}: "${record.criticalAck.note}"` : ''}
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCriticalPopup(false)}
                    className="px-4 py-2 rounded bg-slate-900 text-white text-xs font-bold"
                  >
                    {tr(language, 'Cerrar', 'Close')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAcknowledge} className="space-y-3">
                <p className="text-xs text-red-900">
                  {tr(
                    language,
                    'Este informe contiene valores en rango crítico. Confirme la lectura para dejar constancia trazable en auditoría.',
                    'This report contains critical values. Confirm reading to create a traceable audit log entry.'
                  )}
                </p>
                {can('CONFIRM_CRITICAL_ALERT') && (
                  <input
                    type="text"
                    value={ackNote}
                    onChange={(e) => setAckNote(e.target.value)}
                    placeholder={tr(
                      language,
                      'Nota opcional (ej. facultativo avisado)...',
                      'Optional note (e.g. attending physician notified)...'
                    )}
                    className="w-full px-3 py-2 rounded border border-red-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-red-600"
                  />
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCriticalPopup(false)}
                    className="px-4 py-2 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-xs font-bold text-slate-800"
                  >
                    {tr(language, 'Cerrar', 'Close')}
                  </button>
                  {can('CONFIRM_CRITICAL_ALERT') && (
                    <button
                      type="submit"
                      className="px-4 py-2 rounded bg-red-700 hover:bg-red-800 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>{tr(language, 'Confirmar lectura crítica', 'Confirm critical reading')}</span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* POPUP: CÓDIGO BIDI PARA LECTURA EN MÓVIL */}
      {showBidiPopup && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-400 rounded-xl w-full max-w-sm p-5 space-y-4 shadow-2xl text-center text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 text-left">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#E8630A]" />
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900">
                    {tr(language, 'Código BIDI · Visor Móvil', 'BIDI Code · Mobile Viewer')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {tr(language, 'Muestra', 'Sample')} {record.sampleNumber} · {tr(language, 'Datos anonimizados', 'Anonymized data')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBidiPopup(false)}
                className="p-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <BidiMatrixSvg
              payload={`${record.sampleNumber}|${maskedHistory}|${unit}|${bed}`}
              label={tr(language, 'Código BIDI de resultados anonimizados', 'Anonymized results BIDI QR code')}
            />

            <p className="text-xs text-slate-600 leading-relaxed">
              {tr(
                language,
                'Escanee este código BIDI desde la aplicación móvil clínica para consultar los resultados anonimizados de la muestra en su dispositivo.',
                'Scan this BIDI QR code from the clinical mobile app to view anonymized sample results on your device.'
              )}
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowBidiPopup(false);
                  setShowMobilePopup(true);
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-[#0066B2] hover:bg-[#005291] text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                <span>{tr(language, 'Simular lectura', 'Simulate scan')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBidiPopup(false)}
                className="w-full py-2 px-4 rounded-lg border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-xs font-bold text-slate-800"
              >
                {tr(language, 'Cerrar', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: DIBUJO DE TELÉFONO MÓVIL CON RESULTADOS ANONIMIZADOS */}
      {showMobilePopup && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-3">
          <div className="flex flex-col items-center gap-2.5 max-h-[95vh]">
            <div className="w-[310px] rounded-[36px] border-[6px] border-slate-800 bg-slate-900 p-2 shadow-2xl flex flex-col">
              <div className="w-24 h-4 bg-slate-900 rounded-b-xl mx-auto flex items-center justify-center gap-1.5 mb-1">
                <span className="w-8 h-1 rounded-full bg-slate-700" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              </div>

              <div className="bg-[#F8FAFC] rounded-[24px] overflow-hidden flex flex-col max-h-[540px] text-slate-900">
                <div className="bg-[#0066B2] text-white px-4 pt-1.5 pb-1 flex items-center justify-between text-[10px] font-mono">
                  <span>09:41</span>
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3 h-3" />
                    <span>100%</span>
                  </div>
                </div>

                <div className="bg-[#0066B2] text-white px-3.5 pb-2 pt-0.5">
                  <div className="text-xs font-display font-bold flex items-center justify-between">
                    <span>{tr(language, 'Gasometría Móvil · POCT', 'Mobile Blood Gas · POCT')}</span>
                    <span className="font-mono text-[10px] bg-white/15 px-1.5 py-0.5 rounded">
                      {record.sampleNumber}
                    </span>
                  </div>
                  <div className="text-[10px] text-sky-100 mt-0.5">
                    {tr(language, 'Lectura BIDI anonimizada', 'Anonymized BIDI read')} ·{' '}
                    {translateSampleType(language, record.sampleType)}
                  </div>
                </div>

                <div className="w-full bg-amber-300 border-y border-amber-500 text-amber-950 text-center font-bold text-[10.5px] py-1 px-2">
                  {tr(language, 'Informe disponible durante 15 minutos', 'Report available for 15 minutes')}
                </div>

                <div className="bg-white border-b border-slate-200 px-3 py-2 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{tr(language, 'Paciente:', 'Patient:')}</span>
                    <strong className="font-mono text-slate-900 text-xs">{initials}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{tr(language, 'Nº Historia:', 'Record ID:')}</span>
                    <strong className="font-mono text-slate-900 tracking-wider">
                      {maskedHistory}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">
                      {tr(language, 'Sexo:', 'Sex:')} <strong className="text-slate-900">{mobileSex}</strong>
                    </span>
                    <span className="text-slate-600">
                      {tr(language, 'Edad:', 'Age:')}{' '}
                      <strong className="text-slate-900">
                        {mobileAge} {tr(language, 'años', 'yrs')}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-100">
                    <span className="text-slate-600 truncate">
                      {tr(language, 'Unidad:', 'Unit:')} <strong className="text-slate-900">{unit}</strong>
                    </span>
                    <span className="text-slate-600 shrink-0">
                      {tr(language, 'Cama:', 'Bed:')} <strong className="text-[#E8630A]">{bed}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-2.5 py-1 border-b border-slate-200 text-[10px] font-bold text-slate-700 flex justify-between">
                      <span>{tr(language, 'PARÁMETROS', 'PARAMETERS')}</span>
                      <span>{tr(language, 'VALOR / DELTA', 'VALUE / DELTA')}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {allReportParams.map((k) => {
                        const cfg = state.config.parameters[k];
                        const val = record.values[k];
                        const flag = record.flags[k];
                        const flagMeta = getFlagDisplay(flag, language);
                        const delta = deltaMap[k];
                        const isAbnormal = flag && flag !== 'NORMAL';
                        return (
                          <div
                            key={k}
                            className={`px-2.5 py-1 flex items-center justify-between text-[11px] ${
                              isAbnormal ? 'bg-amber-50/40' : ''
                            }`}
                          >
                            <div>
                              <span className="font-bold text-slate-900">
                                {translateParameterShortLabel(language, k, cfg.shortLabel)}
                              </span>
                              <span className="text-[9.5px] text-slate-400 ml-1">
                                {translateParameterUnit(language, cfg.unit)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono">
                              {delta?.isHigh && (
                                <span className="text-[9.5px] px-1 rounded bg-amber-100 text-amber-900 font-bold">
                                  Δ{delta.formatted}
                                </span>
                              )}
                              <span className="font-bold text-slate-900 tabular-nums">
                                {val === null || val === undefined ? tr(language, 'N/D', 'N/A') : val.toFixed(cfg.decimals)}
                              </span>
                              {isAbnormal && (
                                <span className={`px-1 rounded border text-[9px] ${flagMeta.cls}`}>
                                  {flagMeta.short || flagMeta.text}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-2 text-[10.5px] text-sky-950">
                    <div className="font-bold mb-0.5">{tr(language, 'Orientación clínica:', 'Clinical guidance:')}</div>
                    <div>{translateClinicalText(language, record.interpretation.primaryDisorder)}</div>
                  </div>
                </div>

                <div className="bg-white py-1.5 flex justify-center border-t border-slate-200">
                  <div className="w-24 h-1 rounded-full bg-slate-400" />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMobilePopup(false)}
              className="px-5 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold shadow-lg border border-slate-300"
            >
              {tr(language, 'Cerrar vista móvil', 'Close mobile view')}
            </button>
          </div>
        </div>
      )}

      {/* POPUP: TICKET IMPRESORA TÉRMICA */}
      {showPrintPopup && !isPendingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-400 rounded-xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
            <div className="px-4 py-3 border-b border-slate-200 bg-[#F6F8FA] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#0066B2]" />
                <span className="font-display font-bold text-sm text-slate-900">
                  {tr(language, 'Vista Previa · Ticket Impresora Térmica', 'Preview · Thermal Printer Ticket')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintPopup(false)}
                className="p-1 rounded border border-slate-300 hover:bg-slate-200 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-200/80">
              <div className="mx-auto max-w-[360px] bg-[#FCFBF7] border border-slate-300 shadow-md px-4 py-4 font-mono text-[11px] leading-relaxed text-slate-900">
                <div className="text-center border-b border-dashed border-slate-400 pb-2 mb-2">
                  <div className="font-bold text-xs tracking-wide">
                    {state.config.deviceName} · {tr(language, 'GASOMETRÍA', 'BLOOD GAS')}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    {tr(language, 'Equipo:', 'Device:')} {state.config.deviceId} · {state.config.location}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    {tr(language, 'Impresión:', 'Printed:')} {new Date().toLocaleString(localeFor(language))}
                  </div>
                </div>

                {/* 1. DEMOGRÁFICOS DEL PACIENTE */}
                <div className="border-b border-dashed border-slate-400 pb-2 mb-2 space-y-0.5">
                  <div className="font-bold text-[10px] uppercase text-slate-700">
                    [ {tr(language, 'DEMOGRÁFICOS DEL PACIENTE', 'PATIENT DEMOGRAPHICS')} ]
                  </div>
                  <div>
                    ID / NHC: <strong>{record.patientId}</strong>
                  </div>
                  <div>
                    {tr(language, 'Paciente:', 'Patient:')}{' '}
                    <strong>
                      {effectiveDemographics
                        ? effectiveDemographics.fullName
                        : tr(language, 'No especificado (Modo Laboratorio)', 'Not specified (Laboratory Mode)')}
                    </strong>
                  </div>
                  {effectiveDemographics && (
                    <div className="flex justify-between">
                      <span>
                        {tr(language, 'Sexo:', 'Sex:')} {mobileSex}
                      </span>
                      <span>
                        {tr(language, 'F.Nac:', 'DOB:')} {effectiveDemographics.birthDate} ({effectiveDemographics.ageYears}
                        {tr(language, 'a', 'y')})
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. DATOS DE LA MUESTRA */}
                <div className="border-b border-dashed border-slate-400 pb-2 mb-2 space-y-0.5">
                  <div className="font-bold text-[10px] uppercase text-slate-700">
                    [ {tr(language, 'DATOS DE LA MUESTRA', 'SAMPLE DATA')} ]
                  </div>
                  <div className="flex justify-between">
                    <span>
                      {tr(language, 'Muestra:', 'Sample:')} <strong>{record.sampleNumber}</strong>
                    </span>
                    <span>
                      {tr(language, 'Tipo:', 'Type:')}{' '}
                      <strong>{translateSampleType(language, record.sampleType)}</strong>
                    </span>
                  </div>
                  <div>
                    {tr(language, 'Ubicación:', 'Location:')} {record.patientLocation}
                  </div>
                  <div>
                    {tr(language, 'Fecha/Hora:', 'Date/Time:')} {new Date(record.timestamp).toLocaleString(localeFor(language))}
                  </div>
                  <div>
                    {tr(language, 'Operador:', 'Operator:')} {record.operatorName}
                  </div>
                  <div className="flex justify-between">
                    <span>FiO2: {record.fio2 !== undefined ? `${record.fio2}%` : '—'}</span>
                    <span>
                      Temp: {record.temperatureC !== undefined ? `${record.temperatureC.toFixed(1)}°C` : '37.0°C'}
                    </span>
                  </div>
                </div>

                {/* 3. RESULTADOS */}
                <div className="border-b border-dashed border-slate-400 pb-2 mb-2">
                  <div className="font-bold text-[10px] uppercase text-slate-700 mb-1">
                    [ {tr(language, 'RESULTADOS ANALÍTICOS', 'ANALYTICAL RESULTS')} ]
                  </div>
                  <div className="flex justify-between text-[10px] font-bold border-b border-slate-300 pb-0.5 mb-1">
                    <span className="w-16">{tr(language, 'PARÁM', 'PARAM')}</span>
                    <span className="w-16 text-right">{tr(language, 'VALOR', 'VALUE')}</span>
                    <span className="w-16 text-right">DELTA</span>
                    <span className="w-16 text-right">{tr(language, 'UNID', 'UNIT')}</span>
                  </div>
                  <div className="space-y-0.5">
                    {allReportParams.map((k) => {
                      const cfg = state.config.parameters[k];
                      const val = record.values[k];
                      const flag = getFlagDisplay(record.flags[k], language);
                      const delta = deltaMap[k];
                      return (
                        <div key={k} className="flex justify-between items-baseline text-[10.5px]">
                          <span className="w-16 font-semibold truncate">
                            {translateParameterShortLabel(language, k, cfg.shortLabel)}
                            {flag.short ? ` ${flag.short}` : ''}
                          </span>
                          <span className="w-16 text-right font-bold tabular-nums">
                            {val === null || val === undefined ? tr(language, 'N/D', 'N/A') : val.toFixed(cfg.decimals)}
                          </span>
                          <span className="w-16 text-right text-slate-700 tabular-nums font-semibold">
                            {delta?.isHigh ? delta.formatted : '—'}
                          </span>
                          <span className="w-16 text-right text-slate-600 truncate">
                            {translateParameterUnit(language, cfg.unit)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. INTERPRETACIÓN CLÍNICA, ALARMAS E INCOHERENCIAS */}
                <div className="space-y-2 border-b border-dashed border-slate-400 pb-2 mb-2">
                  <div>
                    <div className="font-bold text-[10px] uppercase text-slate-700">
                      [ {tr(language, 'INTERPRETACIÓN CLÍNICA', 'CLINICAL INTERPRETATION')} ]
                    </div>
                    <div>• {tr(language, 'Primaria:', 'Primary:')} {translateClinicalText(language, record.interpretation.primaryDisorder)}</div>
                    <div>• {tr(language, 'Comp.:', 'Comp.:')} {translateClinicalText(language, record.interpretation.expectedCompensation)}</div>
                    <div>• {tr(language, 'Mixto:', 'Mixed:')} {translateClinicalText(language, record.interpretation.mixedDisorderPossible)}</div>
                    {record.interpretation.additionalFindings.map((f, i) => (
                      <div key={i}>• {translateClinicalText(language, f)}</div>
                    ))}
                  </div>

                  <div>
                    <div className="font-bold text-[10px] uppercase text-slate-700">
                      [ {tr(language, 'ALARMAS / VALORES CRÍTICOS', 'ALARMS / CRITICAL VALUES')} ]
                    </div>
                    {record.hasCriticalValues ? (
                      <div>
                        !! {tr(language, 'CRÍTICOS:', 'CRITICALS:')}{' '}
                        {record.criticalParameters
                          .map((k) => {
                            const cfg = state.config.parameters[k];
                            const v = record.values[k];
                            return `${translateParameterShortLabel(language, k, cfg.shortLabel)}=${v !== null && v !== undefined ? v.toFixed(cfg.decimals) : tr(language, 'N/D', 'N/A')}`;
                          })
                          .join(', ')}
                        <div>
                          {tr(language, 'Estado:', 'Status:')}{' '}
                          {record.criticalAck.acknowledged
                            ? `${tr(language, 'Confirmado', 'Confirmed')} (${record.criticalAck.userName})`
                            : tr(language, 'PENDIENTE CONFIRMACIÓN', 'PENDING CONFIRMATION')}
                        </div>
                      </div>
                    ) : (
                      <div>{tr(language, 'Sin alarmas de valores críticos.', 'No critical value alarms.')}</div>
                    )}
                  </div>

                  <div>
                    <div className="font-bold text-[10px] uppercase text-slate-700">
                      [ {tr(language, 'INCOHERENCIAS / VALIDACIÓN', 'INCONSISTENCIES / VALIDATION')} ]
                    </div>
                    {record.validationIssues.length > 0 ? (
                      record.validationIssues.map((issue) => (
                        <div key={issue.id}>
                          * [{translateClinicalText(language, issue.level)}] {translateClinicalText(language, issue.title)}:{' '}
                          {translateClinicalText(language, issue.explanation)}
                        </div>
                      ))
                    ) : (
                      <div>{tr(language, 'Sin incoherencias detectadas.', 'No inconsistencies detected.')}</div>
                    )}
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-500">
                  {tr(language, '*** FIN DE TICKET · SIMULADOR RP500e ***', '*** END OF TICKET · RP500e SIMULATOR ***')}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPrintPopup(false)}
                className="px-3.5 py-2 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-xs font-bold text-slate-800"
              >
                {tr(language, 'Cerrar', 'Close')}
              </button>
              <button
                type="button"
                onClick={handleExternalPrint}
                className="px-3.5 py-2 rounded border border-[#0066B2] bg-[#EDF5FC] hover:bg-sky-100 text-[#0066B2] text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{tr(language, 'Impresora externa', 'External printer')}</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmThermalPrint}
                className="px-3.5 py-2 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{tr(language, 'Imprimir ticket', 'Print ticket')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: INSPECCIÓN DELTA POR DOBLE CLIC EN PARÁMETRO */}
      {inspectedDelta && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setInspectedDeltaKey(null)}
        >
          <div
            className="bg-white border-2 border-[#0066B2] rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  {tr(language, 'Comparación Delta', 'Delta Comparison')} · {inspectedDelta.label}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {inspectedDelta.fullName} ({inspectedDelta.unit || tr(language, 'adimensional', 'dimensionless')}) ·{' '}
                  {tr(language, 'Ref. previa:', 'Prior ref.:')}{' '}
                  <span className="font-mono">{inspectedDelta.sourceLabel}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedDeltaKey(null)}
                className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-lg border border-slate-300 bg-[#F6F8FA]">
                <div className="text-[10.5px] font-semibold text-slate-500">
                  {tr(language, 'Resultado actual', 'Current result')}
                </div>
                <div className="font-mono font-bold text-lg text-slate-900 mt-1 tabular-nums">
                  {inspectedDelta.currentFormatted}
                </div>
                <div className="text-[10px] text-slate-500">{inspectedDelta.unit}</div>
              </div>

              <div className="p-3 rounded-lg border border-slate-300 bg-[#F6F8FA]">
                <div className="text-[10.5px] font-semibold text-slate-500">
                  {tr(language, 'Resultado previo', 'Previous result')}
                </div>
                <div className="font-mono font-bold text-lg text-slate-700 mt-1 tabular-nums">
                  {inspectedDelta.previousFormatted}
                </div>
                <div className="text-[10px] text-slate-500">{inspectedDelta.unit}</div>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  inspectedDelta.isHigh
                    ? 'border-amber-400 bg-amber-100 text-amber-950'
                    : 'border-sky-300 bg-sky-50 text-sky-950'
                }`}
              >
                <div className="text-[10.5px] font-semibold">
                  {tr(language, 'Valor de delta', 'Delta value')}
                </div>
                <div className="font-mono font-bold text-lg mt-1 tabular-nums">
                  {inspectedDelta.deltaFormatted}
                </div>
                <div className="text-[10px]">
                  {inspectedDelta.isHigh
                    ? tr(language, 'Delta significativo', 'Significant delta')
                    : tr(language, 'Variación moderada', 'Moderate change')}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedDeltaKey(null)}
                className="px-4 py-2 rounded bg-[#0066B2] hover:bg-[#005291] text-white text-xs font-bold"
              >
                {tr(language, 'Cerrar', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
