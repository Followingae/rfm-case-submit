"use client"

import { motion } from "framer-motion"
import React, { useMemo } from "react"
import { cn } from "@/lib/utils"

export interface BoxesProps {
  className?: string
  rows?: number
  cols?: number
}

const colors = [
  "rgba(180, 80, 80, 1)",
  "rgba(160, 60, 60, 1)",
  "rgba(140, 50, 50, 1)",
  "rgba(200, 100, 90, 1)",
  "rgba(170, 70, 70, 1)",
  "rgba(190, 90, 80, 1)",
  "rgba(150, 55, 55, 1)",
  "rgba(210, 120, 100, 1)",
  "rgba(130, 45, 45, 1)",
]

const TRANSPARENT = "rgba(0, 0, 0, 0)"

const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)]

// Static cell — no auto animation, only hover
const StaticBoxCell = React.memo(({ showPlus }: { showPlus: boolean }) => (
  <motion.div
    className="relative h-8 w-16 border-r border-t border-slate-700"
    whileHover={{
      backgroundColor: getRandomColor(),
      transition: { duration: 0 },
    }}
    transition={{ duration: 2 }}
  >
    {showPlus && <PlusSvg />}
  </motion.div>
))
StaticBoxCell.displayName = "StaticBoxCell"

// Animated cell — pulses on its own
function AnimatedBoxCell({ showPlus, color, duration, delay }: {
  showPlus: boolean; color: string; duration: number; delay: number;
}) {
  return (
    <motion.div
      className="relative h-8 w-16 border-r border-t border-slate-700"
      animate={{
        backgroundColor: [TRANSPARENT, color, TRANSPARENT],
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatDelay: delay,
        ease: "easeInOut",
      }}
      whileHover={{
        backgroundColor: getRandomColor(),
        transition: { duration: 0 },
      }}
    >
      {showPlus && <PlusSvg />}
    </motion.div>
  )
}

function PlusSvg() {
  return (
    <svg
      className="pointer-events-none absolute -left-[22px] -top-[14px] h-6 w-10 text-slate-700"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const BoxRow = React.memo(({ rowIndex, cols }: { rowIndex: number; cols: number }) => {
  // Pre-compute which cells auto-animate with their params
  const animatedCells = useMemo(() => {
    const map = new Map<number, { color: string; duration: number; delay: number }>();
    for (let i = 0; i < cols; i++) {
      if (Math.random() < 0.06) {
        map.set(i, {
          color: getRandomColor(),
          duration: 3 + Math.random() * 4,
          delay: Math.random() * 8,
        });
      }
    }
    return map;
  }, [cols]);

  return (
    <div className="relative h-8 w-16 border-l border-slate-700">
      {Array.from({ length: cols }).map((_, colIndex) => {
        const showPlus = rowIndex % 2 === 0 && colIndex % 2 === 0;
        const anim = animatedCells.get(colIndex);
        if (anim) {
          return (
            <AnimatedBoxCell
              key={colIndex}
              showPlus={showPlus}
              color={anim.color}
              duration={anim.duration}
              delay={anim.delay}
            />
          );
        }
        return <StaticBoxCell key={colIndex} showPlus={showPlus} />;
      })}
    </div>
  );
})

BoxRow.displayName = "BoxRow"

export const Boxes = ({ className, rows = 150, cols = 100 }: BoxesProps) => {
  const rowElements = useMemo(
    () =>
      Array.from({ length: rows }).map((_, rowIndex) => (
        <BoxRow key={rowIndex} rowIndex={rowIndex} cols={cols} />
      )),
    [rows, cols],
  )

  return (
    <div
      className={cn("pointer-events-auto absolute inset-0 z-0 flex", className)}
      style={{
        transform: "translate(-50%, -50%) skewX(-48deg) skewY(14deg) scale(0.675)",
        transformOrigin: "center center",
        top: "50%",
        left: "50%",
        width: "300vw",
        height: "300vh",
      }}
    >
      {rowElements}
    </div>
  )
}

export default function BackgroundBoxesDemo() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-900">
      <Boxes />
      <div className="pointer-events-none absolute inset-0 z-20 bg-slate-900 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
    </div>
  )
}
