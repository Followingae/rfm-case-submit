"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardShellProps {
  currentStep: number;
  children: React.ReactNode;
  onStepClick?: (step: number) => void;
}

const steps = [
  { label: "Merchant Info", number: 1 },
  { label: "Documents", number: 2 },
  { label: "Review & Export", number: 3 },
];

export function WizardShell({ currentStep, children, onStepClick }: WizardShellProps) {
  return (
    <div className="space-y-8">
      {/* AI badge + Stripe-style horizontal stepper */}
      <nav className="flex items-center justify-center gap-4" aria-label="Progress">
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 border border-violet-500/15">
          <Sparkles className="h-3 w-3" />
          AI-Powered
        </span>
        <ol className="flex items-center gap-0" role="list">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isClickable = isCompleted && !!onStepClick;

            return (
              <li
                key={step.label}
                className="flex items-center"
                role="listitem"
                {...(isCurrent ? { "aria-current": "step" as const } : {})}
              >
                <div
                  className={cn(
                    "flex items-center gap-2.5",
                    isClickable && "cursor-pointer group"
                  )}
                  onClick={isClickable ? () => onStepClick(index) : undefined}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={
                    isClickable
                      ? (e: React.KeyboardEvent) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onStepClick(index);
                          }
                        }
                      : undefined
                  }
                >
                  {/* Step circle */}
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-200",
                      isCompleted &&
                        "border-primary bg-primary text-primary-foreground",
                      isCurrent &&
                        "border-primary text-primary",
                      !isCompleted &&
                        !isCurrent &&
                        "border-border text-muted-foreground",
                      isClickable &&
                        "group-hover:border-primary/80 group-hover:bg-primary/90 group-hover:text-primary-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    ) : (
                      step.number
                    )}
                  </div>

                  {/* Step label */}
                  <span
                    className={cn(
                      "text-sm transition-colors",
                      isCurrent
                        ? "text-foreground font-medium"
                        : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground",
                      !isCurrent && "hidden sm:inline"
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-4 h-px w-12 transition-colors duration-300 sm:mx-6 sm:w-16",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

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
