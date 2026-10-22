/**
 * GreenPulse Winner Verification & Proof Pipeline Service
 *
 * Handles:
 * 1. Proof file validation (allowed MIME types, file extensions, max file size 5MB).
 * 2. Secure non-guessable storage object path generation (preventing path traversal and collision).
 * 3. Claim lifecycle state machine validation (pending_proof -> under_review -> verified/rejected).
 * 4. Rejection note requirements.
 * 5. Payment boundary enforcement (verification does not trigger paid state; paid is decoupled).
 */

import type { ClaimStatus } from '../types';

export const ALLOWED_PROOF_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_PROOF_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

// 5 MB maximum file size limit
export const MAX_PROOF_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates scorecard screenshot file before upload.
 */
export function validateProofFile(file: {
  name: string;
  size: number;
  type: string;
}): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // 1. File size check
  if (file.size <= 0) {
    return { valid: false, error: 'File is empty.' };
  }
  if (file.size > MAX_PROOF_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the 5.0 MB maximum limit.`,
    };
  }

  // 2. MIME type check
  const mime = file.type.toLowerCase();
  const isAllowedMime = ALLOWED_PROOF_MIME_TYPES.some((m) => m === mime);
  if (!isAllowedMime) {
    return {
      valid: false,
      error: 'Invalid file format. Only JPEG, PNG, and WebP images are accepted.',
    };
  }

  // 3. Extension check
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isAllowedExt = ALLOWED_PROOF_EXTENSIONS.some((e) => e === ext);
  if (!isAllowedExt) {
    return {
      valid: false,
      error: `Invalid file extension .${ext}. Must be .jpg, .jpeg, .png, or .webp.`,
    };
  }

  return { valid: true };
}

/**
 * Generates a unique, non-guessable, path-traversal safe storage object path.
 * Format: {userId}/{claimId}-{randomUUID}.{ext}
 */
export function generateSecureProofPath(
  userId: string,
  claimId: string,
  filename: string,
  uuidGenerator?: () => string
): string {
  // Guard against path traversal attacks (.. or slashes in IDs)
  const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanUserId = sanitizeId(userId);
  const cleanClaimId = sanitizeId(claimId);

  if (!cleanUserId || !cleanClaimId) {
    throw new Error('Invalid user ID or claim ID for proof upload.');
  }

  const rawExt = filename.split('.').pop()?.toLowerCase() || 'png';
  const cleanExt = rawExt.replace(/[^a-z0-9]/g, '');

  const uuid =
    uuidGenerator?.() ||
    (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  return `${cleanUserId}/${cleanClaimId}-${uuid}.${cleanExt}`;
}

export type ReviewDecision = 'under_review' | 'verified' | 'rejected';

/**
 * Validates admin review decision and ensures mandatory rejection reason.
 */
export function validateReviewDecision(params: {
  decision: ReviewDecision;
  rejectionReason?: string;
}): { valid: boolean; error?: string } {
  const { decision, rejectionReason } = params;

  if (decision === 'rejected') {
    if (!rejectionReason || rejectionReason.trim().length < 5) {
      return {
        valid: false,
        error: 'A detailed rejection reason (minimum 5 characters) is required when rejecting proof.',
      };
    }
  }

  return { valid: true };
}

/**
 * Strict state machine transition validation for winner claims.
 */
export function canTransitionClaimStatus(
  current: ClaimStatus,
  next: ClaimStatus,
  isAdmin: boolean
): boolean {
  // Non-admins can only transition pending_proof/rejected -> under_review (via proof submission)
  if (!isAdmin) {
    if (
      (current === 'pending_proof' || current === 'rejected') &&
      next === 'under_review'
    ) {
      return true;
    }
    return false;
  }

  // Admins can execute:
  switch (current) {
    case 'pending_proof':
      return next === 'under_review' || next === 'rejected';
    case 'under_review':
      return next === 'verified' || next === 'rejected';
    case 'verified':
      // Cannot un-verify without review; paid transition requires payout integration
      return next === 'paid' || next === 'under_review';
    case 'rejected':
      // Can be put under review again if golfer updated proof
      return next === 'under_review';
    case 'paid':
      // Terminal state
      return false;
    default:
      return false;
  }
}
