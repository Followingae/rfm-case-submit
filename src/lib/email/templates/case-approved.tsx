import { Hr, Link, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout, heading, subheading, paragraph, buttonStyle, card, label, value, divider } from "./layout";

interface CaseApprovedProps {
  merchantName: string;
  caseType: string;
  approvedBy: string;
  caseUrl: string;
}

export function CaseApprovedEmail({
  merchantName = "Emirates Auto Parts Trading",
  caseType = "Low Risk (POS)",
  approvedBy = "Fatima Ali",
  caseUrl = "http://localhost:3000/cases/123",
}: CaseApprovedProps) {
  return (
    <EmailLayout preview={`Case approved: ${merchantName}`}>
      <Section style={{ textAlign: "center" as const, padding: "8px 0 24px" }}>
        <Text style={{ fontSize: "48px", margin: "0", lineHeight: "1" }}>&#10003;</Text>
      </Section>

      <Text style={{ ...heading, textAlign: "center" as const }}>Case Approved</Text>
      <Text style={{ ...subheading, textAlign: "center" as const }}>
        Your merchant case has been approved by the processing team.
      </Text>

      <Section style={card}>
        <table cellPadding="0" cellSpacing="0" width="100%">
          <tr>
            <td style={{ paddingBottom: "12px" }}>
              <Text style={label}>Merchant</Text>
              <Text style={{ ...value, fontSize: "16px" }}>{merchantName}</Text>
            </td>
          </tr>
          <tr>
            <td>
              <Text style={label}>Case Type</Text>
              <Text style={value}>{caseType}</Text>
            </td>
            <td style={{ textAlign: "right" as const }}>
              <Text style={label}>Approved By</Text>
              <Text style={value}>{approvedBy}</Text>
            </td>
          </tr>
        </table>
      </Section>

      <Hr style={divider} />

      <table cellPadding="0" cellSpacing="0" width="100%">
        <tr>
          <td style={{ textAlign: "center" as const }}>
            <Link href={caseUrl} style={buttonStyle}>
              View Case
            </Link>
          </td>
        </tr>
      </table>
    </EmailLayout>
  );
}

export default CaseApprovedEmail;
