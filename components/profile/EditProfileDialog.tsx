// components/profile/EditProfileDialog.tsx
'use client'

import { useEffect, useState, useRef, ChangeEvent, FormEvent } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { toast } from 'sonner';

// Import types from the main page
import { StudentProfile, FamilyData, Sibling, AcademicEntry } from '@/app/admins/manage-students/page';
import { AdminMarkEditorModal } from '@/components/admin/manage-students/AdminMarkEditorModal';
import { EmailChangeModal } from '@/components/profile/EmailChangeModal';
import { AcademicsTab } from '@/components/profile/AcademicsTab';

// UI Components
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, User, Mail, Loader2, Lock, UserCheck, Building, Shield, PlusCircle, Trash2, Camera } from 'lucide-react';

// Reusable Helper Components
function ReadOnlyField({ label, value }: { label: string, value: string | null }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={label} className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-3 w-3" /> {label}
            </Label>
            <Input id={label} value={value || ''} readOnly disabled className="cursor-not-allowed" />
        </div>
    );
}

function SiblingFormCard({ type, siblings, onChange }: { type: 'brothers' | 'sisters', siblings: Sibling[], onChange: (type: 'brothers' | 'sisters', updatedSiblings: Sibling[]) => void }) {
    const handleSiblingChange = (index: number, field: keyof Sibling, value: string) => {
        const newSiblings = JSON.parse(JSON.stringify(siblings));
        if (field === 'education' || field === 'responsibilities') {
            (newSiblings[index] as any)[field] = value.split(',').map(s => s.trim());
        } else {
            (newSiblings[index] as any)[field] = value;
        }
        onChange(type, newSiblings);
    };
    const addSibling = () => { if (siblings.length < 5) { onChange(type, [...siblings, { name: '', education: [], occupation: '', responsibilities: [] }]); } };
    const removeSibling = (index: number) => { onChange(type, siblings.filter((_, i) => i !== index)); };
    const singularType = type.slice(0, -1);

    return (
        <Card>
            <CardHeader><CardTitle className="capitalize">{type}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                {siblings.length > 0 ? siblings.map((sibling, i) => (
                    <div key={i} className="relative grid grid-cols-1 gap-4 p-4 border rounded-lg bg-muted/50">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSibling(i)} className="absolute top-2 right-2 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                        <div className="space-y-2"><Label>Name</Label><Input placeholder="Name" value={sibling.name} onChange={e => handleSiblingChange(i, 'name', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Occupation</Label><Input placeholder="Occupation" value={sibling.occupation} onChange={e => handleSiblingChange(i, 'occupation', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Education (comma-separated)</Label><Textarea placeholder="e.g., SSLC, Plus Two" value={(sibling.education || []).join(', ')} onChange={e => handleSiblingChange(i, 'education', e.target.value)} /></div>
                        {type === 'brothers' && <div className="space-y-2"><Label>Responsibilities (comma-separated)</Label><Textarea placeholder="e.g., Public Activist" value={(sibling.responsibilities || []).join(', ')} onChange={e => handleSiblingChange(i, 'responsibilities', e.target.value)} /></div>}
                    </div>
                )) : <p className="text-sm text-muted-foreground">No {type} added yet.</p>}
                <Button type="button" variant="outline" onClick={addSibling} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Add {singularType.charAt(0).toUpperCase() + singularType.slice(1)}</Button>
            </CardContent>
        </Card>
    );
}

// Main Modal Component
export function EditProfileDialog({ isOpen, setIsOpen, personalForm, setPersonalForm, familyData, onSave, isSaving, preview, onFileChange, academicEntries, onEntryDelete, onEntryEdit, onEntryAdd }: any) {
    const { role } = useUserData();
    const isStudent = role === 'student';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [familyForm, setFamilyForm] = useState<Partial<FamilyData>>({});

    useEffect(() => { if (isOpen) { setFamilyForm(familyData || {}); } }, [familyData, isOpen]);

    const handleFamilyChange = (field: keyof FamilyData, value: any) => { setFamilyForm(prev => ({ ...prev, [field]: value })) };
    const handleSiblingsUpdate = (type: 'brothers' | 'sisters', updatedSiblings: Sibling[]) => { handleFamilyChange(type, updatedSiblings); };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Pencil className="w-4 h-4 mr-2" /> Edit Profile</Button>
            </DialogTrigger>
            <DialogContent className="lg:max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Your Profile</DialogTitle>
                    <DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="personal" className="w-full flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="personal">Personal Info</TabsTrigger>
                        {isStudent && <TabsTrigger value="family">Family Info</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="personal" className="overflow-y-auto mt-4 pr-4">
                        <div className="flex flex-col md:flex-row gap-8 py-4">
                            <div className="md:w-1/3 flex flex-col items-center gap-4 pt-4 md:border-r md:pr-8">
                                <div className="relative group h-32 w-32">
                                    <Avatar className="h-full w-full ring-4 ring-primary/20"><AvatarImage src={preview || undefined} alt="Profile Preview" className='object-cover' /><AvatarFallback><User className="h-16 w-16" /></AvatarFallback></Avatar>
                                    <Label htmlFor="image-upload" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Camera className="w-8 h-8" /></Label>
                                    <Input id="image-upload" type="file" accept="image/*" onChange={onFileChange} className="hidden" ref={fileInputRef} />
                                </div>
                                <p className="text-xs text-muted-foreground text-center">Click photo to change</p>
                                {/* EMAIL CHANGE MODAL IS NOW ADDED HERE */}
                                <EmailChangeModal />
                            </div>
                            <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {isStudent ? (
                                    <>
                                        <div className="space-y-2 sm:col-span-2"><Label htmlFor="name">Full Name</Label><Input id="name" name="name" value={personalForm.name || ''} onChange={e => setPersonalForm({ ...personalForm, name: e.target.value })} /></div>
                                        <ReadOnlyField label="CIC" value={personalForm.cic} />
                                        <div className="space-y-2"><Label htmlFor="class_id">Class ID</Label><Input id="class_id" name="class_id" value={personalForm.class_id || ''} onChange={e => setPersonalForm({ ...personalForm, class_id: e.target.value })} /></div>
                                        <div className="space-y-2"><Label htmlFor="batch">Batch</Label><Input id="batch" name="batch" value={personalForm.batch || ''} onChange={e => setPersonalForm({ ...personalForm, batch: e.target.value })} /></div>
                                        <div className="space-y-2"><Label htmlFor="council">Council</Label><Input id="council" name="council" value={personalForm.council || ''} onChange={e => setPersonalForm({ ...personalForm, council: e.target.value })} /></div>
                                        <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" value={personalForm.phone || ''} onChange={e => setPersonalForm({ ...personalForm, phone: e.target.value })} /></div>
                                        <div className="space-y-2"><Label htmlFor="guardian">Guardian</Label><Input id="guardian" name="guardian" value={personalForm.guardian || ''} onChange={e => setPersonalForm({ ...personalForm, guardian: e.target.value })} /></div>
                                        <div className="space-y-2"><Label htmlFor="g_phone">Guardian Phone</Label><Input id="g_phone" name="g_phone" value={personalForm.g_phone || ''} onChange={e => setPersonalForm({ ...personalForm, g_phone: e.target.value })} /></div>
                                        <div className="sm:col-span-2 space-y-2"><Label htmlFor="address">Address</Label><Textarea id="address" name="address" value={personalForm.address || ''} onChange={e => setPersonalForm({ ...personalForm, address: e.target.value })} /></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={personalForm.name || ''} onChange={e => setPersonalForm({ ...personalForm, name: e.target.value })} /></div>
                                        <ReadOnlyField label="Email" value={personalForm.email} />
                                        <div className="space-y-2"><Label htmlFor="designation">Designation</Label><Input id="designation" value={personalForm.designation || ''} onChange={e => setPersonalForm({ ...personalForm, designation: e.target.value })} /></div>
                                        <div className="space-y-2"><Label htmlFor="batch">Related to (Batch)</Label><Input id="batch" value={personalForm.batch || ''} onChange={e => setPersonalForm({ ...personalForm, batch: e.target.value })} /></div>
                                    </>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {isStudent && (
                        <TabsContent value="family" className="overflow-y-auto mt-4 pr-4 space-y-6">
                            <Card><CardHeader><CardTitle>Household</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Total Family Members</Label><Input type="number" value={familyForm.total_family_members || ''} onChange={e => handleFamilyChange('total_family_members', parseInt(e.target.value) || null)} /></div>
                                <div className="space-y-2"><Label>House Type</Label><Select value={familyForm.house_type || ''} onValueChange={value => handleFamilyChange('house_type', value)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="Own House">Own House</SelectItem><SelectItem value="Rented House">Rented House</SelectItem><SelectItem value="Living with Family">Living with Family</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                                <div className="flex items-center space-x-2 sm:col-span-2 pt-2"><Switch id="chronically-ill" checked={familyForm.chronically_ill_members} onCheckedChange={checked => handleFamilyChange('chronically_ill_members', checked)} /><Label htmlFor="chronically-ill">Chronically ill members in the house?</Label></div>
                            </CardContent></Card>
                            <Card><CardHeader><CardTitle>Parent Details</CardTitle></CardHeader><CardContent className="space-y-4">
                                <div className="grid sm:grid-cols-2 gap-4"><div className="space-y-2"><Label>Father's Name</Label><Input value={familyForm.father_name || ''} onChange={e => handleFamilyChange('father_name', e.target.value)} /></div><div className="space-y-2"><Label>Father's Occupation</Label><Input value={familyForm.father_occupation || ''} onChange={e => handleFamilyChange('father_occupation', e.target.value)} /></div></div>
                                <div className="space-y-2"><Label>Father's Staying Place</Label><Input value={familyForm.father_staying_place || ''} onChange={e => handleFamilyChange('father_staying_place', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Father's Responsibilities (comma-separated)</Label><Textarea value={(familyForm.father_responsibilities || []).join(', ')} onChange={e => handleFamilyChange('father_responsibilities', e.target.value.split(',').map(s => s.trim()))} /></div>
                                <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t"><div className="space-y-2"><Label>Mother's Name</Label><Input value={familyForm.mother_name || ''} onChange={e => handleFamilyChange('mother_name', e.target.value)} /></div><div className="space-y-2"><Label>Mother's Occupation</Label><Input value={familyForm.mother_occupation || ''} onChange={e => handleFamilyChange('mother_occupation', e.target.value)} /></div></div>
                            </CardContent></Card>
                            <SiblingFormCard type="brothers" siblings={familyForm.brothers || []} onChange={handleSiblingsUpdate} />
                            <SiblingFormCard type="sisters" siblings={familyForm.sisters || []} onChange={handleSiblingsUpdate} />
                        </TabsContent>
                    )}
                </Tabs>
                <DialogFooter className="pt-4 mt-auto border-t"><Button onClick={() => setIsOpen(false)} variant="ghost">Cancel</Button><Button onClick={() => onSave(familyForm)} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}