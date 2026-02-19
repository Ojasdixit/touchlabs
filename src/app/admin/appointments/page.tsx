'use client';

import { useState, useEffect } from 'react';
import {
    RiAddLine, RiCheckLine, RiCloseLine, RiPhoneLine, RiGlobalLine,
    RiSmartphoneLine, RiCalendarLine,
} from 'react-icons/ri';
import {
    getAppointments, createAppointment, updateAppointmentStatus,
    getServices, getStaff,
} from '@/lib/actions';

type Apt = {
    id: string;
    client_name: string;
    client_phone: string;
    start_time: string;
    end_time: string;
    status: string;
    booked_via: string;
    ai_call_sid: string | null;
    notes: string | null;
    service: { name: string; color: string } | null;
    staff: { full_name: string } | null;
};

const statusColors: Record<string, string> = {
    confirmed: 'badge-confirmed',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
    no_show: 'badge-cancelled',
};

const viaIcon: Record<string, React.ReactNode> = {
    phone: <RiPhoneLine />,
    web: <RiGlobalLine />,
    app: <RiSmartphoneLine />,
};

function formatDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<Apt[]>([]);
    const [services, setServicesList] = useState<{ id: string; name: string; duration_minutes: number }[]>([]);
    const [staffList, setStaffList] = useState<{ id: string; full_name: string }[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        staff_id: '', service_id: '', client_name: '', client_phone: '',
        date: '', time: '', booked_via: 'web', notes: '',
    });

    const loadAll = async () => {
        setLoading(true);
        const [apts, svcs, stf] = await Promise.all([getAppointments(), getServices(), getStaff()]);
        setAppointments(apts as Apt[]);
        setServicesList(svcs as any[]);
        setStaffList(stf as any[]);
        setLoading(false);
    };

    useEffect(() => { loadAll(); }, []);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    const filtered = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter);

    const handleStatusChange = async (id: string, status: string) => {
        const result = await updateAppointmentStatus(id, status);
        if (result.error) { showToast(`Error: ${result.error}`); return; }
        showToast(`Appointment ${status}`);
        loadAll();
    };

    const handleCreate = async () => {
        if (!form.staff_id || !form.service_id || !form.client_name || !form.client_phone || !form.date || !form.time) {
            showToast('Please fill all required fields');
            return;
        }
        setSaving(true);
        const selectedService = services.find((s) => s.id === form.service_id);
        const duration = selectedService?.duration_minutes || 30;
        const startTime = new Date(`${form.date}T${form.time}`).toISOString();
        const endTime = new Date(new Date(`${form.date}T${form.time}`).getTime() + duration * 60000).toISOString();

        const result = await createAppointment({
            staff_id: form.staff_id,
            service_id: form.service_id,
            client_name: form.client_name,
            client_phone: form.client_phone,
            start_time: startTime,
            end_time: endTime,
            booked_via: form.booked_via,
            notes: form.notes || undefined,
        });

        if (result.error) { showToast(`Error: ${result.error}`); setSaving(false); return; }
        showToast('Appointment created!');
        setSaving(false);
        setShowModal(false);
        setForm({ staff_id: '', service_id: '', client_name: '', client_phone: '', date: '', time: '', booked_via: 'web', notes: '' });
        loadAll();
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Appointments</h1>
                    <p className="page-header-subtitle">Manage all bookings — manual and AI-created.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <RiAddLine /> New Booking
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
                {['all', 'confirmed', 'completed', 'cancelled', 'no_show'].map((s) => (
                    <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>
                        {s === 'all' ? 'All' : s.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loading-screen"><div className="spinner" /><span>Loading appointments...</span></div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                    <RiCalendarLine style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                    <h3 style={{ marginBottom: '8px' }}>No appointments</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {filter === 'all' ? 'Create your first booking to get started.' : `No ${filter} appointments.`}
                    </p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Service</th>
                                <th>Staff</th>
                                <th>Date & Time</th>
                                <th>Source</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((apt) => (
                                <tr key={apt.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{apt.client_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{apt.client_phone}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: apt.service?.color || '#6366f1' }} />
                                            {apt.service?.name || '—'}
                                        </div>
                                    </td>
                                    <td>{apt.staff?.full_name || '—'}</td>
                                    <td style={{ fontSize: '0.8125rem' }}>{formatDateTime(apt.start_time)}</td>
                                    <td>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem' }}>
                                            {viaIcon[apt.booked_via] || null}
                                            {apt.ai_call_sid ? '🤖' : ''} {apt.booked_via}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${statusColors[apt.status] || 'badge-pending'}`}>
                                            {apt.status}
                                        </span>
                                    </td>
                                    <td>
                                        {apt.status === 'confirmed' && (
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(apt.id, 'completed')} title="Complete">
                                                    <RiCheckLine style={{ color: 'var(--success-600)' }} />
                                                </button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(apt.id, 'cancelled')} title="Cancel">
                                                    <RiCloseLine style={{ color: 'var(--error-600)' }} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* New Booking Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">New Booking</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Client Name *</label>
                                    <input type="text" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="John Doe" required />
                                </div>
                                <div className="form-group">
                                    <label>Client Phone *</label>
                                    <input type="tel" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} placeholder="+1 (555) 000-0000" required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Service *</label>
                                    <select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} style={{ padding: '10px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', width: '100%' }}>
                                        <option value="">Select service</option>
                                        {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Staff *</label>
                                    <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} style={{ padding: '10px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', width: '100%' }}>
                                        <option value="">Select staff</option>
                                        {staffList.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date *</label>
                                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Time *</label>
                                    <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional notes" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                                {saving ? 'Creating...' : 'Book Appointment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="toast toast-success">{toast}</div>}
        </div>
    );
}
