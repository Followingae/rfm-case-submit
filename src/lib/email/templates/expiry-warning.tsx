import { Hr, Link, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout, heading, subheading, paragraph, buttonStyle, card, label, value, badge, divider } from "./layout";

interface ExpiryItem {
  merchantName: string;
  documentType: string;
  expiryDate: string;
  daysRemaining: number;
}

interface ExpiryWarningProps {
  items: ExpiryItem[];
  expiryUrl: string;
}

export function ExpiryWarningEmail({
  items = [
    { merchantName: "Al Baraka Trading LLC", documentType: "Trade License", expiryDate: "14/01/2025", daysRemaining: -60 },
    { merchantName: "Noor Pharmacy", documentType: "Passport", expiryDate: "20/04/2026", daysRemaining: 28 },
  ],
  expiryUrl = "http://localhost:3000/expiries",
}: ExpiryWarningProps) {
  const critical = items.filter((i) => i.daysRemaining <= 0);
  const urgent = items.filter((i) => i.daysRemaining > 0 && i.daysRemaining <= 30);
  const upcoming = items.filter((i) => i.daysRemaining > 30);

  return (
    <EmailLayout preview={`${items.length} document${items.length !== 1 ? "s" : ""} expiring — action required`}>
      <Text style={heading}>Document Expiry Alert</Text>
      <Text style={subheading}>
        {items.length} document{items.length !== 1 ? "s" : ""} need{items.length === 1 ? "s" : ""} your attention.
      </Text>

      {critical.length > 0 && (
        <>
          <Text style={{ ...label, color: "#dc2626", marginBottom: "8px" }}>
            Expired ({critical.length})
          </Text>
          {critical.map((item, i) => (
            <Section key={i} style={{ ...card, borderColor: "#fecaca", backgroundColor: "#fef2f2" }}>
              <table cellPadding="0" cellSpacing="0" width="100%">
                <tr>
                  <td>
                    <Text style={{ ...value, fontSize: "14px" }}>{item.merchantName}</Text>
                    <Text style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>{item.documentType}</Text>
                  </td>
                  <td style={{ textAlign: "right" as const }}>
                    <Text style={badge("#dc2626", "#fef2f2")}>
                      Expired {Math.abs(item.daysRemaining)}d ago
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>
          ))}
        </>
      )}

      {urgent.length > 0 && (
        <>
          <Text style={{ ...label, color: "#d97706", marginBottom: "8px", marginTop: "16px" }}>
            Expiring within 30 days ({urgent.length})
          </Text>
          {urgent.map((item, i) => (
            <Section key={i} style={{ ...card, borderColor: "#fde68a", backgroundColor: "#fffbeb" }}>
              <table cellPadding="0" cellSpacing="0" width="100%">
                <tr>
                  <td>
                    <Text style={{ ...value, fontSize: "14px" }}>{item.merchantName}</Text>
                    <Text style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>{item.documentType}</Text>
                  </td>
                  <td style={{ textAlign: "right" as const }}>
                    <Text style={badge("#d97706", "#fffbeb")}>
                      {item.daysRemaining}d left
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>
          ))}
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <Text style={{ ...label, marginBottom: "8px", marginTop: "16px" }}>
            Upcoming ({upcoming.length})
          </Text>
          {upcoming.map((item, i) => (
            <Section key={i} style={card}>
              <table cellPadding="0" cellSpacing="0" width="100%">
                <tr>
                  <td>
                    <Text style={{ ...value, fontSize: "14px" }}>{item.merchantName}</Text>
                    <Text style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>{item.documentType}</Text>
                  </td>
                  <td style={{ textAlign: "right" as const }}>
                    <Text style={{ fontSize: "12px", color: "#6b7280", margin: "0" }}>{item.daysRemaining}d</Text>
                  </td>
                </tr>
              </table>
            </Section>
          ))}
        </>
      )}

      <Hr style={divider} />

      <Link href={expiryUrl} style={buttonStyle}>
        View All Expiries
      </Link>
    </EmailLayout>
  );
}

export default ExpiryWarningEmail;
