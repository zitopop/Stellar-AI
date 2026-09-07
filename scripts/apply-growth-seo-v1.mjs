import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const write = (p,v) => { const full=path.join(root,p); fs.mkdirSync(path.dirname(full),{recursive:true}); fs.writeFileSync(full,v); };
const esc = s => String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));
const published = '2026-09-07';

const articles = [
  {
    slug:'best-ai-for-roblox-scripting-2026',
    title:'Best AI for Roblox Scripting in 2026: What Actually Helps You Ship',
    short:'Best AI for Roblox Scripting in 2026',
    desc:'Compare AI workflows for Roblox Luau in 2026: general chat AI, coding assistants and project-shaped tools, with a practical checklist for secure, testable game systems.',
    search:'best ai roblox scripting 2026 luau game development',
    kicker:'Roblox AI development',
    intro:'The best AI for Roblox scripting is not the one that produces the longest code block. It is the one that helps you move from a game idea to secure, testable Luau systems without losing the architecture between prompts. In 2026, Roblox developers can choose between general-purpose chat AI, editor coding assistants and specialist project-oriented tools. The right choice depends on whether you need a quick explanation, inline code completion or an organised multi-file build.',
    sections:[
      ['1. Judge the workflow, not the demo','A useful Roblox AI should understand the client/server boundary, RemoteEvents, DataStore failure modes, modules and the way a real experience grows over time. Ask it to explain where trusted state belongs before you judge the generated code. If an assistant happily lets a LocalScript decide currency, damage, inventory or rank, the output is fast but the architecture is weak.','Also test continuity. A real project needs follow-up fixes without regenerating unrelated systems. The strongest workflow lets you bring back Studio errors, preserve existing file boundaries and improve one milestone at a time.'],
      ['2. General chat AI is excellent for reasoning','General-purpose assistants such as ChatGPT are strong when you need to reason about architecture, learn an unfamiliar API, review an error or compare implementation approaches. Their value is breadth: the same conversation can cover Luau, product design, documentation and testing strategy.','The trade-off is that a general chat is not automatically a Roblox project manager. You still need to provide the project structure, current files and exact constraints if you want consistent code across many iterations.'],
      ['3. Coding assistants are strongest inside the editor','Editor assistants are useful for autocomplete, refactors, small functions and navigating code that is already in your repository. They reduce typing friction and can be excellent once your architecture exists.','For a new game system, however, inline completion is only one part of the job. You still need a plan for server authority, shared configuration, networking contracts, persistence and tests.'],
      ['4. Specialist tools should earn their place with project-shaped output','A Roblox-focused tool should make the project easier to understand, not merely generate more Lua. Stellar is designed around briefs that become organised Roblox Luau files, followed by testing and iteration. Spark, Star, Comet and Nova are Stellar power tiers; they are not OpenAI model names.','Whatever tool you use, verify the result in Studio. AI can suggest code, but your live server, game rules and player behaviour are the source of truth.'],
      ['5. A five-minute evaluation checklist','Give every tool the same small task: build a secure pickup system with a RemoteEvent, server validation, shared item definitions and a test plan. Check whether it separates client and server code, validates inputs, avoids trusting client-owned values, explains the files it changed and can repair a deliberate bug without rewriting everything.','That test reveals more than a polished landing-page demo because it measures the exact habits that determine whether an AI-assisted Roblox project stays maintainable.']
    ],
    refs:[['Roblox client-server security','https://create.roblox.com/docs/scripting/security/client-server-boundary'],['Roblox RemoteEvent reference','https://create.roblox.com/docs/reference/engine/classes/RemoteEvent/OnServerEvent'],['OpenAI GPT-5.6 in ChatGPT','https://help.openai.com/en/articles/20001354-gpt-56-in-chatgpt']]
  },
  {
    slug:'best-ai-for-fivem-development-2026',
    title:'Best AI for FiveM Development in 2026: QBCore, ESX and Lua Workflows',
    short:'Best AI for FiveM Development in 2026',
    desc:'A practical 2026 guide to choosing AI for FiveM Lua, QBCore and ESX development, with security, resource structure and debugging criteria.',
    search:'best ai fivem development 2026 qbcore esx lua scripts',
    kicker:'FiveM AI development',
    intro:'FiveM AI tools should be judged by more than whether they can write Lua. A production resource has client and server responsibilities, event security, framework APIs, configuration, database assumptions, manifests and dependencies. The best assistant is the one that helps you reason about those boundaries and then keeps the resource coherent while you test and fix it.',
    sections:[
      ['1. Start with the stack','Tell the AI whether the server is QBCore, ESX, Qbox or standalone, which inventory and targeting resources are installed, and what database layer you use. Two resources with the same feature name can require very different integration code.','A strong assistant should ask or infer these dependencies before generating framework-specific calls. Blindly mixing exports and events from different stacks is one of the fastest ways to create a resource that looks complete but never boots.'],
      ['2. Event security is a core quality signal','FiveM documentation explicitly warns that clients can trigger network events in hostile ways. Server handlers should validate money, inventory, position, permissions and other state rather than trusting values passed by the client.','When evaluating an AI, inspect every RegisterNetEvent and TriggerServerEvent path. If the server simply accepts a price, reward or target supplied by the client, treat that as a security bug, not a minor style issue.'],
      ['3. General AI versus specialist project workflows','A general assistant is valuable for debugging, documentation research and explaining unfamiliar APIs. An editor assistant is useful for local changes. A specialist FiveM workflow is most valuable when you want a brief turned into a full resource shape — fxmanifest, config, client, server and documentation — and then want to keep iterating on that same structure.','Stellar is built around that project-shaped flow for FiveM and Roblox. It still requires server testing; no AI can know every private resource, custom export or server convention unless you provide it.'],
      ['4. Use one repeatable benchmark','Ask the tool to create a small job interaction with a server-authoritative reward, configurable locations, a cooldown and clear install steps. Then deliberately change one dependency or trigger an error and see whether the assistant repairs the smallest relevant area.','The winner is not the tool that generated the most lines. It is the one that leaves you with fewer hidden assumptions and a resource you can reason about.'],
      ['5. Treat AI output as code review input','Run the resource, inspect server and client consoles, test with more than one player and review networked events. Ask the AI to explain residual risks and what it could not test. That habit turns AI from a script vending machine into part of a real engineering loop.']
    ],
    refs:[['FiveM secure events','https://docs.fivem.net/docs/developers/server-security/'],['FiveM Lua reference','https://docs.fivem.net/docs/scripting-reference/runtimes/lua/'],['FiveM network events','https://docs.fivem.net/docs/scripting-manual/working-with-events/']]
  },
  {
    slug:'chatgpt-vs-stellar-ai-roblox',
    title:'ChatGPT vs Stellar AI for Roblox Development: Which Workflow Fits?',
    short:'ChatGPT vs Stellar AI for Roblox',
    desc:'Compare ChatGPT and Stellar AI for Roblox development: reasoning, project context, Luau files, iteration, security and when to use each workflow.',
    search:'chatgpt vs stellar ai roblox scripting luau',
    kicker:'AI tool comparison',
    intro:'ChatGPT and Stellar AI are different kinds of tools. ChatGPT is a broad general-purpose AI product with current reasoning controls and Projects for keeping related work together. Stellar is a focused development product aimed at Roblox Luau and FiveM project generation and iteration. The right choice depends on whether breadth or a domain-shaped build workflow matters more for the task in front of you.',
    sections:[
      ['1. Where ChatGPT is strong','ChatGPT is useful when the task spans research, planning, explanation, code review and other domains. Current ChatGPT reasoning controls let eligible users choose how much thought to apply, and Projects can keep chats, files and instructions together.','For a Roblox developer, that makes it a strong place to understand an API, reason through architecture, diagnose a bug or explore a game-design trade-off.'],
      ['2. Where Stellar is different','Stellar is intentionally narrower. Its product language and starter flows are centred on Roblox and FiveM, and its model-power choices are Spark/Fast, Star/Balanced, Comet/Deep and Nova/Max. Those are Stellar tiers, not OpenAI models.','The goal is to move from a feature brief to organised project files and then continue fixing the same build. That specialization can reduce the amount of repeated stack context you need to provide.'],
      ['3. Security still depends on engineering discipline','Neither product removes the need to validate RemoteEvents, keep important state server-side and test DataStore behaviour. An AI response can be plausible and still be insecure. Roblox explicitly recommends validating every client-supplied value used by the server.','Use either assistant to review the client/server contract, then confirm behaviour in Studio with realistic multiplayer cases.'],
      ['4. A sensible combined workflow','You do not have to treat the tools as mutually exclusive. A developer might use a general assistant for research and design reasoning, then use a project-shaped Roblox workflow to implement and iterate on the files.','Choose based on the job: breadth for broad reasoning; specialization for repeated stack-specific implementation.'],
      ['5. What to compare before paying','Compare output consistency across follow-ups, project/file handling, mobile usability, model/usage transparency, security guidance and how easy it is to recover from a bad generation. The best tool is the one that reduces total time from idea to tested feature, not time to first code block.']
    ],
    refs:[['OpenAI GPT-5.6 in ChatGPT','https://help.openai.com/en/articles/20001354-gpt-56-in-chatgpt'],['OpenAI Projects in ChatGPT','https://help.openai.com/en/articles/10169521-projects-in-chatgpt'],['Roblox client-server security','https://create.roblox.com/docs/scripting/security/client-server-boundary']]
  },
  {
    slug:'chatgpt-vs-stellar-ai-fivem',
    title:'ChatGPT vs Stellar AI for FiveM and QBCore Development',
    short:'ChatGPT vs Stellar AI for FiveM',
    desc:'Compare ChatGPT and Stellar AI for FiveM, QBCore and ESX work: research, Lua generation, project files, secure events and iterative debugging.',
    search:'chatgpt vs stellar ai fivem qbcore esx lua',
    kicker:'AI tool comparison',
    intro:'For FiveM development, the important comparison is not which product can print Lua. It is which workflow helps you maintain a coherent resource across configuration, framework integration, network events, testing and follow-up fixes. ChatGPT is broad and general-purpose; Stellar is focused on Roblox and FiveM development workflows.',
    sections:[
      ['1. ChatGPT gives you broad reasoning and research','A general-purpose assistant is useful when you need to understand a framework concept, compare approaches, draft documentation or reason through a complicated error. Current ChatGPT also offers adjustable reasoning levels on eligible plans.','That breadth is valuable when the problem is not only code — for example, planning an economy, writing test cases or understanding a third-party API.'],
      ['2. Stellar centres the FiveM resource shape','Stellar is designed to work from a FiveM brief toward files such as fxmanifest.lua, config.lua, client code, server code and install notes, then keep iterating when you bring back errors.','Its Spark/Star/Comet/Nova controls communicate speed versus depth. They are Stellar product tiers and do not claim to be OpenAI model equivalents.'],
      ['3. Secure events are non-negotiable','Cfx.re security guidance warns that a client can trigger network events outside your intended UI flow. A payment, item reward or permission decision must therefore be checked against server-owned state.','Whichever AI you use, ask it to identify every network event, the values supplied by the client and the server-side checks that protect the event.'],
      ['4. Private server dependencies change the answer','No public AI knows your custom exports, renamed resources, database schema or private framework edits unless you provide them. Good results depend on giving the assistant the relevant files and keeping changes scoped.','When an error appears, provide the exact console output and current file instead of asking for a fresh resource from scratch.'],
      ['5. Pick the workflow that reduces rework','Measure how many edits it takes to get from a brief to a server-tested resource. If a tool generates quickly but forces you to rewrite the integration manually, the apparent speed is misleading. The useful metric is tested progress.']
    ],
    refs:[['OpenAI GPT-5.6 in ChatGPT','https://help.openai.com/en/articles/20001354-gpt-56-in-chatgpt'],['FiveM secure events','https://docs.fivem.net/docs/developers/server-security/'],['FiveM Lua reference','https://docs.fivem.net/docs/scripting-reference/runtimes/lua/']]
  },
  {
    slug:'build-qbcore-job-with-ai',
    title:'How to Build a Complete QBCore Job With AI Without Creating a Mess',
    short:'Build a Complete QBCore Job With AI',
    desc:'A production-minded workflow for building a QBCore job with AI: requirements, config, client/server split, secure events, rewards, testing and install notes.',
    search:'build qbcore job with ai police mechanic job lua',
    kicker:'QBCore workflow',
    intro:'A QBCore job is not one client file and one reward event. A maintainable job usually has configuration, interaction points, permissions, server-owned rewards, inventory integration, notifications and a clear install path. AI is most useful when you force the work into milestones and make every network boundary explicit.',
    sections:[
      ['1. Write the job contract first','Define the job name, grades, duty rules, locations, required items, rewards, cooldowns and framework dependencies before asking for code. This prevents the AI from inventing incompatible assumptions halfway through the resource.','Also decide whether the resource should depend on qb-target, ox_target, qb-inventory, ox_inventory or another stack. Put those choices in one config instead of scattering them through client logic.'],
      ['2. Separate presentation from authority','Client code should handle markers, prompts, menus and visual feedback. Server code should verify the player job, grade, distance when relevant, inventory requirements, cooldowns and rewards.','Do not send a reward amount from the client and then pay it directly. The server should derive trusted values from configuration or server state.'],
      ['3. Build the happy path as one milestone','Start with one interaction from beginning to end: clock in, perform one task, validate it on the server and return feedback. Only after that works should you add multiple locations, progression, vehicles or management features.','This keeps debugging local. If the first milestone fails, you have a small event chain to inspect instead of a 2,000-line resource.'],
      ['4. Ask AI for a security review before polish','Have the assistant list every RegisterNetEvent, every client-provided argument and what the server verifies. Then test the event with unexpected values and repeated calls.','FiveM documentation recommends treating client-triggered events as hostile input. That principle matters even on a friendly roleplay server.'],
      ['5. Finish with install and test notes','A complete AI-generated job should explain dependencies, ensure order, configuration, database changes if any and at least a short multiplayer test plan. If those pieces are missing, the code is not yet a distributable resource.']
    ],
    refs:[['FiveM secure events','https://docs.fivem.net/docs/developers/server-security/'],['RegisterNetEvent reference','https://docs.fivem.net/docs/scripting-reference/runtimes/lua/functions/RegisterNetEvent/']]
  },
  {
    slug:'debug-fivem-lua-errors-with-ai',
    title:'How to Debug FiveM Lua Errors With AI: A Repeatable Workflow',
    short:'Debug FiveM Lua Errors With AI',
    desc:'Use AI to debug FiveM Lua errors without random rewrites: capture the stack trace, isolate the resource, verify dependencies, fix the smallest surface and retest.',
    search:'debug fivem lua errors with ai fix script error',
    kicker:'FiveM debugging',
    intro:'The fastest way to waste time with AI debugging is to paste “it doesn’t work” and ask for a rewrite. FiveM errors become much easier when you capture the exact console output, identify the failing resource and give the assistant the smallest relevant file plus your framework and dependency versions.',
    sections:[
      ['1. Capture the first real error','Copy the complete first meaningful error, including resource name, file and line when available. Later errors may be consequences of the first failure, so fixing the root error often removes several messages at once.','State whether the message came from the server console, F8 client console or browser/NUI console. Those contexts run different code and have different globals.'],
      ['2. Give the AI the dependency context','Tell it whether you use QBCore, ESX, Qbox or standalone code, plus the inventory, target, SQL and utility resources involved. An “attempt to index a nil value” may be a logic bug, but it can also be a missing export or resource-start-order problem.','Include the fxmanifest when a file is not loading, an export is unavailable or a shared script seems missing.'],
      ['3. Ask for the smallest fix','Tell the assistant not to rewrite unrelated files. Ask it to explain the failure, identify the minimal code change and state what evidence would confirm the fix.','Small patches are easier to review and roll back. They also reduce the chance that the AI solves one error by creating a new integration mismatch elsewhere.'],
      ['4. Retest the exact reproduction','Restart only what is safe to restart, repeat the same steps and confirm whether the original error disappeared. If the error changes, provide the new first failure rather than continuing from the old theory.','For network behaviour, test with more than one client. Some bugs only appear when server state is shared between players.'],
      ['5. Turn repeated errors into guardrails','Once you understand a recurring failure, add validation, clearer logging or a startup dependency check so the next incident is easier to diagnose. AI is most valuable when the fix improves the system, not merely the current line number.']
    ],
    refs:[['FiveM Lua reference','https://docs.fivem.net/docs/scripting-reference/runtimes/lua/'],['FiveM events','https://docs.fivem.net/docs/scripting-manual/working-with-events/'],['FiveM secure events','https://docs.fivem.net/docs/developers/server-security/']]
  },
  {
    slug:'qbcore-ox-inventory-setup-guide',
    title:'QBCore and ox_inventory Setup Guide: Compatibility, Order and Safe Integration',
    short:'QBCore + ox_inventory Setup Guide',
    desc:'A careful QBCore and ox_inventory integration guide covering compatibility checks, resource order, item APIs, migrations and testing before production.',
    search:'qbcore ox inventory setup guide ox_inventory compatibility',
    kicker:'FiveM inventory integration',
    intro:'Inventory integrations fail when developers assume every QBCore-era resource speaks the same API. ox_inventory has its own framework expectations and current documentation should be checked before you migrate a live server. Treat the change as an integration project: inventory calls, item data, shops, stashes, metadata and third-party scripts can all be affected.',
    sections:[
      ['1. Confirm framework compatibility first','Before editing server.cfg, check the current ox_inventory framework documentation and the framework your server actually runs. Qbox has explicit current guidance; older QBCore resources may require a compatibility layer, maintained fork or code changes.','Do not follow an old tutorial blindly. Inventory projects evolve quickly, and a startup sequence from a previous release may no longer be the supported path.'],
      ['2. Inventory is an API migration, not a skin','Search your resources for item add/remove calls, inventory opens, stash registration, metadata usage and shop definitions. Each direct dependency needs a decision: supported as-is, adapted, replaced or removed.','Make a list before changing production. That list becomes your test plan after the new inventory starts.'],
      ['3. Keep server authority around items','A client may request an inventory action, but the server should decide whether it is valid. Never trust a client-supplied item count, price or ownership claim simply because the UI produced it.','This is especially important for crafting, shops, job rewards and robbery resources where an exploitable event can become an economy exploit.'],
      ['4. Migrate on a copy and test critical paths','Use a development database or safe backup. Test player load, item persistence, weapons, metadata, stashes, shops, drops, job inventories and any custom scripts before touching the live server.','If a migration changes stored item structure, plan how you will roll back or transform existing data.'],
      ['5. Document the final resource order','Once the integration works, record the exact ensure order and compatibility assumptions in your repository. Future debugging is much easier when another developer can see why a bridge or framework setting exists.']
    ],
    refs:[['Current ox_inventory Qbox guidance','https://coxdocs.dev/ox_inventory/Frameworks/qbx'],['FiveM secure events','https://docs.fivem.net/docs/developers/server-security/']]
  },
  {
    slug:'ai-prompt-to-roblox-game-system',
    title:'From AI Prompt to Full Roblox Game System: A Production Workflow',
    short:'AI Prompt → Full Roblox Game System',
    desc:'Turn an AI prompt into a maintainable Roblox system with architecture, server authority, modules, RemoteEvents, DataStores, tests and staged implementation.',
    search:'ai prompt full roblox game system luau workflow',
    kicker:'Roblox production workflow',
    intro:'A good prompt is not a substitute for architecture, but it can be the first step in a disciplined build loop. The key is to make the AI convert the idea into contracts and milestones before it writes large amounts of Luau. That gives you checkpoints where Studio can prove whether the system is actually working.',
    sections:[
      ['1. Turn the idea into a system brief','Write the player goal, inputs, outputs, trusted state, failure cases and dependencies. A “trading system” brief should say what can be traded, how both players confirm, what happens if someone leaves and which side owns the inventory truth.','This brief prevents the assistant from solving only the UI while ignoring the transaction model.'],
      ['2. Ask for file boundaries before code','Have the AI propose client controllers, server services, shared modules and network names. Review that structure first. If one file owns unrelated responsibilities, split it before implementation starts.','Stable boundaries make later prompts more precise because you can ask to change one service without touching everything else.'],
      ['3. Define RemoteEvent contracts explicitly','For every client-to-server request, write the arguments, types and server checks. Roblox security guidance recommends validating client input and treating the server as the gatekeeper.','Do not let the client choose trusted outcomes such as currency, rank, damage or inventory state.'],
      ['4. Build and test one vertical slice','Implement one end-to-end path, run it in Studio and capture errors. Fix that slice before expanding the feature. For persistent systems, test both successful saves and failure handling.','A vertical slice proves the architecture with less code than a full feature dump.'],
      ['5. Use follow-up prompts as engineering tickets','Instead of “make it better,” ask for a scoped change with acceptance criteria: reproduce this error, preserve these APIs, modify only these files and explain the test. That makes AI-assisted development much closer to normal software engineering.']
    ],
    refs:[['Roblox client-server security','https://create.roblox.com/docs/scripting/security/client-server-boundary'],['Roblox DataStore best practices','https://create.roblox.com/docs/cloud-services/data-stores/best-practices'],['Roblox DataStore limits','https://create.roblox.com/docs/cloud-services/data-stores/error-codes-and-limits']]
  }
];

const sharedStyle = `*{box-sizing:border-box}body{margin:0;background:#0b0b0e;color:#f5f5f8;font:16px/1.72 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.nav{display:flex;justify-content:space-between;align-items:center;padding:17px max(20px,calc((100vw - 900px)/2));position:sticky;top:0;z-index:10;border-bottom:1px solid #29292f;background:rgba(11,11,14,.94);backdrop-filter:blur(14px)}.nav a{color:inherit;text-decoration:none}.cta{padding:9px 14px;border-radius:9px;background:#fff;color:#0b0b0e!important;font-size:13px;font-weight:850}.c{width:min(800px,calc(100% - 34px));margin:auto;padding:58px 0 72px}.ey{color:#9f91f2;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}h1{margin:10px 0 17px;font-size:clamp(38px,6vw,59px);line-height:1.02;letter-spacing:-.055em}h2{margin:42px 0 11px;font-size:27px;letter-spacing:-.035em}p,li{color:#cfcfd7}.intro{padding:18px;border:1px solid #303038;border-radius:13px;background:#151519;font-size:17px}.call{margin:42px 0 0;padding:20px;border:1px solid rgba(159,145,242,.35);border-radius:13px;background:rgba(159,145,242,.07)}.refs{margin-top:44px;padding:18px;border:1px solid #303038;border-radius:13px;background:#131317}.refs a{color:#c8bcff}.refs li+li{margin-top:6px}.end{margin-top:48px;padding:25px;border:1px solid #33333b;border-radius:14px;background:#151519;text-align:center}.end h2{margin-top:0}.note{color:#8f8f9a;font-size:13px}`;

function articleHtml(a){
  const url=`https://trystellarai.com/blog/${a.slug}`;
  const sections=a.sections.map(([h,...ps])=>`<h2>${esc(h)}</h2>${ps.map(p=>`<p>${p}</p>`).join('')}`).join('');
  const refs=a.refs.map(([name,href])=>`<li><a href="${href}" target="_blank" rel="noopener noreferrer">${esc(name)}</a></li>`).join('');
  const schema=JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:a.title,description:a.desc,author:{'@type':'Organization',name:'Stellar AI'},publisher:{'@type':'Organization',name:'Stellar AI'},datePublished:published,dateModified:published,mainEntityOfPage:url});
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(a.title)} | Stellar AI</title><meta name="description" content="${esc(a.desc)}"><link rel="canonical" href="${url}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(a.title)}"><meta property="og:description" content="${esc(a.desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="https://trystellarai.com/og-image.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/lib/assets/pwa/favicon.svg" type="image/svg+xml"><style>${sharedStyle}</style><script type="application/ld+json">${schema}</script></head><body><nav class="nav"><a href="/"><b>✦ Stellar AI</b></a><a class="cta" href="/app?welcome=1">Try Stellar free →</a></nav><main class="c"><div class="ey">${esc(a.kicker)}</div><h1>${esc(a.title)}</h1><p class="intro">${a.intro}</p>${sections}<div class="call"><strong>Use AI as part of the test loop.</strong><p>Generate or review a small milestone, run it in Roblox Studio or on your FiveM development server, bring back the exact error or behaviour, and improve the smallest relevant part. That is how AI speed turns into reliable progress.</p></div><section class="refs"><h2>Official references</h2><p class="note">Platform behaviour changes. Check the current first-party documentation before shipping.</p><ul>${refs}</ul></section><section class="end"><h2>Build the next milestone with Stellar</h2><p>Describe the system you want, choose the power level that fits the job, then test the generated files in your real development environment.</p><a class="cta" href="/app?welcome=1">Open Stellar →</a></section></main></body></html>`;
}

for(const a of articles) write(`blog/${a.slug}.html`, articleHtml(a));

// Improve /app search snippet and load the growth UI without touching backend logic.
let app=read('app.html');
app=app.replace(/<title>FiveM &amp; Roblox AI Script Generator \| Stellar AI<\/title>/,'<title>Roblox &amp; FiveM AI Game Builder + Script Generator | Stellar AI</title>');
app=app.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="Build Roblox Luau and FiveM/QBCore systems from plain English. Generate organised project files, choose Fast-to-Max model power, group work into Projects, then test and fix with Stellar AI.">');
app=app.replace(/<meta property="og:title" content="[^"]*">/,'<meta property="og:title" content="Roblox &amp; FiveM AI Game Builder | Stellar AI">');
app=app.replace(/<meta property="og:description" content="[^"]*">/,'<meta property="og:description" content="Build organised Roblox Luau and FiveM/QBCore project files, keep chats in Projects and choose how much Stellar power to use.">');
app=app.replace(/<meta name="twitter:title" content="[^"]*">/,'<meta name="twitter:title" content="Roblox &amp; FiveM AI Game Builder | Stellar AI">');
app=app.replace(/<meta name="twitter:description" content="[^"]*">/,'<meta name="twitter:description" content="Generate organised Roblox and FiveM systems, group work into Projects and choose Fast, Balanced, Deep or Max power.">');
if(!app.includes('/stellar-growth-v1.css')) app=app.replace('</head>','  <link rel="stylesheet" href="/stellar-growth-v1.css?v=1">\n</head>');
if(!app.includes('/stellar-growth-v1.js')) app=app.replace('</body>','  <script src="/stellar-growth-v1.js?v=1" defer></script>\n</body>');
write('app.html',app);

// Add new static, crawlable guide cards and update library count/schema.
let blog=read('blog.html');
blog=blog.replace(/Browse all 66 Stellar AI/,'Browse all 74 Stellar AI').replace(/66 practical Roblox/,'74 practical Roblox').replace(/numberOfItems":66/,'numberOfItems":74').replace(/<div class="count">66<small>/,'<div class="count">74<small>/');
const cards=articles.map(a=>`<a class="guide" href="/blog/${a.slug}" data-search="${esc(a.search)}">${esc(a.short)}<span>Open →</span></a>`).join('\n');
if(!blog.includes(`/blog/${articles[0].slug}`)) blog=blog.replace('</section><div id="none"',`${cards}\n</section><div id="none"`);
write('blog.html',blog);

// Refresh overlapping pages instead of publishing cannibalising duplicates.
const upgrades=[
  ['blog/roblox-remote-events-tutorial.html',`<section data-growth-refresh="2026"><h2>2026 security update: treat every client call as untrusted</h2><p>Roblox's current security guidance is explicit: anything a client can send may be manipulated or spammed. Validate types, permissions, distance or state where relevant, and enforce rate limits on the server. A RemoteEvent should request an action; it should not grant the client authority over money, damage, inventory or other trusted outcomes.</p><p>Review the current <a href="https://create.roblox.com/docs/scripting/security/client-server-boundary" target="_blank" rel="noopener noreferrer">client-server security guidance</a> before shipping networked systems.</p></section>`],
  ['blog/roblox-datastore-tutorial.html',`<section data-growth-refresh="2026"><h2>2026 DataStore reliability update</h2><p>Current Roblox documentation recommends protected calls and careful failure handling because DataStore requests can fail or be throttled. UpdateAsync consumes both read and write budgets, and a failed write can leave the final state uncertain in some scenarios. Avoid overwriting valid player data with blank defaults after a failed load.</p><p>Check the current <a href="https://create.roblox.com/docs/cloud-services/data-stores/error-codes-and-limits" target="_blank" rel="noopener noreferrer">error codes and limits</a> and <a href="https://create.roblox.com/docs/cloud-services/data-stores/best-practices" target="_blank" rel="noopener noreferrer">best practices</a>.</p></section>`],
  ['blog/qbcore-vs-esx-comparison.html',`<section data-growth-refresh="2026"><h2>2026 decision update: choose the ecosystem you can maintain</h2><p>Framework choice should follow your actual resources, team familiarity and migration cost rather than a generic winner. Inventory, targeting, phone, housing, jobs and custom exports create an ecosystem around the framework. Audit those dependencies before switching a live server, and use a development copy for migration work.</p><p>Whichever stack you choose, keep client-triggered money, inventory and permission events server-authoritative. FiveM's current <a href="https://docs.fivem.net/docs/developers/server-security/" target="_blank" rel="noopener noreferrer">security guidance</a> explains why.</p></section>`],
  ['blog/fivem-server-optimisation.html',`<section data-growth-refresh="2026"><h2>2026 optimisation update: measure before rewriting</h2><p>Start with observable symptoms: server hitch warnings, high resource time, client frame drops, slow database paths or network spam. Optimisation should remove measured bottlenecks, not simply replace working code with a shorter version. Keep event payloads small, avoid unnecessary loops and separate client rendering cost from server execution cost.</p><p>Use the current <a href="https://docs.fivem.net/docs/scripting-reference/runtimes/lua/" target="_blank" rel="noopener noreferrer">CfxLua reference</a> and inspect resource-specific behaviour before changing production.</p></section>`]
];
for(const [file,section] of upgrades){
  let html=read(file);
  if(!html.includes('data-growth-refresh="2026"')) html=html.replace('</main>',`${section}</main>`);
  html=html.replace(/"dateModified":"[0-9-]+"/,`"dateModified":"${published}"`);
  write(file,html);
}

// Sitemap: new clean canonical URLs only.
let sitemap=read('sitemap.xml');
const entries=articles.map(a=>`  <url><loc>https://trystellarai.com/blog/${a.slug}</loc></url>`).join('\n');
if(!sitemap.includes(`/blog/${articles[0].slug}`)) sitemap=sitemap.replace('</urlset>',`${entries}\n</urlset>`);
write('sitemap.xml',sitemap);

console.log(`Growth pass applied: ${articles.length} new guides, ${upgrades.length} refreshed guides, app SEO + growth UI includes.`);
