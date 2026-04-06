import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  active?: boolean;
  title?: string;
}

const panelVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
};

export function GlassPanel({
  children,
  className = "",
  active = false,
  title,
}: GlassPanelProps) {
  return (
    <motion.div
      className={`glass-panel ${active ? "glass-panel-active" : ""} ${className}`}
      variants={panelVariants}
      initial="hidden"
      animate="visible"
    >
      {title && (
        <div className="px-4 pt-3 pb-2">
          <span className="label">{title}</span>
        </div>
      )}
      {children}
    </motion.div>
  );
}
