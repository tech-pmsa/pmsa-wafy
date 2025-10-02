// app/admins/manage-staff/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// Import the new, separated components
import { StaffCard } from '@/components/admin/manage-staff/StaffCard';
import { ViewStaffModal } from '@/components/admin/manage-staff/ViewStaffModal';
import { EditStaffModal } from '@/components/admin/manage-staff/EditStaffModal';

// UI Components
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from 'lucide-react';

// Type Definitions
export interface StaffProfile { uid: string; name: string; role: string; img_url: string | null; designation: string | null; email: string | null; }
export interface ClassCouncil { uid: string; batch: string | null; president: string | null; secretary: string | null; treasurer: string | null; auditor: string | null; vicepresident: string | null; jointsecretary: string | null; pro: string | null; }

export default function ManageStaffPage() {
    const [staffList, setStaffList] = useState<StaffProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const fetchStaff = async () => {
        setLoading(true); setError(null);
        try {
            const { data, error } = await supabase.from('profiles').select('*').order('name');
            if (error) throw error;
            setStaffList(data || []);
        } catch (err: any) {
            setError(err.message);
            toast.error("Failed to fetch staff", { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStaff(); }, []);

    const handleEditClick = (staff: StaffProfile) => { setSelectedStaff(staff); setIsEditModalOpen(true); };
    const handleViewClick = (staff: StaffProfile) => { setSelectedStaff(staff); setIsViewModalOpen(true); };
    const handleSaveSuccess = () => { fetchStaff(); };

    const groupedStaff = useMemo(() => {
        if (!staffList) return {};
        return staffList.reduce((acc, staff) => {
            let key = staff.designation || staff.role || 'Other';
            if (key.endsWith(' Class')) { key = key.replace(' Class', '').trim(); }
            if (!acc[key]) { acc[key] = []; }
            acc[key].push(staff);
            return acc;
        }, {} as Record<string, StaffProfile[]>);
    }, [staffList]);

    const tabNames = Object.keys(groupedStaff).sort();

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold font-heading">Manage Staff</h1>
                <p className="text-muted-foreground">View and manage staff profiles, grouped by designation.</p>
            </div>

            {error && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                </div>
            ) : (
                <Tabs defaultValue={tabNames[0]} className="w-full">
                    <div className="w-full overflow-x-auto pb-2">
                        <TabsList>
                            {tabNames.map(name => (<TabsTrigger key={name} value={name}>{name}</TabsTrigger>))}
                        </TabsList>
                    </div>
                    {Object.entries(groupedStaff).map(([groupName, staffInGroup]) => (
                        <TabsContent key={groupName} value={groupName} className="mt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {staffInGroup.map(staff => (
                                    <StaffCard key={staff.uid} staff={staff} onView={handleViewClick} onEdit={handleEditClick} />
                                ))}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            )}

            <ViewStaffModal isOpen={isViewModalOpen} setIsOpen={setIsViewModalOpen} staff={selectedStaff} />
            <EditStaffModal isOpen={isEditModalOpen} setIsOpen={setIsEditModalOpen} staff={selectedStaff} onSave={handleSaveSuccess} />
        </div>
    );
}