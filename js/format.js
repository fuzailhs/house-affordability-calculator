"use strict";

function isFiniteNumber(value) {
  return typeof value === "number" && isFinite(value);
}

var CurrencyFormatters = {
  whole: new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0
  }),
  monthly: new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }),
  percent: new Intl.NumberFormat("en-CA", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
};

function formatCurrency(amount) {
  var value = Number(amount);
  if (!isFinite(value)) {
    return "—";
  }
  return CurrencyFormatters.whole.format(value);
}

function formatCurrencyMonthly(amount) {
  var value = Number(amount);
  if (!isFinite(value)) {
    return "—";
  }
  return CurrencyFormatters.monthly.format(value);
}

function formatPercent(ratio) {
  if (ratio === null || ratio === undefined || !isFinite(ratio)) {
    return "—";
  }
  return CurrencyFormatters.percent.format(ratio);
}

var FormatApi = {
  formatCurrency: formatCurrency,
  formatCurrencyMonthly: formatCurrencyMonthly,
  formatPercent: formatPercent
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = FormatApi;
}
