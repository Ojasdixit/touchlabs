'use client';

import { useState, useEffect } from 'react';
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiPaletteLine } from 'react-icons/ri';
import { getServices, createService, updateService, deleteService } from '@/lib/actions';

type Service = {
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: number;
    buffer_minutes: number;
    color: string;
    is_active: boolean;
};

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const defaultForm = {
    name: '',
    description: '',
    duration_minutes: 30,
    price: 0,
    buffer_minutes: 5,
    color: '#6366f1',
};

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(defaultForm);
    const [toast, setToast] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadServices = async () => {
        setLoading(true);
        const data = await getServices();
        setServices(data as Service[]);
        setLoading(false);
    };

    useEffect(() => { loadServices(); }, []);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData(defaultForm);
        setShowModal(true);
    };

    const openEdit = (service: Service) => {
        setEditingId(service.id);
        setFormData({
            name: service.name,
            description: service.description || '',
            duration_minutes: service.duration_minutes,
            price: service.price,
            buffer_minutes: service.buffer_minutes,
            color: service.color,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        if (editingId) {
            const result = await updateService(editingId, formData);
            if (result.error) { showToast(`Error: ${result.error}`); setSaving(false); return; }
            showToast('Service updated!');
        } else {
            const result = await createService(formData);
            if (result.error) { showToast(`Error: ${result.error}`); setSaving(false); return; }
            showToast('Service created!');
        }
        setSaving(false);
        setShowModal(false);
        loadServices();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this service?')) return;
        const result = await deleteService(id);
        if (result.error) { showToast(`Error: ${result.error}`); return; }
        showToast('Service deleted');
        loadServices();
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Services</h1>
                    <p className="page-header-subtitle">
                        Manage your service catalog — what clients can book.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    <RiAddLine /> Add Service
                </button>
            </div>

            {loading ? (
                <div className="loading-screen"><div className="spinner" /><span>Loading services...</span></div>
            ) : services.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                    <RiPaletteLine style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                    <h3 style={{ marginBottom: '8px' }}>No services yet</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                        Add your first service to start accepting bookings.
                    </p>
                    <button className="btn btn-primary" onClick={openCreate}>
                        <RiAddLine /> Add First Service
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
                    {services.map((service) => (
                        <div className="card" key={service.id} style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ height: '4px', background: service.color }} />
                            <div style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <h3 style={{ fontSize: '1rem', margin: 0 }}>{service.name}</h3>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(service)}><RiEditLine /></button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(service.id)} style={{ color: 'var(--error-600)' }}><RiDeleteBinLine /></button>
                                    </div>
                                </div>
                                {service.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>{service.description}</p>}
                                <div style={{ display: 'flex', gap: '16px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                    <span>⏱ {service.duration_minutes} min</span>
                                    <span>💰 ${Number(service.price).toFixed(2)}</span>
                                    {service.buffer_minutes > 0 && <span>🔄 {service.buffer_minutes} min buffer</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">{editingId ? 'Edit Service' : 'New Service'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Service Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Haircut & Style" required />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="Optional description" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Duration (min)</label>
                                    <input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })} min={5} />
                                </div>
                                <div className="form-group">
                                    <label>Price ($)</label>
                                    <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} min={0} step="0.01" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Buffer (min)</label>
                                    <input type="number" value={formData.buffer_minutes} onChange={(e) => setFormData({ ...formData, buffer_minutes: parseInt(e.target.value) || 0 })} min={0} />
                                </div>
                                <div className="form-group">
                                    <label>Color</label>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                        {COLORS.map((c) => (
                                            <div key={c} onClick={() => setFormData({ ...formData, color: c })} style={{
                                                width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                                                border: formData.color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                                                transition: 'all 0.15s',
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !formData.name}>
                                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="toast toast-success">{toast}</div>}
        </div>
    );
}
