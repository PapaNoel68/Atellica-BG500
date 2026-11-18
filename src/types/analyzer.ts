export type UserRole =
  | 'ENFERMERIA'
  | 'TECNICO_LAB'
  | 'FACULTATIVO_LAB'
  | 'ADMINISTRADOR';

export type OperatingMode = 'CLINICAL' | 'LABORATORY';

export type AnalyzerStatus =
  | 'OPERATIVO'
  | 'OPERATIVO_CON_ADVERTENCIAS'
  | 'NO_DISPONIBLE'
  | 'MANTENIMIENTO';

export type CommunicationStatus = 'CONECTADO' | 'DESCONECTADO' | 'SINCRONIZANDO';

export type QCOverallStatus = 'CONFORME' | 'ADVERTENCIA' | 'NO_CONFORME' | 'BLOQUEADO';

export type SampleType = 'Arterial' | 'Venosa' | 'Capilar';

export type ClinicalProfileScenario =
  | 'Normal'
  | 'Acidosis metabólica'
  | 'Acidosis respiratoria'
  | 'Alcalosis metabólica'
  | 'Alcalosis respiratoria'
  | 'Trastorno mixto'
  | 'Hipoxemia'
  | 'Hiperlactatemia'
  | 'Alteración electrolítica'
  | 'Alteración cooximetría';

export type SimulatedOutcome =
  | 'OK'
  | 'MUESTRA_INSUFICIENTE'
  | 'COAGULO'
  | 'ERROR_ASPIRACION'
  | 'ERROR_ANALITICO'
  | 'PARAMETRO_NO_DISPONIBLE'
  | 'INCOHERENCIA_FORZADA'
  | 'RESULTADO_CRITICO';

export type Permission =
  | 'PERFORM_ANALYSIS'
  | 'VIEW_CLINICAL_RESULTS'
  | 'VIEW_CLINICAL_HISTORY'
  | 'CONFIRM_CRITICAL_ALERT'
  | 'CONFIRM_MESSAGE_READ'
  | 'REPORT_INCIDENT'
  | 'ACCESS_LAB_MODE'
  | 'MANAGE_QC'
  | 'MANAGE_CALIBRATIONS'
  | 'MANAGE_CONSUMABLES'
  | 'MANAGE_MAINTENANCE'
  | 'VALIDATE_RESULTS'
  | 'EXPORT_RESULTS'
  | 'EDIT_ANALYTICAL_CONFIG'
  | 'VIEW_AUDIT'
  | 'MANAGE_USERS'
  | 'SIMULATE_ATELLICA'
  | 'RESET_DEMO';

export interface UserAccount {
  id: string;
  username: string;
  passwordDemo: string;
  fullName: string;
  role: UserRole;
  department: string;
  active: boolean;
  lastLogin?: string;
}

export type ParameterCategory =
  | 'Ácido-Base'
  | 'Electrolitos'
  | 'Metabolismo'
  | 'Hemoglobina y Cooximetría'
  | 'Bilirrubina'
  | 'Calculados';

export type AbnormalityFlag = 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL_LOW' | 'CRITICAL_HIGH' | 'ND';

export interface ParameterConfig {
  key: ParameterKey;
  label: string;
  shortLabel: string;
  unit: string;
  altUnit?: string;
  decimals: number;
  category: ParameterCategory;
  kind: 'measured' | 'calculated';
  visible: boolean;
  enabled: boolean;
  refArterial: [number, number];
  refVenosa: [number, number];
  refCapilar: [number, number];
  criticalLow?: number;
  criticalHigh?: number;
  analyticalMin: number;
  analyticalMax: number;
  deltaLimit?: number;
}

export type ParameterKey =
  | 'pH'
  | 'pCO2'
  | 'pO2'
  | 'Na'
  | 'K'
  | 'Ca'
  | 'Cl'
  | 'Glu'
  | 'Lac'
  | 'ctHb'
  | 'FO2Hb'
  | 'FCOHb'
  | 'FMetHb'
  | 'FHHb'
  | 'nBili'
  | 'HCO3'
  | 'BE'
  | 'sO2'
  | 'TCO2'
  | 'AnionGap'
  | 'pO2FiO2';

export type ParameterValues = Partial<Record<ParameterKey, number | null>>;

export type IncoherenceLevel =
  | 'Informativa'
  | 'Advertencia'
  | 'Requiere revisión'
  | 'Crítica';

export interface ValidationIssue {
  id: string;
  parameter: string;
  level: IncoherenceLevel;
  category: 'Fisiológica' | 'Analítica' | 'Temporal (Delta)' | 'Preanalítica';
  title: string;
  explanation: string;
  relatedResults: string;
  possibleCauses: string[];
  recommendedChecks: string[];
  timestamp: string;
}

export interface ClinicalInterpretation {
  primaryDisorder: string;
  expectedCompensation: string;
  mixedDisorderPossible: string;
  additionalFindings: string[];
  limitations: string[];
  summaryText: string;
  isOrientativeNotice: string;
}

export interface CriticalAlertAck {
  acknowledged: boolean;
  userId?: string;
  userName?: string;
  timestamp?: string;
  note?: string;
}

export type ResultValidationStatus = 'PENDIENTE' | 'VALIDADO' | 'RECHAZADO' | 'EN_REVISION';

export type IdentificationStatus =
  | 'PENDIENTE_IDENTIFICACION'
  | 'IDENTIFICADA_PENDIENTE_LIS'
  | 'IDENTIFICADA_TRANSMITIDA';

export interface IdentificationAuditEntry {
  timestamp: string;
  userId: string;
  userName: string;
  action: 'MEDICION_RAPIDA' | 'IDENTIFICACION_INICIAL' | 'CORRECCION_IDENTIFICACION' | 'ENVIO_LIS';
  details: string;
  previousPatientId?: string;
  newPatientId?: string;
}

export interface SampleExtendedMetadata {
  service?: string;
  extractionSite?: string;
  extractionTimestamp?: string;
  oxygenTherapy?: string;
}

export interface BloodGasRecord {
  id: string;
  sampleNumber: string;
  analysisUniqueId?: string;
  isQuickMeasurement?: boolean;
  quickReference?: string;
  measuredMode?: OperatingMode;
  identificationStatus?: IdentificationStatus;
  identifiedAt?: string;
  identifiedById?: string;
  identifiedByName?: string;
  lisTransmittedAt?: string;
  lisTransmittedBy?: string;
  sampleMetadata?: SampleExtendedMetadata;
  identificationAudit?: IdentificationAuditEntry[];
  patientId: string;
  patientDemographics?: {
    fullName: string;
    sex: 'Masculino' | 'Femenino';
    birthDate: string;
    ageYears: number;
  };
  patientLocation: string;
  sampleType: SampleType;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  fio2?: number;
  temperatureC?: number;
  extractionMinutesAgo?: number;
  processingSeconds: number;
  scenario?: ClinicalProfileScenario;
  values: ParameterValues;
  flags: Partial<Record<ParameterKey, AbnormalityFlag>>;
  validationIssues: ValidationIssue[];
  interpretation: ClinicalInterpretation;
  hasCriticalValues: boolean;
  criticalParameters: ParameterKey[];
  criticalAck: CriticalAlertAck;
  validationStatus: ResultValidationStatus;
  validatedBy?: string;
  validatedAt?: string;
  preanalyticalChecklist: {
    homogenized: boolean;
    bubblesRemoved: boolean;
    noClots: boolean;
    sufficientVolume: boolean;
  };
  incidentNote?: string;
}

export type WestgardRule = '1_2s' | '1_3s' | '2_2s' | 'R_4s' | '4_1s' | '10x';

export interface QCLevel {
  id: string;
  name: string; // Nivel 1, Nivel 2, Nivel 3
  lotNumber: string;
  expiryDate: string;
  active: boolean;
  targets: Record<'pH' | 'pCO2' | 'pO2' | 'Na' | 'K' | 'Ca' | 'Glu' | 'Lac', {
    mean: number;
    sd: number;
  }>;
}

export interface QCRun {
  id: string;
  levelId: string;
  levelName: string;
  lotNumber: string;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  values: Record<'pH' | 'pCO2' | 'pO2' | 'Na' | 'K' | 'Ca' | 'Glu' | 'Lac', number>;
  zScores: Record<'pH' | 'pCO2' | 'pO2' | 'Na' | 'K' | 'Ca' | 'Glu' | 'Lac', number>;
  violatedRules: {
    parameter: string;
    rule: WestgardRule;
    severity: 'WARNING' | 'REJECT';
    description: string;
  }[];
  status: 'CONFORME' | 'ADVERTENCIA' | 'NO_CONFORME';
}

export interface QCNonConformity {
  id: string;
  qcRunId: string;
  levelName: string;
  parameter: string;
  rule: WestgardRule;
  detectedAt: string;
  possibleCauses: string;
  investigation: string;
  correctiveAction: string;
  repeatedRunId?: string;
  status: 'ABIERTA' | 'EN_INVESTIGACION' | 'RESUELTA';
  responsibleName: string;
  resolvedAt?: string;
}

export type CalibrationStatus = 'CORRECTA' | 'FALLIDA' | 'PENDIENTE' | 'INTERRUMPIDA';

export interface CalibrationRecord {
  id: string;
  type: 'Calibración 1-Punto' | 'Calibración 2-Puntos' | 'Calibración Cooximetría' | 'Calibración Completa';
  timestamp: string;
  status: CalibrationStatus;
  operatorName: string;
  reason: string;
  nextDueAt: string;
  details: string;
}

export type ConsumableCategory =
  | 'Cartucho'
  | 'Reactivo'
  | 'Solución'
  | 'Sensor'
  | 'Control'
  | 'Otro';

export interface ConsumableItem {
  id: string;
  name: string;
  category: ConsumableCategory;
  reference: string;
  lotNumber: string;
  expiryDate: string;
  installedAt: string;
  levelPercent: number; // 0..100
  remainingTests?: number;
  maxTests?: number;
  estimatedConsumptionPerDay: number;
  status: 'OK' | 'BAJO' | 'AGOTADO' | 'CADUCADO';
}

export interface MaintenanceError {
  id: string;
  code: string;
  timestamp: string;
  description: string;
  possibleCause: string;
  recommendedChecks: string[];
  severity: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  status: 'ACTIVA' | 'EN_REVISION' | 'RESUELTA';
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface MaintenanceIntervention {
  id: string;
  type: 'Preventivo' | 'Correctivo' | 'Diagnóstico';
  timestamp: string;
  technicianName: string;
  component: string;
  description: string;
  outcome: 'Completado' | 'Requiere seguimiento';
}

export interface DiagnosticComponent {
  id: string;
  name: string;
  subsystem: string;
  status: 'OK' | 'ADVERTENCIA' | 'FALLO';
  metricLabel: string;
  metricValue: string;
  lastCheckedAt: string;
}

export type AtellicaMessageType =
  | 'Información'
  | 'Aviso operativo'
  | 'Aviso de control de calidad'
  | 'Incidencia técnica'
  | 'Comunicación urgente'
  | 'Actualización de procedimientos'
  | 'Aviso de mantenimiento';

export type AtellicaMessagePriority = 'Normal' | 'Alta' | 'Urgente';

export type AtellicaMessageStatus =
  | 'Recibido'
  | 'Pendiente de lectura'
  | 'Leído'
  | 'Confirmado'
  | 'Respondido'
  | 'Archivado';

export interface MessageStatusHistoryEntry {
  timestamp: string;
  userId: string;
  userName: string;
  previousStatus: AtellicaMessageStatus;
  newStatus: AtellicaMessageStatus;
  actionType: 'LECTURA' | 'CONFIRMACION_RECEPCION' | 'RESPUESTA' | 'ARCHIVO' | 'RECEPCION_SISTEMA';
}

export interface AtellicaMessage {
  id: string;
  title: string;
  body: string;
  type: AtellicaMessageType;
  sender: string;
  titleEs?: string;
  titleEn?: string;
  bodyEs?: string;
  bodyEn?: string;
  senderEs?: string;
  senderEn?: string;
  priority: AtellicaMessagePriority;
  receivedAt: string;
  status: AtellicaMessageStatus;
  readAt?: string;
  readBy?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  history: MessageStatusHistoryEntry[];
}

export type SentMessageCategory =
  | 'Aviso de incidencia'
  | 'Solicitud de intervención'
  | 'Notificación de control no conforme'
  | 'Aviso de consumible'
  | 'Confirmación de actuación'
  | 'Mensaje libre autorizado';

export interface SentAtellicaMessage {
  id: string;
  category: SentMessageCategory;
  subject: string;
  body: string;
  sentAt: string;
  senderId: string;
  senderName: string;
  relatedMessageId?: string;
  deliveryStatus: 'Enviado (simulado)' | 'Confirmado por middleware (simulado)';
}

export type AuditModule =
  | 'ACCESOS'
  | 'DETERMINACIONES'
  | 'CONTROL_CALIDAD'
  | 'CALIBRACIONES'
  | 'CONSUMIBLES'
  | 'MANTENIMIENTO'
  | 'COMUNICACIONES'
  | 'CONFIGURACION'
  | 'USUARIOS'
  | 'SIMULADOR';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  module: AuditModule;
  action: string;
  details: string;
}

export interface CoherenceSettings {
  maxPhDiff: number;
  maxHco3Tco2Diff: number;
  cooxSumMin: number;
  cooxSumMax: number;
  maxAnionGapDiff: number;
  enableTemporalDeltaChecks: boolean;
  enablePhysiologicalChecks: boolean;
}

export interface QCSettings {
  blockAnalysisOnQCReject: boolean;
  requireDailyQCLevel2: boolean;
  enabledRules: Record<WestgardRule, boolean>;
}

export interface AnalyzerConfig {
  deviceName: string;
  deviceId: string;
  location: string;
  parameters: Record<ParameterKey, ParameterConfig>;
  coherence: CoherenceSettings;
  qcSettings: QCSettings;
  autoCalibrationIntervalHours: number;
  requireOperatorForAnalysis: boolean;
}

export interface AnalyzerStoreState {
  config: AnalyzerConfig;
  analyzerStatus: AnalyzerStatus;
  communicationStatus: CommunicationStatus;
  qcBlocked: boolean;
  users: UserAccount[];
  records: BloodGasRecord[];
  qcLevels: QCLevel[];
  qcRuns: QCRun[];
  qcNonConformities: QCNonConformity[];
  calibrations: CalibrationRecord[];
  consumables: ConsumableItem[];
  maintenanceErrors: MaintenanceError[];
  maintenanceInterventions: MaintenanceIntervention[];
  diagnosticComponents: DiagnosticComponent[];
  atellicaInbox: AtellicaMessage[];
  atellicaOutbox: SentAtellicaMessage[];
  auditLogs: AuditLogEntry[];
  counters: {
    totalSamples: number;
    cartridgeTests: number;
    aspirations: number;
    washCycles: number;
  };
}
