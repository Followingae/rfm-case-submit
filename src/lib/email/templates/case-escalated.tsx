import { Hr, Link, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout, heading, subheading, paragraph, buttonStyle, card, label, value, badge, divider } from "./layout";

interface CaseEscalatedProps {
  merchantName: string;
  caseType: string;
  escalatedBy: string;
  reason: string;
  caseUrl: string;
}

export function CaseEscalatedEmail({
  merchantName = "Arabian Gulf Exchange LLC",
  caseType = "High Risk (POS)",
  escalatedBy = "Khalid Noor",
  reason = "PEP flagged individual identified — requires management review",
  caseUrl = "http://localhost:3000/cases/123",
}: CaseEscalatedProps) {
  return (
    <EmailLayout preview={`ESCALATED: ${merchantName} — ${reason}`}>
      <Section style={{ backgroundColor: "#fff7ed", borderRadius: "8px", padding: "16px 20px", marginBottom: "24px", border: "1px solid #fed7aa" }}>
        <Text style={{ fontSize: "13px", fontWeight: "600", color: "#ea580c", margin: "0" }}>
          &#9888; Escalation Notice
        </Text>
      </Section>

      <Text style={heading}>Case Escalated</Text>
      <Text style={subheading}>
        A case has been escalated and requires management attention.
      </Text>

      <Section style={card}>
        <table cellPadding="0" cellSpacing="0" width="100%">
          <tr>
            <td style={{ paddingBottom: "12px" }}>
              <Text style={label}>Merchant</Text>
              <Text style={{ ...value, fontSize: "16px" }}>{merchantName}</Text>
            </td>
            <td style={{ paddingBottom: "12px", textAlign: "right" as const }}>
              <Text style={label}>Case Type</Text>
              <Text style={value}>{caseType}</Text>
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              <Text style={label}>Escalated By</Text>
              <Text style={value}>{escalatedBy}</Text>
            </td>
          </tr>
        </table>
      </Section>

      <Text style={{ ...label, marginBottom: "8px" }}>Reason</Text>
      <Section style={{ padding: "16px", borderRadius: "8px", border: "1px solid #fed7aa", backgroundColor: "#fffbf5", marginBottom: "24px" }}>
        <Text style={{ ...paragraph, margin: "0" }}>{reason}</Text>
      </Section>

      <Hr style={divider} />

      <Link href={caseUrl} style={{ ...buttonStyle, backgroundColor: "#ea580c" }}>
        Review Escalation
      </Link>
    </EmailLayout>
  );
}

export default CaseEscalatedEmail;
