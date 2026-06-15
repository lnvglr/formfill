# Contributing to Formfill

Thank you for your interest in contributing! This project is open source under the [MIT License](LICENSE).

## Getting Started

1. Fork the repository
2. Clone your fork and follow [docs/SETUP.md](docs/SETUP.md)
3. Create a branch: `git checkout -b feat/your-feature`
4. Make your changes
5. Run `npm run lint` and `npm run build`
6. Open a pull request against `main`

## Development Guidelines

### Code style

- Match existing patterns in the file you are editing
- TypeScript strict mode — avoid `any` unless unavoidable
- UI copy is in **German** (the app targets German administrative forms)
- Documentation and code comments can be in English

### Field keys

Canonical profile field names live in `src/lib/field-keys.ts`. When adding support for new form fields:

- Use existing keys when possible (check aliases and normalization)
- Add new keys with clear, stable snake_case names
- Update aliases for common PDF label variants

### AI prompts

Routes in `src/app/api/analyze` and `src/app/api/map-fields` must **never** receive user profile data. Only PDF text and field metadata.

### Database changes

Add a new timestamped migration in `supabase/migrations/`. Include:

- Table/column changes
- RLS policies for any new user-scoped tables
- Comments explaining non-obvious security decisions

Regenerate types if needed:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/lib/supabase/database.types.ts
```

### Components

UI uses [shadcn/ui](https://ui.shadcn.com/) with Tailwind CSS 4. New components go in `src/components/`; primitives in `src/components/ui/`.

## Pull Request Checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] No secrets or `.env.local` values committed
- [ ] Database migrations included if schema changed
- [ ] Security-sensitive changes documented in [SECURITY.md](SECURITY.md) if applicable

## Reporting Issues

- **Bugs:** Open a GitHub issue with steps to reproduce
- **Security vulnerabilities:** See [SECURITY.md](SECURITY.md) — do not file public issues

## Questions

Open a GitHub Discussion or issue if something in the docs is unclear. PRs that improve documentation are always welcome.
