'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Briefcase, Home, Shield, Users as FamilyIcon, Phone, Building, UserCheck, PhoneCall, BookMarked, Archive } from 'lucide-react';

interface ArchivedStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any | null;
}

function valueOrBlank(value: any) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value);
}

function listText(value: any) {
  if (!value) return '';
  if (Array.isArray(value)) return value.map(valueOrBlank).filter(Boolean).join(', ');
  if (typeof value === 'string') return value;
  return String(value);
}

function arrayFromJsonValue(value: any) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatSibling(sibling: any) {
  if (!sibling || typeof sibling !== 'object') return valueOrBlank(sibling);

  return [
    sibling.name ? `Name: ${sibling.name}` : '',
    sibling.education ? `Education: ${listText(sibling.education)}` : '',
    sibling.occupation ? `Occupation: ${sibling.occupation}` : '',
    sibling.responsibilities ? `Responsibilities: ${listText(sibling.responsibilities)}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

function formatArchiveDate(value?: string | null) {
  if (!value) return '';
  const [datePart] = value.split('T');
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return value;
}

function DetailLine({ label, value, icon: Icon }: { label: string; value: any; icon: React.ElementType }) {
  return (
    <div className="flex items-start gap-3.5 py-3 border-b border-border/40 last:border-b-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0 flex-grow">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-foreground/90 mt-0.5 leading-snug break-words">
          {valueOrBlank(value) || '-'}
        </p>
      </div>
    </div>
  );
}

export function ArchivedStudentModal({ isOpen, onClose, student }: ArchivedStudentModalProps) {
  if (!student) return null;

  const snapshot = student.student_data || {};
  const family = student.family_data || {};
  const brothers = arrayFromJsonValue(family.brothers);
  const sisters = arrayFromJsonValue(family.sisters);

  const personalDetails = [
    { label: 'Full Name', value: student.name, icon: User },
    { label: 'CIC Register Number', value: student.cic, icon: UserCheck },
    { label: 'Archive Class ID', value: student.archive_class_id, icon: Archive },
    { label: 'Original Live Class', value: student.original_class_id, icon: Building },
    { label: 'Batch ID', value: student.batch || snapshot.batch, icon: Shield },
    { label: 'Student Council', value: student.council || snapshot.council, icon: FamilyIcon },
    { label: 'Mobile Phone', value: student.phone || snapshot.phone, icon: Phone },
    { label: 'Guardian Name', value: student.guardian || snapshot.guardian, icon: User },
    { label: 'Guardian Phone', value: student.g_phone || snapshot.g_phone, icon: PhoneCall },
    { label: 'Date of Birth', value: formatArchiveDate(student.dob || snapshot.dob), icon: CalendarIconPlaceholder },
    { label: 'SSLC Board', value: student.sslc || snapshot.sslc, icon: BookMarked },
    { label: 'Plus Two Board', value: student.plustwo || snapshot.plustwo, icon: BookMarked },
    { label: 'Plus Two Stream', value: student.plustwo_streams || snapshot.plustwo_streams, icon: BookMarked },
    { label: 'Home Address', value: student.address || snapshot.address, icon: Home },
    { label: 'Date Archived', value: formatArchiveDate(student.archived_at), icon: Archive },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-6 rounded-2xl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-extrabold font-heading text-foreground tracking-tight">
            {student.name}
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground mt-0.5">
            Archived Student • CIC: {student.cic || '-'} • Batch {student.batch || snapshot.batch || 'N/A'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full flex-1 flex flex-col overflow-hidden pt-4">
          <TabsList className="grid w-full grid-cols-3 h-10 p-1 bg-muted rounded-xl">
            <TabsTrigger value="personal" className="rounded-lg text-xs font-bold py-1.5">Personal</TabsTrigger>
            <TabsTrigger value="family" className="rounded-lg text-xs font-bold py-1.5">Family Details</TabsTrigger>
            <TabsTrigger value="siblings" className="rounded-lg text-xs font-bold py-1.5">Siblings</TabsTrigger>
          </TabsList>

          {/* Personal Details */}
          <TabsContent value="personal" className="flex-1 overflow-y-auto mt-4 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 py-2">
              {personalDetails.map((item) => (
                <DetailLine key={item.label} label={item.label} value={item.value} icon={item.icon} />
              ))}
            </div>
          </TabsContent>

          {/* Family Snapshot */}
          <TabsContent value="family" className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
            <Card className="border border-border/50 bg-card/20 shadow-none rounded-xl">
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 pt-5">
                <DetailLine label="Total Family Members" value={family.total_family_members} icon={FamilyIcon} />
                <DetailLine label="House Type" value={family.house_type} icon={Home} />
                <DetailLine label="Father's Name" value={family.father_name} icon={User} />
                <DetailLine label="Father's Occupation" value={family.father_occupation} icon={Briefcase} />
                <DetailLine label="Father's Staying Place" value={family.father_staying_place} icon={Building} />
                <DetailLine label="Father's Responsibilities" value={listText(family.father_responsibilities)} icon={Briefcase} />
                <DetailLine label="Mother's Name" value={family.mother_name} icon={User} />
                <DetailLine label="Mother's Occupation" value={family.mother_occupation} icon={Briefcase} />
                <DetailLine
                  label="Chronically Ill Members"
                  value={
                    typeof family.chronically_ill_members === 'boolean'
                      ? family.chronically_ill_members
                        ? 'Yes'
                        : 'No'
                      : family.chronically_ill_members
                  }
                  icon={AlertCirclePlaceholder}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Siblings Snapshots */}
          <TabsContent value="siblings" className="flex-1 overflow-y-auto mt-4 pr-1 space-y-5">
            {/* Brothers */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
                Brothers ({brothers.length})
              </h4>
              {brothers.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {brothers.map((brother: any, index: number) => (
                    <Card key={index} className="border border-border bg-card shadow-sm rounded-xl">
                      <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/20">
                        <CardTitle className="text-xs font-extrabold font-heading text-foreground">
                          Brother {index + 1}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-1.5 text-xs text-foreground/80 font-semibold">
                        <p><span className="text-muted-foreground">Name:</span> {brother.name || '-'}</p>
                        <p><span className="text-muted-foreground">Education:</span> {listText(brother.education) || '-'}</p>
                        <p><span className="text-muted-foreground">Occupation:</span> {brother.occupation || '-'}</p>
                        <p><span className="text-muted-foreground">Responsibilities:</span> {listText(brother.responsibilities) || '-'}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground font-semibold">
                  No brother information recorded.
                </div>
              )}
            </div>

            {/* Sisters */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
                Sisters ({sisters.length})
              </h4>
              {sisters.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sisters.map((sister: any, index: number) => (
                    <Card key={index} className="border border-border bg-card shadow-sm rounded-xl">
                      <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/20">
                        <CardTitle className="text-xs font-extrabold font-heading text-foreground">
                          Sister {index + 1}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-1.5 text-xs text-foreground/80 font-semibold">
                        <p><span className="text-muted-foreground">Name:</span> {sister.name || '-'}</p>
                        <p><span className="text-muted-foreground">Education:</span> {listText(sister.education) || '-'}</p>
                        <p><span className="text-muted-foreground">Occupation:</span> {sister.occupation || '-'}</p>
                        <p><span className="text-muted-foreground">Responsibilities:</span> {listText(sister.responsibilities) || '-'}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground font-semibold">
                  No sister information recorded.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4 mt-4">
          <DialogClose asChild>
            <Button className="rounded-xl font-bold text-xs shadow-md">Close Profile</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Icon placeholders to prevent module errors
function CalendarIconPlaceholder(props: any) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={props.className}
      {...props}
    >
      <rect width={18} height={18} x={3} y={4} rx={2} ry={2} />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function AlertCirclePlaceholder(props: any) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={props.className}
      {...props}
    >
      <circle cx={12} cy={12} r={10} />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}
