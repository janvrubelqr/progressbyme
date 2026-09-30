# Knowledge base

One topic area = one `.md` file (kebab-case filename, e.g. `high-blood-pressure.md`).

Each file collects key takeaways extracted from source articles/PDFs, not the full text — short,
actionable facts we can later reuse (app glossary text, coaching content, check-in logic, etc.).

## File format

```markdown
# <Topic name>

## Key facts
- Fact, in plain language, with the number/range if there is one.
- ...

## Sources
- <Article title> — added <date>
```

## Current topics
- [high-blood-pressure.md](high-blood-pressure.md) — Harvard Health Publishing, 2025
- [strength-training.md](strength-training.md) — Harvard Health Publishing, 2021
- [hydration-guidelines.md](hydration-guidelines.md) — EFSA-based internal reference, 2026 — formula implemented in `src/lib/water-goal.ts`
