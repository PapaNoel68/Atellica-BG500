import React from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  MessageSquarePlus,
  PackageX,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { tr } from '@/src/i18n/translations';

export const DemoSimulationCenterView: React.FC = () => {
  const {
    state,
    language,
    currentUser,
    can,
    executeBloodGas,
    runQC,
    triggerCalibration,
    simulateConsumableStatus,
    triggerMaintenanceError,
    simulateIncomingAtellica,
    sendAtellicaOutbox,
    setCommunicationStatus,
    restoreOperationalState,
  } = useAnalyzer();

  const handleSimSample = (
    outcome: 'OK' | 'MUESTRA_INSUFICIENTE' | 'INCOHERENCIA_FORZADA' | 'RESULTADO_CRITICO',
    scenario: 'Acidosis metabólica' | 'Normal' | 'Trastorno mixto'
  ) => {
    executeBloodGas({
      patientId: `DEMO${Math.floor(100 + Math.random() * 899)}`,
      patientLocation: tr(language, 'UCI Polivalente · Demo', 'Polyvalent ICU · Demo'),
      sampleType: 'Arterial',
      operatorName: currentUser?.fullName,
      fio2: 35,
      temperatureC: 37.2,
      extractionMinutesAgo: 3,
      scenario,
      outcome,
      preanalyticalChecklist: {
        homogenized: true,
        bubblesRemoved: true,
        noClots: true,
        sufficientVolume: outcome !== 'MUESTRA_INSUFICIENTE',
      },
    });
  };

  const level2Id = state.qcLevels[1]?.id ?? state.qcLevels[0]?.id;

  const actions = [
    {
      title: tr(language, 'Simular gasometría válida', 'Simulate valid blood gas'),
      desc: tr(
        language,
        'Genera una muestra arterial con acidosis metabólica compensada (Winter) y la registra en todo el sistema.',
        'Generates an arterial sample with compensated metabolic acidosis (Winter) and records it system-wide.'
      ),
      Icon: Droplets,
      tone: 'border-sky-200 hover:border-[#0066B2]',
      disabled: !can('PERFORM_ANALYSIS'),
      onClick: () => handleSimSample('OK', 'Acidosis metabólica'),
    },
    {
      title: tr(language, 'Simular muestra insuficiente', 'Simulate insufficient sample'),
      desc: tr(
        language,
        'Simula aspiración con volumen <100 µL, abortando el ciclo y registrando alarma E-112.',
        'Simulates aspiration with volume <100 µL, aborting the cycle and logging alarm E-112.'
      ),
      Icon: AlertTriangle,
      tone: 'border-amber-200 hover:border-amber-500',
      disabled: !can('PERFORM_ANALYSIS'),
      onClick: () => handleSimSample('MUESTRA_INSUFICIENTE', 'Normal'),
    },
    {
      title: tr(language, 'Generar incoherencia fisiológica', 'Generate physiological inconsistency'),
      desc: tr(
        language,
        'Produce una muestra con discrepancia Henderson-Hasselbalch, TCO2 y suma de cooximetría para el motor de validación.',
        'Produces a sample with Henderson-Hasselbalch, TCO2, and CO-oximetry sum discrepancy for the validation engine.'
      ),
      Icon: AlertOctagon,
      tone: 'border-amber-300 hover:border-amber-600',
      disabled: !can('PERFORM_ANALYSIS'),
      onClick: () => handleSimSample('INCOHERENCIA_FORZADA', 'Normal'),
    },
    {
      title: tr(language, 'Simular resultado crítico', 'Simulate critical result'),
      desc: tr(
        language,
        'Emite pH, K+, pO2 y lactato críticos que requieren confirmación obligatoria de lectura del operador.',
        'Outputs critical pH, K+, pO2, and lactate requiring mandatory operator read confirmation.'
      ),
      Icon: ShieldAlert,
      tone: 'border-red-200 hover:border-red-500',
      disabled: !can('PERFORM_ANALYSIS'),
      onClick: () => handleSimSample('RESULTADO_CRITICO', 'Trastorno mixto'),
    },
    {
      title: tr(language, 'Generar alarma técnica', 'Generate technical alarm'),
      desc: tr(
        language,
        'Dispara una alarma de obstrucción fluídica grave (E-408) y cambia el estado general a NO DISPONIBLE.',
        'Triggers a severe fluidic obstruction alarm (E-408) and switches overall status to UNAVAILABLE.'
      ),
      Icon: Wrench,
      tone: 'border-red-300 hover:border-red-600',
      disabled: !can('MANAGE_MAINTENANCE'),
      onClick: () =>
        triggerMaintenanceError({
          code: 'E-408',
          description: 'Fallo de presión en cámara de medida durante lavado automático.',
          possibleCause: 'Depósito de fibrina en válvula rotatoria o fuga en junta del cartucho.',
          recommendedChecks: [
            'Inspeccionar encaje del cartucho de medida.',
            'Ejecutar diagnóstico de bomba peristáltica.',
          ],
          severity: 'Crítica',
        }),
    },
    {
      title: tr(language, 'Simular control fuera de rango', 'Simulate out-of-range QC'),
      desc: tr(
        language,
        'Ejecuta un CCI Nivel 2 con violación Westgard 1_3s (> +3 DE), abre no conformidad y bloquea muestras.',
        'Runs Level 2 IQC with Westgard 1_3s violation (> +3 SD), opens a non-conformity, and locks sample testing.'
      ),
      Icon: Activity,
      tone: 'border-red-200 hover:border-red-500',
      disabled: !can('MANAGE_QC'),
      onClick: () => runQC({ levelId: level2Id, mode: 'FUERA_DE_RANGO_1_3S' }),
    },
    {
      title: tr(language, 'Simular calibración fallida', 'Simulate failed calibration'),
      desc: tr(
        language,
        'Falla la calibración de 2 puntos por pendiente fuera de rango, generando incidencia CAL-502.',
        'Fails 2-point calibration due to out-of-range slope, generating incident CAL-502.'
      ),
      Icon: RefreshCw,
      tone: 'border-red-200 hover:border-red-500',
      disabled: !can('MANAGE_CALIBRATIONS'),
      onClick: () =>
        triggerCalibration(
          'Calibración 2-Puntos',
          'FALLIDA',
          'Simulación de fallo de pendiente en electrodo pO2'
        ),
    },
    {
      title: tr(language, 'Simular consumible agotado', 'Simulate depleted consumable'),
      desc: tr(
        language,
        'Agota el Cartucho de Medida (0 tests restantes), pasando el analizador a NO DISPONIBLE.',
        'Depletes the Measurement Cartridge (0 tests remaining), switching the analyzer to UNAVAILABLE.'
      ),
      Icon: PackageX,
      tone: 'border-red-200 hover:border-red-500',
      disabled: !can('MANAGE_CONSUMABLES'),
      onClick: () => simulateConsumableStatus('CONS-01', 0, 'AGOTADO'),
    },
    {
      title: tr(language, 'Recibir mensaje de Atellica Connect', 'Receive Atellica Connect message'),
      desc: tr(
        language,
        'Simula la recepción inmediata de una comunicación urgente desde Atellica Connect hacia el equipo.',
        'Simulates immediate reception of an urgent communication from Atellica Connect to the analyzer.'
      ),
      Icon: MessageSquarePlus,
      tone: 'border-sky-200 hover:border-[#0066B2]',
      disabled: !can('SIMULATE_ATELLICA'),
      onClick: () =>
        simulateIncomingAtellica({
          title: tr(
            language,
            'Solicitud urgente de verificación POCT',
            'Urgent POCT verification request'
          ),
          titleEs: 'Solicitud urgente de verificación POCT',
          titleEn: 'Urgent POCT verification request',
          body: tr(
            language,
            'Atellica Connect solicita revisar los avisos de calidad pendientes en RP500e-01 antes del cambio de turno.',
            'Atellica Connect requests reviewing pending quality notices on RP500e-01 before shift handover.'
          ),
          bodyEs:
            'Atellica Connect solicita revisar los avisos de calidad pendientes en RP500e-01 antes del cambio de turno.',
          bodyEn:
            'Atellica Connect requests reviewing pending quality notices on RP500e-01 before shift handover.',
          type: 'Comunicación urgente',
          priority: 'Urgente',
          sender: tr(
            language,
            'Atellica Connect · Middleware Central',
            'Atellica Connect · Central Middleware'
          ),
          senderEs: 'Atellica Connect · Middleware Central',
          senderEn: 'Atellica Connect · Central Middleware',
        }),
    },
    {
      title: tr(language, 'Enviar mensaje a Atellica Connect', 'Send message to Atellica Connect'),
      desc: tr(
        language,
        'Envía una notificación simulada desde el gasómetro hacia la bandeja de salida de Atellica Connect.',
        'Sends a simulated notification from the blood gas analyzer to the Atellica Connect outbox.'
      ),
      Icon: Send,
      tone: 'border-sky-200 hover:border-[#0066B2]',
      disabled: !can('REPORT_INCIDENT'),
      onClick: () =>
        sendAtellicaOutbox({
          category: 'Aviso de incidencia',
          subject: 'Notificación de demostración desde RP500e-01',
          body: 'Comunicación de prueba enviada desde el Centro de Simulación hacia Atellica Connect.',
        }),
    },
    {
      title: tr(language, 'Simular desconexión de comunicaciones', 'Simulate communications disconnect'),
      desc: tr(
        language,
        'Cambia el enlace con Atellica Connect a DESCONECTADO y actualiza la cabecera a OPERATIVO CON ADVERTENCIAS.',
        'Switches Atellica Connect link to DISCONNECTED and updates header to OPERATIONAL WITH WARNINGS.'
      ),
      Icon: WifiOff,
      tone: 'border-amber-200 hover:border-amber-500',
      disabled: !can('MANAGE_MAINTENANCE'),
      onClick: () =>
        setCommunicationStatus(
          state.communicationStatus === 'CONECTADO' ? 'DESCONECTADO' : 'CONECTADO'
        ),
    },
    {
      title: tr(language, 'Restaurar estado operativo', 'Restore operational state'),
      desc: tr(
        language,
        'Resuelve alarmas activas, restablece consumibles y comunicaciones, y devuelve el equipo a estado OPERATIVO.',
        'Resolves active alarms, restores consumables and communications, and returns the analyzer to OPERATIONAL status.'
      ),
      Icon: CheckCircle2,
      tone: 'border-emerald-300 bg-emerald-50/40 hover:border-emerald-600',
      disabled: !can('MANAGE_MAINTENANCE'),
      onClick: () => restoreOperationalState(),
    },
  ];

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0 overflow-hidden">
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#0066B2]" />
          <span>{tr(language, 'Centro de Simulación y Demostración Rápida', 'Simulation & Quick Demo Center')}</span>
        </h2>
        <p className="text-[11px] text-slate-600">
          {tr(
            language,
            'Disparadores directos para demostrar escenarios clínicos, preanalíticos, de calidad, técnicos y comunicaciones en tiempo real.',
            'Direct triggers to demonstrate clinical, preanalytical, quality, technical, and communication scenarios in real time.'
          )}
        </p>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-2 lg:grid-cols-4 grid-rows-3 gap-2.5 overflow-hidden">
        {actions.map((act, idx) => {
          const Icon = act.Icon;
          return (
            <button
              key={idx}
              type="button"
              disabled={act.disabled}
              onClick={act.onClick}
              className={`text-left bg-white border rounded-xl p-3 transition-all flex flex-col justify-between disabled:opacity-45 disabled:cursor-not-allowed overflow-hidden ${act.tone}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Icon className="w-4 h-4 text-[#0066B2]" />
                  {act.disabled && (
                    <span className="text-[10.5px] font-medium text-red-700">{tr(language, 'Sin permiso', 'No permission')}</span>
                  )}
                </div>
                <h3 className="font-display font-bold text-xs text-slate-900 mt-1.5 leading-snug">
                  {act.title}
                </h3>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-3">{act.desc}</p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] font-semibold text-[#0066B2]">
                {tr(language, 'Ejecutar escenario →', 'Run scenario →')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
