// components/AchievementsForm.tsx
'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'
import { toast } from 'sonner'

// Shadcn/UI & Icon Components
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Award, AlertCircle, CheckCircle2, Loader2, FileText, X } from 'lucide-react'

// A new, smarter component for previewing uploaded files
function FilePreview({ file, onRemove }: { file: File | null, onRemove: () => void }) {
    if (!file) return null;

    const isImage = file.type.startsWith('image/');
    const fileSize = (file.size / 1024).toFixed(2); // in KB

    return (
        <div>
            <Label>Preview</Label>
            <div className="mt-2 relative rounded-md border p-2 flex items-center gap-4">
                {isImage ? (
                    <img src={URL.createObjectURL(file)} alt="Proof preview" className="h-20 w-20 rounded-md object-cover" />
                ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-md bg-muted">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                )}
                <div className="flex-1 text-sm">
                    <p className="font-semibold truncate">{file.name}</p>
                    <p className="text-muted-foreground">{fileSize} KB</p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={onRemove}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove file</span>
                </Button>
            </div>
        </div>
    )
}

export default function AchievementsForm() {
    const { user, details, loading: userLoading } = useUserData();
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setProofFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error("File is too large", { description: "Please upload a file smaller than 5MB." });
                return;
            }
            setProofFile(file);
        }
    };

    const removeFile = () => {
        setProofFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            toast.error('Title and description are required.');
            return;
        }
        if (!user || !details?.name || !details?.cic || !details?.batch) {
            toast.error('Your user data is incomplete.', { description: 'Please try logging in again.' });
            return;
        }

        setLoading(true);
        let proofUrl = null;

        try {
            if (proofFile) {
                const filePath = `${user.id}/${Date.now()}-${proofFile.name}`;
                const { error: uploadError } = await supabase.storage.from('achievements').upload(filePath, proofFile);
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('achievements').getPublicUrl(filePath);
                proofUrl = urlData.publicUrl;
            }

            const { error: insertError } = await supabase.from('achievements').insert([
                { title, description, proof_url: proofUrl, student_uid: user.id, name: details.name, cic: details.cic, batch: details.batch, approved: false },
            ]);

            if (insertError) throw insertError;

            toast.success('Achievement submitted!', { description: 'It has been sent for review.' });
            resetForm();
            setTimeout(() => setIsOpen(false), 1500);

        } catch (error: any) {
            toast.error('Submission failed', { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Card className="group w-full cursor-pointer border-2 border-dashed border-border bg-transparent transition-all hover:border-primary hover:bg-primary/5">
                    <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center">
                        <div className="mb-4 rounded-full bg-primary/10 p-4 transition-transform group-hover:scale-110 group-hover:rotate-6">
                            <Award className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold font-heading">Submit an Achievement</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Won an award? Published a paper? Click here to share it.
                        </p>
                    </CardContent>
                </Card>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-heading">Submit New Achievement</DialogTitle>
                    <DialogDescription>
                        Share your accomplishment. It will be sent to your class teacher for review.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., First Prize in National Hackathon" disabled={loading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Briefly describe what you accomplished, the event, and the date." rows={4} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="proof-file">Proof (Optional)</Label>
                        <Input id="proof-file" type="file" onChange={handleFileChange} ref={fileInputRef} className="file:text-primary file:font-semibold" accept="image/png, image/jpeg, application/pdf" disabled={loading} />
                        <p className="text-xs text-muted-foreground">Upload a certificate, photo, or PDF. Max file size: 5MB.</p>
                    </div>

                    <FilePreview file={proofFile} onRemove={removeFile} />
                </div>

                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading || userLoading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit for Review
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}