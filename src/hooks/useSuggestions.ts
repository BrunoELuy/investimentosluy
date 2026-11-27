import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type {
  CreateSuggestionInput,
  SuggestionStatus,
  UserSuggestion,
} from '@/types/suggestion';

export function useSuggestions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-suggestions', user?.id, user?.email],
    queryFn: async (): Promise<UserSuggestion[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as UserSuggestion[];
    },
    enabled: !!user,
  });
}

export function useCreateSuggestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateSuggestionInput) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_suggestions')
        .insert({
          user_id: user.id,
          user_email: user.email ?? null,
          type: input.type,
          title: input.title.trim(),
          description: input.description.trim(),
          status: 'NAO_INICIADO',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as UserSuggestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-suggestions'] });
      toast({
        title: 'Ideia enviada!',
        description: 'Obrigado pela contribuição. Sua proposta foi registrada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar sugestão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSuggestionStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: SuggestionStatus;
    }) => {
      const { data, error } = await supabase
        .from('user_suggestions')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as UserSuggestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-suggestions'] });
      toast({
        title: 'Status atualizado',
        description: 'A catalogação da proposta foi atualizada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSuggestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_suggestions')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-suggestions'] });
      toast({
        title: 'Proposta removida',
        description: 'A sugestão foi excluída.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir proposta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
