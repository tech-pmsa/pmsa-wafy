// components/admin/manage-students/PromoteClassModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Shadcn/UI & Icon Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronsRight } from 'lucide-react';

interface PromoteClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  onConfirm: (toClass: string) => void;
  isLoading: boolean;
}

export function PromoteClassModal({
  isOpen,
  onClose,
  className,
  onConfirm,
  isLoading,
}: PromoteClassModalProps) {
  const [toClass, setToClass] = useState('');
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!isOpen) return;
      setLoadingClasses(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('designation')
          .eq('role', 'class');

        if (error) throw error;

        // Extract unique, non-null, non-empty designations, removing the word "Class"
        const designations = Array.from(
          new Set(
            (data || [])
              .map((row) => {
                const raw = row.designation || '';
                return raw.replace(/class/gi, '').replace(/\s+/g, ' ').trim();
              })
              .filter(Boolean)
          )
        ).sort();

        setAllClasses(designations);
      } catch (err: any) {
        console.error('Failed to load classes from profiles:', err.message);
        setAllClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <ChevronsRight className="h-6 w-6 text-primary" />
            Promote Class: {className}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select the new class to move all students from {className}. This action will update the class ID for every student in this group.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="to-class" className="text-xs font-bold text-muted-foreground">Promote to Class</Label>
          <Select value={toClass} onValueChange={setToClass}>
            <SelectTrigger id="to-class" className="rounded-xl h-10 font-semibold text-xs">
              <SelectValue placeholder={loadingClasses ? 'Loading classes...' : 'Select a destination class...'} />
            </SelectTrigger>
            <SelectContent>
              {allClasses.map((cls) => (
                <SelectItem key={cls} value={cls} disabled={cls === className} className="text-xs font-bold">
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading} className="rounded-xl font-bold text-xs">
            Cancel
          </Button>
          <Button onClick={() => onConfirm(toClass)} disabled={isLoading || !toClass || loadingClasses} className="rounded-xl font-bold text-xs shadow-md">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Promoting...
              </>
            ) : (
              'Confirm Promotion'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}