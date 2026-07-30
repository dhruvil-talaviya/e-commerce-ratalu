/**
 * Yamora Wafers — Shipping Rules & Courier Ranking Engine
 *
 * Evaluates business rules (State, Weight, Priority, Performance)
 * to automatically select the optimal courier without code modifications.
 */

const logger = require('../../config/logger');

class ShippingRulesEngine {
  /**
   * Rank and filter available couriers based on rules and order parameters
   *
   * @param {Array} couriers - List of serviceable couriers from Shiprocket
   * @param {Object} order - Order document
   * @param {Object} packageSpecs - Package metrics (chargeableWeightKg, etc.)
   * @param {Object} settings - LogisticsSettings document
   * @returns {Object} Optimal courier choice + ranked list
   */
  evaluateCouriers(couriers = [], order, packageSpecs, settings = {}) {
    if (!Array.isArray(couriers) || couriers.length === 0) {
      return {
        selectedCourier: null,
        rankedCouriers: [],
        reason: 'No serviceable couriers available'
      };
    }

    const { state, pincode } = order.address || {};
    const chargeableWeight = packageSpecs.chargeableWeightKg || 0.5;
    const rules = settings.shippingRules || [];
    const preferences = settings.courierPreferences || {};
    const selectionMode = preferences.selectionMode || 'auto'; // 'auto' | 'lowest_cost' | 'fastest' | 'rating'
    const disabledCouriers = Array.isArray(preferences.disabledCouriers) ? preferences.disabledCouriers : [];

    // Filter 1: Exclude manually disabled couriers
    let eligibleCouriers = couriers.filter(c => {
      const id = String(c.courierCompanyId);
      const name = String(c.courierName || '').toLowerCase();
      return !disabledCouriers.includes(id) && !disabledCouriers.includes(name);
    });

    if (eligibleCouriers.length === 0) {
      eligibleCouriers = couriers; // Fallback if all were excluded
    }

    // Filter 2: Check matching Admin Shipping Rules (Custom Override Rules)
    let ruleMatchedCourier = null;
    let matchedRuleName = '';

    for (const rule of rules) {
      if (rule.enabled === false) continue;

      let match = true;
      // State rule check
      if (Array.isArray(rule.states) && rule.states.length > 0) {
        const stateMatch = rule.states.some(s => s.toLowerCase() === (state || '').toLowerCase());
        if (!stateMatch) match = false;
      }

      // Weight rule check
      if (match && typeof rule.minWeight === 'number' && chargeableWeight < rule.minWeight) {
        match = false;
      }
      if (match && typeof rule.maxWeight === 'number' && chargeableWeight > rule.maxWeight) {
        match = false;
      }

      if (match && rule.preferredCourierId) {
        const targetId = String(rule.preferredCourierId);
        const found = eligibleCouriers.find(c => String(c.courierCompanyId) === targetId || String(c.courierName).toLowerCase().includes(targetId.toLowerCase()));
        if (found) {
          ruleMatchedCourier = found;
          matchedRuleName = rule.name || `Rule (${rule.states?.join(',') || 'weight'})`;
          break;
        }
      }
    }

    if (ruleMatchedCourier) {
      logger.info(`[ShippingRulesEngine] Applied rule "${matchedRuleName}" -> Selected ${ruleMatchedCourier.courierName}`);
      return {
        selectedCourier: ruleMatchedCourier,
        rankedCouriers: [ruleMatchedCourier, ...eligibleCouriers.filter(c => c.courierCompanyId !== ruleMatchedCourier.courierCompanyId)],
        reason: `Matched Shipping Rule: ${matchedRuleName}`
      };
    }

    // Sort Couriers according to Configured Selection Mode
    const sorted = [...eligibleCouriers].sort((a, b) => {
      if (selectionMode === 'lowest_cost') {
        return (a.rate || 0) - (b.rate || 0);
      }
      if (selectionMode === 'fastest') {
        const etda = Number(a.estimatedDeliveryDays) || 99;
        const etdb = Number(b.estimatedDeliveryDays) || 99;
        return etda - etdb;
      }
      if (selectionMode === 'rating') {
        const rata = Number(a.rating) || 0;
        const ratb = Number(b.rating) || 0;
        return ratb - rata;
      }
      
      // Default 'auto' mode: Shiprocket Recommended -> Rate -> Rating
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return (a.rate || 0) - (b.rate || 0);
    });

    const selectedCourier = sorted[0] || couriers[0];

    return {
      selectedCourier,
      rankedCouriers: sorted,
      reason: `Ranked by ${selectionMode} algorithm`
    };
  }
}

module.exports = new ShippingRulesEngine();
