'use client';

import { useState, useEffect } from 'react';
import {
    RiPhoneLine,
    RiArrowDownSLine,
    RiArrowUpSLine,
    RiCheckboxCircleLine,
    RiCloseCircleLine,
    RiLoader4Line,
    RiAlarmWarningLine,
} from 'react-icons/ri';
import { getCallLogs } from '@/lib/actions';

type CallLog = {
    id: string;
    call_sid: string | null;
    caller_phone: string | null;
    direction: string | null;
    transcript: string | null;
    intent: string | null;
    llm_provider: string | null;
    status: string | null;
    duration_seconds: number | null;
    created_at: string;
};

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    completed: { icon: RiCheckboxCircleLine, color: '#16a34a', bg: '#f0fdf4' },
    failed: { icon: RiCloseCircleLine, color: '#dc2626', bg: '#fef2f2' },
    in_progress: { icon: RiLoader4Line, color: '#2563eb', bg: '#eff6ff' },
    escalated: { icon: RiAlarmWarningLine, color: '#d97706', bg: '#fffbeb' },
};

function formatDuration(secs: number | null) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CallLogsPage() {
    const [calls, setCalls] = useState<CallLog[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await getCallLogs();
            setCalls(data as CallLog[]);
            setLoading(false);
        };
        load();
    }, []);

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="page-header-left">
                    <h1>AI Call Logs</h1>
                    <p className="page-header-subtitle">
                        View transcripts and outcomes from AI-handled phone calls.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="loading-screen"><div className="spinner" /><span>Loading call logs...</span></div>
            ) : calls.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                    <RiPhoneLine style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                    <h3 style={{ marginBottom: '8px' }}>No AI calls yet</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
                        When your AI agent starts handling phone calls via Twilio, transcripts and outcomes will appear here.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {calls.map((call) => {
                        const sc = statusConfig[call.status || 'in_progress'] || statusConfig.in_progress;
                        const StatusIcon = sc.icon;
                        const isExpanded = expandedId === call.id;

                        return (
                            <div className="card" key={call.id} style={{ padding: 0, overflow: 'hidden' }}>
                                <div
                                    onClick={() => setExpandedId(isExpanded ? null : call.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '14px',
                                        padding: '16px 20px', cursor: 'pointer',
                                    }}
                                >
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                        background: sc.bg, color: sc.color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.2rem', flexShrink: 0,
                                    }}>
                                        <StatusIcon />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                            {call.caller_phone || 'Unknown'}
                                        </div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                            {call.direction} • Intent: {call.intent || '—'} • {formatDuration(call.duration_seconds)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                            {new Date(call.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </div>
                                        <span className={`badge ${call.status === 'completed' ? 'badge-confirmed' : call.status === 'failed' ? 'badge-cancelled' : 'badge-pending'}`} style={{ marginTop: '4px' }}>
                                            {call.status}
                                        </span>
                                    </div>
                                    {isExpanded ? <RiArrowUpSLine /> : <RiArrowDownSLine />}
                                </div>

                                {isExpanded && call.transcript && (
                                    <div style={{
                                        padding: '16px 20px',
                                        borderTop: '1px solid var(--border-color)',
                                        background: 'var(--gray-50)',
                                    }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Transcript</div>
                                        <pre style={{
                                            whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)',
                                            fontSize: '0.8125rem', lineHeight: 1.6,
                                            background: 'var(--bg-elevated)', padding: '14px',
                                            borderRadius: 'var(--radius-md)',
                                        }}>
                                            {call.transcript}
                                        </pre>
                                        {call.llm_provider && (
                                            <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                LLM Provider: {call.llm_provider}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
