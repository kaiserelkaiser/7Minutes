import { motion, AnimatePresence } from 'framer-motion';
import { EchoMoment as EchoMomentType } from '@/hooks/use-socket';

export function EchoMomentEffect({ echo }: { echo: EchoMomentType | null }) {
  return (
    <AnimatePresence>
      {echo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 2, filter: 'blur(20px)' }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
        >
          {/* particle burst rings */}
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 4 + i * 2, opacity: 0 }}
              transition={{ duration: 1.5, delay: i * 0.15, ease: 'easeOut' }}
              className="absolute w-32 h-32 rounded-full border-2"
              style={{ borderColor: echo.message1.userColor }}
            />
          ))}

          {/* two messages colliding */}
          <div className="relative flex items-center gap-2">
            <motion.div
              initial={{ x: -200, opacity: 0, rotateZ: -15 }}
              animate={{ x: 0, opacity: 1, rotateZ: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="px-3 py-2 rounded-xl font-mono text-xs max-w-[180px]"
              style={{
                background: `${echo.message1.userColor}20`,
                border: `1px solid ${echo.message1.userColor}80`,
                color: echo.message1.userColor,
              }}
            >
              {echo.message1.username}: {echo.message1.content.slice(0, 40)}
            </motion.div>

            <motion.div
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: [0, 2, 1], rotate: [0, 180, 360] }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-2xl z-10"
            >
              ⚡
            </motion.div>

            <motion.div
              initial={{ x: 200, opacity: 0, rotateZ: 15 }}
              animate={{ x: 0, opacity: 1, rotateZ: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="px-3 py-2 rounded-xl font-mono text-xs max-w-[180px]"
              style={{
                background: `${echo.message2.userColor}20`,
                border: `1px solid ${echo.message2.userColor}80`,
                color: echo.message2.userColor,
              }}
            >
              {echo.message2.username}: {echo.message2.content.slice(0, 40)}
            </motion.div>
          </div>

          {/* merged mega message */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 80, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="absolute font-display text-xl font-bold tracking-wider text-center px-6 py-3 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0,255,255,0.15), rgba(255,0,255,0.15))',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 0 40px rgba(0,255,255,0.4), 0 0 40px rgba(255,0,255,0.4)',
              color: 'white',
              textShadow: '2px 0 2px rgba(255,0,255,0.8), -2px 0 2px rgba(0,255,255,0.8)',
            }}
          >
            ⚡ MIND MELD ⚡
          </motion.div>

          {/* badge */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: -120 }}
            transition={{ delay: 0.7 }}
            className="absolute font-mono text-xs px-3 py-1 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            {echo.message1.username} × {echo.message2.username}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
