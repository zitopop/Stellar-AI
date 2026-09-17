(() => {
  'use strict';
  if (!/^\/(?:index\.html)?$/.test(location.pathname)) return;
  const onReady=(fn)=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  onReady(()=>{
    const plansSection=document.querySelector('#plans');
    const cards=[...document.querySelectorAll('.plans .plan')];
    if(!plansSection||!cards.length)return;

    const labels={free:['free','Try free'],starter:['starter','Regular builds'],plus:['plus','Most popular'],pro:['pro','Power users']};
    cards.forEach((card,index)=>{
      const text=(card.querySelector('.plan-label')?.textContent||card.textContent||'').toLowerCase();
      const key=text.includes('starter')?'starter':text.includes('plus')?'plus':text.includes('pro')?'pro':'free';
      card.dataset.stellarPlan=key;
      if(!card.querySelector('.stellar-plan-badge')){
        const badge=document.createElement('span');badge.className='stellar-plan-badge';badge.textContent=labels[key][1];card.appendChild(badge);
      }
    });

    if(!plansSection.querySelector('.stellar-plan-trust')){
      const trust=document.createElement('div');trust.className='stellar-plan-trust';
      trust.innerHTML='<span><i></i>Start free</span><span><i></i>GBP checkout</span><span><i></i>Annual savings shown upfront</span><span><i></i>Review AI output before deployment</span>';
      const grid=plansSection.querySelector('.plans');grid?.parentNode?.insertBefore(trust,grid);
    }
    if(!plansSection.querySelector('.stellar-plan-footnote')){
      const note=document.createElement('p');note.className='stellar-plan-footnote';
      note.textContent='Plan limits and included features are shown on each card. Generated code should be reviewed and tested in a safe environment before production use.';
      plansSection.querySelector('.plans')?.insertAdjacentElement('afterend',note);
    }
  });
})();
