import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Lightbulb,
  Wrench,
  Sparkles,
  Send,
  Trash2,
  ShieldCheck,
  Clock,
  Loader2,
  CheckCircle2,
  CircleDashed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import {
  useCreateSuggestion,
  useDeleteSuggestion,
  useSuggestions,
  useUpdateSuggestionStatus,
} from '@/hooks/useSuggestions';
import {
  filterSuggestions,
  isSuggestionAdmin,
  SUGGESTION_STATUS_LABELS,
  SUGGESTION_TYPE_LABELS,
  type SuggestionStatus,
  type SuggestionType,
} from '@/types/suggestion';

const STATUS_BADGE_CLASSES: Record<SuggestionStatus, string> = {
  NAO_INICIADO:
    'bg-muted text-muted-foreground border-border',
  EM_ANDAMENTO:
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  CONCLUIDO:
    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
};

function StatusIcon({ status }: { status: SuggestionStatus }) {
  if (status === 'CONCLUIDO') return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === 'EM_ANDAMENTO') return <Clock className="h-3.5 w-3.5" />;
  return <CircleDashed className="h-3.5 w-3.5" />;
}

export default function Suggestions() {
  const { user } = useAuth();
  const isAdmin = isSuggestionAdmin(user?.email);

  const { data: suggestions = [], isLoading } = useSuggestions();
  const createSuggestion = useCreateSuggestion();
  const updateStatus = useUpdateSuggestionStatus();
  const deleteSuggestion = useDeleteSuggestion();

  const [type, setType] = useState<SuggestionType>('FEATURE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<SuggestionType | 'ALL'>('ALL');

  const canSubmit =
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    !createSuggestion.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    await createSuggestion.mutateAsync({
      type,
      title,
      description,
    });
    setTitle('');
    setDescription('');
    setType('FEATURE');
  };

  const counts = useMemo(() => {
    return {
      ALL: suggestions.length,
      NAO_INICIADO: suggestions.filter((s) => s.status === 'NAO_INICIADO').length,
      EM_ANDAMENTO: suggestions.filter((s) => s.status === 'EM_ANDAMENTO').length,
      CONCLUIDO: suggestions.filter((s) => s.status === 'CONCLUIDO').length,
    };
  }, [suggestions]);

  const filtered = useMemo(
    () => filterSuggestions(suggestions, statusFilter, typeFilter),
    [suggestions, statusFilter, typeFilter],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Lightbulb className="h-7 w-7 text-amber-500" />
          Sugestões & Melhorias
        </h1>
        <p className="text-muted-foreground mt-1">
          Envie ideias de novas funcionalidades ou reporte correções para o InvestTracker.
        </p>
      </div>

      {/* Formulário de envio para qualquer usuário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enviar uma proposta</CardTitle>
          <CardDescription>
            Descreva sua ideia ou problema encontrado. Você poderá acompanhar o status abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="suggestion-type">Categoria</Label>
                <Select
                  value={type}
                  onValueChange={(val) => setType(val as SuggestionType)}
                >
                  <SelectTrigger id="suggestion-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FEATURE">Nova Feature</SelectItem>
                    <SelectItem value="FIX">Correção (Fix)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="suggestion-title">Título</Label>
                <Input
                  id="suggestion-title"
                  placeholder="Ex: Adicionar suporte ao Tesouro Direto"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suggestion-description">Descrição</Label>
              <Textarea
                id="suggestion-description"
                placeholder="Explique o que gostaria de ver ou qual bug aconteceu e como reproduzir..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={1000}
                required
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de 10 caracteres ({description.trim().length}/1000).
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={!canSubmit} className="gap-2">
                {createSuggestion.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {createSuggestion.isPending ? 'Enviando...' : 'Enviar proposta'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista de propostas (para o admin: todas; para usuários: as suas próprias) */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {isAdmin ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Todas as Propostas (Admin)
                  </>
                ) : (
                  'Minhas Propostas Enviadas'
                )}
              </CardTitle>
              <CardDescription>
                {isAdmin
                  ? 'Gerencie o andamento das sugestões enviadas pelos usuários.'
                  : 'Acompanhe o status das sugestões que você enviou.'}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as SuggestionType | 'ALL')}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os tipos</SelectItem>
                  <SelectItem value="FEATURE">Nova Feature</SelectItem>
                  <SelectItem value="FIX">Correção (Fix)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtros por status com contadores */}
          <div className="flex flex-wrap gap-2 pt-3">
            {(
              [
                ['ALL', `Todas (${counts.ALL})`],
                ['NAO_INICIADO', `Não iniciado (${counts.NAO_INICIADO})`],
                ['EM_ANDAMENTO', `Em andamento (${counts.EM_ANDAMENTO})`],
                ['CONCLUIDO', `Concluído (${counts.CONCLUIDO})`],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={statusFilter === key ? 'default' : 'outline'}
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse">
              Carregando propostas...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma proposta encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border bg-card space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            item.type === 'FIX'
                              ? 'bg-destructive/10 text-destructive border-destructive/30 gap-1'
                              : 'bg-primary/10 text-primary border-primary/30 gap-1'
                          }
                        >
                          {item.type === 'FIX' ? (
                            <Wrench className="h-3 w-3" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          {SUGGESTION_TYPE_LABELS[item.type]}
                        </Badge>

                        <Badge
                          variant="outline"
                          className={`gap-1 ${STATUS_BADGE_CLASSES[item.status]}`}
                        >
                          <StatusIcon status={item.status} />
                          {SUGGESTION_STATUS_LABELS[item.status]}
                        </Badge>

                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>

                      <h3 className="font-semibold text-base pt-1">{item.title}</h3>
                      {isAdmin && item.user_email && (
                        <p className="text-xs text-muted-foreground">
                          Enviado por: <span className="font-medium">{item.user_email}</span>
                        </p>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={item.status}
                          disabled={updateStatus.isPending}
                          onValueChange={(nextStatus) =>
                            updateStatus.mutate({
                              id: item.id,
                              status: nextStatus as SuggestionStatus,
                            })
                          }
                        >
                          <SelectTrigger className="w-[155px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NAO_INICIADO">Não iniciado</SelectItem>
                            <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
                            <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                          </SelectContent>
                        </Select>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Excluir proposta"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Deseja excluir permanentemente "{item.title}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSuggestion.mutate(item.id)}
                                disabled={deleteSuggestion.isPending}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
