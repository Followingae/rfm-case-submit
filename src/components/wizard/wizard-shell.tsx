"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardShellProps {
  currentStep: number;
  children: React.ReactNode;
}

const steps = [
  { label: "Merchant Info", number: 1 },
  { label: "Documents", number: 2 },
  { label: "Review & Export", number: 3 },
];

export function WizardShell({ currentStep, children }: WizardShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-0 rounded-full bg-muted/30 px-2 py-1.5">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step.label} className="flex items-center">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                      isCompleted &&
                        "bg-emerald-500 text-white",
                      isCurrent &&
                        "bg-primary text-primary-foreground shadow-md shadow-primary/25",
                      !isCompleted &&
                        !isCurrent &&
                        "bg-muted/50 text-muted-foreground/40"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={cn(
                      "hidden text-xs font-medium transition-colors sm:inline",
                      isCurrent
                        ? "text-foreground"
                        : isCompleted
                        ? "text-emerald-500"
                        : "text-muted-foreground/40"
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-[2px] w-6 rounded-full transition-colors duration-300 sm:mx-3 sm:w-12",
                      isCompleted ? "bg-emerald-500" : "bg-border/40"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
