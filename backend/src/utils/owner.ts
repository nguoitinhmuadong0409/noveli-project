import crypto from 'crypto';
import { ENV } from '../config/env';

export function isOwnerBiDanh(biDanh: string): boolean {
  return Boolean(ENV.OWNER_BIDAN && biDanh.toLowerCase() === ENV.OWNER_BIDAN.toLowerCase());
}

export function isValidOwnerSetupKey(candidate: string | undefined): boolean {
  const expected = ENV.OWNER_SETUP_KEY;
  if (!candidate || !expected) return false;

  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}
