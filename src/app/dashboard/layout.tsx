'use client';

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { LayoutDashboard, Trophy, PieChart, LogOut, Settings, Newspaper } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    if (loading) return null; // Or a loading spinner

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const navItems = [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'My Leagues', href: '/dashboard/leagues', icon: Trophy },
        { name: 'Portfolio', href: '/dashboard/portfolio', icon: PieChart },
        { name: 'News', href: '/dashboard/news', icon: Newspaper }, // Added News
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ];

    return (
        <div className="layout-container">
            {/* Desktop Sidebar */}
            <aside className="desktop-sidebar glass-panel">
                <h1 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '3rem', paddingLeft: '0.75rem' }}>
                    Stock League
                </h1>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx('nav-item', isActive ? 'active' : '')}
                            >
                                <Icon size={20} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <button onClick={handleSignOut} className="sign-out-btn">
                    <LogOut size={20} />
                    Sign Out
                </button>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="mobile-nav glass-panel">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx('mobile-nav-item', isActive ? 'active' : '')}
                        >
                            <Icon size={24} />
                            <span style={{ fontSize: '0.7rem' }}>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
