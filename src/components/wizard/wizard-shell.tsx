"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  FileCheck,
  PackageCheck,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardShellProps {
  currentStep: number;
  children: React.ReactNode;
}

const steps = [
  { label: "Merchant Info", icon: Building2 },
  { label: "Documents", icon: FileCheck },
  { label: "Review & Export", icon: PackageCheck },
];

export function WizardShell({ currentStep, children }: WizardShellProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-0">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5 md:gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all duration-300 md:h-10 md:w-10 md:rounded-xl",
                      isCompleted &&
                        "border-emerald-500 bg-emerald-500 text-white",
                      isCurrent &&
                        "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                      !isCompleted &&
                        !isCurrent &&
                        "border-border/50 text-muted-foreground/40"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    ) : (
                      <step.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-colors md:text-xs",
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
                      "mx-2 mb-6 h-[2px] w-8 rounded-full transition-colors duration-300 md:mx-4 md:w-24",
                      isCompleted ? "bg-emerald-500" : "bg-border/50"
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
