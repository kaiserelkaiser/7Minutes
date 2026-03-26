import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { RiftMessage } from '@/hooks/use-socket';
import { getOrbPosition } from '@/lib/utils';
import { parseMessageContent } from './CodeBlock';

function getDecayStyles(stage: number, sentiment: string, userColor: string) {
  switch (stage) {
    case 0:
      return {
        opacity: 1,
        filter: 'none',
        textShadow: sentiment === 'positive' ? `0 0 8px ${userColor}60` : 'none',
      };
    case 1:
      return {
        opacity: 0.85,
        filter: 'blur(0.3px)',
        textShadow: `0 0 4px ${userColor}40`,
      };
    case 2:
      return {
        opacity: 0.65,
        filter: 'blur(0.8px) saturate(0.6)',
        textShadow: `0 0 8px ${userColor}60`,
        letterSpacing: '0.03em',
      };
    case 3:
      return {
        opacity: 0.35,
        filter: 'blur(1.5px) saturate(0.2)',
        textShadow: `0 0 12px ${userColor}80`,
        letterSpacing: '0.06em',
        wordSpacing: '0.1em',
      };
    case 4:
      return {
        opacity: 0.12,
        filter: 'blur(3px) saturate(0)',
        textShadow: `0 0 20px ${userColor}`,
        letterSpacing: '0.15em',
        wordSpacing: '0.3em',
      };
    default:
      return { opacity: 1 };
  }
}

export function MessageOrb({ message, isChaos = false }: { message: RiftMessage; isChaos?: boolean }) {
  const { x, speedOffset } = useMemo(() => getOrbPosition(message.id), [message.id]);
  const color = message.userColor;
  const particlesVisible = message.decayStage >= 2;

  const decayStyle = getDecayStyles(message.decayStage, message.sentiment, color);

  const driftAmplitude = isChaos ? 80 : 40;
  const riseDuration = isChaos ? 12 + speedOffset * 0.5 : 20 + speedOffset;

  const borderGlow = message.sentiment === 'positive'
    ? `${color}60`
    : message.sentiment === 'negative'
    ? `${color}20`
    : `${color}40`;

  const negativeShift = message.sentiment === 'negative' ? {
    filter: `${decayStyle.filter} hue-rotate(-30deg) saturate(0.4)`,
  } : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 80, scale: 0.85 }}
      animate={{
        opacity: decayStyle.opacity,
        y: -window.innerHeight * 0.9,
        scale: message.decayStage >= 3 ? [1, 0.97, 1] : 1,
        x: [
          0,
          Math.sin(speedOffset) * driftAmplitude,
          Math.cos(speedOffset * 1.3) * -driftAmplitude * 0.7,
          Math.sin(speedOffset * 0.7) * driftAmplitude * 0.5,
          0,
        ],
      }}
      exit={{ opacity: 0, scale: 0.3, filter: 'blur(20px)', y: -50 }}
      transition={{
        duration: riseDuration,
        ease: 'linear',
        opacity: { duration: 0.6 },
      }}
      className="absolute bottom-0 w-[260px] sm:w-[360px] -translate-x-1/2 pointer-events-none"
      style={{ left: `${x}%` }}
    >
      {/* burst word particles for burst messages */}
      {message.isBurst && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="absolute -top-6 left-0 right-0 flex flex-wrap gap-1 justify-center"
        >
          {message.content.split(' ').slice(0, 5).map((word, i) => (
            <motion.span
              key={i}
              initial={{ y: 0, opacity: 1, x: 0 }}
              animate={{ y: -30 - i * 8, opacity: 0, x: (i % 2 === 0 ? 1 : -1) * i * 12 }}
              transition={{ delay: i * 0.08, duration: 0.8 }}
              className="font-mono text-[10px] font-bold"
              style={{ color }}
            >
              {word}
            </motion.span>
          ))}
        </motion.div>
      )}

      {/* decay particle wisps for stage 3+ */}
      {particlesVisible && message.decayStage >= 3 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                x: (Math.random() - 0.5) * 80,
                y: -20 - Math.random() * 40,
                opacity: [0.6, 0],
                scale: [1, 0],
              }}
              transition={{ duration: 1 + Math.random(), repeat: Infinity, delay: i * 0.3 }}
              className="absolute w-1 h-1 rounded-full"
              style={{
                backgroundColor: color,
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                boxShadow: `0 0 4px ${color}`,
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="glass-panel rounded-2xl p-4 relative overflow-hidden"
        animate={{
          borderColor: message.decayStage >= 2 ? [`${color}30`, `${color}10`, `${color}30`] : borderGlow,
          boxShadow: message.decayStage >= 3
            ? [`0 0 20px ${color}10`]
            : [`0 8px 32px -8px ${color}30, inset 0 0 16px ${color}08`],
        }}
        transition={{ duration: 2, repeat: message.decayStage >= 2 ? Infinity : 0 }}
        style={{
          ...negativeShift,
          filter: decayStyle.filter,
        }}
      >
        {/* glow blob bg */}
        <div
          className="absolute -inset-4 opacity-10 blur-2xl rounded-full transition-opacity duration-2000"
          style={{
            backgroundColor: color,
            opacity: Math.max(0, 0.15 - message.decayStage * 0.03),
          }}
        />

        {/* burst aura */}
        {message.isBurst && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 rounded-2xl border-2"
            style={{ borderColor: color }}
          />
        )}

        <div className="relative z-10" style={{ ...decayStyle, filter: undefined }}>
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              animate={{ opacity: message.decayStage >= 3 ? [1, 0.3, 1] : 1 }}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{
                backgroundColor: color,
                boxShadow: `0 0 ${message.decayStage >= 2 ? '4px' : '8px'} ${color}`,
              }}
            />
            <span
              className="font-mono text-xs tracking-wider"
              style={{ color, opacity: 0.7 + (1 - message.decayStage * 0.15) * 0.3 }}
            >
              {message.username}
            </span>
            {message.isBurst && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>
                BURST
              </span>
            )}
            {message.sentiment === 'positive' && message.decayStage === 0 && (
              <span className="text-[9px] text-white/30">✦</span>
            )}
          </div>

          <div
            className="text-sm text-gray-100 font-light leading-relaxed"
            style={{
              opacity: decayStyle.opacity,
              filter: decayStyle.filter,
              textShadow: decayStyle.textShadow as string,
              letterSpacing: decayStyle.letterSpacing as string,
            }}
          >
            {parseMessageContent(message.content, color)}
          </div>

          {/* stage labels */}
          {message.decayStage === 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mt-1 font-mono text-[9px] text-white/20 tracking-widest text-right"
            >
              dissolving...
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
