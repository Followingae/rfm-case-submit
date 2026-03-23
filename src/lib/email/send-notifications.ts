import { createElement } from "react";
import { sendEmail, APP_URL, isEmailConfigured } from "./mailer";
import { CaseSubmittedEmail } from "./templates/case-submitted";
import { CaseApprovedEmail } from "./templates/case-approved";
import { CaseReturnedEmail } from "./templates/case-returned";
import { CaseEscalatedEmail } from "./templates/case-escalated";
import { ExpiryWarningEmail } from "./templates/expiry-warning";
import { WeeklySummaryEmail } from "./templates/weekly-summary";
import { CASE_TYPE_LABELS, DOC_SLOT_LABELS } from "@/lib/labels";

// ── Case Submitted → Processing Team ──

export async function emailCaseSubmitted({
  toEmails,
  merchantName,
  caseType,
  readinessScore,
  readinessTier,
  submittedBy,
  caseId,
  documentCount,
}: {
  toEmails: string[];
  merchantName: string;
  caseType: string;
  readinessScore: number;
  readinessTier: string;
  submittedBy: string;
  caseId: string;
  documentCount: number;
}) {
  if (!isEmailConfigured() || toEmails.length === 0) return;

  await sendEmail({
    to: toEmails,
    subject: `New Case Submitted: ${merchantName}`,
    template: createElement(CaseSubmittedEmail, {
      merchantName,
      caseType: CASE_TYPE_LABELS[caseType] || caseType,
      readinessScore,
      readinessTier,
      submittedBy,
      caseUrl: `${APP_URL}/cases/${caseId}`,
      documentCount,
    }),
  });
}

// ── Case Approved → Sales User ──

export async function emailCaseApproved({
  toEmail,
  merchantName,
  caseType,
  approvedBy,
  caseId,
}: {
  toEmail: string;
  merchantName: string;
  caseType: string;
  approvedBy: string;
  caseId: string;
}) {
  if (!isEmailConfigured()) return;

  await sendEmail({
    to: toEmail,
    subject: `Case Approved: ${merchantName}`,
    template: createElement(CaseApprovedEmail, {
      merchantName,
      caseType: CASE_TYPE_LABELS[caseType] || caseType,
      approvedBy,
      caseUrl: `${APP_URL}/cases/${caseId}`,
    }),
  });
}

// ── Case Returned → Sales User ──

export async function emailCaseReturned({
  toEmail,
  merchantName,
  returnNumber,
  returnedBy,
  items,
  generalNote,
  caseId,
}: {
  toEmail: string;
  merchantName: string;
  returnNumber: number;
  returnedBy: string;
  items: Array<{ documentId?: string; category: string; feedback: string }>;
  generalNote?: string;
  caseId: string;
}) {
  if (!isEmailConfigured()) return;

  await sendEmail({
    to: toEmail,
    subject: `Case Returned: ${merchantName} — ${items.length} issue${items.length !== 1 ? "s" : ""}`,
    template: createElement(CaseReturnedEmail, {
      merchantName,
      returnNumber,
      returnedBy,
      items: items.map((i) => ({
        documentName: DOC_SLOT_LABELS[i.documentId || ""] || i.documentId || "General",
        category: i.category,
        feedback: i.feedback,
      })),
      generalNote,
      caseUrl: `${APP_URL}/cases/${caseId}`,
    }),
  });
}

// ── Case Escalated → Management ──

export async function emailCaseEscalated({
  toEmails,
  merchantName,
  caseType,
  escalatedBy,
  reason,
  caseId,
}: {
  toEmails: string[];
  merchantName: string;
  caseType: string;
  escalatedBy: string;
  reason: string;
  caseId: string;
}) {
  if (!isEmailConfigured() || toEmails.length === 0) return;

  await sendEmail({
    to: toEmails,
    subject: `ESCALATED: ${merchantName}`,
    template: createElement(CaseEscalatedEmail, {
      merchantName,
      caseType: CASE_TYPE_LABELS[caseType] || caseType,
      escalatedBy,
      reason,
      caseUrl: `${APP_URL}/cases/${caseId}`,
    }),
  });
}

// ── Expiry Warning → Processing/Management ──

export async function emailExpiryWarning({
  toEmails,
  items,
}: {
  toEmails: string[];
  items: Array<{ merchantName: string; documentType: string; expiryDate: string; daysRemaining: number }>;
}) {
  if (!isEmailConfigured() || toEmails.length === 0 || items.length === 0) return;

  await sendEmail({
    to: toEmails,
    subject: `Document Expiry Alert: ${items.length} document${items.length !== 1 ? "s" : ""} need attention`,
    template: createElement(ExpiryWarningEmail, {
      items,
      expiryUrl: `${APP_URL}/expiries`,
    }),
  });
}

// ── Weekly Summary → Management ──

export async function emailWeeklySummary({
  toEmails,
  weekLabel,
  totalCases,
  submitted,
  approved,
  returned,
  escalated,
  avgReadiness,
  topPerformer,
  expiringDocs,
}: {
  toEmails: string[];
  weekLabel: string;
  totalCases: number;
  submitted: number;
  approved: number;
  returned: number;
  escalated: number;
  avgReadiness: number;
  topPerformer?: string;
  expiringDocs: number;
}) {
  if (!isEmailConfigured() || toEmails.length === 0) return;

  await sendEmail({
    to: toEmails,
    subject: `Weekly Summary: ${submitted} submitted, ${approved} approved`,
    template: createElement(WeeklySummaryEmail, {
      weekLabel,
      totalCases,
      submitted,
      approved,
      returned,
      escalated,
      avgReadiness,
      topPerformer,
      expiringDocs,
      analyticsUrl: `${APP_URL}/analytics`,
    }),
  });
}
