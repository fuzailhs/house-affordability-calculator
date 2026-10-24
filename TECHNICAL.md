# TECHNICAL.md
## Canadian House Affordability Calculator — Technical Architecture & Implementation Guide

**Purpose:** Define the technical architecture, code organization, calculation boundaries, interfaces, testing strategy, and engineering standards for the Canadian House Affordability Calculator.

**Read alongside:**
- `AGENTS.md` — project-wide instructions and quality standards.
- `FUNCTIONAL.md` — user-facing behaviour, inputs, outputs, and acceptance criteria.

If requirements conflict, do not silently ignore one document. Prefer financial correctness and safety; identify and resolve the conflict consistently.

---

## 1. Engineering Goals

Build a maintainable, client-side application that:
1. Runs locally using a development server.
2. Works on desktop, tablet, and mobile browsers.
3. Calculates results deterministically from validated inputs.
4. Separates financial calculations from DOM manipulation and presentation.
5. Has meaningful automated tests for formulas, edge cases, and validation.
6. Distinguishes verified Canadian rules from user-adjustable assumptions.
7. Never presents an estimate as lender approval or a guaranteed borrowing limit.

### Recommended defaults
- HTML5, CSS3, JavaScript ES modules
- Bootstrap 5 for responsive layout, unless the existing project has a reasonable alternative
- Vitest for unit tests if a Node toolchain is used
- Chart.js only if charts materially improve understanding
- No backend, accounts, analytics, or third-party financial-data submission for the initial version

Inspect the repository before changing tools. Do not rebuild a working project from scratch unnecessarily.

## 2. Suggested Repository Structure

Adapt this to the actual project. Do not create empty files just to match a diagram.

```text
house-affordability/
├── AGENTS.md
├── FUNCTIONAL.md
├── TECHNICAL.md
├── README.md
├── package.json
├── index.html
├── src/
│   ├── main.js
│   ├── styles/main.css
│   ├── components/
│   │   ├── form.js
│   │   ├── results.js
│   │   ├── charts.js
│   │   └── validation.js
│   ├── calculations/
│   │   ├── mortgage.js
│   │   ├── affordability.js
│   │   ├── costs.js
│   │   ├── canadian-rules.js
│   │   └── index.js
│   ├── state/calculator-state.js
│   └── utils/
│       ├── currency.js
│       ├── numbers.js
│       └── dom.js
└── tests/
    ├── mortgage.test.js
    ├── affordability.test.js
    ├── costs.test.js
    ├── canadian-rules.test.js
    └── validation.test.js
```

A simple `index.html`, `style.css`, and `script.js` structure is also acceptable if it fits the existing project. Keep code organized without overengineering.

## 3. Architecture and Dependency Direction

Use a one-way dependency structure:

```text
HTML / UI
   ↓
UI controllers and state
   ↓
Pure calculation modules
   ↓
Constants and verified rule configuration
```

The calculation layer must not depend on the DOM, Bootstrap, chart libraries, browser storage, or network requests.

### Presentation layer
- Renders controls, results, explanations, charts, and errors.
- Reads user input and displays validation feedback.
- Formats values for display.
- Handles responsive layout and accessibility.
- Must not contain mortgage formulas or duplicate financial rules.

### Controller/state layer
- Reads and normalizes form values into a typed input object.
- Validates the object.
- Calls calculation functions.
- Updates results and charts.
- Shows field-specific errors while preserving user-entered values.
- Centralizes recalculation so multiple event handlers do not compete.

### Calculation layer
- Mortgage payments and reverse calculations.
- Down-payment and mortgage-insurance calculations.
- Monthly ownership costs.
- GDS/TDS calculations.
- Maximum affordable price search.
- Scenario comparisons.
- Prefer pure functions: identical inputs return identical outputs without mutating caller-owned objects.

### Rules/configuration layer
Keep Canadian policy values in one documented configuration, not scattered hard-coded percentages. Include source URLs and verification dates. Do not invent rules.

## 4. Data Contracts

Use consistent field names and units. Represent money internally as numbers in CAD, not formatted strings.

### 4.1 Normalized input example

```js
{
  grossAnnualIncome: 120000,
  monthlyDebtPayments: 450,
  monthlyNonHousingExpenses: 900,
  monthlyTakeHomeIncome: null,
  downPayment: 90000,
  annualInterestRate: 4.5,
  amortizationYears: 25,
  provinceCode: "ON",
  annualPropertyTaxRate: 0.01,
  monthlyHomeInsurance: 150,
  monthlyUtilities: 250,
  monthlyMaintenance: 250,
  targetMonthlyHousingBudget: null,
  maxGdsRatio: 0.39,
  maxTdsRatio: 0.44
}
```

Values are illustrative only, not recommended defaults or authoritative rules. Document the actual schema. Use `null` for an optional value not supplied by the user; do not use zero to mean both “missing” and “explicitly zero.”

### 4.2 Result object example

```js
{
  status: "ok",
  estimatedMaximumHomePrice: 0,
  downPayment: 0,
  downPaymentPercent: 0,
  baseMortgageAmount: 0,
  mortgageInsurancePremium: 0,
  totalMortgageAmount: 0,
  monthlyMortgagePayment: 0,
  monthlyPropertyTax: 0,
  monthlyHomeInsurance: 0,
  monthlyUtilities: 0,
  monthlyMaintenance: 0,
  totalMonthlyHousingCost: 0,
  monthlyDebtPayments: 0,
  estimatedMonthlyCashRemaining: null,
  gdsRatio: null,
  tdsRatio: null,
  assumptions: [],
  warnings: []
}
```

This is a shape example, not a demand to include every property. Return structured values, not display strings.

Use explicit statuses such as `ok`, `invalid_input`, `no_affordable_price`, and `calculation_error`. Never silently turn invalid input or a failed search into a plausible-looking zero.

Warnings should correspond to actual conditions, for example that closing costs are excluded or that the estimate may not reflect lender underwriting.

## 5. Calculation API

Use descriptive named exports. Adapt the interface as needed while keeping responsibilities separate.

```js
// mortgage.js
export function getPeriodicInterestRate(annualRatePercent) {}
export function calculateMortgagePayment(principal, annualRatePercent, amortizationYears) {}
export function calculatePrincipalFromPayment(payment, annualRatePercent, amortizationYears) {}

// canadian-rules.js
export function getMinimumDownPayment(homePrice, rules) {}
export function getMortgageInsurancePremium(baseMortgage, loanToValue, rules) {}

// costs.js
export function calculateMonthlyOwnershipCosts(homePrice, assumptions) {}
export function calculateGdsRatio(monthlyHousingCosts, grossMonthlyIncome) {}
export function calculateTdsRatio(monthlyHousingCosts, monthlyDebtPayments, grossMonthlyIncome) {}

// affordability.js
export function calculateAffordableHomePrice(input, rules) {}
export function calculateScenario(input, homePrice, rules) {}
```

Avoid vague names such as `calc()` or `doStuff()`. For meaningful failure cases, return a structured result or throw a documented error handled by the controller.

## 6. Financial Numerical Standards

Document the conventions in code comments and in `README.md`.

### 6.1 Rates and periods
- UI rates are percentages, e.g. `4.5`; convert to decimal form (`0.045`) inside the calculation layer.
- Keep rate conversion in one tested function.
- If using Canadian semi-annual compounding for a quoted annual mortgage rate, convert decimal annual rate \(j\) to an equivalent monthly rate:

\[
i_m = \left(1 + \frac{j}{2}\right)^{2/12} - 1
\]

The formula expects a decimal rate. Do not convert the same rate twice.
- If using a different convention, label and test it explicitly.

### 6.2 Payment frequency
Use monthly payments consistently for the first release unless the UI explicitly supports other frequencies. Do not mix monthly and biweekly values in a formula.

### 6.3 Mortgage payment
For principal \(P\), periodic rate \(i\), and total number of payments \(n\):

\[
M = P \frac{i(1+i)^n}{(1+i)^n-1}
\]

For zero interest:

\[
M = \frac{P}{n}
\]

Handle zero interest separately to avoid division by zero. Validate principal and payment count.

### 6.4 Reverse calculation
Use a mathematically consistent inverse formula when deriving principal from a payment. Handle zero interest separately. Do not approximate by subtracting one period's interest.

### 6.5 Rounding
- Preserve full precision in intermediate calculations.
- Round only for display or where a documented rule requires it.
- Use one CAD formatter.
- Do not round monthly payments before using them in an affordability search.
- Use a documented tolerance for binary-search stopping conditions.
- Use tolerances in floating-point tests rather than brittle exact equality.

### 6.6 Input limits
Define and test reasonable limits for income, debts, expenses, down payment, interest rate, amortization, tax rate, and search bounds. Limits must prevent impossible values and runaway searches without arbitrarily rejecting legitimate scenarios. Explain rejected values to the user.

## 7. Canadian Rules: Configurable and Verified

Never treat a remembered or guessed policy as a permanent constant. The rules configuration should include applicable items such as:
- Minimum down-payment tiers.
- Maximum purchase-price eligibility rules.
- Mortgage-default-insurance eligibility and premium tiers.
- Applicable sales tax treatment for insurance premiums, where relevant.
- Amortization eligibility and limits.
- Qualifying-rate / stress-test assumptions.
- Provincial property-transfer tax or other closing-cost rules, if the app includes them.

For each rule, record:
- `id`
- value or tier table
- `sourceUrl`
- `verifiedAt`
- applicability / eligibility
- notes about limitations

Example configuration shape:

```js
export const mortgageRules = {
  sourceCheckedAt: "YYYY-MM-DD",
  sources: [],
  downPaymentTiers: [],
  insurancePremiumTiers: [],
  qualifyingRatePolicy: {},
  amortizationPolicy: {},
  provincePolicies: {}
};
```

The empty values are placeholders, not working policy data. Populate them only after checking authoritative, current sources. Do not ship empty rules while claiming the calculator is fully functional.

Prefer official sources:
- Canada Mortgage and Housing Corporation (CMHC)
- Financial Consumer Agency of Canada (FCAC)
- Government of Canada pages
- Provincial government tax pages for provincial rules

If a rule cannot be verified, omit the affected feature, expose the assumption clearly, or label the result incomplete. Do not invent a value.

## 8. Affordability Search

Do not calculate maximum price as a simplistic fixed percentage of income. Evaluate a candidate price against every active, documented constraint, which may include:
- Down-payment requirements.
- Monthly housing-cost budget.
- GDS and TDS limits.
- Qualifying payment based on the selected stress-test policy.
- Mortgage-insurance eligibility.
- User-defined monthly budget.

A bounded binary search is appropriate only if affordability is monotonic over the allowed range.

Recommended algorithm:
1. Validate all input and rule data.
2. Establish lower and upper price bounds.
3. Evaluate the midpoint.
4. If affordable, search higher; otherwise search lower.
5. Stop when the interval is below a documented tolerance or the iteration cap is reached.
6. Re-evaluate the final candidate before returning it.
7. Return a structured no-result status if no positive candidate qualifies.

Never use an unbounded loop.

Important:
- Clearly specify whether the down payment is a fixed dollar amount or a percentage-based assumption.
- Fixed down-payment dollars change as a percentage of price.
- Test immediately below, at, and above every insurance or eligibility threshold.
- If property tax is modeled as a percentage of price, label it as an estimate.
- Use the same candidate-evaluation function for the search and displayed result.
- Ensure the candidate returned actually passes every active constraint.

## 9. State and Recalculation Flow

Use one central recalculation function.

```text
User edits a field
    ↓
Read and normalize all inputs
    ↓
Validate input object
    ↓
Invalid: show errors and mark old results as stale
    ↓
Valid: calculate affordability and scenario details
    ↓
Update values, assumptions, and charts
    ↓
Update accessible status message
```

Principles:
- Form controls are the source of truth for editable values.
- The normalized input object is the input to a calculation run.
- Results are derived data, not independent state.
- Do not mutate a result object after calculation.
- Never display an old successful result as if it matches currently invalid inputs.
- Keep scenario-comparison inputs separate from the main form.
- Reset must restore every field, error, chart, and result to documented defaults.

Add each event listener once. Avoid inline JavaScript event attributes. Debouncing is generally unnecessary for these small calculations; if added, ensure the displayed result cannot lag behind current inputs.

## 10. Validation and Error Handling

Use both HTML constraints and JavaScript validation.

Validate that:
- Required numeric fields are not blank.
- Values are finite numbers.
- Disallowed negative values, `NaN`, `Infinity`, and malformed numbers are rejected.
- Rate units are consistent.
- Amortization is in the supported range.
- Down payment, debts, and expenses are not negative.
- Missing optional values are distinguished from explicit zero.
- Gross monthly income is positive before calculating ratios.
- Invalid text is never silently coerced to zero.

For errors:
- Identify the field and explain how to fix it.
- Set `aria-invalid="true"` on invalid controls.
- Associate error text with inputs using `aria-describedby`.
- Do not show raw stack traces.
- Do not log personal financial inputs unnecessarily.

If a calculation fails or produces a non-finite value, stop rendering that result, preserve inputs, show a recoverable message, and keep the rest of the page usable.

## 11. Formatting

Centralize formatting functions. Example:

```js
const cadCurrencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0
});

const cadPreciseCurrencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2
});
```

If formatting percentages with `Intl.NumberFormat`, pass a decimal ratio such as `0.39`, not `39`, unless the helper explicitly expects whole percentage points.

- Use whole-dollar CAD formatting for headline values when appropriate.
- Use two decimals where needed for detailed breakdowns.
- Label monthly, annual, and one-time values clearly.
- Do not store formatted strings in calculation results.
- Avoid ambiguous amounts without a time period.

## 12. Charts

Charts are optional enhancements, not substitutes for readable numbers. If using Chart.js:
- Pin a compatible version.
- Update or destroy existing charts before replacement.
- Do not create a new chart on every input event without cleanup.
- Provide a textual equivalent of important chart information.
- Keep labels readable on narrow screens.
- Never rely on colour alone to convey status.
- Synchronize charts with the latest valid result.
- Handle invalid and no-result states gracefully.

Possible charts: monthly ownership-cost breakdown, housing cost versus income, and selected price-scenario comparison. Include only charts that add real understanding.

## 13. Privacy and Browser Storage

The initial version should work without an account or backend.
- Do not send income, debts, down payment, or other financial values to external services.
- Do not add analytics or tracking without explicit product approval and transparent disclosure.
- Do not store financial inputs in browser storage, cookies, or URL query parameters unless persistence is deliberately approved and clearly disclosed.
- Do not log financial inputs.
- Avoid remote API calls for calculations that can run locally.
- If local saving is added later, explain it and provide a clear reset/delete option.

Privacy claims must match actual behaviour, including hosting logs, analytics, storage, and external dependencies.

## 14. Accessibility

- Use semantic landmarks.
- Give every input a visible, programmatically associated label.
- Use suitable input types and `inputmode`.
- Make controls keyboard accessible with visible focus.
- Maintain sufficient contrast.
- Do not communicate affordability only through green/red colours.
- Use an `aria-live="polite"` region for important results and validation status.
- Ensure modals, dropdowns, and scenario controls work with keyboards and assistive technology.
- Respect reduced-motion preferences.
- Never use placeholder text as the only label.
- Provide textual equivalents for meaningful chart information.

## 15. Security and Robustness

- Prefer `textContent` over `innerHTML` for dynamic or user-controlled text.
- Never interpolate arbitrary input into HTML markup.
- Do not use `eval()` or `new Function()`.
- Avoid unnecessary third-party scripts.
- Pin reputable dependency versions.
- Do not put secrets or API keys in client code.
- Handle missing DOM elements without a cascade of confusing errors.
- Make sure external reference links point to the actual sources used.

## 16. Testing Strategy

The project is not complete until tests have actually been run. Do not claim success without running them.

### Mortgage unit tests
- Positive principal, rate, and amortization.
- Zero-interest mortgage.
- Zero principal.
- Negative or invalid principal.
- Zero or invalid amortization.
- Invalid, negative, and extreme rates.
- Periodic-rate conversion.
- Reverse calculation consistency.
- Larger principal increases payment, all else equal.
- Longer amortization lowers monthly payment for a positive-rate fixed-principal loan.

### Ownership-cost tests
- Property tax monthly calculation.
- Insurance, utilities, and maintenance included correctly.
- Total equals the sum of components.
- Optional values handled consistently.
- Valid inputs do not produce negative or non-finite outputs.

### GDS/TDS tests
- Zero income returns a controlled error or unavailable ratio.
- GDS uses housing costs and gross monthly income.
- TDS includes debt payments as specified.
- Ratios use one consistent unit convention.
- Ratios increase with costs and decrease with income, all else equal.

### Canadian rule tests
- Every tier boundary and values just below/above it.
- Price eligibility edges.
- Premium calculation and rounding.
- Missing/stale rule metadata handled transparently.
- Rule tables are internally consistent.

### Affordability tests
- Valid baseline scenario.
- No positive affordable result.
- Fixed-dollar down payment.
- Search terminates within iteration cap.
- Returned candidate passes all active constraints.
- A slightly higher candidate fails when expected under model assumptions.
- Results stay finite.
- Higher rates do not increase the maximum affordable price, all else equal.
- Higher income does not reduce the result, all else equal.
- Higher debts do not increase the result.
- Thresholds do not create unexplained discontinuities.

### Integration and browser tests
Verify:
- Editing any relevant input updates dependent results.
- Invalid values show useful errors.
- Correcting an error restores valid calculations.
- Reset restores documented defaults.
- Charts update without duplicate canvases.
- Scenario comparisons do not mutate the main scenario.
- Mobile controls work.
- Buttons do what their labels promise.
- Keyboard-only navigation works.
- Browser console has no uncaught errors.
- No-result and invalid-input states are understandable.

Document actual commands in `README.md` and `package.json`. For a Vitest project, possible commands are:

```bash
npm install
npm run dev
npm test
npm run build
```

Only document commands that exist. If no build step is configured, do not invent one.

## 17. Performance and Maintainability

- Prefer clarity and correctness over premature optimization.
- Avoid unnecessary frameworks or global state libraries.
- Do not duplicate calculation logic.
- Use descriptive names and consistent style.
- Comment financial conventions and non-obvious rules, not every line.
- Keep dependencies limited and justified.
- Do not make network requests on every input change.
- Ensure charts and listeners do not accumulate.
- Remove dead code and unused dependencies.
- Keep the browser console free of avoidable errors.

## 18. Documentation

`README.md` must explain:
- What the calculator does and does not do.
- How to run it locally.
- Installation and test commands.
- Project structure.
- Financial assumptions.
- Authoritative source links and verification dates for Canadian rules.
- How to safely change a rule.
- Known limitations.
- A disclaimer that results are estimates, not mortgage approval or personalized financial advice.

Keep a clear disclaimer visible in the app as well.

## 19. Implementation Sequence

1. Inspect the repository and read `AGENTS.md`, `FUNCTIONAL.md`, and this file.
2. Identify existing structure and missing functionality before editing.
3. Define normalized input and result contracts.
4. Implement and unit-test mortgage formulas.
5. Implement and test verified Canadian rules.
6. Implement and test monthly costs and ratios.
7. Implement and test bounded affordability search.
8. Implement validation and a central recalculation controller.
9. Build the accessible responsive UI.
10. Add result breakdowns and optional charts.
11. Test boundaries, invalid states, and recovery flows.
12. Verify source links and assumptions; update documentation.
13. Run the available tests and checks.
14. Fix issues found; do not stop at a mockup or plan.
15. Report changed files, features completed, tests actually run, results, and remaining limitations.

## 20. Definition of Technically Complete

- [ ] Calculations are separated from UI code.
- [ ] Inputs and outputs follow documented contracts.
- [ ] Units and financial conventions are consistent.
- [ ] Canadian rules are verified, sourced, dated, and configurable.
- [ ] Search algorithms are bounded and tested.
- [ ] Invalid inputs cannot silently produce plausible financial outputs.
- [ ] Results always correspond to the latest valid inputs.
- [ ] Charts, if included, update safely and accessibly.
- [ ] Desktop and mobile layouts work.
- [ ] Financial inputs are not sent externally or stored unexpectedly.
- [ ] Tests cover formulas, boundaries, and affordability constraints.
- [ ] Documentation matches actual behaviour.
- [ ] The visible disclaimer does not overstate accuracy.
- [ ] Every test reported as passed was actually run.

**Final instruction to the coding agent:** Build the working application, not just documentation or a visual prototype. If a technical or policy detail is uncertain, check authoritative sources, document the uncertainty, and do not invent a rule. Correctness, transparent assumptions, and maintainability take priority over adding features.
