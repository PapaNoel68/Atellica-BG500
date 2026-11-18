/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CalendarClock, MessageSquareWarning, Monitor } from 'lucide-react';
import { AnalyzerProvider, useAnalyzer } from '@/src/store/AnalyzerContext';
import { LoginAndModeScreen } from '@/src/components/auth/LoginAndModeScreen';
import { AnalyzerHeader } from '@/src/components/common/AnalyzerHeader';
import { ClinicalWorkspace } from '@/src/components/clinical/ClinicalWorkspace';
import { LabWorkspace } from '@/src/components/lab/LabWorkspace';
import { ToastContainer } from '@/src/components/common/ToastContainer';
import { FeatureManualModal } from '@/src/components/common/FeatureManualModal';
import { ScreenSaverOverlay } from '@/src/components/common/ScreenSaverOverlay';
import { tr } from '@/src/i18n/translations';

const AppShell: React.FC = () => {
  const {
    hydrated,
    currentUser,
    activeMode,
    themeMode,
    language,
    desyncPopupMode,
    dismissDesyncPopup,
    clotPortOverlayOpen,
    setClotPortOverlayOpen,
    loginAtellicaPopupOpen,
    dismissLoginAtellicaPopup,
    confirmLoginAtellicaPopup,
  } = useAnalyzer();
  const [frameMode, setFrameMode] = useState<'FILL' | '12INCH'>('12INCH');

  if (!hydrated) {
    return (
      <div className="h-screen w-screen bg-[#DCE2E8] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-300 rounded-xl p-6 text-center space-y-2 max-w-sm w-full text-slate-900 shadow-sm">
          <div className="font-display font-bold text-base">
            {tr(language, 'RAPIDPoint 500e · Inicializando Sistema', 'RAPIDPoint 500e · Initializing System')}
          </div>
          <p className="text-xs text-slate-500 font-mono">
            {tr(language, 'Cargando memoria interna (IndexedDB)...', 'Loading internal memory (IndexedDB)...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#CBD2DA] flex items-center justify-center overflow-hidden sm:p-3">
      <div
        className={`bg-[#E9ECEF] flex flex-col overflow-hidden border-2 border-[#B8C0CA] shadow-2xl transition-all ${
          frameMode === '12INCH'
            ? 'w-full max-w-[1280px] h-full max-h-[820px] rounded-2xl p-2 sm:p-3'
            : 'w-full h-full sm:rounded-xl p-1.5 sm:p-2'
        }`}
      >
        {/* Top molded instrument latch detail */}
        <div className="hidden sm:flex items-center justify-center pb-1.5 shrink-0">
          <div className="w-24 h-1.5 rounded-full bg-[#C7CDD6] border border-[#B5BDC7]" />
        </div>

        {/* Recessed 12" Touchscreen LCD Viewport */}
        <div
          className={`relative flex-1 min-h-0 border-2 border-[#AEB7C2] rounded-lg overflow-hidden flex flex-col ${
            themeMode === 'dark' ? 'dark bg-[#1C1E21] text-neutral-100' : 'bg-white text-slate-900'
          }`}
        >
          {!currentUser || !activeMode ? (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <LoginAndModeScreen
                frameMode={frameMode}
                onToggleFrame={() => setFrameMode((m) => (m === 'FILL' ? '12INCH' : 'FILL'))}
              />
            </div>
          ) : (
            <>
              <AnalyzerHeader />
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
                {activeMode === 'CLINICAL' ? <ClinicalWorkspace /> : <LabWorkspace />}

                {clotPortOverlayOpen && (
                  <div className="absolute inset-0 z-40 bg-white flex flex-col overflow-hidden">
                    <div className="relative flex-1 w-full h-full bg-white flex items-center justify-center overflow-hidden p-1.5">
                      <img
                        src="/assets/aistudio/Cambio_sampler_Port_a01e2f6a.jpg"
                        alt={tr(
                          language,
                          'Coágulo detectado: sustituya el puerto de muestras',
                          'Clot detected: replace the sample port'
                        )}
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setClotPortOverlayOpen(false)}
                        className="absolute bottom-3 right-3 px-5 py-2.5 rounded-lg bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold shadow-lg border border-orange-700"
                      >
                        {tr(language, 'Puerto sustituido · Continuar', 'Port replaced · Continue')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Simulated Atellica Connect Popup on Login (semi-transparent yellow) */}
          {loginAtellicaPopupOpen && currentUser && (
            <div className="absolute inset-0 z-50 bg-slate-900/35 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl border-2 border-amber-600 bg-amber-300/85 backdrop-blur-sm p-5 shadow-2xl text-amber-950 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-amber-700/25 pb-2.5">
                  <MessageSquareWarning className="w-6 h-6 text-amber-900 shrink-0" />
                  <div>
                    <div className="font-display font-bold text-base">
                      {tr(language, 'Mensaje de Atellica Connect', 'Atellica Connect Message')}
                    </div>
                    <div className="text-[11px] font-medium text-amber-900/90">
                      {tr(language, 'Aviso de POCT · Operador:', 'POCT Notice · Operator:')}{' '}
                      {currentUser.fullName}
                    </div>
                  </div>
                </div>

                <p className="text-sm font-bold leading-relaxed text-amber-950">
                  {tr(
                    language,
                    'Antes de iros cambiar el cartucho M, caduca este fin de semana',
                    'Before leaving, replace Cartridge M; it expires this weekend'
                  )}
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={dismissLoginAtellicaPopup}
                    className="px-4 py-2.5 rounded-lg border border-amber-800/40 bg-white/80 hover:bg-white text-xs font-bold text-amber-950"
                  >
                    {tr(language, 'Cancelar', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={confirmLoginAtellicaPopup}
                    className="px-4 py-2.5 rounded-lg bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold shadow-xs"
                  >
                    {tr(language, 'Confirmar Lectura', 'Confirm Read')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Desynchronize Events ON / OFF Modal Popup */}
          {desyncPopupMode && (
            <div className="absolute inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl border-2 border-[#0066B2] bg-white p-5 shadow-2xl text-slate-900 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-200 pb-2.5">
                  <CalendarClock
                    className={`w-6 h-6 shrink-0 ${
                      desyncPopupMode === 'ON' ? 'text-amber-600' : 'text-[#0066B2]'
                    }`}
                  />
                  <div>
                    <div className="font-display font-bold text-sm text-slate-900">
                      {tr(language, 'Desincronizar eventos', 'Desync events')} ·{' '}
                      <span
                        className={
                          desyncPopupMode === 'ON' ? 'text-amber-700' : 'text-[#0066B2]'
                        }
                      >
                        {desyncPopupMode}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm font-medium leading-relaxed text-slate-800">
                  {desyncPopupMode === 'ON'
                    ? tr(
                        language,
                        'Ahora las Calibraciones y Controles se desfasan entre un equipo y otro marcados como "en la misma ubicación"',
                        'Calibrations and Controls are now staggered between analyzers marked as "in the same location"'
                      )
                    : tr(
                        language,
                        'Ahora las Calibraciones y Controles se hacen cuando toca en los equipos marcados como "en la misma ubicación" pudiendo coincidir',
                        'Calibrations and Controls now run when scheduled on analyzers marked as "in the same location", and may overlap'
                      )}
                </p>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={dismissDesyncPopup}
                    className="px-5 py-2 rounded-lg bg-[#E8630A] hover:bg-[#D15607] text-white text-xs font-bold shadow-xs"
                  >
                    {tr(language, 'Aceptar', 'OK')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Instrument Screen Saver with Animated Sample Instructions */}
          <ScreenSaverOverlay />
        </div>

        {/* Molded lower instrument bezel bar */}
        <div className="text-slate-600 px-2 pt-1.5 text-[10px] font-mono flex items-center justify-between shrink-0">
          <span>
            {tr(
              language,
              'SIMULADOR DE GASÓMETRO RAPIDPoint 500e · PANTALLA TÁCTIL 12" · NO ES FIRMWARE REAL',
              'RAPIDPoint 500e BLOOD GAS SIMULATOR · 12" TOUCHSCREEN · NOT REAL FIRMWARE'
            )}
          </span>
          <button
            type="button"
            onClick={() => setFrameMode((m) => (m === 'FILL' ? '12INCH' : 'FILL'))}
            className="hidden lg:inline-flex items-center gap-1 text-slate-700 hover:text-slate-950 font-semibold"
            title={tr(
              language,
              'Alternar entre marco 12 pulgadas (1280×800) o pantalla completa',
              'Toggle between 12-inch frame (1280×800) or full screen'
            )}
          >
            <Monitor className="w-3 h-3" />
            <span>
              {frameMode === '12INCH'
                ? tr(language, 'Marco 12" (1280×800)', '12" Frame (1280×800)')
                : tr(language, 'Pantalla Completa', 'Full Screen')}
            </span>
          </button>
        </div>
      </div>
      <ToastContainer />
      <FeatureManualModal />
    </div>
  );
};

export default function App() {
  return (
    <AnalyzerProvider>
      <AppShell />
    </AnalyzerProvider>
  );
}
