// components/admin/manage-staff/StaffCard.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Briefcase, Mail, View, Edit } from 'lucide-react';
import { StaffProfile } from '@/app/admins/officer/manage-staff/page';

export function StaffCard({ staff, onView, onEdit }: { staff: StaffProfile; onView: (staff: StaffProfile) => void; onEdit: (staff: StaffProfile) => void; }) {
    return (
        <Card className="flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="flex flex-row items-center gap-4 p-4">
                <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-primary/20">
                    <AvatarImage src={staff.img_url || undefined} alt={staff.name} className="object-cover" />
                    <AvatarFallback><User className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <CardTitle className="truncate font-heading" title={staff.name}>{staff.name}</CardTitle>
                    <CardDescription className="capitalize">{staff.role}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{staff.designation || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{staff.email || 'No email provided'}</span>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 mt-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => onView(staff)}><View className="mr-2 h-4 w-4" /> View Details</Button>
                <Button variant="secondary" size="sm" className="w-full" onClick={() => onEdit(staff)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
            </CardFooter>
        </Card>
    );
}