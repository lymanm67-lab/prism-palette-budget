import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users, Plus, Loader2, Trash2, Mail, Clock, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function HouseholdInvitations() {
  const { household } = useHousehold();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Check if current user is owner
  const { data: membership } = useQuery({
    queryKey: ['household_membership', household?.id, user?.id],
    enabled: !!household && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_members')
        .select('role')
        .eq('household_id', household!.id)
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const isOwner = membership?.role === 'owner';

  // Load members
  const { data: members } = useQuery({
    queryKey: ['household_members', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });

  // Load invitations
  const { data: invitations } = useQuery({
    queryKey: ['household_invitations', household?.id],
    enabled: !!household && isOwner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_invitations')
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sendInvite = useMutation({
    mutationFn: async (inviteEmail: string) => {
      const { error } = await supabase
        .from('household_invitations')
        .insert({
          household_id: household!.id,
          email: inviteEmail.toLowerCase().trim(),
          invited_by: user!.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['household_invitations'] });
      toast.success('Invitation sent!');
      setEmail('');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to send invitation'),
  });

  const cancelInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('household_invitations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['household_invitations'] });
      toast.success('Invitation cancelled');
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleInvite = () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }
    sendInvite.mutate(email);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="font-display">Household Members</CardTitle>
        </div>
        <CardDescription>Manage who has access to this household.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current members */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Members</Label>
          <div className="space-y-2">
            {(members || []).map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {m.user_id === user?.id ? 'You' : '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.user_id === user?.id ? 'You' : m.user_id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs capitalize">{m.role}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Pending invitations */}
        {isOwner && invitations && invitations.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Pending Invitations</Label>
            <div className="space-y-2">
              {invitations.filter(i => i.status === 'pending').map(inv => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-dashed p-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires {format(parseISO(inv.expires_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(inv.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {invitations.filter(i => i.status === 'accepted').map(inv => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3 bg-emerald-500/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">Accepted</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite form */}
        {isOwner && (
          <div className="space-y-2 pt-2 border-t">
            <Label>Invite by Email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="partner@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
              <Button onClick={handleInvite} disabled={sendInvite.isPending} className="gap-2 shrink-0">
                {sendInvite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Invite
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The invited user must sign up with this exact email and accept the invitation from their settings.
            </p>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
            <AlertDialogDescription>This will revoke the pending invitation.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && cancelInvite.mutate(deleteTarget)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
