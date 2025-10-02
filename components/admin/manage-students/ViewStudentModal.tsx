// components/admin/manage-students/ViewStudentModal.tsx
'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { User, Briefcase, Home, Shield, Users as FamilyIcon, Mail, Phone, Building, UserCheck, PhoneCall, BookMarked } from 'lucide-react';
import { AcademicEntry, FamilyData, StudentProfile } from '@/app/admins/manage-students/page'; // Adjust path if needed

// Helper component for displaying a line of profile information
function ProfileInfoLine({ icon: Icon, label, value, isList = false }: { icon: React.ElementType, label: string, value: any, isList?: boolean }) {
    return (
        <div className="flex items-start gap-4">
            <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-1" aria-hidden="true" />
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                {isList && Array.isArray(value) && value.length > 0 ? (
                    <ul className="list-disc pl-5 font-medium">
                        {value.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                ) : (
                    <p className="font-medium">{value || 'N/A'}</p>
                )}
            </div>
        </div>
    );
}

export function ViewStudentModal({ isOpen, setIsOpen, student }: { isOpen: boolean; setIsOpen: (open: boolean) => void; student: StudentProfile | null; }) {
    const [marks, setMarks] = useState<AcademicEntry[]>([]);
    const [familyData, setFamilyData] = useState<Partial<FamilyData>>({});
    const [isLoadingData, setIsLoadingData] = useState(false);

    useEffect(() => {
        const fetchExtraData = async () => {
            if (!student) return;
            setIsLoadingData(true);
            const marksPromise = supabase.from('academic_entries').select('*, subject_marks(*)').eq('student_uid', student.uid);
            const familyPromise = supabase.from('family_data').select('*').eq('student_uid', student.uid).single();
            const [{ data: marksData }, { data: familyDataRes }] = await Promise.all([marksPromise, familyPromise]);
            setMarks(marksData || []);
            setFamilyData(familyDataRes || {});
            setIsLoadingData(false);
        };
        if (isOpen) {
            fetchExtraData();
        }
    }, [student, isOpen]);

    if (!student) return null;

    const personalDetails = [
        { label: 'CIC', value: student.cic, icon: UserCheck },
        { label: 'Class', value: student.class_id, icon: Building },
        { label: 'Batch', value: student.batch, icon: Shield },
        { label: 'Council', value: student.council, icon: FamilyIcon },
        { label: 'Phone', value: student.phone, icon: Phone },
        { label: 'Guardian', value: student.guardian, icon: User },
        { label: 'Guardian Phone', value: student.g_phone, icon: PhoneCall },
        { label: 'SSLC Board', value: student.sslc, icon: BookMarked },
        { label: 'Plus Two Board', value: student.plustwo, icon: BookMarked },
        { label: 'Plus Two Stream', value: student.plustwo_streams, icon: BookMarked },
        { label: 'Address', value: student.address, icon: Home, fullWidth: true },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col">
                <DialogHeader className="flex flex-col items-center text-center pt-4">
                    <Avatar className="h-24 w-24 mb-4 border-4 border-primary/20">
                        <AvatarImage src={student.img_url || undefined} alt={student.name} className='object-cover' />
                        <AvatarFallback><User className="h-12 w-12" /></AvatarFallback>
                    </Avatar>
                    <DialogTitle className="text-2xl font-heading">{student.name}</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="personal" className="w-full flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="personal">Personal</TabsTrigger><TabsTrigger value="academics">Academics</TabsTrigger><TabsTrigger value="family">Family</TabsTrigger></TabsList>

                    <TabsContent value="personal" className="mt-4 flex-1 overflow-y-auto pr-2">
                        <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {personalDetails.map(item => (
                                <div key={item.label} className={item.fullWidth ? 'sm:col-span-2' : ''}>
                                    <ProfileInfoLine icon={item.icon} label={item.label} value={item.value} />
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="academics" className="mt-4 flex-1 overflow-y-auto pr-2">
                        <div className="py-4">
                            {isLoadingData ? (<Skeleton className="h-24 w-full" />) : marks.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full space-y-2">
                                    {marks.map(entry => (
                                        <AccordionItem key={entry.id} value={`item-${entry.id}`} className="border rounded-md">
                                            <AccordionTrigger className="px-4 font-semibold hover:no-underline">{entry.title}</AccordionTrigger>
                                            <AccordionContent className="px-2 pb-2">
                                                <Table>
                                                    <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Mark/Grade</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                        {entry.subject_marks.map(subject => (
                                                            <TableRow key={subject.id}><TableCell className="font-medium uppercase">{subject.subject_name}</TableCell><TableCell className="uppercase">{subject.marks_obtained}</TableCell><TableCell className="text-right"><Badge variant={subject.status ? 'default' : 'destructive'} className={subject.status ? "bg-green-600/80" : ""}>{subject.status ? 'Passed' : 'Failed'}</Badge></TableCell></TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            ) : (<p className="text-center text-muted-foreground py-12">No academic marks found.</p>)}
                        </div>
                    </TabsContent>

                    <TabsContent value="family" className="mt-4 flex-1 overflow-y-auto pr-2">
                        <div className="py-4">
                            {isLoadingData ? (<Skeleton className="h-40 w-full" />) : (
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader><CardTitle>Parent & Household</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <ProfileInfoLine icon={User} label="Father's Name" value={familyData.father_name} />
                                            <ProfileInfoLine icon={Briefcase} label="Father's Occupation" value={familyData.father_occupation} />
                                            <ProfileInfoLine icon={User} label="Mother's Name" value={familyData.mother_name} />
                                            <ProfileInfoLine icon={Briefcase} label="Mother's Occupation" value={familyData.mother_occupation} />
                                            <ProfileInfoLine icon={FamilyIcon} label="Total Family Members" value={familyData.total_family_members} />
                                            <ProfileInfoLine icon={Home} label="House Type" value={familyData.house_type} />
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle>Sibling Information</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <div><h4 className="font-medium">Brothers</h4>
                                                {familyData.brothers && familyData.brothers.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">{familyData.brothers.map((bro, i) => <Card key={i}><CardHeader><CardTitle className="text-base">{bro.name}</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p><strong>Education:</strong> {(bro.education || []).join(', ')}</p><p><strong>Occupation:</strong> {bro.occupation}</p></CardContent></Card>)}</div>
                                                ) : <p className="text-sm text-muted-foreground mt-2">No brother information added.</p>}
                                            </div>
                                            <div className="border-t pt-4"><h4 className="font-medium">Sisters</h4>
                                                {familyData.sisters && familyData.sisters.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">{familyData.sisters.map((sis, i) => <Card key={i}><CardHeader><CardTitle className="text-base">{sis.name}</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p><strong>Education:</strong> {(sis.education || []).join(', ')}</p><p><strong>Occupation:</strong> {sis.occupation}</p></CardContent></Card>)}</div>
                                                ) : <p className="text-sm text-muted-foreground mt-2">No sister information added.</p>}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter className="pt-4 mt-auto border-t"><DialogClose asChild><Button>Close</Button></DialogClose></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}