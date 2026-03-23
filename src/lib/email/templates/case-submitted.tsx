import { Hr, Link, Text, Section, Row, Column } from "@react-email/components";
import * as React from "react";
import { EmailLayout, heading, subheading, paragraph, buttonStyle, card, label, value, badge, divider } from "./layout";

interface CaseSubmittedProps {
  merchantName: string;
  caseType: string;
  readinessScore: number;
  readinessTier: string;
  submittedBy: string;
  caseUrl: string;
  documentCount: number;
}

export function CaseSubmittedEmail({
  merchantName = "Desert Rose Restaurant LLC",
  caseType = "Low Risk (POS)",
  readinessScore = 91,
  readinessTier = "green",
  submittedBy = "Sarah Ahmed",
  caseUrl = "http://localhost:3000/cases/123",
  documentCount = 12,
}: CaseSubmittedProps) {
  const tierColor = readinessTier === "green" ? "#059669" : readinessTier === "amber" ? "#d97706" : "#dc2626";
  const tierBg = readinessTier === "green" ? "#ecfdf5" : readinessTier === "amber" ? "#fffbeb" : "#fef2f2";

  return (
    <EmailLayout preview={`New case submitted: ${merchantName}`}>
      <Text style={heading}>New Case Submitted</Text>
      <Text style={subheading}>
        A new merchant case has been submitted for your review.
      </Text>

      <Section style={card}>
        <table cellPadding="0" cellSpacing="0" width="100%">
          <tr>
            <td style={{ paddingBottom: "12px" }}>
              <Text style={label}>Merchant</Text>
              <Text style={{ ...value, fontSize: "16px" }}>{merchantName}</Text>
            </td>
            <td style={{ paddingBottom: "12px", textAlign: "right" as const }}>
              <Text style={label}>Readiness</Text>
              <Text style={{ ...value, color: tierColor, fontSize: "20px" }}>{readinessScore}/100</Text>
            </td>
          </tr>
          <tr>
            <td>
              <Text style={label}>Case Type</Text>
              <Text style={value}>{caseType}</Text>
            </td>
            <td style={{ textAlign: "right" as const }}>
              <Text style={label}>Documents</Text>
              <Text style={value}>{documentCount} uploaded</Text>
            </td>
          </tr>
        </table>
      </Section>

      <table cellPadding="0" cellSpacing="0" width="100%">
        <tr>
          <td>
            <Text style={{ ...paragraph, color: "#6b7280", fontSize: "13px" }}>
              Submitted by <strong style={{ color: "#111827" }}>{submittedBy}</strong>
            </Text>
          </td>
        </tr>
      </table>

      <Hr style={divider} />

      <Link href={caseUrl} style={buttonStyle}>
        Review Case
      </Link>
    </EmailLayout>
  );
}

export default CaseSubmittedEmail;
