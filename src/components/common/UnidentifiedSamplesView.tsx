import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  Barcode,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileClock,
  History,
  Loader2,
  Lock,
  Printer,
  Search,
  Send,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import {
  BloodGasRecord,
  IdentificationStatus,
  SampleType,
} from '@/src/types/analyzer';
import { BloodGasReportView } from '@/src/components/common/BloodGasReportView';
import { PARAMETER_ORDER } from '@/src/engines/parameterDefinitions';
import {
  generateRandomPatientDemographics,
  PatientDemographics,
} from '@/src/utils/patientDemographics';
import {
  Language,
  localeFor,
  tr,
  translateClinicalText,
  translateParameterShortLabel,
  translateParameterUnit,
  translateSampleType,
} from '@/src/i18n/translations';

const SERVICES = [
  'UCI Polivalente',
  'Urgencias Generales',
  'Urgencias Críticos',
  'Reanimación Quirúrgica',
  'Quirófano Central',
  'Neumología',
  'Medicina Interna',
  'Neonatología UCIN',
  'Laboratorio Central / POCT',
];

const EXTRACTION_SITES = [
  'Arteria radial izquierda',
  'Arteria radial derecha',
  'Arteria femoral',
  'Catéter arterial radial',
  'Vena periférica (flexura)',
  'Vía venosa central',
  'Capilar (lóbulo / pulpejo / talón)',
];

const OXYGEN_THERAPIES = [
  'Aire ambiente (sin oxigenoterapia)',
  'Gafas nasales',
  'Mascarilla Venturi',
  'Mascarilla con reservorio',
  'Cánulas nasales de alto flujo (CNAF)',
  'VMNI / CPAP',
  'Ventilación mecánica invasiva (VMI)',
];

function getExtractionTimeText(rec: BloodGasRecord, lang: Language): string {
  const loc = localeFor(lang);
  if (rec.sampleMetadata?.extractionTimestamp) {
    return new Date(rec.sampleMetadata.extractionTimestamp).toLocaleTimeString(loc, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (rec.extractionMinutesAgo !== undefined) {
    const ms = new Date(rec.timestamp).getTime() - rec.extractionMinutesAgo * 60 * 1000;
    return new Date(ms).toLocaleTimeString(loc, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return tr(lang, 'Desconocida', 'Unknown');
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function getIdentificationBadgeMeta(
  status?: IdentificationStatus,
  lang: Language = 'es'
) {
  switch (status) {
    case 'PENDIENTE_IDENTIFICACION':
      return {
        label: tr(lang, 'Pendiente de identificación', 'Pending identification'),
        shortLabel: tr(lang, 'Pendiente ID', 'Pending ID'),
        cls: 'bg-orange-100 border-orange-400 text-orange-950',
        dotCls: 'bg-orange-500',
      };
    case 'IDENTIFICADA_PENDIENTE_LIS':
      return {
        label: tr(lang, 'Identificada · Pendiente LIS', 'Identified · Pending LIS'),
        shortLabel: tr(lang, 'Pendiente LIS', 'Pending LIS'),
        cls: 'bg-sky-100 border-sky-400 text-sky-950',
        dotCls: 'bg-sky-600',
      };
    case 'IDENTIFICADA_TRANSMITIDA':
    default:
      return {
        label: tr(lang, 'Identificada y transmitida', 'Identified & transmitted'),
        shortLabel: tr(lang, 'Transmitida', 'Transmitted'),
        cls: 'bg-emerald-100 border-emerald-400 text-emerald-950',
        dotCls: 'bg-emerald-600',
      };
  }
}

interface UnidentifiedSamplesViewProps {
  initialRecordId?: string | null;
  onBackToHome?: () => void;
}

export const UnidentifiedSamplesView: React.FC<UnidentifiedSamplesViewProps> = ({
  initialRecordId = null,
  onBackToHome,
}) => {
  const { state, language, identifyBloodGasRecord, transmitRecordToLis } = useAnalyzer();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | IdentificationStatus>('ALL');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');

  const [previewRecordId, setPreviewRecordId] = useState<string | null>(null);
  const [identifyingRecordId, setIdentifyingRecordId] = useState<string | null>(initialRecordId);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [patientIdInput, setPatientIdInput] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [demographics, setDemographics] = useState<PatientDemographics | null>(null);
  const [demographicsConfirmed, setDemographicsConfirmed] = useState(false);
  const [serviceInput, setServiceInput] = useState(SERVICES[0]);
  const [locationInput, setLocationInput] = useState('Box 02');
  const [sampleTypeInput, setSampleTypeInput] = useState<SampleType>('Arterial');
  const [extractionSiteInput, setExtractionSiteInput] = useState(EXTRACTION_SITES[0]);
  const [extractionDateTimeInput, setExtractionDateTimeInput] = useState('');
  const [fio2Input, setFio2Input] = useState('21');
  const [oxygenTherapyInput, setOxygenTherapyInput] = useState(OXYGEN_THERAPIES[0]);
  const [tempInput, setTempInput] = useState('37.0');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setViewingReportId(null);
    setPreviewRecordId(null);
    setIdentifyingRecordId(initialRecordId ?? null);
  }, [initialRecordId]);

  const quickRecords = useMemo(
    () =>
      state.records.filter(
        (r) => r.isQuickMeasurement || r.identificationStatus !== 'IDENTIFICADA_TRANSMITIDA'
      ),
    [state.records]
  );

  const counts = useMemo(() => {
    let pending = 0;
    let pendingLis = 0;
    let transmitted = 0;
    quickRecords.forEach((r) => {
      if (r.identificationStatus === 'PENDIENTE_IDENTIFICACION') pending += 1;
      else if (r.identificationStatus === 'IDENTIFICADA_PENDIENTE_LIS') pendingLis += 1;
      else transmitted += 1;
    });
    return { pending, pendingLis, transmitted };
  }, [quickRecords]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...quickRecords]
      .filter((r) => {
        if (statusFilter !== 'ALL' && r.identificationStatus !== statusFilter) return false;
        if (dateFilter) {
          const recDate = new Date(r.timestamp).toISOString().slice(0, 10);
          if (recDate !== dateFilter) return false;
        }
        if (q) {
          const uid = (r.analysisUniqueId ?? r.sampleNumber).toLowerCase();
          const qRef = (r.quickReference ?? '').toLowerCase();
          if (
            !uid.includes(q) &&
            !r.sampleNumber.toLowerCase().includes(q) &&
            !r.patientId.toLowerCase().includes(q) &&
            !r.operatorName.toLowerCase().includes(q) &&
            !qRef.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        return sortOrder === 'DESC' ? -diff : diff;
      });
  }, [quickRecords, statusFilter, dateFilter, searchQuery, sortOrder]);

  const activeIdentifyRecord = useMemo(
    () => (identifyingRecordId ? state.records.find((r) => r.id === identifyingRecordId) : undefined),
    [state.records, identifyingRecordId]
  );

  const previewRecord = useMemo(
    () => (previewRecordId ? state.records.find((r) => r.id === previewRecordId) : undefined),
    [state.records, previewRecordId]
  );

  const viewingReportRecord = useMemo(
    () => (viewingReportId ? state.records.find((r) => r.id === viewingReportId) : undefined),
    [state.records, viewingReportId]
  );

  useEffect(() => {
    if (!activeIdentifyRecord) return;
    const isAlreadyId =
      activeIdentifyRecord.identificationStatus !== undefined &&
      activeIdentifyRecord.identificationStatus !== 'PENDIENTE_IDENTIFICACION';
    setPatientIdInput(isAlreadyId ? activeIdentifyRecord.patientId : '');
    setCountdown(null);
    if (isAlreadyId && activeIdentifyRecord.patientDemographics) {
      setDemographics({
        patientId: activeIdentifyRecord.patientId,
        fullName: activeIdentifyRecord.patientDemographics.fullName,
        sex: activeIdentifyRecord.patientDemographics.sex,
        birthDate: activeIdentifyRecord.patientDemographics.birthDate,
        ageYears: activeIdentifyRecord.patientDemographics.ageYears,
      });
      setDemographicsConfirmed(true);
    } else {
      setDemographics(null);
      setDemographicsConfirmed(false);
    }
    setServiceInput(
      activeIdentifyRecord.sampleMetadata?.service ||
        (activeIdentifyRecord.measuredMode === 'LABORATORY' ? 'Laboratorio Central / POCT' : SERVICES[0])
    );
    setLocationInput(isAlreadyId ? activeIdentifyRecord.patientLocation : 'Box 02');
    setSampleTypeInput(activeIdentifyRecord.sampleType);
    setExtractionSiteInput(
      activeIdentifyRecord.sampleMetadata?.extractionSite || EXTRACTION_SITES[0]
    );
    const defaultExtractIso =
      activeIdentifyRecord.sampleMetadata?.extractionTimestamp ||
      (activeIdentifyRecord.extractionMinutesAgo !== undefined
        ? new Date(
            new Date(activeIdentifyRecord.timestamp).getTime() -
              activeIdentifyRecord.extractionMinutesAgo * 60 * 1000
          ).toISOString()
        : activeIdentifyRecord.timestamp);
    setExtractionDateTimeInput(toDatetimeLocalValue(defaultExtractIso));
    setFio2Input(activeIdentifyRecord.fio2 !== undefined ? String(activeIdentifyRecord.fio2) : '21');
    setOxygenTherapyInput(
      activeIdentifyRecord.sampleMetadata?.oxygenTherapy || OXYGEN_THERAPIES[0]
    );
    setTempInput(
      activeIdentifyRecord.temperatureC !== undefined
        ? activeIdentifyRecord.temperatureC.toFixed(1)
        : ''
    );
    setFormError(null);
  }, [activeIdentifyRecord]);

  const isMeasuredClinical = activeIdentifyRecord?.measuredMode !== 'LABORATORY';

  useEffect(() => {
    if (!isMeasuredClinical || countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      setDemographics(generateRandomPatientDemographics(patientIdInput.trim().toUpperCase()));
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, isMeasuredClinical, patientIdInput]);

  const triggerBarcodeOrLookup = (idVal: string) => {
    const clean = idVal.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,16}$/.test(clean)) {
      setFormError(
        tr(
          language,
          `Formato inválido. Introduzca 4–16 caracteres (${isMeasuredClinical ? 'ej. DEMO001' : 'ej. LAB-1001'}).`,
          `Invalid format. Enter 4–16 characters (${isMeasuredClinical ? 'e.g. DEMO001' : 'e.g. LAB-1001'}).`
        )
      );
      return;
    }
    setFormError(null);
    if (!isMeasuredClinical) {
      setDemographics(null);
      setDemographicsConfirmed(true);
      setCountdown(null);
      return;
    }
    setDemographics(null);
    setDemographicsConfirmed(false);
    setCountdown(3);
  };

  const handleSimulateBarcode = () => {
    const pool = isMeasuredClinical
      ? ['DEMO001', 'DEMO002', 'DEMO003', 'DEMO017', 'DEMO018']
      : ['LAB-1001', 'LAB-1002', 'LAB-2045', 'DEMO001'];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setPatientIdInput(pick);
    triggerBarcodeOrLookup(pick);
  };

  const handleSaveIdentification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIdentifyRecord) return;
    const cleanId = patientIdInput.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,16}$/.test(cleanId)) {
      setFormError(
        tr(
          language,
          `Debe introducir un ${isMeasuredClinical ? 'Nº Historia Clínica' : 'Nº Laboratorio'} válido.`,
          `You must enter a valid ${isMeasuredClinical ? 'Medical Record ID' : 'Laboratory ID'}.`
        )
      );
      return;
    }
    if (isMeasuredClinical && (!demographics || !demographicsConfirmed)) {
      setFormError(
        tr(
          language,
          'En Modo Clínico debe validar los datos demográficos del paciente antes de guardar.',
          'In Clinical Mode you must validate patient demographics before saving.'
        )
      );
      return;
    }
    const fio2Num = fio2Input.trim() ? Number(fio2Input) : undefined;
    if (fio2Num !== undefined && (Number.isNaN(fio2Num) || fio2Num < 21 || fio2Num > 100)) {
      setFormError(tr(language, 'La FiO₂ debe situarse entre 21% y 100%.', 'FiO₂ must be between 21% and 100%.'));
      return;
    }
    const tempNum = tempInput.trim() ? Number(tempInput) : undefined;
    if (tempNum !== undefined && (Number.isNaN(tempNum) || tempNum < 28 || tempNum > 43)) {
      setFormError(
        tr(
          language,
          'La temperatura opcional debe situarse entre 28 °C y 43 °C.',
          'Optional temperature must be between 28 °C and 43 °C.'
        )
      );
      return;
    }

    const isCorrection =
      activeIdentifyRecord.identificationStatus !== undefined &&
      activeIdentifyRecord.identificationStatus !== 'PENDIENTE_IDENTIFICACION';

    const res = identifyBloodGasRecord({
      recordId: activeIdentifyRecord.id,
      patientId: cleanId,
      patientDemographics:
        isMeasuredClinical && demographics
          ? {
              fullName: demographics.fullName,
              sex: demographics.sex,
              birthDate: demographics.birthDate,
              ageYears: demographics.ageYears,
            }
          : undefined,
      patientLocation: locationInput.trim() ? `${serviceInput} · ${locationInput.trim()}` : serviceInput,
      sampleType: sampleTypeInput,
      fio2: fio2Num,
      temperatureC: tempNum,
      sampleMetadata: {
        service: serviceInput,
        extractionSite: extractionSiteInput,
        extractionTimestamp: extractionDateTimeInput
          ? new Date(extractionDateTimeInput).toISOString()
          : undefined,
        oxygenTherapy: oxygenTherapyInput,
      },
      isCorrection,
    });

    if (!res.ok) {
      setFormError(res.error ?? tr(language, 'Error al guardar identificación.', 'Error saving identification.'));
      return;
    }
    setFormError(null);
  };

  // VIEW 1: FULL RESULTS VIEW FOR SELECTED SAMPLE
  if (viewingReportRecord) {
    return (
      <BloodGasReportView
        record={viewingReportRecord}
        showBidiButton={viewingReportRecord.measuredMode !== 'LABORATORY'}
        showLabValidationControls={viewingReportRecord.measuredMode === 'LABORATORY'}
        onGoToIdentify={() => {
          setViewingReportId(null);
          setIdentifyingRecordId(viewingReportRecord.id);
        }}
        extraActions={
          <button
            type="button"
            onClick={() => setViewingReportId(null)}
            className="px-3 py-1 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-[11px] font-bold flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{tr(language, 'Volver', 'Back')}</span>
          </button>
        }
      />
    );
  }

  // VIEW 2: DEFERRED IDENTIFICATION FORM SCREEN
  if (activeIdentifyRecord) {
    const statusMeta = getIdentificationBadgeMeta(activeIdentifyRecord.identificationStatus, language);
    const isAlreadyIdentified =
      activeIdentifyRecord.identificationStatus !== undefined &&
      activeIdentifyRecord.identificationStatus !== 'PENDIENTE_IDENTIFICACION';

    return (
      <div className="h-full flex flex-col gap-2 min-h-0 overflow-hidden">
        {/* Top Immutable Analysis Header */}
        <div className="bg-white border border-slate-300 rounded-lg p-2.5 space-y-1.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs text-slate-900">
                {activeIdentifyRecord.analysisUniqueId ?? activeIdentifyRecord.sampleNumber}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-bold ${statusMeta.cls}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotCls}`} />
                <span>{statusMeta.label}</span>
              </span>
              <span className="text-[11px] text-slate-600">
                {tr(language, 'Medición:', 'Measured:')}{' '}
                <strong>{new Date(activeIdentifyRecord.timestamp).toLocaleString(localeFor(language))}</strong> ·{' '}
                {tr(language, 'Operador:', 'Operator:')}{' '}
                <strong>{activeIdentifyRecord.operatorName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-semibold">
              <Lock className="w-3 h-3 text-slate-500" />
              <span>{tr(language, 'Valores analíticos bloqueados e inmutables', 'Analytical values locked & immutable')}</span>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded bg-orange-50 border border-orange-300 text-[11px] text-orange-950 flex flex-wrap items-center gap-2">
            <span className="font-bold">{tr(language, 'Referencia:', 'Reference:')}</span>
            <span className={activeIdentifyRecord.quickReference ? 'font-semibold' : 'italic text-slate-600'}>
              {activeIdentifyRecord.quickReference ||
                tr(language, 'Sin referencia anotada durante la medición rápida', 'No reference entered during quick measurement')}
            </span>
          </div>
        </div>

        {/* Immutable Analytical Values Strip */}
        <div className="bg-[#F6F8FA] border border-slate-300 rounded-lg px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] shrink-0">
          <div className="flex flex-wrap items-center gap-3 font-mono">
            <span>
              pH <strong>{activeIdentifyRecord.values.pH?.toFixed(3) ?? tr(language, 'N/D', 'N/A')}</strong>
            </span>
            <span>
              pCO₂ <strong>{activeIdentifyRecord.values.pCO2?.toFixed(1) ?? tr(language, 'N/D', 'N/A')}</strong>
            </span>
            <span>
              pO₂ <strong>{activeIdentifyRecord.values.pO2?.toFixed(1) ?? tr(language, 'N/D', 'N/A')}</strong>
            </span>
            <span>
              HCO₃⁻ <strong>{activeIdentifyRecord.values.HCO3?.toFixed(1) ?? tr(language, 'N/D', 'N/A')}</strong>
            </span>
            <span>
              K⁺ <strong>{activeIdentifyRecord.values.K?.toFixed(2) ?? tr(language, 'N/D', 'N/A')}</strong>
            </span>
            <span>
              Lac <strong>{activeIdentifyRecord.values.Lac?.toFixed(2) ?? tr(language, 'N/D', 'N/A')}</strong>
            </span>
          </div>
          {activeIdentifyRecord.hasCriticalValues && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700">
              <ShieldAlert className="w-3.5 h-3.5" />
              {tr(language, 'Valores críticos detectados', 'Critical values detected')}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveIdentification} className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
            {/* LEFT 6 COLS: PATIENT DATA */}
            <div className="lg:col-span-6 bg-white border border-slate-300 rounded-lg p-3 flex flex-col justify-between gap-2 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h3 className="font-display font-bold text-sm text-slate-900">
                  {tr(language, 'Datos del Paciente', 'Patient Data')} (
                  {isMeasuredClinical
                    ? tr(language, 'Modo Clínico', 'Clinical Mode')
                    : tr(language, 'Modo Laboratorio', 'Laboratory Mode')}
                  )
                </h3>
                {isAlreadyIdentified && (
                  <span className="text-[10.5px] font-bold text-[#0066B2] bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                    {tr(language, 'Operación auditada de corrección disponible', 'Audited correction available')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isMeasuredClinical
                      ? tr(language, 'Nº Historia Clínica', 'Medical Record ID')
                      : tr(language, 'Nº Laboratorio', 'Laboratory ID')}
                  </label>
                  <input
                    type="text"
                    value={patientIdInput}
                    onChange={(e) => {
                      const upper = e.target.value.toUpperCase();
                      setPatientIdInput(upper);
                      setFormError(null);
                      if (isMeasuredClinical) {
                        if (demographics && upper.trim() !== demographics.patientId) {
                          setDemographics(null);
                          setDemographicsConfirmed(false);
                        }
                        if (countdown !== null) setCountdown(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        triggerBarcodeOrLookup(patientIdInput);
                      }
                    }}
                    placeholder={isMeasuredClinical ? tr(language, 'Ej. DEMO001', 'e.g. DEMO001') : tr(language, 'Ej. LAB-1001', 'e.g. LAB-1001')}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono uppercase focus:outline-none focus:border-[#E8630A]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={() => triggerBarcodeOrLookup(patientIdInput)}
                    className="w-full px-2.5 py-1.5 rounded border border-[#0066B2] bg-[#EDF5FC] hover:bg-sky-100 text-[11px] font-bold text-[#0066B2] whitespace-nowrap"
                  >
                    {isMeasuredClinical ? tr(language, 'Buscar NHC', 'Lookup ID') : tr(language, 'Validar ID', 'Validate ID')}
                  </button>
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleSimulateBarcode}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-[11px] font-bold text-slate-800 flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    <Barcode className="w-4 h-4 text-[#E8630A]" />
                    <span>{tr(language, 'Código', 'Barcode')}</span>
                  </button>
                </div>
              </div>

              {isMeasuredClinical && countdown !== null && (
                <div className="bg-[#FFF8F3] border border-[#E8630A] rounded p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="w-7 h-7 rounded-full bg-[#E8630A] text-white font-mono flex items-center justify-center">
                      {countdown}
                    </span>
                    <span>
                      {tr(language, 'Consultando demográficos de', 'Looking up demographics for')}{' '}
                      {patientIdInput.trim().toUpperCase()}...
                    </span>
                  </div>
                  <Loader2 className="w-4 h-4 text-[#E8630A] animate-spin" />
                </div>
              )}

              {isMeasuredClinical && demographics && countdown === null && (
                <div
                  className={`rounded border-2 p-2.5 space-y-2 text-xs ${
                    demographicsConfirmed
                      ? 'bg-emerald-50/70 border-emerald-400'
                      : 'bg-amber-50/80 border-amber-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <UserCheck
                        className={`w-4 h-4 ${
                          demographicsConfirmed ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      />
                      <span>
                        {demographicsConfirmed
                          ? tr(language, 'Demográficos validados', 'Demographics validated')
                          : tr(language, 'Validar demográficos antes de continuar', 'Validate demographics before continuing')}
                      </span>
                    </span>
                    <span className="font-mono text-[#0066B2]">{demographics.patientId}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="bg-white border border-slate-200 rounded p-1.5">
                      <div className="text-[9.5px] text-slate-500">{tr(language, 'Nombre', 'Name')}</div>
                      <div className="font-bold text-slate-900 truncate">{demographics.fullName}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-1.5">
                      <div className="text-[9.5px] text-slate-500">{tr(language, 'Sexo', 'Sex')}</div>
                      <div className="font-bold text-slate-900">
                        {language === 'en' ? (demographics.sex === 'Masculino' ? 'Male' : 'Female') : demographics.sex}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-1.5">
                      <div className="text-[9.5px] text-slate-500">{tr(language, 'F. Nac.', 'DOB')}</div>
                      <div className="font-mono font-bold text-slate-900">
                        {demographics.birthDate} ({demographics.ageYears}{tr(language, 'a', 'y')})
                      </div>
                    </div>
                  </div>
                  {!demographicsConfirmed && (
                    <button
                      type="button"
                      onClick={() => {
                        setDemographicsConfirmed(true);
                        setFormError(null);
                      }}
                      className="w-full py-1.5 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{tr(language, 'Validar datos demográficos', 'Validate patient demographics')}</span>
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {tr(language, 'Servicio asistencial', 'Clinical service')}
                  </label>
                  <select
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                  >
                    {SERVICES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {tr(language, 'Ubicación del paciente', 'Patient location')}
                  </label>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder={tr(language, 'Ej. Box 02 / Cama 14', 'e.g. Box 02 / Bed 14')}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT 6 COLS: SAMPLE DATA */}
            <div className="lg:col-span-6 bg-white border border-slate-300 rounded-lg p-3 flex flex-col justify-between gap-2 overflow-hidden">
              <h3 className="font-display font-bold text-xs text-slate-900 border-b border-slate-200 pb-1 shrink-0">
                {tr(language, 'Datos de la Muestra', 'Sample Data')}
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {tr(language, 'Tipo de muestra', 'Sample type')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Arterial', 'Venosa', 'Capilar'] as SampleType[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSampleTypeInput(st)}
                      className={`py-1.5 rounded border text-xs font-bold transition-colors ${
                        sampleTypeInput === st
                          ? 'bg-[#C9CFD6] border-[#64748B] text-slate-950'
                          : 'bg-[#F1F4F7] border-slate-300 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {translateSampleType(language, st)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {tr(language, 'Lugar de extracción', 'Collection site')}
                  </label>
                  <select
                    value={extractionSiteInput}
                    onChange={(e) => setExtractionSiteInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                  >
                    {EXTRACTION_SITES.map((site) => (
                      <option key={site} value={site}>
                        {site}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {tr(language, 'Fecha y hora de extracción', 'Collection date & time')}
                  </label>
                  <input
                    type="datetime-local"
                    value={extractionDateTimeInput}
                    onChange={(e) => setExtractionDateTimeInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    FiO₂ (%)
                  </label>
                  <input
                    type="number"
                    min={21}
                    max={100}
                    value={fio2Input}
                    onChange={(e) => setFio2Input(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {tr(language, 'Oxigenoterapia', 'Oxygen therapy')}
                  </label>
                  <select
                    value={oxygenTherapyInput}
                    onChange={(e) => setOxygenTherapyInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                  >
                    {OXYGEN_THERAPIES.map((ox) => (
                      <option key={ox} value={ox}>
                        {ox}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {tr(language, 'Temperatura °C (opcional)', 'Temperature °C (optional)')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={28}
                    max={43}
                    value={tempInput}
                    onChange={(e) => setTempInput(e.target.value)}
                    placeholder="37.0"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              {activeIdentifyRecord.identificationAudit &&
                activeIdentifyRecord.identificationAudit.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded p-2 space-y-1 max-h-20 overflow-y-auto">
                    <div className="text-[10px] font-bold uppercase text-slate-600 flex items-center gap-1">
                      <History className="w-3 h-3" />
                      <span>{tr(language, 'Trazabilidad del análisis', 'Analysis traceability')}</span>
                    </div>
                    {activeIdentifyRecord.identificationAudit.map((entry, idx) => (
                      <div key={idx} className="text-[10px] text-slate-700 leading-snug">
                        <span className="font-mono text-slate-500">
                          {new Date(entry.timestamp).toLocaleString(localeFor(language))}
                        </span>{' '}
                        · <strong>{entry.userName}</strong>: {entry.details}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>

          {formError && (
            <div className="p-2 rounded bg-red-50 border border-red-300 text-xs font-semibold text-red-800 shrink-0">
              {formError}
            </div>
          )}

          {/* ACTION BAR */}
          <div className="bg-white border border-slate-300 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{tr(language, 'GUARDAR IDENTIFICACIÓN', 'SAVE IDENTIFICATION')}</span>
              </button>
              <button
                type="button"
                onClick={() => setIdentifyingRecordId(null)}
                className="px-4 py-2 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-xs font-bold text-slate-800"
              >
                {tr(language, 'CANCELAR', 'CANCEL')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = activeIdentifyRecord.id;
                  setIdentifyingRecordId(null);
                  setViewingReportId(id);
                }}
                className="px-4 py-2 rounded border border-[#0066B2] bg-[#EDF5FC] hover:bg-sky-100 text-xs font-bold text-[#0066B2]"
              >
                {tr(language, 'VOLVER A RESULTADOS', 'BACK TO RESULTS')}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!isAlreadyIdentified}
                onClick={() => {
                  const id = activeIdentifyRecord.id;
                  setIdentifyingRecordId(null);
                  setViewingReportId(id);
                }}
                title={
                  isAlreadyIdentified
                    ? tr(language, 'Abrir informe e imprimir ticket', 'Open report and print ticket')
                    : tr(language, 'Debe guardar la identificación antes de imprimir', 'Must save identification before printing')
                }
                className="px-3.5 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed text-xs font-bold text-slate-800 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-[#0066B2]" />
                <span>{tr(language, 'Imprimir', 'Print')}</span>
              </button>

              <button
                type="button"
                disabled={
                  !isAlreadyIdentified ||
                  activeIdentifyRecord.identificationStatus === 'IDENTIFICADA_TRANSMITIDA'
                }
                onClick={() => transmitRecordToLis(activeIdentifyRecord.id)}
                title={
                  !isAlreadyIdentified
                    ? tr(language, 'No se transmite al LIS hasta identificar la muestra', 'Not sent to LIS until sample is identified')
                    : activeIdentifyRecord.identificationStatus === 'IDENTIFICADA_TRANSMITIDA'
                      ? tr(language, 'Ya transmitida al LIS', 'Already sent to LIS')
                      : tr(language, 'Transmitir resultado identificado al LIS', 'Transmit identified result to LIS')
                }
                className={`px-3.5 py-2 rounded text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  activeIdentifyRecord.identificationStatus === 'IDENTIFICADA_TRANSMITIDA'
                    ? 'bg-emerald-600 text-white opacity-85 cursor-default'
                    : 'bg-[#0066B2] hover:bg-[#005291] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {activeIdentifyRecord.identificationStatus === 'IDENTIFICADA_TRANSMITIDA'
                    ? tr(language, 'Transmitida a LIS', 'Sent to LIS')
                    : tr(language, 'Enviar a LIS', 'Send to LIS')}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // VIEW 3: MAIN PENDING / UNIDENTIFIED RESULTS LIST
  return (
    <div className="h-full flex flex-col gap-2 min-h-0 min-w-0 overflow-hidden">
      {/* Header + 3 Visual Status Counters */}
      <div className="bg-white border border-slate-300 rounded-xl px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              title={tr(language, 'Volver a pantalla de medición', 'Back to measurement screen')}
              className="p-1.5 rounded border border-slate-300 bg-[#F6F8FA] hover:bg-slate-200 text-slate-700 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-7 h-7 rounded-lg bg-orange-100 border border-orange-300 text-orange-700 flex items-center justify-center shrink-0">
            <FileClock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-xs sm:text-sm text-slate-900 truncate">
              {tr(
                language,
                'Sin identificar · Medición Rápida (Identificación Diferida)',
                'Unidentified · Quick Measurement (Deferred Identification)'
              )}
            </h2>
            <p className="text-[10.5px] text-slate-600 truncate">
              {tr(
                language,
                'Gasometrías realizadas sin identificación previa. No se imprimen ni transmiten al LIS hasta completar su asociación.',
                'Blood gases measured without prior ID. Printing and LIS transmission are blocked until patient assignment.'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] shrink-0">
          <div className="px-2 py-1 rounded-lg border border-orange-400 bg-orange-100 text-orange-950 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>{tr(language, 'Pendientes:', 'Pending:')} {counts.pending}</span>
          </div>
          <div className="px-2 py-1 rounded-lg border border-sky-400 bg-sky-100 text-sky-950 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-600" />
            <span>{tr(language, 'Pend. LIS:', 'Pending LIS:')} {counts.pendingLis}</span>
          </div>
          <div className="px-2 py-1 rounded-lg border border-emerald-400 bg-emerald-100 text-emerald-950 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>{tr(language, 'Transmitidas:', 'Transmitted:')} {counts.transmitted}</span>
          </div>
        </div>
      </div>

      {/* Search, Filters & Chronological Sort */}
      <div className="bg-white border border-slate-300 rounded-xl p-2 flex flex-wrap items-end justify-between gap-2 shrink-0 min-w-0">
        <div className="flex flex-wrap items-end gap-2 flex-1 min-w-0">
          <div className="min-w-[160px] flex-1 max-w-[230px]">
            <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5 truncate">
              {tr(language, 'Buscar ID o paciente', 'Search ID or patient')}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr(language, 'BG-2026-... o DEMO...', 'BG-2026-... or DEMO...')}
                className="w-full pl-7 pr-2 py-1 rounded border border-slate-300 text-[11px] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
              {tr(language, 'Fecha', 'Date')}
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2 py-1 rounded border border-slate-300 text-[11px] font-mono bg-white"
            />
          </div>

          <div className="min-w-[155px] max-w-[220px]">
            <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
              {tr(language, 'Estado', 'Status')}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | IdentificationStatus)}
              className="w-full px-2 py-1 rounded border border-slate-300 text-[11px] bg-white"
            >
              <option value="ALL">
                {tr(language, 'Todos', 'All')} ({quickRecords.length})
              </option>
              <option value="PENDIENTE_IDENTIFICACION">
                {tr(language, 'Pendiente ID (Naranja)', 'Pending ID (Orange)')}
              </option>
              <option value="IDENTIFICADA_PENDIENTE_LIS">
                {tr(language, 'Pendiente LIS (Azul)', 'Pending LIS (Blue)')}
              </option>
              <option value="IDENTIFICADA_TRANSMITIDA">
                {tr(language, 'Transmitida (Verde)', 'Transmitted (Green)')}
              </option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSortOrder((s) => (s === 'DESC' ? 'ASC' : 'DESC'))}
          className="px-2.5 py-1 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-[11px] font-bold text-slate-800 flex items-center gap-1 shrink-0"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[#0066B2]" />
          <span>
            {sortOrder === 'DESC'
              ? tr(language, 'Más recientes', 'Newest first')
              : tr(language, 'Más antiguos', 'Oldest first')}
          </span>
        </button>
      </div>

      {/* Selected Single-Row Quick Action Bar */}
      {(() => {
        const selectedRec = selectedRecordId
          ? filteredRecords.find((r) => r.id === selectedRecordId)
          : undefined;
        if (!selectedRec) return null;
        const isSelPending = selectedRec.identificationStatus === 'PENDIENTE_IDENTIFICACION';
        const isSelPendingLis = selectedRec.identificationStatus === 'IDENTIFICADA_PENDIENTE_LIS';
        return (
          <div className="bg-white border-2 border-[#0066B2] rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-bold text-[#0066B2]">
                {tr(language, 'Seleccionado:', 'Selected:')}
              </span>
              <span className="font-mono font-bold text-slate-900">
                {selectedRec.analysisUniqueId ?? selectedRec.sampleNumber}
              </span>
              {selectedRec.quickReference && (
                <span className="px-2 py-0.5 rounded bg-orange-50 border border-orange-300 text-orange-950 font-semibold text-[11px]">
                  Ref: {selectedRec.quickReference}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewRecordId(selectedRec.id)}
                className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-800 inline-flex items-center gap-1"
              >
                <Eye className="w-3 h-3 text-[#0066B2]" />
                <span>{tr(language, 'Vista previa', 'Preview')}</span>
              </button>
              <button
                type="button"
                onClick={() => setIdentifyingRecordId(selectedRec.id)}
                className="px-2 py-1 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-[11px] font-bold inline-flex items-center gap-1"
              >
                <UserCheck className="w-3 h-3" />
                <span>
                  {isSelPending ? tr(language, 'Identificar', 'Identify') : tr(language, 'Corregir ID', 'Edit ID')}
                </span>
              </button>
              {isSelPendingLis && (
                <button
                  type="button"
                  onClick={() => transmitRecordToLis(selectedRec.id)}
                  className="px-2 py-1 rounded bg-[#0066B2] hover:bg-[#005291] text-white text-[11px] font-bold inline-flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>{tr(language, 'Enviar a LIS', 'Send to LIS')}</span>
                </button>
              )}
              <button
                type="button"
                disabled={isSelPending}
                onClick={() => !isSelPending && setViewingReportId(selectedRec.id)}
                title={
                  isSelPending
                    ? tr(
                        language,
                        'No se puede imprimir una medición pendiente de identificación',
                        'Cannot print a measurement pending identification'
                      )
                    : tr(language, 'Abrir informe para imprimir', 'Open report to print')
                }
                className="px-2 py-1 rounded border border-[#0066B2] bg-[#EDF5FC] hover:bg-sky-100 disabled:opacity-45 disabled:cursor-not-allowed text-[11px] font-bold text-[#0066B2] inline-flex items-center gap-1"
              >
                {isSelPending ? <Lock className="w-3 h-3" /> : <Printer className="w-3 h-3" />}
                <span>{tr(language, 'Imprimir', 'Print')}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Pending Identification Table (Compact Proportional Width — Zero Horizontal Scroll) */}
      <div className="bg-white border border-slate-300 rounded-xl flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed text-left border-collapse text-[11px]">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10.5px] font-semibold text-slate-600 z-10">
              <tr>
                <th className="py-2 px-1 text-center w-[4%]">{tr(language, 'Sel', 'Sel')}</th>
                <th className="py-2 px-1.5 w-[15%]">{tr(language, 'ID único', 'Unique ID')}</th>
                <th className="py-2 px-1.5 w-[10%]">{tr(language, 'Referencia', 'Reference')}</th>
                <th className="py-2 px-1.5 w-[13.5%]">{tr(language, 'Medición / Extr.', 'Meas. / Coll.')}</th>
                <th className="py-2 px-1 w-[7.5%]">{tr(language, 'Muestra', 'Sample')}</th>
                <th className="py-2 px-1.5 w-[12%]">{tr(language, 'Operador', 'Operator')}</th>
                <th className="py-2 px-1.5 w-[10%]">{tr(language, 'Paciente', 'Patient')}</th>
                <th className="py-2 px-1 w-[11.5%]">{tr(language, 'Estado', 'Status')}</th>
                <th className="py-2 px-1.5 text-right w-[16%]">{tr(language, 'Acciones', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    {tr(
                      language,
                      'No hay gasometrías sin identificar o con los filtros seleccionados.',
                      'No unidentified blood gases or matching filters.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const badge = getIdentificationBadgeMeta(rec.identificationStatus, language);
                  const isPending = rec.identificationStatus === 'PENDIENTE_IDENTIFICACION';
                  const isPendingLis = rec.identificationStatus === 'IDENTIFICADA_PENDIENTE_LIS';
                  const isChecked = selectedRecordId === rec.id;
                  const uid = rec.analysisUniqueId ?? rec.sampleNumber;
                  const measuredCompact = new Date(rec.timestamp).toLocaleString(localeFor(language), {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const shortOperator = rec.operatorName.split(' ').slice(0, 2).join(' ');
                  return (
                    <tr
                      key={rec.id}
                      className={isChecked ? 'bg-sky-50/80' : 'hover:bg-slate-50'}
                    >
                      <td className="py-1.5 px-1 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            setSelectedRecordId((prev) => (prev === rec.id ? null : rec.id))
                          }
                          aria-label={`${tr(language, 'Seleccionar', 'Select')} ${uid}`}
                          className="w-3.5 h-3.5 accent-[#E8630A] cursor-pointer"
                        />
                      </td>
                      <td className="py-1.5 px-1.5 font-mono font-bold text-[10.5px] text-slate-900 truncate" title={uid}>
                        {uid}
                      </td>
                      <td className="py-1.5 px-1.5 text-slate-700 truncate" title={rec.quickReference || ''}>
                        {rec.quickReference ? (
                          <span className="font-medium text-slate-900">{rec.quickReference}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-1.5 px-1.5 font-mono text-[10px] text-slate-600 leading-tight">
                        <div className="truncate text-slate-700">{measuredCompact}</div>
                        <div className="inline-flex items-center gap-0.5 text-slate-500">
                          <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span>{getExtractionTimeText(rec, language)}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-1 font-medium text-slate-800 truncate">
                        {translateSampleType(language, rec.sampleType)}
                      </td>
                      <td className="py-1.5 px-1.5 text-slate-700 truncate" title={rec.operatorName}>
                        {shortOperator}
                      </td>
                      <td className="py-1.5 px-1.5 font-mono font-bold text-[10.5px] truncate">
                        {isPending ? (
                          <span className="text-orange-700">{tr(language, 'SIN ASOC.', 'UNLINKED')}</span>
                        ) : (
                          <span className="text-[#0066B2]">{rec.patientId}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-1">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9.5px] font-bold whitespace-nowrap ${badge.cls}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dotCls}`} />
                          <span>{badge.shortLabel}</span>
                        </span>
                      </td>
                      <td className="py-1.5 px-1.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewRecordId(rec.id)}
                            className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 inline-flex items-center justify-center shrink-0"
                            title={tr(language, 'Vista previa analítica antes de identificar', 'Analytical preview before identifying')}
                            aria-label={tr(language, 'Vista previa', 'Preview')}
                          >
                            <Eye className="w-3.5 h-3.5 text-[#0066B2]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setIdentifyingRecordId(rec.id)}
                            className={`px-1.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 shrink-0 ${
                              isPending
                                ? 'bg-[#E8630A] hover:bg-[#D15607] text-white'
                                : 'border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-slate-800'
                            }`}
                          >
                            {isPending ? (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>{tr(language, 'Identif.', 'Identify')}</span>
                              </>
                            ) : (
                              <>
                                <Edit3 className="w-3 h-3" />
                                <span>{tr(language, 'Editar', 'Edit')}</span>
                              </>
                            )}
                          </button>

                          {isPendingLis && (
                            <button
                              type="button"
                              onClick={() => transmitRecordToLis(rec.id)}
                              className="px-1.5 py-1 rounded bg-[#0066B2] hover:bg-[#005291] text-white text-[10px] font-bold inline-flex items-center gap-0.5 shrink-0"
                              title={tr(language, 'Transmitir al LIS', 'Send to LIS')}
                            >
                              <Send className="w-2.5 h-2.5" />
                              <span>LIS</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => !isPending && setViewingReportId(rec.id)}
                            title={
                              isPending
                                ? tr(
                                    language,
                                    'No se puede imprimir una medición pendiente de identificación',
                                    'Cannot print a measurement pending identification'
                                  )
                                : tr(language, 'Abrir informe / Imprimir', 'Open report / Print')
                            }
                            aria-label={tr(language, 'Imprimir', 'Print')}
                            className="w-6 h-6 rounded border border-[#0066B2] bg-[#EDF5FC] hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed text-[#0066B2] inline-flex items-center justify-center shrink-0"
                          >
                            {isPending ? <Lock className="w-3 h-3" /> : <Printer className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: PREVIEW */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-400 rounded-xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
            <div className="px-4 py-3 border-b border-slate-200 bg-[#F6F8FA] flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-900">
                  {tr(language, 'Vista Previa Analítica', 'Analytical Preview')} ·{' '}
                  {previewRecord.analysisUniqueId ?? previewRecord.sampleNumber}
                </h3>
                <p className="text-[11px] text-slate-600">
                  {translateSampleType(language, previewRecord.sampleType)} ·{' '}
                  {tr(language, 'Medido el', 'Measured on')}{' '}
                  {new Date(previewRecord.timestamp).toLocaleString(localeFor(language))}{' '}
                  {tr(language, 'por', 'by')} {previewRecord.operatorName}
                  {previewRecord.quickReference ? ` · Ref: ${previewRecord.quickReference}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewRecordId(null)}
                className="p-1.5 rounded border border-slate-300 hover:bg-slate-200 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {previewRecord.identificationStatus === 'PENDIENTE_IDENTIFICACION' && (
                <div className="p-2.5 rounded border border-orange-400 bg-orange-100 text-xs font-bold text-orange-950 flex items-center justify-between gap-2">
                  <span>
                    {tr(
                      language,
                      'RESULTADO NO ASOCIADO A NINGÚN PACIENTE · Impresión y transmisión LIS bloqueadas.',
                      'RESULT NOT LINKED TO ANY PATIENT · Printing and LIS transmission blocked.'
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const id = previewRecord.id;
                      setPreviewRecordId(null);
                      setIdentifyingRecordId(id);
                    }}
                    className="px-3 py-1 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-[11px] font-bold shrink-0"
                  >
                    {tr(language, 'Identificar ahora', 'Identify now')}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                {PARAMETER_ORDER.map((k) => {
                  const cfg = state.config.parameters[k];
                  if (!cfg.visible || !cfg.enabled) return null;
                  const val = previewRecord.values[k];
                  const flag = previewRecord.flags[k];
                  const isAbn = flag && flag !== 'NORMAL';
                  return (
                    <div
                      key={k}
                      className={`p-2 rounded border ${
                        isAbn ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-slate-500">
                        {translateParameterShortLabel(language, k, cfg.shortLabel)} (
                        {translateParameterUnit(language, cfg.unit)})
                      </div>
                      <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">
                        {val === null || val === undefined ? tr(language, 'N/D', 'N/A') : val.toFixed(cfg.decimals)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 rounded border border-slate-200 bg-slate-50 text-xs text-slate-800">
                <strong>{tr(language, 'Orientación preliminar:', 'Preliminary guidance:')}</strong>{' '}
                {translateClinicalText(language, previewRecord.interpretation.primaryDisorder)}
              </div>
            </div>

            <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewRecordId(null)}
                className="px-4 py-1.5 rounded border border-slate-300 bg-[#ECEFF3] hover:bg-slate-200 text-xs font-bold text-slate-800"
              >
                {tr(language, 'Cerrar', 'Close')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = previewRecord.id;
                  setPreviewRecordId(null);
                  setIdentifyingRecordId(id);
                }}
                className="px-4 py-1.5 rounded bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold"
              >
                {previewRecord.identificationStatus === 'PENDIENTE_IDENTIFICACION'
                  ? tr(language, 'Identificar muestra', 'Identify sample')
                  : tr(language, 'Editar / Corregir identificación', 'Edit / Correct identification')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
