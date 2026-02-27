"use client";

import {
  FileStack,
  Clock,
  CheckCircle2,
  Send,
} from "lucide-react";
import { HeroCTA } from "@/components/dashboard/hero-cta";
import { ComingSoonCard } from "@/components/dashboard/coming-soon-card";
import { ComingSoonSection } from "@/components/dashboard/coming-soon-section";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <HeroCTA />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ComingSoonCard
          title="Total Cases"
          description="Coming Soon"
          icon={<FileStack className="h-4 w-4" />}
          value="—"
          delay={0.1}
        />
        <ComingSoonCard
          title="Pending"
          description="Coming Soon"
          icon={<Clock className="h-4 w-4" />}
          value="—"
          delay={0.15}
        />
        <ComingSoonCard
          title="Completed"
          description="Coming Soon"
          icon={<CheckCircle2 className="h-4 w-4" />}
          value="—"
          delay={0.2}
        />
        <ComingSoonCard
          title="Sent"
          description="Coming Soon"
          icon={<Send className="h-4 w-4" />}
          value="—"
          delay={0.25}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ComingSoonSection
          title="Recent Submissions"
          description="View and manage your submitted cases"
          features={[
            "Case history with search & filters",
            "Status tracking",
            "Re-download case packages",
            "Edit and resubmit incomplete cases",
          ]}
          delay={0.3}
        />
        <ComingSoonSection
          title="Processing Queue"
          description="Track cases through the processing pipeline"
          features={[
            "Real-time status updates",
            "Discrepancy notifications",
            "Direct messaging with processors",
            "MID creation tracking",
          ]}
          delay={0.35}
        />
      </div>
    </div>
  );
}
