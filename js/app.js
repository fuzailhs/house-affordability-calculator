"use strict";

(function () {
  "use strict";

  var DEFAULT_PROVINCE = "ON";
  var PROVINCES = [
    "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"
  ];
  var PROVINCE_DEFAULT_PROPERTY_TAX = {
    AB: 2200,
    BC: 2400,
    MB: 2100,
    NB: 2000,
    NL: 2400,
    NS: 2000,
    NT: 2000,
    NU: 2200,
    ON: 3000,
    PE: 2200,
    QC: 2800,
    SK: 2200,
    YT: 2200
  };

  var FIELD_DEFS = {
    grossAnnualIncome: { elementId: "income-annual", kind: "number", required: true, min: 0, step: 5000, defaultValue: 120000 },
    monthlyDebtPayments: { elementId: "debt-monthly", kind: "number", required: true, min: 0, step: 50, defaultValue: 450 },
    monthlyNonHousingExpenses: { elementId: "living-monthly", kind: "number", required: false, min: 0, step: 50, defaultValue: 0 },
    monthlyMaintenance: { elementId: "maintenance-monthly", kind: "number", required: false, min: 0, step: 50, defaultValue: 250 },
    annualPropertyTax: { elementId: "tax-annual", kind: "number", required: true, min: 0, step: 500, defaultValue: 3000 },
    monthlyHomeInsurance: { elementId: "insurance-monthly", kind: "number", required: true, min: 0, step: 10, defaultValue: 150 },
    monthlyHeating: { elementId: "heating-monthly", kind: "number", required: false, min: 0, step: 10, defaultValue: 100 },
    annualInterestRate: { elementId: "rate-annual", kind: "number", required: true, min: 0, max: 50, step: 0.05, defaultValue: 4.5 },
    amortizationYears: { elementId: "amortization", kind: "select", options: [15, 20, 25, 30], defaultValue: 25 },
    downPayment: { elementId: "down-payment", kind: "number", required: true, min: 0, step: 5000, defaultValue: 90000 },
    targetMonthlyHousingBudget: { elementId: "budget-monthly", kind: "number", required: false, min: 0, step: 50, defaultValue: null }
  };

  var currentResult = null;

  function getEl(id) {
    return document.getElementById(id);
  }

  function populateDefaults() {
    Object.keys(FIELD_DEFS).forEach(function (key) {
      var def = FIELD_DEFS[key];
      var el = getEl(def.elementId);
      if (!el) {
        return;
      }
      el.value = String(def.defaultValue);
    });
    var province = getEl("province-select");
    if (province) {
      province.value = DEFAULT_PROVINCE;
    }
    var taxInput = getEl("tax-annual");
    if (taxInput) {
      taxInput.value = String(PROVINCE_DEFAULT_PROPERTY_TAX[DEFAULT_PROVINCE]);
    }
  }

  function readInputs() {
    var inputs = {};
    Object.keys(FIELD_DEFS).forEach(function (key) {
      var def = FIELD_DEFS[key];
      var el = getEl(def.elementId);
      var raw = el ? String(el.value || "").trim() : "";
      var parsed = raw === "" ? null : Number(raw);
      var value = parsed;
      if (value === null) {
        value = def.required ? null : def.defaultValue;
      }
      if (def.kind === "select") {
        value = Number(el.value);
      }
      inputs[key] = value;
    });
    var province = getEl("province-select");
    inputs.provinceCode = province ? province.value : DEFAULT_PROVINCE;
    return inputs;
  }

  function setFieldError(key, message) {
    var el = getEl("err-" + key);
    var fieldEl = null;
    var def = FIELD_DEFS[key];
    if (def) {
      fieldEl = getEl(def.elementId);
    }
    if (el) {
      if (message) {
        el.textContent = message;
        el.hidden = false;
      } else {
        el.textContent = "";
        el.hidden = true;
      }
    }
    if (fieldEl) {
      fieldEl.setAttribute("aria-invalid", message ? "true" : "false");
    }
  }

  function clearAllFieldErrors() {
    Object.keys(FIELD_DEFS).forEach(function (key) {
      setFieldError(key, null);
    });
  }

  function runCalculation() {
    var inputs = readInputs();
    var validation = MortgageApi.validateInputs(inputs);
    Object.keys(FIELD_DEFS).forEach(function (key) {
      var error = validation.errors.filter(function (e) { return e.field === key; })[0];
      setFieldError(key, error ? error.message : null);
    });
    var result = MortgageApi.calculateResults(inputs, MortgageApi.MortgageRules);
    renderResults(result);
    return result;
  }

  function setText(id, text) {
    var el = getEl(id);
    if (el) {
      el.textContent = text === null || text === undefined ? "—" : String(text);
    }
  }

  function formatPercentValue(ratio) {
    if (ratio === null || ratio === undefined || !isFinite(ratio)) {
      return "—";
    }
    return (ratio * 100).toFixed(2) + "%";
  }

  function describeBindingConstraint(binding) {
    if (!binding) {
      return "Not available";
    }
    var labels = {
      monthly_affordability: "Limited by monthly affordability.",
      user_monthly_budget: "Limited by the user-selected monthly housing budget.",
      gross_debt_service: "Limited by the gross debt service threshold.",
      total_debt_service: "Limited by the total debt service threshold.",
      search_cap: "The maximum affordable price reached the configured search cap.",
      income_or_costs: "No positive price satisfied the current inputs."
    };
    return labels[binding] || "Not available";
  }

  function renderStatus(result) {
    var statusEl = getEl("result-status");
    var statusTitle = getEl("result-status-title");
    var statusBody = getEl("result-status-body");
    if (!statusEl) {
      return;
    }
    if (result.status === "ok") {
      statusEl.setAttribute("role", "status");
      if (statusTitle) statusTitle.textContent = "Estimate ready";
      if (statusBody) statusBody.textContent = "Estimated affordable home price calculated from your inputs.";
      statusEl.setAttribute("aria-live", "polite");
    } else if (result.status === "invalid_input") {
      statusEl.setAttribute("role", "alert");
      if (statusTitle) statusTitle.textContent = "Check your inputs";
      if (statusBody) statusBody.textContent = "Some required inputs need attention before an estimate can be calculated.";
      statusEl.setAttribute("aria-live", "polite");
    } else if (result.status === "no_affordable_price") {
      statusEl.setAttribute("role", "status");
      if (statusTitle) statusTitle.textContent = "No affordable price found";
      if (statusBody) statusBody.textContent = "No positive purchase price satisfies the current inputs and affordability constraints. Try increasing income, reducing debt, or increasing the down payment.";
      statusEl.setAttribute("aria-live", "polite");
    } else if (result.status === "search_cap") {
      statusEl.setAttribute("role", "status");
      if (statusTitle) statusTitle.textContent = "Estimate at search cap";
      if (statusBody) statusBody.textContent = "The affordability search reached its configured price cap. The estimate may be higher than shown.";
      statusEl.setAttribute("aria-live", "polite");
    }
  }

  function buildCostRow(row) {
    var rowEl = document.createElement("div");
    rowEl.className = "cost-row";
    var label = document.createElement("span");
    label.className = "cost-label";
    label.textContent = row.label;
    if (row.note) {
      var note = document.createElement("span");
      note.className = "cost-note";
      note.textContent = row.note;
      label.appendChild(note);
    }
    var value = document.createElement("span");
    value.className = "cost-value";
    value.textContent = formatCurrencyMonthly(row.value);
    rowEl.appendChild(label);
    rowEl.appendChild(value);
    return rowEl;
  }

  function renderCostBreakdown(result) {
    var container = getEl("cost-breakdown");
    if (!container) {
      return;
    }
    container.innerHTML = "";
    if (result.status !== "ok") {
      var p0 = document.createElement("p");
      p0.textContent = "Cost breakdown is available once a valid estimate is produced.";
      container.appendChild(p0);
      return;
    }
    var rows = [
      { label: "Mortgage principal and interest", value: result.monthlyMortgagePayment },
      { label: "Mortgage default insurance (financed into mortgage)", value: result.mortgageInsurance.premium, note: "Assumed financed." },
      { label: "Property tax", value: result.monthlyPropertyTax },
      { label: "Home insurance", value: result.monthlyHomeInsurance },
      { label: "Heating cost", value: result.monthlyHeating },
      { label: "Maintenance allowance", value: result.monthlyMaintenance }
    ];
    rows.forEach(function (row) {
      container.appendChild(buildCostRow(row));
    });
    var total = document.createElement("div");
    total.className = "cost-row cost-total";
    var totalLabel = document.createElement("span");
    totalLabel.className = "cost-label";
    totalLabel.textContent = "Total monthly housing cost";
    var totalValue = document.createElement("span");
    totalValue.className = "cost-value";
    totalValue.textContent = formatCurrencyMonthly(result.totalMonthlyHousingCost);
    total.appendChild(totalLabel);
    total.appendChild(totalValue);
    container.appendChild(total);
  }

  function renderScenarios(result) {
    var section = getEl("scenarios");
    var tableBody = getEl("scenario-tbody");
    if (!section || !tableBody) {
      return;
    }
    if (result.status !== "ok" || !result.estimatedMaximumHomePrice) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    var summaryEl = getEl("scenario-summary");
    if (summaryEl) {
      summaryEl.textContent = result.scenarios
        .map(function (s) { return formatCurrency(s.purchasePrice) + " — " + formatCurrencyMonthly(s.totalMonthlyHousingCost); })
        .join("  ·  ");
    }
    tableBody.innerHTML = "";
    result.scenarios.forEach(function (s) {
      var tr = document.createElement("tr");
      function cell(text) { var td = document.createElement("td"); td.textContent = text; return td; }
      tr.appendChild(cell(s.label));
      tr.appendChild(cell(formatCurrency(s.purchasePrice)));
      tr.appendChild(cell(formatCurrency(s.mortgageInsurance ? s.mortgageInsurance.baseMortgage : 0)));
      tr.appendChild(cell(formatCurrency(s.totalMortgage)));
      tr.appendChild(cell(formatCurrencyMonthly(s.monthlyMortgagePayment)));
      tr.appendChild(cell(formatCurrencyMonthly(s.totalMonthlyHousingCost)));
      tr.appendChild(cell(s.gdsRatio ? formatPercent(s.gdsRatio) : "—"));
      tr.appendChild(cell(s.status === "ok" ? "Affordable" : "Ineligible"));
      tableBody.appendChild(tr);
    });
  }

  function drawScenarioChart(scenarios) {
    var canvas = getEl("scenarioChart");
    if (!canvas) {
      return;
    }
    var ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    var width = canvas.clientWidth || 640;
    var height = 280;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!scenarios || scenarios.length < 2) {
      ctx.fillStyle = "#5b6470";
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Chart requires at least two scenarios.", width / 2, height / 2);
      return;
    }
    var costs = scenarios.map(function (s) { return s.totalMonthlyHousingCost; });
    var maxCost = Math.max.apply(null, costs);
    var top = maxCost > 0 ? maxCost * 1.15 : 1;
    var padL = 76;
    var padR = 18;
    var padT = 18;
    var padB = 46;
    var plotW = width - padL - padR;
    var plotH = height - padT - padB;
    var xAt = function (i) { return padL + (i * plotW) / (scenarios.length - 1); };
    var yAt = function (c) { return padT + plotH - (c / top) * plotH; };
    ctx.strokeStyle = "#e5e2dc";
    ctx.fillStyle = "#5b6470";
    ctx.lineWidth = 1;
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "right";
    for (var i = 0; i <= 4; i += 1) {
      var value = (top / 4) * i;
      var y = yAt(value);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      ctx.fillText(formatCurrency(value), padL - 8, y + 4);
    }
    ctx.textAlign = "center";
    for (var j = 0; j < scenarios.length; j += 1) {
      ctx.fillText(scenarios[j].label, xAt(j), height - padB + 18);
    }
    ctx.beginPath();
    ctx.moveTo(xAt(0), yAt(costs[0]));
    for (var k = 1; k < costs.length; k += 1) {
      ctx.lineTo(xAt(k), yAt(costs[k]));
    }
    ctx.strokeStyle = "#0d9488";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#0d9488";
    for (var m = 0; m < costs.length; m += 1) {
      ctx.beginPath();
      ctx.arc(xAt(m), yAt(costs[m]), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = "left";
  }

  function renderCharts(result) {
    drawScenarioChart(result ? result.scenarios : []);
  }

  function renderResults(result) {
    renderStatus(result);
    var heroEl = getEl("result-hero");
    if (result.status === "ok") {
      if (heroEl) heroEl.hidden = false;
      setText("resPrice", formatCurrency(result.estimatedMaximumHomePrice));
      setText("resPriceNote", "Estimated maximum under the current model.");
    } else if (heroEl) {
      heroEl.hidden = true;
    }
    setText("resBinding", describeBindingConstraint(result.bindingConstraint));
    var metrics = [
      { id: "resMonthlyPayment", value: result.monthlyMortgagePayment, formatter: formatCurrencyMonthly },
      { id: "resMortgageAmount", value: result.totalMortgage, formatter: formatCurrency },
      { id: "resDownPaymentAmount", value: result.downPayment, formatter: formatCurrency },
      { id: "resDownPaymentPct", value: result.downPaymentPercent, formatter: formatPercentValue },
      { id: "resHousingCost", value: result.totalMonthlyHousingCost, formatter: formatCurrencyMonthly },
      { id: "resPropertyTax", value: result.monthlyPropertyTax, formatter: formatCurrencyMonthly },
      { id: "resHomeInsurance", value: result.monthlyHomeInsurance, formatter: formatCurrencyMonthly },
      { id: "resHeating", value: result.monthlyHeating, formatter: formatCurrencyMonthly },
      { id: "resMaintenance", value: result.monthlyMaintenance, formatter: formatCurrencyMonthly },
      { id: "resCashRemaining", value: result.estimatedMonthlyCashRemaining, formatter: formatCurrencyMonthly },
      { id: "resGds", value: result.gdsRatio, formatter: formatPercent },
      { id: "resTds", value: result.tdsRatio, formatter: formatPercent },
      { id: "resQualifyingPayment", value: result.qualifyingMonthlyPayment, formatter: formatCurrencyMonthly }
    ];
    metrics.forEach(function (m) {
      setText(m.id, m.formatter ? m.formatter(m.value) : "—");
    });
    var metricsGrid = getEl("resMetrics");
    if (metricsGrid) {
      metricsGrid.hidden = result.status !== "ok";
    }
    var warningsEl = getEl("result-warnings");
    if (warningsEl) {
      warningsEl.innerHTML = "";
      var list = document.createElement("ul");
      var warnings = result.warnings || [];
      if (result.status !== "ok") {
        var liStatus = document.createElement("li");
        liStatus.textContent = "Results are not available for the current inputs.";
        list.appendChild(liStatus);
      } else if (warnings.length === 0) {
        var liOk = document.createElement("li");
        liOk.textContent = "No warnings for the current estimate.";
        list.appendChild(liOk);
      }
      warnings.forEach(function (w) {
        var li = document.createElement("li");
        li.textContent = w.message;
        list.appendChild(li);
      });
      warningsEl.appendChild(list);
    }
    renderCostBreakdown(result);
    renderScenarios(result);
    renderCharts(result);
  }

  function setupEventListeners() {
    Object.keys(FIELD_DEFS).forEach(function (key) {
      var def = FIELD_DEFS[key];
      var el = getEl(def.elementId);
      if (!el) {
        return;
      }
      var handler = function () {
        runCalculation();
      };
      el.addEventListener("change", handler);
      el.addEventListener("input", handler);
    });
    var province = getEl("province-select");
    if (province) {
      province.addEventListener("change", function () {
        var taxInput = getEl("tax-annual");
        if (taxInput) {
          taxInput.value = String(PROVINCE_DEFAULT_PROPERTY_TAX[province.value] || PROVINCE_DEFAULT_PROPERTY_TAX[DEFAULT_PROVINCE]);
        }
        runCalculation();
      });
    }
    var reset = getEl("reset-button");
    if (reset) {
      reset.addEventListener("click", function () {
        populateDefaults();
        clearAllFieldErrors();
        currentResult = runCalculation();
      });
    }
    window.addEventListener("resize", function () {
      renderCharts(currentResult);
    });
  }

  function init() {
    populateDefaults();
    setupEventListeners();
    currentResult = runCalculation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
