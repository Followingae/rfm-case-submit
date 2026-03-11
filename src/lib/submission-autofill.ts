import type { SubmissionDetails } from "./types";
import type { ParsedMDF } from "./ocr-engine";

/**
 * Auto-populate SubmissionDetails from parsed MDF data.
 * Only fills fields that are currently empty in `prev`, preserving user edits.
 */
export function autofillSubmissionFromMDF(
  prev: SubmissionDetails,
  parsed: ParsedMDF,
): SubmissionDetails {
  const fill = (current: string, ...candidates: (string | undefined | null)[]): string => {
    if (current.trim()) return current; // Don't overwrite user input
    for (const c of candidates) {
      if (c && c.trim()) return c.trim();
    }
    return current;
  };

  // Extract rates from fee schedule
  const getRate = (cardTypes: string[]): string | undefined => {
    for (const ct of cardTypes) {
      const entry = parsed.feeSchedule?.find(
        (f) => f.cardType.toLowerCase().includes(ct.toLowerCase())
      );
      if (entry?.posRate) return entry.posRate;
    }
    return undefined;
  };

  // Extract terminal rental from terminal fees
  const getRental = (): string | undefined => {
    const rental = parsed.terminalFees?.find(
      (f) => f.label.toLowerCase().includes("rent") || f.label.toLowerCase().includes("rental")
    );
    return rental?.amount;
  };

  return {
    ...prev,
    // Contact & Location
    contactPersonName: fill(prev.contactPersonName, parsed.contactName),
    mobileNumber: fill(prev.mobileNumber, parsed.contactMobile, parsed.mobileNo),
    emailAddress: fill(prev.emailAddress, parsed.email1),
    merchantLocation: fill(prev.merchantLocation, parsed.address, parsed.shopLocation),
    websiteUrl: fill(prev.websiteUrl, parsed.webAddress),
    noOfTerminalsAndType: fill(prev.noOfTerminalsAndType, parsed.numTerminals),
    natureOfBusiness: fill(prev.natureOfBusiness, parsed.businessType, parsed.exactBusinessNature),

    // Merchant identity
    existingMidMerchantName: fill(prev.existingMidMerchantName, parsed.merchantLegalName),
    groupName: fill(prev.groupName, parsed.dba, parsed.merchantLegalName),

    // Fee rates from MDF fee schedule
    proposedRateStandard: fill(prev.proposedRateStandard, getRate(["Visa", "Mastercard", "Debit"])),
    proposedRatePremium: fill(prev.proposedRatePremium, getRate(["Premium"])),
    proposedRateInternational: fill(prev.proposedRateInternational, getRate(["International"])),
    proposedRateDCC: fill(prev.proposedRateDCC, getRate(["DCC"])),

    // Financial projections
    expectedMonthlySpend: fill(prev.expectedMonthlySpend, parsed.projectedMonthlyVolume),
    rentalFee: fill(prev.rentalFee, getRental()),
  };
}
