const TEAM_RULES = [
  { team: 'Customer AI', reason: 'customer support', terms: ['support', 'customer', 'help', 'problem', 'issue', 'complaint', 'account question'] },
  { team: 'Sales AI', reason: 'lead or commercial conversation', terms: ['deal', 'partnership', 'proposal', 'quote', 'demo', 'pricing', 'interested', 'sales enquiry'] },
  { team: 'Chrome Cruiser AI', reason: 'store operations', terms: ['chrome cruiser', 'shopify', 'storefront', 'product page', 'checkout', 'cj dropshipping'] },
  { team: 'Fulfilment AI', reason: 'stock or delivery operations', terms: ['fulfilment', 'fulfillment', 'supplier', 'inventory', 'stock', 'shipment', 'shipping', 'delivery', 'tracking'] },
  { team: 'Growth AI', reason: 'marketing or growth', terms: ['search console', 'seo', 'marketing', 'campaign', 'advertising', 'metricool', 'traffic', 'ranking', 'impressions'] },
  { team: 'Finance & Operations AI', reason: 'billing or finance review', terms: ['invoice', 'billing', 'payment notice', 'subscription notice', 'stripe'] },
  { team: 'AI Manager — Command', reason: 'technical or reliability operations', terms: ['github', 'vercel', 'deployment', 'workflow run', 'build failed', 'production failed', 'preview failed', 'incident', 'outage', 'twilio', 'retell'] },
];

const PERSONAL_TERMS = ['just eat', 'premier league', 'new home', 'private sale team', 'takeaway'];

export function routeEmailToTeam(message = {}) {
  const text = [message.from, message.subject, message.snippet].map((value) => String(value || '').toLowerCase()).join(' ');
  if (PERSONAL_TERMS.some((term) => text.includes(term))) return { team: 'Owner / Personal', reason: 'personal or non-business email' };
  for (const rule of TEAM_RULES) {
    if (rule.terms.some((term) => text.includes(term))) return { team: rule.team, reason: rule.reason };
  }
  return { team: 'AI Manager — Command', reason: 'unclassified inbox email for triage' };
}

export function stellarTeamDirectory() {
  return [
    'AI Manager — Command: coordinates work and cross-team triage.',
    'Sales AI: prospects, outreach, deals and commercial follow-up.',
    'Customer AI: customer support, inbox replies and service issues.',
    'Fulfilment AI: stock, suppliers, shipping and delivery operations.',
    'Chrome Cruiser AI: Shopify and Chrome Cruiser store operations.',
    'Growth AI: SEO, traffic, ads, social and marketing growth.',
    'Finance & Operations AI: billing and finance review.',
    'AI Team Daily Report: reporting layer that summarizes team activity for the owner.',
  ].join('\n');
}
