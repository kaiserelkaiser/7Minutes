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
      className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-[min(92vw,44rem)] -translate-x-1/2 rounded-[42px] border border-white/10 bg-black/20 px-5 py-4 backdrop-blur-xl"
      style={{ boxShadow: `0 0 28px ${tone}22` }}
    >
      <div className="flex items-center justify-between gap-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.48em]" style={{ color: tone }}>
            platform pulse
          </div>
          <div className="mt-2 text-sm text-white/78">
            {isHealthy
              ? `${roomCount} active organisms detected`
              : isDegraded
                ? errorMessage ?? "The room field is unstable right now."
                : isLoading
                  ? "Measuring the network membrane..."
                  : "The organism has not confirmed a heartbeat yet."}
          </div>
        </div>

        <div className="text-right text-[10px] uppercase tracking-[0.38em] text-white/34">
          <div>{runtime.mode === "split-host" ? "split-host" : "same-origin"}</div>
          <div className="mt-2">{runtime.source}</div>
        </div>
      </div>
    </motion.div>
  );
}
