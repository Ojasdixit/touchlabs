'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { RiEditLine, RiTeamLine, RiDeleteBinLine } from 'react-icons/ri';
import { getStaff, updateStaffProfile, createStaffMember, deleteStaffMember, resetStaffPassword } from '@/lib/actions';

type StaffMember = {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    role: string;
    is_active: boolean;
};

const GRADIENTS = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #14b8a6, #06b6d4)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #ec4899, #8b5cf6)',
    'linear-gradient(135deg, #84cc16, #14b8a6)',
];

export default function StaffPage() {
    const [staff, setStaffList] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', role: 'staff', password: '' });
    const [toast, setToast] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const loadStaff = async () => {
        setLoading(true);
        const data = await getStaff();
        setStaffList(data as StaffMember[]);
        setLoading(false);
    };

    useEffect(() => { loadStaff(); }, []);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const openEdit = (member: StaffMember) => {
        setEditingId(member.id);
        setFormData({
            full_name: member.full_name,
            email: member.email || '',
            phone: member.phone || '',
            role: member.role,
            password: '' // Reset field
        });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData({ full_name: '', email: '', phone: '', role: 'staff', password: '' });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);

        if (editingId) {
            // Update
            const result = await updateStaffProfile(editingId, {
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone,
                role: formData.role
            });

            // Password Reset Check
            if (formData.password && formData.password.trim().length > 0) {
                const passRes = await resetStaffPassword(editingId, formData.password);
                if (passRes.error) {
                    showToast(`Profile updated, but password reset failed: ${passRes.error}`);
                    setSaving(false);
                    return;
                }
            }

            if (result.error) { showToast(`Error: ${result.error}`); setSaving(false); return; }
            showToast('Profile updated!');
        } else {
            // Create
            if (!formData.email || !formData.full_name) {
                showToast('Name and Email required');
                setSaving(false);
                return;
            }
            const result = await createStaffMember({
                fullName: formData.full_name,
                email: formData.email,
                role: formData.role,
                password: formData.password
            });

            if (result.error) { showToast(`Error: ${result.error}`); setSaving(false); return; }
            showToast(`Staff created! Password: ${formData.password || 'ChangeMe123!'}`);
        }

        setSaving(false);
        setShowModal(false);
        loadStaff();
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
        setLoading(true);
        const res = await deleteStaffMember(id);
        if (res.error) showToast(`Error: ${res.error}`);
        else { showToast('Staff member deleted'); }
        loadStaff();
    };

    const toggleActive = async (id: string, currentState: boolean) => {
        const result = await updateStaffProfile(id, { is_active: !currentState });
        if (result.error) { showToast(`Error: ${result.error}`); return; }
        showToast(!currentState ? 'Staff activated' : 'Staff deactivated');
        loadStaff();
    };

    const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Staff</h1>
                    <p className="page-header-subtitle">
                        Manage your team members. Add staff, set passwords, and manage permissions.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    + Add Staff
                </button>
            </div>

            {loading ? (
                <div className="loading-screen"><div className="spinner" /><span>Loading staff...</span></div>
            ) : staff.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                    <RiTeamLine style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                    <h3 style={{ marginBottom: '8px' }}>No staff members yet</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Add your first staff member to get started.
                    </p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th>Contact</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map((member, i) => (
                                <tr key={member.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: '50%',
                                                background: GRADIENTS[i % GRADIENTS.length],
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                                            }}>
                                                {getInitials(member.full_name)}
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{member.full_name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.8125rem' }}>{member.email || '—'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{member.phone || ''}</div>
                                    </td>
                                    <td>
                                        <span className={`badge ${member.role === 'admin' || member.role === 'superadmin' ? 'badge-completed' : 'badge-pending'}`}>
                                            {member.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            onClick={() => toggleActive(member.id, member.is_active)}
                                            className={`badge ${member.is_active ? 'badge-confirmed' : 'badge-cancelled'}`}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {member.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(member)}>
                                                <RiEditLine /> Edit
                                            </button>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-500)' }} onClick={() => handleDelete(member.id, member.full_name)}>
                                                <RiDeleteBinLine />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit/Create Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">{editingId ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{editingId ? 'Reset Password (Optional)' : 'Password'}</label>
                                <input
                                    type="text"
                                    placeholder={editingId ? "Enter new password OR leave blank" : "Enter password (default: ChangeMe123!)"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="toast toast-success">{toast}</div>}
        </div>
    );
}
