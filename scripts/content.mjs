// Everything the profile says. Reword it here, then run `node scripts/build.mjs`.
// The script turns this into the pictures and the README; nothing else needs editing.

export const PROFILE = {
  login: 'Meshhack',
  npmUser: 'meshark',
  site: 'meshack.co.ke',
  x: 'meshhark',

  // The tab row. The first one is the terminal itself; the rest jump to a section below.
  tabs: ['meshack', 'work', 'clients', 'npm', 'stack', 'contact'],

  // ── the terminal up top ──────────────────────────────────────────────
  // Lines are set by hand for each size, so nothing wraps into an orphan.
  headline: {
    wide: ['i build developer tools, AI platforms,', 'and products people actually pay for.'],
    narrow: ['i build developer tools,', 'AI platforms, and products', 'people actually pay for.'],
  },
  whoami: {
    wide: [
      ['meshack musyoka — software engineer, nairobi, kenya', 'bright'],
      ['CTO at ziya: the backend, the AWS infrastructure, the team', 'bright'],
      ['5 npm packages · 3 MCP servers · 15 products · 13 client sites', 'mid'],
    ],
    narrow: [
      ['meshack musyoka — software engineer', 'bright'],
      ['nairobi, kenya', 'bright'],
      ['CTO at ziya: backend, AWS infra, the team', 'bright'],
      ['5 npm packages · 3 MCP servers', 'mid'],
      ['15 products · 13 client sites', 'mid'],
    ],
  },
  // [name, description, shorter description for phones]
  shipped: [
    ['voice/', 'encrypted incident logging for GBV survivors. private by design', 'encrypted incident logging for GBV survivors'],
    ['easydaraja/', 'complete daraja dev toolkit — SDK, CLI, MCP, callbacks, docs', 'the complete daraja toolkit: SDK, CLI, MCP'],
    ['docmtaani/', 'telemedicine for kenya. a doctor in your pocket', 'telemedicine for kenya'],
    ['creda/', 'AI equity research that cites its sources or says nothing', 'AI equity research that cites its sources'],
    ['+11 more/', 'the work tab keeps scrolling. bring a snack', 'the work tab keeps scrolling'],
  ],
  skylineCommand: 'skyline --since "1 year ago"',
  skylineCaption: {
    wide: (total) => [
      `${total} contributions in a year. one tower per week, kicc for scale.`,
      'the orange window is this week. it is usually 3am.',
    ],
    narrow: (total) => [
      `${total} contributions in a year.`,
      'one tower per week, kicc for scale.',
      'the orange window is this week.',
      'it is usually 3am.',
    ],
  },
  status: {
    wide: ['the tabs work. the typing happens at', 'meshack.co.ke'],
    narrow: ['the tabs work. typing lives at', 'meshack.co.ke'],
  },

  // ── the sections under it ────────────────────────────────────────────
  // Each one is drawn as its own terminal window. A window is a list of blocks:
  //   { head: [lines] }                    the big opening lines
  //   { cmd: '...' }                       a prompt line
  //   { entry: 'name — tagline', tag, text }   a project: title, [tag], description
  //   { rows: [[label, value], ...], label: width in characters, stack: true to
  //     put the value under the label on phones }
  //   { note: [lines] }                    # comments
  work: {
    blocks: [
      { head: ["everything i've shipped.", 'scroll. it keeps going.'] },
      { cmd: 'ls ~/work' },
      {
        entry: 'ziya — CTO. the day job',
        tag: 'now',
        text: 'ziya connects trusted community groups to interest-free capital, productive assets and financial tools for underserved entrepreneurs. i run the engineering behind it:',
      },
      {
        label: 11,
        rows: [
          ['backend', 'go services behind the member app, the back office and the partner platform'],
          ['lending', 'group capital and asset financing — tuk-tuks, motorcycles, phones. ledgers that reconcile to the cent'],
          ['infra', 'AWS — EC2, RDS, IAM, secrets manager. nginx in front. right-sizing and security reviews'],
          ['delivery', 'CI/CD on github actions. staging before production, always'],
          ['team', 'hiring, onboarding, architecture decisions'],
        ],
      },
      {
        entry: 'voice — the one that matters most',
        text: 'encrypted, local-first incident logging for survivors of gender-based violence. document privately, export evidence when ready. react native + expo, on-device crypto. no jokes on this one — some software is just important.',
      },
      {
        entry: "easydaraja — the complete developer toolkit for safaricom's daraja",
        tag: 'pre-release',
        text: 'everything you need to build, validate, test, debug and ship an M-Pesa integration, in one monorepo:',
      },
      {
        label: 11,
        rows: [
          ['sdk', 'typed clients + exact wire payload builders, 30+ operations'],
          ['cli', '40+ commands, live sandbox execution, built-in idempotency'],
          ['mcp', 'its own MCP server — docs search, validation, planning'],
          ['callbacks', 'parsers, validators, redacted inspection, replay'],
          ['templates', 'node / express / next.js starter apps, smoke-tested'],
          ['docs', 'source-verified endpoint specs, conformance + coverage'],
          ['recipes', 'typed recipes for common payment workflows'],
          ['core', 'auth, retries, idempotency stores, redaction, safe errors'],
        ],
      },
      { text: '8 packages · 23 API families · 534 tests, all green.' },
      {
        entry: 'docmtaani — a doctor in your pocket',
        tag: 'deployed',
        text: 'telemedicine for kenya: book a doctor, consult by text or AI voice, pay. clerk + neon + vapi.',
      },
      {
        entry: 'creda — an AI analyst that refuses to make things up',
        tag: 'production',
        text: 'crunchbase for kenyan stocks: 62 NSE companies, cited KPIs, filings search. the AI cites a source or stays quiet — a bold strategy in this economy. cloudflare-native: workers, D1, R2, KV, vectorize, queues.',
      },
      { note: ['+11 more, right below. bring a snack.'] },
    ],
  },
  workMore: {
    title: 'work',
    blocks: [
      { cmd: 'ls ~/work | tail -11' },
      {
        entry: 'vetmtaani — docmtaani, but the patients have hooves',
        tag: 'phase 2',
        text: 'AI veterinary telemedicine: text, AI voice and video consults for pets and livestock. GPT-4 in the loop, webhooks orchestrated across clerk, paystack and vapi.',
      },
      {
        entry: 'agentpesa — AI agents with a company card',
        tag: 'alpha',
        text: 'hosted MCP gateway where agents call real APIs and move real money. tool policies, approval workflows, audit logs — because "the AI did it" is not an incident report.',
      },
      {
        entry: 'receipts — the app voice was forked from',
        text: 'private relationship & incident tracking on mobile. expo + react native app, next.js landing. the architecture was good enough to build a second product on. that is the review.',
      },
      {
        entry: 'kenya corporate lens — reads annual reports so you never have to',
        text: 'extracts and normalizes financial metrics from kenyan corporate PDFs, with page-level citations. gemini + pinecone + prisma.',
      },
      {
        entry: 'athi gardens — the one with the spinning globe',
        text: 'cinematic real-estate microsite: mapbox globe animation, 3D via react-three, live plot availability, enquiry pipeline. yes, a land-selling website got the awwwards treatment.',
      },
      {
        entry: 'slydin — slydin.app',
        text: 'instagram DM & comment automation with AI responses — for brands drowning in "price?" comments.',
      },
      {
        entry: 'nairobi diplomatic hub — where diplomacy gets a homepage',
        text: "digital platform for nairobi's diplomatic community. next.js.",
      },
      {
        entry: 'wellnesslink — booking infrastructure for wellness experts',
        tag: 'in development',
        text: 'profiles, availability, payments. next.js 15 + supabase, shadcn/ui, zustand.',
      },
      {
        entry: 'mobile POS & billing — flutter, offline-first',
        text: "retail checkout with barcode scanning and bluetooth thermal printing. works offline, because the internet doesn't always.",
      },
      {
        entry: 'nairobi roi calculator — property math, minus the vibes',
        tag: 'live',
        text: 'plug in the numbers, get the actual return on that plot. next.js + typescript.',
      },
      {
        entry: 'lorem ipsum — agency site on a real CMS',
        tag: 'active',
        text: 'sanity v4 studio: blog, case studies, portable text, GROQ. next.js 16 + react 19.',
      },
      { note: ["that's 15. client websites are a separate tab — all 13.", "i don't have hobbies."] },
    ],
  },
  clients: {
    blocks: [
      { head: ['13 client sites,', 'shipped and handed over.'] },
      { cmd: 'ls ~/clients' },
      {
        label: 27,
        stack: true,
        rows: [
          ['amanitouchspa.com', 'luxury mobile spa — booking to payment, paystack + sendgrid'],
          ['loicitafittherapy.com', 'fitness coaching & massage — dark, minimal, mobile-first'],
          ['positiveactionkenya.org', 'NGO — causes, events, donations, volunteer signup'],
          ['hallowshealth.com.au', 'disability & mental health services, australia'],
          ['dreampesa.com', 'fintech platform'],
          ['jobkaya.com', 'job board & HR platform'],
          ['cabafrica.taxi', 'ride-hailing platform'],
          ['elimudigital.com', 'education platform'],
          ['oyanatravel.com', 'tours & travel'],
          ['countysafari.com', 'travel & safaris'],
          ['makaorentals.com', 'accommodation & rentals'],
          ['careforcreative.com', 'entertainment'],
          ['responsiblekenya.com', 'public health initiative'],
        ],
      },
      {
        note: [
          'delivered with royal creative agency (roca), nairobi.',
          'handed over — what the clients did with them since is between them and their CMS.',
        ],
      },
    ],
  },
  // The npm window is built from the live package list; this is its frame.
  npm: {
    head: (count) => [`${count} packages on npm.`, "npx them right now. i'll wait."],
    intro: [
      "most of these tame safaricom's daraja API — a developer experience best described as \"character building\".",
      'someone had to fix it.',
    ],
    outro: ['all published as ~meshark. downloads only go up.'],
    // What each package does. One without an entry falls back to its own npm
    // description, so a new release shows up without touching this file.
    about: {
      callbackdesk:
        'webhook debugging for payments: hosted callback URL, live forwarding to your localhost, replay once you fix your handler. like ngrok, if ngrok knew what an STK push was.',
      'daraja-skills':
        'installs authoritative M-Pesa knowledge into your AI coding agent — claude code, cursor, codex, gemini cli, antigravity. 24 officially-verified API flows. your agent stops guessing.',
      '@meshark/safaricom-daraja-mcp':
        'an MCP server that gives AI assistants hands on M-Pesa: STK push, balances, reversals, QR — 11 tools, typed with zod. node, python and PHP. pick your fighter.',
      '@meshark/create-mini-app':
        'build safaricom mini programs in VS code with tailwind instead of the proprietary IDE. a custom postcss transpiler rewrites what the runtime rejects — because w-1/2 deserves to live.',
      'create-safaricom-mini-app': 'the unscoped companion. one command, zero setup.',
    },
    // The line to run. GitHub puts a copy button on each one.
    run: {
      callbackdesk: 'npx callbackdesk doctor <your-callback-url>',
      'daraja-skills': 'npx daraja-skills install',
      '@meshark/safaricom-daraja-mcp': 'npm i -g @meshark/safaricom-daraja-mcp',
      '@meshark/create-mini-app': 'npx @meshark/create-mini-app my-store --template e-commerce',
      'create-safaricom-mini-app': 'npx create-safaricom-mini-app my-app',
    },
    // Packages whose code is public on GitHub.
    source: {
      '@meshark/safaricom-daraja-mcp': 'https://github.com/Meshhack/safaricom-daraja-mcp',
    },
    order: [
      'callbackdesk',
      'daraja-skills',
      '@meshark/safaricom-daraja-mcp',
      '@meshark/create-mini-app',
      'create-safaricom-mini-app',
    ],
  },
  stack: {
    blocks: [
      { head: ['the stack. everything', 'here has shipped.'] },
      { cmd: 'cat stack.txt' },
      {
        label: 12,
        rows: [
          ['languages', 'typescript · javascript (esm) · python · go · sql'],
          ['frameworks', 'next.js 14–16 · react 19 · hono · fastify · express'],
          ['mobile', 'react native + expo · flutter'],
          ['data', 'postgres (neon, supabase, RDS) · cloudflare D1 · R2 · KV · vectorize'],
          ['ai', 'anthropic · openai · RAG with citations · vapi voice · MCP'],
          ['payments', 'M-Pesa/daraja (30+ operations) · paystack · my.tradePay'],
          ['cloud', 'AWS (EC2, RDS, IAM, secrets manager) · cloudflare · vercel · railway'],
          ['delivery', 'github actions CI/CD · nginx · npm publishing'],
          ['quality', 'vitest · playwright · zod · 534 tests that actually run'],
        ],
      },
      {
        note: [
          'pulled from shipped repos, not a udemy wishlist.',
          '"proficient in microsoft word" did not make the cut.',
        ],
      },
    ],
  },
  contact: {
    blocks: [
      { head: ['the part where', 'you say hello.'] },
      { cmd: 'cat contact.txt' },
      {
        label: 12,
        rows: [
          ['say hello', 'the first button under this window. a short form, here on github'],
          ['github', 'github.com/Meshhack'],
          ['x', '@meshhark'],
          ['web', 'meshack.co.ke — the terminal you can actually type in'],
        ],
      },
      {
        note: ['i reply fast. bring something hard —', '"impossible" gets moved to the top of the queue.'],
      },
    ],
  },

  // The buttons under the contact window: [file name, label, where it goes].
  // The first is the one to press. An arrow marks the ones that leave GitHub.
  buttons: [
    ['hello', 'say hello', 'https://github.com/Meshhack/Meshhack/issues/new?template=hello.yml'],
    ['follow', 'follow on github', 'https://github.com/Meshhack'],
    ['site', 'meshack.co.ke ↗', 'https://www.meshack.co.ke'],
    ['x', 'x ↗', 'https://x.com/meshhark'],
  ],

  // The closing strip. It links to the script that draws all of this.
  footer: {
    wide: ['# the skyline is my contribution calendar. a github action redraws it every morning. see how →'],
    narrow: ['# the skyline is my contribution calendar. a github', '# action redraws it every morning. see how →'],
  },
};
