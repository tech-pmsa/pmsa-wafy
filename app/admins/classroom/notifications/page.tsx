// app/admins/classroom/notifications/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCircle2, XCircle, Inbox, Link as LinkIcon, Loader2, User, ExternalLink } from 'lucide-react'

// Type Definition
type Achievement = {
  id: number;
  title: string;
  description: string;
  name: string;
  cic: string;
  proof_url: string | null;
  submitted_at: string;
  students: { img_url: string | null } | null;
}

// Reusable component for the MOBILE notification card
function AchievementCard({ achievement, onApprove, onDecline, onViewProof }: { achievement: Achievement, onApprove: () => void, onDecline: () => void, onViewProof: () => void }) {
  return (
    <Card className="overflow-hidden shadow-md">
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <Avatar className="border">
          <AvatarImage src={achievement.students?.img_url || undefined} />
          <AvatarFallback><User /></AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-base">{achievement.title}</CardTitle>
          <CardDescription>By <span className="font-medium text-foreground">{achievement.name}</span> ({achievement.cic})</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
         <p className="text-sm text-muted-foreground line-clamp-3">{achievement.description}</p>
      </CardContent>
      <CardFooter className="bg-muted/50 p-3 flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(achievement.submitted_at), { addSuffix: true })}
        </p>
        <div className="flex gap-2">
            {achievement.proof_url && <Button variant="outline" size="icon" onClick={onViewProof}><LinkIcon className="h-4 w-4" /></Button>}
            <Button variant="outline" size="sm" onClick={onDecline}><XCircle className="h-4 w-4 mr-2 text-destructive" /> Decline</Button>
            <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-4 w-4 mr-2" /> Approve</Button>
        </div>
      </CardFooter>
    </Card>
  )
}

// New Modal to preview image proofs
function ProofViewerModal({ url, onClose }: { url: string | null, onClose: () => void }) {
    if (!url) return null;
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(url);
    return (
        <Dialog open={!!url} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Achievement Proof</DialogTitle>
                    <DialogDescription>Review the proof submitted by the student.</DialogDescription>
                </DialogHeader>
                <div className="py-4 flex items-center justify-center rounded-md border bg-muted/50 max-h-[70vh] overflow-auto">
                    {isImage ? (
                        <img src={url} alt="Proof" className="max-w-full h-auto rounded-md" />
                    ) : (
                        <p className="text-muted-foreground p-8">Cannot preview this file type.</p>
                    )}
                </div>
                <DialogFooter>
                    <Button asChild variant="outline">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4"/> Open in New Tab
                        </a>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function AchievementNotificationsPage() {
  const { details, loading: userLoading } = useUserData()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dialogState, setDialogState] = useState({ isOpen: false, action: '' as 'approve' | 'decline' | '', achievement: null as Achievement | null })
  const [proofToView, setProofToView] = useState<string | null>(null);

  useEffect(() => {
    const batch = details?.batch;
    if (userLoading || !batch) {
      if (!userLoading) setLoading(false);
      return;
    }

    const fetchAchievements = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('achievements')
        .select('*, students(img_url)')
        .eq('batch', batch)
        .eq('approved', false)
        .order('submitted_at', { ascending: false })

      if (error) toast.error('Failed to fetch notifications.')
      else setAchievements(data as Achievement[] || [])
      setLoading(false)
    }
    fetchAchievements()
  }, [details, userLoading])

  const openConfirmationDialog = (action: 'approve' | 'decline', achievement: Achievement) => {
    setDialogState({ isOpen: true, action, achievement })
  }

  const handleConfirmAction = async () => {
    if (!dialogState.action || !dialogState.achievement) return
    setIsSubmitting(true)
    const { action, achievement } = dialogState
    let error = null;

    if (action === 'approve') {
      ({ error } = await supabase.from('achievements').update({ approved: true }).eq('id', achievement.id));
    } else if (action === 'decline') {
      ({ error } = await supabase.from('achievements').delete().eq('id', achievement.id));
    }

    if (!error) {
      toast.success(`Achievement "${achievement.title}" has been ${action}d.`)
      setAchievements((prev) => prev.filter((a) => a.id !== achievement.id))
    } else {
      toast.error(`Failed to ${action} achievement.`, { description: error.message })
    }
    setIsSubmitting(false)
    setDialogState({ isOpen: false, action: '', achievement: null })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-heading">Pending Achievements</h1>
        <p className="text-muted-foreground">Review and act on submissions from students in your class.</p>
      </div>

      {loading || userLoading ? (
        <div className="border rounded-lg p-4">
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
      ) : achievements.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 bg-card rounded-lg border-2 border-dashed">
          <Inbox className="h-16 w-16 text-muted-foreground/50" />
          <h3 className="mt-4 text-xl font-semibold">All Caught Up!</h3>
          <p className="mt-2 text-sm text-muted-foreground">There are no pending achievements to review.</p>
        </div>
      ) : (
        <>
            {/* DESKTOP VIEW: A clean, data-rich table */}
            <div className="hidden md:block">
              <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[250px]">Student</TableHead>
                            <TableHead>Achievement</TableHead>
                            <TableHead className="w-[150px]">Submitted</TableHead>
                            <TableHead className="w-[100px] text-center">Proof</TableHead>
                            <TableHead className="w-[220px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {achievements.map((ach) => (
                            <TableRow key={ach.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border"><AvatarImage src={ach.students?.img_url || undefined} /><AvatarFallback>{ach.name.charAt(0)}</AvatarFallback></Avatar>
                                        <div><div className="font-medium">{ach.name}</div><div className="text-sm text-muted-foreground">{ach.cic}</div></div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <p className="font-semibold truncate max-w-xs">{ach.title}</p>
                                    <p className="text-sm text-muted-foreground truncate max-w-xs">{ach.description}</p>
                                </TableCell>
                                <TableCell>{formatDistanceToNow(new Date(ach.submitted_at), { addSuffix: true })}</TableCell>
                                <TableCell className="text-center">{ach.proof_url ? (<Button variant="outline" size="icon" onClick={() => setProofToView(ach.proof_url)}><LinkIcon className="h-4 w-4" /></Button>) : (<span className="text-xs text-muted-foreground">None</span>)}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openConfirmationDialog('decline', ach)}><XCircle className="h-4 w-4 mr-2" /> Decline</Button>
                                        <Button size="sm" onClick={() => openConfirmationDialog('approve', ach)} className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-4 w-4 mr-2" /> Approve</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </Card>
            </div>

            {/* MOBILE VIEW: A list of focused cards */}
            <div className="space-y-4 md:hidden">
              {achievements.map((ach) => (
                <AchievementCard
                  key={ach.id}
                  achievement={ach}
                  onApprove={() => openConfirmationDialog('approve', ach)}
                  onDecline={() => openConfirmationDialog('decline', ach)}
                  onViewProof={() => setProofToView(ach.proof_url)}
                />
              ))}
            </div>
        </>
      )}

      <AlertDialog open={dialogState.isOpen} onOpenChange={(isOpen) => setDialogState({ ...dialogState, isOpen })}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>You are about to {dialogState.action} the achievement titled "{dialogState.achievement?.title}". {dialogState.action === 'decline' && ' This action is permanent.'}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmAction} disabled={isSubmitting} className={dialogState.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm {dialogState.action === 'approve' ? 'Approval' : 'Decline'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProofViewerModal url={proofToView} onClose={() => setProofToView(null)} />
    </div>
  )
}
