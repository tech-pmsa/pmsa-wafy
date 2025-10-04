// components/admin/manage-students/StudentCard.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, School, Users, Phone, View, Edit, Trash2 } from 'lucide-react';
import { StudentProfile } from '@/app/admins/manage-students/page'; // Adjust path if needed

export function StudentCard({ student, onView, onEdit, onDelete }: { student: StudentProfile; onView: (student: StudentProfile) => void; onEdit: (student: StudentProfile) => void; onDelete: (student: StudentProfile) => void; }) {
    return (
        <Card className="flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="flex flex-row items-center gap-4 p-4 bg-muted/30">
                <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-primary/20">
                    <AvatarImage src={student.img_url || undefined} alt={student.name} className='object-cover' />
                    <AvatarFallback><User className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <CardTitle className="truncate font-heading" title={student.name}>{student.name}</CardTitle>
                    <CardDescription>CIC: {student.cic || 'N/A'}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><School className="h-4 w-4 flex-shrink-0" /><span>{student.class_id}</span></div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4 flex-shrink-0" /><span>{student.council || 'N/A'}</span></div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 flex-shrink-0" /><span>{student.phone || 'N/A'}</span></div>
            </CardContent>
            <CardFooter className="p-4 pt-0 mt-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => onView(student)}><View className="mr-2 h-4 w-4" /> View</Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => onEdit(student)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                <Button variant="destructive" size="icon" className="flex-shrink-0" onClick={() => onDelete(student)}><Trash2 className="h-4 w-4" /></Button>
            </CardFooter>
        </Card>
    );
}