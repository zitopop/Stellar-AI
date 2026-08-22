# 🚀 STELLAR AI — LAUNCH KIT (updated 20 July 2026)

Your app is COMPLETE. This kit has everything left: flipping the money switch, filming the proof clip, and posting. Work through it top to bottom.

---

## ✅ WHAT'S LIVE RIGHT NOW

- Chat app with 4 models: ✨ Spark · ⭐ Star · ☄️ Comet (Plus) · 🚀 Nova (Pro)
- Message allowance refreshed every 6 hours, live meter + countdown in the app
- Free waits for the reset · Plus/Pro buy top-ups: packs or custom 10–100 messages (3p each, 50p min)
- 📁 Workspace panel — every script becomes a named, downloadable file
- Google sign-in (done) · owner mode (you get everything free)
- Installable app (Add to Home Screen → your star icon, full screen)
- Stop button, thinking-star animation, posh dark UI, business-tone AI
- Plans: Free · Plus £20/mo · Pro £75/mo — confetti thank-you after purchase
- Terms & Privacy page at /terms.html
- Landing page at /landing.html

---

## 💰 STEP 1 — THE MONEY SWITCH (15 minutes, one time)

### A. Create 2 products in Stripe
Go to **dashboard.stripe.com** → log in → **Product catalogue** (or "Products") → **+ Add product**. Create these two, exactly:

1. **Stellar Plus**
   - Price: **£20.00**
   - Billing: **Recurring — Monthly**
2. **Stellar Pro**
   - Price: **£75.00**
   - Billing: **Recurring — Monthly**

(Top-ups need NO product — the app prices them automatically: 3p per message, 50p minimum, packs from 10 to 100.)

### B. Copy the 2 price codes
Open each product you just made. Each has a price with a code starting **`price_...`** — copy both somewhere safe (Notes app is fine). Label which is which!

### C. Paste them into Vercel
Go to **vercel.com** → your **stellar-ai** project → **Settings** → **Environment Variables** → add these two (Name → Value):

| Name | Value |
|---|---|
| `STRIPE_PRICE_ID_LITE` | the Plus price_ code |
| `STRIPE_PRICE_ID_PRO` | the Pro price_ code |

Save both.

### D. Redeploy
Vercel → **Deployments** → newest deployment → **⋯ menu → Redeploy**. Wait for green **Ready**.

### E. Test it
Open your app → Plans → tap **Get Plus**. Stripe checkout should open. Use Stripe's test card if you're in test mode: **4242 4242 4242 4242**, any future date, any 3 digits. Complete it → you should land back in the app with CONFETTI. 🎉

**That's the switch flipped. Every buy button is now real income.**

---

## 🎬 STEP 2 — THE PROOF CLIP (60 seconds, phone screen-record)

The clip that sells: show it WORKING.

1. Open Stellar on your phone (the installed app — star icon visible on your home screen first = flex)
2. Type: **"make a FiveM shop NPC that sells water for $10"**
3. Let the star spin → code streams in
4. Show the code pasted into a server + it working in-game (the money shot)
5. End on the app: tap the model picker (Spark/Star/Nova), flash the Plans page

Keep it fast. No talking needed — captions do the work.

---

## 📣 STEP 3 — CAPTIONS (copy-paste)

**TikTok / Instagram (@stellaraiapp):**
> Server owners: you don't need a scripter anymore. Type what you want → working FiveM script in seconds. Free to try — link in bio. #fivem #fivemscripts #roblox #gtarp

**Reddit (r/FiveM etc — be human, not salesy):**
> Built a little AI tool that writes working QBCore scripts from plain English. Free tier if anyone wants to test it and tell me what breaks: trystellarai.com

**YouTube Shorts:**
> POV: your server needed a shop NPC and you built it in 30 seconds. Stellar AI — link in description.

Post the SAME clip everywhere. One clip, four platforms.

---

## 📋 LAUNCH CHECKLIST

- [ ] 2 Stripe products created (Plus £20/mo, Pro £75/mo)
- [ ] 2 price codes into Vercel
- [ ] Redeployed → green Ready
- [ ] Test purchase → confetti seen
- [ ] Proof clip filmed
- [ ] Posted: TikTok · Instagram · Reddit · YouTube Shorts
- [ ] First £10 → **Rule One: mum's £80 first** 💙

---

## 🔧 IF SOMETHING BREAKS

- Buy button says "Payments are not set up yet" → an env var name is misspelled or missing → check the table in Step 1C, then Redeploy.
- Checkout opens but wrong price → you copied the wrong price_ code → swap it in Vercel, Redeploy.
- Anything else → screenshot it and send it to me. We fix, same as always.
