import { startAlternativeOwnerCall, getAlternativeCarrierConfiguration } from './jarvis-carrier.js';
import { startOwnerCall as startLegacyOwnerCall, getOwnerCallConfiguration } from './owner-call.js';

export function getJarvisCarrierHealth() {
  return {
    legacy: getOwnerCallConfiguration(),
    alternatives: getAlternativeCarrierConfiguration(),
    verified: String(process.env.OWNER_CALL_END_TO_END_VERIFIED || '').trim().toLowerCase() === 'true',
  };
}

export async function startJarvisOwnerCall(options = {}) {
  const failures = [];
  // Keep the already-configured path first. If it cannot place the call, use the new carriers.
  try {
    return await startLegacyOwnerCall(options);
  } catch (error) {
    failures.push(error);
  }

  try {
    return await startAlternativeOwnerCall(options.purpose);
  } catch (error) {
    failures.push(error);
  }

  const error = new Error(failures.map((failure) => failure?.message || 'Carrier failed').join(' | ') || 'No Jarvis phone carrier is configured.');
  error.provider = failures.at(-1)?.provider || 'none';
  error.status = failures.at(-1)?.status || 503;
  throw error;
}
