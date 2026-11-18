import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { tr, translateClinicalText } from '@/src/i18n/translations';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast, language } = useAnalyzer();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const toneStyles = {
          info: 'bg-white border-sky-300 text-slate-900',
          success: 'bg-white border-emerald-300 text-slate-900',
          warning: 'bg-amber-50 border-amber-300 text-amber-950',
          error: 'bg-red-50 border-red-300 text-red-950',
        }[toast.tone];

        const Icon = {
          info: Info,
          success: CheckCircle2,
          warning: AlertTriangle,
          error: XCircle,
        }[toast.tone];

        const iconColor = {
          info: 'text-sky-600',
          success: 'text-emerald-600',
          warning: 'text-amber-600',
          error: 'text-red-600',
        }[toast.tone];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-md transition-all ${toneStyles}`}
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">{translateClinicalText(language, toast.title)}</p>
              {toast.message && (
                <p className="text-xs opacity-85 mt-0.5">{translateClinicalText(language, toast.message)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="p-0.5 rounded hover:bg-black/5 text-slate-500"
              aria-label={tr(language, 'Cerrar notificación', 'Close notification')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
