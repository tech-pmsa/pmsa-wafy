// components/admin/AdminSidebar.tsx
'use client';

import Sidebar from '../Sidebar';

interface AdminSidebarProps {
    onLinkClick?: () => void;
}

export default function AdminSidebar({ onLinkClick }: AdminSidebarProps) {
    return <Sidebar onLinkClick={onLinkClick} />;
}