# Haven — Canadian House Affordability Calculator

A responsive, client-side web application that estimates an affordable home purchase price for Canadian buyers based on household income, existing debts, down payment, mortgage assumptions, and estimated ownership costs.

## What this does

- Calculates an estimated maximum affordable home price using a transparent, bounded search.
- Shows the estimated monthly mortgage payment (principal + interest) using the Canadian semi-annual compounding convention.
- Breaks down total monthly housing costs: mortgage, property tax, insurance, heating, and maintenance.
- Calculates Gross Debt Service (GDS) and Total Debt Service (TDS) ratios.
- Applies the OSFI mortgage stress test (contract rate + 2% or 5.25% floor).
- Includes CMHC mortgage default insurance premiums when the down payment is below 20%, with verified premium tiers and the 30-year amortization surcharge.
- Provides scenario comparisons (lower, near-estimate, higher purchase prices) with a simple chart.
- Validates inputs and surfaces clear warnings (e.g., down payment below CMHC minimum, insured-mortgage price cap).
- Works offline; no financial data leaves the browser.

## Quick start

```bash
# from the project root
python server.py
# open http://127.0.0.1:8000
```

Or simply open `index.html` directly in a browser (most browsers allow ES modules from `file://` with some limitations; the Python server is recommended).

## Project structure

```
house-affordability/
├── AGENTS.md            # Project-wide agent instructions
├── FUNCTIONAL.md        # Functional specification
├── TECHNICAL.md         # Technical architecture
├── PRD.md               # Product requirements document
├── README.md            # This file
├── server.py            # Simple Python HTTP server
├── index.html           # Main HTML
├── css/
│   └── style.css        # Stylesheet
├── js/
│   ├── calculations.js  # Pure financial calculation layer (no DOM)
│   ├── format.js        # CAD and percentage formatters
│   └── app.js           # UI wiring, validation, rendering
└── tests/
    └── calculations.test.js  # Unit tests (Node.js built-in test runner)
```

## Running the tests

```bash
cd house-affordability
node --test tests/calculations.test.js
```

Expected output (all tests should pass):

```
✓ Canadian rate conversion uses semi-annual compounding convention
✓ zero principal returns zero mortgage payment
✓ zero interest returns principal divided by payment count
✓ positive interest returns a finite positive payment
✓ longer amortization lowers the monthly payment for a fixed principal and rate
✓ higher interest increases the monthly payment for fixed principal and term
✓ principal increases payment for a fixed rate and term
✓ minimum down payment tiers apply CMHC rules
✓ mortgage default insurance premium uses verified CMHC tiers
✓ GDS and TDS ratios use gross monthly income
✓ zero income returns unavailable ratios instead of NaN
✓ affordable price search returns a finite positive estimate
✓ no affordable price returns an explanatory status for infeasible inputs
✓ increasing income does not reduce the estimated affordable price
✓ increasing recurring debt does not raise the estimated affordable price
✓ invalid inputs are rejected with field-level errors
✓ calculateResults returns a structured result object
```

## Key financial formulas and assumptions

| Area | Convention / Source |
|------|---------------------|
| Mortgage rate conversion | Canadian convention: nominal annual rate compounded semi-annually → equivalent monthly rate `(1 + r/2)^(2/12) - 1` |
| Monthly payment | `P * i * (1+i)^n / ((1+i)^n - 1)`; zero-rate path `P / n` |
| Minimum down payment (CMHC) | 5% on first $500k, 10% on remainder up to $1.5M; 20% above $1.5M |
| CMHC default insurance premiums (owner-occupied) | LTV ≤80%: none; 80.01–85%: 2.8%; 85.01–90%: 3.1%; 90.01–95%: 4.0%; >95%: 4.5% (non-traditional down payment). Premium is calculated on the *base mortgage* and added to the principal. |
| 30-year amortization surcharge | +0.20 percentage points on the premium rate. |
| GDS / TDS limits | 39% / 44% of gross monthly income (CMHC/FCAC guidelines). |
| Stress-test qualifying rate | Greater of (contract rate + 2%) or 5.25% (OSFI Guideline B-20). |
| Affordability search | Bounded binary search; cap $2,000,000; tolerance $0.50; max 100 iterations. |
| Property tax | User-entered annual amount; divided by 12 for monthly cost. Not auto-scaled by price. |
| Insurance, heating, maintenance | User-entered monthly amounts. Maintenance is optional. |

### Verified sources (checked 2026-10-24)

- CMHC mortgage default insurance premiums & down-payment rules: https://www.cmhc-schl.gc.ca/
- OSFI Minimum Qualifying Rate (stress test): https://www.osfi-bsif.gc.ca/en/supervision/financial-institutions/banks/minimum-qualifying-rate-uninsured-mortgages
- Bank of Canada / CMHC debt-service guidelines: https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/calculating-gds-tds
- FCAC Preparing to get a mortgage: https://www.canada.ca/en/financial-consumer-agency/services/mortgages/preparing-mortgage.html

## Disclaimer

> This calculator provides estimates for planning and educational purposes only. It is not financial, legal, tax, or mortgage advice and does not guarantee mortgage approval. Actual affordability depends on lender policies, qualification and stress-test requirements, credit history, income verification, property details, taxes, insurance, closing costs, and other factors. Verify current rules and obtain advice or a quote from a qualified professional.

## Known limitations

- Property tax, insurance, heating, and maintenance are user estimates; the app does not fetch live municipal data.
- Closing costs (land-transfer tax, legal fees, etc.) are not modelled in the affordability search.
- The insured-mortgage price cap ($1.5M) applies to first-time buyers and new construction per CMHC changes effective Dec 2024. The app does not model repeat-buyer restrictions separately.
- Amortization beyond 25 years is only insurable for first-time buyers or new builds; the app applies the surcharge but does not enforce eligibility.
- The stress test uses the current OSFI buffer (2%) and floor (5.25%). These can change; the rules are configurable in `js/calculations.js`.
- No persistent storage of user data (no localStorage, cookies, or analytics).

## License

MIT — free to use, modify, and distribute.