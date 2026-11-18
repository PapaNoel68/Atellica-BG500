import {
  ClinicalInterpretation,
  ParameterValues,
  SampleType,
} from '@/src/types/analyzer';

/**
 * Clinical Interpretation Engine (Motor de Interpretación Clínica Automática).
 * Implements physiological acid-base rules, Winter's formula, compensation assessment,
 * oxygenation, lactate, electrolytes, and cooximetry findings.
 * Always states orientative nature and explicit limitations when variables (FiO2, Temp) are absent.
 */
export function runInterpretationEngine(params: {
  values: ParameterValues;
  sampleType: SampleType;
  fio2?: number;
  temperatureC?: number;
}): ClinicalInterpretation {
  const { values, sampleType, fio2, temperatureC } = params;
  const {
    pH,
    pCO2,
    pO2,
    HCO3,
    BE,
    AnionGap,
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
    sO2,
  } = values;

  const limitations: string[] = [];
  if (fio2 === undefined || fio2 <= 0) {
    limitations.push(
      'No se ha registrado la FiO2 administrada; no es posible calcular el cociente PaO2/FiO2 ni el gradiente alveolo-arterial con precisión.'
    );
  }
  if (temperatureC === undefined) {
    limitations.push(
      'Temperatura corporal no introducida (se asume 37,0 °C estándar para gases sanguíneos).'
    );
  }
  if (sampleType !== 'Arterial') {
    limitations.push(
      `Muestra ${sampleType.toLowerCase()}: la evaluación de oxigenación (pO2/sO2) no es equivalente a la sangre arterial para valorar insuficiencia respiratoria.`
    );
  }

  const additionalFindings: string[] = [];

  // Check missing core acid-base data
  if (
    pH === null ||
    pH === undefined ||
    pCO2 === null ||
    pCO2 === undefined ||
    HCO3 === null ||
    HCO3 === undefined
  ) {
    return {
      primaryDisorder: 'Datos ácido-base insuficientes para emitir una orientación completa.',
      expectedCompensation: 'No calculable por ausencia de pH, pCO2 o HCO3-.',
      mixedDisorderPossible: 'No evaluable con parámetros incompletos.',
      additionalFindings: ['Repita la determinación o revise los sensores no disponibles.'],
      limitations,
      summaryText:
        'Determinación incompleta. No se formulan conclusiones ácido-base sin los parámetros primarios.',
      isOrientativeNotice:
        'Interpretación orientativa generada por software de simulación. No constituye un diagnóstico médico.',
    };
  }

  // Reference centers by sample type
  const phLow = sampleType === 'Venosa' ? 7.31 : 7.35;
  const phHigh = sampleType === 'Venosa' ? 7.41 : 7.45;
  const pco2Low = sampleType === 'Venosa' ? 41 : 35;
  const pco2High = sampleType === 'Venosa' ? 51 : 45;
  const hco3Low = 22;
  const hco3High = sampleType === 'Venosa' ? 28 : 26;

  let primaryDisorder = 'Equilibrio ácido-base dentro de parámetros de referencia.';
  let expectedCompensation = 'Sin necesidad de respuesta compensatoria significativa.';
  let mixedDisorderPossible = 'No se detectan signos claros de trastorno mixto.';

  const isAcidemia = pH < phLow;
  const isAlkalemia = pH > phHigh;

  if (isAcidemia) {
    const respContribution = pCO2 > pco2High;
    const metContribution = HCO3 < hco3Low;

    if (respContribution && metContribution) {
      primaryDisorder = 'Acidosis mixta (componente metabólico y respiratorio simultáneos).';
      expectedCompensation =
        'Coexisten hipercapnia (pCO2 elevada) e hipobicarbonatemia (HCO3- descendido), impidiendo una compensación eficaz.';
      mixedDisorderPossible =
        'Trastorno mixto confirmado: acidosis metabólica + acidosis respiratoria concomitante.';
    } else if (metContribution) {
      const agNote =
        AnionGap !== null && AnionGap !== undefined
          ? AnionGap > 16
            ? ` con Anion Gap elevado (${AnionGap.toFixed(1)} mmol/L)`
            : ` con Anion Gap normal (${AnionGap.toFixed(1)} mmol/L, hiperclorémica probable)`
          : '';
      primaryDisorder = `Patrón compatible con acidosis metabólica primaria${agNote}.`;

      // Winter's formula: expected pCO2 = 1.5 * HCO3 + 8 ± 2
      const winterLow = 1.5 * HCO3 + 8 - 2;
      const winterHigh = 1.5 * HCO3 + 8 + 2;
      expectedCompensation = `Fórmula de Winter: pCO2 esperada entre ${winterLow.toFixed(1)} y ${winterHigh.toFixed(1)} mmHg (observada: ${pCO2.toFixed(1)} mmHg).`;

      if (pCO2 > winterHigh) {
        mixedDisorderPossible =
          'pCO2 superior a la esperada por Winter: sugiere acidosis respiratoria asociada (compensación insuficiente).';
      } else if (pCO2 < winterLow) {
        mixedDisorderPossible =
          'pCO2 inferior a la esperada por Winter: sugiere alcalosis respiratoria sobreañadida.';
      } else {
        mixedDisorderPossible =
          'Compensación respiratoria adecuada según fórmula de Winter; no sugiere trastorno mixto.';
      }
    } else if (respContribution) {
      primaryDisorder = 'Patrón compatible con acidosis respiratoria primaria (hipercapnia).';
      // Acute: HCO3 rises ~1 mmol/L per 10 mmHg pCO2 above 40. Chronic: ~3.5 mmol/L per 10 mmHg.
      const deltaPco2 = Math.max(0, pCO2 - 40);
      const expectedAcuteHco3 = 24 + 0.1 * deltaPco2;
      const expectedChronicHco3 = 24 + 0.35 * deltaPco2;
      expectedCompensation = `Compensación metabólica esperada: HCO3- ~${expectedAcuteHco3.toFixed(1)} mmol/L en fase aguda o ~${expectedChronicHco3.toFixed(1)} mmol/L en fase crónica (observado: ${HCO3.toFixed(1)} mmol/L).`;

      if (HCO3 < expectedAcuteHco3 - 2) {
        mixedDisorderPossible =
          'HCO3- inferior al esperado en fase aguda: posible acidosis metabólica asociada.';
      } else if (HCO3 > expectedChronicHco3 + 3) {
        mixedDisorderPossible =
          'HCO3- superior al esperado incluso en fase crónica: valorar alcalosis metabólica asociada.';
      } else if (HCO3 >= expectedChronicHco3 - 2) {
        mixedDisorderPossible =
          'Compatible con acidosis respiratoria crónica o parcialmente compensada.';
      } else {
        mixedDisorderPossible = 'Compatible con acidosis respiratoria aguda sin trastorno mixto evidente.';
      }
    } else {
      primaryDisorder = 'Acidemia leve con parámetros primarios limítrofes.';
    }
  } else if (isAlkalemia) {
    const respContribution = pCO2 < pco2Low;
    const metContribution = HCO3 > hco3High;

    if (respContribution && metContribution) {
      primaryDisorder = 'Alcalosis mixta (respiratoria y metabólica simultáneas).';
      expectedCompensation =
        'Coexisten hipocapnia y elevación de bicarbonato sin compensación contrarreguladora.';
      mixedDisorderPossible = 'Trastorno mixto confirmado: alcalosis metabólica + alcalosis respiratoria.';
    } else if (metContribution) {
      primaryDisorder = 'Patrón compatible con alcalosis metabólica primaria.';
      // Expected pCO2 ≈ 40 + 0.7 * (HCO3 - 24) ± 5
      const expPco2 = 40 + 0.7 * (HCO3 - 24);
      expectedCompensation = `Compensación respiratoria esperada: pCO2 ~${(expPco2 - 5).toFixed(1)} – ${(expPco2 + 5).toFixed(1)} mmHg (observada: ${pCO2.toFixed(1)} mmHg).`;
      if (pCO2 < expPco2 - 5) {
        mixedDisorderPossible =
          'pCO2 inferior a la esperada: posible alcalosis respiratoria concomitante.';
      } else if (pCO2 > expPco2 + 5) {
        mixedDisorderPossible =
          'pCO2 superior a la esperada: posible acidosis respiratoria asociada.';
      } else {
        mixedDisorderPossible = 'Compensación respiratoria coherente con alcalosis metabólica pura.';
      }
    } else if (respContribution) {
      primaryDisorder = 'Patrón compatible con alcalosis respiratoria primaria (hipocapnia).';
      const deltaPco2 = Math.max(0, 40 - pCO2);
      const expAcute = 24 - 0.2 * deltaPco2;
      const expChronic = 24 - 0.5 * deltaPco2;
      expectedCompensation = `Descenso compensatorio esperado de HCO3-: ~${expAcute.toFixed(1)} mmol/L (aguda) o ~${expChronic.toFixed(1)} mmol/L (crónica) vs observado ${HCO3.toFixed(1)} mmol/L.`;
      if (HCO3 > expAcute + 2) {
        mixedDisorderPossible =
          'HCO3- elevado respecto al esperado: sugiere alcalosis metabólica sobreañadida.';
      } else if (HCO3 < expChronic - 2.5) {
        mixedDisorderPossible =
          'HCO3- más bajo de lo esperado: valorar acidosis metabólica asociada.';
      } else {
        mixedDisorderPossible = 'Compatible con alcalosis respiratoria compensada acorde a evolución.';
      }
    } else {
      primaryDisorder = 'Alcalemia leve con pCO2 y HCO3- en rango limítrofe.';
    }
  } else {
    // Normal pH: check for compensated or balanced mixed disorders!
    if (pCO2 > pco2High && HCO3 > hco3High) {
      primaryDisorder =
        'pH en rango de referencia con elevación simultánea de pCO2 y HCO3-.';
      expectedCompensation =
        'Equilibrio compensado o trastorno mixto equilibrado (acidosis respiratoria crónica compensada o acidosis respiratoria + alcalosis metabólica).';
      mixedDisorderPossible =
        'Posible trastorno mixto compensado; requiere correlación clínica para diferenciar compensación crónica de trastorno doble.';
    } else if (pCO2 < pco2Low && HCO3 < hco3Low) {
      primaryDisorder =
        'pH en rango de referencia con descenso simultáneo de pCO2 y HCO3-.';
      expectedCompensation =
        'Compensación estrecha entre hipocapnia e hipobicarbonatemia.';
      mixedDisorderPossible =
        'Valorar acidosis metabólica + alcalosis respiratoria coexistentes o alcalosis respiratoria crónica compensada.';
    } else if (AnionGap !== null && AnionGap !== undefined && AnionGap > 18) {
      primaryDisorder = 'pH normal con Anion Gap elevado.';
      mixedDisorderPossible =
        'Un Anion Gap elevado con pH y HCO3- normales puede ocultar una acidosis metabólica con alcalosis metabólica simultánea.';
    }
  }

  // Oxygenation
  if (sampleType === 'Arterial' && pO2 !== null && pO2 !== undefined) {
    if (pO2 < 45) {
      additionalFindings.push(`Hipoxemia grave arterial (pO2 ${pO2.toFixed(1)} mmHg, sO2 ${sO2?.toFixed(1) ?? 'N/D'}%).`);
    } else if (pO2 < 60) {
      additionalFindings.push(`Hipoxemia moderada arterial (pO2 ${pO2.toFixed(1)} mmHg).`);
    } else if (pO2 < 80) {
      additionalFindings.push(`Hipoxemia leve arterial (pO2 ${pO2.toFixed(1)} mmHg).`);
    } else if (pO2 > 120) {
      additionalFindings.push(`Hiperoxemia arterial (pO2 ${pO2.toFixed(1)} mmHg) — valorar ajuste de FiO2 si procede.`);
    }
    if (fio2 && fio2 > 0) {
      const pafi = pO2 / (fio2 / 100);
      if (pafi < 100) {
        additionalFindings.push(`Cociente PaO2/FiO2 severamente comprometido (${pafi.toFixed(0)} mmHg).`);
      } else if (pafi < 200) {
        additionalFindings.push(`Cociente PaO2/FiO2 moderadamente alterado (${pafi.toFixed(0)} mmHg).`);
      } else if (pafi < 300) {
        additionalFindings.push(`Cociente PaO2/FiO2 levemente descendido (${pafi.toFixed(0)} mmHg).`);
      }
    }
  }

  // Lactate
  if (Lac !== null && Lac !== undefined) {
    if (Lac >= 4.0) {
      additionalFindings.push(`Hiperlactatemia grave (${Lac.toFixed(2)} mmol/L) compatible con hipoperfusión tisular o acidosis láctica.`);
    } else if (Lac > 2.0) {
      additionalFindings.push(`Hiperlactatemia moderada (${Lac.toFixed(2)} mmol/L).`);
    }
  }

  // Electrolytes & Glucose
  if (K !== null && K !== undefined) {
    if (K >= 6.2) additionalFindings.push(`Hiperpotasemia crítica (${K.toFixed(2)} mmol/L).`);
    else if (K > 5.1) additionalFindings.push(`Hiperpotasemia (${K.toFixed(2)} mmol/L).`);
    else if (K <= 2.8) additionalFindings.push(`Hipopotasemia crítica (${K.toFixed(2)} mmol/L).`);
    else if (K < 3.5) additionalFindings.push(`Hipopotasemia (${K.toFixed(2)} mmol/L).`);
  }

  if (Na !== null && Na !== undefined) {
    if (Na < 130) additionalFindings.push(`Hiponatremia significativa (${Na.toFixed(1)} mmol/L).`);
    else if (Na > 150) additionalFindings.push(`Hipernatremia significativa (${Na.toFixed(1)} mmol/L).`);
  }

  if (Ca !== null && Ca !== undefined) {
    if (Ca < 1.0) additionalFindings.push(`Hipocalcemia iónica (${Ca.toFixed(2)} mmol/L).`);
    else if (Ca > 1.4) additionalFindings.push(`Hipercalcemia iónica (${Ca.toFixed(2)} mmol/L).`);
  }

  if (Cl !== null && Cl !== undefined) {
    if (Cl > 110) additionalFindings.push(`Hipercloremia (${Cl.toFixed(1)} mmol/L).`);
    else if (Cl < 95) additionalFindings.push(`Hipocloremia (${Cl.toFixed(1)} mmol/L).`);
  }

  if (Glu !== null && Glu !== undefined) {
    if (Glu < 55) additionalFindings.push(`Hipoglucemia relevante (${Glu.toFixed(0)} mg/dL).`);
    else if (Glu > 250) additionalFindings.push(`Hiperglucemia marcada (${Glu.toFixed(0)} mg/dL).`);
  }

  // Cooximetry & Hb
  if (ctHb !== null && ctHb !== undefined && ctHb < 8.5) {
    additionalFindings.push(`Descenso relevante de hemoglobina total (ctHb ${ctHb.toFixed(1)} g/dL).`);
  }
  if (FCOHb !== null && FCOHb !== undefined && FCOHb >= 5.0) {
    additionalFindings.push(
      `Elevación de carboxihemoglobina (FCOHb ${FCOHb.toFixed(1)}%): valorar exposición a monóxido de carbono o tabaquismo intenso.`
    );
  }
  if (FMetHb !== null && FMetHb !== undefined && FMetHb >= 3.0) {
    additionalFindings.push(
      `Metahemoglobinemia elevada (FMetHb ${FMetHb.toFixed(1)}%): reduce la capacidad de transporte efectivo de oxígeno (FO2Hb ${FO2Hb?.toFixed(1) ?? 'N/D'}%).`
    );
  }

  if (BE !== null && BE !== undefined && Math.abs(BE) > 5) {
    additionalFindings.push(
      `Exceso de bases ${BE > 0 ? '+' : ''}${BE.toFixed(1)} mmol/L confirma componente metabólico relevante.`
    );
  }

  if (additionalFindings.length === 0) {
    additionalFindings.push('Electrolitos, metabolismo, lactato y fracciones de cooximetría sin hallazgos patológicos destacables.');
  }

  const summaryText = `${primaryDisorder} ${expectedCompensation} ${additionalFindings[0] ?? ''}`.trim();

  return {
    primaryDisorder,
    expectedCompensation,
    mixedDisorderPossible,
    additionalFindings,
    limitations,
    summaryText,
    isOrientativeNotice:
      'Orientación fisiopatológica automática (simulación). No sustituye el criterio clínico ni constituye diagnóstico médico.',
  };
}
