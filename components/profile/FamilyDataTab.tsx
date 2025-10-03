// components/profile/FamilyDataTab.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileInfoLine } from '@/components/profile/ProfileInfoLine';
import { User, Briefcase, Home, Shield, Users as FamilyIcon } from 'lucide-react';
import { FamilyData } from '@/components/ProfileSection'; // Adjust path if needed

export function FamilyDataTab({ data }: { data: Partial<FamilyData> }) {
    if (!data || Object.keys(data).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/50 rounded-lg border-2 border-dashed h-64">
                <FamilyIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-semibold">No Family Data</p>
                <p className="text-sm text-muted-foreground">Family information has not been added yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Parent & Household Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProfileInfoLine icon={User} label="Father's Name" value={data.father_name} />
                    <ProfileInfoLine icon={Briefcase} label="Father's Occupation" value={data.father_occupation} />
                    <ProfileInfoLine icon={Home} label="Father's Staying Place" value={data.father_staying_place} />
                    <ProfileInfoLine icon={Shield} label="Father's Public Responsibilities" value={data.father_responsibilities} isList />
                    <ProfileInfoLine icon={User} label="Mother's Name" value={data.mother_name} />
                    <ProfileInfoLine icon={Briefcase} label="Mother's Occupation" value={data.mother_occupation} />
                    <ProfileInfoLine icon={FamilyIcon} label="Total Family Members" value={data.total_family_members} />
                    <ProfileInfoLine icon={Home} label="House Type" value={data.house_type} />
                    <ProfileInfoLine icon={FamilyIcon} label="Chronically Ill Members" value={data.chronically_ill_members ? 'Yes' : 'No'} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Sibling Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="font-medium text-lg mb-2">Brothers</h4>
                        {data.brothers && data.brothers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {data.brothers.map((bro, i) => (
                                    <Card key={i} className="bg-muted/50">
                                        <CardHeader><CardTitle className="text-base">{bro.name}</CardTitle></CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                            <p><strong>Education:</strong> {(bro.education || []).join(', ') || 'N/A'}</p>
                                            <p><strong>Occupation:</strong> {bro.occupation || 'N/A'}</p>
                                            <p><strong>Responsibilities:</strong> {(bro.responsibilities || []).join(', ') || 'N/A'}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : <p className="text-sm text-muted-foreground">No brother information has been added.</p>}
                    </div>
                    <div className="border-t pt-6">
                        <h4 className="font-medium text-lg mb-2">Sisters</h4>
                        {data.sisters && data.sisters.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {data.sisters.map((sis, i) => (
                                    <Card key={i} className="bg-muted/50">
                                        <CardHeader><CardTitle className="text-base">{sis.name}</CardTitle></CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                            <p><strong>Education:</strong> {(sis.education || []).join(', ')} || 'N/A'</p>
                                            <p><strong>Occupation:</strong> {sis.occupation || 'N/A'}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : <p className="text-sm text-muted-foreground">No sister information has been added.</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}