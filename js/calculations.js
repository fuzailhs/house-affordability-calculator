"use strict";

/*
 * Canadian House Affordability Calculator — pure calculation layer.
 *
 * This module contains no DOM access and no UI logic. It accepts plain
 * numeric input objects and returns plain result objects so the same code
 * can be unit tested and reused by the UI layer.
 *
 * Canadian mortgage convention implemented here:
 *   Quoted annual mortgage rates are nominal annual rates compounded
 *   semi-annually. The equivalent monthly rate is:
 *     monthlyRate = (1 + annualRate / 2) ** (2 / 12) - 1
 *   where annualRate is a decimal (e.g. 0.05 for 5%).
 */

var MortgageRules = {
  sourceCheckedAt: "2026-10-24",
  sources: {
    cmhc: "https://www.cmhc-schl.gc.ca/",
    osfi: "https://www.osfi-bsif.gc.ca/",
    bankOfCanada: "https://www.bankofcanada.ca/",
    fcac: "https://www.fcac-acfc.gc.ca/"
  },
  minimumDownPayment: {
    // Homes priced at or below the first tier limit require the base rate.
    baseRatePercent: 5,
    // Homes priced above the tier limit require the base rate on the first
    // $500,000 and the second rate on the remainder (CMHC insured-mortgage rule).
    tieredThreshold: 500000,
    tieredSecondRatePercent: 10,
    // CMHC default mortgage insurance is available up to this price for
    // first-time buyers / new builds (raised from $1M to $1.5M effective Dec 2024).
    insuredMaxPrice: 1500000,
    // Homes above the insured cap require at least a 20% down payment.
    overInsuredMaxDownPercent: 20
  },
  mortgageInsurance: {
    requiredDownPaymentPercent: 20,
    // LTV bands (loan amount / purchase price) -> premium on the base mortgage.
    // Bands are (minLtv, maxLtv, premiumPercent); maxLtv is inclusive.
    bands: [
      { minLtv: 0, maxLtv: 0.8, premiumPercent: 0 },
      { minLtv: 0.8, maxLtv: 0.85, premiumPercent: 2.8 },
      { minLtv: 0.85, maxLtv: 0.9, premiumPercent: 3.1 },
      { minLtv: 0.9, maxLtv: 0.95, premiumPercent: 4.0 },
      { minLtv: 0.95, maxLtv: Infinity, premiumPercent: 4.5 }
    ],
    // Insured mortgages with an amortization beyond 25 years incur a surcharge.
    thirtyYearSurchargePercent: 0.2,
    maxAmortizationYears: 30
  },
  gdsThreshold: 0.39,
  tdsThreshold: 0.44,
  stressTest: {
    // OSFI Guideline B-20 / Mortgage stress test: greater of
    // (contract rate + buffer) or the floor. Floor is currently 5.25%.
    bufferPercent: 0.02,
    floorQualifyingRatePercent: 5.25,
    source: "https://www.osfi-bsif.gc.ca/en/supervision/financial-institutions/banks/minimum-qualifying-rate-uninsured-mortgages"
  },
  affordability: {
    priceCap: 2000000,
    tolerance: 0.5,
    maxIterations: 100
  }
};

function isFiniteNumber(value) {
  return typeof value === "number" && isFinite(value);
}

function convertAnnualRateToMonthlyRate(annualRate) {
  // annualRate is expressed as a percentage (e.g. 4.5 for 4.5%).
  // Convert to decimal (0.045) first, then to the equivalent monthly rate
  // for Canadian semi-annual compounding.
  var annualDecimal = annualRate / 100;
  if (annualDecimal <= 0) {
    return 0;
  }
  return Math.pow(1 + annualDecimal / 2, 2 / 12) - 1;
}

function calculateMonthlyMortgagePayment(principal, annualRate, amortizationYears) {
  if (!isFiniteNumber(principal) || principal < 0) {
    return null;
  }
  if (!isFiniteNumber(annualRate) || annualRate < 0) {
    return null;
  }
  if (!isFiniteNumber(amortizationYears) || amortizationYears <= 0) {
    return null;
  }
  var payments = amortizationYears * 12;
  var monthlyRate = convertAnnualRateToMonthlyRate(annualRate);
  if (principal <= 0) {
    return 0;
  }
  if (monthlyRate > 0) {
    var growth = Math.pow(1 + monthlyRate, payments);
    return (principal * monthlyRate * growth) / (growth - 1);
  }
  return principal / payments;
}

function calculatePrincipalFromPayment(payment, annualRate, amortizationYears) {
  if (!isFiniteNumber(payment) || payment <= 0) {
    return 0;
  }
  if (!isFiniteNumber(annualRate) || annualRate < 0) {
    return null;
  }
  if (!isFiniteNumber(amortizationYears) || amortizationYears <= 0) {
    return null;
  }
  var payments = amortizationYears * 12;
  var monthlyRate = convertAnnualRateToMonthlyRate(annualRate);
  if (monthlyRate > 0) {
    return (payment * (1 - Math.pow(1 + monthlyRate, -payments))) / monthlyRate;
  }
  return payment * payments;
}

function calculateDownPaymentPercentage(purchasePrice, downPayment) {
  if (!isFiniteNumber(purchasePrice) || purchasePrice <= 0) {
    return null;
  }
  if (!isFiniteNumber(downPayment) || downPayment < 0) {
    return null;
  }
  return (downPayment / purchasePrice) * 100;
}

function calculateMortgageInsurance(input, rules) {
  // input: { purchasePrice, downPayment, annualRatePercent, amortizationYears }
  var price = input.purchasePrice;
  var downPayment = input.downPayment;
  var baseMortgage = price - downPayment;
  var required = downPayment < (price * (rules.mortgageInsurance.requiredDownPaymentPercent / 100)) - 1e-9;
  var quote = {
    required: required,
    eligible: true,
    premium: 0,
    baseMortgage: baseMortgage,
    totalMortgage: baseMortgage,
    ratePercent: 0,
    reason: null
  };
  if (!required) {
    return quote;
  }
  if (price > rules.minimumDownPayment.insuredMaxPrice) {
    // price above the CMHC insured-mortgage cap (first-time buyers / new builds)
    quote.eligible = false;
    quote.reason = "purchase_price_above_insurable_cap";
    return quote;
  }
  if (input.amortizationYears > rules.mortgageInsurance.maxAmortizationYears) {
    quote.eligible = false;
    quote.reason = "amortization_uninsurable";
    return quote;
  }
  var ltv = baseMortgage / price;
  var premiumPercent = 0;
  var bandFound = false;
  for (var i = 0; i < rules.mortgageInsurance.bands.length; i += 1) {
    var band = rules.mortgageInsurance.bands[i];
    if (ltv > band.minLtv && ltv <= band.maxLtv) {
      premiumPercent = band.premiumPercent;
      bandFound = true;
      break;
    }
  }
  if (!bandFound) {
    quote.eligible = false;
    quote.reason = "ltv_band_not_found";
    return quote;
  }
  if (input.amortizationYears > 25) {
    premiumPercent = premiumPercent + rules.mortgageInsurance.thirtyYearSurchargePercent;
  }
  quote.ratePercent = premiumPercent;
  quote.premium = baseMortgage * (premiumPercent / 100);
  quote.totalMortgage = baseMortgage + quote.premium;
  return quote;
}

function getQualifyingRatePercent(annualRatePercent, rules) {
  var contractRate = annualRatePercent / 100;
  var stressed = contractRate + (rules.stressTest.bufferPercent * 100);
  return Math.max(stressed, rules.stressTest.floorQualifyingRatePercent);
}

function getMonthlyPropertyTax(inputs, purchasePrice) {
  var annualTax = inputs.annualPropertyTax;
  if (annualTax === null || annualTax === undefined) {
    annualTax = 0;
  }
  // Property taxes are entered as an annual amount and divided by 12.
  // They are not auto-scaled by price in this model; the user supplies the estimate.
  return annualTax / 12;
}

function calculateMonthlyHousingCosts(inputs, purchasePrice, rules) {
  var evaluated = evaluatePurchasePrice(inputs, purchasePrice, rules);
  var payments = inputs.amortizationYears * 12;
  var monthlyInsuranceEquivalent = 0;
  if (evaluated.mortgageInsurance.required) {
    monthlyInsuranceEquivalent = evaluated.mortgageInsurance.premium / payments;
  }
  var totalMonthlyHousingCost =
    evaluated.monthlyMortgagePayment +
    evaluated.monthlyPropertyTax +
    evaluated.monthlyHomeInsurance +
    evaluated.monthlyHeating +
    evaluated.monthlyMaintenance;
  var grossMonthlyIncome = inputs.grossAnnualIncome / 12;
  return {
    status: evaluated.status,
    purchasePrice: purchasePrice,
    downPayment: inputs.downPayment,
    downPaymentPercent: evaluated.downPaymentPercent,
    minimumDownPayment: evaluated.minimumDownPayment,
    baseMortgage: evaluated.baseMortgage,
    mortgageInsurance: evaluated.mortgageInsurance,
    totalMortgage: evaluated.totalMortgage,
    monthlyMortgagePayment: evaluated.monthlyMortgagePayment,
    defaultInsuranceMonthlyEquivalent: monthlyInsuranceEquivalent,
    monthlyPropertyTax: evaluated.monthlyPropertyTax,
    monthlyHomeInsurance: evaluated.monthlyHomeInsurance,
    monthlyHeating: evaluated.monthlyHeating,
    monthlyMaintenance: evaluated.monthlyMaintenance,
    totalMonthlyHousingCost: totalMonthlyHousingCost,
    grossMonthlyIncome: grossMonthlyIncome,
    monthlyDebtPayments: inputs.monthlyDebtPayments,
    monthlyNonHousingExpenses: inputs.monthlyNonHousingExpenses,
    estimatedMonthlyCashRemaining:
      grossMonthlyIncome - totalMonthlyHousingCost - inputs.monthlyDebtPayments - inputs.monthlyNonHousingExpenses,
    gdsRatio: calculateGdsRatio({ totalMonthlyHousingCost: totalMonthlyHousingCost }, grossMonthlyIncome),
    tdsRatio: calculateTdsRatio({ totalMonthlyHousingCost: totalMonthlyHousingCost }, inputs.monthlyDebtPayments, grossMonthlyIncome)
  };
}

function evaluatePurchasePrice(inputs, purchasePrice, rules) {
  if (!isFiniteNumber(purchasePrice) || purchasePrice < 0) {
    return { status: "invalid", purchasePrice: purchasePrice, reason: "invalid_price" };
  }
  var downPayment = inputs.downPayment;
  var baseMortgage = purchasePrice - downPayment;
  var minimumDownPayment = getMinimumDownPaymentAmount(purchasePrice, rules);
  var mortgageInsurance = calculateMortgageInsurance(
    {
      purchasePrice: purchasePrice,
      downPayment: downPayment,
      annualRatePercent: inputs.annualInterestRate,
      amortizationYears: inputs.amortizationYears
    },
    rules
  );
  var eligible = mortgageInsurance.eligible && downPayment >= minimumDownPayment - 1e-9;
  var status = eligible ? "ok" : "ineligible";
  var reason = eligible ? null : (mortgageInsurance.reason || "down_payment_below_minimum");
  var totalMortgage = mortgageInsurance.eligible ? mortgageInsurance.totalMortgage : baseMortgage;
  var monthlyMortgagePayment = calculateMonthlyMortgagePayment(totalMortgage, inputs.annualInterestRate, inputs.amortizationYears);
  var monthlyPropertyTax = getMonthlyPropertyTax(inputs, purchasePrice);
  var monthlyHousingCost =
    monthlyMortgagePayment + monthlyPropertyTax + inputs.monthlyHomeInsurance + inputs.monthlyHeating + inputs.monthlyMaintenance;
  var grossMonthlyIncome = inputs.grossAnnualIncome / 12;
  return {
    status: status,
    purchasePrice: purchasePrice,
    downPayment: downPayment,
    downPaymentPercent: calculateDownPaymentPercentage(purchasePrice, downPayment),
    minimumDownPayment: minimumDownPayment,
    baseMortgage: baseMortgage,
    mortgageInsurance: mortgageInsurance,
    totalMortgage: totalMortgage,
    monthlyMortgagePayment: monthlyMortgagePayment,
    monthlyPropertyTax: monthlyPropertyTax,
    monthlyHomeInsurance: inputs.monthlyHomeInsurance,
    monthlyHeating: inputs.monthlyHeating,
    monthlyMaintenance: inputs.monthlyMaintenance,
    totalMonthlyHousingCost: monthlyHousingCost,
    grossMonthlyIncome: grossMonthlyIncome,
    monthlyDebtPayments: inputs.monthlyDebtPayments,
    monthlyNonHousingExpenses: inputs.monthlyNonHousingExpenses,
    estimatedMonthlyCashRemaining:
      grossMonthlyIncome - monthlyHousingCost - inputs.monthlyDebtPayments - inputs.monthlyNonHousingExpenses,
    gdsRatio: calculateGdsRatio({ totalMonthlyHousingCost: monthlyHousingCost }, grossMonthlyIncome),
    tdsRatio: calculateTdsRatio({ totalMonthlyHousingCost: monthlyHousingCost }, inputs.monthlyDebtPayments, grossMonthlyIncome),
    reason: reason
  };
}

function getMinimumDownPaymentAmount(price, rules) {
  if (!isFiniteNumber(price) || price <= 0) {
    return 0;
  }
  var config = rules.minimumDownPayment;
  if (price > config.insuredMaxPrice) {
    return (price * config.overInsuredMaxDownPercent) / 100;
  }
  if (price <= config.tieredThreshold) {
    return (price * config.baseRatePercent) / 100;
  }
  return (
    (config.tieredThreshold * (config.baseRatePercent / 100)) +
    ((price - config.tieredThreshold) * (config.tieredSecondRatePercent / 100))
  );
}

function calculateGdsRatio(monthlyHousingCosts, grossMonthlyIncome) {
  var housingCost = monthlyHousingCosts && isFiniteNumber(monthlyHousingCosts.totalMonthlyHousingCost)
    ? monthlyHousingCosts.totalMonthlyHousingCost
    : null;
  if (!isFiniteNumber(grossMonthlyIncome) || grossMonthlyIncome <= 0) {
    return null;
  }
  if (housingCost === null) {
    return null;
  }
  return housingCost / grossMonthlyIncome;
}

function calculateTdsRatio(monthlyHousingCosts, monthlyDebtPayments, grossMonthlyIncome) {
  var housingCost = monthlyHousingCosts && isFiniteNumber(monthlyHousingCosts.totalMonthlyHousingCost)
    ? monthlyHousingCosts.totalMonthlyHousingCost
    : null;
  if (!isFiniteNumber(grossMonthlyIncome) || grossMonthlyIncome <= 0) {
    return null;
  }
  if (housingCost === null) {
    return null;
  }
  var debt = isFiniteNumber(monthlyDebtPayments) ? monthlyDebtPayments : 0;
  return (housingCost + debt) / grossMonthlyIncome;
}

function validateInputs(inputs) {
  var errors = [];
  function addError(field, message) {
    errors.push({ field: field, message: message });
  }
  var grossAnnualIncome = inputs ? inputs.grossAnnualIncome : null;
  if (!isFiniteNumber(grossAnnualIncome) || grossAnnualIncome < 0) {
    addError("grossAnnualIncome", "Enter your household's gross annual income in CAD.");
  } else if (grossAnnualIncome <= 0) {
    addError("grossAnnualIncome", "Gross annual income must be greater than zero to estimate an affordability price.");
  }
  var debt = inputs ? inputs.monthlyDebtPayments : null;
  if (!isFiniteNumber(debt) || debt < 0) {
    addError("monthlyDebtPayments", "Monthly debt payments must be a non-negative number in CAD.");
  }
  var nonHousing = inputs ? inputs.monthlyNonHousingExpenses : null;
  if (nonHousing === null || nonHousing === undefined) {
    // optional
  } else if (!isFiniteNumber(nonHousing) || nonHousing < 0) {
    addError("monthlyNonHousingExpenses", "Other monthly living expenses must be a non-negative number in CAD.");
  }
  var maintenance = inputs ? inputs.monthlyMaintenance : null;
  if (maintenance === null || maintenance === undefined) {
    // optional
  } else if (!isFiniteNumber(maintenance) || maintenance < 0) {
    addError("monthlyMaintenance", "Maintenance allowance must be a non-negative number in CAD.");
  }
  var tax = inputs ? inputs.annualPropertyTax : null;
  if (!isFiniteNumber(tax) || tax < 0) {
    addError("annualPropertyTax", "Annual property tax must be a non-negative number in CAD.");
  }
  var insurance = inputs ? inputs.monthlyHomeInsurance : null;
  if (!isFiniteNumber(insurance) || insurance < 0) {
    addError("monthlyHomeInsurance", "Monthly home insurance must be a non-negative number in CAD.");
  }
  var heating = inputs ? inputs.monthlyHeating : null;
  if (!isFiniteNumber(heating) || heating < 0) {
    addError("monthlyHeating", "Monthly heating cost must be a non-negative number in CAD.");
  }
  var downPayment = inputs ? inputs.downPayment : null;
  if (!isFiniteNumber(downPayment) || downPayment < 0) {
    addError("downPayment", "Available down payment must be a non-negative number in CAD.");
  }
  var rate = inputs ? inputs.annualInterestRate : null;
  if (!isFiniteNumber(rate) || rate < 0) {
    addError("annualInterestRate", "Mortgage interest rate must be a non-negative number.");
  } else if (rate > 50) {
    addError("annualInterestRate", "Mortgage interest rate must be between 0% and 50%.");
  }
  var amort = inputs ? inputs.amortizationYears : null;
  if (amort !== 15 && amort !== 20 && amort !== 25 && amort !== 30) {
    addError("amortizationYears", "Amortization must be one of: 15, 20, 25, or 30 years.");
  }
  var budget = inputs ? inputs.targetMonthlyHousingBudget : null;
  if (budget !== null && budget !== undefined && (!isFiniteNumber(budget) || budget < 0)) {
    addError("targetMonthlyHousingBudget", "Desired monthly housing budget must be a non-negative number in CAD.");
  }
  return { valid: errors.length === 0, errors: errors };
}

function findAffordablePurchasePrice(inputs, rules) {
  var validation = validateInputs(inputs);
  if (!validation.valid) {
    return { status: "invalid_input", estimatedMaximumHomePrice: null, bindingConstraint: null, searchCapReached: false };
  }
  var grossMonthlyIncome = inputs.grossAnnualIncome / 12;
  if (!(grossMonthlyIncome > 0)) {
    return { status: "invalid_input", estimatedMaximumHomePrice: null, bindingConstraint: null, searchCapReached: false };
  }
  var config = rules || MortgageRules;
  var tolerance = config.affordability ? config.affordability.tolerance : 0.5;
  var maxIterations = config.affordability ? config.affordability.maxIterations : 100;
  var priceCap = config.affordability ? config.affordability.priceCap : 2000000;

  function isAffordable(price) {
    var evaluation = evaluatePurchasePrice(inputs, price, config);
    if (evaluation.status !== "ok") {
      return false;
    }
    if (inputs.targetMonthlyHousingBudget !== null && inputs.targetMonthlyHousingBudget !== undefined) {
      if (evaluation.totalMonthlyHousingCost > inputs.targetMonthlyHousingBudget + 0.005) {
        return false;
      }
    }
    if (evaluation.gdsRatio > config.gdsThreshold + 1e-9) {
      return false;
    }
    if (evaluation.tdsRatio > config.tdsThreshold + 1e-9) {
      return false;
    }
    return true;
  }

  var lowerBound = Math.max(0, inputs.downPayment);
  var gdsBudgetMonthly = grossMonthlyIncome * config.gdsThreshold;
  var upperBound = inputs.downPayment + calculatePrincipalFromPayment(gdsBudgetMonthly, inputs.annualInterestRate, inputs.amortizationYears);
  upperBound = Math.min(upperBound, priceCap);
  if (upperBound < lowerBound) {
    upperBound = lowerBound;
  }

  if (!isAffordable(lowerBound)) {
    return { status: "no_affordable_price", estimatedMaximumHomePrice: null, bindingConstraint: "income_or_costs", searchCapReached: false };
  }
  var bestPrice = lowerBound;
  var capped = false;
  for (var i = 0; i < maxIterations; i += 1) {
    if (upperBound - lowerBound <= tolerance) {
      break;
    }
    var midpoint = lowerBound + (upperBound - lowerBound) / 2;
    if (isAffordable(midpoint)) {
      lowerBound = midpoint;
    } else {
      upperBound = midpoint;
    }
  }
  bestPrice = lowerBound;
  capped = upperBound >= priceCap - tolerance && isAffordable(priceCap);
  if (capped) {
    return { status: "search_cap", estimatedMaximumHomePrice: priceCap, bindingConstraint: "search_cap", searchCapReached: true };
  }
  var finalEvaluation = evaluatePurchasePrice(inputs, bestPrice, config);
  if (finalEvaluation.status !== "ok") {
    return { status: "no_affordable_price", estimatedMaximumHomePrice: null, bindingConstraint: "income_or_costs", searchCapReached: false };
  }
  var bindingConstraint = "monthly_affordability";
  if (inputs.targetMonthlyHousingBudget !== null && inputs.targetMonthlyHousingBudget !== undefined) {
    if (finalEvaluation.totalMonthlyHousingCost > config.gdsThreshold * grossMonthlyIncome) {
      bindingConstraint = "user_monthly_budget";
    }
  }
  if (finalEvaluation.gdsRatio > config.gdsThreshold) {
    bindingConstraint = "gross_debt_service";
  } else if (finalEvaluation.tdsRatio > config.tdsThreshold) {
    bindingConstraint = "total_debt_service";
  }
  return { status: "ok", estimatedMaximumHomePrice: bestPrice, bindingConstraint: bindingConstraint, searchCapReached: false };
}

function calculateResults(inputs, rules) {
  var config = rules || MortgageRules;
  var validation = validateInputs(inputs);
  var baseResult = {
    status: "invalid_input",
    errors: validation.errors,
    assumptions: [],
    warnings: [],
    estimatedMaximumHomePrice: null,
    bindingConstraint: null,
    searchCapReached: false,
    scenarios: []
  };
  if (!validation.valid) {
    return baseResult;
  }
  var affordability = findAffordablePurchasePrice(inputs, config);
  var result = {
    status: affordability.status,
    errors: validation.errors,
    assumptions: [],
    warnings: [],
    estimatedMaximumHomePrice: affordability.estimatedMaximumHomePrice,
    bindingConstraint: affordability.bindingConstraint,
    searchCapReached: affordability.searchCapReached,
    scenarios: []
  };
  if (affordability.status === "ok") {
    var evaluation = evaluatePurchasePrice(inputs, affordability.estimatedMaximumHomePrice, config);
    result.purchasePrice = affordability.estimatedMaximumHomePrice;
    result.downPayment = inputs.downPayment;
    result.downPaymentPercent = evaluation.downPaymentPercent;
    result.minimumDownPayment = evaluation.minimumDownPayment;
    result.baseMortgage = evaluation.baseMortgage;
    result.mortgageInsurance = evaluation.mortgageInsurance;
    result.totalMortgage = evaluation.totalMortgage;
    result.monthlyMortgagePayment = evaluation.monthlyMortgagePayment;
    result.monthlyPropertyTax = evaluation.monthlyPropertyTax;
    result.monthlyHomeInsurance = evaluation.monthlyHomeInsurance;
    result.monthlyHeating = evaluation.monthlyHeating;
    result.monthlyMaintenance = evaluation.monthlyMaintenance;
    result.totalMonthlyHousingCost = evaluation.totalMonthlyHousingCost;
    result.monthlyDebtPayments = inputs.monthlyDebtPayments;
    result.monthlyNonHousingExpenses = inputs.monthlyNonHousingExpenses;
    result.estimatedMonthlyCashRemaining = evaluation.estimatedMonthlyCashRemaining;
    result.grossMonthlyIncome = evaluation.grossMonthlyIncome;
    result.gdsRatio = evaluation.gdsRatio;
    result.tdsRatio = evaluation.tdsRatio;
    result.qualifyingMonthlyPayment = calculateMonthlyMortgagePayment(
      evaluation.totalMortgage,
      getQualifyingRatePercent(inputs.annualInterestRate, config),
      inputs.amortizationYears
    );
    result.warnings = [];
    if (inputs.downPayment > 0 && evaluation.minimumDownPayment > inputs.downPayment) {
      result.warnings.push({
        field: "downPayment",
        message: "The available down payment is below the CMHC minimum required for this purchase price. The estimate may not be lender-eligible."
      });
    }
    if (evaluation.mortgageInsurance.required && evaluation.mortgageInsurance.premium > 0) {
      result.warnings.push({
        field: "mortgageInsurance",
        message: "CMHC mortgage default insurance is required for this down payment. The model assumes the premium is financed into the mortgage."
      });
    }
    if (inputs.annualInterestRate > 0) {
      result.warnings.push({
        field: "annualInterestRate",
        message: "Mortgage rates are converted from the quoted nominal annual rate (compounded semi-annually) to an equivalent monthly rate for calculations."
      });
    }
  }
  // Scenarios around the estimated maximum.
  var factors = [0.85, 1.0, 1.25];
  var scenarios = [];
  for (var s = 0; s < factors.length; s += 1) {
    var scenarioPrice = Math.round(result.estimatedMaximumHomePrice * factors[s]);
    var scenarioEvaluation = evaluatePurchasePrice(inputs, scenarioPrice, config);
    scenarios.push({
      id: "scenario_" + s,
      label: factors[s] === 1.0 ? "Near estimate" : factors[s] > 1.0 ? "Higher" : "Lower",
      factor: factors[s],
      purchasePrice: scenarioPrice,
      status: scenarioEvaluation.status,
      reason: scenarioEvaluation.reason,
      mortgageInsurance: scenarioEvaluation.mortgageInsurance,
      totalMortgage: scenarioEvaluation.totalMortgage,
      monthlyMortgagePayment: scenarioEvaluation.monthlyMortgagePayment,
      totalMonthlyHousingCost: scenarioEvaluation.totalMonthlyHousingCost,
      gdsRatio: scenarioEvaluation.gdsRatio,
      tdsRatio: scenarioEvaluation.tdsRatio
    });
  }
  result.scenarios = scenarios;
  return result;
}

var MortgageApi = {
  MortgageRules: MortgageRules,
  convertAnnualRateToMonthlyRate: convertAnnualRateToMonthlyRate,
  calculateMonthlyMortgagePayment: calculateMonthlyMortgagePayment,
  calculatePrincipalFromPayment: calculatePrincipalFromPayment,
  calculateDownPaymentPercentage: calculateDownPaymentPercentage,
  calculateMortgageInsurance: calculateMortgageInsurance,
  calculateMonthlyHousingCosts: calculateMonthlyHousingCosts,
  calculateGdsRatio: calculateGdsRatio,
  calculateTdsRatio: calculateTdsRatio,
  validateInputs: validateInputs,
  evaluatePurchasePrice: evaluatePurchasePrice,
  findAffordablePurchasePrice: findAffordablePurchasePrice,
  calculateResults: calculateResults
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = MortgageApi;
}
