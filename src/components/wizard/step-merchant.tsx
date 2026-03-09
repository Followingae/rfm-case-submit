"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  FilePlus2,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CaseType, MerchantInfo } from "@/lib/types";

interface StepMerchantProps {
  merchantInfo: MerchantInfo;
  onUpdate: (info: Partial<MerchantInfo>) => void;
  onNext: () => void;
}

const caseTypes: {
  value: CaseType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "low-risk",
    label: "Low Risk",
    description: "Standard onboarding",
    icon: ShieldCheck,
  },
  {
    value: "high-risk",
    label: "High Risk",
    description: "Enhanced due diligence",
    icon: ShieldAlert,
  },
  {
    value: "ecom",
    label: "E-Commerce",
    description: "Online / payment link",
    icon: Globe,
  },
  {
    value: "additional-mid",
    label: "Additional MID",
    description: "Additional merchant ID",
    icon: FilePlus2,
  },
  {
    value: "additional-branch",
    label: "Additional Branch",
    description: "New branch for existing merchant",
    icon: GitBranch,
  },
];

export function StepMerchant({
  merchantInfo,
  onUpdate,
  onNext,
}: StepMerchantProps) {
  const [attempted, setAttempted] = useState(false);

  const canProceed =
    merchantInfo.legalName.trim() !== "" &&
    merchantInfo.caseType !== undefined &&
    (merchantInfo.caseType !== "additional-branch" || merchantInfo.existingMid.trim() !== "");

  const handleNext = () => {
    if (!canProceed) {
      setAttempted(true);
      return;
    }
    onNext();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Merchant Information</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enter the merchant&apos;s basic details</p>
      </div>

      {/* Form card */}
      <div className="rounded-lg border border-border/40 bg-card p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06)] dark:shadow-none space-y-6">
        {/* Name fields */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="legalName" className="text-sm font-medium text-foreground">
              Legal Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="legalName"
              value={merchantInfo.legalName}
              onChange={(e) => onUpdate({ legalName: e.target.value })}
              placeholder="As per Trade License"
              autoFocus
              className={cn(
                "",
                attempted && merchantInfo.legalName.trim() === "" && "border-destructive"
              )}
            />
            {attempted && merchantInfo.legalName.trim() === "" ? (
              <p className="text-xs text-destructive mt-1">This field is required</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">As it appears on the Trade License</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dba" className="text-sm font-medium text-foreground">
              DBA (Trading Name) <span className="text-xs font-normal text-muted-foreground ml-1">Optional</span>
            </Label>
            <Input
              id="dba"
              value={merchantInfo.dba}
              onChange={(e) => onUpdate({ dba: e.target.value })}
              placeholder="Brand / signboard name"
              className=""
            />
            <p className="text-xs text-muted-foreground mt-1">The brand or signboard name used by the merchant</p>
          </div>
        </div>

        {/* Section divider */}
        <div className="border-t border-border/30" />

        {/* Case type */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-foreground">
              Case Type <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">Select the type of application being submitted</p>
          </div>
          {attempted && !merchantInfo.caseType && (
            <p className="text-xs text-destructive">Please select a case type</p>
          )}
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Case type"
          >
            {caseTypes.map((ct) => {
              const selected = merchantInfo.caseType === ct.value;

              return (
                <button
                  key={ct.value}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onUpdate({ caseType: ct.value })}
                  className={cn(
                    "flex flex-col items-center gap-2.5 rounded-lg border-2 p-5 text-center cursor-pointer transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border/40 hover:border-border"
                  )}
                >
                  <ct.icon
                    className={cn(
                      "h-6 w-6",
                      selected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <div
                      className={cn(
                        "text-sm font-medium",
                        selected ? "text-primary" : "text-foreground"
                      )}
                    >
                      {ct.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {ct.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conditional: Additional Branch existing MID */}
        {merchantInfo.caseType === "additional-branch" && (
          <>
            <div className="border-t border-border/30" />
            <div className="space-y-1.5">
              <Label htmlFor="existingMid" className="text-sm font-medium text-foreground">
                Existing MID & Merchant Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="existingMid"
                value={merchantInfo.existingMid}
                onChange={(e) => onUpdate({ existingMid: e.target.value })}
                placeholder="e.g. 1234567890 – MERCHANT NAME LLC"
                className={cn(
                  "",
                  attempted && merchantInfo.existingMid.trim() === "" && "border-destructive"
                )}
              />
              {attempted && merchantInfo.existingMid.trim() === "" ? (
                <p className="text-xs text-destructive mt-1">This field is required</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">The existing merchant ID and name for the parent account</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Continue button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleNext}
          className="group h-10 gap-2 rounded-lg px-8 font-medium"
        >
          Continue to Documents
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
}
