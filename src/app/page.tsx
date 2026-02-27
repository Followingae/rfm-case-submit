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
    <div className="space-y-8">
      <HeroCTA />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <ComingSoonCard
          title="Total Cases"
          description="Coming Soon"
          icon={<FileStack className="h-5 w-5" />}
          value="—"
          delay={0.1}
        />
        <ComingSoonCard
          title="Pending Review"
          description="Coming Soon"
          icon={<Clock className="h-5 w-5" />}
          value="—"
          delay={0.15}
        />
        <ComingSoonCard
          title="Completed"
          description="Coming Soon"
          icon={<CheckCircle2 className="h-5 w-5" />}
          value="—"
          delay={0.2}
        />
        <ComingSoonCard
          title="Sent to Processing"
          description="Coming Soon"
          icon={<Send className="h-5 w-5" />}
          value="—"
          delay={0.25}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ComingSoonSection
          title="Recent Submissions"
          description="View and manage your submitted cases"
          features={[
            "Case history with search & filters",
            "Status tracking (Pending, Approved, Rejected)",
            "Re-download case packages",
            "Edit and resubmit incomplete cases",
          ]}
          delay={0.3}
        />
        <ComingSoonSection
          title="Processing Queue"
          description="Track cases through the processing pipeline"
          features={[
            "Real-time status from processing team",
            "Discrepancy notifications",
            "Direct messaging with processors",
            "MID creation tracking",
          ]}
          delay={0.35}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ComingSoonSection
          title="Inbox & Responses"
          description="Receive feedback from the processing team"
          features={[
            "Discrepancy alerts & required actions",
            "Document re-upload requests",
            "Approval notifications",
            "Communication thread per case",
          ]}
          delay={0.4}
        />
        <ComingSoonSection
          title="Analytics & Reports"
          description="Insights into your submission performance"
          features={[
            "Submission volume over time",
            "Common discrepancy patterns",
            "Average processing time",
            "Completion rate by case type",
          ]}
          delay={0.45}
        />
      </div>
    </div>
  );
}
