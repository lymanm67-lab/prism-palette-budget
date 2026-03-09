import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { keys: ['⌘', 'K'], description: 'Open command palette' },
  { keys: ['?'], description: 'Open keyboard shortcuts' },
  { keys: ['G', 'D'], description: 'Go to Dashboard' },
  { keys: ['G', 'T'], description: 'Go to Transactions' },
  { keys: ['G', 'B'], description: 'Go to Budgets' },
  { keys: ['G', 'A'], description: 'Go to Accounts' },
  { keys: ['G', 'R'], description: 'Go to Reports' },
  { keys: ['G', 'S'], description: 'Go to Settings' },
  { keys: ['N'], description: 'New transaction (on Transactions page)' },
  { keys: ['Esc'], description: 'Close dialog / Cancel' },
];

const KeyboardShortcutsModal = ({ open, onOpenChange }: KeyboardShortcutsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="divide-y">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, j) => (
                  <span key={j}>
                    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-xs font-medium text-foreground">
                      {key}
                    </kbd>
                    {j < shortcut.keys.length - 1 && <span className="mx-0.5 text-muted-foreground">+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center pt-2">
          Press <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1 text-[10px]">?</kbd> anytime to see this menu
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsModal;
