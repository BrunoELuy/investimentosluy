export type SuggestionType = 'FEATURE' | 'FIX';

export type SuggestionStatus = 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'CONCLUIDO';

export interface UserSuggestion {
  id: string;
  user_id: string;
  user_email: string | null;
  type: SuggestionType;
  title: string;
  description: string;
  status: SuggestionStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateSuggestionInput {
  type: SuggestionType;
  title: string;
  description: string;
}

export const SUGGESTION_ADMIN_EMAIL = 'brunoluy.e10@gmail.com';

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  NAO_INICIADO: 'Não iniciado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
};

export const SUGGESTION_TYPE_LABELS: Record<SuggestionType, string> = {
  FEATURE: 'Nova Feature',
  FIX: 'Correção (Fix)',
};

export function isSuggestionAdmin(email?: string | null): boolean {
  return (email ?? '').trim().toLowerCase() === SUGGESTION_ADMIN_EMAIL;
}

export function filterSuggestions(
  items: UserSuggestion[],
  statusFilter: SuggestionStatus | 'ALL',
  typeFilter: SuggestionType | 'ALL',
): UserSuggestion[] {
  return items.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
    return true;
  });
}
