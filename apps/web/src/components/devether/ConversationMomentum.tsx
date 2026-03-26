import { motion } from 'framer-motion';

interface ConversationMomentumProps {
  momentum: number;
  vibeColor: string;
}

export function ConversationMomentum({ momentum, vibeColor }: ConversationMomentumProps) {
  if (momentum < 10) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed left-4 bottom-24 z-40 flex flex-col gap-1 items-start"
    >
      <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest">momentum</span>
      <div
        className="relative h-20 w-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <motion.div
          animate={{ height: `${momentum}%` }}
          transition={{ duration: 0.5 }}
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{
            background: `linear-gradient(to top, ${vibeColor}, ${vibeColor}88)`,
            boxShadow: `0 0 6px ${vibeColor}`,
          }}
        />
      </div>
      {momentum > 80 && (
        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="font-mono text-[9px]"
          style={{ color: vibeColor }}
        >
          hot
        </motion.span>
      )}
    </motion.div>
  );
}
