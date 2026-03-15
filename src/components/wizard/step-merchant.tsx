"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  FilePlus2,
  MapPin,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CaseType, MerchantInfo } from "@/lib/types";
import { LAYOUT } from "@/lib/layout";

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
    label: "Low Risk (POS)",
    description: "Standard onboarding",
    icon: ShieldCheck,
    color: "var(--case-low-risk)",
  },
  {
    value: "high-risk",
    label: "High Risk (POS)",
    description: "Enhanced due diligence",
    icon: ShieldAlert,
    color: "var(--case-high-risk)",
  },
  {
    value: "additional-mid",
    label: "Additional MID",
    description: "Additional merchant ID",
    icon: FilePlus2,
    color: "var(--case-add-mid)",
  },
  {
    value: "new-location",
    label: "New Location",
    description: "New branch for existing merchant",
    icon: MapPin,
    color: "var(--case-new-location)",
  },
  {
    value: "einvoice",
    label: "E-Invoice",
    description: "E-Invoice / payment link",
    icon: Globe,
    color: "var(--case-einvoice)",
  },
  {
    value: "payment-gateway",
    label: "Payment Gateway",
    description: "Payment gateway integration",
    icon: CreditCard,
    color: "var(--case-payment-gateway)",
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
    (merchantInfo.caseType !== "new-location" || merchantInfo.existingMid.trim() !== "");

  const handleNext = () => {
    if (!canProceed) {
      setAttempted(true);
      return;
    }
    onNext();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`${LAYOUT.pageNarrow} space-y-8`}>
            {/* Page header */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">Step 1</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Merchant Information</h2>
              <p className="mt-1 text-sm text-muted-foreground">Enter the merchant&apos;s basic details</p>
            </div>

            {/* Form card */}
            <div className="rounded-xl border border-border/40 bg-card p-6 shadow-[0_1px_3px_rgba(50,50,93,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.25)] space-y-6">
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
                          "relative flex flex-col items-center gap-2.5 rounded-xl border-2 p-5 text-center cursor-pointer transition-all duration-200",
                          selected
                            ? "shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.15)]"
                            : "border-border/40 hover:border-border/60"
                        )}
                        style={selected ? {
                          borderColor: ct.color,
                          backgroundColor: `color-mix(in oklch, ${ct.color} 6%, transparent)`,
                        } : undefined}
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: selected
                              ? `color-mix(in oklch, ${ct.color} 14%, transparent)`
                              : undefined,
                          }}
                        >
                          <ct.icon
                            className={cn("h-6 w-6", !selected && "text-muted-foreground")}
                            style={selected ? { color: ct.color } : undefined}
                          />
                        </div>
                        <div>
                          <div
                            className={cn("text-sm font-medium", !selected && "text-foreground")}
                            style={selected ? { color: ct.color } : undefined}
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

              {/* Conditional: New Location existing MID */}
              {merchantInfo.caseType === "new-location" && (
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

            {/* CTA — standardized */}
            <Button
              size="lg"
              onClick={handleNext}
              className="group h-12 w-full gap-2.5 rounded-xl text-[15px] font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
            >
              Continue to Documents
              <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
      </div>
    </div>
  );
}
