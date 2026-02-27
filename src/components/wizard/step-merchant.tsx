"use client";

import {
  Building2,
  ShieldCheck,
  ShieldAlert,
  Globe,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CaseType, BranchMode, MerchantInfo } from "@/lib/types";

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
    description: "Standard merchant onboarding with regular documents",
    icon: ShieldCheck,
    color: "emerald",
  },
  {
    value: "high-risk",
    label: "High Risk",
    description: "Additional bank statements, ECDD, PEP & sanction docs",
    icon: ShieldAlert,
    color: "amber",
  },
  {
    value: "ecom",
    label: "E-Commerce",
    description: "Standard docs + ECOM template & sanction undertaking",
    icon: Globe,
    color: "blue",
  },
  {
    value: "branch",
    label: "Branch",
    description: "Branch location submission with or without main",
    icon: GitBranch,
    color: "violet",
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
};

export function StepMerchant({
  merchantInfo,
  onUpdate,
  onNext,
}: StepMerchantProps) {
  const canProceed =
    merchantInfo.legalName.trim() !== "" &&
    merchantInfo.caseType !== undefined &&
    (merchantInfo.caseType !== "branch" || merchantInfo.branchMode !== undefined);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Merchant Details</h2>
        <p className="mt-1 text-muted-foreground">
          Enter the merchant information and select the case type
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="legalName" className="text-sm font-medium">
            Merchant Legal Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="legalName"
            value={merchantInfo.legalName}
            onChange={(e) => onUpdate({ legalName: e.target.value })}
            placeholder="As per Trade License"
            className="h-11 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dba" className="text-sm font-medium">
            Doing Business As (DBA)
          </Label>
          <Input
            id="dba"
            value={merchantInfo.dba}
            onChange={(e) => onUpdate({ dba: e.target.value })}
            placeholder="Trading name / brand name"
            className="h-11 rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Case Type <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {caseTypes.map((ct) => {
            const selected = merchantInfo.caseType === ct.value;
            const colors = colorMap[ct.color];

            return (
              <button
                key={ct.value}
                onClick={() =>
                  onUpdate({
                    caseType: ct.value,
                    branchMode: ct.value !== "branch" ? undefined : merchantInfo.branchMode,
                  })
                }
                className={cn(
                  "flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
                  selected
                    ? `${colors.border} ${colors.bg} shadow-lg ${colors.shadow}`
                    : "border-border/50 hover:border-border hover:bg-accent/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    selected ? colors.bg : "bg-muted"
                  )}
                >
                  <ct.icon
                    className={cn(
                      "h-5 w-5",
                      selected ? colors.text : "text-muted-foreground"
                    )}
                  />
                </div>
                <div>
                  <div
                    className={cn(
                      "font-semibold",
                      selected ? colors.text : ""
                    )}
                  >
                    {ct.label}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {ct.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {merchantInfo.caseType === "branch" && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Branch Submission Type</CardTitle>
            <CardDescription>
              Is this branch being submitted with the main location or
              separately?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <button
                onClick={() => onUpdate({ branchMode: "with-main" })}
                className={cn(
                  "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all",
                  merchantInfo.branchMode === "with-main"
                    ? "border-violet-500 bg-violet-500/10 text-violet-500"
                    : "border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                With Main Location
              </button>
              <button
                onClick={() => onUpdate({ branchMode: "separate" })}
                className={cn(
                  "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all",
                  merchantInfo.branchMode === "separate"
                    ? "border-violet-500 bg-violet-500/10 text-violet-500"
                    : "border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                Separate Submission
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          disabled={!canProceed}
          onClick={onNext}
          className="group h-12 gap-2 rounded-xl px-8 font-semibold shadow-lg shadow-primary/20"
        >
          Continue to Documents
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}
