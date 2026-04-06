import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActionsForEntityType, ActionSchema } from '@/lib/actionRegistry';
import { useToast } from '@/components/ui/Toast';
import { ShieldAlert, Check } from 'lucide-react';

interface QuickActionsProps {
  entityType: string;
  entityId: string;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function QuickActions({ entityType, entityId, className = '', orientation = 'horizontal' }: QuickActionsProps) {
  const actions = getActionsForEntityType(entityType);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<ActionSchema | null>(null);
  const { toast } = useToast();

  if (actions.length === 0) return null;

  const handleActionClick = (action: ActionSchema) => {
    if (action.requiresApproval) {
      setConfirmingAction(action);
    } else {
      executeAction(action);
    }
  };

  const executeAction = (action: ActionSchema) => {
    setActiveAction(action.id);
    // Simulate backend call
    setTimeout(() => {
      toast(`Action "${action.name}" dispatched for ${entityId}`, 'success');
      setActiveAction(null);
      setConfirmingAction(null);
    }, 800);
  };

  return (
    <div className={`relative flex gap-1 ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} ${className}`}>
      {actions.map((action) => {
        const Icon = action.icon;
        const isExecuting = activeAction === action.id;
        
        let hoverClass = 'hover:bg-sf-surface hover:text-sf-accent border-transparent hover:border-sf-border';
        if (action.severity === 'high') hoverClass = 'hover:bg-sf-critical/10 hover:text-sf-critical border-transparent hover:border-sf-critical/50';

        return (
          <button
            key={action.id}
            title={action.description}
            onClick={(e) => {
              e.stopPropagation();
              handleActionClick(action);
            }}
            disabled={activeAction !== null}
            className={`group relative p-1.5 flex items-center justify-center rounded transition-all border ${hoverClass} ${
              isExecuting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isExecuting ? (
               <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                 <Icon className="w-3.5 h-3.5 text-sf-muted" />
               </motion.div>
            ) : (
               <Icon className="w-3.5 h-3.5 text-sf-muted group-hover:text-current transition-colors" />
            )}
          </button>
        );
      })}

      <AnimatePresence>
        {confirmingAction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: orientation === 'vertical' ? 0 : 5, x: orientation === 'vertical' ? -5 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute z-10 p-2 bg-sf-surface border border-sf-border shadow-2xl rounded text-xs w-48 ${
              orientation === 'vertical' ? 'right-full mr-2 top-0' : 'bottom-full mb-2 right-0'
            }`}
          >
            <div className="flex items-center gap-2 text-sf-critical mb-2 font-bold font-mono">
               <ShieldAlert className="w-3.5 h-3.5" />
               Confirm Action
            </div>
            <p className="text-[10px] text-sf-muted leading-tight mb-2">
              Execute <span className="text-sf-text font-bold">{confirmingAction.name}</span> on <span className="font-mono">{entityId}</span>?
            </p>
            <div className="flex justify-end gap-2">
               <button 
                 onClick={(e) => { e.stopPropagation(); setConfirmingAction(null); }}
                 className="px-2 py-1 bg-sf-bg border border-sf-border hover:bg-sf-bg/80 text-sf-text text-[10px]"
               >
                 Cancel
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); executeAction(confirmingAction); }}
                 className="flex items-center gap-1 px-2 py-1 bg-sf-critical/20 border border-sf-critical/50 hover:bg-sf-critical/30 text-sf-critical font-bold text-[10px]"
               >
                 <Check className="w-3 h-3" /> Approve
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
