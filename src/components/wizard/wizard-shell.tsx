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
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-all duration-300",
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
                      <Check className="h-4 w-4" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors",
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
                      "mx-4 mb-6 h-[2px] w-16 rounded-full transition-colors duration-300 md:w-24",
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
