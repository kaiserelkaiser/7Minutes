import { Link } from "wouter";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Grid background effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel-glow max-w-md w-full p-8 rounded-2xl flex flex-col items-center text-center z-10 border-red-500/30"
      >
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        
        <h1 className="font-display text-3xl font-bold text-white mb-2 tracking-wider">
          SIGNAL LOST
        </h1>
        
        <p className="text-white/60 font-mono text-sm mb-8 leading-relaxed">
          The requested frequency does not exist or the rift has already collapsed into the ether.
        </p>

        <Link 
          href="/" 
          className="font-mono text-xs text-white bg-white/5 border border-white/10 hover:border-accent-cyan hover:bg-accent-cyan/10 px-6 py-3 rounded-lg transition-all tracking-widest uppercase inline-block"
        >
          Return to Hub
        </Link>
      </motion.div>
    </div>
  );
}
