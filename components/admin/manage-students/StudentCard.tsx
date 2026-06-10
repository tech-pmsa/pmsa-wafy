// components/admin/manage-students/StudentCard.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, School, Users, Phone, View, Edit, Trash2 } from 'lucide-react';
import { StudentProfile } from '@/app/admins/manage-students/page'; // Adjust path if needed

export function StudentCard({
    student,
    onView,
    onEdit,
    onDelete,
    readOnly = false
}: {
    student: StudentProfile;
    onView: (student: StudentProfile) => void;
    onEdit?: (student: StudentProfile) => void;
    onDelete?: (student: StudentProfile) => void;
    readOnly?: boolean;
}) {
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
            <CardFooter className="p-4 pt-0 mt-auto flex flex-wrap items-center gap-1.5 w-full">
                <Button variant="outline" size="sm" className="flex-1 min-w-[70px] text-xs px-2 h-8" onClick={() => onView(student)}>
                    <View className="mr-1 h-3.5 w-3.5 shrink-0" />
                    <span>View</span>
                </Button>
                {!readOnly && onEdit && (
                    <Button variant="outline" size="sm" className="flex-1 min-w-[70px] text-xs px-2 h-8" onClick={() => onEdit(student)}>
                        <Edit className="mr-1 h-3.5 w-3.5 shrink-0" />
                        <span>Edit</span>
                    </Button>
                )}
                {!readOnly && onDelete && (
                    <Button variant="destructive" size="sm" className="flex-1 sm:flex-initial min-w-[36px] px-2.5 h-8" onClick={() => onDelete(student)}>
                        <Trash2 className="h-3.5 w-3.5 mx-auto" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}