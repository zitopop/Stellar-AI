# ✦ Stellar AI

AI script generator for FiveM (QBCore) and Roblox server owners. Describe what you need in plain English — get the script plus the fxmanifest, ready to drop into your resources folder.

**Live at [trystellarai.com](https://trystellarai.com)**

---

## What it does

- Generates Lua scripts for FiveM (QBCore, ESX, standalone) and Roblox, with the fxmanifest included
- Four AI models: Spark (fast), Star (everyday), Comet (advanced), Nova (Pro — most powerful)
- Workspace panel — every generated script becomes a downloadable file
- Installable as an app on phone, tablet and desktop
- Free plan, plus Plus (£10/mo) and Pro (£30/mo) subscriptions

---

## Built with

Static HTML/CSS/JS front end · Vercel serverless functions · AI API · Stripe payments · Google sign-in

---

## Structure

```
app.html        the chat app
index.html      landing page
terms.html      terms & privacy
manifest.json   installable app config
sw.js           service worker
vercel.json     hosting config + security headers
api/            serverless functions (chat, checkout, plans, webhook)
```

---

© 2026 Stellar AI
