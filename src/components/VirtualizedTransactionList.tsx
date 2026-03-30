import { useRef, useCallback, memo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import MerchantIcon from './MerchantIcon';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

interface Transaction {
  id: string;
  date: string;
  merchant: string | null;
  amount: number;
  account_id: string;
  category_id: string | null;
  notes: string | null;
  tags: string[] | null;
  is_transfer?: boolean;
  needs_review?: boolean;
  accounts?: { name: string } | null;
  categories?: { name: string; color: string } | null;
}

interface VirtualizedTransactionListProps {
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onRowClick: (txn: Transaction) => void;
  onSwipeDelete?: (id: string) => void;
  duplicateIds?: Set<string>;
}

const TransactionRow = memo(({ 
  txn, 
  formatCurrency, 
  isSelected, 
  onToggle, 
  onClick,
  onSwipeDelete,
  isDuplicate,
}: { 
  txn: Transaction; 
  formatCurrency: (n: number) => string;
  isSelected: boolean;
  onToggle: () => void;
  onClick: () => void;
  onSwipeDelete?: (id: string) => void;
  isDuplicate: boolean;
}) => {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-120, -60], [1, 0]);
  const editOpacity = useTransform(x, [60, 120], [0, 1]);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -100 && onSwipeDelete) {
      onSwipeDelete(txn.id);
    } else if (info.offset.x > 100) {
      onClick();
    }
  };

  const rowContent = (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer',
        isSelected && 'bg-primary/5',
        isDuplicate && 'bg-amber-500/5'
      )}
      onClick={!isMobile ? onClick : undefined}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={(e) => {
          e && onToggle();
        }}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 hidden md:flex"
      />
      
      <MerchantIcon merchant={txn.merchant || ''} className="shrink-0" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {txn.merchant || 'Unknown'}
          </span>
          {isDuplicate && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          )}
          {txn.needs_review && (
            <Badge variant="outline" className="text-xs h-5 bg-amber-500/10 text-amber-600 border-amber-500/30">
              Review
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{txn.accounts?.name || 'Unknown Account'}</span>
          {txn.categories && (
            <>
              <span>•</span>
              <span style={{ color: txn.categories.color }}>{txn.categories.name}</span>
            </>
          )}
        </div>
      </div>
      
      <div className="text-right shrink-0">
        <p className={cn(
          'font-semibold tabular-nums',
          txn.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
        )}>
          {txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(parseISO(txn.date), 'MMM d')}
        </p>
      </div>
    </div>
  );

  if (!isMobile) return rowContent;

  return (
    <div className="relative overflow-hidden">
      {/* Swipe action backgrounds */}
      <div className="absolute inset-0 flex">
        {/* Edit action (swipe right) */}
        <motion.div
          style={{ opacity: editOpacity }}
          className="flex items-center justify-start px-5 bg-prism-sky/20 w-1/2"
        >
          <Pencil className="h-5 w-5 text-prism-sky" />
        </motion.div>
        {/* Delete action (swipe left) */}
        <motion.div
          style={{ opacity: deleteOpacity }}
          className="flex items-center justify-end px-5 bg-destructive/20 w-1/2 ml-auto"
        >
          <Trash2 className="h-5 w-5 text-destructive" />
        </motion.div>
      </div>
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="relative bg-card z-10"
        onClick={onClick}
      >
        {rowContent}
      </motion.div>
    </div>
  );
});

TransactionRow.displayName = 'TransactionRow';

export default function VirtualizedTransactionList({
  transactions,
  formatCurrency,
  selected,
  onToggleSelect,
  onRowClick,
  onSwipeDelete,
  duplicateIds = new Set(),
}: VirtualizedTransactionListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  const items = virtualizer.getVirtualItems();

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No transactions found</p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto rounded-lg border border-border">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualItem) => {
          const txn = transactions[virtualItem.index];
          return (
            <div
              key={txn.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <TransactionRow
                txn={txn}
                formatCurrency={formatCurrency}
                isSelected={selected.has(txn.id)}
                onToggle={() => onToggleSelect(txn.id)}
                onClick={() => onRowClick(txn)}
                isDuplicate={duplicateIds.has(txn.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
