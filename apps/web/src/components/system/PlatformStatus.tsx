import { motion } from "framer-motion";
import type { RuntimeConfig } from "@/lib/runtime-config";

type PlatformStatusProps = {
  runtime: RuntimeConfig;
  roomCount: number;
  isLoading: boolean;
  isHealthy: boolean;
  isDegraded: boolean;
  errorMessage: string | null;
};

export function PlatformStatus({
  runtime,
  roomCount,
  isLoading,
  isHealthy,
  isDegraded,
  errorMessage,
}: PlatformStatusProps) {
  const tone = isHealthy
    ? "#00f5ff"
    : isDegraded
      ? "#ff6b6b"
      : "rgba(255,255,255,0.55)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="organism-node organism-node--quiet pointer-events-none z-20 w-full px-4 py-3 sm:px-5 sm:py-4"
      style={{ boxShadow: `0 0 28px ${tone}22, var(--surface-shadow)` }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.42em] sm:text-[10px]" style={{ color: tone }}>
            platform pulse
          </div>
          <div className="mt-2 text-xs leading-5 text-white/78 sm:text-sm sm:leading-6">
            {isHealthy
              ? `${roomCount} active organisms detected`
              : isDegraded
                ? errorMessage ?? "The room field is unstable right now."
                : isLoading
                  ? "Measuring the network membrane..."
                  : "The organism has not confirmed a heartbeat yet."}
          </div>
        </div>

        <div className="text-right text-[9px] uppercase tracking-[0.3em] text-white/34 sm:text-[10px] sm:tracking-[0.38em]">
          <div>{runtime.mode === "split-host" ? "split-host" : "same-origin"}</div>
          <div className="mt-2">{runtime.source}</div>
        </div>
      </div>
    </motion.div>
  );
}
