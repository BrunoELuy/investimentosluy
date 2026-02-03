import { Wifi, WifiOff, RefreshCw, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

export function OnlineStatusIndicator() {
  const { isOnline, isSyncing, pendingChanges, triggerSync } = useOnlineStatus();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {pendingChanges > 0 && (
          <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
            {pendingChanges} pendente{pendingChanges > 1 ? 's' : ''}
          </Badge>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                !isOnline && "text-destructive"
              )}
              onClick={isOnline ? triggerSync : undefined}
              disabled={isSyncing || !isOnline}
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : isOnline ? (
                <Cloud className="h-4 w-4 text-success" />
              ) : (
                <WifiOff className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isSyncing ? (
              'Sincronizando...'
            ) : isOnline ? (
              pendingChanges > 0 ? 
                `Clique para sincronizar ${pendingChanges} alteração(ões)` : 
                'Conectado - dados sincronizados'
            ) : (
              'Modo offline - alterações serão sincronizadas ao reconectar'
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
