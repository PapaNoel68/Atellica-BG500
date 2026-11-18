import React, { useMemo, useState } from 'react';
import {
  Archive,
  CheckCheck,
  Eye,
  Inbox,
  MessageSquarePlus,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { AtellicaMessage } from '@/src/types/analyzer';
import {
  localeFor,
  resolveAtellicaText,
  tr,
  translateAtellicaPriority,
  translateAtellicaStatus,
  translateAtellicaType,
  translateClinicalText,
} from '@/src/i18n/translations';

interface AtellicaConnectPanelProps {
  compact?: boolean;
}

export const AtellicaConnectPanel: React.FC<AtellicaConnectPanelProps> = () => {
  const {
    state,
    language,
    pendingMessagesCount,
    can,
    markAtellicaRead,
    confirmAtellicaReception,
    archiveAtellicaMessage,
    triggerDemoAtellicaMessage,
  } = useAnalyzer();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ARCHIVED'>('ALL');
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(
    state.atellicaInbox[0]?.id ?? null
  );

  const filteredInbox = useMemo(() => {
    return state.atellicaInbox.filter((m) => {
      if (statusFilter === 'PENDING') {
        return m.status === 'Recibido' || m.status === 'Pendiente de lectura';
      }
      if (statusFilter === 'ARCHIVED') return m.status === 'Archivado';
      return m.status !== 'Archivado';
    });
  }, [state.atellicaInbox, statusFilter]);

  const selectedMessage: AtellicaMessage | undefined = useMemo(
    () =>
      state.atellicaInbox.find((m) => m.id === selectedMsgId) ??
      filteredInbox[0] ??
      state.atellicaInbox[0],
    [state.atellicaInbox, selectedMsgId, filteredInbox]
  );

  const handleOpenMessage = (msg: AtellicaMessage) => {
    setSelectedMsgId(msg.id);
    if (msg.status === 'Recibido' || msg.status === 'Pendiente de lectura') {
      markAtellicaRead(msg.id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header: Read-only Coordinator Notices */}
      <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-[#E8630A]" />
            <h3 className="font-display font-bold text-base text-slate-900">
              {tr(language, 'Avisos del Coordinador (Atellica Connect)', 'Coordinator Notices (Atellica Connect)')}
            </h3>
            {state.communicationStatus === 'CONECTADO' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <Wifi className="w-3.5 h-3.5" />
                {tr(language, 'Enlace activo', 'Link active')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                <WifiOff className="w-3.5 h-3.5" />
                {tr(language, 'Enlace desconectado', 'Link disconnected')}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {tr(
              language,
              `${pendingMessagesCount} aviso(s) pendiente(s) de lectura · Listado de avisos recibidos con fecha, hora y trazabilidad de lectura y confirmación (solo recepción).`,
              `${pendingMessagesCount} unread notice(s) · Received notices list with date, time, read and confirmation traceability (receive-only).`
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => triggerDemoAtellicaMessage()}
          className="px-3 py-1.5 rounded-lg border border-[#0066B2] bg-sky-50 hover:bg-sky-100 text-xs font-semibold text-[#0066B2] flex items-center gap-1.5 whitespace-nowrap"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          <span>{tr(language, 'Simular aviso entrante', 'Simulate incoming notice')}</span>
        </button>
      </div>

      {/* INBOX ONLY VIEW */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* List of Received Notices */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col min-h-0 overflow-hidden">
          <div className="p-2.5 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50/40 shrink-0">
            {(
              [
                {
                  id: 'ALL',
                  label: `${tr(language, 'Todos', 'All')} (${state.atellicaInbox.filter((m) => m.status !== 'Archivado').length})`,
                },
                {
                  id: 'PENDING',
                  label: `${tr(language, 'Pendientes', 'Pending')} (${pendingMessagesCount})`,
                },
                { id: 'ARCHIVED', label: tr(language, 'Archivados', 'Archived') },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-slate-100 flex-1 min-h-0 overflow-y-auto">
            {filteredInbox.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {tr(language, 'No hay avisos del coordinador en esta bandeja.', 'No coordinator notices in this folder.')}
              </div>
            ) : (
              filteredInbox.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const isUnread =
                  msg.status === 'Recibido' || msg.status === 'Pendiente de lectura';
                return (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => handleOpenMessage(msg)}
                    className={`w-full text-left p-3.5 transition-colors ${
                      isSelected
                        ? 'bg-sky-50/80'
                        : isUnread
                          ? 'bg-amber-50/40 hover:bg-slate-50'
                          : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span
                        className={`font-semibold ${
                          msg.priority === 'Urgente'
                            ? 'text-red-700'
                            : msg.priority === 'Alta'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                        }`}
                      >
                        {translateAtellicaPriority(language, msg.priority)} ·{' '}
                        {translateAtellicaType(language, msg.type)}
                      </span>
                      <span className="font-mono text-slate-500 whitespace-nowrap">
                        {new Date(msg.receivedAt).toLocaleString(localeFor(language), {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                      {resolveAtellicaText(language, msg, 'title')}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                      {resolveAtellicaText(language, msg, 'body')}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 truncate max-w-[180px]">
                        {resolveAtellicaText(language, msg, 'sender')}
                      </span>
                      <span
                        className={`font-semibold ${
                          isUnread
                            ? 'text-amber-700'
                            : msg.status === 'Confirmado'
                              ? 'text-emerald-700'
                              : 'text-sky-700'
                        }`}
                      >
                        {translateAtellicaStatus(language, msg.status)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Notice Detail & Traceability */}
        <div className="lg:col-span-7 p-4 flex flex-col min-h-0 overflow-hidden">
          {selectedMessage ? (
            <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-2.5 shrink-0">
                <div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-slate-700">
                      {selectedMessage.id}
                    </span>
                    <span>·</span>
                    <span>{translateAtellicaType(language, selectedMessage.type)}</span>
                    <span>·</span>
                    <span
                      className={`font-semibold ${
                        selectedMessage.priority === 'Urgente'
                          ? 'text-red-700'
                          : selectedMessage.priority === 'Alta'
                            ? 'text-amber-700'
                            : 'text-slate-700'
                      }`}
                    >
                      {tr(language, 'Prioridad', 'Priority')}{' '}
                      {translateAtellicaPriority(language, selectedMessage.priority)}
                    </span>
                  </div>
                  <h4 className="font-display font-bold text-base text-slate-900 mt-0.5">
                    {resolveAtellicaText(language, selectedMessage, 'title')}
                  </h4>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {tr(language, 'De:', 'From:')}{' '}
                    <strong>{resolveAtellicaText(language, selectedMessage, 'sender')}</strong> ·{' '}
                    {tr(language, 'Recibido el', 'Received on')}{' '}
                    <span className="font-mono">
                      {new Date(selectedMessage.receivedAt).toLocaleString(localeFor(language))}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-semibold px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-800">
                  {tr(language, 'Estado:', 'Status:')}{' '}
                  {translateAtellicaStatus(language, selectedMessage.status)}
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-300 rounded-lg p-3 text-xs text-slate-900 leading-relaxed shrink-0">
                {resolveAtellicaText(language, selectedMessage, 'body')}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {can('CONFIRM_MESSAGE_READ') && (
                  <>
                    <button
                      type="button"
                      onClick={() => markAtellicaRead(selectedMessage.id)}
                      disabled={
                        selectedMessage.status === 'Leído' ||
                        selectedMessage.status === 'Confirmado'
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{tr(language, 'Marcar como leído', 'Mark as read')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => confirmAtellicaReception(selectedMessage.id)}
                      disabled={selectedMessage.status === 'Confirmado'}
                      className="px-3 py-1.5 rounded-lg bg-[#0066B2] hover:bg-[#005291] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>{tr(language, 'Confirmar recepción', 'Confirm receipt')}</span>
                    </button>
                  </>
                )}

                {selectedMessage.status !== 'Archivado' && can('CONFIRM_MESSAGE_READ') && (
                  <button
                    type="button"
                    onClick={() => archiveAtellicaMessage(selectedMessage.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 ml-auto"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{tr(language, 'Archivar', 'Archive')}</span>
                  </button>
                )}
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="text-xs font-semibold text-slate-700 mb-1.5 shrink-0">
                  {tr(language, 'Trazabilidad de lectura y confirmaciones', 'Read & confirmation traceability')}
                </div>
                <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
                  {selectedMessage.history.map((h, i) => (
                    <div
                      key={i}
                      className="text-[11px] flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded px-3 py-1.5"
                    >
                      <span>
                        <strong>{translateClinicalText(language, h.userName)}</strong> ·{' '}
                        {translateAtellicaStatus(language, h.previousStatus)} →{' '}
                        <strong className="text-slate-900">
                          {translateAtellicaStatus(language, h.newStatus)}
                        </strong>
                      </span>
                      <span className="font-mono text-slate-500">
                        {new Date(h.timestamp).toLocaleString(localeFor(language))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-slate-500 py-12">
              {tr(
                language,
                'Seleccione un aviso del coordinador para ver la fecha, hora y trazabilidad de lectura.',
                'Select a coordinator notice to view date, time, and read traceability.'
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
