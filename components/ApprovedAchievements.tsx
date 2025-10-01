// components/ApprovedAchievements.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'
import Link from 'next/link'

// Shadcn/UI & Icon Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trophy, User as UserIcon, Calendar, Link as LinkIcon, Inbox, ArrowRight } from 'lucide-react'

// A clickable list item for displaying an achievement summary
function AchievementListItem({ achievement, onClick }: { achievement: any, onClick: () => void }) {
    return (
        <button onClick={onClick} className="w-full text-left flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-muted">
            <Avatar className="h-10 w-10 border">
                <AvatarImage src={achievement.students?.img_url} />
                <AvatarFallback>
                    <Trophy className="h-5 w-5 text-muted-foreground" />
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" title={achievement.title}>{achievement.title}</p>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    <span>{achievement.name} ({achievement.cic})</span>
                </div>
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">
                {new Date(achievement.submitted_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
            </div>
        </button>
    );
}

// Redesigned Modal to show full details with image preview
function AchievementDetailsModal({ achievement, isOpen, onClose }: { achievement: any | null, isOpen: boolean, onClose: () => void }) {
    if (!achievement) return null;

    const isImageProof = achievement.proof_url && /\.(jpg|jpeg|png|gif)$/i.test(achievement.proof_url);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader className="text-left">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 rounded-lg bg-primary/10 p-3 mt-1">
                            <Trophy className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-2xl font-heading">{achievement.title}</DialogTitle>
                            <DialogDescription>
                                Submitted on {new Date(achievement.submitted_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <p className="text-muted-foreground">{achievement.description}</p>
                    {isImageProof && (
                        <div className="rounded-lg border overflow-hidden">
                             <img src={achievement.proof_url} alt="Proof" className="w-full h-auto object-contain max-h-64" />
                        </div>
                    )}
                    {achievement.proof_url && (
                        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                            <a href={achievement.proof_url} target="_blank" rel="noreferrer">
                                <LinkIcon className="h-4 w-4 mr-2" /> View Full Proof
                            </a>
                        </Button>
                    )}
                </div>
                <div className="border-t pt-4 flex items-center gap-3">
                    <Avatar className="h-9 w-9 border">
                        <AvatarImage src={achievement.students?.img_url} />
                        <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-semibold">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground">{achievement.cic}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function ApprovedAchievements() {
    const { role, details, loading: userLoading } = useUserData();
    const [achievements, setAchievements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAchievement, setSelectedAchievement] = useState<any | null>(null);

    // Your data fetching logic is preserved
    useEffect(() => {
        if (userLoading) return;
        const fetchAchievements = async () => {
            setIsLoading(true);
            let query = supabase.from('achievements').select('*, students(img_url)').eq('approved', true);
            if (role === 'student' && details?.cic) { query = query.eq('cic', details.cic); }
            else if (role === 'class' && details?.batch) { query = query.eq('batch', details.batch); }
            const { data, error } = await query.order('submitted_at', { ascending: false }).limit(5); // Show up to 5 recent achievements
            if (error) { console.error("Error fetching achievements:", error); }
            else if (data) { setAchievements(data); }
            setIsLoading(false);
        };
        fetchAchievements();
    }, [role, details, userLoading]);

    const title = useMemo(() => {
        if (role === 'student') return 'My Recent Achievements';
        if (role === 'class') return `Recent Achievements from Your Class`;
        return 'Latest College Achievements';
    }, [role]);

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>A showcase of the most recent accomplishments.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-2/3" /></div></div>
                            ))}
                        </div>
                    ) : achievements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed h-48 bg-muted/50">
                            <Trophy className="h-8 w-8 text-muted-foreground/70" />
                            <p className="mt-2 text-sm font-medium text-muted-foreground">No approved achievements yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {achievements.map((ach) => (
                                <AchievementListItem
                                    key={ach.id}
                                    achievement={ach}
                                    onClick={() => setSelectedAchievement(ach)}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
                {role !== 'student' && achievements.length > 0 && (
                    <CardFooter>
                        <Button asChild variant="ghost" className="w-full text-primary">
                            <Link href="/admins/achievements"> {/* A future page for all achievements */}
                                View All Achievements <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                )}
            </Card>

            <AchievementDetailsModal
                isOpen={!!selectedAchievement}
                onClose={() => setSelectedAchievement(null)}
                achievement={selectedAchievement}
            />
        </>
    )
}