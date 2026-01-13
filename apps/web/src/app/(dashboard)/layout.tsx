'use client';

import Sidebar from '@/components/Sidebar';
import { ChatWidget } from '@/components/ChatWidget';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="layout">
        <Sidebar />
        <main className="main-content">{children}</main>
      </div>
      <ChatWidget />
    </>
  );
}
