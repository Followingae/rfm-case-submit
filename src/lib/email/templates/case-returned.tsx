import { Hr, Link, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout, heading, subheading, paragraph, buttonStyle, card, label, value, badge, divider } from "./layout";

interface ReturnItem {
  documentName: string;
  category: string;
  feedback: string;
}

interface CaseReturnedProps {
  merchantName: string;
  returnNumber: number;
  returnedBy: string;
  items: ReturnItem[];
  generalNote?: string;
  caseUrl: string;
}

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  missing: { color: "#dc2626", bg: "#fef2f2" },
  unclear: { color: "#d97706", bg: "#fffbeb" },
  expired: { color: "#dc2626", bg: "#fef2f2" },
  incorrect: { color: "#ea580c", bg: "#fff7ed" },
  low_quality: { color: "#d97706", bg: "#fffbeb" },
  additional: { color: "#2563eb", bg: "#eff6ff" },
  general: { color: "#6b7280", bg: "#f3f4f6" },
};

const CATEGORY_LABELS: Record<string, string> = {
  missing: "Missing", unclear: "Unclear", expired: "Expired",
  incorrect: "Incorrect", low_quality: "Low Quality", additional: "Additional", general: "General",
};

export function CaseReturnedEmail({
  merchantName = "Skyline Fashion Boutique LLC",
  returnNumber = 1,
  returnedBy = "Khalid Noor",
  items = [
    { documentName: "Trade License", category: "expired", feedback: "TL expired Jan 2025, please upload renewed copy" },
    { documentName: "Bank Statement", category: "missing", feedback: "3-month bank statement required" },
  ],
  generalNote = "",
  caseUrl = "http://localhost:3000/cases/123",
}: CaseReturnedProps) {
  return (
    <EmailLayout preview={`Case returned: ${merchantName} — ${items.length} issue${items.length !== 1 ? "s" : ""}`}>
      <Text style={heading}>Case Returned</Text>
      <Text style={subheading}>
        Your case has been returned with {items.length} item{items.length !== 1 ? "s" : ""} to address.
        {returnNumber > 1 && ` This is return #${returnNumber}.`}
      </Text>

      <Section style={card}>
        <table cellPadding="0" cellSpacing="0" width="100%">
          <tr>
            <td>
              <Text style={label}>Merchant</Text>
              <Text style={{ ...value, fontSize: "16px" }}>{merchantName}</Text>
            </td>
            <td style={{ textAlign: "right" as const }}>
              <Text style={label}>Returned By</Text>
              <Text style={value}>{returnedBy}</Text>
            </td>
          </tr>
        </table>
      </Section>

      {/* Issues list */}
      <Text style={{ ...label, marginBottom: "12px" }}>Issues to Resolve</Text>
      {items.map((item, i) => {
        const cc = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general;
        return (
          <Section key={i} style={{ marginBottom: "8px", padding: "16px", borderRadius: "8px", border: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
            <table cellPadding="0" cellSpacing="0" width="100%">
              <tr>
                <td>
                  <Text style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: "0 0 4px" }}>
                    {item.documentName}
                  </Text>
                </td>
                <td style={{ textAlign: "right" as const }}>
                  <Text style={badge(cc.color, cc.bg)}>
                    {CATEGORY_LABELS[item.category] || item.category}
                  </Text>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <Text style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0", lineHeight: "20px" }}>
                    {item.feedback}
                  </Text>
                </td>
              </tr>
            </table>
          </Section>
        );
      })}

      {generalNote && (
        <>
          <Text style={{ ...label, marginTop: "16px", marginBottom: "8px" }}>General Feedback</Text>
          <Text style={{ ...paragraph, fontStyle: "italic" }}>{generalNote}</Text>
        </>
      )}

      <Hr style={divider} />

      <Link href={caseUrl} style={{ ...buttonStyle, backgroundColor: "#dc2626" }}>
        Fix & Resubmit
      </Link>
    </EmailLayout>
  );
}

export default CaseReturnedEmail;
