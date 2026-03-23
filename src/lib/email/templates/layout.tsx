import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0",
  maxWidth: "600px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  overflow: "hidden",
};

const header: React.CSSProperties = {
  padding: "32px 40px 24px",
  borderBottom: "1px solid #f0f0f0",
};

const content: React.CSSProperties = {
  padding: "32px 40px",
};

const footer: React.CSSProperties = {
  padding: "24px 40px",
  backgroundColor: "#fafafa",
  borderTop: "1px solid #f0f0f0",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  lineHeight: "20px",
  margin: "0",
};

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={{ padding: "40px 20px" }}>
          <Container style={container}>
            {/* Header */}
            <Section style={header}>
              <Text style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: "0", letterSpacing: "-0.02em" }}>
                RFM Portal
              </Text>
            </Section>

            {/* Content */}
            <Section style={content}>
              {children}
            </Section>

            {/* Footer */}
            <Section style={footer}>
              <Text style={footerText}>
                This is an automated notification from the RFM Merchant Onboarding Portal.
              </Text>
              <Text style={{ ...footerText, marginTop: "8px" }}>
                RFM Loyalty Co. · Powered by Google Gemini
              </Text>
            </Section>
          </Container>
        </Container>
      </Body>
    </Html>
  );
}

// ── Shared Styles ──

export const heading: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 8px",
  letterSpacing: "-0.01em",
};

export const subheading: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 24px",
  lineHeight: "22px",
};

export const paragraph: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
  lineHeight: "24px",
  margin: "0 0 16px",
};

export const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#4f46e5",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  padding: "12px 24px",
  borderRadius: "8px",
  textAlign: "center" as const,
};

export const secondaryButton: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "#f3f4f6",
  color: "#374151",
};

export const card: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "16px",
  border: "1px solid #f0f0f0",
};

export const label: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#9ca3af",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 4px",
};

export const value: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#111827",
  margin: "0",
};

export const badge = (color: string, bg: string): React.CSSProperties => ({
  display: "inline-block",
  fontSize: "11px",
  fontWeight: "600",
  color,
  backgroundColor: bg,
  padding: "3px 10px",
  borderRadius: "6px",
});

export const divider: React.CSSProperties = {
  borderColor: "#f0f0f0",
  margin: "24px 0",
};
