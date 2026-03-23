import { Hr, Link, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout, heading, subheading, paragraph, buttonStyle, card, label, value, divider } from "./layout";

interface WeeklySummaryProps {
  weekLabel: string;
  totalCases: number;
  submitted: number;
  approved: number;
  returned: number;
  escalated: number;
  avgReadiness: number;
  topPerformer?: string;
  expiringDocs: number;
  analyticsUrl: string;
}

export function WeeklySummaryEmail({
  weekLabel = "Week of 10 Mar — 16 Mar 2026",
  totalCases = 18,
  submitted = 6,
  approved = 4,
  returned = 1,
  escalated = 1,
  avgReadiness = 82,
  topPerformer = "Sarah Ahmed",
  expiringDocs = 3,
  analyticsUrl = "http://localhost:3000/analytics",
}: WeeklySummaryProps) {
  return (
    <EmailLayout preview={`Weekly summary: ${submitted} submitted, ${approved} approved`}>
      <Text style={heading}>Weekly Summary</Text>
      <Text style={subheading}>{weekLabel}</Text>

      {/* KPI Grid */}
      <table cellPadding="0" cellSpacing="0" width="100%" style={{ marginBottom: "24px" }}>
        <tr>
          <td style={{ padding: "0 4px 8px 0", width: "50%" }}>
            <Section style={{ ...card, textAlign: "center" as const, marginBottom: "0" }}>
              <Text style={{ fontSize: "28px", fontWeight: "700", color: "#4f46e5", margin: "0", lineHeight: "1.2" }}>{submitted}</Text>
              <Text style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Submitted</Text>
            </Section>
          </td>
          <td style={{ padding: "0 0 8px 4px", width: "50%" }}>
            <Section style={{ ...card, textAlign: "center" as const, marginBottom: "0" }}>
              <Text style={{ fontSize: "28px", fontWeight: "700", color: "#059669", margin: "0", lineHeight: "1.2" }}>{approved}</Text>
              <Text style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Approved</Text>
            </Section>
          </td>
        </tr>
        <tr>
          <td style={{ padding: "0 4px 0 0", width: "50%" }}>
            <Section style={{ ...card, textAlign: "center" as const, marginBottom: "0" }}>
              <Text style={{ fontSize: "28px", fontWeight: "700", color: "#dc2626", margin: "0", lineHeight: "1.2" }}>{returned}</Text>
              <Text style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Returned</Text>
            </Section>
          </td>
          <td style={{ padding: "0 0 0 4px", width: "50%" }}>
            <Section style={{ ...card, textAlign: "center" as const, marginBottom: "0" }}>
              <Text style={{ fontSize: "28px", fontWeight: "700", color: "#ea580c", margin: "0", lineHeight: "1.2" }}>{escalated}</Text>
              <Text style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Escalated</Text>
            </Section>
          </td>
        </tr>
      </table>

      {/* Additional metrics */}
      <Section style={card}>
        <table cellPadding="0" cellSpacing="0" width="100%">
          <tr>
            <td style={{ paddingBottom: "8px" }}>
              <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0" }}>Total Cases</Text>
            </td>
            <td style={{ paddingBottom: "8px", textAlign: "right" as const }}>
              <Text style={{ fontSize: "13px", fontWeight: "600", color: "#111827", margin: "0" }}>{totalCases}</Text>
            </td>
          </tr>
          <tr>
            <td style={{ paddingBottom: "8px" }}>
              <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0" }}>Avg Readiness</Text>
            </td>
            <td style={{ paddingBottom: "8px", textAlign: "right" as const }}>
              <Text style={{ fontSize: "13px", fontWeight: "600", color: avgReadiness >= 80 ? "#059669" : "#d97706", margin: "0" }}>{avgReadiness}/100</Text>
            </td>
          </tr>
          {topPerformer && (
            <tr>
              <td style={{ paddingBottom: "8px" }}>
                <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0" }}>Top Performer</Text>
              </td>
              <td style={{ paddingBottom: "8px", textAlign: "right" as const }}>
                <Text style={{ fontSize: "13px", fontWeight: "600", color: "#111827", margin: "0" }}>{topPerformer}</Text>
              </td>
            </tr>
          )}
          {expiringDocs > 0 && (
            <tr>
              <td>
                <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0" }}>Expiring Documents</Text>
              </td>
              <td style={{ textAlign: "right" as const }}>
                <Text style={{ fontSize: "13px", fontWeight: "600", color: "#dc2626", margin: "0" }}>{expiringDocs}</Text>
              </td>
            </tr>
          )}
        </table>
      </Section>

      <Hr style={divider} />

      <table cellPadding="0" cellSpacing="0" width="100%">
        <tr>
          <td style={{ textAlign: "center" as const }}>
            <Link href={analyticsUrl} style={buttonStyle}>
              View Full Analytics
            </Link>
          </td>
        </tr>
      </table>
    </EmailLayout>
  );
}

export default WeeklySummaryEmail;
