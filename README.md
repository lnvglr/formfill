# Formfill

AI-assisted PDF form filling for German administrative forms (Anträge). Upload an AcroForm PDF, answer a short questionnaire, preview the result live, and download the filled document.

**Privacy-first:** profile data and filled PDFs are encrypted in the browser before anything reaches the server. The AI only sees PDF text and field names — never your personal data.

## Features

- **AI field detection** — identifies required fields and maps them to a reusable profile
- **Smart questionnaire** — asks only for missing information; saved profile values are prefilled
- **Live PDF preview** — see highlights on fields as you answer
- **Encrypted vault** — AES-256-GCM client-side encryption; server stores opaque blobs only
- **Guest mode** — try the full flow without signing up (anonymous Supabase session)
- **Accounts** — passkeys or email OTP; sync encrypted profile across devices
- **Billing** — free preview always; registered users get monthly download credits; Stripe for credit packs and Pro subscription
- **Form catalog** — optional matching against known official PDF templates by file hash

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com/) — Auth, Postgres, Storage
- [Stripe](https://stripe.com/) — payments and subscriptions
- [pdf-lib](https://pdf-lib.js.org/) + [pdfjs-dist](https://mozilla.github.io/pdf.js/) — PDF fill and preview
- AI: [Anthropic Claude](https://www.anthropic.com/) or [Hugging Face Inference](https://huggingface.co/docs/inference-providers)

## Quick Start

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com/) project
- An AI provider API key (Anthropic or Hugging Face)
- (Optional) Stripe account for billing

### 1. Clone and install

```bash
git clone https://github.com/lnvglr/formfill.git
cd formfill
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your keys. See [docs/SETUP.md](docs/SETUP.md) for the full walkthrough.

### 3. Run database migrations

Apply the SQL files in `supabase/migrations/` to your Supabase project (via the SQL editor or Supabase CLI). See [supabase/README.md](supabase/README.md).

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/SETUP.md](docs/SETUP.md) | Supabase, Auth, Stripe, and AI provider setup |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data flow, encryption model, API overview |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy to Railway, Vercel, or any Node host |
| [SECURITY.md](SECURITY.md) | Security model and vulnerability reporting |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

## Project Structure

```
src/
  app/              # Next.js App Router (pages + API routes)
  components/       # React UI
  lib/
    ai/             # Anthropic + Hugging Face providers
    crypto/         # Client-side vault encryption
    supabase/       # Supabase clients and types
    ...             # PDF, billing, field keys, etc.
supabase/
  migrations/       # Postgres schema, RLS, storage buckets
```

## License

[MIT](LICENSE) — Copyright (c) 2026 Leon Vogler

## Disclaimer

Formfill helps fill PDF forms but does not provide legal advice. Always review filled documents before submission. The maintainers are not responsible for errors in AI-generated field mappings.
