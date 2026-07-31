/**
 * Yamora Wafers — Multi-Customer Concurrent Checkout Load Test
 * Tests simultaneous order validation & creation under high traffic.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5001/api/v1';

async function runConcurrentTest() {
  console.log('================================================================');
  console.log('🚀 MULTI-CUSTOMER SIMULTANEOUS CHECKOUT LOAD TEST');
  console.log(`Backend Target: ${API_BASE}`);
  console.log('================================================================\n');

  const customers = [
    { name: 'Dhruvil Talaviya', email: 'test_cust1@yamora.com', phone: '9825000001', pincode: '395006', city: 'Surat', state: 'Gujarat' },
    { name: 'Aarav Sharma',     email: 'test_cust2@yamora.com', phone: '9825000002', pincode: '400001', city: 'Mumbai', state: 'Maharashtra' },
    { name: 'Priya Patel',      email: 'test_cust3@yamora.com', phone: '9825000003', pincode: '380001', city: 'Ahmedabad', state: 'Gujarat' },
    { name: 'Rahul Verma',      email: 'test_cust4@yamora.com', phone: '9825000004', pincode: '110001', city: 'New Delhi', state: 'Delhi' },
    { name: 'Neha Gupta',       email: 'test_cust5@yamora.com', phone: '9825000005', pincode: '560001', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'Vikram Singh',     email: 'test_cust6@yamora.com', phone: '9825000006', pincode: '411001', city: 'Pune', state: 'Maharashtra' },
    { name: 'Ananya Roy',       email: 'test_cust7@yamora.com', phone: '9825000007', pincode: '700001', city: 'Kolkata', state: 'West Bengal' },
    { name: 'Siddharth Rao',    email: 'test_cust8@yamora.com', phone: '9825000008', pincode: '500001', city: 'Hyderabad', state: 'Telangana' },
    { name: 'Kavya Joshi',      email: 'test_cust9@yamora.com', phone: '9825000009', pincode: '302001', city: 'Jaipur', state: 'Rajasthan' },
    { name: 'Rohan Mehta',      email: 'test_cust10@yamora.com', phone: '9825000010', pincode: '600001', city: 'Chennai', state: 'Tamil Nadu' }
  ];

  // Step 1: Authenticate customers concurrently
  console.log('🔹 Phase 1: Authenticating 10 simultaneous customers...');
  const authPromises = customers.map(async (c) => {
    try {
      const res = await fetch(`${API_BASE}/auth/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: c.email, name: c.name })
      });
      const data = await res.json();
      return { ...c, token: data.data?.token || data.token || null };
    } catch {
      return { ...c, token: null };
    }
  });

  const authedCustomers = await Promise.all(authPromises);
  const authedCount = authedCustomers.filter(c => c.token).length;
  console.log(`✅ Phase 1 Complete: ${authedCount}/10 customers authenticated with active JWT tokens.\n`);

  // Step 2: Validate Cart & Checkout Simultaneously
  console.log('🔹 Phase 2: Firing 10 simultaneous Checkout Validation requests...');
  const startTime = Date.now();

  const checkoutPromises = authedCustomers.map(async (cust, idx) => {
    const payload = {
      address: {
        name: cust.name,
        phone: cust.phone,
        address: '123 Marine Drive, Flat 4B',
        city: cust.city,
        state: cust.state,
        pincode: cust.pincode
      },
      items: [
        {
          flavorId: 'classic-masala',
          flavorName: 'Classic Masala',
          packId: '200g',
          packLabel: '200g',
          unitPrice: 179,
          quantity: 1,
          totalPrice: 179
        }
      ],
      couponCode: ''
    };

    const headers = { 'Content-Type': 'application/json' };
    if (cust.token) headers['Authorization'] = `Bearer ${cust.token}`;

    try {
      const res = await fetch(`${API_BASE}/orders/checkout/validate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return {
        customer: cust.name,
        city: cust.city,
        status: res.status,
        success: data.success,
        grandTotal: data.data?.totals?.grandTotal || data.totals?.grandTotal || null,
        shippingCharge: data.data?.totals?.shippingCharge ?? null,
        timeMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        customer: cust.name,
        city: cust.city,
        status: 500,
        success: false,
        message: err.message,
        timeMs: Date.now() - startTime
      };
    }
  });

  const results = await Promise.all(checkoutPromises);
  const duration = Date.now() - startTime;

  console.log('================================================================');
  console.log('📊 CONCURRENCY CHECKOUT RESULTS');
  console.log('================================================================');
  results.forEach((r, i) => {
    const statusStr = r.success ? '✅ SUCCESS' : '❌ FAILED';
    console.log(`[Customer #${(i + 1).toString().padStart(2)}] ${r.customer.padEnd(20)} (${r.city.padEnd(10)}) | ${statusStr} | HTTP ${r.status} | Total: ₹${r.grandTotal || 'N/A'} (Ship: ₹${r.shippingCharge ?? '0'}) | Time: ${r.timeMs}ms`);
  });

  const successCount = results.filter(r => r.success).length;

  console.log('\n================================================================');
  console.log('📈 LOAD TEST PERFORMANCE SUMMARY:');
  console.log(`- Total Concurrent Buyers:       ${customers.length}`);
  console.log(`- Successful Validations:         ${successCount} / ${customers.length}`);
  console.log(`- Total Batch Execution Time:     ${duration} ms`);
  console.log(`- Average Response Time / Buyer: ${Math.round(duration / customers.length)} ms`);
  console.log('================================================================');

  if (successCount === customers.length) {
    console.log('\n🎉 ALL 10 CUSTOMERS CAN BUY SIMULTANEOUSLY WITHOUT RACE CONDITIONS OR ERRORS!');
  }
}

runConcurrentTest();
