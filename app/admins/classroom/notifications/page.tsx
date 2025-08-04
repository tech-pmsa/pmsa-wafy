// pages/FullNotificationsPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserRoleData } from '@/hooks/useUserRoleData'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Inbox, Link as LinkIcon, Loader2 } from 'lucide-react'

type Achievement = {
  id: number;
  title: string;
  description: string;
  name: string;
  cic: string;
  proof_url: string;
  submitted_at: string;
}

export default function FullNotificationsPage() {
  const { batch } = useUserRoleData()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State for the confirmation dialog
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    action: '' as 'approve' | 'decline' | '',
    achievement: null as Achievement | null,
  })

  useEffect(() => {
    const fetchAchievements = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('batch', batch)
        .eq('approved', false)
        .order('submitted_at', { ascending: false })

      if (error) {
        toast.error('Failed to fetch notifications.')
      } else {
        setAchievements(data || [])
      }
      setLoading(false)
    }

    if (batch) fetchAchievements()
  }, [batch])

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
    setDialogState({ isOpen: false, action: '', achievement: null }) // Close and reset dialog
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Pending Achievements</CardTitle>
          <CardDescription>
            Review and act on the achievements submitted by students in your batch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : achievements.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
                <Inbox className="h-16 w-16 text-muted-foreground/50" />
                <h3 className="mt-4 text-xl font-semibold">All Caught Up!</h3>
                <p className="mt-2 text-sm text-muted-foreground">There are no pending achievements to review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Student</TableHead>
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
                        <div className="font-medium">{ach.name}</div>
                        <div className="text-sm text-muted-foreground">{ach.cic}</div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">{ach.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">{ach.description}</p>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(ach.submitted_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-center">
                        {ach.proof_url ? (
                          <Button asChild variant="outline" size="sm">
                            <a href={ach.proof_url} target="_blank" rel="noreferrer">
                              <LinkIcon className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          <Badge variant="secondary">None</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openConfirmationDialog('decline', ach)}>
                            <XCircle className="h-4 w-4 mr-2 text-red-500" /> Decline
                          </Button>
                          <Button size="sm" onClick={() => openConfirmationDialog('approve', ach)} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reusable Confirmation Dialog */}
      <AlertDialog open={dialogState.isOpen} onOpenChange={(isOpen) => setDialogState({ ...dialogState, isOpen })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {dialogState.action} the achievement titled "{dialogState.achievement?.title}".
              {dialogState.action === 'decline' && ' This action is permanent and cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className={dialogState.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {dialogState.action === 'approve' ? 'Approval' : 'Decline'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}