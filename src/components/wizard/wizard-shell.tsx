"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
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
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Pinned stepper — clean, centered, Stripe-like */}
      <div className="shrink-0 border-b border-border/30 bg-card/50">
        <nav className="flex items-center justify-center px-10 py-3" aria-label="Progress">
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
                        "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-200",
                        isCompleted &&
                          "border-primary bg-primary text-primary-foreground",
                        isCurrent &&
                          "border-primary text-primary",
                        !isCompleted &&
                          !isCurrent &&
                          "border-border/60 text-muted-foreground/60",
                        isClickable &&
                          "group-hover:border-primary/80 group-hover:bg-primary/90 group-hover:text-primary-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
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
                          ? "text-foreground/80"
                          : "text-muted-foreground/60",
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
                        "mx-4 h-px w-12 transition-colors duration-300 sm:mx-8 sm:w-20",
                        isCompleted ? "bg-primary" : "bg-border/40"
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Content area — fills remaining height, each step manages its own scroll */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          className="flex flex-1 flex-col overflow-hidden"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
