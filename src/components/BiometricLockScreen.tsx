import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Fingerprint, ShieldCheck } from 'lucide-react';

interface BiometricLockScreenProps {
  onUnlock: () => void;
}

export default function BiometricLockScreen({ onUnlock }: BiometricLockScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
    >
      <div className="flex flex-col items-center gap-6 text-center px-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/60 shadow-2xl">
          <ShieldCheck className="h-12 w-12 text-primary-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold">PrismMoney Locked</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            Authenticate with Face ID or Touch ID to access your financial data.
          </p>
        </div>
        <Button
          onClick={onUnlock}
          size="lg"
          className="gap-2 rounded-xl h-14 px-8 mt-4"
        >
          <Fingerprint className="h-6 w-6" />
          Unlock
        </Button>
      </div>
    </motion.div>
  );
}
