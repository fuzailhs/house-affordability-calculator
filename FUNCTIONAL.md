# FUNCTIONAL.md — House Affordability Calculator

## Purpose

This document defines the functional behaviour of the Canadian House Affordability Calculator. Follow it alongside `AGENTS.md`.

**Priority:** correct calculations and reliable interactions come before visual polish. Every visible control must work. Do not use hard-coded demo results, fake calculations, or buttons that do nothing.

## 1. First Steps

1. Read `AGENTS.md` and inspect the current project before editing.
2. Keep the existing stack and structure when practical.
3. Implement and test the calculation functions separately from the UI.
4. Connect the tested calculation layer to all controls.
5. Test normal, boundary, invalid, and infeasible scenarios.
6. Update the README with the actual commands and assumptions.
7. Report honestly which checks were run and what remains incomplete.

## 2. Functional Requirements

### 2.1 Initial page load

When the page opens:

- Load sensible example inputs so the user can immediately see how the calculator works.
- Run validation and calculations using the same code path used for later edits.
- Display all results with proper CAD formatting.
- Show a short explanation that the result is an estimate, not a lender decision.
- Do not overwrite user-entered values unexpectedly.
- If optional local storage is implemented, handle malformed or outdated stored values safely and provide a reset option. Do not store personal financial inputs unless this behaviour is clearly disclosed.

### 2.2 Input controls

Implement inputs for:

- Annual household gross income
- Monthly recurring debt payments
- Optional other monthly living expenses
- Available down payment
- Annual mortgage interest rate
- Amortization period
- Canadian province or territory
- Annual property tax estimate
- Monthly home insurance
- Monthly heating cost
- Optional user-selected housing budget preference
- Optional maintenance allowance

Rules:

- Number fields accept only valid finite numbers.
- Empty fields are handled deliberately; do not convert them silently to zero if doing so would mislead the user.
- Values must be non-negative unless a field explicitly supports another range.
- Interest rate and amortization period must have documented valid bounds.
- Amortization selection must match one of the offered values.
- Every input has a visible label and useful helper text where needed.
- Errors appear beside the relevant field.
- The calculator must never display `NaN`, `Infinity`, or invalid currency.
- Sliders and number fields must stay synchronized in both directions.
- Editing one input must not unexpectedly reset unrelated inputs.

### 2.3 Recalculation

Whenever a valid input changes:

1. Read the current form values.
2. Validate all relevant values.
3. Recalculate mortgage assumptions and estimated monthly costs.
4. Re-run the affordability search.
5. Update result cards, ratios, warnings, scenario comparisons, and charts.
6. Keep all displayed numbers consistent with the same calculation result object.

Use a single calculation pipeline rather than separate formulas for the headline, chart, and scenario cards. Debounce only if genuinely needed; calculations should feel immediate.

If an input is invalid, clearly mark the input and do not display stale results as if they reflected the invalid value. Either show an explicit “Fix inputs to update estimate” state or a clearly labelled last-valid result.

## 3. Calculation Layer

Keep calculations in pure, testable functions. They should accept inputs and return values without directly changing the DOM.

Suggested structure:

```js
function convertAnnualRateToMonthlyRate(annualRate) {}
function calculateMonthlyMortgagePayment(principal, annualRate, years) {}
function calculateDownPaymentPercentage(price, downPayment) {}
function calculateMortgageInsurance(price, downPayment, rules) {}
function calculateMonthlyHousingCosts(inputs, purchasePrice) {}
function calculateGdsRatio(monthlyHousingCosts, grossMonthlyIncome) {}
function calculateTdsRatio(monthlyHousingCosts, monthlyDebtPayments, grossMonthlyIncome) {}
function validateInputs(inputs) {}
function evaluatePurchasePrice(inputs, purchasePrice, rules) {}
function findAffordablePurchasePrice(inputs, rules) {}
function calculateResults(inputs, rules) {}
```

These are interfaces to guide implementation, not empty functions to leave in the final app.

### 3.1 Mortgage payment

Use principal `P`, monthly interest rate `r`, and total monthly payments `n`:

- If `r > 0`: `payment = P * r / (1 - (1 + r) ** (-n))`
- If `r = 0`: `payment = P / n`
- If `P = 0`: payment is zero.

For a Canadian quoted nominal annual rate compounded semi-annually, use the equivalent monthly rate:

`r = (1 + annualRate / 2) ** (2 / 12) - 1`

`annualRate` is a decimal in the formula. Convert a percentage input to a decimal first. Document this convention.

Guard against invalid principal, rate, or term before calculating. The same payment function must be used by the main result, affordability search, and scenario comparison.

### 3.2 Purchase price and down payment

For a candidate purchase price:

- `downPaymentPercentage = downPayment / purchasePrice`
- `baseMortgage = purchasePrice - downPayment`
- Add mortgage default insurance to the mortgage only if it applies and the model explicitly assumes the premium is financed.
- Otherwise show the premium as a separate cost where appropriate.
- Validate the applicable Canadian minimum down payment requirements using current authoritative sources before encoding them.
- If the entered down payment does not satisfy the applicable requirement, return a structured eligibility warning. Do not silently treat the candidate as eligible.
- Do not allow a negative mortgage amount.

Keep jurisdictional rules in a clearly named configuration module or object. Include source URLs and a last-verified date for any rules that can change.

### 3.3 Monthly housing costs

Calculate and keep separate:

- Mortgage principal and interest
- Property tax (`annualPropertyTax / 12`)
- Home insurance
- Heating
- Optional maintenance allowance
- Other explicitly included housing costs

Return a structured object, for example:

```js
{
  mortgagePayment: 0,
  propertyTaxMonthly: 0,
  insuranceMonthly: 0,
  heatingMonthly: 0,
  maintenanceMonthly: 0,
  defaultInsuranceMonthlyEquivalent: 0,
  totalMonthlyHousingCost: 0
}
```

The example numbers above are placeholders for the data shape only; do not use them as real results. Do not double-count mortgage insurance. If an insurance premium is financed into principal, calculate the mortgage payment using the financed principal and do not also add the full premium as a monthly cost.

Make it clear which costs are included in the displayed total and which are excluded.

### 3.4 Affordability ratios

If gross monthly income is greater than zero:

- `GDS = qualifyingMonthlyHousingCosts / grossMonthlyIncome`
- `TDS = (qualifyingMonthlyHousingCosts + qualifyingMonthlyDebtPayments) / grossMonthlyIncome`

Represent ratios internally as decimals and format them as percentages in the UI.

Do not divide by zero. If income is zero, return an unavailable state rather than `NaN` or `Infinity`.

Document precisely which costs are included in qualifying housing costs. Do not include optional non-debt living expenses in GDS/TDS unless the chosen model explicitly requires it. Other living expenses can still be included in the user's personal cash-flow calculation.

If lender-style thresholds are used, verify the current definitions, qualifying rate, and thresholds with authoritative sources. Make the rules configurable and identify them as a screening estimate, not a universal guarantee of approval.

### 3.5 Monthly cash flow

Display the difference between gross monthly income and included costs only if the label makes the gross-income basis unmistakable. Prefer a separate personal-budget estimate based on **user-entered take-home income** if you want to show realistic cash remaining.

Do not subtract expenses from gross income and label the remainder “money left after tax” or “disposable income.” If only gross income is provided, use a label such as “Gross income remaining after listed costs — before income tax and unlisted expenses.”

If take-home income is added, make it a separate optional input and use it consistently for personal cash flow, not lender ratios.

### 3.6 Finding the affordable purchase price

Implement a bounded binary search or another well-tested numerical method. Do not use an arbitrary income multiplier.

For each candidate price:

1. Check price and down payment eligibility.
2. Calculate the down payment percentage.
3. Calculate any applicable mortgage default insurance using verified rules.
4. Calculate the mortgage principal and payment.
5. Estimate monthly housing costs.
6. Calculate any enabled GDS/TDS or user-budget constraints.
7. Mark the candidate affordable only if it satisfies all enabled constraints.

The search must:

- Use configurable lower and upper bounds.
- Stop when a defined price tolerance or iteration limit is reached.
- Return the highest candidate price that satisfies the chosen constraints within that tolerance.
- Never loop indefinitely.
- Handle no feasible purchase price with a clear unavailable result.
- Identify when the maximum search cap is reached.
- Avoid presenting a capped result as the true maximum.
- Avoid rounding intermediate values; round only for display.

Test boundary conditions around minimum down payment thresholds and any mortgage-insurance bracket changes. If insurance rules make the affordability function discontinuous, confirm that the search strategy still behaves correctly; use a robust bounded search or segment the search range when needed.

### 3.7 Recommended budget vs estimated maximum

If both are shown:

- **Estimated maximum:** highest price satisfying the explicitly selected model constraints.
- **Suggested planning budget:** a more conservative price selected using a clearly disclosed budget preference or margin.

Do not invent a “safe” maximum and present it as universally appropriate. Let users adjust their housing budget preference and explain the impact.

## 4. Result Rendering

Show a result state for each valid calculation:

- Estimated home price
- Estimated monthly mortgage payment
- Estimated total monthly housing cost
- Down payment amount and percentage
- Estimated mortgage amount
- Property tax, insurance, heating, and maintenance breakdown
- GDS/TDS, when enabled and available
- Any affordability or eligibility warnings
- The assumptions used

Use one shared result object as the source for all these UI elements.

Result rendering requirements:

- Format headline values as CAD.
- Use consistent decimal precision for percentages.
- Avoid contradictory values between cards, charts, and breakdowns.
- Show “Not available” with an explanation when a calculation cannot be completed.
- Do not substitute zero for an unavailable value.
- Provide a text summary of chart data.
- Keep warnings visible near the affected result.

## 5. Scenario Comparison

Offer a few comparison prices around the estimated affordable price, such as lower, near-estimate, and higher scenarios.

For every scenario, calculate all values through the same functions and assumptions as the main calculator. Show:

- Purchase price
- Down payment required or entered down payment, clearly distinguished
- Mortgage payment
- Total monthly housing cost
- Applicable ratios
- Eligibility or affordability status

Do not make up scenario results or use static example values after the user changes inputs. If the main affordable price is unavailable, show an explanatory empty state.

## 6. Charts

If Chart.js is used:

- Reuse or update existing chart instances instead of creating a new chart on every input event.
- Update the chart from the shared calculation result.
- Destroy chart instances when the page or component is cleaned up, if applicable.
- Ensure charts resize with the container.
- Include accessible labels and a nearby text summary or table.
- Do not make charts the only place a number appears.
- Avoid negative, non-finite, or stale chart data.
- If the library fails to load, keep the calculator usable and show numerical breakdowns.

Recommended charts:
1. Monthly housing cost breakdown.
2. Scenario comparison of home price vs monthly housing cost.

Do not add charts simply for decoration.

## 7. Province and Rule Selection

- Provide a working province/territory selector.
- Explain that the province alone is not enough to calculate exact property tax.
- Prefer a user-entered annual property tax amount.
- If province selection changes any default assumption, explain exactly what changed.
- Never imply that a province-based placeholder is a verified local tax quote.
- If property transfer tax or closing costs are added, verify current provincial and municipal rules, eligibility, exemptions, and rebate conditions from official sources.
- Do not invent rule values or present stale values as current.

If a rule cannot be verified, leave it as an editable user assumption instead of pretending it is authoritative.

## 8. Validation and Error States

Create a predictable validation model. Each validation result should identify the field, the problem, and a human-readable message.

Examples of conditions to handle:

- Empty required input
- Non-numeric text
- Negative income, debt, down payment, tax, insurance, or heating
- Invalid interest rate
- Unsupported amortization period
- Down payment greater than candidate purchase price
- Down payment below applicable minimum
- Zero income
- No feasible price under the selected constraints
- Search cap reached
- Missing or unverifiable rule configuration

When an input is invalid:

- Mark it accessibly as invalid.
- Explain how to fix it.
- Do not quietly convert it to zero.
- Do not present results from old inputs as current.
- Keep the rest of the page stable.

Do not use alert boxes for routine validation. Use inline messages and a concise summary if multiple errors exist.

## 9. Functional Buttons and Controls

Every visible control must have a real behaviour:

- **Calculate/update:** run the calculation pipeline. If updates are automatic, label the UI accordingly and do not leave a redundant button.
- **Reset:** restore all defaults, clear errors, and refresh results and charts.
- **Slider:** update its corresponding number input and recalculate.
- **Number input:** update its slider and recalculate when valid.
- **Province selector:** update relevant assumptions and explanations.
- **Amortization selector:** recalculate payment and affordability.
- **Budget preference control:** recalculate the recommended planning budget.
- **Scenario controls:** recalculate all scenario outputs.
- **Navigation links:** scroll to or open their actual destination.
- **Assumptions/help controls:** reveal the intended explanation accessibly.

Do not include a control unless its action is implemented. Do not add fake save, download, share, login, or notification buttons.

## 10. Accessibility and Responsive Behaviour

- Use semantic HTML.
- Label every form field.
- Support keyboard navigation.
- Provide visible focus indicators.
- Maintain readable contrast.
- Use accessible names for icon-only controls.
- Use `aria-live="polite"` selectively for important updated result summaries.
- Respect reduced-motion preferences.
- Prevent horizontal overflow on narrow screens.
- Keep controls large enough for touch input.
- Ensure errors are understandable without color.
- Keep the numerical results available if charts cannot render.

## 11. Testing

Write tests for the pure calculation functions wherever a test runner is available. If there is no test setup, add a lightweight test script or a clear manual verification procedure and execute it where practical.

### Mortgage payment tests

- Zero principal returns zero payment.
- Zero interest returns principal divided by monthly payment count.
- Positive rate returns a positive, finite payment for a positive principal.
- Higher interest produces a higher payment when principal and term are unchanged.
- Longer amortization produces a lower monthly payment when principal and rate are unchanged.
- Canadian rate conversion follows the documented convention.
- Invalid input is rejected or returns a documented error state.

### Affordability tests

- Increasing income does not lower the maximum affordable price when other conditions remain the same.
- Increasing existing debt does not raise the maximum affordable price.
- Increasing interest rate does not raise the maximum affordable price.
- Increasing property tax, heating, insurance, or included maintenance does not raise the maximum affordable price.
- Increasing down payment does not lower affordability when other assumptions remain unchanged, except where an explicitly documented rule discontinuity requires careful handling.
- Zero income returns an unavailable result rather than a non-finite number.
- No-feasible-price cases return an explanatory status.
- Search caps are reported honestly.
- Minimum down payment and insurance boundaries are tested.
- Scenario results agree with the same payment and cost functions used elsewhere.

### UI integration tests

- Initial defaults calculate correctly.
- Changing each input updates dependent results.
- Slider and numeric input stay synchronized.
- Reset restores defaults and clears errors.
- Invalid inputs display clear messages.
- No stale results are presented as current.
- Charts update without duplicate canvases or errors.
- The app remains useful without charts.
- Mobile layout has no horizontal overflow.
- Browser console has no errors during core flows.

Run available tests and fix failures. Report the commands actually run and their outcomes. Never say tests passed if they were not executed.

## 12. Financial Accuracy and Sources

The calculator is a planning aid, not a lender underwriting system.

Use authoritative current Canadian sources for any encoded legal, insurance, or lender-style rules, such as:

- Canada Mortgage and Housing Corporation (CMHC)
- Financial Consumer Agency of Canada (FCAC)
- Government of Canada
- Relevant provincial or municipal government websites

Record source URLs and last-verified dates next to the rule configuration and in the assumptions UI. If web access is unavailable, do not invent current values; leave assumptions configurable and clearly labelled.

Keep these separate:
- Personal budget estimate
- Lender-style ratio estimate
- Actual mortgage approval

Display a visible disclaimer that actual rates, eligibility, credit history, taxes, insurance, closing costs, and lender criteria may differ.

## 13. Definition of Done

Do not consider the task complete until:

- [ ] Every visible input and button works.
- [ ] Mortgage calculations are implemented and independently checked.
- [ ] The affordability search is bounded and handles no-solution cases.
- [ ] Canadian rule-based assumptions are verified or clearly labelled as configurable estimates.
- [ ] Main results, cost breakdowns, scenarios, and charts use consistent calculations.
- [ ] Validation is accessible and never produces `NaN` or `Infinity` in the UI.
- [ ] Reset restores the entire app to a consistent initial state.
- [ ] Responsive layout and keyboard interaction are checked.
- [ ] Tests were actually run and results reported.
- [ ] README explains how to run the app and the model's assumptions and limitations.
- [ ] No fake functionality or placeholder results remain.

## Final Instruction

Implement a complete functional application. Do not merely describe how to build it. If a feature depends on a rule that cannot be verified, implement it as a transparent, editable assumption and explain the limitation rather than inventing a value.
