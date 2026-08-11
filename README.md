# ✦ Stellar AI

AI script generator for FiveM (QBCore) and Roblox server owners. Describe what you need in plain English — get the script plus the fxmanifest, ready to drop into your resources folder.

**Live at [trystellarai.com](https://trystellarai.com)**

---

## What it does

- Generates complete Lua scripts for FiveM (QBCore, ESX, ox_lib, standalone) and Roblox
- Fixes and improves broken or incomplete scripts
- Four AI models: Spark (fast), Star (everyday), Comet (advanced), Nova (Pro — most powerful)
- Login with Google or Discord — no extra accounts needed
- Workspace panel — every generated script becomes a downloadable file
- Installable as an app on phone, tablet and desktop
- Free plan, Plus (£10/mo) and Pro (£30/mo) subscriptions

---

## Built with

Static HTML/CSS/JS · Vercel serverless functions · AI API · Stripe payments · Google + Discord sign-in · Resend email

---

## Structure

```
app.html            the chat app
index.html          landing page
terms.html          terms & privacy
manifest.json       installable app config
sw.js               service worker
vercel.json         hosting config + security headers
api/                serverless functions
  auth.js           email auth
  chat.js           AI chat + streaming
  create-checkout.js Stripe checkout
  discord-oauth.js  Discord OAuth (redirect + callback)
  get-chats.js      load chat history
  get-plan.js       get subscription plan
  grant.js          owner tools
  save-chats.js     save chat history
  save-plan.js      save plan
  search.js         Brave web search
  send-welcome.js   Resend welcome email
  webhook.js        Stripe webhook
```

---

© 2026 Stellar AI
