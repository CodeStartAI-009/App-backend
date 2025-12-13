// utils/countryCurrency.js
const { countries, currencies } = require("country-data");

function getCurrencyByCountryCode(countryCode) {
  const country = countries[countryCode];

  if (!country || !country.currencies || country.currencies.length === 0) {
    return null;
  }

  const currencyCode = country.currencies[0];
  const currency = currencies[currencyCode];

  return {
    currency: currencyCode,
    symbol: currency?.symbol || "",
    name: currency?.name || "",
  };
}

module.exports = {
  getCurrencyByCountryCode,
};
