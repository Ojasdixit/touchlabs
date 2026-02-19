'use client';

import { useState, useEffect, useRef } from 'react';
import { RiRobotLine, RiSaveLine, RiPlayCircleLine, RiSendPlaneLine, RiShieldKeyholeLine, RiAddLine, RiDeleteBinLine } from 'react-icons/ri';
import { getTenantSettings, testAIChat, debugFixAccount, getBossProfiles, createBossProfile, deleteBossProfile } from '@/lib/actions';
import { createBrowserClient } from '@supabase/ssr';

export default function AIAgentPage() {
    const [config, setConfig] = useState({
        name: 'Touch Labs',
        context: '', // Added business context
        persona_name: 'Luna',
        greeting: 'Hi! Thank you for calling. This is Luna, your AI booking assistant. How can I help you today?',
        escalation_phone: '',
        voice_style: 'friendly, professional, warm.',
        max_retries: 2,
        llm_provider: 'groq',
    });
    const [toast, setToast] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [tenantId, setTenantId] = useState<string>('');

    // Chat State
    const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Boss Profiles State
    const [bossProfiles, setBossProfiles] = useState<any[]>([]);
    const [newBossName, setNewBossName] = useState('');
    const [bossLoading, setBossLoading] = useState(false);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const load = async () => {
            const tenant = await getTenantSettings();
            if (tenant) {
                setTenantId(tenant.id);
                const savedAI = (tenant.ai_config as Record<string, any>) || {};
                setConfig((prev) => ({
                    ...prev,
                    name: tenant.name || 'Touch Labs',
                    ...savedAI,
                }));
            }
            // Load Boss Profiles
            const profiles = await getBossProfiles();
            setBossProfiles(profiles);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSave = async () => {
        setSaving(true);
        const tenant = await getTenantSettings();
        if (!tenant) { setToast('No tenant found'); setSaving(false); return; }

        const { name, ...aiConfig } = config; // Extract name, rest is AI config

        const { error } = await supabase
            .from('tenants')
            .update({
                name: name,
                ai_config: aiConfig
            })
            .eq('id', tenant.id);

        setSaving(false);
        if (error) {
            setToast(`Error: ${error.message}`);
        } else {
            setToast('AI agent config saved!');
        }
        setTimeout(() => setToast(null), 3000);
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;

        if (!tenantId) {
            setChatMessages((prev) => [...prev, { role: 'user', content: chatInput }, { role: 'assistant', content: '⚠️ Error: Tenant Context is missing. Please refresh the page or check your account setup.' }]);
            setChatInput('');
            return;
        }

        const newMsg = { role: 'user', content: chatInput };
        const newHistory = [...chatMessages, newMsg];
        setChatMessages(newHistory);
        setChatInput('');
        setChatLoading(true);

        const response = await testAIChat(newHistory, config, tenantId);

        setChatMessages((prev) => [...prev, { role: 'assistant', content: response || 'Error: No response' }]);
        setChatLoading(false);
    };

    if (loading) {
        return <div className="page-content"><div className="loading-screen"><div className="spinner" /><span>Loading...</span></div></div>;
    }

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="page-header-left">
                    <h1>AI Agent</h1>
                    <p className="page-header-subtitle">
                        Configure your AI calling agent — persona, greeting, and behavior.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    <RiSaveLine /> {saving ? 'Saving...' : 'Save Config'}
                </button>
            </div>

            <div className="content-grid">
                {/* Persona Config */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <RiRobotLine style={{ marginRight: '8px' }} />
                            Business Context & Persona
                        </h3>
                    </div>

                    <div className="form-group">
                        <label>Business Name</label>
                        <input
                            type="text"
                            value={config.name}
                            onChange={(e) => setConfig({ ...config, name: e.target.value })}
                            placeholder="e.g. Touch Labs, Glow Salon"
                            style={{ fontWeight: 'bold' }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Business Description (Context for AI)</label>
                        <textarea
                            value={config.context || ''}
                            onChange={(e) => setConfig({ ...config, context: e.target.value })}
                            rows={3}
                            placeholder="Briefly describe your business. e.g. 'We are a luxury hair salon in NYC specializing in color and cuts.'"
                        />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            This helps the AI answer general questions about your business.
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Persona Name</label>
                        <input
                            type="text"
                            value={config.persona_name}
                            onChange={(e) => setConfig({ ...config, persona_name: e.target.value })}
                            placeholder="e.g. Luna, Max, Aria"
                        />
                    </div>

                    <div className="form-group">
                        <label>Greeting Message</label>
                        <textarea
                            value={config.greeting}
                            onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
                            rows={3}
                            placeholder="The first thing the AI says when answering a call..."
                        />
                    </div>

                    <div className="form-group">
                        <label>Voice Style Description</label>
                        <input
                            type="text"
                            value={config.voice_style}
                            onChange={(e) => setConfig({ ...config, voice_style: e.target.value })}
                            placeholder="friendly, professional, warm"
                        />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            Used for Parler-TTS voice generation in testing mode.
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Escalation Phone</label>
                            <input
                                type="tel"
                                value={config.escalation_phone}
                                onChange={(e) => setConfig({ ...config, escalation_phone: e.target.value })}
                                placeholder="Admin phone for call transfers"
                            />
                        </div>
                        <div className="form-group">
                            <label>Max Retry Attempts</label>
                            <input
                                type="number"
                                value={config.max_retries}
                                onChange={(e) => setConfig({ ...config, max_retries: parseInt(e.target.value) || 0 })}
                                min={0}
                                max={5}
                            />
                        </div>
                    </div>

                    {/* Boss Profiles Section */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <RiShieldKeyholeLine style={{ color: 'var(--primary-600)', fontSize: '1.2rem' }} />
                            <label style={{ fontWeight: 600, margin: 0 }}>Boss Mode (Admin Profiles)</label>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                            Each admin gets a unique code (e.g. NIKHIL-4829). Say this code in the chatbot to unlock admin tools like creating/deleting staff.
                        </div>

                        {/* Existing Boss Profiles */}
                        {bossProfiles.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                {bossProfiles.map((bp: any) => (
                                    <div key={bp.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 14px', borderRadius: 'var(--radius-md)',
                                        background: 'var(--gray-50)', border: '1px solid var(--border-color)'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{bp.boss_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontFamily: 'monospace', fontWeight: 700 }}>
                                                {bp.boss_code}
                                            </div>
                                            {bp.user && (
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                                    Linked to: {bp.user.full_name} ({bp.user.email})
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            className="btn"
                                            onClick={async () => {
                                                if (confirm(`Remove boss "${bp.boss_name}"?`)) {
                                                    await deleteBossProfile(bp.id);
                                                    setBossProfiles((prev) => prev.filter((p: any) => p.id !== bp.id));
                                                }
                                            }}
                                            style={{ color: 'var(--danger-500)', padding: '4px 8px', fontSize: '0.8rem' }}
                                        >
                                            <RiDeleteBinLine />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add New Boss */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                value={newBossName}
                                onChange={(e) => setNewBossName(e.target.value)}
                                placeholder="Boss name (e.g. Nikhil)"
                                style={{ flex: 1 }}
                                disabled={bossLoading}
                            />
                            <button
                                className="btn btn-primary"
                                disabled={!newBossName.trim() || bossLoading || !tenantId}
                                onClick={async () => {
                                    setBossLoading(true);
                                    const supabaseLocal = createBrowserClient(
                                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                                    );
                                    const { data: { user } } = await supabaseLocal.auth.getUser();
                                    if (!user) { alert('Not logged in'); setBossLoading(false); return; }
                                    const result = await createBossProfile(newBossName.trim(), user.id);
                                    if (result.error) {
                                        alert('Error: ' + result.error);
                                    } else if (result.data) {
                                        setBossProfiles((prev) => [result.data, ...prev]);
                                        setNewBossName('');
                                    }
                                    setBossLoading(false);
                                }}
                                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <RiAddLine /> {bossLoading ? 'Adding...' : 'Add Boss'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Chat Test Interface */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
                    <div className="card-header">
                        <h3 className="card-title">
                            <RiPlayCircleLine style={{ marginRight: '8px' }} />
                            Test Agent (Chat Mode)
                            <span style={{ fontSize: '0.65rem', marginLeft: '8px', color: tenantId ? 'var(--success-500)' : 'var(--danger-500)', fontWeight: 'normal', display: 'flex', alignItems: 'center' }}>
                                {tenantId ? `(ID: ${tenantId.substring(0, 6)}...)` : (
                                    <>
                                        (No Context)
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                    const res = await debugFixAccount();
                                                    alert(res.message);
                                                    if (res.success) window.location.reload();
                                                } catch (err) { alert('Error: ' + err); }
                                            }}
                                            style={{ marginLeft: '6px', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '4px' }}
                                        >Fix Account</button>
                                    </>
                                )}
                            </span>
                        </h3>
                        <span className="badge badge-confirmed">Live — Groq Llama 3.3</span>
                    </div>

                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '16px',
                        background: 'var(--gray-50)', display: 'flex', flexDirection: 'column', gap: '12px'
                    }}>
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '80%',
                                padding: '10px 14px',
                                borderRadius: 'var(--radius-md)',
                                background: msg.role === 'user' ? 'var(--primary-600)' : 'white',
                                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                                boxShadow: msg.role === 'assistant' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                fontSize: '0.875rem',
                                lineHeight: '1.5',
                            }}>
                                {msg.role === 'assistant' && (
                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary-600)', marginBottom: '4px' }}>
                                        {config.persona_name}
                                    </div>
                                )}
                                {msg.content}
                            </div>
                        ))}
                        {chatLoading && (
                            <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: 'white', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></div>
                                Thinking...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message to test..."
                            style={{ flex: 1 }}
                            disabled={chatLoading}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleSendMessage}
                            disabled={chatLoading || !chatInput.trim()}
                            style={{ padding: '0 16px' }}
                        >
                            <RiSendPlaneLine />
                        </button>
                    </div>
                </div>
            </div>

            {toast && <div className="toast toast-success">{toast}</div>}
        </div>
    );
}
