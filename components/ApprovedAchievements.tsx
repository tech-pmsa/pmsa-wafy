'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'
import { Trophy, Calendar, User as UserIcon, Link as LinkIcon } from 'lucide-react'

// Shadcn/UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// A reusable card for displaying each achievement in a list format
function AchievementDisplayCard({ achievement, onClick }: { achievement: any, onClick: () => void }) {
    return (
        <button onClick={onClick} className="w-full text-left flex items-start gap-4 p-3 rounded-lg transition-colors hover:bg-muted/50">
            <Avatar className="h-10 w-10 border">
                <AvatarImage src={achievement.students?.img_url} />
                <AvatarFallback>
                    <Trophy className="h-5 w-5 text-muted-foreground" />
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" title={achievement.title}>{achievement.title}</p>
                <p className="text-sm text-muted-foreground truncate" title={achievement.description}>
                    {achievement.description}
                </p>
                <div className="text-xs text-muted-foreground mt-1">
                    <span>{achievement.name} ({achievement.cic})</span>
                </div>
            </div>
        </button>
    );
}

// New Modal Component to show full details
function AchievementDetailsModal({ achievement, isOpen, onClose }: { achievement: any | null, isOpen: boolean, onClose: () => void }) {
    if (!achievement) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{achievement.title}</DialogTitle>
                    <DialogDescription>
                        Submitted by <span className="font-medium text-foreground">{achievement.name}</span> on {new Date(achievement.submitted_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    {achievement.proof_url && (
                        <Button asChild variant="outline" size="sm">
                            <a href={achievement.proof_url} target="_blank" rel="noreferrer">
                                <LinkIcon className="h-4 w-4 mr-2" /> View Proof
                            </a>
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function ApprovedAchievements() {
    const { role, details, loading: userLoading } = useUserData();
    const [achievements, setAchievements] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedAchievement, setSelectedAchievement] = useState<any | null>(null);

    useEffect(() => {
        if (userLoading) return;

        const fetchAchievements = async () => {
            setIsLoading(true)
            let query = supabase.from('achievements').select('*, students(img_url)').eq('approved', true)

            if (role === 'student' && details?.cic) {
                query = query.eq('cic', details.cic)
            } else if (role === 'class' && details?.batch) {
                query = query.eq('batch', details.batch)
            }

            const { data, error } = await query.order('submitted_at', { ascending: false }).limit(10);

            if (error) {
                console.error("Error fetching achievements:", error)
            } else if (data) {
                setAchievements(data)
            }
            setIsLoading(false)
        }

        fetchAchievements()
    }, [role, details, userLoading]);

    const title = useMemo(() => {
        if (role === 'student') return 'My Recent Achievements';
        if (role === 'class') return `Recent Achievements from ${details?.batch || 'Your Class'}`;
        return 'Latest College Achievements';
    }, [role, details]);

    if (userLoading || isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                    <div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-2/3" /></div></div>
                    <div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-2/3" /></div></div>
                    <div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-2/3" /></div></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>A showcase of recent accomplishments.</CardDescription>
                </CardHeader>
                <CardContent>
                    {achievements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed h-48">
                            <Trophy className="h-8 w-8 text-muted-foreground" />
                            <p className="mt-2 text-sm font-medium text-muted-foreground">No approved achievements yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {achievements.map((ach) => (
                                <AchievementDisplayCard
                                    key={ach.id}
                                    achievement={ach}
                                    onClick={() => setSelectedAchievement(ach)}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AchievementDetailsModal
                isOpen={!!selectedAchievement}
                onClose={() => setSelectedAchievement(null)}
                achievement={selectedAchievement}
            />
        </>
    )
}
