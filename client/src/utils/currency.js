/**
 * Indian Currency Formatting Utility
 * Converts all values to ₹ with Indian numbering (Lakhs, Crores)
 */

/**
 * Format a number as Indian currency with ₹
 * @param {number} value - The numeric value
 * @param {object} options
 * @param {boolean} options.compact - Use Lakhs/Crores format (default: true for large numbers)
 * @param {boolean} options.showSymbol - Show ₹ prefix (default: true)
 * @param {number} options.decimals - Decimal places (default: 0)
 * @returns {string}
 */
export function formatINR(value, options = {}) {
  if (value == null || isNaN(value)) return '₹0';
  
  const { compact = Math.abs(value) >= 100000, showSymbol = true, decimals = 0 } = options;
  const symbol = showSymbol ? '₹' : '';
  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (compact && absVal >= 10000000) {
    // Crores
    const crores = absVal / 10000000;
    return `${sign}${symbol}${crores.toFixed(decimals || 2)} Crore${crores >= 2 ? 's' : ''}`;
  }
  if (compact && absVal >= 100000) {
    // Lakhs
    const lakhs = absVal / 100000;
    return `${sign}${symbol}${lakhs.toFixed(decimals || 2)} Lakh${lakhs >= 2 ? 's' : ''}`;
  }
  if (compact && absVal >= 1000) {
    // Thousands — show as K
    const thousands = absVal / 1000;
    return `${sign}${symbol}${thousands.toFixed(decimals || 1)}K`;
  }

  // Standard Indian numbering (for smaller values)
  const formatted = toIndianNumbering(absVal, decimals);
  return `${sign}${symbol}${formatted}`;
}

/**
 * Convert a number to Indian numbering format (e.g., 1,23,456)
 */
function toIndianNumbering(num, decimals = 0) {
  const fixed = num.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  
  // Indian numbering: last 3 digits, then groups of 2
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const groups = [];
  if (rest) {
    // Split rest into groups of 2 from the right
    let remaining = rest;
    while (remaining.length > 0) {
      groups.unshift(remaining.slice(-2));
      remaining = remaining.slice(0, -2);
    }
  }
  const formattedInt = groups.length > 0 
    ? `${groups.join(',')},${lastThree}`
    : lastThree || '0';
  
  return decPart ? `${formattedInt}.${decPart}` : formattedInt;
}

/**
 * Format monthly revenue in Indian currency
 */
export function formatMonthlyRevenue(value) {
  return formatINR(value, { compact: true, decimals: 1 });
}

/**
 * Format daily revenue in Indian currency
 */
export function formatDailyRevenue(value) {
  if (value >= 100000) return formatINR(value, { compact: true, decimals: 1 });
  return formatINR(value, { compact: false, decimals: 0 });
}

/**
 * Convert USD value to INR (approximate rate)
 */
export function usdToInr(usdValue, rate = 83.5) {
  return (usdValue * rate);
}

/**
 * Pre-built formatters for common use cases
 */
export const currencyFormatters = {
  revenue: (v) => formatINR(v, { compact: true, decimals: 1 }),
  cost: (v) => formatINR(v, { compact: true, decimals: 0 }),
  daily: (v) => formatDailyRevenue(v),
  precise: (v) => formatINR(v, { compact: false, decimals: 2, showSymbol: true }),
  compact: (v) => formatINR(v, { compact: true, decimals: 1 }),
  lakhs: (v) => {
    if (v == null || isNaN(v)) return '₹0';
    const lakhs = Math.abs(v) / 100000;
    return `${v < 0 ? '-' : ''}₹${lakhs.toFixed(2)} Lakh${lakhs >= 2 ? 's' : ''}`;
  },
  crores: (v) => {
    if (v == null || isNaN(v)) return '₹0';
    const crores = Math.abs(v) / 10000000;
    return `${v < 0 ? '-' : ''}₹${crores.toFixed(2)} Crore${crores >= 2 ? 's' : ''}`;
  },
};

export default formatINR;
