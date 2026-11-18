import {
  AbnormalityFlag,
  AnalyzerConfig,
  BloodGasRecord,
  ClinicalProfileScenario,
  IdentificationStatus,
  OperatingMode,
  ParameterKey,
  ParameterValues,
  SampleType,
  SimulatedOutcome,
} from '@/src/types/analyzer';
import { evaluateFlag } from '@/src/engines/parameterDefinitions';
import { runValidationEngine } from '@/src/engines/validationEngine';
import { runInterpretationEngine } from '@/src/engines/interpretationEngine';

/**
 * Computes derived/calculated blood gas parameters from measured primary values
 * using standard physiological equations (Henderson-Hasselbalch, Siggaard-Andersen BE,
 * Severinghaus/Hill sO2, TCO2, Anion Gap, PaO2/FiO2).
 */
export function computeDerivedParameters(
  measured: ParameterValues,
  fio2?: number
): ParameterValues {
  const out: ParameterValues = { ...measured };
  const { pH, pCO2, pO2, Na, Cl, FO2Hb, FCOHb, FMetHb } = measured;

  if (pH !== null && pH !== undefined && pCO2 !== null && pCO2 !== undefined && pCO2 > 0) {
    // Henderson-Hasselbalch: HCO3- = 0.0307 * pCO2 * 10^(pH - 6.1)
    const hco3 = 0.0307 * pCO2 * Math.pow(10, pH - 6.1);
    out.HCO3 = Number(hco3.toFixed(1));

    // Siggaard-Andersen BE(ecf) approximation: (HCO3 - 24.4 + (2.3 * 5 + 7.7) * (pH - 7.4)) * (1 - 0.023 * 5)
    // Standard Van Slyke simplified for ecf (Hb ~5 g/dL effective buffer):
    const be = (hco3 - 24.8 + 16.2 * (pH - 7.4)) * 0.93;
    out.BE = Number(be.toFixed(1));

    // TCO2 = HCO3- + 0.0307 * pCO2
    out.TCO2 = Number((hco3 + 0.0307 * pCO2).toFixed(1));
  } else {
    if (out.HCO3 === undefined) out.HCO3 = null;
    if (out.BE === undefined) out.BE = null;
    if (out.TCO2 === undefined) out.TCO2 = null;
  }

  // sO2 derived from pO2 & pH (Bohr shift approximation)
  if (pO2 !== null && pO2 !== undefined && pH !== null && pH !== undefined && pO2 > 0) {
    const p50 = 26.8 * Math.pow(10, -0.48 * (pH - 7.4));
    const so2 = (Math.pow(pO2, 2.7) / (Math.pow(pO2, 2.7) + Math.pow(p50, 2.7))) * 100;
    out.sO2 = Number(Math.min(99.9, Math.max(5.0, so2)).toFixed(1));
  } else if (out.sO2 === undefined) {
    out.sO2 = null;
  }

  // Ensure FHHb matches remaining fraction if cooximetry is present
  if (
    FO2Hb !== null &&
    FO2Hb !== undefined &&
    FCOHb !== null &&
    FCOHb !== undefined &&
    FMetHb !== null &&
    FMetHb !== undefined &&
    out.FHHb === undefined
  ) {
    out.FHHb = Number(Math.max(0, 100 - (FO2Hb + FCOHb + FMetHb)).toFixed(1));
  }

  // Anion Gap = Na+ - (Cl- + HCO3-)
  if (
    Na !== null &&
    Na !== undefined &&
    Cl !== null &&
    Cl !== undefined &&
    out.HCO3 !== null &&
    out.HCO3 !== undefined
  ) {
    out.AnionGap = Number((Na - (Cl + out.HCO3)).toFixed(1));
  } else if (out.AnionGap === undefined) {
    out.AnionGap = null;
  }

  // PaO2 / FiO2 ratio
  if (pO2 !== null && pO2 !== undefined && fio2 !== undefined && fio2 > 0) {
    out.pO2FiO2 = Number((pO2 / (fio2 / 100)).toFixed(0));
  } else {
    out.pO2FiO2 = null;
  }

  return out;
}

function jitter(base: number, span: number, decimals: number): number {
  const val = base + (Math.random() - 0.5) * 2 * span;
  return Number(val.toFixed(decimals));
}

export function generateScenarioMeasuredValues(
  scenario: ClinicalProfileScenario,
  sampleType: SampleType
): ParameterValues {
  // Base normal values
  let pH = sampleType === 'Venosa' ? jitter(7.36, 0.02, 3) : jitter(7.4, 0.025, 3);
  let pCO2 = sampleType === 'Venosa' ? jitter(46, 2.5, 1) : jitter(40, 2.5, 1);
  let pO2 =
    sampleType === 'Venosa'
      ? jitter(38, 4, 1)
      : sampleType === 'Capilar'
        ? jitter(76, 5, 1)
        : jitter(92, 6, 1);
  let Na = jitter(140, 2.5, 1);
  let K = jitter(4.2, 0.3, 2);
  let Ca = jitter(1.22, 0.04, 2);
  let Cl = jitter(103, 2.5, 1);
  let Glu = jitter(96, 12, 0);
  let Lac = jitter(1.1, 0.3, 2);
  let ctHb = jitter(14.2, 1.2, 1);
  let FCOHb = jitter(1.1, 0.4, 1);
  let FMetHb = jitter(0.6, 0.2, 1);
  const nBili = jitter(0.6, 0.2, 1);

  switch (scenario) {
    case 'Normal':
      break;
    case 'Acidosis metabólica': {
      // e.g. DKA / high AG metabolic acidosis with Winter compensation: HCO3 ~ 14 => pCO2 ~ 29 => pH ~ 7.30
      pCO2 = jitter(29.0, 1.5, 1);
      pH = jitter(7.29, 0.02, 3);
      Cl = jitter(100, 2, 1);
      Na = jitter(138, 2, 1);
      Lac = jitter(3.4, 0.6, 2);
      Glu = jitter(340, 40, 0);
      break;
    }
    case 'Acidosis respiratoria': {
      pCO2 = jitter(64.0, 4.0, 1);
      pH = jitter(7.25, 0.025, 3);
      pO2 = sampleType === 'Venosa' ? jitter(34, 3, 1) : jitter(58, 5, 1);
      break;
    }
    case 'Alcalosis metabólica': {
      pCO2 = jitter(49.0, 2.0, 1);
      pH = jitter(7.52, 0.02, 3);
      Cl = jitter(91, 2.5, 1);
      K = jitter(3.1, 0.2, 2);
      break;
    }
    case 'Alcalosis respiratoria': {
      pCO2 = jitter(25.0, 2.0, 1);
      pH = jitter(7.53, 0.02, 3);
      Ca = jitter(1.09, 0.03, 2);
      break;
    }
    case 'Trastorno mixto': {
      // Metabolic + Respiratory acidosis
      pCO2 = jitter(56.0, 3.0, 1);
      pH = jitter(7.14, 0.03, 3);
      Lac = jitter(5.8, 0.9, 2);
      pO2 = sampleType === 'Venosa' ? jitter(29, 3, 1) : jitter(54, 4, 1);
      break;
    }
    case 'Hipoxemia': {
      pO2 = sampleType === 'Venosa' ? jitter(25, 2, 1) : jitter(47, 4, 1);
      pCO2 = jitter(34.0, 2.0, 1);
      pH = jitter(7.45, 0.02, 3);
      Lac = jitter(2.4, 0.4, 2);
      break;
    }
    case 'Hiperlactatemia': {
      Lac = jitter(6.4, 1.1, 2);
      pCO2 = jitter(27.5, 2.0, 1);
      pH = jitter(7.26, 0.025, 3);
      Glu = jitter(168, 25, 0);
      break;
    }
    case 'Alteración electrolítica': {
      K = jitter(6.55, 0.25, 2);
      Na = jitter(126.0, 2.5, 1);
      Ca = jitter(0.96, 0.04, 2);
      Cl = jitter(94.0, 2.0, 1);
      pH = jitter(7.32, 0.02, 3);
      break;
    }
    case 'Alteración cooximetría': {
      FCOHb = jitter(18.5, 2.5, 1);
      FMetHb = jitter(2.2, 0.6, 1);
      pO2 = sampleType === 'Venosa' ? jitter(37, 3, 1) : jitter(95, 5, 1);
      Lac = jitter(2.9, 0.5, 2);
      break;
    }
  }

  // Compute physiologically matching FO2Hb from pO2, pH, FCOHb, FMetHb
  const p50 = 26.8 * Math.pow(10, -0.48 * (pH - 7.4));
  const theoreticalSO2 = (Math.pow(pO2, 2.7) / (Math.pow(pO2, 2.7) + Math.pow(p50, 2.7))) * 100;
  const availableHb = Math.max(10, 100 - FCOHb - FMetHb);
  const FO2Hb = Number(((theoreticalSO2 / 100) * availableHb).toFixed(1));
  const FHHb = Number(Math.max(0, 100 - FO2Hb - FCOHb - FMetHb).toFixed(1));

  return {
    pH,
    pCO2,
    pO2,
    Na,
    K,
    Ca,
    Cl,
    Glu,
    Lac,
    ctHb,
    FO2Hb,
    FCOHb,
    FMetHb,
    FHHb,
    nBili,
  };
}

export function buildBloodGasRecord(params: {
  sampleNumber: string;
  patientId: string;
  patientDemographics?: BloodGasRecord['patientDemographics'];
  patientLocation: string;
  sampleType: SampleType;
  operatorId: string;
  operatorName: string;
  fio2?: number;
  temperatureC?: number;
  extractionMinutesAgo?: number;
  processingSeconds: number;
  scenario: ClinicalProfileScenario;
  outcome?: SimulatedOutcome;
  previousRecords: BloodGasRecord[];
  config: AnalyzerConfig;
  timestamp: string;
  preanalyticalChecklist: BloodGasRecord['preanalyticalChecklist'];
  customMeasured?: ParameterValues;
  isQuickMeasurement?: boolean;
  quickReference?: string;
  analysisUniqueId?: string;
  measuredMode?: OperatingMode;
  identificationStatus?: IdentificationStatus;
}): BloodGasRecord {
  const {
    sampleNumber,
    patientId,
    patientDemographics,
    patientLocation,
    sampleType,
    operatorId,
    operatorName,
    fio2,
    temperatureC,
    extractionMinutesAgo,
    processingSeconds,
    scenario,
    outcome = 'OK',
    previousRecords,
    config,
    timestamp,
    preanalyticalChecklist,
    customMeasured,
    isQuickMeasurement = false,
    quickReference,
    analysisUniqueId,
    measuredMode,
    identificationStatus = isQuickMeasurement ? 'PENDIENTE_IDENTIFICACION' : 'IDENTIFICADA_TRANSMITIDA',
  } = params;

  const baseMeasured = customMeasured ?? generateScenarioMeasuredValues(scenario, sampleType);
  let values = computeDerivedParameters(baseMeasured, fio2);

  if (outcome === 'PARAMETRO_NO_DISPONIBLE') {
    values = {
      ...values,
      Ca: null,
      FMetHb: null,
    };
  } else if (outcome === 'INCOHERENCIA_FORZADA') {
    // Force unmistakable physiological incoherence (without mutating later)
    values = {
      ...values,
      pH: 7.12,
      HCO3: 29.5,
      BE: 8.2,
      TCO2: 21.0,
      FO2Hb: 88.0,
      FCOHb: 1.2,
      FMetHb: 0.6,
      FHHb: 2.0, // sums 91.8%
    };
  } else if (outcome === 'RESULTADO_CRITICO') {
    const criticalMeasured: ParameterValues = {
      ...baseMeasured,
      pH: 7.115,
      pCO2: 74.2,
      pO2: sampleType === 'Venosa' ? 24.0 : 41.5,
      K: 6.72,
      Lac: 7.85,
      ctHb: 6.6,
    };
    values = computeDerivedParameters(criticalMeasured, fio2);
  }

  // Evaluate flags
  const flags: Partial<Record<ParameterKey, AbnormalityFlag>> = {};
  const criticalParameters: ParameterKey[] = [];

  (Object.keys(config.parameters) as ParameterKey[]).forEach((key) => {
    const flag = evaluateFlag(key, values[key], sampleType, config.parameters);
    flags[key] = flag;
    if (flag === 'CRITICAL_LOW' || flag === 'CRITICAL_HIGH') {
      criticalParameters.push(key);
    }
  });

  const validationIssues = runValidationEngine({
    values,
    sampleType,
    fio2,
    extractionMinutesAgo,
    patientId,
    previousRecords,
    config,
    timestamp,
  });

  const interpretation = runInterpretationEngine({
    values,
    sampleType,
    fio2,
    temperatureC,
  });

  const hasCriticalValues = criticalParameters.length > 0;
  const hasSevereIssue = validationIssues.some(
    (i) => i.level === 'Crítica' || i.level === 'Requiere revisión'
  );

  return {
    id: `BG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    sampleNumber,
    analysisUniqueId,
    isQuickMeasurement,
    quickReference: quickReference?.trim() || undefined,
    measuredMode,
    identificationStatus,
    identificationAudit: isQuickMeasurement
      ? [
          {
            timestamp,
            userId: operatorId,
            userName: operatorName,
            action: 'MEDICION_RAPIDA',
            details: `Medición rápida (${analysisUniqueId ?? sampleNumber}) realizada sin identificación previa en modo ${measuredMode === 'LABORATORY' ? 'Laboratorio' : 'Clínico'}${quickReference?.trim() ? ` · Ref: "${quickReference.trim()}"` : ''}.`,
          },
        ]
      : undefined,
    patientId: patientId.trim().toUpperCase(),
    patientDemographics,
    patientLocation,
    sampleType,
    timestamp,
    operatorId,
    operatorName,
    fio2,
    temperatureC,
    extractionMinutesAgo,
    processingSeconds,
    scenario,
    values,
    flags,
    validationIssues,
    interpretation,
    hasCriticalValues,
    criticalParameters,
    criticalAck: {
      acknowledged: !hasCriticalValues,
    },
    validationStatus: hasSevereIssue ? 'EN_REVISION' : 'PENDIENTE',
    preanalyticalChecklist,
  };
}
