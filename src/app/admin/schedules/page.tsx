'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { RiTimeLine, RiSaveLine } from 'react-icons/ri';
import { getStaff, getStaffSchedules, saveStaffSchedules } from '@/lib/actions';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type ScheduleRow = {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_working: boolean;
};

const defaultSchedule: ScheduleRow[] = DAYS.map((_, i) => ({
    day_of_week: i,
    start_time: i >= 1 && i <= 5 ? '09:00' : '',
    end_time: i >= 1 && i <= 5 ? '17:00' : '',
    is_working: i >= 1 && i <= 5,
}));

export default function SchedulesPage() {
    const [staffList, setStaffList] = useState<{ id: string; full_name: string }[]>([]);
    const [selectedStaff, setSelectedStaff] = useState('');
    const [schedule, setSchedule] = useState<ScheduleRow[]>(defaultSchedule);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    // Load staff list on mount
    useEffect(() => {
        const load = async () => {
            const data = await getStaff();
            const staffData = data as { id: string; full_name: string }[];
            setStaffList(staffData);
            if (staffData.length > 0) {
                setSelectedStaff(staffData[0].id);
            }
            setLoading(false);
        };
        load();
    }, []);

    // Load selected staff's schedule
    useEffect(() => {
        if (!selectedStaff) return;
        const loadSchedule = async () => {
            const data = await getStaffSchedules(selectedStaff);
            if (data.length > 0) {
                // Merge with defaults
                const merged = DAYS.map((_, i) => {
                    const found = data.find((d: any) => d.day_of_week === i);
                    if (found) return {
                        day_of_week: i,
                        start_time: (found as any).start_time?.slice(0, 5) || '',
                        end_time: (found as any).end_time?.slice(0, 5) || '',
                        is_working: (found as any).is_working,
                    };
                    return { day_of_week: i, start_time: '', end_time: '', is_working: false };
                });
                setSchedule(merged);
            } else {
                setSchedule(defaultSchedule);
            }
        };
        loadSchedule();
    }, [selectedStaff]);

    const updateRow = (day: number, field: keyof ScheduleRow, value: string | boolean) => {
        setSchedule((prev) =>
            prev.map((row) =>
                row.day_of_week === day ? { ...row, [field]: value } : row
            )
        );
    };

    const handleSave = async () => {
        if (!selectedStaff) return;
        setSaving(true);
        const result = await saveStaffSchedules(selectedStaff, schedule);
        setSaving(false);
        if (result.error) {
            setToast(`Error: ${result.error}`);
        } else {
            setToast('Schedule saved!');
        }
        setTimeout(() => setToast(null), 3000);
    };

    if (loading) {
        return <div className="page-content"><div className="loading-screen"><div className="spinner" /><span>Loading...</span></div></div>;
    }

    if (staffList.length === 0) {
        return (
            <div className="page-content">
                <div className="page-header"><div className="page-header-left"><h1>Schedules</h1></div></div>
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                    <RiTimeLine style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                    <h3>No staff members yet</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Add staff members first to set their schedules.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Schedules</h1>
                    <p className="page-header-subtitle">Set recurring weekly working hours for each staff member.</p>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    <RiSaveLine /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Staff Selector */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <label>Select Staff Member</label>
                <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} style={{ maxWidth: '300px' }}>
                    {staffList.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <RiTimeLine style={{ marginRight: '8px' }} />
                        Weekly Schedule — {staffList.find((s) => s.id === selectedStaff)?.full_name}
                    </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(() => {
                        const todayIndex = new Date().getDay();
                        const sortedSchedule = [...schedule].sort((a, b) => {
                            // Calculate distance from today (0 to 6)
                            const diffA = (a.day_of_week - todayIndex + 7) % 7;
                            const diffB = (b.day_of_week - todayIndex + 7) % 7;
                            return diffA - diffB;
                        });

                        return sortedSchedule.map((row) => (
                            <div key={row.day_of_week} style={{
                                display: 'grid', gridTemplateColumns: '140px 60px 1fr 1fr',
                                gap: '12px', alignItems: 'center', padding: '12px 14px',
                                background: row.is_working ? 'var(--gray-50)' : 'transparent',
                                borderRadius: 'var(--radius-md)', opacity: row.is_working ? 1 : 0.5,
                            }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                    {DAYS[row.day_of_week]}
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                                        {(() => {
                                            const d = new Date();
                                            const currentDay = d.getDay(); // 0=Sun
                                            let diff = row.day_of_week - currentDay;
                                            if (diff < 0) diff += 7; // Show next occurrence if day has passed
                                            const target = new Date();
                                            target.setDate(d.getDate() + diff);
                                            return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        })()}
                                    </span>
                                </span>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8125rem', margin: 0, fontWeight: 500, color: row.is_working ? 'var(--success-600)' : 'var(--text-tertiary)' }}>
                                    <input type="checkbox" checked={row.is_working} onChange={(e) => updateRow(row.day_of_week, 'is_working', e.target.checked)} style={{ accentColor: 'var(--primary-600)' }} />
                                    {row.is_working ? 'On' : 'Off'}
                                </label>
                                {row.is_working ? (
                                    <>
                                        <input type="time" value={row.start_time} onChange={(e) => updateRow(row.day_of_week, 'start_time', e.target.value)} />
                                        <input type="time" value={row.end_time} onChange={(e) => updateRow(row.day_of_week, 'end_time', e.target.value)} />
                                    </>
                                ) : (
                                    <span style={{ gridColumn: 'span 2', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Day off</span>
                                )}
                            </div>
                        ))
                    })()}
                </div>
            </div>

            {toast && <div className="toast toast-success">{toast}</div>}
        </div>
    );
}
