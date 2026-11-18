import React from 'react';
import {
  AbnormalityFlag,
  AnalyzerStatus,
  AtellicaMessage,
  AtellicaMessagePriority,
  AtellicaMessageStatus,
  AtellicaMessageType,
  CalibrationRecord,
  CalibrationStatus,
  ClinicalProfileScenario,
  CommunicationStatus,
  ConsumableCategory,
  ConsumableItem,
  IdentificationStatus,
  MaintenanceError,
  ParameterCategory,
  ParameterKey,
  ResultValidationStatus,
  SampleType,
  UserRole,
  WestgardRule,
} from '@/src/types/analyzer';

export type Language = 'es' | 'en';

export function localeFor(lang: Language): string {
  return lang === 'en' ? 'en-GB' : 'es-ES';
}

export function tr<T>(lang: Language, es: T, en: T): T {
  return lang === 'en' ? en : es;
}

export const SpanishFlagIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) =>
  React.createElement(
    'svg',
    { viewBox: '0 0 24 16', className, 'aria-hidden': true },
    React.createElement('rect', { width: 24, height: 16, rx: 2, fill: '#AA151B' }),
    React.createElement('rect', { y: 4, width: 24, height: 8, fill: '#F1BF00' }),
    React.createElement('rect', { x: 4.5, y: 5.5, width: 3, height: 5, rx: 0.6, fill: '#AA151B', opacity: 0.85 }),
    React.createElement('circle', { cx: 6, cy: 7.5, r: 0.8, fill: '#F1BF00' })
  );

export const EnglishFlagIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => {
  const clipId = React.useId();
  return React.createElement(
    'svg',
    { viewBox: '0 0 24 16', className, 'aria-hidden': true },
    React.createElement(
      'clipPath',
      { id: clipId },
      React.createElement('rect', { width: 24, height: 16, rx: 2 })
    ),
    React.createElement(
      'g',
      { clipPath: `url(#${clipId})` },
      React.createElement('rect', { width: 24, height: 16, fill: '#012169' }),
      React.createElement('path', { d: 'M0 0 L24 16 M24 0 L0 16', stroke: '#FFFFFF', strokeWidth: 3.2 }),
      React.createElement('path', { d: 'M0 0 L24 16 M24 0 L0 16', stroke: '#C8102E', strokeWidth: 1.6 }),
      React.createElement('path', { d: 'M12 0 V16 M0 8 H24', stroke: '#FFFFFF', strokeWidth: 5 }),
      React.createElement('path', { d: 'M12 0 V16 M0 8 H24', stroke: '#C8102E', strokeWidth: 2.8 })
    )
  );
};

export function translateRole(lang: Language, role: UserRole): string {
  if (lang === 'es') {
    const map: Record<UserRole, string> = {
      ENFERMERIA: 'Enfermería',
      TECNICO_LAB: 'Técnico de laboratorio',
      FACULTATIVO_LAB: 'Facultativo de laboratorio',
      ADMINISTRADOR: 'Administrador',
    };
    return map[role];
  }
  const map: Record<UserRole, string> = {
    ENFERMERIA: 'Nursing',
    TECNICO_LAB: 'Laboratory Technician',
    FACULTATIVO_LAB: 'Laboratory Specialist',
    ADMINISTRADOR: 'Administrator',
  };
  return map[role];
}

export function translateSampleType(lang: Language, sampleType: SampleType): string {
  if (lang === 'es') return sampleType;
  const map: Record<SampleType, string> = {
    Arterial: 'Arterial',
    Venosa: 'Venous',
    Capilar: 'Capillary',
  };
  return map[sampleType] ?? sampleType;
}

export function translateValidationStatus(lang: Language, status: ResultValidationStatus): string {
  if (lang === 'es') {
    const map: Record<ResultValidationStatus, string> = {
      PENDIENTE: 'Pendiente',
      EN_REVISION: 'En revisión',
      VALIDADO: 'Validado',
      RECHAZADO: 'Muestra cancelada',
    };
    return map[status];
  }
  const map: Record<ResultValidationStatus, string> = {
    PENDIENTE: 'Pending',
    EN_REVISION: 'Under review',
    VALIDADO: 'Validated',
    RECHAZADO: 'Sample cancelled',
  };
  return map[status];
}

export function translateIdentificationStatus(
  lang: Language,
  status: IdentificationStatus | undefined
): string {
  if (!status) return lang === 'en' ? 'Identified' : 'Identificada';
  if (lang === 'es') {
    const map: Record<IdentificationStatus, string> = {
      PENDIENTE_IDENTIFICACION: 'PENDIENTE DE IDENTIFICACIÓN',
      IDENTIFICADA_PENDIENTE_LIS: 'Identificada (pendiente LIS)',
      IDENTIFICADA_TRANSMITIDA: 'Identificada y enviada a LIS',
    };
    return map[status];
  }
  const map: Record<IdentificationStatus, string> = {
    PENDIENTE_IDENTIFICACION: 'PENDING IDENTIFICATION',
    IDENTIFICADA_PENDIENTE_LIS: 'Identified (pending LIS)',
    IDENTIFICADA_TRANSMITIDA: 'Identified & sent to LIS',
  };
  return map[status];
}

export function translateAnalyzerStatus(lang: Language, status: AnalyzerStatus): string {
  if (lang === 'es') return status.replace(/_/g, ' ');
  const map: Record<AnalyzerStatus, string> = {
    OPERATIVO: 'OPERATIONAL',
    OPERATIVO_CON_ADVERTENCIAS: 'OPERATIONAL WITH WARNINGS',
    NO_DISPONIBLE: 'UNAVAILABLE',
    MANTENIMIENTO: 'MAINTENANCE',
  };
  return map[status];
}

export function translateCommStatus(lang: Language, status: CommunicationStatus): string {
  if (lang === 'es') return status;
  const map: Record<CommunicationStatus, string> = {
    CONECTADO: 'CONNECTED',
    DESCONECTADO: 'DISCONNECTED',
    SINCRONIZANDO: 'SYNCING',
  };
  return map[status];
}

export function translateConsumableStatus(
  lang: Language,
  status: ConsumableItem['status']
): string {
  if (lang === 'es') return status;
  const map: Record<ConsumableItem['status'], string> = {
    OK: 'OK',
    BAJO: 'LOW',
    AGOTADO: 'DEPLETED',
    CADUCADO: 'EXPIRED',
  };
  return map[status];
}

export function translateConsumableCategory(lang: Language, cat: ConsumableCategory): string {
  if (lang === 'es') return cat;
  const map: Record<ConsumableCategory, string> = {
    Cartucho: 'Cartridge',
    Reactivo: 'Reagent',
    Solución: 'Solution',
    Sensor: 'Sensor',
    Control: 'Control',
    Otro: 'Other',
  };
  return map[cat];
}

export function translateSeverity(lang: Language, sev: MaintenanceError['severity']): string {
  if (lang === 'es') return sev;
  const map: Record<MaintenanceError['severity'], string> = {
    Baja: 'Low',
    Media: 'Medium',
    Alta: 'High',
    Crítica: 'Critical',
  };
  return map[sev];
}

export function translateMaintenanceStatus(lang: Language, status: MaintenanceError['status']): string {
  if (lang === 'es') return status.replace(/_/g, ' ');
  const map: Record<MaintenanceError['status'], string> = {
    ACTIVA: 'ACTIVE',
    EN_REVISION: 'UNDER REVIEW',
    RESUELTA: 'RESOLVED',
  };
  return map[status];
}

export function translateCalibrationType(
  lang: Language,
  type: CalibrationRecord['type']
): string {
  if (lang === 'es') return type;
  const map: Record<CalibrationRecord['type'], string> = {
    'Calibración 1-Punto': '1-Point Calibration',
    'Calibración 2-Puntos': '2-Point Calibration',
    'Calibración Cooximetría': 'CO-oximetry Calibration',
    'Calibración Completa': 'Full Calibration',
  };
  return map[type] ?? type;
}

export function translateCalibrationStatus(lang: Language, status: CalibrationStatus): string {
  if (lang === 'es') return status;
  const map: Record<CalibrationStatus, string> = {
    CORRECTA: 'PASSED',
    FALLIDA: 'FAILED',
    PENDIENTE: 'PENDING',
    INTERRUMPIDA: 'INTERRUPTED',
  };
  return map[status];
}

export function translateAtellicaStatus(lang: Language, status: AtellicaMessageStatus): string {
  if (lang === 'es') return status;
  const map: Record<AtellicaMessageStatus, string> = {
    Recibido: 'Received',
    'Pendiente de lectura': 'Unread',
    Leído: 'Read',
    Confirmado: 'Confirmed',
    Respondido: 'Replied',
    Archivado: 'Archived',
  };
  return map[status];
}

export function translateAtellicaType(lang: Language, type: AtellicaMessageType): string {
  if (lang === 'es') return type;
  const map: Record<AtellicaMessageType, string> = {
    Información: 'Information',
    'Aviso operativo': 'Operational Notice',
    'Aviso de control de calidad': 'Quality Control Notice',
    'Incidencia técnica': 'Technical Incident',
    'Comunicación urgente': 'Urgent Communication',
    'Actualización de procedimientos': 'Procedure Update',
    'Aviso de mantenimiento': 'Maintenance Notice',
  };
  return map[type];
}

export function translateAtellicaPriority(lang: Language, priority: AtellicaMessagePriority): string {
  if (lang === 'es') return priority;
  const map: Record<AtellicaMessagePriority, string> = {
    Normal: 'Normal',
    Alta: 'High',
    Urgente: 'Urgent',
  };
  return map[priority];
}

export function translateParameterCategory(lang: Language, cat: ParameterCategory): string {
  if (lang === 'es') return cat;
  const map: Record<ParameterCategory, string> = {
    'Ácido-Base': 'Acid-Base',
    Electrolitos: 'Electrolytes',
    Metabolismo: 'Metabolism',
    'Hemoglobina y Cooximetría': 'Hemoglobin & CO-oximetry',
    Bilirrubina: 'Bilirubin',
    Calculados: 'Calculated',
  };
  return map[cat];
}

export function translateParameterLabel(lang: Language, key: ParameterKey, fallback: string): string {
  if (lang === 'es') return fallback;
  const map: Record<ParameterKey, string> = {
    pH: 'Blood pH',
    pCO2: 'CO2 Partial Pressure',
    pO2: 'O2 Partial Pressure',
    Na: 'Sodium',
    K: 'Potassium',
    Ca: 'Ionized Calcium',
    Cl: 'Chloride',
    Glu: 'Glucose',
    Lac: 'Lactate',
    ctHb: 'Total Hemoglobin',
    FO2Hb: 'Oxyhemoglobin Fraction',
    FCOHb: 'Carboxyhemoglobin',
    FMetHb: 'Methemoglobin',
    FHHb: 'Deoxyhemoglobin',
    nBili: 'Neonatal Bilirubin',
    HCO3: 'Actual Bicarbonate',
    BE: 'Base Excess (ecf)',
    sO2: 'Calculated O2 Saturation',
    TCO2: 'Total CO2',
    AnionGap: 'Anion Gap [Na+ - (Cl- + HCO3-)]',
    pO2FiO2: 'pO2 / FiO2 Ratio',
  };
  return map[key] ?? fallback;
}

export function translateParameterShortLabel(lang: Language, key: ParameterKey, fallback: string): string {
  if (lang === 'es') return fallback;
  const map: Partial<Record<ParameterKey, string>> = {
    Glu: 'Glucose',
    Lac: 'Lactate',
  };
  return map[key] ?? fallback;
}

export function translateParameterUnit(lang: Language, unit: string): string {
  if (lang === 'es') return unit;
  if (unit === 'uds pH') return 'pH units';
  return unit;
}

export function translateAbnormalityFlag(lang: Language, flag: AbnormalityFlag): string {
  if (lang === 'es') {
    const map: Record<AbnormalityFlag, string> = {
      NORMAL: 'Normal',
      LOW: 'Bajo',
      HIGH: 'Alto',
      CRITICAL_LOW: 'Crítico Bajo',
      CRITICAL_HIGH: 'Crítico Alto',
      ND: 'N/D',
    };
    return map[flag];
  }
  const map: Record<AbnormalityFlag, string> = {
    NORMAL: 'Normal',
    LOW: 'Low',
    HIGH: 'High',
    CRITICAL_LOW: 'Critical Low',
    CRITICAL_HIGH: 'Critical High',
    ND: 'N/A',
  };
  return map[flag];
}

export function translateClinicalScenario(lang: Language, scenario: ClinicalProfileScenario): string {
  if (lang === 'es') return scenario;
  const map: Record<ClinicalProfileScenario, string> = {
    Normal: 'Normal',
    'Acidosis metabólica': 'Metabolic acidosis',
    'Acidosis respiratoria': 'Respiratory acidosis',
    'Alcalosis metabólica': 'Metabolic alkalosis',
    'Alcalosis respiratoria': 'Respiratory alkalosis',
    'Trastorno mixto': 'Mixed disorder',
    Hipoxemia: 'Hypoxemia',
    Hiperlactatemia: 'Hyperlactatemia',
    'Alteración electrolítica': 'Electrolyte disturbance',
    'Alteración cooximetría': 'CO-oximetry abnormality',
  };
  return map[scenario];
}

export function translateWestgardDesc(lang: Language, rule: WestgardRule, esDesc: string): string {
  if (lang === 'es') return esDesc;
  const map: Record<WestgardRule, string> = {
    '1_2s': 'One control measurement exceeds ±2 SD from the assigned mean.',
    '1_3s': 'One control measurement exceeds ±3 SD (sensitive to random error).',
    '2_2s': 'Two consecutive controls exceed +2 SD or both fall below -2 SD (systematic error).',
    R_4s: 'Two consecutive controls differ by 4 SD or more (one >+2 SD and one <-2 SD).',
    '4_1s': 'Four consecutive controls on the same side exceed ±1 SD.',
    '10x': 'Ten consecutive controls fall on the same side of the mean.',
  };
  return map[rule];
}

const EXACT_TRANSLATIONS: Record<string, string> = {
  // General & Validation issues
  'Muestra Arterial con perfil compatible con Venosa': 'Arterial sample with profile compatible with Venous',
  'Muestra Venosa con perfil compatible con Arterial': 'Venous sample with profile compatible with Arterial',
  'Discrepancia ácido-base (Ecuación Henderson-Hasselbalch)': 'Acid-base discrepancy (Henderson-Hasselbalch equation)',
  'Inconsistencia entre HCO3- y CO2 total (TCO2)': 'Inconsistency between HCO3- and Total CO2 (TCO2)',
  'Suma anómala de fracciones de hemoglobina (Cooximetría)': 'Abnormal sum of hemoglobin fractions (CO-oximetry)',
  'Desequilibrio en el cálculo del Anion Gap': 'Discrepancy in Anion Gap calculation',
  'Resultado fuera de rango fisiológico probable': 'Result outside probable physiological range',
  'Posible error de etiquetado Arterial vs Venosa': 'Possible Arterial vs Venous labeling error',
  'Discrepancia entre sO2 calculada y FO2Hb medida': 'Discrepancy between calculated sO2 and measured FO2Hb',
  'Posible contaminación con aire o burbujas en la jeringa': 'Possible air contamination or bubbles in syringe',
  'Potasio crítico o riesgo de pseudo-hiperpotasemia preanalítica': 'Critical potassium or risk of preanalytical pseudo-hyperkalemia',
  'Demora preanalítica elevada sin refrigeración': 'High preanalytical delay without refrigeration',

  // Categories / Levels / Maintenance types
  'Informativa': 'Informative',
  'Advertencia': 'Warning',
  'Requiere revisión': 'Requires review',
  'Crítica': 'Critical',
  'Fisiológica': 'Physiological',
  'Analítica': 'Analytical',
  'Temporal (Delta)': 'Temporal (Delta)',
  'Preanalítica': 'Preanalytical',
  'Preventivo': 'Preventive',
  'Correctivo': 'Corrective',
  'Diagnóstico': 'Diagnostic',
  'Completado': 'Completed',
  'Pendiente': 'Pending',

  // Consumables & QC Levels
  'Cartucho de Medida RAPIDPoint 500e (750 tests)': 'RAPIDPoint 500e Measurement Cartridge (750 tests)',
  'Cartucho de Medida (750 tests)': 'Measurement Cartridge (750 tests)',
  'Cartucho de Lavado y Residuos (Wash/Waste)': 'Wash & Waste Cartridge',
  'Cartucho de Lavado / Desechos (Wash)': 'Wash / Waste Cartridge (Wash)',
  'Cartucho AQC Automático (Control Calidad)': 'Automatic AQC Cartridge (Quality Control)',
  'Cartucho AutoQC (Niveles 1, 2 y 3)': 'AutoQC Cartridge (Levels 1, 2 & 3)',
  'Solución de Desproteinización Enzimática': 'Enzymatic Deproteinizing Solution',
  'Módulo Sensor Óptico Cooximetría': 'CO-oximetry Optical Sensor Module',
  'Rollo Papel Impresora Térmica': 'Thermal Printer Paper Roll',
  'Nivel 1 (Acidótico)': 'Level 1 (Acidotic)',
  'Nivel 2 (Normal)': 'Level 2 (Normal)',
  'Nivel 3 (Alcalótico)': 'Level 3 (Alkalotic)',

  // Diagnostics & Components
  'Cámara de Medida y Bloque Térmico': 'Measurement Chamber & Thermal Block',
  'Módulo Óptico de Cooximetría': 'CO-oximetry Optical Module',
  'Bomba Peristáltica y Válvula Rotatoria': 'Peristaltic Pump & Rotary Valve',
  'Puerto de Aspiración y Detector de Coágulos': 'Sample Port & Clot Detector',
  'Enlace Bidirectional LIS / Atellica Connect': 'Bidirectional LIS / Atellica Connect Link',
  'Impresora Térmica Integrada': 'Integrated Thermal Printer',
  'Cámara termostatizada (37,0 °C)': 'Thermostatted chamber (37.0 °C)',
  'Control Térmico': 'Thermal Control',
  'Temperatura': 'Temperature',
  'Bomba peristáltica principal': 'Main peristaltic pump',
  'Fluídica': 'Fluidics',
  'Presión vacío': 'Vacuum pressure',
  'Bloque electrodos pH / Gases': 'pH / Blood Gas electrode block',
  'Potenciometría / Amperometría': 'Potentiometry / Amperometry',
  'Estabilidad': 'Stability',
  'Bloque electrodos ISE (Na/K/Ca/Cl)': 'ISE electrode block (Na/K/Ca/Cl)',
  'Electrolitos': 'Electrolytes',
  'Pendiente media': 'Mean slope',
  'Biosensores Glucosa / Lactato': 'Glucose / Lactate biosensors',
  'Enzimático': 'Enzymatic',
  'Corriente base': 'Baseline current',
  'Espectrofotómetro Cooximetría': 'CO-oximetry spectrophotometer',
  'Óptica': 'Optics',
  'Transmitancia LED': 'LED transmittance',
  'Lector código de barras integrado': 'Integrated barcode reader',
  'Periféricos': 'Peripherals',
  'Estado interfaz': 'Interface status',
  'Listo (HID)': 'Ready (HID)',
  'Enlace Middleware Atellica Connect': 'Atellica Connect Middleware Link',
  'Comunicaciones': 'Communications',
  'Protocolo HL7/POCT1-A': 'HL7/POCT1-A Protocol',
  'Simulado activo': 'Simulated active',
  '-275 mbar (bajo)': '-275 mbar (low)',
  'Puerto de entrada de muestras': 'Sample entry port',
  'Puerto de entrada de muestras y junta tórica': 'Sample entry port & O-ring',
  'Limpieza preventiva mensual, inspección de aguja de aspiración y sustitución de cartucho AutoQC.': 'Monthly preventive cleaning, aspiration needle inspection, and AutoQC cartridge replacement.',
  'Circuito fluídico de aspiración': 'Aspiration fluidic circuit',
  'Lavado enzimático tras alarma E-304 y comprobación de vacío de bomba peristáltica.': 'Enzymatic wash after alarm E-304 and peristaltic pump vacuum check.',

  // Calibrations
  'Sistema Automático': 'Automatic System',
  'Calibración programada periódica (cada 8 h)': 'Scheduled periodic calibration (every 8 h)',
  'Todos los sensores pH, pCO2, pO2, ISE, Glucosa, Lactato y módulo óptico dentro de pendiente nominal.': 'All pH, pCO2, pO2, ISE, Glucose, Lactate sensors and optical module within nominal slope.',
  'Verificación tras sustitución de solución de lavado': 'Verification after wash solution replacement',
  'Deriva cero < 0.4%. Estabilidad correcta.': 'Zero drift < 0.4%. Stability OK.',
  'Autochequeo óptico diario': 'Daily optical self-check',
  'Longitud de onda y absorbancia verificadas (470–680 nm).': 'Wavelength and absorbance verified (470–680 nm).',
  'Pendientes de electrodos, deriva cero y verificación óptica dentro de tolerancia.': 'Electrode slopes, zero drift, and optical verification within tolerance.',
  'Fallo de pendiente en electrodo pO2/pCO2 fuera de tolerancia. Requiere revisión técnica.': 'Out-of-tolerance slope failure in pO2/pCO2 electrode. Technical review required.',
  'Calibración programada pendiente de ejecución por el operador.': 'Scheduled calibration pending operator execution.',
  'Secuencia de calibración interrumpida antes de completar el lavado final.': 'Calibration sequence interrupted before completing final wash.',
  'Calibración aceptada desde acciones rápidas.': 'Calibration accepted from quick actions.',
  'Fallo Calibración. Se repite calibración.': 'Calibration failed. Repeating calibration.',
  'Acción rápida desde pantalla Listo': 'Quick action from Ready screen',
  'Simulación de fallo de pendiente en electrodo pO2': 'Simulated slope failure on pO2 electrode',
  'Restauración operativa del sistema': 'System operational recovery',
  'Todos los sensores recalibrados correctamente.': 'All sensors recalibrated successfully.',
  'Calibración 1-Punto': '1-Point Calibration',
  'Calibración 2-Puntos': '2-Point Calibration',
  'Calibración Cooximetría': 'CO-oximetry Calibration',
  'Calibración Completa': 'Full Calibration',

  // Maintenance Errors
  'Detección puntual de microcoágulo en puerto de aspiración durante muestra externa.': 'Isolated microclot detected in aspiration port during external sample.',
  'Homogeneización insuficiente o muestra parcialmente coagulada.': 'Insufficient mixing or partially clotted sample.',
  'Ciclo de lavado y calibración 1-punto superados correctamente.': 'Wash cycle and 1-point calibration passed successfully.',
  'Fallo de presión en cámara de medida durante lavado automático.': 'Pressure failure in measurement chamber during automatic wash.',
  'Depósito de fibrina en válvula rotatoria o fuga en junta del cartucho.': 'Fibrin deposit in rotary valve or leak in cartridge seal.',
  'Incidencia notificada manualmente por operador.': 'Incident manually reported by operator.',
  'Burbuja en solución calibradora, cartucho agotado o desgaste de sensor.': 'Bubble in calibrator solution, depleted cartridge, or sensor wear.',
  'Volumen aspirado inferior a 100 µL o presencia de burbuja de aire en punta de jeringa.': 'Aspirated volume below 100 µL or air bubble at syringe tip.',
  'Falta de homogeneización o jeringa sin anticoagulante heparina balanceada.': 'Insufficient mixing or syringe without balanced heparin anticoagulant.',
  'Obstrucción parcial de sonda o sellado deficiente contra el puerto luer.': 'Partial probe obstruction or poor seal against luer port.',
  'Inestabilidad transitoria de electrodo o interferencia química severa.': 'Transient electrode instability or severe chemical interference.',
  'Resuelto mediante restauración operativa de demostración.': 'Resolved via demo operational recovery.',

  // Interpretation phrases (legacy + interpretationEngine)
  'Equilibrio ácido-base dentro de límites fisiológicos': 'Acid-base balance within physiological limits',
  'Equilibrio ácido-base dentro de parámetros de referencia.': 'Acid-base balance within reference parameters.',
  'Sin necesidad de respuesta compensatoria significativa.': 'No significant compensatory response required.',
  'No se detectan signos claros de trastorno mixto.': 'No clear signs of mixed disorder detected.',
  'Acidosis metabólica': 'Metabolic acidosis',
  'Acidosis respiratoria': 'Respiratory acidosis',
  'Alcalosis metabólica': 'Metabolic alkalosis',
  'Alcalosis respiratoria': 'Respiratory alkalosis',
  'Trastorno ácido-base complejo o no tipificado': 'Complex or unclassified acid-base disorder',
  'Trastorno metabólico combinado / pendiente de correlación clínica': 'Combined metabolic disorder / pending clinical correlation',
  'No se requiere compensación al estar pH y pCO2 en rango.': 'No compensation required as pH and pCO2 are within range.',
  'No aplicable': 'Not applicable',
  'Sin evidencia de trastorno mixto evidente.': 'No obvious evidence of mixed disorder.',
  'Trastorno mixto probable (pH, pCO2 y HCO3- no siguen compensación única).': 'Probable mixed disorder (pH, pCO2, and HCO3- do not follow single compensation).',
  'Posible trastorno mixto asociado a acidosis metabólica.': 'Possible mixed disorder associated with metabolic acidosis.',
  'Posible trastorno mixto asociado a alcalosis metabólica.': 'Possible mixed disorder associated with metabolic alkalosis.',
  'Posible componente mixto respiratorio/metabólico concomitante.': 'Possible concomitant mixed respiratory/metabolic component.',
  'Valoración no determinante; correlacionar con situación respiratoria.': 'Inconclusive assessment; correlate with respiratory status.',
  'Valoración clínica e instrumental obligatoria por el médico responsable. Esta interpretación automática es orientativa y no sustituye el diagnóstico médico.': 'Clinical evaluation by the attending physician is mandatory. This automated interpretation is orientative and does not replace medical diagnosis.',
  'Esta interpretación automática es exclusivamente orientativa y depende de la calidad preanalítica de la muestra y del tipo declarado.': 'This automated interpretation is strictly orientative and depends on sample preanalytical quality and declared sample type.',
  'Muestra declarada como venosa: pO2 y sO2 reflejan extracción tisular, no oxigenación arterial.': 'Sample declared as venous: pO2 and sO2 reflect tissue extraction, not arterial oxygenation.',
  'Muestra declarada como capilar: puede subestimar ligeramente la PaO2 arterial en hipoperfusión periférica.': 'Sample declared as capillary: may slightly underestimate arterial PaO2 in peripheral hypoperfusion.',
  'No se ha registrado la FiO2 administrada; no es posible calcular el cociente PaO2/FiO2 ni el gradiente alveolo-arterial con precisión.': 'Administered FiO2 not recorded; PaO2/FiO2 ratio and alveolar-arterial gradient cannot be accurately calculated.',
  'Temperatura corporal no introducida (se asume 37,0 °C estándar para gases sanguíneos).': 'Body temperature not entered (standard 37.0 °C assumed for blood gases).',
  'Datos ácido-base insuficientes para emitir una orientación completa.': 'Insufficient acid-base data to provide a complete orientation.',
  'No calculable por ausencia de pH, pCO2 o HCO3-.': 'Not calculable due to missing pH, pCO2, or HCO3-.',
  'No evaluable con parámetros incompletos.': 'Not evaluable with incomplete parameters.',
  'Repita la determinación o revise los sensores no disponibles.': 'Repeat determination or inspect unavailable sensors.',
  'Determinación incompleta. No se formulan conclusiones ácido-base sin los parámetros primarios.': 'Incomplete determination. No acid-base conclusions are drawn without primary parameters.',
  'Interpretación orientativa generada por software de simulación. No constituye un diagnóstico médico.': 'Orientative interpretation generated by simulation software. Does not constitute a medical diagnosis.',
  'Orientación fisiopatológica automática (simulación). No sustituye el criterio clínico ni constituye diagnóstico médico.': 'Automated pathophysiological orientation (simulation). Does not replace clinical judgment or constitute a medical diagnosis.',
  'Acidosis mixta (componente metabólico y respiratorio simultáneos).': 'Mixed acidosis (simultaneous metabolic and respiratory components).',
  'Coexisten hipercapnia (pCO2 elevada) e hipobicarbonatemia (HCO3- descendido), impidiendo una compensación eficaz.': 'Hypercapnia (elevated pCO2) and low bicarbonate (decreased HCO3-) coexist, preventing effective compensation.',
  'Trastorno mixto confirmado: acidosis metabólica + acidosis respiratoria concomitante.': 'Confirmed mixed disorder: metabolic acidosis + concomitant respiratory acidosis.',
  'pCO2 superior a la esperada por Winter: sugiere acidosis respiratoria asociada (compensación insuficiente).': 'pCO2 higher than expected by Winter formula: suggests associated respiratory acidosis (insufficient compensation).',
  'pCO2 inferior a la esperada por Winter: sugiere alcalosis respiratoria sobreañadida.': 'pCO2 lower than expected by Winter formula: suggests superimposed respiratory alkalosis.',
  'Compensación respiratoria adecuada según fórmula de Winter; no sugiere trastorno mixto.': 'Adequate respiratory compensation per Winter formula; does not suggest mixed disorder.',
  'Patrón compatible con acidosis respiratoria primaria (hipercapnia).': 'Pattern compatible with primary respiratory acidosis (hypercapnia).',
  'HCO3- inferior al esperado en fase aguda: posible acidosis metabólica asociada.': 'HCO3- lower than expected in acute phase: possible associated metabolic acidosis.',
  'HCO3- superior al esperado incluso en fase crónica: valorar alcalosis metabólica asociada.': 'HCO3- higher than expected even in chronic phase: evaluate associated metabolic alkalosis.',
  'Compatible con acidosis respiratoria crónica o parcialmente compensada.': 'Compatible with chronic or partially compensated respiratory acidosis.',
  'Compatible con acidosis respiratoria aguda sin trastorno mixto evidente.': 'Compatible with acute respiratory acidosis without obvious mixed disorder.',
  'Acidemia leve con parámetros primarios limítrofes.': 'Mild acidemia with borderline primary parameters.',
  'Alcalosis mixta (respiratoria y metabólica simultáneas).': 'Mixed alkalosis (simultaneous respiratory and metabolic).',
  'Coexisten hipocapnia y elevación de bicarbonato sin compensación contrarreguladora.': 'Hypocapnia and elevated bicarbonate coexist without counter-regulatory compensation.',
  'Trastorno mixto confirmado: alcalosis metabólica + alcalosis respiratoria.': 'Confirmed mixed disorder: metabolic alkalosis + respiratory alkalosis.',
  'Patrón compatible con alcalosis metabólica primaria.': 'Pattern compatible with primary metabolic alkalosis.',
  'pCO2 inferior a la esperada: posible alcalosis respiratoria concomitante.': 'pCO2 lower than expected: possible concomitant respiratory alkalosis.',
  'pCO2 superior a la esperada: posible acidosis respiratoria asociada.': 'pCO2 higher than expected: possible associated respiratory acidosis.',
  'Compensación respiratoria coherente con alcalosis metabólica pura.': 'Respiratory compensation consistent with pure metabolic alkalosis.',
  'Patrón compatible con alcalosis respiratoria primaria (hipocapnia).': 'Pattern compatible with primary respiratory alkalosis (hypocapnia).',
  'HCO3- elevado respecto al esperado: sugiere alcalosis metabólica sobreañadida.': 'Elevated HCO3- relative to expected: suggests superimposed metabolic alkalosis.',
  'HCO3- más bajo de lo esperado: valorar acidosis metabólica asociada.': 'HCO3- lower than expected: evaluate associated metabolic acidosis.',
  'Compatible con alcalosis respiratoria compensada acorde a evolución.': 'Compatible with compensated respiratory alkalosis consistent with progression.',
  'Alcalemia leve con pCO2 y HCO3- en rango limítrofe.': 'Mild alkalemia with pCO2 and HCO3- in borderline range.',
  'pH en rango de referencia con elevación simultánea de pCO2 y HCO3-.': 'pH within reference range with simultaneous elevation of pCO2 and HCO3-.',
  'Equilibrio compensado o trastorno mixto equilibrado (acidosis respiratoria crónica compensada o acidosis respiratoria + alcalosis metabólica).': 'Compensated balance or balanced mixed disorder (compensated chronic respiratory acidosis or respiratory acidosis + metabolic alkalosis).',
  'Posible trastorno mixto compensado; requiere correlación clínica para diferenciar compensación crónica de trastorno doble.': 'Possible compensated mixed disorder; requires clinical correlation to distinguish chronic compensation from dual disorder.',
  'pH en rango de referencia con descenso simultáneo de pCO2 y HCO3-.': 'pH within reference range with simultaneous decrease of pCO2 and HCO3-.',
  'Compensación estrecha entre hipocapnia e hipobicarbonatemia.': 'Close compensation between hypocapnia and low bicarbonate.',
  'Valorar acidosis metabólica + alcalosis respiratoria coexistentes o alcalosis respiratoria crónica compensada.': 'Evaluate coexisting metabolic acidosis + respiratory alkalosis or compensated chronic respiratory alkalosis.',
  'pH normal con Anion Gap elevado.': 'Normal pH with elevated Anion Gap.',
  'Un Anion Gap elevado con pH y HCO3- normales puede ocultar una acidosis metabólica con alcalosis metabólica simultánea.': 'An elevated Anion Gap with normal pH and HCO3- may mask simultaneous metabolic acidosis and metabolic alkalosis.',
  'Electrolitos, metabolismo, lactato y fracciones de cooximetría sin hallazgos patológicos destacables.': 'Electrolytes, metabolism, lactate, and CO-oximetry fractions without notable pathological findings.',

  // QC / Lab statuses
  'CONFORME': 'COMPLIANT',
  'ADVERTENCIA': 'WARNING',
  'NO_CONFORME': 'NON-COMPLIANT',
  'BLOQUEADO': 'BLOCKED',
  'ABIERTA': 'OPEN',
  'EN_INVESTIGACION': 'INVESTIGATING',
  'RESUELTA': 'RESOLVED',

  // Atellica messages
  'Cambio preventivo de cartucho de medida (Fin de semana)': 'Preventive measurement cartridge change (Weekend)',
  'Por favor, antes de finalizar el turno revisen la caducidad del cartucho de medida y procedan a su sustitución si procede.': 'Before the end of your shift, please check the measurement cartridge expiry date and replace it if needed.',
  'Coordinación POCT · Atellica Connect': 'POCT Coordination · Atellica Connect',
  'Confirmado por middleware (simulado)': 'Confirmed by middleware (simulated)',
  'Enviado (simulado)': 'Sent (simulated)',
  'Revisión E-304 completada': 'E-304 review completed',
  'Se ejecutó lavado enzimático y verificación de sonda en RP500e-01 tras microcoágulo.': 'Enzymatic wash and probe check performed on RP500e-01 after microclot.',
  'Verificación de Control de Calidad Nivel 2': 'Level 2 Quality Control Verification',
  'Se solicita verificar el estado del control de calidad nivel 2 antes de continuar con la actividad analítica.': 'Please verify Level 2 quality control status before continuing analytical activity.',
  'Revisión de consumibles en RP500e-01': 'Consumables review on RP500e-01',
  'Recordatorio: incidencia registrada en el analizador RP500e-01. Revisar estado de consumibles.': 'Reminder: incident logged on analyzer RP500e-01. Review consumables status.',
  'Actualización de Procedimiento Operativo (POE-POCT-04)': 'Standard Operating Procedure Update (POE-POCT-04)',
  'Se ha actualizado el procedimiento operativo de utilización del gasómetro.': 'The blood gas analyzer operating procedure has been updated.',
  'Revisión de muestras insuficientes': 'Insufficient samples review',
  'El Laboratorio solicita revisar las incidencias relacionadas con muestras insuficientes.': 'Laboratory requests reviewing incidents related to insufficient samples.',
  'Solicitud urgente de verificación POCT': 'Urgent POCT verification request',
  'Atellica Connect solicita revisar los avisos de calidad pendientes en RP500e-01 antes del cambio de turno.': 'Atellica Connect requests reviewing pending quality notices on RP500e-01 before shift handover.',
  'Notificación de demostración desde RP500e-01': 'Demo notification from RP500e-01',
  'Comunicación de prueba enviada desde el Centro de Simulación hacia Atellica Connect.': 'Test communication sent from the Simulation Center to Atellica Connect.',
  'Aviso urgente de Control POCT': 'Urgent POCT Control Notice',
  'Por favor, verifique el nivel de cartucho de lavado y confirme lectura desde el panel clínico.': 'Please check the wash cartridge level and confirm read acknowledgment from the clinical panel.',
  'Atellica Connect · Coordinación POCT': 'Atellica Connect · POCT Coordination',
  'Mensaje Programado de Demostración': 'Scheduled Demo Message',
  'Aviso automático programado desde el simulador de Atellica Connect para verificar alertas de lectura.': 'Automatic notice scheduled from the Atellica Connect simulator to verify read alerts.',
  'Atellica Connect · Programador Demo': 'Atellica Connect · Demo Scheduler',
  'Atellica Connect · Supervisión POCT': 'Atellica Connect · POCT Supervision',
  'Atellica Connect · Gestión Técnica': 'Atellica Connect · Technical Management',
  'Coordinación de Calidad POCT': 'POCT Quality Coordination',
  'Laboratorio Central · Bioquímica Urgencias': 'Central Laboratory · Emergency Biochemistry',
  'Atellica Connect · Middleware Central': 'Atellica Connect · Central Middleware',
  'Middleware Atellica Connect': 'Atellica Connect Middleware',

  // Departments & Locations
  'UCI Polivalente': 'Polyvalent ICU',
  'Urgencias Generales': 'General Emergency',
  'Laboratorio de Urgencias': 'Emergency Laboratory',
  'Bioquímica Clínica / POCT': 'Clinical Biochemistry / POCT',
  'Coordinación POCT e Informática': 'POCT Coordination & IT',
  'Acceso Libre · POCT': 'Open Access · POCT',
  'Pendiente de asignar': 'Pending assignment',

  // Toasts & Audit Actions & System Messages
  'Acción denegada': 'Action denied',
  'Lectura confirmada': 'Read confirmed',
  'Aviso de Atellica Connect registrado en auditoría.': 'Atellica Connect notice logged in audit trail.',
  'Solo disponible en Modo Clínico': 'Only available in Clinical Mode',
  'La opción sin identificar solo está disponible para Modo Clínico.': 'Anonymous access is only available in Clinical Mode.',
  'Acceso restringido': 'Restricted access',
  'El perfil Enfermería solo está autorizado para Modo Clínico.': 'Nursing profile is only authorized for Clinical Mode.',
  'Transmisión bloqueada': 'Transmission blocked',
  'No se pueden enviar resultados al LIS mientras estén pendientes de identificación.': 'Results cannot be sent to LIS while pending identification.',
  'Enviado a LIS': 'Sent to LIS',
  'Identificación guardada': 'Identification saved',
  'Identificación corregida': 'Identification updated',
  'Corrección de identificación': 'Identification correction',
  'Identificación posterior completada': 'Deferred identification completed',
  'Transmisión a LIS completada': 'LIS transmission completed',
  'Confirmación de alerta crítica': 'Critical alert confirmation',
  'Muestra cancelada': 'Sample cancelled',
  'Alerta crítica confirmada': 'Critical alert confirmed',
  'Registro trazado en auditoría.': 'Record traced in audit log.',
  'Incidencia registrada': 'Incident recorded',
  'Registro de incidencia': 'Incident log',
  'Regla 1_2s detectada.': '1_2s rule detected.',
  'Dentro de criterios Westgard.': 'Within Westgard criteria.',
  'Se ha registrado una no conformidad (medición de muestras activa).': 'A non-conformity was logged (sample testing remains active).',
  'Desviación Westgard detectada (parámetro marcado en amarillo).': 'Westgard deviation detected (parameter highlighted in yellow).',
  'Control automático conforme.': 'Automatic control passed.',
  'Nivel de control creado': 'Control level created',
  'Nuevo nivel de control': 'New control level',
  'Actualización de lote QC': 'QC lot update',
  'Actualización no conformidad QC': 'QC non-conformity update',
  'Bloqueo de determinaciones por QC': 'Determinations blocked by QC',
  'Desbloqueo de determinaciones por QC': 'QC block lifted',
  'Determinaciones bloqueadas por QC': 'Determinations blocked by QC',
  'Bloqueo QC levantado': 'QC block lifted',
  'Lote actualizado': 'Lot updated',
  'No conformidad actualizada': 'Non-conformity updated',
  'Consumible sustituido': 'Consumable replaced',
  'Sustitución de consumible': 'Consumable replacement',
  'Actualización estado consumible': 'Consumable status update',
  'Incidencia resuelta': 'Incident resolved',
  'Resolución de alarma/error': 'Alarm/error resolution',
  'Intervención registrada': 'Intervention recorded',
  'Diagnóstico completo de componentes': 'Full component diagnostics',
  'Detectada advertencia de vacío en bomba peristáltica.': 'Vacuum warning detected in peristaltic pump.',
  'Todos los subsistemas verificados OK.': 'All subsystems verified OK.',
  'Diagnóstico con advertencias': 'Diagnostics with warnings',
  'Diagnóstico superado (8/8 OK)': 'Diagnostics passed (8/8 OK)',
  'Equipo en MANTENIMIENTO': 'Analyzer in MAINTENANCE',
  'Modo mantenimiento finalizado': 'Maintenance mode finished',
  'Activación modo mantenimiento': 'Maintenance mode activated',
  'Salida de modo mantenimiento': 'Exited maintenance mode',
  'Lectura de mensaje Atellica': 'Atellica message read',
  'Confirmación de recepción Atellica': 'Atellica reception confirmed',
  'Mensaje archivado': 'Message archived',
  'Recepción simulada Atellica Connect': 'Simulated Atellica Connect reception',
  'Simulación de mensaje Atellica': 'Atellica message simulation',
  'Nuevo mensaje de Atellica Connect': 'New Atellica Connect message',
  'Mensaje recibido de Atellica Connect': 'Message received from Atellica Connect',
  'Recepción confirmada': 'Reception confirmed',
  'Mensaje enviado (simulado)': 'Message sent (simulated)',
  'Configuración guardada': 'Configuration saved',
  'Actualización de configuración analítica': 'Analytical configuration update',
  'Usuario creado': 'User created',
  'Alta de usuario': 'User created',
  'Modificación de usuario': 'User modified',
  'Perfil de usuario actualizado': 'User profile updated',
  'El identificador de usuario ya existe.': 'Username already exists.',
  'Estado operativo restaurado': 'Operational state restored',
  'Restauración de estado operativo': 'Operational state recovery',
  'Equipo restaurado a estado OPERATIVO nominal.': 'Analyzer restored to nominal OPERATIONAL status.',
  'Analizador en estado OPERATIVO.': 'Analyzer in OPERATIONAL status.',
  'Datos de demostración restaurados': 'Demo data restored',
  'Base de datos reinicializada.': 'Database reinitialized.',
  'Exportación CSV generada': 'CSV export generated',
  'Mensaje programado (3 segundos)': 'Scheduled message (3 seconds)',
  'El middleware simulará una recepción en breve.': 'Middleware will simulate an incoming message shortly.',
  'Medición rápida completada': 'Quick measurement completed',
  'Medición rápida guardada': 'Quick measurement saved',
  'Medición rápida (Pendiente de identificación)': 'Quick measurement (Pending identification)',
  'Medición rápida registrada como PENDIENTE DE IDENTIFICACIÓN.': 'Quick measurement saved as PENDING IDENTIFICATION.',
  'Gasometría completada': 'Blood gas completed',
  'Nueva gasometría': 'New blood gas',
  'Resultado Crítico Detectado': 'Critical Result Detected',
  'Avisos de Validación': 'Validation Warnings',
  'Impresión térmica completada': 'Thermal print completed',
  'Inicio de sesión': 'User login',
  'Cierre de sesión': 'User logout',
  'Acceso sin identificación': 'Anonymous login',
  'Acceso directo sin identificación con derechos de Administrador.': 'Direct login without authentication with Administrator rights.',
  'Confirmación lectura aviso Atellica al login': 'Atellica login notice read confirmed',
  'Confirmada lectura de aviso: "Antes de iros cambiar el cartucho M, caduca este fin de semana".': 'Read confirmed for notice: "Change cartridge M before leaving, it expires this weekend".',
  'Acceso a Modo Laboratorio denegado': 'Laboratory Mode access denied',
  'Intento de acceso a Modo Laboratorio sin identificación de operador.': 'Attempted Laboratory Mode access without operator identification.',
  'Selección de entorno': 'Environment selection',
  'Cambio a Modo Clínico.': 'Switched to Clinical Mode.',
  'Cambio a Modo Laboratorio.': 'Switched to Laboratory Mode.',
  'Acción bloqueada por permisos': 'Action blocked by permissions',
  'Equipo en modo MANTENIMIENTO. No se permiten determinaciones.': 'Analyzer in MAINTENANCE mode. Determinations are disabled.',
  'Analizador NO DISPONIBLE (incidencia crítica o consumible agotado).': 'Analyzer UNAVAILABLE (critical incident or depleted consumable).',
};

const PATTERN_REPLACEMENTS: [RegExp, string][] = [
  [/^Delta Check significativo en (.+)$/, 'Significant Delta Check on $1'],
  [/^Muestra declarada como Arterial pero presenta valores bajos \(/, 'Sample declared as Arterial but shows low values ('],
  [/^Muestra declarada como Venosa pero presenta oxigenación compatible con Arterial \(/, 'Sample declared as Venous but shows oxygenation compatible with Arterial ('],
  [/^pH medido \(([^)]+)\) frente a calculado por H-H \(([^)]+)\): diferencia = ([^.]+)\.$/, 'Measured pH ($1) vs Henderson-Hasselbalch calculated ($2): difference = $3.'],
  [/^pH medido \(([^)]+)\) respecto a teórico H-H \(([^)]+)\)\.$/, 'Measured pH ($1) vs theoretical H-H ($2).'],
  [/^El CO2 total calculado \(([^)]+)\) difiere de HCO3- \(([^)]+)\) más CO2 disuelto \(([^)]+)\)\.$/, 'Calculated total CO2 ($1) differs from HCO3- ($2) plus dissolved CO2 ($3).'],
  [/^La suma de FO2Hb \+ FCOHb \+ FMetHb \+ FHHb es ([^%]+)%, fuera del rango esperado \(([^)]+)%\)\.$/, 'Sum of FO2Hb + FCOHb + FMetHb + FHHb is $1%, outside expected range ($2%).'],
  [/^Anion Gap \(([^)]+)\) difiere de \[Na\+ - \(Cl- \+ HCO3-\)\] \(([^)]+)\)\.$/, 'Anion Gap ($1) differs from [Na+ - (Cl- + HCO3-)] ($2).'],
  [/^Muestra declarada como arterial con pO2 \(([^)]+)\) y sO2 \(([^)]+)\) compatibles con sangre venosa\.$/, 'Sample declared as arterial with pO2 ($1) and sO2 ($2) compatible with venous blood.'],
  [/^Potasio = ([^ ]+) mmol\/L$/, 'Potassium = $1 mmol/L'],
  [/^Demora declarada: (\d+) minutos desde la extracción\.$/, 'Declared delay: $1 minutes since collection.'],
  [/^Valor actual ([^ ]+) vs previo ([^ ]+) \(Δ = ([^,]+), límite ±([^)]+)\)\.$/, 'Current value $1 vs prior $2 (Δ = $3, limit ±$4).'],
  [/^No hay incoherencias analíticas\. Compensación estimada \((\w+)\): (.+)$/, 'No analytical inconsistencies. Estimated compensation ($1): $2'],
  [/^Compensación esperada según criterio fisiológico \((\w+)\): (.+)$/, 'Expected compensation per physiological criteria ($1): $2'],
  [/^Muestra (venosa|capilar): la evaluación de oxigenación \(pO2\/sO2\) no es equivalente a la sangre arterial para valorar insuficiencia respiratoria\.$/, 'Sample ($1): oxygenation assessment (pO2/sO2) is not equivalent to arterial blood for evaluating respiratory failure.'],
  [/^Patrón compatible con acidosis metabólica primaria(.*)$/, 'Pattern compatible with primary metabolic acidosis$1'],
  [/^Fórmula de Winter: pCO2 esperada entre ([^ ]+) y ([^ ]+) mmHg \(observada: ([^ ]+) mmHg\)\.$/, 'Winter formula: expected pCO2 between $1 and $2 mmHg (observed: $3 mmHg).'],
  [/^Compensación metabólica esperada: HCO3- ~([^ ]+) mmol\/L en fase aguda o ~([^ ]+) mmol\/L en fase crónica \(observado: ([^ ]+) mmol\/L\)\.$/, 'Expected metabolic compensation: HCO3- ~$1 mmol/L (acute) or ~$2 mmol/L (chronic) (observed: $3 mmol/L).'],
  [/^Compensación respiratoria esperada: pCO2 ~([^ ]+) – ([^ ]+) mmHg \(observada: ([^ ]+) mmHg\)\.$/, 'Expected respiratory compensation: pCO2 ~$1 – $2 mmHg (observed: $3 mmHg).'],
  [/^Descenso compensatorio esperado de HCO3-: ~([^ ]+) mmol\/L \(aguda\) o ~([^ ]+) mmol\/L \(crónica\) vs observado ([^ ]+) mmol\/L\.$/, 'Expected compensatory HCO3- decrease: ~$1 mmol/L (acute) or ~$2 mmol/L (chronic) vs observed $3 mmol/L.'],
  [/^Hipoxemia grave arterial \(pO2 ([^ ]+) mmHg, sO2 ([^%]+)%\)\.$/, 'Severe arterial hypoxemia (pO2 $1 mmHg, sO2 $2%).'],
  [/^Hipoxemia moderada arterial \(pO2 ([^ ]+) mmHg\)\.$/, 'Moderate arterial hypoxemia (pO2 $1 mmHg).'],
  [/^Hipoxemia leve arterial \(pO2 ([^ ]+) mmHg\)\.$/, 'Mild arterial hypoxemia (pO2 $1 mmHg).'],
  [/^Hiperoxemia arterial \(pO2 ([^ ]+) mmHg\) — valorar ajuste de FiO2 si procede\.$/, 'Arterial hyperoxemia (pO2 $1 mmHg) — consider FiO2 adjustment if appropriate.'],
  [/^Cociente PaO2\/FiO2 severamente comprometido \((\d+) mmHg\)\.$/, 'Severely impaired PaO2/FiO2 ratio ($1 mmHg).'],
  [/^Cociente PaO2\/FiO2 moderadamente alterado \((\d+) mmHg\)\.$/, 'Moderately impaired PaO2/FiO2 ratio ($1 mmHg).'],
  [/^Cociente PaO2\/FiO2 levemente descendido \((\d+) mmHg\)\.$/, 'Mildly reduced PaO2/FiO2 ratio ($1 mmHg).'],
  [/^Hiperlactatemia grave \(([^)]+) mmol\/L\) compatible con hipoperfusión tisular o acidosis láctica\.$/, 'Severe hyperlactatemia ($1 mmol/L) compatible with tissue hypoperfusion or lactic acidosis.'],
  [/^Hiperlactatemia moderada \(([^)]+) mmol\/L\)\.$/, 'Moderate hyperlactatemia ($1 mmol/L).'],
  [/^Hiperpotasemia crítica \(([^)]+) mmol\/L\)\.$/, 'Critical hyperkalemia ($1 mmol/L).'],
  [/^Hiperpotasemia \(([^)]+) mmol\/L\)\.$/, 'Hyperkalemia ($1 mmol/L).'],
  [/^Hipopotasemia crítica \(([^)]+) mmol\/L\)\.$/, 'Critical hypokalemia ($1 mmol/L).'],
  [/^Hipopotasemia \(([^)]+) mmol\/L\)\.$/, 'Hypokalemia ($1 mmol/L).'],
  [/^Hiponatremia significativa \(([^)]+) mmol\/L\)\.$/, 'Significant hyponatremia ($1 mmol/L).'],
  [/^Hipernatremia significativa \(([^)]+) mmol\/L\)\.$/, 'Significant hypernatremia ($1 mmol/L).'],
  [/^Hipocalcemia iónica \(([^)]+) mmol\/L\)\.$/, 'Ionized hypocalcemia ($1 mmol/L).'],
  [/^Hipercalcemia iónica \(([^)]+) mmol\/L\)\.$/, 'Ionized hypercalcemia ($1 mmol/L).'],
  [/^Hipercloremia \(([^)]+) mmol\/L\)\.$/, 'Hyperchloremia ($1 mmol/L).'],
  [/^Hipocloremia \(([^)]+) mmol\/L\)\.$/, 'Hypochloremia ($1 mmol/L).'],
  [/^Hipoglucemia relevante \(([^)]+) mg\/dL\)\.$/, 'Relevant hypoglycemia ($1 mg/dL).'],
  [/^Hiperglucemia marcada \(([^)]+) mg\/dL\)\.$/, 'Marked hyperglycemia ($1 mg/dL).'],
  [/^Descenso relevante de hemoglobina total \(ctHb ([^ ]+) g\/dL\)\.$/, 'Relevant drop in total hemoglobin (ctHb $1 g/dL).'],
  [/^Elevación de carboxihemoglobina \(FCOHb ([^%]+)%\): valorar exposición a monóxido de carbono o tabaquismo intenso\.$/, 'Elevated carboxyhemoglobin (FCOHb $1%): evaluate carbon monoxide exposure or heavy smoking.'],
  [/^Metahemoglobinemia elevada \(FMetHb ([^%]+)%\): reduce la capacidad de transporte efectivo de oxígeno \(FO2Hb ([^%]+)%\)\.$/, 'Elevated methemoglobinemia (FMetHb $1%): reduces effective oxygen transport capacity (FO2Hb $2%).'],
  [/^Exceso de bases ([^ ]+) mmol\/L confirma componente metabólico relevante\.$/, 'Base excess $1 mmol/L confirms relevant metabolic component.'],
  [/^Lactato elevado \(([^)]+) mmol\/L\): sospecha de hipoperfusión tisular o acidosis láctica\.$/, 'Elevated lactate ($1 mmol/L): suspect tissue hypoperfusion or lactic acidosis.'],
  [/^Hipoxemia severa \(PaO2 ([^ ]+) mmHg\)\.$/, 'Severe hypoxemia (PaO2 $1 mmHg).'],
  [/^PaO2\/FiO2 reducido \(([^)]+)\), compatible con deterioro del intercambio gaseoso\.$/, 'Reduced PaO2/FiO2 ($1), compatible with impaired gas exchange.'],
  [/^Dishemoglobinemia significativa \(FCOHb ([^%]+)%, FMetHb ([^%]+)%\)\.$/, 'Significant dyshemoglobinemia (FCOHb $1%, FMetHb $2%).'],
  [/^Anemia marcada \(ctHb ([^ ]+) g\/dL\)\.$/, 'Marked anemia (ctHb $1 g/dL).'],
  [/^Alteración electrolítica destacada \(Na\+ ([^,]+), K\+ ([^)]+)\)\.$/, 'Marked electrolyte disturbance (Na+ $1, K+ $2).'],
  [/^Hipoglucemia clínica \(([^)]+) mg\/dL\)\.$/, 'Clinical hypoglycemia ($1 mg/dL).'],
  [/^Hiperglucemia marcada \(([^)]+) mg\/dL\)\.$/, 'Marked hyperglycemia ($1 mg/dL).'],
  [/^Tendencia ascendente continua detectada \(posible deriva progresiva del sensor\)\.$/, 'Continuous upward trend detected (possible progressive sensor drift).'],
  [/^Tendencia descendente continua detectada \(posible deriva progresiva del sensor\)\.$/, 'Continuous downward trend detected (possible progressive sensor drift).'],
  [/^Desplazamiento positivo sostenido sobre \+0,5 DE\.$/, 'Sustained positive shift above +0.5 SD.'],
  [/^Desplazamiento negativo sostenido bajo -0,5 DE\.$/, 'Sustained negative shift below -0.5 SD.'],
  [/^Regla 1_3s: valor fuera de ±3 DE \(([^)]+) DE\)\. Error aleatorio o sistemático severo\.$/, 'Rule 1_3s: value outside ±3 SD ($1 SD). Severe random or systematic error.'],
  [/^Regla 1_2s \(Advertencia\): valor excede ±2 DE \(([^)]+) DE\)\. Vigilar tendencia\.$/, 'Rule 1_2s (Warning): value exceeds ±2 SD ($1 SD). Monitor trend.'],
  [/^Regla 2_2s: dos controles consecutivos superan ±2 DE en el mismo sentido \(([^,]+), ([^ ]+) DE\)\. Error sistemático\.$/, 'Rule 2_2s: two consecutive controls exceed ±2 SD on the same side ($1, $2 SD). Systematic error.'],
  [/^Regla R_4s: diferencia de ([^ ]+) DE entre dos controles consecutivos\. Error aleatorio\.$/, 'Rule R_4s: difference of $1 SD between two consecutive controls. Random error.'],
  [/^Regla 4_1s: cuatro determinaciones consecutivas del mismo lado más allá de ±1 DE \(desplazamiento sistemático\)\.$/, 'Rule 4_1s: four consecutive measurements on the same side beyond ±1 SD (systematic shift).'],
  [/^Regla 10x: diez controles consecutivos al mismo lado de la media \(sesgo sostenido\)\.$/, 'Rule 10x: ten consecutive controls on the same side of the mean (sustained bias).'],
  [/^El perfil (\w+) no tiene permiso para (.+)\.$/, 'Profile $1 lacks permission to $2.'],
  [/^Resultado (.+) transmitido correctamente\.$/, 'Result $1 transmitted successfully.'],
  [/^(.+) asociada a (.+) \(lista para imprimir y enviar a LIS\)\.$/, '$1 linked to $2 (ready to print and send to LIS).'],
  [/^ID único (.+) guardado como PENDIENTE DE IDENTIFICACIÓN\.$/, 'Unique ID $1 saved as PENDING IDENTIFICATION.'],
  [/^Muestra (.+) \((.+)\) requiere confirmación de lectura\.$/, 'Sample $1 ($2) requires read acknowledgment.'],
  [/^Se han detectado (\d+) observaciones de coherencia\.$/, '$1 coherence observations detected.'],
  [/^Muestra (.+) almacenada en histórico\.$/, 'Sample $1 stored in history.'],
  [/^Muestra insuficiente detectada en puerto de entrada \(Paciente ([^)]+)\)\.$/, 'Insufficient sample detected at entry port (Patient $1).'],
  [/^Detección de coágulo en circuito de aspiración \(Paciente ([^)]+)\)\.$/, 'Clot detected in aspiration circuit (Patient $1).'],
  [/^Error de aspiración en bomba peristáltica \(Paciente ([^)]+)\)\.$/, 'Aspiration error in peristaltic pump (Patient $1).'],
  [/^Error analítico de lectura en bloque de sensores \(Paciente ([^)]+)\)\.$/, 'Analytical reading error in sensor block (Patient $1).'],
  [/^Fallo de análisis \(([^)]+)\)$/, 'Analysis failure ($1)'],
  [/^Incidencia (.+)$/, 'Incident $1'],
  [/^CCI No Conforme \((.+)\)$/, 'Non-Compliant IQC ($1)'],
  [/^Advertencia CCI \((.+)\)$/, 'IQC Warning ($1)'],
  [/^CCI Conforme \((.+)\)$/, 'IQC Compliant ($1)'],
  [/^AQC (.+): NO SUPERADO$/, 'AQC $1: FAILED'],
  [/^AQC (.+): Advertencia$/, 'AQC $1: Warning'],
  [/^AQC (.+): Superado$/, 'AQC $1: Passed'],
  [/^Lote (.+) instalado al 100%\.$/, 'Lot $1 installed at 100%.'],
  [/^Alarma (.+)$/, 'Alarm $1'],
  [/^Alarma técnica (.+)$/, 'Technical alarm $1'],
  [/^Mantenimiento (.+)$/, 'Maintenance $1'],
  [/^Comunicaciones: (.+)$/, 'Communications: $1'],
  [/^Estado de enlace: (.+)$/, 'Link status: $1'],
  [/^Enlace Atellica Connect cambiado a (.+)\.$/, 'Atellica Connect link changed to $1.'],
  [/^Acuse registrado para (.+)\.$/, 'Acknowledgment logged for $1.'],
  [/^(\d+) determinaciones exportadas\.$/, '$1 determinations exported.'],
  [/^Acceso autorizado como (.+) \(([^)]+)\)\.$/, 'Authorized login as $1 ($2).'],
  [/^Sesión finalizada por (.+)\.$/, 'Session closed by $1.'],
  [/^Determinación ([^ ]+) para paciente ([^.]+)\.$/, 'Determination $1 for patient $2.'],
  [/^Calibración completada con resultado (.+)\.$/, 'Calibration completed with result $1.'],
  [/^Fallo en ([^:]+): pendiente de electrodo fuera de rango aceptable\.$/, 'Failure in $1: electrode slope outside acceptable range.'],
  [/^Análisis ([^ ]+) \(([^)]+)\) guardado como PENDIENTE DE IDENTIFICACIÓN\. No transmitido a LIS\.$/, 'Analysis $1 ($2) saved as PENDING IDENTIFICATION. Not transmitted to LIS.'],
  [/^Enviado resultado ([^ ]+) \(Paciente ([^)]+)\) a LIS\/HCE\.$/, 'Result $1 (Patient $2) sent to LIS/EHR.'],
  [/^Confirmada lectura de valores críticos en registro ([^.]+)\.$/, 'Critical values read confirmed on record $1.'],
  [/^Registro ([^ ]+) marcado como ([^ ]+) por (.+)\.$/, 'Record $1 marked as $2 by $3.'],
  [/^Control ([^:]+): (.+)$/, 'Control $1: $2'],
  [/^AQC Automático \(([^)]+)\): (.+)$/, 'Automatic AQC ($1): $2'],
  [/^Consumible ([^ ]+) sustituido \(Lote ([^,]+), Cad\. ([^)]+)\)\.$/, 'Consumable $1 replaced (Lot $2, Exp. $3).'],
  [/^Error ([^ ]+) resuelto: (.+)$/, 'Error $1 resolved: $2'],
  [/^Mensaje ([^ ]+) marcado como Leído\.$/, 'Message $1 marked as Read.'],
  [/^Mensaje ([^ ]+) confirmado por (.+)\.$/, 'Message $1 confirmed by $2.'],
  [/^Mensaje ([^ ]+) archivado\.$/, 'Message $1 archived.'],
  [/^Envío a Atellica \(([^)]+)\)$/, 'Sent to Atellica ($1)'],
  [/^Usuario ([^ ]+) \(([^)]+)\) creado\.$/, 'User $1 ($2) created.'],
  [/^Usuario ([^ ]+) actualizado\.$/, 'User $1 updated.'],
  [/^Motivo: (.+)\.$/, 'Reason: $1.'],
];

const REVERSE_EXACT_TRANSLATIONS: Record<string, string> = Object.entries(EXACT_TRANSLATIONS).reduce(
  (acc, [es, en]) => {
    if (!acc[en]) acc[en] = es;
    return acc;
  },
  {} as Record<string, string>
);

export function translateClinicalText(lang: Language, text: string | undefined | null): string {
  if (!text) return '';
  if (lang === 'es') {
    return REVERSE_EXACT_TRANSLATIONS[text] ?? text;
  }

  if (EXACT_TRANSLATIONS[text]) return EXACT_TRANSLATIONS[text];

  for (const [regex, replacement] of PATTERN_REPLACEMENTS) {
    if (regex.test(text)) {
      return text.replace(regex, replacement);
    }
  }

  return text;
}

export function resolveAtellicaText(
  lang: Language,
  msg: AtellicaMessage,
  field: 'title' | 'body' | 'sender'
): string {
  if (lang === 'en') {
    const enVal = field === 'title' ? msg.titleEn : field === 'body' ? msg.bodyEn : msg.senderEn;
    if (enVal) return enVal;
    return translateClinicalText('en', msg[field]);
  }
  const esVal = field === 'title' ? msg.titleEs : field === 'body' ? msg.bodyEs : msg.senderEs;
  if (esVal) return esVal;
  return translateClinicalText('es', msg[field]);
}

