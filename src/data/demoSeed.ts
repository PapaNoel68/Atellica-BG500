import {
  AnalyzerStoreState,
  AtellicaMessage,
  AuditLogEntry,
  BloodGasRecord,
  CalibrationRecord,
  ClinicalProfileScenario,
  ConsumableItem,
  DiagnosticComponent,
  MaintenanceError,
  MaintenanceIntervention,
  QCLevel,
  QCRun,
  SampleType,
  UserAccount,
} from '@/src/types/analyzer';
import { DEFAULT_ANALYZER_CONFIG } from '@/src/engines/parameterDefinitions';
import { buildBloodGasRecord } from '@/src/engines/analysisEngine';
import { evaluateQCRun, QCParamKey, QC_PARAMETERS } from '@/src/engines/qcEngine';

function hoursAgoIso(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
}

function daysFromNowIso(days: number): string {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

export const DEMO_USERS: UserAccount[] = [
  {
    id: 'USR-01',
    username: 'enf.garcia',
    passwordDemo: 'demo123',
    fullName: 'Elena García Morales',
    role: 'ENFERMERIA',
    department: 'UCI Polivalente',
    active: true,
    lastLogin: hoursAgoIso(1.5),
  },
  {
    id: 'USR-02',
    username: 'enf.torres',
    passwordDemo: 'demo123',
    fullName: 'Marcos Torres Vega',
    role: 'ENFERMERIA',
    department: 'Urgencias Generales',
    active: true,
    lastLogin: hoursAgoIso(6),
  },
  {
    id: 'USR-03',
    username: 'tec.martinez',
    passwordDemo: 'demo123',
    fullName: 'Carlos Martínez Soler',
    role: 'TECNICO_LAB',
    department: 'Laboratorio de Urgencias',
    active: true,
    lastLogin: hoursAgoIso(0.8),
  },
  {
    id: 'USR-04',
    username: 'fac.ruiz',
    passwordDemo: 'demo123',
    fullName: 'Dra. Laura Ruiz Navarro',
    role: 'FACULTATIVO_LAB',
    department: 'Bioquímica Clínica / POCT',
    active: true,
    lastLogin: hoursAgoIso(3),
  },
  {
    id: 'USR-05',
    username: 'admin.poct',
    passwordDemo: 'demo123',
    fullName: 'Javier López Serrano',
    role: 'ADMINISTRADOR',
    department: 'Coordinación POCT e Informática',
    active: true,
    lastLogin: hoursAgoIso(0.3),
  },
  {
    id: 'USR-06',
    username: 'enf.ramirez',
    passwordDemo: 'demo123',
    fullName: 'Lucía Ramírez Ortega',
    role: 'ENFERMERIA',
    department: 'Reanimación Quirúrgica',
    active: true,
    lastLogin: hoursAgoIso(2.1),
  },
  {
    id: 'USR-07',
    username: 'enf.molina',
    passwordDemo: 'demo123',
    fullName: 'Andrés Molina Castro',
    role: 'ENFERMERIA',
    department: 'Neonatología UCIN',
    active: true,
    lastLogin: hoursAgoIso(4.4),
  },
  {
    id: 'USR-08',
    username: 'tec.sanchez',
    passwordDemo: 'demo123',
    fullName: 'Beatriz Sánchez Vidal',
    role: 'TECNICO_LAB',
    department: 'Laboratorio Central',
    active: true,
    lastLogin: hoursAgoIso(5.2),
  },
  {
    id: 'USR-09',
    username: 'enf.dominguez',
    passwordDemo: 'demo123',
    fullName: 'Raúl Domínguez Pérez',
    role: 'ENFERMERIA',
    department: 'Quirófano Central',
    active: true,
    lastLogin: hoursAgoIso(8.0),
  },
  {
    id: 'USR-10',
    username: 'fac.navarro',
    passwordDemo: 'demo123',
    fullName: 'Dr. Pablo Navarro Gil',
    role: 'FACULTATIVO_LAB',
    department: 'Urgencias / Críticos',
    active: true,
    lastLogin: hoursAgoIso(11.5),
  },
];

export function createDemoSeedState(): AnalyzerStoreState {
  const config = structuredClone(DEFAULT_ANALYZER_CONFIG);

  // 1. Create 32 coherent demo blood gas records across DEMO001..DEMO016
  const demoSpecs: {
    patientId: string;
    location: string;
    sampleType: SampleType;
    hoursAgo: number;
    operatorId: string;
    operatorName: string;
    scenario: ClinicalProfileScenario;
    fio2?: number;
    temp?: number;
    outcome?: 'OK' | 'INCOHERENCIA_FORZADA' | 'RESULTADO_CRITICO';
    validated?: boolean;
  }[] = [
    // DEMO001 longitudinal ICU series (4 samples)
    { patientId: 'DEMO001', location: 'UCI Box 02', sampleType: 'Arterial', hoursAgo: 68, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Trastorno mixto', fio2: 60, temp: 38.4, validated: true },
    { patientId: 'DEMO001', location: 'UCI Box 02', sampleType: 'Arterial', hoursAgo: 44, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Acidosis metabólica', fio2: 50, temp: 37.9, validated: true },
    { patientId: 'DEMO001', location: 'UCI Box 02', sampleType: 'Arterial', hoursAgo: 19, operatorId: 'USR-03', operatorName: 'Carlos Martínez Soler', scenario: 'Hiperlactatemia', fio2: 40, temp: 37.4, validated: true },
    { patientId: 'DEMO001', location: 'UCI Box 02', sampleType: 'Arterial', hoursAgo: 2.2, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Normal', fio2: 28, temp: 36.9, validated: true },

    // DEMO002 longitudinal Respiratory Acidosis series (3 samples)
    { patientId: 'DEMO002', location: 'Urgencias Críticos', sampleType: 'Arterial', hoursAgo: 52, operatorId: 'USR-02', operatorName: 'Marcos Torres Vega', scenario: 'Acidosis respiratoria', fio2: 35, validated: true },
    { patientId: 'DEMO002', location: 'UCI Box 05', sampleType: 'Arterial', hoursAgo: 28, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Acidosis respiratoria', fio2: 35, validated: true },
    { patientId: 'DEMO002', location: 'UCI Box 05', sampleType: 'Arterial', hoursAgo: 5.5, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Normal', fio2: 24, validated: true },

    // DEMO003 DKA / Metabolic Acidosis (3 samples)
    { patientId: 'DEMO003', location: 'Urgencias Box 04', sampleType: 'Venosa', hoursAgo: 36, operatorId: 'USR-02', operatorName: 'Marcos Torres Vega', scenario: 'Acidosis metabólica', validated: true },
    { patientId: 'DEMO003', location: 'UCI Box 01', sampleType: 'Arterial', hoursAgo: 15, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Acidosis metabólica', fio2: 21, validated: true },
    { patientId: 'DEMO003', location: 'UCI Box 01', sampleType: 'Arterial', hoursAgo: 1.1, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Normal', fio2: 21, validated: false },

    // DEMO004 - Critical result pending / confirmed
    { patientId: 'DEMO004', location: 'Reanimación Quirúrgica', sampleType: 'Arterial', hoursAgo: 3.4, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Trastorno mixto', fio2: 80, outcome: 'RESULTADO_CRITICO', validated: false },
    { patientId: 'DEMO004', location: 'Reanimación Quirúrgica', sampleType: 'Arterial', hoursAgo: 12, operatorId: 'USR-03', operatorName: 'Carlos Martínez Soler', scenario: 'Hipoxemia', fio2: 60, validated: true },

    // DEMO005 - Forced physiological incoherence example for validation review
    { patientId: 'DEMO005', location: 'Urgencias Box 09', sampleType: 'Arterial', hoursAgo: 4.1, operatorId: 'USR-02', operatorName: 'Marcos Torres Vega', scenario: 'Normal', fio2: 21, outcome: 'INCOHERENCIA_FORZADA', validated: false },

    // Additional diverse profiles (DEMO006..DEMO016) -> total 32 records
    { patientId: 'DEMO006', location: 'Neumología Planta 4', sampleType: 'Arterial', hoursAgo: 62, operatorId: 'USR-02', operatorName: 'Marcos Torres Vega', scenario: 'Hipoxemia', fio2: 21, validated: true },
    { patientId: 'DEMO006', location: 'Neumología Planta 4', sampleType: 'Arterial', hoursAgo: 38, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Alcalosis respiratoria', fio2: 32, validated: true },
    { patientId: 'DEMO007', location: 'UCI Box 04', sampleType: 'Arterial', hoursAgo: 58, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Alcalosis metabólica', fio2: 30, validated: true },
    { patientId: 'DEMO007', location: 'UCI Box 04', sampleType: 'Arterial', hoursAgo: 24, operatorId: 'USR-03', operatorName: 'Carlos Martínez Soler', scenario: 'Alcalosis metabólica', fio2: 28, validated: true },
    { patientId: 'DEMO008', location: 'Urgencias Toxicología', sampleType: 'Arterial', hoursAgo: 47, operatorId: 'USR-02', operatorName: 'Marcos Torres Vega', scenario: 'Alteración cooximetría', fio2: 100, validated: true },
    { patientId: 'DEMO008', location: 'Urgencias Toxicología', sampleType: 'Arterial', hoursAgo: 41, operatorId: 'USR-02', operatorName: 'Marcos Torres Vega', scenario: 'Normal', fio2: 40, validated: true },
    { patientId: 'DEMO009', location: 'Nefrología', sampleType: 'Venosa', hoursAgo: 34, operatorId: 'USR-03', operatorName: 'Carlos Martínez Soler', scenario: 'Alteración electrolítica', validated: true },
    { patientId: 'DEMO009', location: 'Nefrología', sampleType: 'Venosa', hoursAgo: 18, operatorId: 'USR-03', operatorName: 'Carlos Martínez Soler', scenario: 'Normal', validated: true },
    { patientId: 'DEMO010', location: 'Neonatología UCIN', sampleType: 'Capilar', hoursAgo: 65, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Acidosis respiratoria', fio2: 30, validated: true },
    { patientId: 'DEMO010', location: 'Neonatología UCIN', sampleType: 'Capilar', hoursAgo: 30, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Normal', fio2: 21, validated: true },
    { patientId: 'DEMO011', location: 'Quirófano 3', sampleType: 'Arterial', hoursAgo: 50, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Hiperlactatemia', fio2: 50, validated: true },
    { patientId: 'DEMO011', location: 'Quirófano 3', sampleType: 'Arterial', hoursAgo: 46, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Normal', fio2: 40, validated: true },
    { patientId: 'DEMO012', location: 'UCI Box 07', sampleType: 'Arterial', hoursAgo: 22, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Alcalosis respiratoria', fio2: 21, validated: true },
    { patientId: 'DEMO013', location: 'Urgencias Traumatología', sampleType: 'Arterial', hoursAgo: 16, operatorId: 'USR-02', operatorName: 'Marcos Torres Vega', scenario: 'Hiperlactatemia', fio2: 35, validated: true },
    { patientId: 'DEMO014', location: 'Cardiología Coronaria', sampleType: 'Arterial', hoursAgo: 11, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Hipoxemia', fio2: 50, validated: true },
    { patientId: 'DEMO014', location: 'Cardiología Coronaria', sampleType: 'Arterial', hoursAgo: 7, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Normal', fio2: 35, validated: true },
    { patientId: 'DEMO015', location: 'Medicina Interna', sampleType: 'Venosa', hoursAgo: 9, operatorId: 'USR-03', operatorName: 'Carlos Martínez Soler', scenario: 'Alteración electrolítica', validated: true },
    { patientId: 'DEMO016', location: 'UCI Box 03', sampleType: 'Arterial', hoursAgo: 6, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Alcalosis metabólica', fio2: 24, validated: true },
    { patientId: 'DEMO016', location: 'UCI Box 03', sampleType: 'Arterial', hoursAgo: 0.5, operatorId: 'USR-01', operatorName: 'Elena García Morales', scenario: 'Normal', fio2: 21, validated: false },
  ];

  // Sort oldest -> newest so temporal delta checks evaluate chronologically
  const sortedSpecs = [...demoSpecs].sort((a, b) => b.hoursAgo - a.hoursAgo);
  const records: BloodGasRecord[] = [];

  sortedSpecs.forEach((spec, idx) => {
    const rec = buildBloodGasRecord({
      sampleNumber: `RP-${String(1001 + idx).padStart(4, '0')}`,
      patientId: spec.patientId,
      patientLocation: spec.location,
      sampleType: spec.sampleType,
      operatorId: spec.operatorId,
      operatorName: spec.operatorName,
      fio2: spec.fio2,
      temperatureC: spec.temp,
      extractionMinutesAgo: 4,
      processingSeconds: 58,
      scenario: spec.scenario,
      outcome: spec.outcome ?? 'OK',
      previousRecords: records,
      config,
      timestamp: hoursAgoIso(spec.hoursAgo),
      preanalyticalChecklist: {
        homogenized: true,
        bubblesRemoved: true,
        noClots: true,
        sufficientVolume: true,
      },
    });
    if (spec.validated) {
      rec.validationStatus = 'VALIDADO';
      rec.validatedBy = 'Dra. Laura Ruiz Navarro';
      rec.validatedAt = hoursAgoIso(Math.max(0.1, spec.hoursAgo - 0.3));
    }
    if (rec.hasCriticalValues && spec.patientId !== 'DEMO004') {
      rec.criticalAck = {
        acknowledged: true,
        userId: spec.operatorId,
        userName: spec.operatorName,
        timestamp: hoursAgoIso(Math.max(0.1, spec.hoursAgo - 0.05)),
        note: 'Médico de guardia informado.',
      };
    }
    records.push(rec);
  });

  // Quick measurement (Identificación diferida) demo test records
  const formatBgId = (iso: string) => {
    const d = new Date(iso);
    return `BG-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}-${String(
      d.getMinutes()
    ).padStart(2, '0')}`;
  };

  const quickTs1 = hoursAgoIso(0.35);
  const quickBg1 = formatBgId(quickTs1);
  const quickRec1 = buildBloodGasRecord({
    sampleNumber: quickBg1,
    analysisUniqueId: quickBg1,
    isQuickMeasurement: true,
    quickReference: 'UCI Box 04 · Varón EPOC',
    measuredMode: 'CLINICAL',
    identificationStatus: 'PENDIENTE_IDENTIFICACION',
    patientId: 'SIN IDENTIFICAR',
    patientLocation: 'Pendiente de asignar',
    sampleType: 'Arterial',
    operatorId: 'USR-01',
    operatorName: 'Elena García Morales',
    extractionMinutesAgo: 6,
    processingSeconds: 57,
    scenario: 'Acidosis respiratoria',
    outcome: 'OK',
    previousRecords: records,
    config,
    timestamp: quickTs1,
    preanalyticalChecklist: {
      homogenized: true,
      bubblesRemoved: true,
      noClots: true,
      sufficientVolume: true,
    },
  });
  records.push(quickRec1);

  const quickTs2 = hoursAgoIso(1.2);
  const quickBg2 = formatBgId(quickTs2);
  const quickRec2 = buildBloodGasRecord({
    sampleNumber: quickBg2,
    analysisUniqueId: quickBg2,
    isQuickMeasurement: true,
    quickReference: 'Urgencias · Cama 12 · M.R.',
    measuredMode: 'LABORATORY',
    identificationStatus: 'PENDIENTE_IDENTIFICACION',
    patientId: 'SIN IDENTIFICAR',
    patientLocation: 'Pendiente de asignar',
    sampleType: 'Venosa',
    operatorId: 'USR-03',
    operatorName: 'Carlos Martínez Soler',
    processingSeconds: 59,
    scenario: 'Hiperlactatemia',
    outcome: 'OK',
    previousRecords: records,
    config,
    timestamp: quickTs2,
    preanalyticalChecklist: {
      homogenized: true,
      bubblesRemoved: true,
      noClots: true,
      sufficientVolume: true,
    },
  });
  records.push(quickRec2);

  const quickTs3 = hoursAgoIso(2.6);
  const quickBg3 = formatBgId(quickTs3);
  const quickRec3 = buildBloodGasRecord({
    sampleNumber: quickBg3,
    analysisUniqueId: quickBg3,
    isQuickMeasurement: true,
    measuredMode: 'CLINICAL',
    identificationStatus: 'IDENTIFICADA_PENDIENTE_LIS',
    patientId: 'DEMO002',
    patientDemographics: {
      fullName: 'Lucía Fernández Castro',
      sex: 'Femenino',
      birthDate: '1968-05-14',
      ageYears: 58,
    },
    patientLocation: 'Urgencias Críticos · Box 02',
    sampleType: 'Arterial',
    operatorId: 'USR-02',
    operatorName: 'Marcos Torres Vega',
    fio2: 35,
    temperatureC: 37.2,
    extractionMinutesAgo: 5,
    processingSeconds: 56,
    scenario: 'Normal',
    outcome: 'OK',
    previousRecords: records,
    config,
    timestamp: quickTs3,
    preanalyticalChecklist: {
      homogenized: true,
      bubblesRemoved: true,
      noClots: true,
      sufficientVolume: true,
    },
  });
  quickRec3.identifiedAt = hoursAgoIso(2.4);
  quickRec3.identifiedById = 'USR-01';
  quickRec3.identifiedByName = 'Elena García Morales';
  quickRec3.sampleMetadata = {
    service: 'Urgencias Críticos',
    extractionSite: 'Arteria radial izquierda',
    extractionTimestamp: hoursAgoIso(2.7),
    oxygenTherapy: 'Mascarilla Venturi',
  };
  quickRec3.identificationAudit = [
    ...(quickRec3.identificationAudit ?? []),
    {
      timestamp: hoursAgoIso(2.4),
      userId: 'USR-01',
      userName: 'Elena García Morales',
      action: 'IDENTIFICACION_INICIAL',
      details: 'Asociada muestra rápida a paciente DEMO002 (Urgencias Críticos · Box 02).',
      newPatientId: 'DEMO002',
    },
  ];
  records.push(quickRec3);

  // Reverse so newest appears first in tables
  records.reverse();

  // 2. QC Levels & Historical Runs (20 runs per level)
  const qcLevels: QCLevel[] = [
    {
      id: 'QCL-1',
      name: 'Nivel 1 (Acidótico)',
      lotNumber: 'AQC-24101',
      expiryDate: daysFromNowIso(95),
      active: true,
      targets: {
        pH: { mean: 7.15, sd: 0.012 },
        pCO2: { mean: 64.0, sd: 2.2 },
        pO2: { mean: 58.0, sd: 3.0 },
        Na: { mean: 122.0, sd: 1.5 },
        K: { mean: 2.9, sd: 0.08 },
        Ca: { mean: 1.52, sd: 0.04 },
        Glu: { mean: 52, sd: 4 },
        Lac: { mean: 4.8, sd: 0.25 },
      },
    },
    {
      id: 'QCL-2',
      name: 'Nivel 2 (Normal)',
      lotNumber: 'AQC-24102',
      expiryDate: daysFromNowIso(95),
      active: true,
      targets: {
        pH: { mean: 7.39, sd: 0.01 },
        pCO2: { mean: 40.0, sd: 1.6 },
        pO2: { mean: 98.0, sd: 3.5 },
        Na: { mean: 140.0, sd: 1.4 },
        K: { mean: 4.3, sd: 0.09 },
        Ca: { mean: 1.2, sd: 0.03 },
        Glu: { mean: 102, sd: 5 },
        Lac: { mean: 1.3, sd: 0.12 },
      },
    },
    {
      id: 'QCL-3',
      name: 'Nivel 3 (Alcalótico)',
      lotNumber: 'AQC-24103',
      expiryDate: daysFromNowIso(95),
      active: true,
      targets: {
        pH: { mean: 7.58, sd: 0.012 },
        pCO2: { mean: 24.0, sd: 1.4 },
        pO2: { mean: 148.0, sd: 4.5 },
        Na: { mean: 156.0, sd: 1.8 },
        K: { mean: 6.1, sd: 0.11 },
        Ca: { mean: 0.86, sd: 0.03 },
        Glu: { mean: 285, sd: 9 },
        Lac: { mean: 0.65, sd: 0.08 },
      },
    },
  ];

  const qcRuns: QCRun[] = [];
  for (const lvl of qcLevels) {
    for (let i = 18; i >= 1; i--) {
      const vals = {} as Record<QCParamKey, number>;
      for (const qp of QC_PARAMETERS) {
        const { mean, sd } = lvl.targets[qp.key];
        // deterministic gentle sinusoidal + small noise within ±1.5 SD
        let wave = Math.sin(i * 0.9 + lvl.id.charCodeAt(4)) * 0.95;
        // On the most recent Level 2 run, flag pO2 and Ca with a non-blocking 1_2s QC warning
        if (lvl.id === 'QCL-2' && i === 1 && (qp.key === 'pO2' || qp.key === 'Ca')) {
          wave = qp.key === 'pO2' ? 2.35 : -2.25;
        }
        // Seed historical non-compliant and warning QC runs (earlier cycles, not blocking current readiness)
        if (lvl.id === 'QCL-1' && i === 14 && qp.key === 'K') {
          wave = 3.35; // 1_3s non-compliant historical event
        }
        if (lvl.id === 'QCL-3' && i === 9 && qp.key === 'pH') {
          wave = -3.2; // 1_3s non-compliant historical event
        }
        if (lvl.id === 'QCL-1' && i === 7 && qp.key === 'Na') {
          wave = 2.25; // 1_2s historical warning
        }
        if (lvl.id === 'QCL-3' && i === 4 && qp.key === 'Lac') {
          wave = 2.3; // 1_2s historical warning
        }
        const val = mean + wave * sd;
        vals[qp.key] = Number(val.toFixed(qp.decimals));
      }
      const run = evaluateQCRun({
        level: lvl,
        values: vals,
        priorRunsForLevel: qcRuns,
        qcSettings: config.qcSettings,
        operatorId: 'USR-03',
        operatorName: 'Carlos Martínez Soler',
        timestamp: hoursAgoIso(i * 8 + (lvl.id === 'QCL-1' ? 2 : lvl.id === 'QCL-2' ? 1 : 0)),
      });
      qcRuns.push(run);
    }
  }
  qcRuns.reverse();

  // 3. Calibrations
  const calibrations: CalibrationRecord[] = [
    {
      id: 'CAL-005',
      type: 'Calibración 2-Puntos',
      timestamp: hoursAgoIso(1.5),
      status: 'CORRECTA',
      operatorName: 'Sistema Automático',
      reason: 'Calibración programada periódica (cada 8 h)',
      nextDueAt: new Date(Date.now() + 6.5 * 3600 * 1000).toISOString(),
      details: 'Todos los sensores pH, pCO2, pO2, ISE, Glucosa, Lactato y módulo óptico dentro de pendiente nominal.',
    },
    {
      id: 'CAL-004',
      type: 'Calibración 1-Punto',
      timestamp: hoursAgoIso(5.0),
      status: 'CORRECTA',
      operatorName: 'Carlos Martínez Soler',
      reason: 'Verificación tras sustitución de solución de lavado',
      nextDueAt: hoursAgoIso(1.5),
      details: 'Deriva cero < 0.4%. Estabilidad correcta.',
    },
    {
      id: 'CAL-003',
      type: 'Calibración Cooximetría',
      timestamp: hoursAgoIso(18.0),
      status: 'CORRECTA',
      operatorName: 'Sistema Automático',
      reason: 'Autochequeo óptico diario',
      nextDueAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      details: 'Longitud de onda y absorbancia verificadas (470–680 nm).',
    },
  ];

  // 4. Consumables Inventory
  const consumables: ConsumableItem[] = [
    {
      id: 'CONS-01',
      name: 'Cartucho de Medida (750 tests)',
      category: 'Cartucho',
      reference: 'REF 10491447',
      lotNumber: 'CM-2604A',
      expiryDate: daysFromNowIso(18),
      installedAt: hoursAgoIso(240),
      levelPercent: 64,
      remainingTests: 480,
      maxTests: 750,
      estimatedConsumptionPerDay: 28,
      status: 'OK',
    },
    {
      id: 'CONS-02',
      name: 'Cartucho de Lavado / Desechos (Wash)',
      category: 'Solución',
      reference: 'REF 10491449',
      lotNumber: 'CW-2602B',
      expiryDate: daysFromNowIso(5),
      installedAt: hoursAgoIso(96),
      levelPercent: 56,
      remainingTests: 280,
      maxTests: 500,
      estimatedConsumptionPerDay: 6,
      status: 'OK',
    },
    {
      id: 'CONS-03',
      name: 'Cartucho AutoQC (Niveles 1, 2 y 3)',
      category: 'Control',
      reference: 'REF 10491452',
      lotNumber: 'AQC-24100',
      expiryDate: daysFromNowIso(22),
      installedAt: hoursAgoIso(144),
      levelPercent: 72,
      remainingTests: 108,
      maxTests: 150,
      estimatedConsumptionPerDay: 3,
      status: 'OK',
    },
    {
      id: 'CONS-04',
      name: 'Solución de Desproteinización Enzimática',
      category: 'Reactivo',
      reference: 'REF 10491460',
      lotNumber: 'DP-2511C',
      expiryDate: daysFromNowIso(65),
      installedAt: hoursAgoIso(120),
      levelPercent: 62,
      estimatedConsumptionPerDay: 4,
      status: 'OK',
    },
    {
      id: 'CONS-05',
      name: 'Módulo Sensor Óptico Cooximetría',
      category: 'Sensor',
      reference: 'REF 10491471',
      lotNumber: 'OX-2601S',
      expiryDate: daysFromNowIso(260),
      installedAt: hoursAgoIso(720),
      levelPercent: 86,
      estimatedConsumptionPerDay: 1,
      status: 'OK',
    },
    {
      id: 'CONS-06',
      name: 'Rollo Papel Impresora Térmica',
      category: 'Otro',
      reference: 'REF 10491490',
      lotNumber: 'PP-2608',
      expiryDate: daysFromNowIso(500),
      installedAt: hoursAgoIso(90),
      levelPercent: 55,
      estimatedConsumptionPerDay: 5,
      status: 'OK',
    },
  ];

  // 5. Maintenance & Diagnostics
  const maintenanceErrors: MaintenanceError[] = [
    {
      id: 'ERR-01',
      code: 'E-304',
      timestamp: hoursAgoIso(26),
      description: 'Detección puntual de microcoágulo en puerto de aspiración durante muestra externa.',
      possibleCause: 'Homogeneización insuficiente o muestra parcialmente coagulada.',
      recommendedChecks: [
        'Ejecutar ciclo automático de lavado intensivo.',
        'Verificar permeabilidad de sonda de aspiración.',
        'Recordar protocolo de inversión suave de jeringa al personal clínico.',
      ],
      severity: 'Media',
      status: 'RESUELTA',
      resolvedBy: 'Carlos Martínez Soler',
      resolvedAt: hoursAgoIso(25.5),
      resolutionNote: 'Ciclo de lavado y calibración 1-punto superados correctamente.',
    },
    {
      id: 'ERR-02',
      code: 'E-410',
      timestamp: hoursAgoIso(48.633),
      description: 'Parada preventiva por fallo de aspiración y sustitución de puerto de muestra.',
      possibleCause: 'Obstrucción completa del conjunto puerto de entrada por coágulo denso.',
      recommendedChecks: [
        'Sustituir puerto de aspiración rojo.',
        'Ejecutar purga fluídica completa y calibración 2-puntos.',
      ],
      severity: 'Crítica',
      status: 'RESUELTA',
      resolvedBy: 'Carlos Martínez Soler',
      resolvedAt: hoursAgoIso(48.0),
      resolutionNote: 'Puerto sustituido y cámara verificada (38 min fuera de servicio).',
    },
    {
      id: 'ERR-03',
      code: 'E-502',
      timestamp: hoursAgoIso(92.366),
      description: 'Analizador no disponible temporalmente por estabilización térmica de cámara analítica.',
      possibleCause: 'Reinicio programado tras sustitución de cartucho de medida.',
      recommendedChecks: [
        'Confirmar estabilización a 37,0 °C ± 0,1 °C.',
        'Validar controles AQC niveles 1, 2 y 3.',
      ],
      severity: 'Crítica',
      status: 'RESUELTA',
      resolvedBy: 'Javier López Serrano',
      resolvedAt: hoursAgoIso(92.0),
      resolutionNote: 'Estabilización térmica y AQC completados (22 min fuera de servicio).',
    },
  ];

  const maintenanceInterventions: MaintenanceIntervention[] = [
    {
      id: 'MNT-01',
      type: 'Preventivo',
      timestamp: hoursAgoIso(144),
      technicianName: 'Carlos Martínez Soler',
      component: 'Puerto de entrada de muestras y junta tórica',
      description: 'Limpieza preventiva mensual, inspección de aguja de aspiración y sustitución de cartucho AutoQC.',
      outcome: 'Completado',
    },
    {
      id: 'MNT-02',
      type: 'Correctivo',
      timestamp: hoursAgoIso(25.5),
      technicianName: 'Carlos Martínez Soler',
      component: 'Circuito fluídico de aspiración',
      description: 'Lavado enzimático tras alarma E-304 y comprobación de vacío de bomba peristáltica.',
      outcome: 'Completado',
    },
  ];

  const diagnosticComponents: DiagnosticComponent[] = [
    { id: 'CMP-1', name: 'Cámara termostatizada (37,0 °C)', subsystem: 'Control Térmico', status: 'OK', metricLabel: 'Temperatura', metricValue: '37.02 °C', lastCheckedAt: hoursAgoIso(0.2) },
    { id: 'CMP-2', name: 'Bomba peristáltica principal', subsystem: 'Fluídica', status: 'OK', metricLabel: 'Presión vacío', metricValue: '-412 mbar', lastCheckedAt: hoursAgoIso(0.2) },
    { id: 'CMP-3', name: 'Bloque electrodos pH / Gases', subsystem: 'Potenciometría / Amperometría', status: 'OK', metricLabel: 'Estabilidad', metricValue: '99.4 %', lastCheckedAt: hoursAgoIso(1.5) },
    { id: 'CMP-4', name: 'Bloque electrodos ISE (Na/K/Ca/Cl)', subsystem: 'Electrolitos', status: 'OK', metricLabel: 'Pendiente media', metricValue: '58.9 mV/dec', lastCheckedAt: hoursAgoIso(1.5) },
    { id: 'CMP-5', name: 'Biosensores Glucosa / Lactato', subsystem: 'Enzimático', status: 'OK', metricLabel: 'Corriente base', metricValue: '1.8 nA', lastCheckedAt: hoursAgoIso(1.5) },
    { id: 'CMP-6', name: 'Espectrofotómetro Cooximetría', subsystem: 'Óptica', status: 'OK', metricLabel: 'Transmitancia LED', metricValue: '98.8 %', lastCheckedAt: hoursAgoIso(0.5) },
    { id: 'CMP-7', name: 'Lector código de barras integrado', subsystem: 'Periféricos', status: 'OK', metricLabel: 'Estado interfaz', metricValue: 'Listo (HID)', lastCheckedAt: hoursAgoIso(0.2) },
    { id: 'CMP-8', name: 'Enlace Middleware Atellica Connect', subsystem: 'Comunicaciones', status: 'OK', metricLabel: 'Protocolo HL7/POCT1-A', metricValue: 'Simulado activo', lastCheckedAt: hoursAgoIso(0.1) },
  ];

  // 6. Avisos Coordinador (1 historical confirmed notice with full date/time & read/confirm traceability; 0 active pending)
  const atellicaInbox: AtellicaMessage[] = [
    {
      id: 'MSG-001',
      title: 'Cambio preventivo de cartucho de medida (Fin de semana)',
      body: 'Por favor, antes de finalizar el turno revisen la caducidad del cartucho de medida y procedan a su sustitución si procede.',
      titleEs: 'Cambio preventivo de cartucho de medida (Fin de semana)',
      titleEn: 'Preventive measurement cartridge change (Weekend)',
      bodyEs: 'Por favor, antes de finalizar el turno revisen la caducidad del cartucho de medida y procedan a su sustitución si procede.',
      bodyEn: 'Before the end of your shift, please check the measurement cartridge expiry date and replace it if needed.',
      type: 'Aviso operativo',
      sender: 'Coordinación POCT · Atellica Connect',
      senderEs: 'Coordinación POCT · Atellica Connect',
      senderEn: 'POCT Coordination · Atellica Connect',
      priority: 'Alta',
      receivedAt: hoursAgoIso(4.5),
      status: 'Confirmado',
      readAt: hoursAgoIso(4.1),
      readBy: 'Elena García Morales',
      confirmedAt: hoursAgoIso(4.0),
      confirmedBy: 'Elena García Morales',
      history: [
        {
          timestamp: hoursAgoIso(4.5),
          userId: 'SYSTEM',
          userName: 'Middleware Atellica Connect',
          previousStatus: 'Recibido',
          newStatus: 'Pendiente de lectura',
          actionType: 'RECEPCION_SISTEMA',
        },
        {
          timestamp: hoursAgoIso(4.1),
          userId: 'USR-01',
          userName: 'Elena García Morales',
          previousStatus: 'Pendiente de lectura',
          newStatus: 'Leído',
          actionType: 'LECTURA',
        },
        {
          timestamp: hoursAgoIso(4.0),
          userId: 'USR-01',
          userName: 'Elena García Morales',
          previousStatus: 'Leído',
          newStatus: 'Confirmado',
          actionType: 'CONFIRMACION_RECEPCION',
        },
      ],
    },
  ];

  // 7. Initial Audit Logs (includes seeded login activity across top 10 users)
  const loginCountsByUser: { user: UserAccount; count: number; baseHours: number }[] = [
    { user: DEMO_USERS[0], count: 16, baseHours: 1.5 },
    { user: DEMO_USERS[2], count: 13, baseHours: 0.8 },
    { user: DEMO_USERS[1], count: 11, baseHours: 6.0 },
    { user: DEMO_USERS[4], count: 9, baseHours: 0.3 },
    { user: DEMO_USERS[5], count: 8, baseHours: 2.1 },
    { user: DEMO_USERS[3], count: 6, baseHours: 3.0 },
    { user: DEMO_USERS[6], count: 5, baseHours: 4.4 },
    { user: DEMO_USERS[7], count: 4, baseHours: 5.2 },
    { user: DEMO_USERS[8], count: 3, baseHours: 8.0 },
    { user: DEMO_USERS[9], count: 2, baseHours: 11.5 },
  ];

  const seededLoginLogs: AuditLogEntry[] = [];
  let loginSeq = 100;
  loginCountsByUser.forEach(({ user, count, baseHours }) => {
    for (let k = 0; k < count; k++) {
      loginSeq += 1;
      seededLoginLogs.push({
        id: `AUD-LOG-${loginSeq}`,
        timestamp: hoursAgoIso(baseHours + k * 7.5),
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        module: 'ACCESOS',
        action: 'Inicio de sesión',
        details: `Acceso autorizado como ${user.fullName} (${user.role}).`,
      });
    }
  });

  const unsortedAuditLogs: AuditLogEntry[] = [
    {
      id: 'AUD-003',
      timestamp: hoursAgoIso(1.5),
      userId: 'USR-03',
      userName: 'Carlos Martínez Soler',
      userRole: 'TECNICO_LAB',
      module: 'CALIBRACIONES',
      action: 'Calibración 2-Puntos',
      details: 'Calibración completada con resultado CORRECTA.',
    },
    {
      id: 'AUD-004',
      timestamp: hoursAgoIso(0.5),
      userId: 'USR-01',
      userName: 'Elena García Morales',
      userRole: 'ENFERMERIA',
      module: 'DETERMINACIONES',
      action: 'Nueva gasometría',
      details: `Determinación ${records[0]?.sampleNumber ?? 'RP-1032'} para paciente ${records[0]?.patientId ?? 'DEMO016'}.`,
    },
    ...seededLoginLogs,
  ];

  const auditLogs: AuditLogEntry[] = unsortedAuditLogs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    config,
    analyzerStatus: 'OPERATIVO',
    communicationStatus: 'CONECTADO',
    qcBlocked: false,
    users: DEMO_USERS,
    records,
    qcLevels,
    qcRuns,
    qcNonConformities: [],
    calibrations,
    consumables,
    maintenanceErrors,
    maintenanceInterventions,
    diagnosticComponents,
    atellicaInbox,
    atellicaOutbox: [
      {
        id: 'OUT-001',
        category: 'Confirmación de actuación',
        subject: 'Revisión E-304 completada',
        body: 'Se ejecutó lavado enzimático y verificación de sonda en RP500e-01 tras microcoágulo.',
        sentAt: hoursAgoIso(25.2),
        senderId: 'USR-03',
        senderName: 'Carlos Martínez Soler',
        deliveryStatus: 'Confirmado por middleware (simulado)',
      },
    ],
    auditLogs,
    counters: {
      totalSamples: 270 + records.length,
      cartridgeTests: 270,
      aspirations: 312,
      washCycles: 640,
    },
  };
}
