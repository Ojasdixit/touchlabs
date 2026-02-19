'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    RiDashboardLine,
    RiCalendarLine,
    RiScissorsLine,
    RiTeamLine,
    RiTimeLine,
    RiPhoneLine,
    RiSettings3Line,
    RiNotification3Line,
    RiSearchLine,
    RiMenuLine,
    RiCloseLine,
    RiRobotLine,
    RiLogoutBoxRLine,
} from 'react-icons/ri';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { getRecentBookings } from '@/lib/actions';
import './admin.css';

const navItems = [
    {
        section: 'Overview',
        items: [
            { name: 'Dashboard', href: '/admin', icon: RiDashboardLine },
            { name: 'Appointments', href: '/admin/appointments', icon: RiCalendarLine },
        ],
    },
    {
        section: 'Management',
        items: [
            { name: 'Services', href: '/admin/services', icon: RiScissorsLine },
            { name: 'Staff', href: '/admin/staff', icon: RiTeamLine },
            { name: 'Schedules', href: '/admin/schedules', icon: RiTimeLine },
        ],
    },
    {
        section: 'AI & Voice',
        items: [
            { name: 'AI Call Logs', href: '/admin/calls', icon: RiPhoneLine },
            { name: 'AI Agent', href: '/admin/ai-agent', icon: RiRobotLine },
        ],
    },
    {
        section: 'System',
        items: [
            { name: 'Settings', href: '/admin/settings', icon: RiSettings3Line },
        ],
    },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        const fetchNotifs = async () => {
            const data = await getRecentBookings();
            if (data) setNotifications(data);
        };
        fetchNotifs();
    }, [pathname]);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const getUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                setUser({
                    email: authUser.email,
                    full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
                });

                // Check if user has a tenant — if not, redirect to onboarding
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tenant_id')
                    .eq('id', authUser.id)
                    .single();

                if (profile && !profile.tenant_id && pathname !== '/admin/onboard') {
                    router.push('/admin/onboard');
                }
            }
        };
        getUser();
    }, [pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    // Don't show the admin shell on the onboarding page
    if (pathname === '/admin/onboard') {
        return <>{children}</>;
    }

    const displayName = user?.full_name || 'Admin';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-logo">BF</div>
                    <div className="sidebar-brand-text">
                        <span className="sidebar-brand-name">BookFlow</span>
                        <span className="sidebar-brand-tag">AI Platform</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((section) => (
                        <div className="nav-section" key={section.section}>
                            <div className="nav-section-title">{section.section}</div>
                            {section.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <span className="nav-icon">
                                        <item.icon />
                                    </span>
                                    <span>{item.name}</span>
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar">{initials}</div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{displayName}</div>
                            <div className="sidebar-user-role">{user?.email || 'Administrator'}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '1.1rem',
                            transition: 'color 0.2s',
                            marginTop: '8px',
                            width: '100%',
                            gap: '8px',
                        }}
                        title="Sign out"
                    >
                        <RiLogoutBoxRLine /> <span style={{ fontSize: '0.8125rem' }}>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-header">
                    <div className="admin-header-left">
                        <button
                            className="mobile-menu-btn"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label="Toggle menu"
                        >
                            {sidebarOpen ? <RiCloseLine /> : <RiMenuLine />}
                        </button>
                    </div>

                    <div className="admin-header-right">
                        <div className="header-search">
                            <RiSearchLine className="header-search-icon" />
                            <input type="text" placeholder="Search appointments, clients..." />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <button
                                className="notification-btn"
                                aria-label="Notifications"
                                onClick={() => setNotifOpen(!notifOpen)}
                            >
                                <RiNotification3Line />
                                {notifications.length > 0 && <span className="notification-dot" />}
                            </button>

                            {notifOpen && (
                                <>
                                    <div
                                        style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                                        onClick={() => setNotifOpen(false)}
                                    />
                                    <div className="card" style={{
                                        position: 'absolute', top: '120%', right: -10, width: '320px',
                                        padding: 0, zIndex: 100, marginTop: '8px', overflow: 'hidden',
                                        boxShadow: 'var(--shadow-xl)', animation: 'slideDown 0.2s ease-out'
                                    }}>
                                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--gray-50)', fontWeight: 600, fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Recent Bookings</span>
                                            <span className="badge badge-completed" style={{ fontSize: '0.7em' }}>{notifications.length}</span>
                                        </div>
                                        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                            {notifications.length === 0 ? (
                                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                                                    No new notifications
                                                </div>
                                            ) : (
                                                notifications.map((n) => (
                                                    <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', fontSize: '0.8125rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <span style={{ fontWeight: 600 }}>{n.client_name || 'Client'}</span>
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                                                {n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent'}
                                                            </span>
                                                        </div>
                                                        <div style={{ color: 'var(--text-secondary)' }}>
                                                            Booked <strong>{n.service?.name}</strong><br />
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--primary-600)' }}>
                                                                For: {new Date(n.start_time).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-elevated)' }}>
                                            <Link href="/admin/appointments" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setNotifOpen(false)}>
                                                View All Appointments
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {children}
            </main>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="modal-overlay"
                    style={{ zIndex: 99 }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
