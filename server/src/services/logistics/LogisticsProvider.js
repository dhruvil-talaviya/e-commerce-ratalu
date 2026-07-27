/**
 * Abstract Logistics Provider Base Class.
 * Standard interface to ensure clean architecture and pluggability for future 
 * logistics providers (Delhivery, Pickrr, Xpressbees, etc.).
 */
class LogisticsProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Authenticate with the provider API and acquire valid auth token.
   * @abstract
   */
  async authenticate(credentials) {
    throw new Error('Method authenticate() must be implemented.');
  }

  /**
   * Test API connectivity.
   * @abstract
   */
  async testConnection(credentials) {
    throw new Error('Method testConnection() must be implemented.');
  }

  /**
   * Check delivery pincode serviceability and fetch courier options/rates.
   * @abstract
   */
  async checkServiceability(params) {
    throw new Error('Method checkServiceability() must be implemented.');
  }

  /**
   * Fetch configured pickup locations.
   * @abstract
   */
  async getPickupLocations(token) {
    throw new Error('Method getPickupLocations() must be implemented.');
  }

  /**
   * Add a new pickup location.
   * @abstract
   */
  async createPickupLocation(token, locationData) {
    throw new Error('Method createPickupLocation() must be implemented.');
  }

  /**
   * Create order in logistics system.
   * @abstract
   */
  async createOrder(token, orderPayload) {
    throw new Error('Method createOrder() must be implemented.');
  }

  /**
   * Generate AWB code and assign courier.
   * @abstract
   */
  async generateAWB(token, { shipmentId, courierId }) {
    throw new Error('Method generateAWB() must be implemented.');
  }

  /**
   * Schedule pickup for shipment.
   * @abstract
   */
  async requestPickup(token, { shipmentId, pickupDate }) {
    throw new Error('Method requestPickup() must be implemented.');
  }

  /**
   * Generate shipping label PDF URL.
   * @abstract
   */
  async generateLabel(token, { shipmentIds }) {
    throw new Error('Method generateLabel() must be implemented.');
  }

  /**
   * Generate shipping manifest PDF URL.
   * @abstract
   */
  async generateManifest(token, { shipmentIds }) {
    throw new Error('Method generateManifest() must be implemented.');
  }

  /**
   * Generate invoice PDF URL.
   * @abstract
   */
  async generateInvoice(token, { orderIds }) {
    throw new Error('Method generateInvoice() must be implemented.');
  }

  /**
   * Fetch live shipment tracking info by AWB or shipment ID.
   * @abstract
   */
  async trackShipment(token, { awbCode, shipmentId }) {
    throw new Error('Method trackShipment() must be implemented.');
  }

  /**
   * Cancel shipment in logistics provider.
   * @abstract
   */
  async cancelShipment(token, { orderIds }) {
    throw new Error('Method cancelShipment() must be implemented.');
  }
}

module.exports = LogisticsProvider;
