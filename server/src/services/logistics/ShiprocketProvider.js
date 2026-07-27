const LogisticsProvider = require('./LogisticsProvider');
const logger = require('../../config/logger');

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

class ShiprocketProvider extends LogisticsProvider {
  constructor() {
    super('shiprocket');
  }

  /**
   * Helper to execute HTTP requests to Shiprocket API
   */
  async _request(endpoint, method = 'GET', data = null, token = null) {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = resData.message || resData.error || `Shiprocket API error: ${response.status}`;
        logger.error(`[Shiprocket API Error] ${method} ${endpoint}: ${errorMsg}`, { status: response.status, body: resData });
        const err = new Error(errorMsg);
        err.status = response.status;
        err.details = resData;
        throw err;
      }

      return resData;
    } catch (error) {
      if (error.status) throw error;
      logger.error(`[Shiprocket Network Error] ${method} ${endpoint}: ${error.message}`);
      throw new Error(`Shiprocket connection failed: ${error.message}`);
    }
  }

  /**
   * Authenticate and get JWT token from Shiprocket
   */
  async authenticate({ email, password }) {
    const response = await this._request('/auth/login', 'POST', {
      email,
      password
    });

    if (!response.token) {
      throw new Error(response.message || 'Authentication failed: No token returned by Shiprocket');
    }

    // Shiprocket tokens are typically valid for 10 days
    const expiresAt = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000); // Set expiry to 9 days to be safe

    return {
      token: response.token,
      expiresAt
    };
  }

  /**
   * Test credentials connectivity
   */
  async testConnection({ email, password }) {
    try {
      const auth = await this.authenticate({ email, password });
      // Fetch pickup locations to verify token validity
      const locations = await this.getPickupLocations(auth.token);
      return {
        success: true,
        token: auth.token,
        expiresAt: auth.expiresAt,
        locationsCount: locations ? locations.length : 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check Serviceability & Fetch Shipping Rates
   */
  async checkServiceability(token, { pickupPincode, deliveryPincode, weight, cod, length, breadth, height }) {
    const params = new URLSearchParams({
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight: String(weight || 0.5),
      cod: cod ? '1' : '0'
    });

    if (length) params.append('length', String(length));
    if (breadth) params.append('breadth', String(breadth));
    if (height) params.append('height', String(height));

    const response = await this._request(`/courier/serviceability/?${params.toString()}`, 'GET', null, token);
    
    if (response.status !== 200 && !response.data?.available_courier_companies) {
      return {
        serviceable: false,
        couriers: [],
        message: response.message || 'Pincode not serviceable'
      };
    }

    const availableCouriers = response.data?.available_courier_companies || [];
    const recommendedCourierId = response.data?.recommendation_data_id || null;

    const formattedCouriers = availableCouriers.map(c => ({
      courierCompanyId: c.courier_company_id,
      courierName: c.courier_name,
      rate: c.rate,
      estimatedDeliveryDays: c.etd,
      etdDate: c.etd_hours ? new Date(Date.now() + c.etd_hours * 3600 * 1000) : null,
      rating: c.rating,
      minWeight: c.min_weight,
      codAvailable: c.cod === 1,
      isRecommended: c.courier_company_id === recommendedCourierId
    }));

    return {
      serviceable: formattedCouriers.length > 0,
      recommendedCourierId,
      couriers: formattedCouriers
    };
  }

  /**
   * Fetch configured pickup locations
   */
  async getPickupLocations(token) {
    const response = await this._request('/settings/company/pickup', 'GET', null, token);
    const shippingAddresses = response.data?.shipping_address || [];

    return shippingAddresses.map(loc => ({
      pickupLocation: loc.pickup_location,
      name: loc.name,
      email: loc.email,
      phone: loc.phone,
      address: loc.address,
      address2: loc.address_2 || '',
      city: loc.city,
      state: loc.state,
      country: loc.country || 'India',
      pinCode: loc.pin_code,
      shiprocketLocationId: String(loc.id || '')
    }));
  }

  /**
   * Create new pickup location in Shiprocket
   */
  async createPickupLocation(token, locationData) {
    const payload = {
      pickup_location: locationData.pickupLocation,
      name: locationData.name,
      email: locationData.email,
      phone: locationData.phone,
      address: locationData.address,
      address_2: locationData.address2 || '',
      city: locationData.city,
      state: locationData.state,
      country: locationData.country || 'India',
      pin_code: locationData.pinCode
    };

    const response = await this._request('/settings/company/addshipmentaddress', 'POST', payload, token);
    return response;
  }

  /**
   * Create Order in Shiprocket
   */
  async createOrder(token, orderPayload) {
    const response = await this._request('/orders/create/adhoc', 'POST', orderPayload, token);
    return {
      shiprocketOrderId: response.order_id,
      shiprocketShipmentId: response.shipment_id,
      status: response.status,
      statusCode: response.status_code,
      awbCode: response.awb_code || null,
      courierName: response.courier_name || null,
      courierCompanyId: response.courier_company_id || null,
      raw: response
    };
  }

  /**
   * Assign Courier & Generate AWB
   */
  async generateAWB(token, { shipmentId, courierId }) {
    const payload = {
      shipment_id: shipmentId
    };
    if (courierId) {
      payload.courier_id = courierId;
    }

    const response = await this._request('/courier/assign/awb', 'POST', payload, token);
    
    if (!response.response?.data?.awb_code) {
      throw new Error(response.message || response.response?.data?.awb_assign_error || 'AWB Generation Failed');
    }

    const data = response.response.data;
    return {
      awbCode: data.awb_code,
      courierCompanyId: data.courier_company_id,
      courierName: data.courier_name,
      freightCharge: data.freight_charges,
      appliedWeight: data.applied_weight,
      raw: response
    };
  }

  /**
   * Request / Schedule Pickup
   */
  async requestPickup(token, { shipmentId, pickupDate }) {
    const payload = {
      shipment_id: [shipmentId]
    };
    if (pickupDate) {
      payload.pickup_date = [pickupDate];
    }

    const response = await this._request('/courier/generate/pickup', 'POST', payload, token);
    return {
      pickupStatus: response.pickup_status,
      responseDetails: response.response,
      raw: response
    };
  }

  /**
   * Generate Shipping Label
   */
  async generateLabel(token, { shipmentIds }) {
    const payload = {
      shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds]
    };

    const response = await this._request('/courier/generate/label', 'POST', payload, token);
    return {
      labelUrl: response.label_url,
      raw: response
    };
  }

  /**
   * Generate Shipping Manifest
   */
  async generateManifest(token, { shipmentIds }) {
    const payload = {
      shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds]
    };

    const response = await this._request('/manifests/generate', 'POST', payload, token);
    return {
      manifestUrl: response.manifest_url,
      raw: response
    };
  }

  /**
   * Generate Invoice
   */
  async generateInvoice(token, { orderIds }) {
    const payload = {
      ids: Array.isArray(orderIds) ? orderIds : [orderIds]
    };

    const response = await this._request('/orders/print/invoice', 'POST', payload, token);
    return {
      invoiceUrl: response.is_invoice_created ? response.invoice_url : null,
      raw: response
    };
  }

  /**
   * Live Shipment Tracking
   */
  async trackShipment(token, { awbCode, shipmentId }) {
    let endpoint = '';
    if (awbCode) {
      endpoint = `/courier/track/awb/${awbCode}`;
    } else if (shipmentId) {
      endpoint = `/courier/track/shipment/${shipmentId}`;
    } else {
      throw new Error('Either awbCode or shipmentId is required for tracking');
    }

    const response = await this._request(endpoint, 'GET', null, token);
    const trackingData = response.tracking_data || {};

    const shipmentTrack = trackingData.shipment_track?.[0] || {};
    const shipmentTrackActivities = trackingData.shipment_track_activities || [];

    const formattedActivities = shipmentTrackActivities.map(act => ({
      status: act['current_status'] || act.activity,
      activity: act.activity,
      location: act.location || '',
      date: act.date ? new Date(act.date) : new Date(),
      rawData: act
    }));

    return {
      awbCode: shipmentTrack.awb_code || awbCode,
      currentStatus: shipmentTrack.current_status || trackingData.track_status || 'UNKNOWN',
      courierName: shipmentTrack.courier_name,
      origin: shipmentTrack.origin,
      destination: shipmentTrack.destination,
      deliveredDate: shipmentTrack.delivered_date ? new Date(shipmentTrack.delivered_date) : null,
      edd: trackingData.etd ? new Date(trackingData.etd) : null,
      activities: formattedActivities,
      raw: response
    };
  }

  /**
   * Cancel Shipment
   */
  async cancelShipment(token, { orderIds }) {
    const payload = {
      ids: Array.isArray(orderIds) ? orderIds : [orderIds]
    };

    const response = await this._request('/orders/cancel', 'POST', payload, token);
    return response;
  }
}

module.exports = ShiprocketProvider;
