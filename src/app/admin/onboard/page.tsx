'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { onboardTenant } from '@/lib/actions';

export default function OnboardPage() {
    const router = useRouter();
    const [businessName, setBusinessName] = useState('');
    const [slug, setSlug] = useState('');
    const [timezone, setTimezone] = useState('America/New_York');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSlugGenerate = (name: string) => {
        setBusinessName(name);
        setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await onboardTenant(businessName, slug, timezone);

        if (result.error) {
            setError(typeof result.error === 'string' ? result.error : 'Setup failed');
            setLoading(false);
            return;
        }

        router.push('/admin');
        router.refresh();
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--gray-900) 0%, #1a1a2e 50%, var(--gray-900) 100%)',
            padding: 'var(--space-8)',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '480px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-10)',
                boxShadow: 'var(--shadow-xl)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <div style={{
                        width: 56, height: 56,
                        background: 'linear-gradient(135deg, var(--primary-600), var(--accent-400))',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 800, fontSize: '1.3rem',
                        margin: '0 auto var(--space-4)',
                    }}>
                        BF
                    </div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-1)' }}>
                        Set Up Your Business
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Let&apos;s get your BookFlow AI workspace ready.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Business Name</label>
                        <input
                            type="text"
                            value={businessName}
                            onChange={(e) => handleSlugGenerate(e.target.value)}
                            placeholder="e.g. Downtown Barbershop"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Booking URL Slug</label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="downtown-barbershop"
                            required
                        />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            Your booking page: /book/{slug || '...'}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Timezone</label>
                        <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
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

                    {error && (
                        <div style={{
                            padding: '10px 14px',
                            background: '#fef2f2',
                            color: '#dc2626',
                            borderRadius: '8px',
                            fontSize: '0.8125rem',
                            marginBottom: '12px',
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 'var(--space-4)' }}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                Setting up...
                            </>
                        ) : (
                            'Create Workspace'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
