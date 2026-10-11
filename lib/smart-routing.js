// Server-owned, conservative task routing for the public Stellar Smart choice.
// This never accepts an arbitrary provider model or bypasses plan entitlements.
import { getPlanDefinition } from './pricing.js';

const COMPLEX = /\b(debug|diagnos(?:e|is)|trace|refactor|architect(?:ure)?|security|audit|compare|research|investigat(?:e|ion)|implement|integrat(?:e|ion)|migrat(?:e|ion)|multi[- ]step|analyse|analyze|review|troubleshoot|fix (?:this|these|my)|test cases?)\b/i;
const EXTENDED = /\b(entire|complete|production|comprehensive|multiple files?|end[- ]to[- ]end|edge cases?|tradeoffs?|step[- ]by[- ]step|dependencies|database|authentication|performance|full project|deep dive)\b/i;
const CODE = /(?:```|\b(?:stack trace|traceback|exception|typescript|javascript|python|qbcore|lua|luau|sql|api route)\b)/i;

export function selectSmartTier({ messages = [], plan = 'free', requestKind = 'general', workflowMode = 'general' } = {}) {
  const available = getPlanDefinition(plan).models;
  const lastUser = Array.isArray(messages)
    ? [...messages].reverse().find(message => message?.role === 'user')
    : null;
  const text = typeof lastUser?.content === 'string' ? lastUser.content.slice(0, 6000) : '';
  let score = 0;
  if (text.length > 150) score += 1;
  if (text.length > 700) score += 1;
  if (text.length > 1800) score += 1;
  if (COMPLEX.test(text)) score += 2;
  if (EXTENDED.test(text)) score += 1;
  if (CODE.test(text)) score += 1;
  if (requestKind === 'technical') score += 1;
  if (workflowMode && workflowMode !== 'general') score += 1;

  const ideal = score >= 6 ? 'nova' : score >= 4 ? 'comet' : score >= 1 ? 'star' : 'spark';
  const ranking = ['spark', 'star', 'comet', 'nova'];
  const ceiling = ranking.indexOf(ideal);
  // For an unavailable capability, pick the best tier the account already owns.
  return [...available].reverse().find(tier => ranking.indexOf(tier) <= ceiling) || 'spark';
}
