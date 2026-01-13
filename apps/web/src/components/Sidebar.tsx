'use client';

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Store
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/stores', label: 'Stores', icon: Store },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">{collapsed ? 'DH' : 'Dropship Hub'}</div>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        {collapsed && (
          <button
            className="sidebar-expand-btn"
            onClick={() => setCollapsed(false)}
            title="Expand Sidebar"
          >
            <ChevronRight size={16} />
          </button>
        )}
        <nav>
          <ul className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link href={item.href} className={isActive ? 'active' : ''} title={item.label}>
                    <Icon size={20} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
            <li className="sidebar-logout">
              <button onClick={handleLogout} className="logout-button" title="Logout">
                <LogOut size={20} />
                {!collapsed && <span>Logout</span>}
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      <div className={`sidebar-spacer ${collapsed ? 'collapsed' : ''}`} />
    </>
  );
}
