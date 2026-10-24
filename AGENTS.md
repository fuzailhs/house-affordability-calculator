# AGENTS.md — Canadian House Affordability Calculator

## Quick Start

```bash
# Run tests (Node.js built-in runner)
node --test tests/calculations.test.js

# Run local server
python server.py
# → http://127.0.0.1:8000
```

## Architecture

- **Entry point:** `index.html` → loads `js/calculations.js`, `js/format.js`, `js/app.js`
- **Pure calculation layer:** `js/calculations.js` (no DOM, testable from Node)
- **Formatters:** `js/format.js` — centralized `Intl.NumberFormat` for CAD and percentages
- **UI controller:** `js/app.js` — reads inputs, validates, calls calculations, renders results
- **No build step, no bundler, no backend, no dependencies** (Chart.js not used; simple Canvas chart in `app.js`)

## Key Conventions

- **Canadian mortgage convention:** nominal annual rate compounded semi-annually → equivalent monthly rate via `(1 + r/2)^(2/12) - 1`
- **All money in CAD**, internally as numbers (not formatted strings)
- **Rules config:** `MortgageRules` object at top of `calculations.js` — includes source URLs and `sourceCheckedAt: "2026-10-24"`
- **Validation:** `validateInputs()` returns `{ valid, errors[] }`; errors shown inline via `aria-invalid` + `aria-describedby`
- **Status codes:** `ok`, `invalid_input`, `no_affordable_price`, `search_cap` — never return silent `NaN`/`0`
- **Privacy:** fully client-side; no analytics, no localStorage, no external requests

## Verified Canadian Rules (as of 2026-10-24)

| Rule | Value | Source |
|------|-------|--------|
| Min down payment | 5% ≤$500k, 5%+10% up to $1.5M, 20% above | CMHC |
| Insured mortgage cap | $1,500,000 (first-time/new build) | CMHC |
| Default insurance premiums | LTV 80–85%: 2.8%, 85–90%: 3.1%, 90–95%: 4.0% | CMHC |
| 30-yr amortization surcharge | +0.20 pp on premium | CMHC |
| GDS / TDS limits | 39% / 44% | CMHC / FCAC |
| Stress test qualifying rate | max(contract + 2%, 5.25%) | OSFI Guideline B-20 |

## Testing

- Run: `node --test tests/calculations.test.js`
- 18 tests covering: rate conversion, zero-rate edge cases, payment monotonicity, CMHC tiers, GDS/TDS, zero-income handling, search monotonicity, validation
- No CI configured; run locally before changes

## Common Tasks

| Task | How |
|------|-----|
| Change a rule | Edit `MortgageRules` in `js/calculations.js`; update `sourceCheckedAt` |
| Add a field | 1. Add to `FIELD_DEFS` in `app.js` 2. Add HTML in `index.html` 3. Wire in `readInputs()` 4. Add test |
| Modify formatting | Edit `js/format.js` (single source of truth) |
| Debug calculations | `node -e "const api=require('./js/calculations.js'); console.log(api.calculateMonthlyMortgagePayment(200000,4.5,25))"` |

## Gotchas

- **PowerShell** is the shell; use `Invoke-WebRequest` not `curl`
- **Select values** in `readInputs()` must use `Number(el.value)` not the default
- **Empty required fields** return `null` → validation catches them; don't coerce to 0
- **Chart** is a simple Canvas in `drawScenarioChart()` — no Chart.js dependency
- **Reset button** calls `populateDefaults()` → `clearAllFieldErrors()` → `runCalculation()`

## Files That Matter

```
index.html          # structure, a11y, disclaimer
css/style.css       # design system (CSS custom properties)
js/calculations.js  # pure math + rules config (SOURCE OF TRUTH for formulas)
js/format.js        # formatCurrency, formatCurrencyMonthly, formatPercent
js/app.js           # UI wiring, validation, rendering
tests/calculations.test.js  # unit tests (Node test runner)
server.py           # Python ThreadingHTTPServer
README.md           # setup, formulas, sources, limitations
```

## Don't

- Add React, build tools, analytics, backend, or external deps
- Hard-code mortgage rules without source URL + verification date
- Mix net income into GDS/TDS (they use gross)
- Present estimates as lender approval — disclaimer is in footer + README