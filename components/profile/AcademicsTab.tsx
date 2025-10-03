// components/profile/AcademicsTab.tsx
'use client'

import { AcademicEntry } from '@/components/ProfileSection'; // Adjust this path if your types are elsewhere

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, PlusCircle, BookMarked } from 'lucide-react';

interface AcademicsTabProps {
    entries: AcademicEntry[];
    onAdd: () => void;
    onEdit: (entry: AcademicEntry) => void;
    onDelete: (id: number) => void;
}

export function AcademicsTab({ entries, onAdd, onEdit, onDelete }: AcademicsTabProps) {
    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <div>
                    <h3 className="text-lg font-semibold">Academic Records</h3>
                    <p className="text-sm text-muted-foreground">A record of your academic performance.</p>
                </div>
                <Button onClick={onAdd} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Record
                </Button>
            </div>
            <div className="border rounded-lg">
                {entries.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {entries.map(entry => (
                            <AccordionItem key={entry.id} value={`item-${entry.id}`}>
                                <AccordionTrigger className="px-4 text-base font-semibold hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <span>{entry.title}</span>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" type="button" onClick={(e) => { e.stopPropagation(); onEdit(entry); }}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" type="button" onClick={(e) => { e.stopPropagation(); onDelete(entry.id!); }}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pb-2">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Subject</TableHead>
                                                <TableHead>Mark / Grade</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entry.subject_marks && entry.subject_marks.length > 0 ? (
                                                entry.subject_marks.map(subject => (
                                                    <TableRow key={subject.id}>
                                                        <TableCell className="font-medium uppercase">{subject.subject_name}</TableCell>
                                                        <TableCell className="uppercase">{subject.marks_obtained}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge variant={subject.status ? "default" : "destructive"} className={subject.status ? "bg-green-600/80" : ""}>
                                                                {subject.status ? 'Passed' : 'Failed'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center">
                                                        No subjects added for this entry.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/50 rounded-b-lg">
                        <BookMarked className="h-10 w-10 text-muted-foreground" />
                        <p className="mt-4 font-semibold">No Academic Records Found</p>
                        <p className="text-sm text-muted-foreground">Click "Add Record" to add your first entry.</p>
                    </div>
                )}
            </div>
        </div>
    );
}