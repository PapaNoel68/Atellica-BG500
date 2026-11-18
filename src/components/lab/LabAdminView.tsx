import React, { useEffect, useState } from 'react';
import {
  Lock,
  MessageSquarePlus,
  RotateCcw,
  Send,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAnalyzer } from '@/src/store/AnalyzerContext';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@/src/engines/parameterDefinitions';
import {
  AtellicaMessagePriority,
  AtellicaMessageType,
  UserRole,
} from '@/src/types/analyzer';
import {
  resolveAtellicaText,
  tr,
  translateAtellicaPriority,
  translateAtellicaStatus,
  translateAtellicaType,
  translateClinicalText,
  translateRole,
} from '@/src/i18n/translations';

const ATELLICA_TYPES: AtellicaMessageType[] = [
  'Información',
  'Aviso operativo',
  'Aviso de control de calidad',
  'Incidencia técnica',
  'Comunicación urgente',
  'Actualización de procedimientos',
  'Aviso de mantenimiento',
];

const ATELLICA_PRIORITIES: AtellicaMessagePriority[] = ['Normal', 'Alta', 'Urgente'];

export const LabAdminView: React.FC = () => {
  const {
    state,
    language,
    can,
    addUser,
    updateUser,
    simulateIncomingAtellica,
    resetDemoDatabase,
    pushToast,
  } = useAnalyzer();

  // New user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('demo123');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('ENFERMERIA');
  const [newDept, setNewDept] = useState('UCI Polivalente');
  const [userError, setUserError] = useState<string | null>(null);

  // Atellica simulator form
  const defaultTitleEs = 'Aviso urgente de Control POCT';
  const defaultTitleEn = 'Urgent POCT Control Notice';
  const defaultBodyEs =
    'Por favor, verifique el nivel de cartucho de lavado y confirme lectura desde el panel clínico.';
  const defaultBodyEn =
    'Please check the wash cartridge level and confirm read acknowledgment from the clinical panel.';
  const defaultSenderEs = 'Atellica Connect · Coordinación POCT';
  const defaultSenderEn = 'Atellica Connect · POCT Coordination';

  const [msgTitle, setMsgTitle] = useState(() =>
    language === 'en' ? defaultTitleEn : defaultTitleEs
  );
  const [msgBody, setMsgBody] = useState(() =>
    language === 'en' ? defaultBodyEn : defaultBodyEs
  );
  const [msgType, setMsgType] = useState<AtellicaMessageType>('Comunicación urgente');
  const [msgPriority, setMsgPriority] = useState<AtellicaMessagePriority>('Urgente');
  const [msgSender, setMsgSender] = useState(() =>
    language === 'en' ? defaultSenderEn : defaultSenderEs
  );

  useEffect(() => {
    setMsgTitle((prev) =>
      prev === defaultTitleEs || prev === defaultTitleEn
        ? language === 'en'
          ? defaultTitleEn
          : defaultTitleEs
        : prev
    );
    setMsgBody((prev) =>
      prev === defaultBodyEs || prev === defaultBodyEn
        ? language === 'en'
          ? defaultBodyEn
          : defaultBodyEs
        : prev
    );
    setMsgSender((prev) =>
      prev === defaultSenderEs || prev === defaultSenderEn
        ? language === 'en'
          ? defaultSenderEn
          : defaultSenderEs
        : prev
    );
  }, [language]);

  if (!can('MANAGE_USERS')) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-xl mx-auto space-y-3">
        <Lock className="w-8 h-8 text-slate-400 mx-auto" />
        <h3 className="font-display font-bold text-base text-slate-900">
          {tr(language, 'Administración Exclusiva de Sistemas / Administrador', 'System Administration Only / Administrator')}
        </h3>
        <p className="text-xs text-slate-600">
          {tr(language, 'Solo el perfil ', 'Only the ')}
          <strong>{translateRole(language, 'ADMINISTRADOR')}</strong>
          {tr(
            language,
            ' puede gestionar usuarios, permisos globales, simular mensajes entrantes de Atellica Connect o restaurar los datos de demostración.',
            ' profile can manage users, global permissions, simulate incoming Atellica Connect messages, or restore demo data.'
          )}
        </p>
      </div>
    );
  }

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    if (!newUsername.trim() || !newFullName.trim()) {
      setUserError(tr(language, 'Complete identificador y nombre completo.', 'Enter username and full name.'));
      return;
    }
    const res = addUser({
      username: newUsername.trim(),
      passwordDemo: newPassword.trim() || 'demo123',
      fullName: newFullName.trim(),
      role: newRole,
      department: newDept.trim(),
      active: true,
    });
    if (!res.ok) {
      setUserError(res.error ? translateClinicalText(language, res.error) : tr(language, 'Error creando usuario.', 'Error creating user.'));
      return;
    }
    setNewUsername('');
    setNewFullName('');
  };

  const handleSendSimulatedIncoming = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTitle.trim() || !msgBody.trim()) return;
    simulateIncomingAtellica({
      title: msgTitle.trim(),
      body: msgBody.trim(),
      type: msgType,
      priority: msgPriority,
      sender: msgSender.trim() || 'Atellica Connect',
    });
  };

  const handleScheduleDemoMessage = () => {
    pushToast({
      tone: 'info',
      title: tr(language, 'Mensaje programado (3 segundos)', 'Scheduled message (3 seconds)'),
      message: tr(language, 'El middleware simulará una recepción en breve.', 'Middleware will simulate an incoming message shortly.'),
    });
    setTimeout(() => {
      simulateIncomingAtellica({
        title: tr(language, 'Mensaje Programado de Demostración', 'Scheduled Demo Message'),
        titleEs: 'Mensaje Programado de Demostración',
        titleEn: 'Scheduled Demo Message',
        body: tr(
          language,
          'Aviso automático programado desde el simulador de Atellica Connect para verificar alertas de lectura.',
          'Automatic notice scheduled from the Atellica Connect simulator to verify read alerts.'
        ),
        bodyEs:
          'Aviso automático programado desde el simulador de Atellica Connect para verificar alertas de lectura.',
        bodyEn:
          'Automatic notice scheduled from the Atellica Connect simulator to verify read alerts.',
        type: 'Aviso operativo',
        priority: 'Alta',
        sender: tr(language, 'Atellica Connect · Programador Demo', 'Atellica Connect · Demo Scheduler'),
        senderEs: 'Atellica Connect · Programador Demo',
        senderEn: 'Atellica Connect · Demo Scheduler',
      });
    }, 3000);
  };

  const readStats = state.atellicaInbox.map((m) => {
    let mins: string = tr(language, 'Pendiente', 'Pending');
    if (m.readAt) {
      const diff = (new Date(m.readAt).getTime() - new Date(m.receivedAt).getTime()) / 60000;
      mins = `${Math.max(0, diff).toFixed(1)} min`;
    }
    return {
      id: m.id,
      title: resolveAtellicaText(language, m, 'title'),
      status: translateAtellicaStatus(language, m.status),
      readTime: mins,
      confirmedBy: m.confirmedBy ?? '—',
    };
  });

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0 overflow-hidden">
      {/* Top Action Header */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0066B2]" />
            <span>{tr(language, 'Administración de Usuarios, Permisos y Simulador Atellica', 'User Administration, Permissions & Atellica Simulator')}</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            {tr(
              language,
              'Control operativo de perfiles y simulación de avisos entrantes / tiempos de lectura',
              'Operational profile control and incoming notice / read-time simulation'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetDemoDatabase()}
          className="px-3.5 py-1.5 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-900 text-xs font-semibold flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{tr(language, 'Restaurar datos de demostración', 'Restore demo data')}</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        {/* LEFT 7 COLS: USERS LIST + NEW USER FORM */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2.5 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-2 px-2.5">{tr(language, 'Usuario', 'Username')}</th>
                  <th className="py-2 px-2.5">{tr(language, 'Nombre completo', 'Full name')}</th>
                  <th className="py-2 px-2.5">{tr(language, 'Perfil asignado', 'Assigned profile')}</th>
                  <th className="py-2 px-2.5">{tr(language, 'Permisos', 'Permissions')}</th>
                  <th className="py-2 px-2.5">{tr(language, 'Estado', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2.5 font-mono font-semibold text-slate-900">{u.username}</td>
                    <td className="py-1.5 px-2.5 font-medium text-slate-900">
                      <div>{u.fullName}</div>
                      <div className="text-[10px] text-slate-500">{translateClinicalText(language, u.department)}</div>
                    </td>
                    <td className="py-1.5 px-2.5">
                      <select
                        value={u.role}
                        onChange={(e) => updateUser(u.id, { role: e.target.value as UserRole })}
                        className="px-2 py-1 rounded border border-slate-300 bg-white text-[11px] font-medium"
                      >
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map((rk) => (
                          <option key={rk} value={rk}>
                            {translateRole(language, rk)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-600">
                      {ROLE_PERMISSIONS[u.role].length} {tr(language, 'cap.', 'cap.')}
                    </td>
                    <td className="py-1.5 px-2.5">
                      <button
                        type="button"
                        onClick={() => updateUser(u.id, { active: !u.active })}
                        className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                          u.active
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-slate-100 border-slate-300 text-slate-600'
                        }`}
                      >
                        {u.active ? tr(language, 'Activo', 'Active') : tr(language, 'Desact.', 'Disabled')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add New User */}
          <form onSubmit={handleCreateUser} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2 shrink-0">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-[#0066B2]" />
              <span>{tr(language, 'Dar de alta nuevo operador de demostración', 'Register new demo operator')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={tr(language, 'Usuario (ej. enf.perez)', 'Username (e.g. nurse.smith)')}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono"
              />
              <input
                type="text"
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder={tr(language, 'Nombre completo', 'Full name')}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white"
              />
              <input
                type="text"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                placeholder={tr(language, 'Servicio / Unidad', 'Department / Unit')}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white"
              >
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((rk) => (
                  <option key={rk} value={rk}>
                    {translateRole(language, rk)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={tr(language, 'Clave demo', 'Demo password')}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-[#0066B2] hover:bg-[#005291] text-white font-semibold"
              >
                {tr(language, 'Añadir usuario', 'Add user')}
              </button>
            </div>
            {userError && <div className="text-xs text-red-700 font-medium">{userError}</div>}
          </form>
        </div>

        {/* RIGHT 5 COLS: ATELLICA SIMULATOR + READ CONFIRMATION STATS */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 min-h-0 overflow-hidden">
          <form
            onSubmit={handleSendSimulatedIncoming}
            className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shrink-0"
          >
            <h3 className="font-display font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <MessageSquarePlus className="w-4 h-4 text-[#0066B2]" />
              <span>{tr(language, 'Simulador Mensajes Entrantes (Atellica → RP500e)', 'Incoming Message Simulator (Atellica → RP500e)')}</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">{tr(language, 'Tipo de aviso', 'Notice type')}</label>
                <select
                  value={msgType}
                  onChange={(e) => setMsgType(e.target.value as AtellicaMessageType)}
                  className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                >
                  {ATELLICA_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {translateAtellicaType(language, t)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">{tr(language, 'Prioridad', 'Priority')}</label>
                <select
                  value={msgPriority}
                  onChange={(e) => setMsgPriority(e.target.value as AtellicaMessagePriority)}
                  className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                >
                  {ATELLICA_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {translateAtellicaPriority(language, p)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">{tr(language, 'Título', 'Title')}</label>
                <input
                  type="text"
                  required
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  className="w-full px-2 py-1 rounded border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">{tr(language, 'Remitente', 'Sender')}</label>
                <input
                  type="text"
                  value={msgSender}
                  onChange={(e) => setMsgSender(e.target.value)}
                  className="w-full px-2 py-1 rounded border border-slate-300"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">{tr(language, 'Contenido', 'Content')}</label>
              <textarea
                required
                rows={2}
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                className="w-full px-2 py-1 rounded border border-slate-300"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[#0066B2] hover:bg-[#005291] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{tr(language, 'Enviar ahora', 'Send now')}</span>
              </button>
              <button
                type="button"
                onClick={handleScheduleDemoMessage}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold"
              >
                {tr(language, 'Programar (+3s)', 'Schedule (+3s)')}
              </button>
            </div>
          </form>

          {/* Read times & confirmations */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
            <h3 className="font-display font-bold text-xs text-slate-900 flex items-center gap-1.5 shrink-0">
              <Shield className="w-4 h-4 text-[#0066B2]" />
              <span>{tr(language, 'Control de Confirmaciones y Tiempos de Lectura', 'Confirmation Control & Read Times')}</span>
            </h3>
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto border border-slate-100 rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-semibold text-slate-500">
                    <th className="py-1.5 px-2">{tr(language, 'Mensaje', 'Message')}</th>
                    <th className="py-1.5 px-2">{tr(language, 'Estado', 'Status')}</th>
                    <th className="py-1.5 px-2">{tr(language, 'T. lect.', 'Read time')}</th>
                    <th className="py-1.5 px-2">{tr(language, 'Confirmó', 'Confirmed by')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {readStats.map((rs) => (
                    <tr key={rs.id}>
                      <td className="py-1.5 px-2 font-medium text-slate-900 max-w-[140px] truncate">
                        {rs.title}
                      </td>
                      <td className="py-1.5 px-2 font-semibold text-slate-700">{rs.status}</td>
                      <td className="py-1.5 px-2 font-mono text-slate-600">{rs.readTime}</td>
                      <td className="py-1.5 px-2 text-slate-600 truncate max-w-[110px]">{rs.confirmedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
