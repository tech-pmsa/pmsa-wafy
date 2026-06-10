// components/admin/manage-students/ViewStudentModal.tsx
'use client'

import React, { useState, useEffect } from 'react';
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

function isEligibleBatch(batch?: string | null) {
    const match = batch?.match(/Batch\s+(\d+)/i);
    return match ? Number(match[1]) >= 17 : false;
}

function formatDateDisplay(dateStr: string) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }
    return dateStr;
}

const GENERAL_FIELDS: { key: 'law_practice' | 'cleaness' | 'spirituality'; label: string }[] = [
    { key: 'law_practice', label: 'Law Practice' },
    { key: 'cleaness', label: 'Cleanliness' },
    { key: 'spirituality', label: 'Spirituality' },
];

export function ViewStudentModal({ isOpen, setIsOpen, student }: { isOpen: boolean; setIsOpen: (open: boolean) => void; student: StudentProfile | null; }) {
    const [marks, setMarks] = useState<AcademicEntry[]>([]);
    const [familyData, setFamilyData] = useState<Partial<FamilyData>>({});
    const [internalData, setInternalData] = useState<any>(null);
    const [isLoadingData, setIsLoadingData] = useState(false);

    useEffect(() => {
        const fetchExtraData = async () => {
            if (!student) return;
            setIsLoadingData(true);
            
            const promises: any[] = [
                supabase.from('academic_entries').select('*, subject_marks(*)').eq('student_uid', student.uid),
                supabase.from('family_data').select('*').eq('student_uid', student.uid).single()
            ];

            const isEligible = isEligibleBatch(student.batch);
            if (isEligible) {
                promises.push(
                    supabase.from('internal_reading_marks').select('*').eq('student_uid', student.uid).order('entry_date', { ascending: false }),
                    supabase.from('internal_writing_marks').select('*').eq('student_uid', student.uid).order('entry_date', { ascending: false }),
                    supabase.from('internal_newspaper_marks').select('*').eq('student_uid', student.uid).order('entry_date', { ascending: false }),
                    supabase.from('internal_general_marks').select('*').eq('student_uid', student.uid).order('entry_date', { ascending: false }),
                    supabase.from('internal_student_skills').select('*').eq('student_uid', student.uid).order('skill_name'),
                    supabase.from('internal_morning_talk_attendance').select('*').eq('student_uid', student.uid).order('entry_date', { ascending: false }),
                    supabase.from('internal_f_talk_marks').select('*').eq('student_uid', student.uid).order('entry_date', { ascending: false })
                );
            }

            const results = await Promise.all(promises);
            const marksData = results[0]?.data;
            const familyDataRes = results[1]?.data;
            
            setMarks(marksData || []);
            setFamilyData(familyDataRes || {});

            if (isEligible) {
                setInternalData({
                    reading: results[2]?.data || [],
                    writing: results[3]?.data || [],
                    newspaper: results[4]?.data || [],
                    general: results[5]?.data || [],
                    skills: results[6]?.data || [],
                    morning: results[7]?.data || [],
                    fTalk: results[8]?.data || [],
                });
            } else {
                setInternalData(null);
            }
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

    const isEligible = isEligibleBatch(student.batch);

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
                    <TabsList className={`grid w-full ${isEligible ? 'grid-cols-4' : 'grid-cols-3'}`}>
                        <TabsTrigger value="personal">Personal</TabsTrigger>
                        <TabsTrigger value="academics">Academics</TabsTrigger>
                        <TabsTrigger value="family">Family</TabsTrigger>
                        {isEligible && <TabsTrigger value="internal">Internal Marks</TabsTrigger>}
                    </TabsList>

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
                                            <ProfileInfoLine icon={Briefcase} label="Father's Place" value={familyData.father_staying_place} />
                                            <ProfileInfoLine icon={Briefcase} label="Father's Responsibilities" value={familyData.father_responsibilities} />
                                            <ProfileInfoLine icon={User} label="Mother's Name" value={familyData.mother_name} />
                                            <ProfileInfoLine icon={Briefcase} label="Mother's Occupation" value={familyData.mother_occupation} />
                                            <ProfileInfoLine icon={FamilyIcon} label="Total Family Members" value={familyData.total_family_members} />
                                            <ProfileInfoLine icon={Home} label="House Type" value={familyData.house_type} />
                                            <ProfileInfoLine icon={Home} label="Chronically ill Members" value={familyData.chronically_ill_members} />
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle>Sibling Information</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <div><h4 className="font-medium">Brothers</h4>
                                                {familyData.brothers && familyData.brothers.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">{familyData.brothers.map((bro, i) => <Card key={i}><CardHeader><CardTitle className="text-base">{bro.name}</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p><strong>Education:</strong> {(bro.education || []).join(', ')}</p><p><strong>Occupation:</strong> {bro.occupation}</p><p><strong>Responsibilities:</strong> {bro.responsibilities}</p></CardContent></Card>)}</div>
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

                    {isEligible && (
                        <TabsContent value="internal" className="mt-4 flex-1 overflow-y-auto pr-2">
                            <div className="py-4 space-y-6">
                                {isLoadingData ? (
                                    <Skeleton className="h-40 w-full" />
                                ) : internalData ? (
                                    <div className="space-y-6">
                                        {/* Metrics Summary Row */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            <Card className="bg-muted/10 border border-border/50">
                                                <CardHeader className="py-2.5 px-4"><CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reading Logs</CardTitle></CardHeader>
                                                <CardContent className="px-4 pb-3"><p className="text-xl font-extrabold font-heading">{internalData.reading?.length || 0}</p></CardContent>
                                            </Card>
                                            <Card className="bg-muted/10 border border-border/50">
                                                <CardHeader className="py-2.5 px-4"><CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Writing Logs</CardTitle></CardHeader>
                                                <CardContent className="px-4 pb-3"><p className="text-xl font-extrabold font-heading">{internalData.writing?.length || 0}</p></CardContent>
                                            </Card>
                                            <Card className="bg-muted/10 border border-border/50 col-span-2 sm:col-span-1">
                                                <CardHeader className="py-2.5 px-4"><CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Newspaper Days</CardTitle></CardHeader>
                                                <CardContent className="px-4 pb-3"><p className="text-xl font-extrabold font-heading">{internalData.newspaper?.length || 0}</p></CardContent>
                                            </Card>
                                        </div>

                                        {/* Talents */}
                                        <Card className="border border-border/50">
                                            <CardHeader className="py-3 px-4 bg-muted/20 border-b"><CardTitle className="text-sm font-bold font-heading">Talents & Skills</CardTitle></CardHeader>
                                            <CardContent className="p-4 flex flex-wrap gap-2">
                                                {internalData.skills && internalData.skills.length > 0 ? (
                                                    internalData.skills.map((s: any) => (
                                                        <Badge key={s.id} variant="secondary" className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/15">{s.skill_name}</Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic font-medium">No custom talents added yet.</span>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Morning talk and F-talk summaries */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Card className="border border-border/50">
                                                <CardHeader className="py-3 px-4 bg-muted/20 border-b"><CardTitle className="text-sm font-bold font-heading">Morning Talk Participation</CardTitle></CardHeader>
                                                <CardContent className="p-0 max-h-52 overflow-y-auto">
                                                    <Table>
                                                        <TableHeader><TableRow><TableHead className="text-[10px] uppercase font-bold">Date</TableHead><TableHead className="text-[10px] uppercase font-bold text-center">Present</TableHead><TableHead className="text-right text-[10px] uppercase font-bold">Score</TableHead></TableRow></TableHeader>
                                                        <TableBody>
                                                            {internalData.morning && internalData.morning.map((row: any) => (
                                                                <TableRow key={row.id} className="hover:bg-muted/5"><TableCell className="py-2.5 font-semibold text-xs text-foreground/80">{formatDateDisplay(row.entry_date)}</TableCell><TableCell className="py-2.5 text-center font-bold text-xs">{row.present ? 'Yes' : 'No'}</TableCell><TableCell className="py-2.5 text-right font-extrabold text-xs text-primary">{row.mark ?? 0}/10</TableCell></TableRow>
                                                            ))}
                                                            {(!internalData.morning || internalData.morning.length === 0) && (
                                                                <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6 font-semibold">No participation records</TableCell></TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </CardContent>
                                            </Card>

                                            <Card className="border border-border/50">
                                                <CardHeader className="py-3 px-4 bg-muted/20 border-b"><CardTitle className="text-sm font-bold font-heading">F-Talk Presentation Logs</CardTitle></CardHeader>
                                                <CardContent className="p-0 max-h-52 overflow-y-auto">
                                                    <Table>
                                                        <TableHeader><TableRow><TableHead className="text-[10px] uppercase font-bold">Date</TableHead><TableHead className="text-[10px] uppercase font-bold text-center">Talked</TableHead><TableHead className="text-right text-[10px] uppercase font-bold">Score</TableHead></TableRow></TableHeader>
                                                        <TableBody>
                                                            {internalData.fTalk && internalData.fTalk.map((row: any) => (
                                                                <TableRow key={row.id} className="hover:bg-muted/5"><TableCell className="py-2.5 font-semibold text-xs text-foreground/80">{formatDateDisplay(row.entry_date)}</TableCell><TableCell className="py-2.5 text-center font-bold text-xs">{row.talked ? 'Yes' : 'No'}</TableCell><TableCell className="py-2.5 text-right font-extrabold text-xs text-primary">{row.mark ?? 0}/10</TableCell></TableRow>
                                                            ))}
                                                            {(!internalData.fTalk || internalData.fTalk.length === 0) && (
                                                                <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6 font-semibold">No presentation records</TableCell></TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Behavior Evaluations */}
                                        <Card className="border border-border/50">
                                            <CardHeader className="py-3 px-4 bg-muted/20 border-b"><CardTitle className="text-sm font-bold font-heading">Behavior logs</CardTitle></CardHeader>
                                            <CardContent className="p-0 max-h-60 overflow-y-auto">
                                                <Table>
                                                    <TableHeader><TableRow><TableHead className="text-[10px] uppercase font-bold">Date</TableHead><TableHead className="text-[10px] uppercase font-bold">Metric</TableHead><TableHead className="text-[10px] uppercase font-bold">Status</TableHead><TableHead className="text-[10px] uppercase font-bold">Note / Comment</TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                        {internalData.general && internalData.general.map((row: any) => (
                                                            <React.Fragment key={row.id}>
                                                                {GENERAL_FIELDS.map((f) => {
                                                                    const status = row[`${f.key}_status`];
                                                                    const note = row[`${f.key}_note`];
                                                                    if (!status && !note) return null;
                                                                    return (
                                                                        <TableRow key={`${row.id}-${f.key}`} className="hover:bg-muted/5">
                                                                            <TableCell className="py-2.5 font-semibold text-xs text-foreground/80">{formatDateDisplay(row.entry_date)}</TableCell>
                                                                            <TableCell className="py-2.5 font-bold text-xs">{f.label}</TableCell>
                                                                            <TableCell className="py-2.5 text-xs">
                                                                                <Badge variant={status === 'positive' ? 'default' : 'destructive'} className={`text-[9.5px] font-extrabold rounded-full ${status === 'positive' ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white' : ''}`}>
                                                                                    {String(status).toUpperCase()}
                                                                                </Badge>
                                                                            </TableCell>
                                                                            <TableCell className="py-2.5 text-xs truncate max-w-[150px]" title={note || ''}>{note || '-'}</TableCell>
                                                                        </TableRow>
                                                                    );
                                                                })}
                                                            </React.Fragment>
                                                        ))}
                                                        {(!internalData.general || internalData.general.length === 0) && (
                                                            <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6 font-semibold">No behavioral logs recorded</TableCell></TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>

                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-12">No internal marks found.</p>
                                )}
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
                <DialogFooter className="pt-4 mt-auto border-t"><DialogClose asChild><Button>Close</Button></DialogClose></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}