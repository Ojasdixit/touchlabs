'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import './login.css';

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        router.push('/admin');
        router.refresh();
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        setSuccess('Account created! Check your email for confirmation, or sign in directly if email confirmation is disabled.');
        setLoading(false);
        setMode('login');
    };

    return (
        <div className="login-page">
            <div className="login-card">
                {/* Brand */}
                <div className="login-brand">
                    <div className="landing-logo-icon" style={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                        BF
                    </div>
                    <h1 className="login-title">
                        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="login-subtitle">
                        {mode === 'login'
                            ? 'Sign in to your BookFlow AI dashboard'
                            : 'Set up your admin account'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
                    {mode === 'signup' && (
                        <div className="form-group">
                            <label htmlFor="fullName">Full Name</label>
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your full name"
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div className="form-error" style={{
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

                    {success && (
                        <div style={{
                            padding: '10px 14px',
                            background: '#f0fdf4',
                            color: '#16a34a',
                            borderRadius: '8px',
                            fontSize: '0.8125rem',
                            marginBottom: '12px',
                        }}>
                            {success}
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
                                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                            </>
                        ) : (
                            mode === 'login' ? 'Sign In' : 'Create Account'
                        )}
                    </button>
                </form>

                <div className="login-divider">
                    <span>{mode === 'login' ? 'No account?' : 'Already have an account?'}</span>
                </div>

                <button
                    onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                >
                    {mode === 'login' ? 'Create Account' : 'Back to Sign In'}
                </button>

                <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
                    <Link href="/" style={{ fontSize: '0.8125rem' }}>
                        ← Back to Homepage
                    </Link>
                </div>
            </div>
        </div>
    );
}
