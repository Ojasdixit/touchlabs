'use client';

import { useState, useEffect } from 'react';
import { RiSaveLine, RiSettings3Line } from 'react-icons/ri';
import { getTenantSettings, updateTenantSettings } from '@/lib/actions';

export default function SettingsPage() {
    const [form, setForm] = useState({
        name: '',
        slug: '',
        timezone: 'UTC',
        phone_number: '',
    });
    const [plan, setPlan] = useState('free');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const data = await getTenantSettings();
            if (data) {
                setForm({
                    name: data.name || '',
                    slug: data.slug || '',
                    timezone: data.timezone || 'UTC',
                    phone_number: data.phone_number || '',
                });
                setPlan(data.plan || 'free');
            }
            setLoading(false);
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const result = await updateTenantSettings(form);
        setSaving(false);
        if (result.error) {
            setToast(`Error: ${result.error}`);
        } else {
            setToast('Settings saved!');
        }
        setTimeout(() => setToast(null), 3000);
    };

    if (loading) {
        return <div className="page-content"><div className="loading-screen"><div className="spinner" /><span>Loading settings...</span></div></div>;
    }

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Settings</h1>
                    <p className="page-header-subtitle">Manage your business profile and preferences.</p>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    <RiSaveLine /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <RiSettings3Line style={{ marginRight: '8px' }} />
                        Business Profile
                    </h3>
                </div>

                <div className="form-group">
                    <label>Business Name</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Booking Slug</label>
                        <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            /book/{form.slug || '...'}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Timezone</label>
                        <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                            <option value="America/New_York">Eastern (US)</option>
                            <option value="America/Chicago">Central (US)</option>
                            <option value="America/Denver">Mountain (US)</option>
                            <option value="America/Los_Angeles">Pacific (US)</option>
                            <option value="Europe/London">London (UK)</option>
                            <option value="Europe/Paris">Central Europe</option>
                            <option value="Asia/Kolkata">India (IST)</option>
                            <option value="Asia/Tokyo">Japan (JST)</option>
                            <option value="UTC">UTC</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Business Phone (Twilio)</label>
                    <input type="tel" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+1 (555) 000-0000" />
                </div>

                <div className="form-group" style={{ marginTop: 'var(--space-6)' }}>
                    <label>Current Plan</label>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', background: 'var(--primary-50)',
                        color: 'var(--primary-600)', borderRadius: 'var(--radius-md)',
                        fontWeight: 600, fontSize: '0.875rem',
                    }}>
                        {plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </div>
                </div>
            </div>

            {toast && <div className="toast toast-success">{toast}</div>}
        </div>
    );
}
