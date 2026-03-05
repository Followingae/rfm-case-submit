"use client";

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
  color: string;
}[] = [
  {
    value: "low-risk",
    label: "Low Risk",
    description: "Standard onboarding",
    icon: ShieldCheck,
    color: "emerald",
  },
  {
    value: "high-risk",
    label: "High Risk",
    description: "Enhanced due diligence",
    icon: ShieldAlert,
    color: "amber",
  },
  {
    value: "ecom",
    label: "E-Commerce",
    description: "Online / payment link",
    icon: Globe,
    color: "blue",
  },
  {
    value: "additional-mid",
    label: "Additional MID",
    description: "Additional merchant ID",
    icon: FilePlus2,
    color: "violet",
  },
  {
    value: "additional-branch",
    label: "Additional Branch",
    description: "New branch for existing merchant",
    icon: GitBranch,
    color: "teal",
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; shadow: string }> = {
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500",
    text: "text-emerald-500",
    shadow: "shadow-emerald-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500",
    text: "text-amber-500",
    shadow: "shadow-amber-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500",
    text: "text-blue-500",
    shadow: "shadow-blue-500/20",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500",
    text: "text-violet-500",
    shadow: "shadow-violet-500/20",
  },
  teal: {
    bg: "bg-teal-500/10",
    border: "border-teal-500",
    text: "text-teal-500",
    shadow: "shadow-teal-500/20",
  },
};

export function StepMerchant({
  merchantInfo,
  onUpdate,
  onNext,
}: StepMerchantProps) {
  const canProceed =
    merchantInfo.legalName.trim() !== "" &&
    merchantInfo.caseType !== undefined &&
    (merchantInfo.caseType !== "additional-branch" || merchantInfo.existingMid.trim() !== "");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-bold tracking-tight">Merchant Details</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="legalName" className="text-xs font-medium">
            Legal Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="legalName"
            value={merchantInfo.legalName}
            onChange={(e) => onUpdate({ legalName: e.target.value })}
            placeholder="As per Trade License"
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dba" className="text-xs font-medium">
            DBA (Trading Name)
          </Label>
          <Input
            id="dba"
            value={merchantInfo.dba}
            onChange={(e) => onUpdate({ dba: e.target.value })}
            placeholder="Brand / signboard name"
            className="h-10 rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">
          Case Type <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {caseTypes.map((ct) => {
            const selected = merchantInfo.caseType === ct.value;
            const colors = colorMap[ct.color];

            return (
              <button
                key={ct.value}
                onClick={() => onUpdate({ caseType: ct.value })}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all duration-200",
                  selected
                    ? `${colors.border} ${colors.bg} shadow-md ${colors.shadow}`
                    : "border-border/50 hover:border-border hover:bg-accent/50"
                )}
              >
                <ct.icon
                  className={cn(
                    "h-5 w-5",
                    selected ? colors.text : "text-muted-foreground"
                  )}
                />
                <div>
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      selected ? colors.text : ""
                    )}
                  >
                    {ct.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {ct.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {merchantInfo.caseType === "additional-branch" && (
        <div className="space-y-1.5">
          <Label htmlFor="existingMid" className="text-xs font-medium">
            Existing MID & Merchant Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="existingMid"
            value={merchantInfo.existingMid}
            onChange={(e) => onUpdate({ existingMid: e.target.value })}
            placeholder="e.g. 1234567890 – MERCHANT NAME LLC"
            className="h-10 rounded-xl"
          />
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          disabled={!canProceed}
          onClick={onNext}
          className="group h-11 gap-2 rounded-xl px-8 font-semibold shadow-lg shadow-primary/20"
        >
          Continue to Documents
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}
