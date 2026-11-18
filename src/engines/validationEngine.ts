import {
  AnalyzerConfig,
  BloodGasRecord,
  ParameterKey,
  ParameterValues,
  SampleType,
  ValidationIssue,
} from '@/src/types/analyzer';

export type ArterialVenousMismatch = 'NONE' | 'ART_LOOKS_VENOUS' | 'VEN_LOOKS_ART';

export function detectArterialVenousMismatch(
  sampleType: SampleType,
  values: ParameterValues
): ArterialVenousMismatch {
  const pO2 = values.pO2;
  const sO2 = values.sO2;
  if (sampleType === 'Arterial') {
    if ((sO2 !== null && sO2 !== undefined && sO2 < 90) || (pO2 !== null && pO2 !== undefined && pO2 < 60)) {
      return 'ART_LOOKS_VENOUS';
    }
  } else if (sampleType === 'Venosa') {
    if ((pO2 !== null && pO2 !== undefined && pO2 >= 75) || (sO2 !== null && sO2 !== undefined && sO2 >= 94)) {
      return 'VEN_LOOKS_ART';
    }
  }
  return 'NONE';
}

function makeIssue(
  partial: Omit<ValidationIssue, 'id' | 'timestamp'>,
  timestamp: string
): ValidationIssue {
  return {
    ...partial,
    id: `INC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    timestamp,
  };
}

/**
 * Deterministic Validation & Coherence Engine (Motor de Validación e Incoherencias).
 * Never mutates the original analytical results. Evaluates:
 * 1. Physiological coherence (Henderson-Hasselbalch, BE, TCO2, O2 dissociation, cooximetry sum, Anion Gap).
 * 2. Analytical coherence (measuring ranges, impossible/implausible values, missing/N/D parameters).
 * 3. Temporal coherence (Delta checks vs previous patient determination).
 */
export function runValidationEngine(params: {
  values: ParameterValues;
  sampleType: SampleType;
  fio2?: number;
  extractionMinutesAgo?: number;
  patientId: string;
  previousRecords: BloodGasRecord[];
  config: AnalyzerConfig;
  timestamp: string;
}): ValidationIssue[] {
  const {
    values,
    sampleType,
    fio2,
    extractionMinutesAgo,
    patientId,
    previousRecords,
    config,
    timestamp,
  } = params;

  const issues: ValidationIssue[] = [];
  const { coherence, parameters } = config;

  // --- 1. ANALYTICAL COHERENCE & MISSING / IMPLAUSIBLE VALUES ---
  const unavailableKeys: ParameterKey[] = [];
  (Object.keys(parameters) as ParameterKey[]).forEach((key) => {
    const cfg = parameters[key];
    if (!cfg.enabled || !cfg.visible) return;
    const val = values[key];

    if (val === null) {
      unavailableKeys.push(key);
      return;
    }

    if (val !== undefined && !Number.isNaN(val)) {
      if (val < cfg.analyticalMin || val > cfg.analyticalMax) {
        issues.push(
          makeIssue(
            {
              parameter: cfg.shortLabel,
              level: 'Crítica',
              category: 'Analítica',
              title: `Valor fuera del rango analítico (${cfg.shortLabel})`,
              explanation: `El valor obtenido (${val.toFixed(cfg.decimals)} ${cfg.unit}) excede los límites analíticos válidos del sistema (${cfg.analyticalMin} – ${cfg.analyticalMax} ${cfg.unit}).`,
              relatedResults: `${cfg.shortLabel}: ${val.toFixed(cfg.decimals)} ${cfg.unit}`,
              possibleCauses: [
                'Fallo puntual de electrodo o interferencia química grave.',
                'Presencia de microburbuja o coágulo en cámara de medida.',
                'Contaminación extrema de la muestra.',
              ],
              recommendedChecks: [
                'No informar este parámetro como definitivo.',
                'Comprobar estado de calibración y lavado de sensores.',
                'Repetir extracción asegurando técnica preanalítica correcta.',
              ],
            },
            timestamp
          )
        );
      }
    }
  });

  if (unavailableKeys.length > 0) {
    const labels = unavailableKeys.map((k) => parameters[k].shortLabel).join(', ');
    issues.push(
      makeIssue(
        {
          parameter: labels,
          level: unavailableKeys.some((k) => k === 'pH' || k === 'pCO2' || k === 'K')
            ? 'Requiere revisión'
            : 'Advertencia',
          category: 'Analítica',
          title: 'Parámetro(s) no disponible(s) en la determinación',
          explanation: `No se ha podido emitir resultado para: ${labels}. Posible interferencia óptica, burbuja localizada o error en el cálculo dependiente.`,
          relatedResults: `Parámetros afectados: ${labels}`,
          possibleCauses: [
            'Interferencia local de burbuja sobre electrodo específico.',
            'Sensor en deriva o pendiente de recalibración.',
            'Datos base insuficientes para parámetro calculado.',
          ],
          recommendedChecks: [
            'Revisar estado de sensores en Modo Laboratorio > Diagnóstico.',
            'Ejecutar lavado / calibración de 1 punto si persiste.',
            'Valorar repetición si el parámetro es crítico para la decisión clínica.',
          ],
        },
        timestamp
      )
    );
  }

  // Preanalytical time check
  if (extractionMinutesAgo !== undefined && extractionMinutesAgo > 30) {
    issues.push(
      makeIssue(
        {
          parameter: 'Tiempo preanalítico',
          level: extractionMinutesAgo > 45 ? 'Requiere revisión' : 'Advertencia',
          category: 'Preanalítica',
          title: `Demora elevada desde la extracción (${extractionMinutesAgo} min)`,
          explanation: `La muestra ha sido procesada ${extractionMinutesAgo} minutos después de su extracción sin garantía de refrigeración controlada, lo que altera pH, pO2, glucosa y lactato por metabolismo celular continuo.`,
          relatedResults: `pH: ${values.pH ?? 'N/D'}, pO2: ${values.pO2 ?? 'N/D'}, Lac: ${values.Lac ?? 'N/D'}, Glu: ${values.Glu ?? 'N/D'}`,
          possibleCauses: [
            'Retraso en el transporte o espera prolongada a temperatura ambiente.',
            'Consumo de O2 y glucosa con generación de lactato y descenso de pH in vitro.',
          ],
          recommendedChecks: [
            'Correlacionar lactato y glucosa con clínica actual.',
            'Si han pasado >30 min a temperatura ambiente, repetir extracción.',
          ],
        },
        timestamp
      )
    );
  }

  // --- 2. PHYSIOLOGICAL COHERENCE ---
  if (coherence.enablePhysiologicalChecks) {
    const { pH, pCO2, pO2, HCO3, BE, TCO2, sO2, Na, Cl, AnionGap, FO2Hb, FCOHb, FMetHb, FHHb } =
      values;

    // 2.1 Henderson-Hasselbalch: pH = 6.1 + log10(HCO3 / (0.0307 * pCO2))
    if (
      pH !== null &&
      pH !== undefined &&
      pCO2 !== null &&
      pCO2 !== undefined &&
      HCO3 !== null &&
      HCO3 !== undefined &&
      pCO2 > 0 &&
      HCO3 > 0
    ) {
      const expectedPh = 6.1 + Math.log10(HCO3 / (0.0307 * pCO2));
      const diffPh = Math.abs(pH - expectedPh);
      if (diffPh > coherence.maxPhDiff) {
        issues.push(
          makeIssue(
            {
              parameter: 'pH / pCO2 / HCO3-',
              level: diffPh > coherence.maxPhDiff * 2 ? 'Crítica' : 'Requiere revisión',
              category: 'Fisiológica',
              title: 'Incoherencia en ecuación de Henderson-Hasselbalch',
              explanation: `El pH medido (${pH.toFixed(3)}) no es compatible matemáticamente con pCO2 (${pCO2.toFixed(1)} mmHg) y HCO3- (${HCO3.toFixed(1)} mmol/L). El pH teórico esperado es ${expectedPh.toFixed(3)} (desviación Δ = ${diffPh.toFixed(3)}).`,
              relatedResults: `pH: ${pH.toFixed(3)} | pCO2: ${pCO2.toFixed(1)} mmHg | HCO3-: ${HCO3.toFixed(1)} mmol/L`,
              possibleCauses: [
                'Error de medición puntual en electrodo de pH o pCO2.',
                'Alteración en el módulo de cálculo o transcripción inconsistente.',
                'Contaminación o burbuja parcial durante la aspiración.',
              ],
              recommendedChecks: [
                'Verificar calibración de pH y pCO2.',
                'Repetir medición con nueva alícuota o nueva muestra.',
              ],
            },
            timestamp
          )
        );
      }
    }

    // 2.2 Concordancia pH y BE
    if (
      pH !== null &&
      pH !== undefined &&
      BE !== null &&
      BE !== undefined &&
      pCO2 !== null &&
      pCO2 !== undefined
    ) {
      // Severe acidemia with strongly positive BE and normal/low pCO2 is physiologically impossible
      if (pH < 7.25 && BE > 6 && pCO2 < 45) {
        issues.push(
          makeIssue(
            {
              parameter: 'pH / BE',
              level: 'Crítica',
              category: 'Fisiológica',
              title: 'Discordancia grave entre pH acidémico y exceso de bases positivo',
              explanation: `Se observa un pH claramente ácido (${pH.toFixed(3)}) junto a un BE positivo (+${BE.toFixed(1)} mmol/L) sin hipercapnia que lo justifique (pCO2 ${pCO2.toFixed(1)} mmHg).`,
              relatedResults: `pH: ${pH.toFixed(3)} | BE: ${BE.toFixed(1)} mmol/L | pCO2: ${pCO2.toFixed(1)} mmHg`,
              possibleCauses: [
                'Inconsistencia entre parámetros medidos y derivados.',
                'Fallo de cálculo del algoritmo de exceso de bases.',
              ],
              recommendedChecks: [
                'Revisar valores primarios de pH y pCO2.',
                'Solicitar revisión por Facultativo de Laboratorio.',
              ],
            },
            timestamp
          )
        );
      } else if (pH > 7.55 && BE < -6 && pCO2 > 35) {
        issues.push(
          makeIssue(
            {
              parameter: 'pH / BE',
              level: 'Crítica',
              category: 'Fisiológica',
              title: 'Discordancia grave entre alcalemia y déficit de bases sin hipocapnia',
              explanation: `Se registra pH alcalino (${pH.toFixed(3)}) con BE muy negativo (${BE.toFixed(1)} mmol/L) y pCO2 no descendida (${pCO2.toFixed(1)} mmHg).`,
              relatedResults: `pH: ${pH.toFixed(3)} | BE: ${BE.toFixed(1)} mmol/L | pCO2: ${pCO2.toFixed(1)} mmHg`,
              possibleCauses: [
                'Error en lectura de electrodo de pH o pCO2.',
                'Inconsistencia en parámetro derivado BE.',
              ],
              recommendedChecks: [
                'Repetir determinación antes de validar.',
                'Revisar control de calidad nivel 2.',
              ],
            },
            timestamp
          )
        );
      }
    }

    // 2.3 Coherencia HCO3- y TCO2 (TCO2 ≈ HCO3- + 0.0307 * pCO2)
    if (
      HCO3 !== null &&
      HCO3 !== undefined &&
      TCO2 !== null &&
      TCO2 !== undefined &&
      pCO2 !== null &&
      pCO2 !== undefined
    ) {
      const expectedTco2 = HCO3 + 0.0307 * pCO2;
      const diffTco2 = Math.abs(TCO2 - expectedTco2);
      if (diffTco2 > coherence.maxHco3Tco2Diff) {
        issues.push(
          makeIssue(
            {
              parameter: 'HCO3- / TCO2',
              level: 'Requiere revisión',
              category: 'Fisiológica',
              title: 'Incompatibilidad entre Bicarbonato (HCO3-) y CO2 Total (TCO2)',
              explanation: `El TCO2 reportado (${TCO2.toFixed(1)} mmol/L) difiere en ${diffTco2.toFixed(1)} mmol/L del valor esperado (${expectedTco2.toFixed(1)} mmol/L = HCO3- + 0.0307·pCO2).`,
              relatedResults: `HCO3-: ${HCO3.toFixed(1)} | TCO2: ${TCO2.toFixed(1)} | pCO2: ${pCO2.toFixed(1)}`,
              possibleCauses: [
                'Error de cálculo interno en parámetros derivados.',
                'Desajuste en la configuración de factores de conversión.',
              ],
              recommendedChecks: [
                'Verificar configuración de cálculos en Modo Laboratorio.',
                'Recalcular y contrastar con analizador de bioquímica si procede.',
              ],
            },
            timestamp
          )
        );
      }
    }

    // 2.4 Suma de fracciones de cooximetría (FO2Hb + FCOHb + FMetHb + FHHb ≈ 100%)
    if (
      FO2Hb !== null &&
      FO2Hb !== undefined &&
      FCOHb !== null &&
      FCOHb !== undefined &&
      FMetHb !== null &&
      FMetHb !== undefined &&
      FHHb !== null &&
      FHHb !== undefined
    ) {
      const cooxSum = FO2Hb + FCOHb + FMetHb + FHHb;
      if (cooxSum < coherence.cooxSumMin || cooxSum > coherence.cooxSumMax) {
        issues.push(
          makeIssue(
            {
              parameter: 'Cooximetría (Fracciones Hb)',
              level: Math.abs(cooxSum - 100) > 8 ? 'Crítica' : 'Requiere revisión',
              category: 'Fisiológica',
              title: 'Suma de fracciones de hemoglobina fuera de rango fisiológico',
              explanation: `La suma de fracciones medidas (FO2Hb + FCOHb + FMetHb + FHHb = ${cooxSum.toFixed(1)}%) se desvía del 100% esperado (límite configurado: ${cooxSum < coherence.cooxSumMin ? '<' + coherence.cooxSumMin : '>' + coherence.cooxSumMax}%).`,
              relatedResults: `FO2Hb: ${FO2Hb.toFixed(1)}% | FCOHb: ${FCOHb.toFixed(1)}% | FMetHb: ${FMetHb.toFixed(1)}% | FHHb: ${FHHb.toFixed(1)}%`,
              possibleCauses: [
                'Hemólisis parcial o presencia de burbuja/turbidez en celda óptica.',
                'Interferencia por azul de metileno, lípidos o bilirrubina muy elevada.',
                'Descalibración del módulo espectrofotométrico de cooximetría.',
              ],
              recommendedChecks: [
                'Inspeccionar muestra por posible turbidez o microcoágulos.',
                'Verificar módulo óptico y calibración de cooximetría.',
              ],
            },
            timestamp
          )
        );
      }
    }

    // 2.5 Coherencia entre parámetros de oxigenación (pO2 vs sO2 / FO2Hb)
    if (
      pO2 !== null &&
      pO2 !== undefined &&
      sO2 !== null &&
      sO2 !== undefined &&
      FCOHb !== undefined &&
      FMetHb !== undefined
    ) {
      // Rough Hill estimation for expected sO2 at normal pH/T: sO2 ≈ (pO2^2.7) / (pO2^2.7 + 26.8^2.7) * 100
      const p50 = 26.8;
      const expectedSo2 = (Math.pow(pO2, 2.7) / (Math.pow(pO2, 2.7) + Math.pow(p50, 2.7))) * 100;
      const diffSo2 = Math.abs(sO2 - expectedSo2);
      if (diffSo2 > 18 && pO2 > 15) {
        issues.push(
          makeIssue(
            {
              parameter: 'pO2 / sO2',
              level: 'Advertencia',
              category: 'Fisiológica',
              title: 'Discrepancia entre pO2 medida y saturación sO2 reportada',
              explanation: `Para una pO2 de ${pO2.toFixed(1)} mmHg, la saturación teórica en curva estándar ronda ${expectedSo2.toFixed(1)}%, frente al ${sO2.toFixed(1)}% reportado.`,
              relatedResults: `pO2: ${pO2.toFixed(1)} mmHg | sO2: ${sO2.toFixed(1)}% | pH: ${pH?.toFixed(3) ?? 'N/D'}`,
              possibleCauses: [
                'Desviación acusada de la curva de disociación (pH extremo, temperatura, 2,3-DPG).',
                'Presencia de burbuja de aire ambiental en jeringa (eleva pO2 sin elevar proporcionalmente sO2 o viceversa).',
                'Error de medición en sensor pO2.',
              ],
              recommendedChecks: [
                'Confirmar ausencia de burbujas en la jeringa.',
                'Introducir temperatura real del paciente si presenta hipotermia o fiebre.',
              ],
            },
            timestamp
          )
        );
      }

      // Arterial vs FiO2 21% impossible pO2
      if (sampleType === 'Arterial' && fio2 !== undefined && fio2 <= 22 && pO2 > 135) {
        issues.push(
          makeIssue(
            {
              parameter: 'pO2 / FiO2',
              level: 'Requiere revisión',
              category: 'Preanalítica',
              title: 'pO2 arterial fisiológicamente improbable con FiO2 ambiental (21%)',
              explanation: `Con FiO2 del ${fio2}%, la pO2 alveolar máxima teórica a nivel del mar (~150 mmHg menos pCO2/0.8) no permite alcanzar una PaO2 de ${pO2.toFixed(1)} mmHg.`,
              relatedResults: `pO2: ${pO2.toFixed(1)} mmHg | FiO2 declarada: ${fio2}% | pCO2: ${pCO2 ?? 'N/D'} mmHg`,
              possibleCauses: [
                'FiO2 registrada incorrectamente (el paciente recibía oxígeno suplementario).',
                'Contaminación por burbuja de aire con agitación vigorosa o error de sensor pO2.',
              ],
              recommendedChecks: [
                'Confirmar FiO2 real administrada al paciente.',
                'Descartar presencia de aire en jeringa.',
              ],
            },
            timestamp
          )
        );
      }
    }

    // 2.6 Coherencia entre Na+, Cl-, HCO3- y Anion Gap
    if (
      Na !== null &&
      Na !== undefined &&
      Cl !== null &&
      Cl !== undefined &&
      HCO3 !== null &&
      HCO3 !== undefined &&
      AnionGap !== null &&
      AnionGap !== undefined
    ) {
      const expectedAG = Na - (Cl + HCO3);
      const diffAG = Math.abs(AnionGap - expectedAG);
      if (diffAG > coherence.maxAnionGapDiff) {
        issues.push(
          makeIssue(
            {
              parameter: 'Na+ / Cl- / HCO3- / Anion Gap',
              level: 'Requiere revisión',
              category: 'Fisiológica',
              title: 'Inconsistencia en el cálculo de Anion Gap',
              explanation: `El Anion Gap reportado (${AnionGap.toFixed(1)} mmol/L) no coincide con la fórmula [Na+ - (Cl- + HCO3-)] = ${expectedAG.toFixed(1)} mmol/L.`,
              relatedResults: `Na+: ${Na.toFixed(1)} | Cl-: ${Cl.toFixed(1)} | HCO3-: ${HCO3.toFixed(1)} | AG: ${AnionGap.toFixed(1)}`,
              possibleCauses: [
                'Diferencia de fórmula (inclusión o exclusión de K+) respecto a configuración.',
                'Error puntual de cálculo en parámetro derivado.',
              ],
              recommendedChecks: [
                'Comprobar fórmula de Anion Gap en Configuración Analítica.',
              ],
            },
            timestamp
          )
        );
      }
      if (expectedAG < -2) {
        issues.push(
          makeIssue(
            {
              parameter: 'Anion Gap',
              level: 'Advertencia',
              category: 'Fisiológica',
              title: 'Anion Gap marcadamente negativo',
              explanation: `El balance electrolítico arroja un Anion Gap negativo (${expectedAG.toFixed(1)} mmol/L), hallazgo infrecuente que suele apuntar a error analítico o interferencia.`,
              relatedResults: `Na+: ${Na.toFixed(1)} | Cl-: ${Cl.toFixed(1)} | HCO3-: ${HCO3.toFixed(1)}`,
              possibleCauses: [
                'Error en medición de Cl- (interferencia por bromuro/salicilatos) o Na+.',
                'Hipoalbuminemia extrema o paraproteinemia catiónica (mieloma IgG).',
              ],
              recommendedChecks: [
                'Revisar electrodos ISE de Na+ y Cl-.',
                'Correlacionar con ionograma en laboratorio central.',
              ],
            },
            timestamp
          )
        );
      }
    }

    // 2.7 Sample type plausibility (bidirectional Arterial <-> Venous check)
    const mismatch = detectArterialVenousMismatch(sampleType, values);
    if (mismatch === 'ART_LOOKS_VENOUS') {
      issues.push(
        makeIssue(
          {
            parameter: 'Tipo de muestra / pO2 / sO2',
            level: 'Advertencia',
            category: 'Preanalítica',
            title: 'Muestra Arterial con perfil compatible con Venosa',
            explanation: `Muestra declarada como Arterial pero presenta valores bajos (pO2: ${pO2?.toFixed(1) ?? 'N/D'} mmHg, sO2: ${sO2?.toFixed(1) ?? 'N/D'}%), compatibles con sangre venosa.`,
            relatedResults: `Muestra: Arterial | pO2: ${pO2?.toFixed(1) ?? 'N/D'} mmHg | sO2: ${sO2?.toFixed(1) ?? 'N/D'}%`,
            possibleCauses: [
              'Punción venosa accidental o mezcla venosa durante extracción arterial.',
              'Selección errónea del tipo de muestra (venosa registrada como arterial).',
              'Hipoxemia severa o hipoperfusión extrema si se confirma origen arterial.',
            ],
            recommendedChecks: [
              'Confirmar punto de extracción (arterial vs venosa) con el operador.',
              'Correlacionar con pulsioximetría (SpO2) del paciente antes de validar.',
            ],
          },
          timestamp
        )
      );
    } else if (mismatch === 'VEN_LOOKS_ART') {
      issues.push(
        makeIssue(
          {
            parameter: 'Tipo de muestra / pO2 / sO2',
            level: 'Advertencia',
            category: 'Preanalítica',
            title: 'Muestra Venosa con perfil compatible con Arterial',
            explanation: `Muestra declarada como Venosa pero presenta oxigenación compatible con Arterial (pO2: ${pO2?.toFixed(1) ?? 'N/D'} mmHg, sO2: ${sO2?.toFixed(1) ?? 'N/D'}%).`,
            relatedResults: `Muestra: Venosa | pO2: ${pO2?.toFixed(1) ?? 'N/D'} mmHg | sO2: ${sO2?.toFixed(1) ?? 'N/D'}%`,
            possibleCauses: [
              'Selección errónea del tipo de muestra en el analizador (muestra arterial etiquetada como venosa).',
              'Punción arterial accidental durante extracción venosa o contaminación con aire.',
            ],
            recommendedChecks: [
              'Confirmar punto de extracción (arterial vs venosa) con el operador.',
              'Corregir el tipo de muestra si procede antes de emitir el informe definitivo.',
            ],
          },
          timestamp
        )
      );
    }
  }

  // --- 3. TEMPORAL COHERENCE (DELTA CHECKS) ---
  if (coherence.enableTemporalDeltaChecks && previousRecords.length > 0) {
    const samePatientSorted = [...previousRecords]
      .filter((r) => r.patientId.toUpperCase() === patientId.toUpperCase())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const prev = samePatientSorted[0];
    if (prev) {
      const hoursDiff = Math.max(
        0.1,
        (new Date(timestamp).getTime() - new Date(prev.timestamp).getTime()) / 3600000
      );

      // Check potential EDTA / IV fluid dilution artifact first: K+ jumps up AND Ca++ drops dramatically
      const kNow = values.K;
      const kPrev = prev.values.K;
      const caNow = values.Ca;
      const caPrev = prev.values.Ca;
      if (
        kNow !== null &&
        kNow !== undefined &&
        kPrev !== null &&
        kPrev !== undefined &&
        caNow !== null &&
        caNow !== undefined &&
        caPrev !== null &&
        caPrev !== undefined &&
        kNow - kPrev >= (parameters.K.deltaLimit ?? 1.5) &&
        caNow < 0.5 &&
        caPrev > 0.9
      ) {
        issues.push(
          makeIssue(
            {
              parameter: 'K+ / Ca++ (Delta Check)',
              level: 'Crítica',
              category: 'Temporal (Delta)',
              title: 'Patrón compatible con contaminación por EDTA-K',
              explanation: `Descenso brusco de Ca++ (${caPrev.toFixed(2)} → ${caNow.toFixed(2)} mmol/L) acompañado de elevación abrupta de K+ (${kPrev.toFixed(2)} → ${kNow.toFixed(2)} mmol/L) en ${hoursDiff.toFixed(1)} h.`,
              relatedResults: `K+ previo: ${kPrev.toFixed(2)} → actual: ${kNow.toFixed(2)} | Ca++ previo: ${caPrev.toFixed(2)} → actual: ${caNow.toFixed(2)}`,
              possibleCauses: [
                'Extracción en tubo con EDTA potásico o trasvase incorrecto.',
                'Orden inadecuado de llenado de tubos durante la venopunción.',
              ],
              recommendedChecks: [
                'NO administrar tratamiento hipopotasemiante basado en esta muestra.',
                'Repetir extracción directa en jeringa heparinizada balanceada.',
              ],
            },
            timestamp
          )
        );
      }

      const deltaTargets: { key: ParameterKey; clinicalNote: string; errorNote: string }[] = [
        {
          key: 'pH',
          clinicalNote: 'Cambio metabólico o ventilatorio agudo.',
          errorNote: 'Posible confusión de paciente o demora preanalítica extrema.',
        },
        {
          key: 'K',
          clinicalNote: 'Corrección terapéutica, lisis celular o redistribución.',
          errorNote: 'Hemólisis mecánica en jeringa o contaminación por suero/EDTA.',
        },
        {
          key: 'ctHb',
          clinicalNote: 'Transfusión de concentrado de hematíes o sangrado agudo.',
          errorNote: 'Sedimentación de la muestra por falta de homogeneización o dilución por vía.',
        },
        {
          key: 'Lac',
          clinicalNote: 'Evolución de hipoperfusión o respuesta a reanimación.',
          errorNote: 'Torniquete prolongado o muestra retenida sin refrigerar.',
        },
        {
          key: 'pCO2',
          clinicalNote: 'Cambio de parámetros de ventilación mecánica.',
          errorNote: 'Intercambio de muestras o burbujas de aire.',
        },
        {
          key: 'pO2',
          clinicalNote: 'Modificación de FiO2 / PEEP o cambio de tipo de muestra.',
          errorNote: 'Muestra arterial/venosa intercambiada o burbuja ambiental.',
        },
      ];

      for (const dt of deltaTargets) {
        const cfg = parameters[dt.key];
        const limit = cfg.deltaLimit;
        const currVal = values[dt.key];
        const prevVal = prev.values[dt.key];

        if (
          limit !== undefined &&
          currVal !== null &&
          currVal !== undefined &&
          prevVal !== null &&
          prevVal !== undefined
        ) {
          const delta = Math.abs(currVal - prevVal);
          if (delta >= limit) {
            const isSharp = hoursDiff <= 6;
            issues.push(
              makeIssue(
                {
                  parameter: `${cfg.shortLabel} (Delta)`,
                  level: delta >= limit * 1.6 && isSharp ? 'Requiere revisión' : 'Informativa',
                  category: 'Temporal (Delta)',
                  title: `Variación temporal significativa en ${cfg.shortLabel} (Δ ${delta.toFixed(cfg.decimals)} ${cfg.unit})`,
                  explanation: `Respecto a la determinación previa (${prev.sampleNumber}, hace ${hoursDiff.toFixed(1)} h), ${cfg.shortLabel} ha variado de ${prevVal.toFixed(cfg.decimals)} a ${currVal.toFixed(cfg.decimals)} ${cfg.unit} (límite delta: ±${limit} ${cfg.unit}).`,
                  relatedResults: `Previo (${prev.sampleType}): ${prevVal.toFixed(cfg.decimals)} → Actual (${sampleType}): ${currVal.toFixed(cfg.decimals)} ${cfg.unit}`,
                  possibleCauses: [dt.clinicalNote, dt.errorNote],
                  recommendedChecks: [
                    'Confirmar identidad del paciente (descartar error de identificación).',
                    'Correlacionar con cambios terapéuticos recientes o repetir si no hay justificación clínica.',
                  ],
                },
                timestamp
              )
            );
          }
        }
      }
    }
  }

  return issues;
}
