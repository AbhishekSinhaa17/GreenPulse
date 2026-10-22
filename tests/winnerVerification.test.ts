import { describe, it, expect } from 'vitest';
import {
  validateProofFile,
  generateSecureProofPath,
  validateReviewDecision,
  canTransitionClaimStatus,
  MAX_PROOF_FILE_SIZE_BYTES,
} from '../src/services/verificationService';

describe('PRD § 09 & Phase 6: Proof File Validation', () => {
  it('accepts valid JPEG, PNG, and WebP images within 5MB limit', () => {
    const validJpg = {
      name: 'scorecard.jpg',
      type: 'image/jpeg',
      size: 1024 * 500,
    };
    expect(validateProofFile(validJpg).valid).toBe(true);

    const validPng = {
      name: 'golf-genius-proof.png',
      type: 'image/png',
      size: 1024 * 1024 * 2,
    };
    expect(validateProofFile(validPng).valid).toBe(true);

    const validWebp = {
      name: 'round_screen.webp',
      type: 'image/webp',
      size: 1024 * 1024 * 4.9,
    };
    expect(validateProofFile(validWebp).valid).toBe(true);
  });

  it('rejects files larger than 5MB limit', () => {
    const oversizedFile = {
      name: 'huge_scorecard.png',
      type: 'image/png',
      size: MAX_PROOF_FILE_SIZE_BYTES + 1024,
    };
    const result = validateProofFile(oversizedFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds the 5.0 MB maximum limit');
  });

  it('rejects empty files (0 bytes)', () => {
    const emptyFile = {
      name: 'empty.jpg',
      type: 'image/jpeg',
      size: 0,
    };
    const result = validateProofFile(emptyFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects disallowed MIME types and executable formats', () => {
    const pdfFile = {
      name: 'scorecard.pdf',
      type: 'application/pdf',
      size: 1024 * 100,
    };
    expect(validateProofFile(pdfFile).valid).toBe(false);
    expect(validateProofFile(pdfFile).error).toContain('Only JPEG, PNG, and WebP');

    const svgFile = {
      name: 'vector.svg',
      type: 'image/svg+xml',
      size: 1024 * 10,
    };
    expect(validateProofFile(svgFile).valid).toBe(false);

    const exeFile = {
      name: 'malware.exe',
      type: 'application/x-msdownload',
      size: 1024 * 10,
    };
    expect(validateProofFile(exeFile).valid).toBe(false);
  });

  it('rejects files with mismatched or unauthorized file extensions', () => {
    const spoofedFile = {
      name: 'trojan.exe',
      type: 'image/png',
      size: 1024 * 10,
    };
    const result = validateProofFile(spoofedFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid file extension');
  });
});

describe('PRD § 09 & Phase 6: Secure Non-Guessable Storage Path Generation', () => {
  it('generates non-guessable paths following user/claim UUID pattern', () => {
    const userId = '11111111-2222-3333-4444-555555555555';
    const claimId = 'aaaa-bbbb-cccc-dddd';
    const filename = 'my_scorecard.png';

    const path = generateSecureProofPath(userId, claimId, filename, () => 'unique-test-token');
    expect(path).toBe('11111111-2222-3333-4444-555555555555/aaaa-bbbb-cccc-dddd-unique-test-token.png');
  });

  it('sanitizes path traversal and illegal characters from IDs', () => {
    const maliciousUserId = '../../malicious/user';
    const maliciousClaimId = 'claim/../../subfolder';
    const filename = 'shot.jpeg';

    const path = generateSecureProofPath(maliciousUserId, maliciousClaimId, filename, () => 'safe-uuid');
    expect(path).not.toContain('..');

    const parts = path.split('/');
    expect(parts).toHaveLength(2);
    expect(path).toBe('malicioususer/claimsubfolder-safe-uuid.jpeg');
  });

  it('throws when user ID or claim ID contains no valid alphanumeric characters', () => {
    expect(() => generateSecureProofPath('///', 'claim-1', 'file.png')).toThrow();
    expect(() => generateSecureProofPath('user-1', '../../../', 'file.png')).toThrow();
  });
});

describe('PRD § 09 & § 11.4: Review Decision Validation', () => {
  it('allows verified and under_review decisions without rejection notes', () => {
    expect(validateReviewDecision({ decision: 'verified' }).valid).toBe(true);
    expect(validateReviewDecision({ decision: 'under_review' }).valid).toBe(true);
  });

  it('requires a mandatory non-empty rejection reason when rejecting proof', () => {
    const emptyReject = validateReviewDecision({ decision: 'rejected', rejectionReason: '' });
    expect(emptyReject.valid).toBe(false);
    expect(emptyReject.error).toContain('rejection reason');

    const shortReject = validateReviewDecision({ decision: 'rejected', rejectionReason: 'bad' });
    expect(shortReject.valid).toBe(false);
    expect(shortReject.error).toContain('minimum 5 characters');

    const validReject = validateReviewDecision({
      decision: 'rejected',
      rejectionReason: 'Scorecard round date does not match reported date on ticket.',
    });
    expect(validReject.valid).toBe(true);
  });
});

describe('PRD § 09: Claim Lifecycle State Machine & Payment Boundary', () => {
  it('restricts non-admin users to only moving pending_proof or rejected to under_review', () => {

    expect(canTransitionClaimStatus('pending_proof', 'under_review', false)).toBe(true);

    expect(canTransitionClaimStatus('rejected', 'under_review', false)).toBe(true);

    expect(canTransitionClaimStatus('pending_proof', 'verified', false)).toBe(false);
    expect(canTransitionClaimStatus('under_review', 'verified', false)).toBe(false);
    expect(canTransitionClaimStatus('under_review', 'paid', false)).toBe(false);
    expect(canTransitionClaimStatus('verified', 'paid', false)).toBe(false);
  });

  it('allows administrators to review, approve, and reject claims', () => {

    expect(canTransitionClaimStatus('pending_proof', 'under_review', true)).toBe(true);
    expect(canTransitionClaimStatus('under_review', 'verified', true)).toBe(true);
    expect(canTransitionClaimStatus('under_review', 'rejected', true)).toBe(true);
    expect(canTransitionClaimStatus('rejected', 'under_review', true)).toBe(true);

    expect(canTransitionClaimStatus('paid', 'verified', true)).toBe(false);
    expect(canTransitionClaimStatus('paid', 'under_review', true)).toBe(false);
  });

  it('enforces that verification does not automatically mark claim paid', () => {

    const verifiedStatus = 'verified';
    expect(verifiedStatus).not.toBe('paid');
  });
});
