// Keep request classification anchored to the latest concrete user goal,
// even when several successive replies are short references to that goal.
// This affects prompt specialization only; the full conversation is still
// passed separately to the model.
const MAX_RECENT_USER_TURNS = 10;
const CONTEXTUAL_REFERENCE = /\b(?:it|that|this|these|those|them|same|again|earlier|previous|above)\b/i;
const GENERIC_FOLLOWUP = /^(?:yes|yep|okay|ok|sure|continue|go on|more|another one|any ideas|what now|what next|and then|what files do i need|where do i put (?:the|these|those) files)[.!?\s]*$/i;

// An explicit new topic must win over an old conversation, even when the
// sentence contains a word such as "this" or "again".
const EXPLICIT_TOPIC = /\b(?:fivem|qbcore|qb[- ]?core|esx|roblox|luau|shopify|website|web app|mobile app|football|weather|recipe|travel|python|javascript|typescript|react|lua|sql|github|vercel|birthday|wedding|poem|song|movie|book|school|exam|math|physics|health)\b/i;

export function isContextualFollowUp(text) {
  const message = typeof text === 'string' ? text.trim() : '';
  return Boolean(message)
    && message.length <= 150
    && !EXPLICIT_TOPIC.test(message)
    && (CONTEXTUAL_REFERENCE.test(message) || GENERIC_FOLLOWUP.test(message));
}

export function classificationText(messages) {
  const userTurns = Array.isArray(messages)
    ? messages
        .filter((message) => message?.role === 'user' && typeof message.content === 'string' && message.content.trim())
        .slice(-MAX_RECENT_USER_TURNS)
        .map((message) => message.content.trim())
    : [];
  const current = userTurns.at(-1) || '';
  if (!current) return '';
  if (!isContextualFollowUp(current)) return current.toLowerCase();

  const priorConcreteRequest = userTurns.slice(0, -1).reverse()
    .find((message) => !isContextualFollowUp(message));
  return ((priorConcreteRequest ? priorConcreteRequest.slice(-3000) + '\n' : '') + current).toLowerCase();
}
