"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  FolderArchive,
  ArrowRight,
  Loader2,
  RotateCcw,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChecklistItem, MerchantInfo, ShareholderKYC } from "@/lib/types";
import { generateRenameMappings, createCaseZip } from "@/lib/file-utils";
import { validateCase, ValidationWarning } from "@/lib/validation";
import { useRouter } from "next/navigation";

interface StepReviewProps {
  merchantInfo: MerchantInfo;
  items: ChecklistItem[];
  conditionals: Record<string, boolean>;
  fileStore: Map<string, File[]>;
  shareholders: ShareholderKYC[];
  onPrev: () => void;
}

export function StepReview({
  merchantInfo,
  items,
  conditionals,
  fileStore,
  shareholders,
  onPrev,
}: StepReviewProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const warnings = useMemo(
    () => validateCase(merchantInfo, items, conditionals, shareholders),
    [merchantInfo, items, conditionals, shareholders]
  );

  const renameMappings = useMemo(
    () => generateRenameMappings(merchantInfo, items, fileStore, shareholders),
    [merchantInfo, items, fileStore, shareholders]
  );

  const majorWarnings = warnings.filter((w) => w.type === "major");
  const minorWarnings = warnings.filter((w) => w.type === "minor");
  const uploadedItems = items.filter((i) => i.status === "uploaded");
  const requiredItems = items.filter(
    (i) => i.required || (i.conditionalKey && conditionals[i.conditionalKey!])
  );
  const missingRequired = requiredItems.filter(
    (i) => i.status === "missing"
  );

  const totalKycDocs = shareholders.reduce(
    (acc, s) => acc + s.passportFiles.length + s.eidFiles.length,
    0
  );

  const isComplete = missingRequired.length === 0 && shareholders.every(
    (s) => s.passportFiles.length > 0 && s.eidFiles.length > 0 && s.name.trim()
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await createCaseZip(merchantInfo, items, fileStore, shareholders);
      setExported(true);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNewCase = () => {
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Review & Export</h2>
        <p className="mt-1 text-muted-foreground">
          Review the case package and download the ZIP file
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Case Summary</span>
            <Badge
              variant={isComplete ? "default" : "destructive"}
              className={cn(
                "text-xs",
                isComplete && "bg-emerald-500 hover:bg-emerald-600"
              )}
            >
              {isComplete ? "Complete" : "Incomplete"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Legal Name</span>
              <p className="font-medium">{merchantInfo.legalName || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">DBA</span>
              <p className="font-medium">{merchantInfo.dba || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Case Type</span>
              <p className="font-medium capitalize">
                {merchantInfo.caseType.replace("-", " ")}
                {merchantInfo.branchMode &&
                  ` (${merchantInfo.branchMode.replace("-", " ")})`}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Documents</span>
              <p className="font-medium">
                {uploadedItems.length} uploaded / {requiredItems.length} required
              </p>
            </div>
          </div>

          {/* Shareholder KYC summary */}
          {shareholders.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium">
                  Shareholder KYC ({shareholders.length} partner{shareholders.length !== 1 ? "s" : ""}, {totalKycDocs} doc{totalKycDocs !== 1 ? "s" : ""})
                </p>
                <div className="space-y-1.5">
                  {shareholders.map((sh, idx) => (
                    <div
                      key={sh.id}
                      className="flex items-center gap-2 rounded-lg bg-accent/30 px-3 py-1.5 text-xs"
                    >
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="flex-1 font-medium">
                        {sh.name || `Shareholder ${idx + 1}`}
                      </span>
                      <span className="text-muted-foreground">
                        {sh.percentage || "?"}%
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          sh.passportFiles.length > 0 && sh.eidFiles.length > 0
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600"
                        )}
                      >
                        {sh.passportFiles.length > 0 ? "Passport" : "No Passport"}
                        {" / "}
                        {sh.eidFiles.length > 0 ? "EID" : "No EID"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {(majorWarnings.length > 0 || minorWarnings.length > 0) && (
        <div className="space-y-3">
          {majorWarnings.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  Major Issues ({majorWarnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {majorWarnings.map((w, i) => (
                    <li key={i} className="text-sm text-destructive/80">
                      &bull; {w.message}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {minorWarnings.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-amber-500">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings ({minorWarnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {minorWarnings.map((w, i) => (
                    <li key={i} className="text-sm text-amber-500/80">
                      &bull; {w.message}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderArchive className="h-4 w-4 text-muted-foreground" />
            File Rename Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renameMappings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No files to rename.
            </p>
          ) : (
            <div className="space-y-2">
              {renameMappings.map((mapping, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-accent/30 px-3 py-2 text-xs"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-muted-foreground">
                    {mapping.originalName}
                  </span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                  <span className="flex-1 truncate font-medium text-foreground">
                    {mapping.newName}
                  </span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {mapping.folder}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="lg"
          onClick={onPrev}
          className="group h-12 gap-2 rounded-xl px-6"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back
        </Button>

        <div className="flex gap-3">
          {exported && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleNewCase}
              className="group h-12 gap-2 rounded-xl px-6"
            >
              <RotateCcw className="h-4 w-4" />
              New Case
            </Button>
          )}
          <Button
            size="lg"
            onClick={handleExport}
            disabled={isExporting || renameMappings.length === 0}
            className={cn(
              "group h-12 gap-2 rounded-xl px-8 font-semibold shadow-lg transition-all",
              exported
                ? "bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600"
                : "shadow-primary/20"
            )}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating ZIP...
              </>
            ) : exported ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Download Again
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download ZIP Package
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
