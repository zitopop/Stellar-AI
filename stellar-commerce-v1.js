(() => {
  'use strict';
  if (!/^\/(?:index\.html)?$/.test(location.pathname)) return;
  const onReady=(fn)=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();

  onReady(()=>{
    const plansSection=document.querySelector('#plans');
    const cards=[...document.querySelectorAll('#plans .plans .plan')];
    if(!plansSection||!cards.length)return;

    // Keep plan identity for analytics/styling, but never inject duplicate visible labels.
    cards.forEach((card)=>{
      const text=(card.querySelector('.plan-label')?.textContent||card.textContent||'').toLowerCase();
      const key=text.includes('starter')?'starter':text.includes('plus')?'plus':text.includes('pro')?'pro':'free';
      card.dataset.stellarPlan=key;
    });

    // Remove legacy commerce UI that used to duplicate plan badges/trust rows.
    plansSection.querySelectorAll('.stellar-plan-badge,.stellar-plan-trust,.stellar-plan-footnote').forEach((node)=>node.remove());
  });
})();
