'use client';

import {
    RiCalendarCheckLine,
    RiTeamLine,
    RiPhoneLine,
    RiMoneyDollarCircleLine,
    RiArrowRightSLine,
    RiTimeLine,
    RiUser3Line,
} from 'react-icons/ri';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getDashboardStats } from '@/lib/actions';

type DashStats = {
    todayAppointments: number;
    totalStaff: number;
    aiCalls: number;
    monthlyRevenue: number;
    upcoming: any[];
    recentCalls: any[];
};

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.floor(hours / 24)} day(s) ago`;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await getDashboardStats();
            setStats(data);
            setLoading(false);
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <span>Loading dashboard...</span>
            </div>
        );
    }

    const s = stats || { todayAppointments: 0, totalStaff: 0, aiCalls: 0, monthlyRevenue: 0, upcoming: [], recentCalls: [] };

    return (
        <div className="page-content">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Dashboard</h1>
                    <p className="page-header-subtitle">
                        Welcome back — here&apos;s your business overview for today.
                    </p>
                </div>
                <Link href="/admin/appointments" className="btn btn-primary">
                    <RiCalendarCheckLine />
                    New Booking
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon purple"><RiCalendarCheckLine /></div>
                    <div>
                        <div className="stat-value">{s.todayAppointments}</div>
                        <div className="stat-label">Today&apos;s Appointments</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon teal"><RiTeamLine /></div>
                    <div>
                        <div className="stat-value">{s.totalStaff}</div>
                        <div className="stat-label">Active Staff</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><RiPhoneLine /></div>
                    <div>
                        <div className="stat-value">{s.aiCalls}</div>
                        <div className="stat-label">AI Calls This Month</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><RiMoneyDollarCircleLine /></div>
                    <div>
                        <div className="stat-value">${s.monthlyRevenue.toLocaleString()}</div>
                        <div className="stat-label">Monthly Revenue</div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="content-grid">
                {/* Upcoming Appointments */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Upcoming Appointments</h3>
                        <Link href="/admin/appointments" className="btn btn-ghost btn-sm">
                            View all <RiArrowRightSLine />
                        </Link>
                    </div>

                    {s.upcoming.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                            No upcoming appointments
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {s.upcoming.map((apt: any) => (
                                <div
                                    key={apt.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '14px',
                                        padding: '12px', background: 'var(--gray-50)',
                                        borderRadius: 'var(--radius-md)',
                                        borderLeft: `3px solid ${apt.service?.color || '#6366f1'}`,
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{apt.client_name}</div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                            {apt.service?.name || '—'} • {apt.staff?.full_name || '—'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', fontWeight: 600 }}>
                                            <RiTimeLine />
                                            {formatTime(apt.start_time)}
                                        </div>
                                        {apt.ai_call_sid && (
                                            <span className="badge badge-completed" style={{ marginTop: '4px', fontSize: '0.65rem' }}>
                                                🤖 AI Booked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent AI Calls */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent AI Calls</h3>
                        <Link href="/admin/calls" className="btn btn-ghost btn-sm">
                            View all <RiArrowRightSLine />
                        </Link>
                    </div>

                    {s.recentCalls.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                            No AI calls yet — calls will appear here when the AI agent handles phone bookings.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {s.recentCalls.map((call: any) => (
                                <div
                                    key={call.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '14px',
                                        padding: '12px', background: 'var(--gray-50)',
                                        borderRadius: 'var(--radius-md)',
                                    }}
                                >
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                        background: 'var(--primary-50)', color: 'var(--primary-600)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.1rem', flexShrink: 0,
                                    }}>
                                        <RiUser3Line />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{call.caller_phone}</div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                            Intent: {call.intent} • {timeAgo(call.created_at)}
                                        </div>
                                    </div>
                                    <span className={`badge ${call.status === 'completed' ? 'badge-confirmed' : 'badge-cancelled'}`}>
                                        {call.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
