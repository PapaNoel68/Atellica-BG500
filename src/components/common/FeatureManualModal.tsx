import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Download,
  Loader2,
  Printer,
  X,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import {
  EnglishFlagIcon,
  Language,
  SpanishFlagIcon,
  tr,
} from '@/src/i18n/translations';

export const FeatureManualModal: React.FC = () => {
  const { manualModalOpen, setManualModalOpen, language, state, pushToast } = useAnalyzer();
  const [docLang, setDocLang] = useState<Language>('en');
  const [downloading, setDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (manualModalOpen) {
      setDocLang('en');
    }
  }, [manualModalOpen]);

  if (!manualModalOpen) return null;

  const isEn = docLang === 'en';
  const t = (es: string, en: string) => (isEn ? en : es);

  const scrollToSection = (id: string) => {
    const el = contentRef.current?.querySelector(`#${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDownloadPdf = async () => {
    if (!contentRef.current || downloading) return;
    setDownloading(true);
    try {
      const blocks = Array.from(contentRef.current.children).filter(
        (el): el is HTMLElement => !el.classList.contains('manual-toc')
      );

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const marginX = 12;
      const marginTop = 12;
      const marginBottom = 14;
      const usableW = pageW - marginX * 2;
      const usableH = pageH - marginTop - marginBottom;

      let cursorY = marginTop;

      for (const block of blocks) {
        const canvas = await toCanvas(block, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
        });

        const imgW = usableW;
        const imgH = (canvas.height * imgW) / canvas.width;

        if (imgH <= usableH) {
          if (cursorY + imgH > pageH - marginBottom && cursorY > marginTop) {
            pdf.addPage();
            cursorY = marginTop;
          }
          const imgData = canvas.toDataURL('image/jpeg', 0.94);
          pdf.addImage(imgData, 'JPEG', marginX, cursorY, imgW, imgH, undefined, 'FAST');
          cursorY += imgH + 4;
        } else {
          if (cursorY > marginTop + 5) {
            pdf.addPage();
            cursorY = marginTop;
          }
          const sliceHeightPx = Math.floor((usableH * canvas.width) / usableW);
          let offsetY = 0;
          while (offsetY < canvas.height) {
            const currentSlicePx = Math.min(sliceHeightPx, canvas.height - offsetY);
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = currentSlicePx;
            const ctx = sliceCanvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
              ctx.drawImage(
                canvas,
                0,
                offsetY,
                canvas.width,
                currentSlicePx,
                0,
                0,
                canvas.width,
                currentSlicePx
              );
            }
            const sliceImgH = (currentSlicePx * imgW) / canvas.width;
            pdf.addImage(
              sliceCanvas.toDataURL('image/jpeg', 0.94),
              'JPEG',
              marginX,
              cursorY,
              imgW,
              sliceImgH,
              undefined,
              'FAST'
            );
            offsetY += currentSlicePx;
            if (offsetY < canvas.height) {
              pdf.addPage();
              cursorY = marginTop;
            } else {
              cursorY += sliceImgH + 4;
            }
          }
        }
      }

      const totalPages = pdf.getNumberOfPages();
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      for (let p = 1; p <= totalPages; p += 1) {
        pdf.setPage(p);
        pdf.text(
          `${state.config.deviceName} (${state.config.deviceId}) · ${
            isEn ? 'Feature & Operations Manual' : 'Manual de Características'
          }`,
          marginX,
          pageH - 6
        );
        pdf.text(
          `${isEn ? 'Page' : 'Página'} ${p} / ${totalPages}`,
          pageW - marginX,
          pageH - 6,
          { align: 'right' }
        );
      }

      const filename = isEn
        ? 'RAPIDPoint_500e_Feature_Manual_EN.pdf'
        : 'Manual_Caracteristicas_RAPIDPoint_500e_ES.pdf';
      pdf.save(filename);

      pushToast({
        tone: 'success',
        title: tr(language, 'Manual PDF descargado', 'PDF Manual downloaded'),
        message: filename,
      });
    } catch {
      pushToast({
        tone: 'error',
        title: tr(language, 'Error al generar PDF', 'PDF generation error'),
        message: tr(
          language,
          'Puede usar el botón Imprimir como alternativa.',
          'You can use the Print button as an alternative.'
        ),
      });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const sections = [
    { id: 'sec-overview', label: t('1. Visión General', '1. Overview') },
    { id: 'sec-login', label: t('2. Login y Acceso', '2. Login & Access') },
    { id: 'sec-header', label: t('3. Cabecera Global', '3. Global Header') },
    { id: 'sec-home', label: t('4. Pantalla Listo', '4. Ready Screen') },
    { id: 'sec-samples', label: t('5. Procesar Muestras', '5. Sample Processing') },
    { id: 'sec-recovery', label: t('6. Recuperar Resultados', '6. Recover Results') },
    { id: 'sec-states', label: t('7. Estados y Cartuchos', '7. States & Cartridges') },
    { id: 'sec-lab', label: t('8. Modo Laboratorio', '8. Laboratory Mode') },
  ];

  return (
    <div
      id="feature-manual-modal"
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4"
      onClick={() => setManualModalOpen(false)}
    >
      <div
        className="manual-paper bg-white border-2 border-slate-400 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Toolbar (hidden on print) */}
        <div className="manual-no-print px-4 py-2.5 border-b border-slate-200 bg-[#F6F8FA] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B3C6D] text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 leading-tight">
                {t(
                  'Manual de Características y Operación · RAPIDPoint 500e',
                  'Feature & Operations Manual · RAPIDPoint 500e'
                )}
              </h2>
              <p className="text-[11px] text-slate-500">
                {t(
                  'Guía ilustrada completa en Español e Inglés · Descargable con imágenes integradas',
                  'Complete illustrated guide in English & Spanish · Downloadable with embedded images'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Document Language Toggle */}
            <div
              role="group"
              aria-label={t('Idioma del manual', 'Manual language')}
              className="flex items-center bg-slate-200 p-0.5 rounded-lg border border-slate-300"
            >
              <button
                type="button"
                onClick={() => setDocLang('en')}
                className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold transition-all ${
                  docLang === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <EnglishFlagIcon className="w-4 h-3 rounded-[1px]" />
                <span>EN</span>
              </button>
              <button
                type="button"
                onClick={() => setDocLang('es')}
                className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold transition-all ${
                  docLang === 'es' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SpanishFlagIcon className="w-4 h-3 rounded-[1px]" />
                <span>ES</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-[#0066B2]" />
              <span>{t('Imprimir', 'Print')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-3.5 py-1.5 rounded-lg bg-[#E8630A] hover:bg-[#D15607] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>
                {downloading
                  ? t('Generando PDF...', 'Generating PDF...')
                  : t('Descargar Manual (.pdf)', 'Download Manual (.pdf)')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setManualModalOpen(false)}
              aria-label={t('Cerrar manual', 'Close manual')}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Editorial Document Canvas */}
        <div
          id="feature-manual-printable"
          className="flex-1 min-h-0 overflow-y-auto bg-[#EEF2F6] p-3 sm:p-6"
        >
          <div
            ref={contentRef}
            className="manual-paper mx-auto max-w-4xl bg-white border border-slate-300 rounded-xl shadow-md p-5 sm:p-9 space-y-7 text-slate-900"
          >
            {/* COVER / HERO BANNER */}
            <div
              id="sec-overview"
              className="manual-hero-wrap rounded-xl overflow-hidden border border-slate-300"
            >
              <div className="bg-gradient-to-r from-[#0B3C6D] via-[#0E4A84] to-[#1E293B] text-white p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                <div className="md:col-span-7 space-y-2.5">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 text-[11px] font-mono font-semibold text-amber-200">
                    {state.config.deviceName} · {state.config.deviceId}
                  </div>
                  <h1 className="font-display font-bold text-2xl sm:text-3xl leading-tight text-white">
                    {t(
                      'Manual de Características y Guía de Operación',
                      'Feature Manual & Operational Guide'
                    )}
                  </h1>
                  <p className="text-xs sm:text-sm text-sky-100 leading-relaxed">
                    {t(
                      'Documentación práctica completa del simulador de gasometría arterial/venosa/capilar: acceso de operadores, pantallas Clínica y Laboratorio, procesamiento rápido y estándar, recuperación de resultados, estados de cartuchos, control AQC/Westgard e incidencias.',
                      'Complete practical documentation for the blood gas analyzer simulator: operator login, Clinical & Laboratory workspaces, standard and quick sample processing, result recovery, cartridge states, AQC/Westgard QC, and technical incidents.'
                    )}
                  </p>
                </div>
                <div className="md:col-span-5">
                  <img
                    src="/assets/aistudio/manual_analyzer_hero.jpg"
                    alt={t(
                      'Ilustración del analizador de gases en sangre RAPIDPoint 500e',
                      'RAPIDPoint 500e benchtop blood gas analyzer illustration'
                    )}
                    className="w-full h-44 object-cover rounded-lg border-2 border-white/25 shadow-lg"
                  />
                </div>
              </div>
            </div>

            {/* INTERACTIVE TABLE OF CONTENTS */}
            <div className="manual-toc bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap gap-1.5">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:border-[#0066B2] hover:text-[#0066B2] text-xs font-semibold text-slate-800 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* SECTION 1: OVERVIEW */}
            <section className="space-y-3">
              <h2 className="font-display font-bold text-lg text-[#0B3C6D] border-b-2 border-slate-200 pb-1.5">
                {t('1. Visión General y Entornos de Trabajo', '1. System Overview & Operating Environments')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {t(
                  'La aplicación simula una pantalla táctil de 12 pulgadas (1280×800) del gasómetro RAPIDPoint 500e con persistencia local automática (IndexedDB). Integra dos entornos operativos diferenciados para reflejar el flujo real hospitalario entre Unidades Clínicas (Urgencias, UCI) y el Laboratorio Central / Coordinación POCT.',
                  'The application simulates a 12-inch (1280×800) RAPIDPoint 500e blood gas touchscreen with automatic local persistence (IndexedDB). It integrates two dedicated operating environments reflecting real hospital workflows between Clinical Units (Emergency, ICU) and Central Laboratory / POCT Coordination.'
                )}
              </p>
              <div className="manual-grid-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="manual-card border border-rose-200 bg-rose-50/50 rounded-xl p-3.5 space-y-1.5">
                  <div className="font-bold text-sm text-[#8B1A1A]">
                    {t('Modo Clínico (Cabecera Roja)', 'Clinical Mode (Red Header)')}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {t(
                      'Diseñado para Enfermería y personal asistencial. Permite análisis estándar con búsqueda demográfica, Medición Rápida sin identificar (ID provisional BG-), consulta de histórico, impresión de tickets, generación de BIDI y validación de resultados antes de enviar.',
                      'Designed for Nursing and point-of-care staff. Supports standard testing with demographic lookup, unidentified Quick Measurement (BG- provisional ID), patient history, thermal/external tickets, BIDI QR reports, and Nursing result validation.'
                    )}
                  </p>
                </div>
                <div className="manual-card border border-sky-200 bg-sky-50/50 rounded-xl p-3.5 space-y-1.5">
                  <div className="font-bold text-sm text-[#0B3C6D]">
                    {t('Modo Laboratorio (Cabecera Azul)', 'Laboratory Mode (Blue Header)')}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {t(
                      'Exclusivo para Técnico, Facultativo y Administrador autenticados. Ofrece gráficas Levey-Jennings con reglas Westgard, gestión de calibraciones y consumibles, diagnóstico técnico, configuración analítica, auditoría, avisos de Atellica Connect y Centro de Simulación Demo.',
                      'Restricted to authenticated Technicians, Specialists, and Administrators. Provides Levey-Jennings QC charts with Westgard rules, calibration & consumable management, component diagnostics, analytical settings, audit trail, Atellica Connect inbox, and Demo Simulation Center.'
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* SECTION 2: LOGIN SCREEN */}
            <section id="sec-login" className="space-y-3 pt-2">
              <h2 className="font-display font-bold text-lg text-[#0B3C6D] border-b-2 border-slate-200 pb-1.5">
                {t('2. Pantalla de LOGIN y Acceso al Equipo', '2. LOGIN Screen & Instrument Access')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {t(
                  'Es la primera pantalla al iniciar o bloquear el analizador. Permite consultar de un vistazo si los parámetros están disponibles antes de identificarse y elegir el entorno de trabajo.',
                  'This is the initial screen when booting or locking the analyzer. It provides an immediate visual status check of all parameters before signing in and choosing the operating environment.'
                )}
              </p>

              {/* SVG Diagram 1: Annotated Login Screen */}
              <div className="manual-figure border border-slate-300 rounded-xl p-3 bg-slate-50">
                <svg viewBox="0 0 760 280" className="w-full h-auto rounded-lg bg-white border border-slate-200">
                  {/* Top Bar */}
                  <rect x="0" y="0" width="760" height="34" fill="#F6F8FA" />
                  <line x1="0" y1="34" x2="760" y2="34" stroke="#E8630A" strokeWidth="2.5" />
                  <text x="16" y="21" fontSize="12" fontWeight="700" fill="#0f172a">RAPIDPoint 500e | RP500e-01</text>
                  <rect x="615" y="7" width="60" height="20" rx="4" fill="#E2E8F0" />
                  <text x="625" y="21" fontSize="10" fontWeight="700" fill="#0f172a">EN / ES</text>
                  <rect x="682" y="7" width="24" height="20" rx="4" fill="#0B3C6D" />
                  <text x="690" y="21" fontSize="10" fontWeight="700" fill="#ffffff">📖</text>

                  {/* POCT Banner */}
                  <rect x="16" y="44" width="728" height="32" rx="6" fill="#FFEDD5" stroke="#FDBA74" />
                  <text x="28" y="64" fontSize="11" fontWeight="700" fill="#7C2D12">
                    ✉ {t('POCT Coordinador: Antes de iros cambiar el cartucho M, caduca este fin de semana', 'POCT Coordinator: Before leaving, replace Cartridge M — expires this weekend')}
                  </text>

                  {/* Parameter Status Squares (0.75rem line) */}
                  <text x="16" y="96" fontSize="10" fontWeight="700" fill="#475569">
                    {t('Línea de estado de parámetros (verde=activo, amarillo=aviso AQC, gris=desact., rojo=no disp.):', 'Parameter status strip (green=active, amber=AQC warning, gray=disabled, red=unavailable):')}
                  </text>
                  {['pH', 'Na+', 'Glu', 'pCO2', 'K+', 'Lac', 'pO2', 'Ca++', 'ctHb', 'Coox', 'Cl-', 'nBili'].map((p, idx) => {
                    const x = 16 + idx * 42;
                    const fill = idx === 4 ? '#FCD34D' : '#A7F3D0';
                    const stroke = idx === 4 ? '#D97706' : '#059669';
                    return (
                      <g key={p}>
                        <rect x={x} y="103" width="34" height="24" rx="4" fill={fill} stroke={stroke} />
                        <text x={x + 17} y="119" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0f172a">{p}</text>
                      </g>
                    );
                  })}

                  {/* Left Panel: Operator ID + Barcode / BIDI / NFC */}
                  <rect x="16" y="138" width="430" height="126" rx="8" fill="#F8FAFC" stroke="#CBD5E1" />
                  <text x="28" y="157" fontSize="11" fontWeight="700" fill="#0f172a">
                    {t('Identificación de Operador', 'Operator Identification')}
                  </text>
                  <rect x="28" y="165" width="230" height="26" rx="4" fill="#FFFFFF" stroke="#94A3B8" />
                  <text x="36" y="182" fontSize="10" fill="#334155">enf.garcia / Elena García Morales</text>
                  {/* Barcode, BIDI, NFC icons */}
                  <rect x="264" y="165" width="42" height="26" rx="4" fill="#FFFFFF" stroke="#E8630A" />
                  <text x="285" y="182" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0f172a">|||</text>
                  <rect x="312" y="165" width="46" height="26" rx="4" fill="#FFFFFF" stroke="#0066B2" />
                  <text x="335" y="182" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0066B2">BIDI</text>
                  <rect x="364" y="165" width="46" height="26" rx="4" fill="#FFFFFF" stroke="#059669" />
                  <text x="387" y="182" textAnchor="middle" fontSize="9" fontWeight="700" fill="#059669">NFC</text>

                  {/* Toggle Sin identificar & Submit */}
                  <rect x="28" y="200" width="215" height="24" rx="4" fill="#FFF7ED" stroke="#FDBA74" />
                  <text x="36" y="216" fontSize="9.5" fontWeight="700" fill="#9A3412">
                    {t('Acceso Sin Identificar (Solo Clínico)', 'Anonymous Access (Clinical Only)')}
                  </text>
                  <rect x="28" y="232" width="404" height="24" rx="5" fill="#E8630A" />
                  <text x="230" y="248" textAnchor="middle" fontSize="11" fontWeight="700" fill="#FFFFFF">
                    {t('Entrar / Validar Operador →', 'Sign In / Validate Operator →')}
                  </text>

                  {/* Right Panel: Numeric Keypad */}
                  <rect x="462" y="138" width="282" height="126" rx="8" fill="#F8FAFC" stroke="#CBD5E1" />
                  <text x="476" y="157" fontSize="11" fontWeight="700" fill="#0f172a">
                    {t('Teclado Táctil PIN / Clave', 'Touchscreen PIN Keypad')}
                  </text>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k, idx) => {
                    const col = idx % 3;
                    const row = Math.floor(idx / 3);
                    const kx = 476 + col * 86;
                    const ky = 165 + row * 23;
                    return (
                      <g key={k}>
                        <rect x={kx} y={ky} width="78" height="19" rx="3" fill="#FFFFFF" stroke="#CBD5E1" />
                        <text x={kx + 39} y={ky + 13} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">{k}</text>
                      </g>
                    );
                  })}
                </svg>
                <div className="manual-caption text-xs text-slate-500 text-center mt-2 font-semibold">
                  {t(
                    'Figura 1. Esquema de elementos principales en la pantalla de Login.',
                    'Figure 1. Annotated diagram of key controls on the Login screen.'
                  )}
                </div>
              </div>

              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left">{t('Elemento', 'Element')}</th>
                    <th className="border border-slate-300 p-2 text-left">{t('Función y Comportamiento', 'Purpose & Behavior')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">{t('Aviso del POCT Coordinador', 'POCT Coordinator Banner')}</td>
                    <td className="border border-slate-300 p-2">{t('Muestra de forma compacta los recordatorios prioritarios enviados por el Coordinador POCT antes de iniciar sesión.', 'Displays high-priority POCT Coordinator reminders concisely before signing in.')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">{t('Cuadrados de Parámetros (0,75)', 'Parameter Status Squares')}</td>
                    <td className="border border-slate-300 p-2">{t('Línea horizontal con los 12 grupos de medición (pH, Na+, Glu, pCO2, K+, Lac, pO2, Ca++, ctHb, Coox, Cl-, nBili). Verde = activo; Amarillo = advertencia AQC; Gris = desactivado; Rojo = analizador bloqueado.', 'Horizontal strip for all 12 analyte groups. Green = active; Amber = AQC warning; Gray = disabled; Red = analyzer unavailable.')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">{t('ID Operador + Código / BIDI / NFC', 'Operator ID + Barcode / BIDI / NFC')}</td>
                    <td className="border border-slate-300 p-2">{t('Permite seleccionar usuario, escribir credenciales o simular lectura instantánea de tarjeta mediante lector de código de barras, BIDI QR o NFC.', 'Lets staff select a user, enter credentials, or simulate instant badge reading via Barcode, BIDI QR, or NFC.')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">{t('Acceso Sin Identificar', 'Anonymous Access')}</td>
                    <td className="border border-slate-300 p-2">{t('Disponible únicamente para Modo Clínico. El Modo Laboratorio y los perfiles de Enfermería respetan sus restricciones de acceso tras validar credenciales.', 'Available exclusively for Clinical Mode. Laboratory Mode requires authenticated Laboratory/Admin credentials; Nursing enters Clinical Mode directly.')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">{t('Popup Atellica al Iniciar Sesión', 'Login Atellica Notice Popup')}</td>
                    <td className="border border-slate-300 p-2">{t('Aviso emergente amarillo semitransparente para confirmar lectura del mensaje POCT (trazado en auditoría) o cancelar.', 'Semi-transparent yellow popup prompting read acknowledgment of the active POCT notice (logged in audit trail) or cancel.')}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* SECTION 3: GLOBAL HEADER */}
            <section id="sec-header" className="space-y-3 pt-2">
              <h2 className="font-display font-bold text-lg text-[#0B3C6D] border-b-2 border-slate-200 pb-1.5">
                {t('3. Barra de Cabecera Global', '3. Global Header Bar')}
              </h2>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left">{t('Control', 'Control')}</th>
                    <th className="border border-slate-300 p-2 text-left">{t('Descripción', 'Description')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">{t('Estado e ID del Equipo', 'Status & Analyzer ID')}</td>
                    <td className="border border-slate-300 p-2">{t('Muestra en tiempo real si el equipo está Activo, Activo con Advertencias, en Mantenimiento o No Disponible junto al modelo RAPIDPoint 500e RP500e-01.', 'Displays real-time readiness (Active, Active · Warn, Maintenance, Unavailable) next to model RAPIDPoint 500e RP500e-01.')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">{t('Toggle Idioma (EN / ES) + Libro', 'Language Toggle (EN / ES) + Book Icon')}</td>
                    <td className="border border-slate-300 p-2">{t('Situado junto al nombre del equipo (Inglés por defecto). Traduce toda la interfaz, mensajes y avisos guardados. El botón con icono de libro abre este Manual descargable.', 'Located beside the analyzer name (English by default). Translates all UI controls, alerts, and saved notices. The Book icon button opens this downloadable Manual.')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">{t('Toggle "Desincronizar eventos"', '"Desync events" Toggle')}</td>
                    <td className="border border-slate-300 p-2">{t('En ON desfasa calibraciones y controles entre equipos marcados "en la misma ubicación" para evitar indisponibilidad simultánea; en OFF se ejecutan según programación pudiendo coincidir.', 'When ON, staggers calibrations and QC across analyzers "in the same location"; when OFF, they run on schedule and may overlap.')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">{t('Selector Clínico / Laboratorio', 'Clinical / Laboratory Switch')}</td>
                    <td className="border border-slate-300 p-2">{t('Permite alternar al instante entre Modo Clínico y Modo Laboratorio (bloqueado con candado si el operador no tiene permisos de laboratorio).', 'Instantly switches between Clinical Mode and Laboratory Mode (locked if the current user lacks Lab permissions).')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">{t('Tema Oscuro / Claro, Ayuda (?), Carpetas e Info (i)', 'Dark/Light Theme, Help (?), Folders & Info (i)')}</td>
                    <td className="border border-slate-300 p-2">{t('Luna/Sol alterna tema gris oscuro; (?) abre ayuda rápida; Carpetas accede a Pacientes, Sin identificar, Críticos, Sucesos y Estadística; (i) abre la pantalla completa de Estado de Cartuchos.', 'Moon/Sun toggles dark charcoal theme; (?) opens quick help; Folders jumps to Patients, Unidentified, Criticals, Events, Statistics; (i) opens the full Cartridge Status screen.')}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* SECTION 4: HOME / READY SCREEN */}
            <section id="sec-home" className="space-y-3 pt-2">
              <h2 className="font-display font-bold text-lg text-[#0B3C6D] border-b-2 border-slate-200 pb-1.5">
                {t('4. Pantalla Principal "Listo" (Inicio Clínico)', '4. Main "Ready" Screen (Clinical Home)')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {t(
                  'Tras el Login, el analizador abre siempre la pantalla "Listo", organizada en tres columnas sin desplazamiento vertical innecesario:',
                  'After login, the analyzer always lands on the "Ready" screen, structured into three ergonomic columns without vertical scrolling:'
                )}
              </p>

              {/* SVG Diagram 2: Home Screen 3-Column Map */}
              <div className="manual-figure border border-slate-300 rounded-xl p-3 bg-slate-50">
                <svg viewBox="0 0 760 270" className="w-full h-auto rounded-lg bg-white border border-slate-200">
                  {/* Column 1 */}
                  <rect x="12" y="12" width="234" height="246" rx="6" fill="#F8FAFC" stroke="#CBD5E1" />
                  <text x="22" y="29" fontSize="10" fontWeight="700" fill="#0B3C6D">{t('COLUMNA 1: Muestra y Estado', 'COLUMN 1: Sample & Status')}</text>
                  <rect x="22" y="36" width="102" height="36" rx="4" fill="#C9CFD6" stroke="#64748B" />
                  <text x="73" y="58" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">✓ {t('Arterial', 'Arterial')}</text>
                  <rect x="132" y="36" width="102" height="36" rx="4" fill="#F1F4F7" stroke="#CBD5E1" />
                  <text x="183" y="58" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">{t('Venosa', 'Venous')}</text>
                  <rect x="22" y="78" width="102" height="36" rx="4" fill="#F1F4F7" stroke="#CBD5E1" />
                  <text x="73" y="100" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">{t('Capilar', 'Capillary')}</text>
                  <rect x="132" y="78" width="102" height="36" rx="4" fill="#F1F4F7" stroke="#CBD5E1" />
                  <text x="183" y="100" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0066B2">AQC</text>

                  {/* Cartridge Card */}
                  <rect x="22" y="122" width="212" height="68" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
                  <text x="30" y="135" fontSize="9.5" fontWeight="700" fill="#0f172a">{t('Estado de los cartuchos', 'Cartridge status')}</text>
                  <text x="30" y="150" fontSize="9" fill="#334155">[M] 560 {t('muestras · 5 d', 'samples · 5 d')}</text>
                  <circle cx="33" cy="161" r="3.5" fill="#DC2626" />
                  <text x="42" y="164" fontSize="9" fill="#334155">[W] 5 {t('muestras · 1 d', 'samples · 1 d')}</text>
                  <circle cx="33" cy="175" r="3.5" fill="#FBBF24" />
                  <text x="42" y="178" fontSize="9" fill="#334155">[AQC] 67 {t('muestras · 10 d', 'samples · 10 d')}</text>

                  {/* Atellica Bottom */}
                  <rect x="22" y="198" width="212" height="50" rx="4" fill="#FEF3C7" stroke="#F59E0B" />
                  <text x="30" y="214" fontSize="10" fontWeight="700" fill="#78350F">ⓘ Atellica Connect</text>
                  <text x="30" y="229" fontSize="8.5" fill="#78350F">{t('Avisos del Coordinador (bilingüe)', 'Coordinator Notices (bilingual)')}</text>

                  {/* Column 2 */}
                  <rect x="258" y="12" width="244" height="246" rx="6" fill="#F8FAFC" stroke="#CBD5E1" />
                  <text x="268" y="29" fontSize="10" fontWeight="700" fill="#0B3C6D">{t('COLUMNA 2: Parámetros y Perfiles', 'COLUMN 2: Parameters & Profiles')}</text>
                  <rect x="268" y="36" width="224" height="22" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
                  <text x="278" y="51" fontSize="9" fontWeight="700" fill="#0f172a">{t('Todos/Ninguno', 'All/None')} | {t('Individuales / Agrupados', 'Individual / Grouped')}</text>
                  <rect x="268" y="64" width="224" height="104" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
                  <text x="380" y="110" textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">pH · Na+ · Glu · pCO2 · K+ · Lac</text>
                  <text x="380" y="126" textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">pO2 · Ca++ · ctHb · Coox · Cl- · nBili</text>
                  <rect x="268" y="174" width="224" height="44" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
                  <text x="278" y="190" fontSize="9.5" fontWeight="700" fill="#0f172a">{t('Perfiles rápidos:', 'Quick profiles:')}</text>
                  <text x="278" y="207" fontSize="9" fill="#0066B2">[ {t('Solo pH', 'pH only')} ]   [ {t('Bic y Ca++', 'Bic & Ca++')} ]</text>
                  <rect x="268" y="224" width="224" height="24" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
                  <text x="276" y="240" fontSize="9" fontWeight="700" fill="#0f172a">{t('Último paciente: DEMO001 · pH 7.38', 'Latest patient: DEMO001 · pH 7.38')}</text>

                  {/* Column 3 */}
                  <rect x="514" y="12" width="234" height="246" rx="6" fill="#F8FAFC" stroke="#CBD5E1" />
                  <text x="524" y="29" fontSize="10" fontWeight="700" fill="#0B3C6D">{t('COLUMNA 3: Acción e ID', 'COLUMN 3: Action & ID')}</text>
                  <rect x="524" y="36" width="214" height="22" rx="4" fill="#FEE2E2" stroke="#FCA5A5" />
                  <text x="532" y="50" fontSize="9" fontWeight="700" fill="#991B1B">⚠ {t('Críticas sin confirmar', 'Unacknowledged criticals')}</text>
                  <rect x="524" y="64" width="214" height="30" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
                  <text x="532" y="83" fontSize="9" fontWeight="700" fill="#334155">{t('Acciones rápidas (solo si hay fallos): AQC / Calibrar', 'Quick actions (only if failures): AQC / Calibrate')}</text>
                  <rect x="524" y="100" width="214" height="58" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
                  <text x="631" y="133" textAnchor="middle" fontSize="10" fontWeight="700" fill="#475569">💉 {t('Gráfico Puerto Aspiración', 'Aspiration Port Graphic')}</text>
                  <rect x="524" y="164" width="104" height="34" rx="4" fill="#EDF5FC" stroke="#0066B2" />
                  <text x="576" y="185" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0066B2">{t('Medición rápida', 'Quick measure')}</text>
                  <rect x="634" y="164" width="104" height="34" rx="4" fill="#E8630A" />
                  <text x="686" y="185" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#FFFFFF">{t('Iniciar ▶', 'Start ▶')}</text>
                  <rect x="524" y="206" width="214" height="42" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
                  <text x="532" y="230" fontSize="9.5" fill="#475569">|||  [{t('Nº Historia / Nº Lab + Lectura', 'MRN / Lab No. + Lookup')}]</text>
                </svg>
                <div className="manual-caption text-xs text-slate-500 text-center mt-2 font-semibold">
                  {t(
                    'Figura 2. Distribución en 3 columnas de la pantalla "Listo" (Inicio).',
                    'Figure 2. Three-column layout of the "Ready" (Home) screen.'
                  )}
                </div>
              </div>

              {/* Real Cartridge Icons embedded */}
              <div className="manual-card border border-slate-300 bg-slate-50 rounded-xl p-3.5 space-y-2">
                <div className="font-bold text-xs text-slate-900">
                  {t('Detalle visual: Estado de los Cartuchos en Inicio', 'Visual detail: Home Screen Cartridge Status Card')}
                </div>
                <div className="manual-grid-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center gap-2.5">
                    <img src="/assets/aistudio/cartridge_m.png" alt="M Cartridge" className="h-7 w-auto object-contain" />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900">{t('Cartucho Medida (M)', 'Measurement Cartridge (M)')}</div>
                      <div className="text-[11px] text-slate-600">{t('560 muestras · 5 días', '560 samples · 5 days')}</div>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center gap-2.5">
                    <div className="relative pl-2">
                      <img src="/assets/aistudio/cartridge_w.png" alt="Wash Cartridge" className="h-6 w-auto object-contain" />
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white absolute top-0 left-0" />
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-red-700">{t('Lavado (W) · Alerta Roja', 'Wash (W) · Red Alert')}</div>
                      <div className="text-[11px] text-slate-600">{t('5 muestras · 1 día', '5 samples · 1 day')}</div>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center gap-2.5">
                    <div className="relative pl-2">
                      <img src="/assets/aistudio/cartridge_aqc.png" alt="AQC Cartridge" className="h-7 w-auto object-contain" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white absolute top-0 left-0" />
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-amber-700">{t('AQC · Alerta Amarilla', 'AQC · Yellow Alert')}</div>
                      <div className="text-[11px] text-slate-600">{t('67 muestras · 10 días', '67 samples · 10 days')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 5: SAMPLE PROCESSING */}
            <section id="sec-samples" className="space-y-3 pt-2">
              <h2 className="font-display font-bold text-lg text-[#0B3C6D] border-b-2 border-slate-200 pb-1.5">
                {t('5. Cómo se Procesan Muestras (Estándar y Medición Rápida)', '5. Sample Processing Workflows (Standard & Quick Measurement)')}
              </h2>

              {/* SVG Diagram 3: Sample Processing Flow */}
              <div className="manual-figure border border-slate-300 rounded-xl p-3 bg-slate-50">
                <svg viewBox="0 0 760 190" className="w-full h-auto rounded-lg bg-white border border-slate-200">
                  {/* Track A: Standard */}
                  <text x="16" y="24" fontSize="11" fontWeight="700" fill="#E8630A">{t('A. Flujo Estándar (Botón "Iniciar")', 'A. Standard Workflow ("Start" Button)')}</text>
                  <rect x="16" y="34" width="165" height="46" rx="6" fill="#FFF7ED" stroke="#E8630A" />
                  <text x="98" y="53" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">{t('1. ID + Demográficos (3s)', '1. ID + Demographics (3s)')}</text>
                  <text x="98" y="68" textAnchor="middle" fontSize="8.5" fill="#475569">{t('Check preanalítico obligatorio', 'Mandatory prep checklist')}</text>
                  <text x="193" y="60" fontSize="14" fontWeight="700" fill="#64748B">→</text>

                  <rect x="208" y="34" width="165" height="46" rx="6" fill="#EFF6FF" stroke="#0066B2" />
                  <text x="290" y="53" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">{t('2. Cámara Analítica (3s)', '2. Analytical Chamber (3s)')}</text>
                  <text x="290" y="68" textAnchor="middle" fontSize="8.5" fill="#475569">{t('Aspiración y cronómetro', 'Aspiration & countdown')}</text>
                  <text x="385" y="60" fontSize="14" fontWeight="700" fill="#64748B">→</text>

                  <rect x="400" y="34" width="170" height="46" rx="6" fill="#ECFDF5" stroke="#059669" />
                  <text x="485" y="53" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">{t('3. Resultados y Validación', '3. Results & Validation')}</text>
                  <text x="485" y="68" textAnchor="middle" fontSize="8.5" fill="#475569">{t('Coherencia + Aviso Art/Ven', 'Coherence + Art/Ven alert')}</text>
                  <text x="582" y="60" fontSize="14" fontWeight="700" fill="#64748B">→</text>

                  <rect x="596" y="34" width="148" height="46" rx="6" fill="#0B3C6D" />
                  <text x="670" y="53" textAnchor="middle" fontSize="10" fontWeight="700" fill="#FFFFFF">{t('Imprimir / BIDI / LIS', 'Print / BIDI / LIS')}</text>
                  <text x="670" y="68" textAnchor="middle" fontSize="8.5" fill="#BAE6FD">{t('Validación Enfermería', 'Nursing validation')}</text>

                  {/* Track B: Quick */}
                  <text x="16" y="114" fontSize="11" fontWeight="700" fill="#0066B2">{t('B. Medición Rápida (Urgencia / Identificación Diferida)', 'B. Quick Measurement (Emergency / Deferred ID)')}</text>
                  <rect x="16" y="124" width="175" height="50" rx="6" fill="#EDF5FC" stroke="#0066B2" />
                  <text x="103" y="144" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">{t('ID Provisional BG-aaaa...', 'Provisional ID BG-yyyy...')}</text>
                  <text x="103" y="160" textAnchor="middle" fontSize="8.5" fill="#475569">{t('+ Referencia + Ticket Impresora', '+ Reference + Printer Ticket')}</text>
                  <text x="203" y="152" fontSize="14" fontWeight="700" fill="#64748B">→</text>

                  <rect x="218" y="124" width="160" height="50" rx="6" fill="#EFF6FF" stroke="#0066B2" />
                  <text x="298" y="144" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">{t('Aspiración directa (3s)', 'Direct Aspiration (3s)')}</text>
                  <text x="298" y="160" textAnchor="middle" fontSize="8.5" fill="#475569">{t('Sin demográficos previos', 'No prior demographics')}</text>
                  <text x="390" y="152" fontSize="14" fontWeight="700" fill="#64748B">→</text>

                  <rect x="404" y="124" width="166" height="50" rx="6" fill="#FFF7ED" stroke="#F59E0B" />
                  <text x="487" y="144" textAnchor="middle" fontSize="10" fontWeight="700" fill="#9A3412">{t('SIN IDENTIFICAR', 'UNIDENTIFIED')}</text>
                  <text x="487" y="160" textAnchor="middle" fontSize="8.5" fill="#9A3412">{t('Envío LIS bloqueado', 'LIS send blocked')}</text>
                  <text x="582" y="152" fontSize="14" fontWeight="700" fill="#64748B">→</text>

                  <rect x="596" y="124" width="148" height="50" rx="6" fill="#059669" />
                  <text x="670" y="144" textAnchor="middle" fontSize="10" fontWeight="700" fill="#FFFFFF">{t('Carpetas → Asignar ID', 'Folders → Assign ID')}</text>
                  <text x="670" y="160" textAnchor="middle" fontSize="8.5" fill="#D1FAE5">{t('Desbloquea LIS e Impresión', 'Unlocks LIS & Print')}</text>
                </svg>
                <div className="manual-caption text-xs text-slate-500 text-center mt-2 font-semibold">
                  {t(
                    'Figura 3. Comparativa entre el análisis estándar y la Medición Rápida con ID provisional.',
                    'Figure 3. Comparison between standard analysis and Quick Measurement with provisional ID.'
                  )}
                </div>
              </div>

              <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1.5">
                <li>
                  <strong>{t('Identificación y Demográficos (Modo Clínico vs Laboratorio):', 'Identification & Demographics (Clinical vs Laboratory):')}</strong>{' '}
                  {t(
                    'En Modo Clínico, al introducir o escanear el Nº de Historia Clínica se consulta durante 3 segundos la ficha del paciente (nombre, sexo y fecha de nacimiento) y es obligatorio confirmarla para desbloquear FiO2, Temperatura y la lista de Preparación de Muestra (homogeneización, sin burbujas, sin coágulos y volumen suficiente). En Modo Laboratorio se valida el Nº de Laboratorio directamente sin datos demográficos.',
                    'In Clinical Mode, entering or scanning a Medical Record Number triggers a 3-second demographic lookup (name, sex, DOB) which must be confirmed to unlock FiO2, Temperature, and the Sample Preparation checklist (gentle mixing, bubble removal, clot check, sufficient volume). In Laboratory Mode, Lab No. is validated directly without demographic lookup.'
                  )}
                </li>
                <li>
                  <strong>{t('Medición Rápida y Ticket Provisional:', 'Quick Measurement & Provisional Ticket:')}</strong>{' '}
                  {t(
                    'Genera automáticamente un Número ID Provisional con formato BG-aaaa-mm-dd-hh-mm junto a un campo opcional de Referencia (cama, box, siglas). El botón de impresora contiguo abre un ticket térmico con el Número, Servicio y Referencia (si existe) con botones "Mandar a impresora" y "Cerrar".',
                    'Automatically assigns a Provisional ID Number formatted BG-yyyy-mm-dd-hh-mm alongside an optional Reference field (bed, room, initials). The adjacent printer icon opens a thermal ticket showing Number, Service, and Reference (if filled) with "Send to printer" and "Close".'
                  )}
                </li>
                <li>
                  <strong>{t('Motor de Coherencia y Validación de Enfermería:', 'Coherence Engine & Nursing Validation:')}</strong>{' '}
                  {t(
                    'Detecta automáticamente inconsistencias ácido-base (Henderson-Hasselbalch), Anion Gap, suma de cooximetría, Delta Check respecto a análisis previos y discordancia Arterial/Venosa (por ejemplo, muestra declarada Arterial con sO2 < 90% o pO2 venosa). En perfil Enfermería, antes de imprimir exige validar pulsando "Dar por buenos e imprimir/enviar" o "Cancelar la muestra". Los tickets permiten elegir Impresora Térmica o Impresora Externa.',
                    'Automatically flags acid-base discrepancies (Henderson-Hasselbalch), Anion Gap, CO-oximetry sum, Delta Checks against prior records, and Arterial/Venous sample mismatch (e.g., Arterial sample with sO2 < 90% or low pO2). Nursing operators must choose "Accept & print/send" or "Cancel sample" before printing; tickets support both Thermal Printer and External Printer.'
                  )}
                </li>
              </ul>
            </section>

            {/* SECTION 6: RECOVERING RESULTS */}
            <section id="sec-recovery" className="space-y-3 pt-2">
              <h2 className="font-display font-bold text-lg text-[#0B3C6D] border-b-2 border-slate-200 pb-1.5">
                {t('6. Cómo Recuperar Resultados, Comparar y Asignar Muestras Sin Identificar', '6. Recovering Results, Comparing Determinations & Unidentified Samples')}
              </h2>
              <div className="manual-grid-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="manual-card border border-slate-300 bg-slate-50 rounded-xl p-3.5 space-y-1.5">
                  <div className="font-bold text-xs text-[#0B3C6D]">
                    {t('Histórico de Pacientes y Comparativa', 'Patient History & Comparison')}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {t(
                      'Desde "Histórico" (o Carpetas → Pacientes / Críticos) se pueden filtrar análisis por ID, tipo de muestra, estado o alertas críticas sin confirmar. Seleccionando dos muestras identificadas (no válido para SIN IDENTIFICAR) el botón "Comparar seleccionados" abre una tabla compacta de diferencias.',
                      'In "History" (or Folders → Patients / Criticals), filter runs by ID, sample type, status, or unacknowledged criticals. Selecting two identified samples (disabled for UNIDENTIFIED samples) enables "Compare selected" for a compact side-by-side delta table.'
                    )}
                  </p>
                </div>
                <div className="manual-card border border-orange-300 bg-orange-50/50 rounded-xl p-3.5 space-y-1.5">
                  <div className="font-bold text-xs text-orange-900">
                    {t('Carpetas → Sin identificar (Identificación Diferida)', 'Folders → Unidentified (Deferred Identification)')}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {t(
                      'Agrupa las mediciones rápidas pendientes. Permite buscar por su ID BG-aaaa-mm-dd-hh-mm o por la Referencia introducida, asignar el Nº Historia / Nº Laboratorio definitivo (con búsqueda demográfica en Clínico) y transmitir inmediatamente los resultados al LIS.',
                      'Collects pending quick measurements. Search by BG-yyyy-mm-dd-hh-mm ID or Reference, link the final Patient MRN / Lab No. (with demographic lookup in Clinical Mode), and release results to LIS.'
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* SECTION 7: STATES, CARTRIDGES & INCIDENTS */}
            <section id="sec-states" className="space-y-3 pt-2">
              <h2 className="font-display font-bold text-lg text-[#0B3C6D] border-b-2 border-slate-200 pb-1.5">
                {t('7. Estados del Equipo, Cartuchos, Calibración, AQC e Incidencias', '7. Analyzer States, Cartridges, Calibration, AQC & Incidents')}
              </h2>

              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left">{t('Categoría', 'Category')}</th>
                    <th className="border border-slate-300 p-2 text-left">{t('Estado', 'State')}</th>
                    <th className="border border-slate-300 p-2 text-left">{t('Significado y Efecto Operativo', 'Meaning & Operational Effect')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold" rowSpan={4}>{t('Analizador', 'Analyzer')}</td>
                    <td className="border border-slate-300 p-2 font-bold text-emerald-700">{t('Activo (OPERATIVO)', 'Active (OPERATIONAL)')}</td>
                    <td className="border border-slate-300 p-2">{t('Todos los subsistemas, cartuchos y comunicaciones están disponibles para procesar muestras.', 'All subsystems, cartridges, and communications are ready for sample analysis.')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold text-amber-700">{t('Activo · Advertencias', 'Active · Warnings')}</td>
                    <td className="border border-slate-300 p-2">{t('Existe algún parámetro con aviso AQC/CCI, consumible bajo o enlace Atellica desconectado; permite medir pero requiere revisión.', 'One or more parameters have a QC/AQC warning, low consumable, or Atellica link down; testing remains active with caution.')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold text-sky-700">{t('Mantenimiento', 'Maintenance')}</td>
                    <td className="border border-slate-300 p-2">{t('Modo servicio activado desde Laboratorio. Bloquea nuevas mediciones de pacientes hasta finalizar.', 'Service mode enabled from Laboratory. Blocks patient determinations until exited.')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold text-red-700">{t('No Disponible', 'Unavailable')}</td>
                    <td className="border border-slate-300 p-2">{t('Alarma crítica activa o cartucho agotado (0 muestras). Requiere resolver la incidencia o sustituir consumible.', 'Critical alarm active or depleted cartridge (0 samples). Requires incident resolution or consumable replacement.')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold" rowSpan={2}>{t('Cartuchos (Botón i)', 'Cartridges (i Button)')}</td>
                    <td className="border border-slate-300 p-2 font-bold">{t('Medida / Lavado / AQC', 'Measurement / Wash / AQC')}</td>
                    <td className="border border-slate-300 p-2">{t('Medida: 28 días desde instalación y 750 muestras. AQC: 28 días. Lavado/Desechos: 9 días. Incluye cuenta atrás aleatoria hasta la próxima calibración y próximo AQC programado.', 'Measurement: 28 days & 750 samples. AQC: 28 days. Wash/Waste: 9 days. Includes randomized countdown timers to next Calibration and next scheduled AQC.')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">{t('Calibración y AQC rápido', 'Quick Calibration & AQC')}</td>
                    <td className="border border-slate-300 p-2">{t('Si hay fallos aparecen botones en "Acciones rápidas". AQC ejecuta cuenta atrás de 2s; Calibrar ofrece 1 punto, 2 puntos o Completa con cronómetro de 3s y resultado Aceptada o Repetición.', 'When failures exist, "Quick actions" unlocks AQC (2s timer) and Calibrate (1-point, 2-point, or Full with 3s countdown and Accepted/Retry outcome).')}</td>
                  </tr>
                </tbody>
              </table>

              {/* Clot Detection & Sample Port Replacement visual */}
              <div className="manual-card border border-red-200 bg-red-50/40 rounded-xl p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-7 space-y-1.5">
                  <div className="font-bold text-xs text-red-900">
                    {t('Incidencias Técnicas y Detección de Coágulo (E-304)', 'Technical Incidents & Clot Detection (E-304)')}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {t(
                      'La pestaña "Incidencias" muestra el "Listado de incidencias" filtrable por tipo de error (reactivos, parámetros, temperatura del analizador, errores mecánicos). Si durante un análisis se detecta un coágulo (E-304), el equipo abre a pantalla completa el asistente gráfico de sustitución del puerto de muestras.',
                      'The "Incidents" tab provides a filterable "Incidents List" covering reagent, parameter, analyzer temperature, and mechanical errors. If a clot (E-304) occurs during aspiration, the analyzer displays the full-screen graphical sample-port replacement guide.'
                    )}
                  </p>
                </div>
                <div className="md:col-span-5">
                  <img
                    src="/assets/aistudio/Cambio_sampler_Port_a01e2f6a.jpg"
                    alt={t('Procedimiento visual de sustitución del puerto de muestras tras coágulo', 'Visual sample port replacement procedure after clot detection')}
                    className="w-full h-36 object-contain bg-white rounded-lg border border-slate-300 p-1"
                  />
                </div>
              </div>
            </section>

            {/* SECTION 8: LABORATORY MODE */}
            <section id="sec-lab" className="space-y-3 pt-2">
              <h2 className="font-display font-bold text-lg text-[#0B3C6D] border-b-2 border-slate-200 pb-1.5">
                {t('8. Módulos Avanzados de Modo Laboratorio', '8. Laboratory Mode Advanced Modules')}
              </h2>
              <div className="manual-grid-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                <div className="manual-card border border-slate-200 bg-slate-50 rounded-lg p-3">
                  <div className="font-bold text-slate-900">{t('Dashboard e Indicadores', 'Dashboard & Indicators')}</div>
                  <p className="text-slate-600 mt-1">{t('KPIs de actividad, tasas críticas, porcentaje de muestras sin identificar y tiempos de respuesta.', 'Activity KPIs, critical alert rates, unidentified sample ratio, and turnaround metrics.')}</p>
                </div>
                <div className="manual-card border border-slate-200 bg-slate-50 rounded-lg p-3">
                  <div className="font-bold text-slate-900">{t('Control QC Westgard', 'Westgard QC & Charts')}</div>
                  <p className="text-slate-600 mt-1">{t('Gráficas Levey-Jennings, evaluación automática (1_2s, 1_3s, 2_2s, R_4s, 4_1s, 10x) y no conformidades.', 'Levey-Jennings plots, automated Westgard rules (1_2s, 1_3s, 2_2s, R_4s, 4_1s, 10x), and non-conformities.')}</p>
                </div>
                <div className="manual-card border border-slate-200 bg-slate-50 rounded-lg p-3">
                  <div className="font-bold text-slate-900">{t('Calibración y Consumibles', 'Calibration & Consumables')}</div>
                  <p className="text-slate-600 mt-1">{t('Histórico de pendientes de electrodos, sustitución de cartuchos y lotes con caducidad.', 'Electrode slope history, cartridge replacement workflows, and lot expiry tracking.')}</p>
                </div>
                <div className="manual-card border border-slate-200 bg-slate-50 rounded-lg p-3">
                  <div className="font-bold text-slate-900">{t('Diagnóstico y Mantenimiento', 'Diagnostics & Maintenance')}</div>
                  <p className="text-slate-600 mt-1">{t('Verificación de 8 subsistemas (cámara 37 °C, bomba peristáltica, ISE, óptico) y registro de intervenciones.', '8-subsystem check (37 °C chamber, peristaltic pump, ISE, optics) and service intervention log.')}</p>
                </div>
                <div className="manual-card border border-slate-200 bg-slate-50 rounded-lg p-3">
                  <div className="font-bold text-slate-900">{t('Avisos Coordinador (Atellica)', 'Coordinator Notices (Atellica)')}</div>
                  <p className="text-slate-600 mt-1">{t('Bandeja bilingüe con trazabilidad de recepción, lectura y confirmación por operador.', 'Bilingual inbox with system receipt, operator read, and confirmation traceability.')}</p>
                </div>
                <div className="manual-card border border-slate-200 bg-slate-50 rounded-lg p-3">
                  <div className="font-bold text-slate-900">{t('Auditoría, Config. y Demo', 'Audit, Config & Demo Center')}</div>
                  <p className="text-slate-600 mt-1">{t('Registro inmutable de eventos, activación de analitos, usuarios y simulador de fallos/mensajes.', 'Immutable audit log, analyte toggles, user administration, and fault/message simulation center.')}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
