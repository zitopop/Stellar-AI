import { PLAN_DEFINITIONS } from './pricing.js';

const formatter = new Intl.NumberFormat('en-GB');

export function allowanceLabel(plan) {
  const definition = PLAN_DEFINITIONS[String(plan || '').trim().toLowerCase()];
  if (!definition || definition.includedCredits == null) return '';
  const period = definition.creditPeriod === 'day'
    ? 'day'
    : definition.creditPeriod === 'month'
      ? 'month'
      : String(definition.creditPeriod || 'period');
  return `${formatter.format(definition.includedCredits)} credits/${period}`;
}

export function hydratePlanAllowances(root = document) {
  root.querySelectorAll('[data-plan-allowance]').forEach((node) => {
    const label = allowanceLabel(node.getAttribute('data-plan-allowance'));
    if (label) node.textContent = label;
  });
}

const api = Object.freeze({
  allowanceLabel,
  definitions: PLAN_DEFINITIONS,
  hydratePlanAllowances,
});

window.StellarPlanDisplay = api;

function hydrate() {
  hydratePlanAllowances(document);
  window.dispatchEvent(new CustomEvent('stellar:plan-display-ready', { detail: api }));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrate, { once: true });
} else {
  hydrate();
}
