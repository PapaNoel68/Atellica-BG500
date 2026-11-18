import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  Droplets,
  FlaskConical,
  LayoutDashboard,
  Lock,
  MessageSquareWarning,
  Package,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { ClinicalWorkspace } from '@/src/components/clinical/ClinicalWorkspace';
import { LabDashboardView, LabSection } from '@/src/components/lab/LabDashboardView';
import { LabQCView } from '@/src/components/lab/LabQCView';
import { LabCalibrationsView } from '@/src/components/lab/LabCalibrationsView';
import { LabConsumablesView } from '@/src/components/lab/LabConsumablesView';
import { LabMaintenanceView } from '@/src/components/lab/LabMaintenanceView';
import { LabResultsView } from '@/src/components/lab/LabResultsView';
import { LabIndicatorsView } from '@/src/components/lab/LabIndicatorsView';
import { LabConfigView } from '@/src/components/lab/LabConfigView';
import { LabAuditView } from '@/src/components/lab/LabAuditView';
import { AtellicaConnectPanel } from '@/src/components/common/AtellicaConnectPanel';
import { LabAdminView } from '@/src/components/lab/LabAdminView';
import { DemoSimulationCenterView } from '@/src/components/lab/DemoSimulationCenterView';
import { UnidentifiedSamplesView } from '@/src/components/common/UnidentifiedSamplesView';
import { CartridgeStatusView } from '@/src/components/common/CartridgeStatusView';
import { tr } from '@/src/i18n/translations';

export const LabWorkspace: React.FC = () => {
  const { can, pendingMessagesCount, activeErrorsCount, navRequest, language } = useAnalyzer();
  const [section, setSection] = useState<LabSection>('MEASURE');
  const [unidentifiedTargetRecordId, setUnidentifiedTargetRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (navRequest && navRequest.mode === 'LABORATORY') {
      const valid: LabSection[] = [
        'MEASURE',
        'CARTRIDGE_STATUS',
        'UNIDENTIFIED',
        'DASHBOARD',
        'QC',
        'CALIBRATIONS',
        'CONSUMABLES',
        'MAINTENANCE',
        'RESULTS',
        'INDICATORS',
        'ATELLICA',
        'CONFIG',
        'AUDIT',
        'ADMIN',
        'DEMO_CENTER',
      ];
      if (valid.includes(navRequest.target as LabSection)) {
        if (navRequest.target === 'UNIDENTIFIED') {
          setUnidentifiedTargetRecordId(navRequest.recordId ?? null);
        } else {
          setUnidentifiedTargetRecordId(null);
        }
        setSection(navRequest.target as LabSection);
      }
    }
  }, [navRequest]);

  const navItems: {
    id: LabSection;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    restricted?: boolean;
  }[] = [
    { id: 'MEASURE', label: tr(language, 'Medir Muestras', 'Measure Samples'), Icon: Droplets },
    { id: 'DASHBOARD', label: tr(language, 'Panel General', 'Overview'), Icon: LayoutDashboard },
    { id: 'QC', label: tr(language, 'Control Calidad', 'Quality Control'), Icon: ShieldAlert },
    { id: 'CALIBRATIONS', label: tr(language, 'Calibraciones', 'Calibrations'), Icon: RefreshCw },
    { id: 'CONSUMABLES', label: tr(language, 'Consumibles', 'Consumables'), Icon: Package },
    {
      id: 'MAINTENANCE',
      label: tr(language, 'Mantenimiento', 'Maintenance'),
      Icon: Wrench,
      badge: activeErrorsCount > 0 ? activeErrorsCount : undefined,
    },
    { id: 'RESULTS', label: tr(language, 'Resultados', 'Results'), Icon: FlaskConical },
    { id: 'INDICATORS', label: tr(language, 'Indicadores', 'Indicators'), Icon: BarChart3 },
    {
      id: 'ATELLICA',
      label: tr(language, 'Avisos Coordinador', 'Coordinator Notices'),
      Icon: MessageSquareWarning,
      badge: pendingMessagesCount > 0 ? pendingMessagesCount : undefined,
    },
    {
      id: 'CONFIG',
      label: tr(language, 'Configuración', 'Configuration'),
      Icon: Settings2,
      restricted: !can('EDIT_ANALYTICAL_CONFIG'),
    },
    {
      id: 'AUDIT',
      label: tr(language, 'Auditoría', 'Audit Log'),
      Icon: ClipboardList,
      restricted: !can('VIEW_AUDIT'),
    },
    {
      id: 'ADMIN',
      label: tr(language, 'Admin / Mensajería', 'Admin / Messaging'),
      Icon: Users,
      restricted: !can('MANAGE_USERS'),
    },
    { id: 'DEMO_CENTER', label: tr(language, 'Centro Simulación', 'Simulation Center'), Icon: Sparkles },
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-[#EFF6FF] dark:bg-[#1C1E21] transition-colors">
      {/* Fixed Tactile Left Instrument Rail */}
      <aside className="lg:w-56 bg-[#DBEAFE] dark:bg-[#23262A] border-b lg:border-b-0 lg:border-r border-blue-200 dark:border-neutral-700 p-2 flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto shrink-0">
        {navItems.map((item) => {
          const Icon = item.Icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`min-h-[42px] flex items-center justify-between gap-2 px-3 py-2 rounded border text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#D2D8E0] border-[#E8630A] text-slate-950 shadow-xs'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#E8630A]' : 'text-[#0066B2]'}`} />
                <span>{item.label}</span>
              </span>
              {item.restricted ? (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              ) : item.badge !== undefined ? (
                <span
                  className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                    active ? 'bg-[#E8630A] text-white' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </aside>

      {/* Non-scrolling Laboratory Viewport (only internal lists scroll) */}
      <main className="flex-1 min-w-0 min-h-0 overflow-hidden p-2.5 lg:p-3 flex flex-col bg-[#EFF6FF] dark:bg-[#1C1E21]">
        {section === 'MEASURE' && (
          <div className="flex-1 min-h-0 flex flex-col border border-blue-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-[#EFF6FF] dark:bg-[#1C1E21]">
            <ClinicalWorkspace mode="LABORATORY" hideBottomNav />
          </div>
        )}
        {section === 'CARTRIDGE_STATUS' && (
          <div className="flex-1 min-h-0 flex flex-col border border-blue-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-[#EFF6FF] dark:bg-[#1C1E21]">
            <CartridgeStatusView onBack={() => setSection('MEASURE')} />
          </div>
        )}
        {section === 'UNIDENTIFIED' && (
          <UnidentifiedSamplesView
            initialRecordId={unidentifiedTargetRecordId}
            onBackToHome={() => {
              setUnidentifiedTargetRecordId(null);
              setSection('MEASURE');
            }}
          />
        )}
        {section === 'DASHBOARD' && <LabDashboardView onNavigate={setSection} />}
        {section === 'QC' && <LabQCView />}
        {section === 'CALIBRATIONS' && <LabCalibrationsView />}
        {section === 'CONSUMABLES' && <LabConsumablesView />}
        {section === 'MAINTENANCE' && <LabMaintenanceView />}
        {section === 'RESULTS' && <LabResultsView />}
        {section === 'INDICATORS' && <LabIndicatorsView />}
        {section === 'ATELLICA' && <AtellicaConnectPanel />}
        {section === 'CONFIG' && <LabConfigView />}
        {section === 'AUDIT' && <LabAuditView />}
        {section === 'ADMIN' && <LabAdminView />}
        {section === 'DEMO_CENTER' && <DemoSimulationCenterView />}
      </main>
    </div>
  );
};
