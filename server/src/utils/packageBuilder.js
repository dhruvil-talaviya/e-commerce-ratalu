/**
 * Yamora Wafers — Automatic Package Builder & Weight Calculator
 *
 * Automatically computes dead weight, box dimensions, volumetric weight,
 * and chargeable weight for wafer shipments without manual data entry.
 */

const BOX_PRESETS = {
  SMALL: {
    name: 'Small Box',
    maxGrams: 500,
    length: 15,
    breadth: 15,
    height: 10
  },
  MEDIUM: {
    name: 'Medium Box',
    maxGrams: 1500,
    length: 20,
    breadth: 20,
    height: 12
  },
  LARGE: {
    name: 'Large Box',
    maxGrams: 3500,
    length: 30,
    breadth: 25,
    height: 15
  },
  MASTER: {
    name: 'Master Box',
    maxGrams: Infinity,
    length: 40,
    breadth: 30,
    height: 20
  }
};

/**
 * Parse weight in grams from pack label or item schema
 * E.g., "200g" -> 200, "1 kg" -> 1000
 */
const parseGrams = (item) => {
  if (typeof item.grams === 'number' && item.grams > 0) {
    return item.grams;
  }
  
  const label = String(item.packLabel || item.packId || '').toLowerCase().trim();
  if (label.includes('kg')) {
    const match = label.match(/([\d.]+)\s*kg/);
    if (match) return parseFloat(match[1]) * 1000;
  }
  const match = label.match(/([\d.]+)\s*g/);
  if (match) return parseFloat(match[1]);

  return 200; // Default fallback wafer pack weight (200g)
};

/**
 * Automatically build package specs for an array of order items
 *
 * @param {Array} items - Order items list
 * @param {Object} [options] - Additional options (e.g. tareWeightGrams)
 * @returns {Object} Calculated package parameters
 */
const buildPackage = (items = [], options = {}) => {
  const tareWeightGrams = options.tareWeightGrams || 100; // 100g tare allowance for box, tape, void fill
  
  let netWeightGrams = 0;
  for (const item of items) {
    const unitGrams = parseGrams(item);
    const qty = Number(item.quantity) || 1;
    netWeightGrams += unitGrams * qty;
  }

  const grossGrams = netWeightGrams + tareWeightGrams;
  const deadWeightKg = Math.max(0.5, Math.round((grossGrams / 1000) * 100) / 100);

  // Determine standard package box preset based on gross weight
  let preset = BOX_PRESETS.SMALL;
  if (grossGrams > BOX_PRESETS.LARGE.maxGrams) {
    preset = BOX_PRESETS.MASTER;
  } else if (grossGrams > BOX_PRESETS.MEDIUM.maxGrams) {
    preset = BOX_PRESETS.LARGE;
  } else if (grossGrams > BOX_PRESETS.SMALL.maxGrams) {
    preset = BOX_PRESETS.MEDIUM;
  }

  // Allow custom setting overrides for default box size if provided
  const length = options.length || preset.length;
  const breadth = options.breadth || preset.breadth;
  const height = options.height || preset.height;

  // Standard Volumetric Weight Math: (L x B x H) / 5000 in Kg
  const volumetricWeightKg = Math.round(((length * breadth * height) / 5000) * 100) / 100;
  const chargeableWeightKg = Math.max(deadWeightKg, volumetricWeightKg);

  return {
    netWeightGrams,
    tareWeightGrams,
    grossGrams,
    deadWeightKg,
    presetName: preset.name,
    dimensions: {
      length,
      breadth,
      height
    },
    volumetricWeightKg,
    chargeableWeightKg
  };
};

module.exports = {
  BOX_PRESETS,
  parseGrams,
  buildPackage
};
