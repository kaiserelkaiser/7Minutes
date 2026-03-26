import { motion, AnimatePresence } from 'framer-motion';

export function CatalystDrop({ catalyst }: { catalyst: string | null }) {
  return (
    <AnimatePresence>
      {catalyst && (
        <motion.div
          initial={{ scale: 0, y: -100, opacity: 0 }}
          animate={{ scale: [0, 1.2, 1], y: 0, opacity: 1 }}
          exit={{ scale: 0, opacity: 0, y: 100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[150] pointer-events-none"
        >
          {/* detonation rings */}
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 3 + i, opacity: 0 }}
              transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border border-yellow-400/60"
            />
          ))}

          <div
            className="relative px-6 py-4 rounded-2xl text-center max-w-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(255,180,0,0.1), rgba(255,100,0,0.1))',
              border: '1px solid rgba(255,180,0,0.4)',
              boxShadow: '0 0 40px rgba(255,150,0,0.3), inset 0 0 20px rgba(255,150,0,0.05)',
            }}
          >
            <div className="font-mono text-[10px] text-yellow-400/60 uppercase tracking-widest mb-2">
              ⚡ catalyst dropped
            </div>
            <p className="font-display text-white text-sm font-bold tracking-wide">
              {catalyst}
            </p>
            {/* shrinking timer bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 12, ease: 'linear' }}
              className="mt-3 h-0.5 rounded-full origin-left"
              style={{ background: 'rgba(255,180,0,0.5)' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
