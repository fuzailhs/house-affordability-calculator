# Product Requirements Document (PRD)
## Canadian House Affordability Calculator

**Document status:** Initial product specification  
**Version:** 1.0  
**Product type:** Responsive, client-side web application  
**Primary market:** Canada

---

## 1. Product Overview

The Canadian House Affordability Calculator helps people in Canada estimate what home price may fit their financial situation. Users enter income, recurring debts, available down payment, mortgage assumptions, and estimated ownership costs. The app provides an understandable estimate of an affordable purchase price and explains the major costs and assumptions behind that estimate.

The product is an educational planning tool. It is not a mortgage approval, lending decision, financial guarantee, or substitute for advice from a qualified mortgage professional.

## 2. Problem Statement

People considering buying a home may find it difficult to understand how income, existing debt, down payment, interest rates, mortgage qualification rules, and ongoing housing costs interact. A simple mortgage-payment calculator does not show the full cost of owning a home or explain why a given purchase price may or may not be affordable.

This product brings those inputs together in one accessible interface and presents estimates in plain language.

## 3. Product Vision

Provide a clear, trustworthy, easy-to-use Canadian home affordability estimator that helps users compare home-price scenarios before they contact a lender or make a purchase decision.

## 4. Goals and Success Criteria

### 4.1 Product goals

- Estimate a plausible maximum home purchase price using the user's stated financial inputs and clearly disclosed assumptions.
- Show the estimated monthly mortgage payment and broader monthly homeownership costs.
- Explain the effect of existing debt, down payment, interest rate, amortization, and location-related assumptions.
- Help users compare multiple home-price or mortgage scenarios.
- Make calculations transparent enough that users can understand the main factors affecting the result.
- Work well on desktop, tablet, and mobile screens.
- Keep user-entered financial information private by performing calculations locally in the browser for the initial release.

### 4.2 Success criteria

The product is successful when:

1. A first-time user can enter the required information and obtain an estimate without needing technical knowledge.
2. Results clearly distinguish mortgage payments from other estimated ownership expenses.
3. The app explains important assumptions, limitations, and any missing information.
4. Identical valid inputs produce consistent results.
5. Invalid or incomplete inputs are identified clearly instead of silently producing misleading results.
6. The interface remains usable with keyboard navigation and on small screens.
7. Automated tests cover the main calculation logic, validation, and important boundary cases.
8. The app does not claim that its estimate guarantees mortgage approval or reflects a lender's final decision.

These are product acceptance goals, not claims that implementation or testing has already been completed.

## 5. Target Users

### Primary users
- People in Canada exploring whether they may be able to afford a home.
- First-time home buyers learning how down payment, debt, and mortgage costs affect affordability.
- Buyers comparing possible purchase prices or mortgage assumptions.

### User needs
Users need to:
- Enter financial information in familiar terms.
- Understand the estimated price range that fits the assumptions.
- See monthly costs in one place.
- Compare alternative scenarios.
- Know which values are estimates and which rules or assumptions affect the result.
- Understand that the output is preliminary and not a lender's approval.

## 6. Main User Journey

1. The user opens the calculator and sees a short explanation of what it estimates.
2. The user enters household gross annual income, recurring debt payments, available down payment, and mortgage assumptions.
3. The user chooses a province or territory where relevant to applicable estimates.
4. The user enters or reviews estimates for property tax, home insurance, utilities, maintenance, and other supported ownership costs.
5. The app validates the inputs and identifies anything that needs correction.
6. The app calculates an estimated affordable purchase price and supporting monthly cost breakdown.
7. The user reviews the affordability indicators, assumptions, and limitations.
8. The user adjusts one or more inputs to compare scenarios.
9. The user can reset the calculator and start again.

## 7. Product Scope

### 7.1 Minimum viable product (MVP)

The initial release should include:

- A responsive, accessible calculator interface.
- Inputs for household gross annual income.
- Inputs for recurring monthly debt payments.
- An available down payment input.
- Mortgage interest rate and amortization inputs.
- Province or territory selection when needed for location-dependent assumptions.
- Inputs or transparent defaults for property tax, home insurance, utilities, maintenance, and other included ownership costs.
- An estimated maximum affordable purchase price.
- Estimated monthly mortgage payment.
- A breakdown of estimated monthly ownership costs.
- Debt-service / affordability indicators when supported by verified Canadian assumptions.
- A clear explanation of the key assumptions used.
- Input validation, useful error messages, and sensible numeric bounds.
- A reset action.
- A way to adjust inputs and compare scenarios.
- Automated tests for financial calculations and key interactions.
- A README explaining how to run and test the application.

### 7.2 Optional enhancements, if feasible after the MVP

- Charts comparing principal-and-interest payments with other ownership costs.
- Side-by-side comparison of saved or temporary scenarios.
- A visual summary of affordability indicators.
- Download or print-friendly results.
- Additional contextual explanations for first-time buyers.

Optional enhancements must not delay correct calculations, clear assumptions, accessibility, or core testing.

### 7.3 Out of scope for the initial release

- Mortgage applications or mortgage pre-approval.
- Connecting to banks, credit bureaus, or financial accounts.
- Collecting, storing, or transmitting personal financial information to a server.
- User accounts, subscriptions, or payments.
- Legal, tax, or individualized financial advice.
- Guaranteeing a lender's decision or the availability of a particular mortgage.
- Automatically obtaining live property listings or real-estate market prices.
- Treating a single estimate as a definitive statement of what the user can afford.

## 8. Key Product Requirements

### 8.1 Inputs

The interface must clearly label each input, its units, and whether it is required or optional. It should explain defaults and avoid implying that an estimate is a verified value.

Expected inputs include:
- Gross annual household income.
- Total recurring monthly debt payments.
- Available down payment.
- Annual mortgage interest rate.
- Amortization period.
- Province or territory, where relevant.
- Estimated annual property tax or an equivalent clearly documented assumption.
- Estimated annual home insurance.
- Estimated monthly utilities.
- Estimated maintenance or other included monthly ownership costs.

The implementation may include additional inputs where required by the functional and technical specifications. It must not require users to supply sensitive identifiers such as a Social Insurance Number.

### 8.2 Results

The results area must show, where calculable:
- Estimated maximum affordable home price.
- Estimated down payment and mortgage principal at that price.
- Estimated monthly mortgage payment.
- Estimated monthly property tax, insurance, utilities, maintenance, and other included costs.
- Total estimated monthly homeownership cost.
- Affordability ratios or qualification indicators used by the calculator.
- A plain-language explanation of the key factors or constraints affecting the estimate.
- Assumptions, exclusions, and a clear disclaimer.

Do not present a result as more precise than the inputs or assumptions justify. Clearly label estimates and round values consistently.

### 8.3 Scenario comparison

Users should be able to change inputs and see the resulting estimates update reliably. If side-by-side scenarios are implemented, each scenario must display its assumptions so that users do not compare results based on hidden differences.

### 8.4 Validation and errors

- Reject or clearly flag missing required inputs, non-numeric values, impossible values, and values outside supported bounds.
- Prevent invalid inputs from creating `NaN`, infinite values, crashes, or misleading results.
- Explain how to correct an invalid value in plain language.
- Handle edge cases such as zero debt, a zero or very low interest rate if supported, a down payment near the purchase price, and cases where the entered income cannot support a positive estimated purchase price.
- Never silently substitute a material financial assumption without making it visible to the user.

## 9. Canadian Accuracy and Trust

Canadian mortgage rules and costs may change. Any rules used to calculate affordability—such as minimum down-payment requirements, mortgage default insurance, maximum amortization eligibility, mortgage stress-test treatment, and debt-service limits—must be checked against current, authoritative Canadian sources before release.

Preferred sources include:
- Canada Mortgage and Housing Corporation (CMHC).
- Financial Consumer Agency of Canada (FCAC).
- Relevant Government of Canada and provincial or territorial government sources.
- Official regulator or lender material where appropriate to a clearly identified assumption.

The product must:
- Record or link to sources for material rules.
- State the date or version of rule verification in project documentation.
- Distinguish legal or program rules from simplifying calculator assumptions.
- Avoid presenting a general estimate as a lender-specific underwriting decision.
- Handle mortgage default insurance premiums and their effect on the mortgage balance according to the verified rules used by the implementation.
- Document how Canadian mortgage interest-rate conventions are applied.
- Clearly identify which costs are user-provided and which are estimated or defaulted.

If a rule cannot be verified, do not invent it. Exclude it from the calculation or label the limitation and obtain an authoritative source before release.

## 10. UX, Accessibility, and Design

The app should feel clear, calm, trustworthy, and approachable—not like a bank application or a sales funnel.

Requirements:
- Responsive layout for mobile, tablet, and desktop.
- Plain-language headings and help text.
- Currency displayed in Canadian dollars (CAD) unless an explicitly supported alternative is added.
- Consistent formatting for currency, percentages, and time periods.
- Logical keyboard navigation and visible focus states.
- Accessible labels and error messages for form controls.
- Adequate text contrast and no reliance on colour alone to communicate status.
- Charts, if included, must have accessible labels or an equivalent text summary.
- Avoid clutter, unexplained financial jargon, and false precision.

## 11. Privacy and Security

For the initial release, calculations should run entirely in the user's browser. Financial inputs should not be sent to a backend or third-party analytics service.

- Do not ask for sensitive identity or account credentials.
- Do not store personal financial inputs persistently unless a future, explicit product requirement is approved and disclosed.
- Do not include real user financial data in logs, tests, screenshots, or example content.
- If analytics are added later, review what is collected and disclose it appropriately.
- Use safe, maintained dependencies and avoid unnecessary third-party scripts.

## 12. Technical Direction

The PRD defines product intent; implementation details belong in `TECHNICAL.md` and project instructions belong in `AGENTS.md`.

The planned initial implementation is a browser-based app using HTML, CSS, JavaScript ES modules, and Bootstrap 5, with Chart.js only if charts are useful. A backend is not required for the initial calculator.

The implementation must follow the detailed technical and functional documents, keep financial calculations separate from UI code, and use automated tests for calculation correctness. The chosen stack may be adjusted if the existing repository provides a sound reason, but any change should be documented and must preserve the product requirements.

## 13. Acceptance Criteria

The MVP is ready for release only when:

- [ ] The core user journey works from entering inputs to reviewing results.
- [ ] The affordable-price estimate and monthly payment calculations are covered by automated tests.
- [ ] Canadian-specific rules used in calculations are verified against authoritative sources and documented.
- [ ] Required inputs and boundary cases are validated.
- [ ] The app explains assumptions, limitations, and the non-approval disclaimer.
- [ ] Monthly costs are broken down clearly and not double-counted.
- [ ] Scenario changes recalculate results consistently.
- [ ] The app works on common mobile and desktop viewport sizes.
- [ ] Core form controls are keyboard accessible and have meaningful labels.
- [ ] No financial inputs are transmitted to a server in the initial client-side release.
- [ ] The README includes setup, run, and test instructions.
- [ ] The final implementation report states which tests actually ran and their real outcomes.

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Out-of-date Canadian mortgage rules | Verify against authoritative sources and document verification date. |
| Users mistake the estimate for approval | Use clear disclaimers and explain lender-specific differences. |
| Missing costs make affordability appear higher than it is | Show a full cost breakdown and identify omitted or estimated expenses. |
| Incorrect financial formulas | Separate calculation logic, use known examples, and add boundary and regression tests. |
| Hidden defaults mislead users | Display defaults and explain how they affect the result. |
| Poor mobile or accessibility experience | Test responsive layouts, keyboard use, labels, focus, and contrast. |
| Financial data exposure | Keep calculations client-side and avoid transmitting or persistently storing inputs. |

## 15. Relationship to Other Project Documents

- `PRD.md` — why the product exists, who it serves, its goals, scope, and release criteria.
- `FUNCTIONAL.md` — detailed feature behaviour, input/output rules, validation, and expected user interactions.
- `TECHNICAL.md` — architecture, calculation implementation, technical constraints, testing approach, and implementation details.
- `AGENTS.md` — project-wide instructions and standards for coding agents working in the repository.

These documents complement one another. If details conflict, do not silently choose a convenient interpretation: identify the conflict, follow any explicit project priority rules, and document or resolve the decision before implementing affected behaviour.
