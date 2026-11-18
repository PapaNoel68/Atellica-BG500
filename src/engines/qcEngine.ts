import { QCLevel, QCRun, QCSettings, WestgardRule } from '@/src/types/analyzer';

export type QCParamKey = 'pH' | 'pCO2' | 'pO2' | 'Na' | 'K' | 'Ca' | 'Glu' | 'Lac';

export const QC_PARAMETERS: { key: QCParamKey; label: string; unit: string; decimals: number }[] = [
  { key: 'pH', label: 'pH', unit: 'uds pH', decimals: 3 },
  { key: 'pCO2', label: 'pCO2', unit: 'mmHg', decimals: 1 },
  { key: 'pO2', label: 'pO2', unit: 'mmHg', decimals: 1 },
  { key: 'Na', label: 'Na+', unit: 'mmol/L', decimals: 1 },
  { key: 'K', label: 'K+', unit: 'mmol/L', decimals: 2 },
  { key: 'Ca', label: 'Ca++', unit: 'mmol/L', decimals: 2 },
  { key: 'Glu', label: 'Glucosa', unit: 'mg/dL', decimals: 0 },
  { key: 'Lac', label: 'Lactato', unit: 'mmol/L', decimals: 2 },
];

/**
 * Evaluates a new QC run against Westgard rules using prior runs for the same QCLevel & lot.
 * Differentiates Warning (1_2s) from Rejection rules (1_3s, 2_2s, R_4s, 4_1s, 10x).
 */
export function evaluateQCRun(params: {
  level: QCLevel;
  values: Record<QCParamKey, number>;
  priorRunsForLevel: QCRun[];
  qcSettings: QCSettings;
  operatorId: string;
  operatorName: string;
  timestamp: string;
}): QCRun {
  const { level, values, priorRunsForLevel, qcSettings, operatorId, operatorName, timestamp } = params;

  const sortedPrior = [...priorRunsForLevel]
    .filter((r) => r.levelId === level.id && r.lotNumber === level.lotNumber)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const zScores = {} as Record<QCParamKey, number>;
  const violatedRules: QCRun['violatedRules'] = [];

  for (const qp of QC_PARAMETERS) {
    const target = level.targets[qp.key];
    const z = (values[qp.key] - target.mean) / target.sd;
    zScores[qp.key] = Number(z.toFixed(2));

    const prevZ = sortedPrior.map((r) => r.zScores[qp.key]);
    const series = [...prevZ, z];

    // 1_3s (Rejection)
    if (qcSettings.enabledRules['1_3s'] && Math.abs(z) > 3.0) {
      violatedRules.push({
        parameter: qp.label,
        rule: '1_3s',
        severity: 'REJECT',
        description: `Regla 1_3s: valor fuera de ±3 DE (${z > 0 ? '+' : ''}${z.toFixed(2)} DE). Error aleatorio o sistemático severo.`,
      });
    } else if (qcSettings.enabledRules['1_2s'] && Math.abs(z) > 2.0) {
      // 1_2s (Warning)
      violatedRules.push({
        parameter: qp.label,
        rule: '1_2s',
        severity: 'WARNING',
        description: `Regla 1_2s (Advertencia): valor excede ±2 DE (${z > 0 ? '+' : ''}${z.toFixed(2)} DE). Vigilar tendencia.`,
      });
    }

    // 2_2s (Rejection: 2 consecutive > +2s or < -2s)
    if (qcSettings.enabledRules['2_2s'] && series.length >= 2) {
      const z1 = series[series.length - 2];
      const z2 = series[series.length - 1];
      if ((z1 > 2 && z2 > 2) || (z1 < -2 && z2 < -2)) {
        violatedRules.push({
          parameter: qp.label,
          rule: '2_2s',
          severity: 'REJECT',
          description: `Regla 2_2s: dos controles consecutivos superan ±2 DE en el mismo sentido (${z1.toFixed(2)}, ${z2.toFixed(2)} DE). Error sistemático.`,
        });
      }
    }

    // R_4s (Rejection: range between two consecutive >= 4 SD)
    if (qcSettings.enabledRules['R_4s'] && series.length >= 2) {
      const z1 = series[series.length - 2];
      const z2 = series[series.length - 1];
      if (Math.abs(z1 - z2) >= 4.0 && ((z1 >= 2 && z2 <= -2) || (z1 <= -2 && z2 >= 2))) {
        violatedRules.push({
          parameter: qp.label,
          rule: 'R_4s',
          severity: 'REJECT',
          description: `Regla R_4s: diferencia de ${Math.abs(z1 - z2).toFixed(2)} DE entre dos controles consecutivos. Error aleatorio.`,
        });
      }
    }

    // 4_1s (Rejection: 4 consecutive > +1s or < -1s)
    if (qcSettings.enabledRules['4_1s'] && series.length >= 4) {
      const last4 = series.slice(-4);
      if (last4.every((v) => v > 1.0) || last4.every((v) => v < -1.0)) {
        violatedRules.push({
          parameter: qp.label,
          rule: '4_1s',
          severity: 'REJECT',
          description: `Regla 4_1s: cuatro determinaciones consecutivas del mismo lado más allá de ±1 DE (desplazamiento sistemático).`,
        });
      }
    }

    // 10x (Rejection: 10 consecutive on same side of mean)
    if (qcSettings.enabledRules['10x'] && series.length >= 10) {
      const last10 = series.slice(-10);
      if (last10.every((v) => v > 0) || last10.every((v) => v < 0)) {
        violatedRules.push({
          parameter: qp.label,
          rule: '10x',
          severity: 'REJECT',
          description: `Regla 10x: diez controles consecutivos al mismo lado de la media (sesgo sostenido).`,
        });
      }
    }
  }

  const hasReject = violatedRules.some((v) => v.severity === 'REJECT');
  const hasWarning = violatedRules.some((v) => v.severity === 'WARNING');

  const status: QCRun['status'] = hasReject
    ? 'NO_CONFORME'
    : hasWarning
      ? 'ADVERTENCIA'
      : 'CONFORME';

  return {
    id: `QC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    levelId: level.id,
    levelName: level.name,
    lotNumber: level.lotNumber,
    timestamp,
    operatorId,
    operatorName,
    values,
    zScores,
    violatedRules,
    status,
  };
}

export function simulateQCValues(
  level: QCLevel,
  mode: 'CONFORME' | 'ADVERTENCIA_1_2S' | 'FUERA_DE_RANGO_1_3S'
): Record<QCParamKey, number> {
  const result = {} as Record<QCParamKey, number>;
  const faultParam: QCParamKey = 'pO2';

  for (const qp of QC_PARAMETERS) {
    const { mean, sd } = level.targets[qp.key];
    let z = (Math.random() - 0.5) * 1.4; // normal variation within ±0.7 SD

    if (mode === 'ADVERTENCIA_1_2S' && qp.key === faultParam) {
      z = 2.35;
    } else if (mode === 'FUERA_DE_RANGO_1_3S' && qp.key === faultParam) {
      z = 3.65;
    }

    const val = mean + z * sd;
    result[qp.key] = Number(val.toFixed(qp.decimals));
  }
  return result;
}

export function detectTrendOrShift(runs: QCRun[], param: QCParamKey): string | null {
  if (runs.length < 6) return null;
  const recent = runs.slice(-7).map((r) => r.zScores[param]);

  // Check monotonic trend (6 consecutive increasing or decreasing)
  let inc = true;
  let dec = true;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i] <= recent[i - 1]) inc = false;
    if (recent[i] >= recent[i - 1]) dec = false;
  }
  if (inc) return 'Tendencia ascendente continua detectada (posible deriva progresiva del sensor).';
  if (dec) return 'Tendencia descendente continua detectada (posible deriva progresiva del sensor).';

  // Check shift (6 consecutive on same side)
  const last6 = recent.slice(-6);
  if (last6.every((v) => v > 0.5)) return 'Desplazamiento positivo sostenido sobre +0,5 DE.';
  if (last6.every((v) => v < -0.5)) return 'Desplazamiento negativo sostenido bajo -0,5 DE.';

  return null;
}

export function computeQCStats(runs: QCRun[], param: QCParamKey) {
  if (runs.length === 0) return { n: 0, mean: 0, sd: 0, cv: 0 };
  const vals = runs.map((r) => r.values[param]);
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const variance =
    n > 1 ? vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const cv = mean !== 0 ? (sd / mean) * 100 : 0;
  return { n, mean, sd, cv };
}

export const WESTGARD_RULE_INFO: Record<WestgardRule, { title: string; type: 'Advertencia' | 'Rechazo'; desc: string }> = {
  '1_2s': {
    title: '1_2s',
    type: 'Advertencia',
    desc: 'Un resultado de control supera ±2 DE respecto a la media asignada.',
  },
  '1_3s': {
    title: '1_3s',
    type: 'Rechazo',
    desc: 'Un resultado de control supera ±3 DE (sensible a error aleatorio).',
  },
  '2_2s': {
    title: '2_2s',
    type: 'Rechazo',
    desc: 'Dos controles consecutivos superan +2 DE o ambos superan -2 DE (error sistemático).',
  },
  R_4s: {
    title: 'R_4s',
    type: 'Rechazo',
    desc: 'Dos controles consecutivos difieren en 4 DE o más (uno >+2 DE y otro <-2 DE).',
  },
  '4_1s': {
    title: '4_1s',
    type: 'Rechazo',
    desc: 'Cuatro controles consecutivos del mismo lado superan ±1 DE.',
  },
  '10x': {
    title: '10x',
    type: 'Rechazo',
    desc: 'Diez controles consecutivos situados al mismo lado de la media.',
  },
};
