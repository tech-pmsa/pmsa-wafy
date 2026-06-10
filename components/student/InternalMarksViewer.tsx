'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  BookMarked, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  FileText, 
  Newspaper, 
  MessageSquare, 
  Lightbulb, 
  Mic, 
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface SubjectMark {
  id: number;
  subject_name: string;
  marks_obtained: string;
  status: boolean;
}

interface AcademicEntry {
  id: number;
  title: string;
  subject_marks: SubjectMark[];
  created_at: string;
}

interface InternalMarksViewerProps {
  studentUid: string;
  dashboard?: boolean;
}

export function isInternalMarksBatch(batch?: string | null) {
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

export default function InternalMarksViewer({ studentUid, dashboard }: InternalMarksViewerProps) {
  const [entries, setEntries] = useState<AcademicEntry[]>([]);
  const [reading, setReading] = useState<any[]>([]);
  const [writing, setWriting] = useState<any[]>([]);
  const [newspaper, setNewspaper] = useState<any[]>([]);
  const [general, setGeneral] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [morning, setMorning] = useState<any[]>([]);
  const [fTalk, setFTalk] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generalMode, setGeneralMode] = useState<'positive' | 'negative'>('positive');

  useEffect(() => {
    const fetchAllInternalData = async () => {
      if (!studentUid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const promises = [
          supabase.from('academic_entries').select('*, subject_marks(*)').eq('student_uid', studentUid).order('created_at', { ascending: false }),
          supabase.from('internal_reading_marks').select('*').eq('student_uid', studentUid).order('entry_date', { ascending: false }),
          supabase.from('internal_writing_marks').select('*').eq('student_uid', studentUid).order('entry_date', { ascending: false }),
          supabase.from('internal_newspaper_marks').select('*').eq('student_uid', studentUid).order('entry_date', { ascending: false }),
          supabase.from('internal_general_marks').select('*').eq('student_uid', studentUid).order('entry_date', { ascending: false }),
          supabase.from('internal_student_skills').select('*').eq('student_uid', studentUid).order('skill_name'),
          supabase.from('internal_morning_talk_attendance').select('*').eq('student_uid', studentUid).order('entry_date', { ascending: false }),
          supabase.from('internal_f_talk_marks').select('*').eq('student_uid', studentUid).order('entry_date', { ascending: false }),
        ];

        const results = await Promise.all(promises);

        const firstError = results.find((result) => result.error)?.error;
        if (firstError) throw firstError;

        // Filter academic entries for exam marks (INTERNAL or SEMESTER)
        const exams = (results[0].data || []).filter((entry: any) => {
          const title = (entry.title || '').toUpperCase();
          return title.includes('INTERNAL') || title.includes('SEMESTER') || title.includes('SEM');
        });

        setEntries(exams as AcademicEntry[]);
        setReading(results[1].data || []);
        setWriting(results[2].data || []);
        setNewspaper(results[3].data || []);
        setGeneral(results[4].data || []);
        setSkills(results[5].data || []);
        setMorning(results[6].data || []);
        setFTalk(results[7].data || []);

      } catch (err: any) {
        setError(err.message);
        toast.error('Failed to load internal progress', { description: err.message });
      } finally {
        setLoading(false);
      }
    };

    fetchAllInternalData();
  }, [studentUid]);

  const generalNotes = useMemo(() => {
    return general.flatMap((entry: any) =>
      GENERAL_FIELDS.flatMap((field) => {
        const note = entry[`${field.key}_note`];
        const status = entry[`${field.key}_status`];
        return note?.trim()
          ? [{ date: entry.entry_date, type: field.label, note, status }]
          : [];
      })
    );
  }, [general]);

  const visibleGeneral = useMemo(() => {
    return generalNotes.filter((note) => note.status === generalMode);
  }, [generalNotes, generalMode]);

  const positiveCount = useMemo(() => generalNotes.filter((note) => note.status === 'positive').length, [generalNotes]);
  const negativeCount = useMemo(() => generalNotes.filter((note) => note.status === 'negative').length, [generalNotes]);

  const morningTotal = useMemo(() => morning.reduce((sum, item) => sum + Number(item.mark || 0), 0), [morning]);
  const morningPresent = useMemo(() => morning.filter((item) => item.present).length, [morning]);
  
  const fTalkTotal = useMemo(() => fTalk.reduce((sum, item) => sum + Number(item.mark || 0), 0), [fTalk]);
  const fTalkPresented = useMemo(() => fTalk.filter((item) => item.talked).length, [fTalk]);

  if (loading) {
    return (
      <Card className="border border-border/50 shadow-md">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading Internal Progress Status...
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-xs font-semibold">Failed to fetch internal marks: {error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 shadow-md">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-lg font-bold font-heading">My Internal Progress</CardTitle>
          </div>
          {dashboard && <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20">Academic Tracker</Badge>}
        </div>
        <CardDescription className="text-xs">
          Your continuous evaluation, reading records, talk presentations, and academic status.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 p-4">
        <Tabs defaultValue="exams" className="w-full flex flex-col">
          <div className="w-full overflow-x-auto pb-2 border-b border-border/40">
            <TabsList className="h-auto p-1 bg-muted rounded-xl flex gap-1 w-max">
              <TabsTrigger value="exams" className="rounded-lg text-xs font-bold py-1.5 px-3">Exams</TabsTrigger>
              <TabsTrigger value="reading" className="rounded-lg text-xs font-bold py-1.5 px-3">Reading</TabsTrigger>
              <TabsTrigger value="writing" className="rounded-lg text-xs font-bold py-1.5 px-3">Writing</TabsTrigger>
              <TabsTrigger value="newspaper" className="rounded-lg text-xs font-bold py-1.5 px-3">Newspaper</TabsTrigger>
              <TabsTrigger value="behavior" className="rounded-lg text-xs font-bold py-1.5 px-3 font-heading">Behavior</TabsTrigger>
              <TabsTrigger value="skills" className="rounded-lg text-xs font-bold py-1.5 px-3">Skills</TabsTrigger>
              <TabsTrigger value="talks" className="rounded-lg text-xs font-bold py-1.5 px-3">Talks</TabsTrigger>
            </TabsList>
          </div>

          {/* Exams Tab */}
          <TabsContent value="exams" className="mt-4 focus-visible:ring-0">
            {entries.length > 0 ? (
              <Accordion type="single" collapsible className="w-full space-y-2">
                {entries.map((entry) => (
                  <AccordionItem key={entry.id} value={`item-${entry.id}`} className="border rounded-xl bg-card/45 shadow-sm overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 font-bold text-xs hover:no-underline">{entry.title}</AccordionTrigger>
                    <AccordionContent className="px-4 pb-3 pt-1 border-t border-border/40 bg-background/25">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-b">
                              <TableHead className="h-8 text-[10px] font-bold uppercase tracking-wider">Subject</TableHead>
                              <TableHead className="h-8 text-[10px] font-bold uppercase tracking-wider">Marks / Grade</TableHead>
                              <TableHead className="h-8 text-[10px] font-bold uppercase tracking-wider text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entry.subject_marks.map((sub) => (
                              <TableRow key={sub.id} className="hover:bg-muted/5 border-b last:border-0">
                                <TableCell className="py-2.5 font-bold uppercase text-xs text-foreground/80">{sub.subject_name}</TableCell>
                                <TableCell className="py-2.5 font-semibold uppercase text-xs text-foreground/70">{sub.marks_obtained}</TableCell>
                                <TableCell className="py-2.5 text-right">
                                  <Badge 
                                    variant={sub.status ? 'default' : 'destructive'} 
                                    className={`text-[9.5px] font-extrabold h-5 px-2.5 rounded-full ${sub.status ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : ''}`}
                                  >
                                    {sub.status ? 'Pass' : 'Fail'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-8 font-semibold">No exam entries recorded.</p>
            )}
          </TabsContent>

          {/* Reading Tab */}
          <TabsContent value="reading" className="mt-4 focus-visible:ring-0">
            {reading.length > 0 ? (
              <div className="border border-border/60 rounded-xl overflow-hidden bg-card/40">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/20">
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Date</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Book Name</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Author</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase text-center">Pages</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase text-right">Lang / Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reading.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/5">
                        <TableCell className="py-2.5 text-xs font-semibold text-muted-foreground">{formatDateDisplay(row.entry_date)}</TableCell>
                        <TableCell className="py-2.5 text-xs font-bold text-foreground/80">{row.book_name}</TableCell>
                        <TableCell className="py-2.5 text-xs font-semibold text-foreground/60">{row.author_name || '-'}</TableCell>
                        <TableCell className="py-2.5 text-xs font-bold text-center text-primary">{row.pages_read || '-'}</TableCell>
                        <TableCell className="py-2.5 text-xs text-right font-medium">
                          <span className="capitalize">{row.language}</span> / <span className="text-[10px] text-muted-foreground">{row.book_type}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-8 font-semibold">No reading logs found.</p>
            )}
          </TabsContent>

          {/* Writing Tab */}
          <TabsContent value="writing" className="mt-4 focus-visible:ring-0">
            {writing.length > 0 ? (
              <div className="border border-border/60 rounded-xl overflow-hidden bg-card/40">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/20">
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Date</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Type</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Language</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase text-center">Pages</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase text-right">Published In</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {writing.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/5">
                        <TableCell className="py-2.5 text-xs font-semibold text-muted-foreground">{formatDateDisplay(row.entry_date)}</TableCell>
                        <TableCell className="py-2.5 text-xs font-bold text-foreground/80 capitalize">{row.writing_type}</TableCell>
                        <TableCell className="py-2.5 text-xs font-semibold text-foreground/60 capitalize">{row.language}</TableCell>
                        <TableCell className="py-2.5 text-xs font-bold text-center text-primary">{row.pages_written || '-'}</TableCell>
                        <TableCell className="py-2.5 text-xs text-right font-medium text-foreground/75">{row.published_in || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-8 font-semibold">No writing logs found.</p>
            )}
          </TabsContent>

          {/* Newspaper Tab */}
          <TabsContent value="newspaper" className="mt-4 focus-visible:ring-0">
            {newspaper.length > 0 ? (
              <div className="border border-border/60 rounded-xl overflow-hidden bg-card/40">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/20">
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Date</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Language</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Newspapers</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase text-right">Sections Read</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newspaper.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/5">
                        <TableCell className="py-2.5 text-xs font-semibold text-muted-foreground">{formatDateDisplay(row.entry_date)}</TableCell>
                        <TableCell className="py-2.5 text-xs font-bold text-foreground/80 capitalize">{row.language}</TableCell>
                        <TableCell className="py-2.5 text-xs font-medium text-foreground/70">{row.newspaper_names ? row.newspaper_names.join(', ') : '-'}</TableCell>
                        <TableCell className="py-2.5 text-xs text-right font-medium text-foreground/60">{row.sections_read ? row.sections_read.join(', ') : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-8 font-semibold">No newspaper reading logs found.</p>
            )}
          </TabsContent>

          {/* Behavior Tab */}
          <TabsContent value="behavior" className="mt-4 focus-visible:ring-0 space-y-4">
            <div className="flex gap-2">
              <Button 
                variant={generalMode === 'positive' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setGeneralMode('positive')}
                className="h-8 text-xs font-bold rounded-lg gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Positive ({positiveCount})
              </Button>
              <Button 
                variant={generalMode === 'negative' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setGeneralMode('negative')}
                className="h-8 text-xs font-bold rounded-lg gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5 text-destructive" /> Negative ({negativeCount})
              </Button>
            </div>

            {visibleGeneral.length > 0 ? (
              <div className="border border-border/60 rounded-xl overflow-hidden bg-card/40">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/20">
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Date</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Metric</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase text-right">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleGeneral.map((note, index) => (
                      <TableRow key={`${note.date}-${note.type}-${index}`} className="hover:bg-muted/5">
                        <TableCell className="py-2.5 text-xs font-semibold text-muted-foreground">{formatDateDisplay(note.date)}</TableCell>
                        <TableCell className="py-2.5 text-xs font-bold text-foreground/80">{note.type}</TableCell>
                        <TableCell className="py-2.5 text-xs text-right font-medium text-foreground/70 max-w-[200px] break-words">{note.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-8 font-semibold">No {generalMode} logs found.</p>
            )}
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="mt-4 focus-visible:ring-0">
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-4 border border-border/50 rounded-xl bg-card/20">
                {skills.map((s) => (
                  <Badge 
                    key={s.id} 
                    variant="secondary" 
                    className="px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/15 hover:bg-primary/15 shadow-sm"
                  >
                    <Lightbulb className="h-3 w-3 mr-1.5 text-primary shrink-0" />
                    {s.skill_name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-8 font-semibold">No custom skills or talents added yet.</p>
            )}
          </TabsContent>

          {/* Talks Tab */}
          <TabsContent value="talks" className="mt-4 focus-visible:ring-0 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Morning Talk Card Summary */}
              <Card className="border border-border/60 bg-card/25 shadow-sm">
                <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-row justify-between items-center">
                  <span className="text-xs font-bold font-heading text-foreground flex items-center gap-1.5"><Mic className="h-3.5 w-3.5 text-primary" /> Morning Talk Summary</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/15">{morningPresent} Present</Badge>
                </CardHeader>
                <CardContent className="pt-4 px-4 space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground font-semibold">Accumulated Score</span>
                    <span className="text-2xl font-extrabold font-heading text-primary">{morningTotal} <span className="text-xs font-bold text-muted-foreground">pts</span></span>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto border border-border/40 rounded-lg">
                    <Table>
                      <TableHeader><TableRow><TableHead className="h-7 text-[9.5px] uppercase font-bold">Date</TableHead><TableHead className="h-7 text-[9.5px] uppercase font-bold text-right">Score</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {morning.map((row) => (
                          <TableRow key={row.id} className="hover:bg-muted/5">
                            <TableCell className="py-1.5 text-xs text-muted-foreground">{formatDateDisplay(row.entry_date)}</TableCell>
                            <TableCell className="py-1.5 text-right font-extrabold text-xs text-primary">{row.mark ?? 0}/10</TableCell>
                          </TableRow>
                        ))}
                        {morning.length === 0 && (
                          <TableRow><TableCell colSpan={2} className="text-center text-[11px] text-muted-foreground py-4">No morning talk logs</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* F-Talk Card Summary */}
              <Card className="border border-border/60 bg-card/25 shadow-sm">
                <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-row justify-between items-center">
                  <span className="text-xs font-bold font-heading text-foreground flex items-center gap-1.5"><Mic className="h-3.5 w-3.5 text-violet-500" /> F-Talk Summary</span>
                  <Badge className="bg-violet-500/10 text-violet-600 hover:bg-violet-500/10 border-violet-500/15">{fTalkPresented} Talked</Badge>
                </CardHeader>
                <CardContent className="pt-4 px-4 space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground font-semibold">Accumulated Score</span>
                    <span className="text-2xl font-extrabold font-heading text-violet-600">{fTalkTotal} <span className="text-xs font-bold text-muted-foreground">pts</span></span>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto border border-border/40 rounded-lg">
                    <Table>
                      <TableHeader><TableRow><TableHead className="h-7 text-[9.5px] uppercase font-bold">Date</TableHead><TableHead className="h-7 text-[9.5px] uppercase font-bold text-right">Score</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {fTalk.map((row) => (
                          <TableRow key={row.id} className="hover:bg-muted/5">
                            <TableCell className="py-1.5 text-xs text-muted-foreground">{formatDateDisplay(row.entry_date)}</TableCell>
                            <TableCell className="py-1.5 text-right font-extrabold text-xs text-violet-600">{row.mark ?? 0}/10</TableCell>
                          </TableRow>
                        ))}
                        {fTalk.length === 0 && (
                          <TableRow><TableCell colSpan={2} className="text-center text-[11px] text-muted-foreground py-4">No F-Talk logs</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
