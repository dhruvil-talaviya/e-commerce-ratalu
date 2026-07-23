const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Flavor = require('../models/Flavor');
const Inventory = require('../models/Inventory');
const Refund = require('../models/Refund');
const sendResponse = require('../utils/response');
const analytics = require('../services/analytics.service');

/** Build a date range filter from optional `from` / `to` query params (for export) */
const dateFilter = (from, to) => {
  const f = {};
  if (from) f.$gte = new Date(from);
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    f.$lte = d;
  }
  return Object.keys(f).length ? f : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD REPORTS (Live analytics — single source of truth)
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get Admin Dashboard Overview & Reports
// @route   GET /api/v1/admin/reports?filter=today|yesterday|last7days|last30days|thisMonth|lastMonth|thisQuarter|thisYear|custom|allTime&from=ISO&to=ISO
// @access  Private (Admin only)
exports.getDashboardReports = async (req, res, next) => {
  try {
    const { filter = 'allTime', from: customFrom, to: customTo } = req.query;

    // All KPIs from the single source of truth
    const kpis = await analytics.getDashboardKPIs({ filter, customFrom, customTo });

    // All charts — run in parallel
    const [
      revenueTrend,
      orderTrend,
      refundTrend,
      customerGrowth,
      hourlyOrders,
      orderStatusDist,
      paymentStatusDist
    ] = await Promise.all([
      analytics.getRevenueTrend({ filter, customFrom, customTo }),
      analytics.getOrderTrend({ filter, customFrom, customTo }),
      analytics.getRefundTrend({ filter, customFrom, customTo }),
      analytics.getCustomerGrowth({ filter, customFrom, customTo }),
      analytics.getHourlyOrders({ filter: 'today' }),
      analytics.getOrderStatusDistribution({ filter, customFrom, customTo }),
      analytics.getPaymentStatusDistribution({ filter, customFrom, customTo })
    ]);

    sendResponse(res, 200, {
      success: true,
      data: {
        kpis,
        charts: {
          revenueTrend,
          orderTrend,
          refundTrend,
          customerGrowth,
          hourlyOrders,
          orderStatusDist,
          paymentStatusDist
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT (CSV / Excel / PDF)
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Export reports
// @route   GET /api/v1/admin/reports/export?type=sales|customers|orders|inventory&format=csv|excel|pdf
// @access  Private (Admin)
exports.exportReport = async (req, res, next) => {
  try {
    const { type = 'orders', format = 'csv' } = req.query;
    const from = req.query.from;
    const to = req.query.to;

    let rows = [];
    let headers = [];
    let filename = '';

    // ── Build dataset ─────────────────────────────────────────────────────────
    if (type === 'gst-ledger') {
      const filter = { status: { $ne: 'Cancelled' } };
      const df = dateFilter(from, to);
      if (df) filter.createdAt = df;

      const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
      headers = [
        'Invoice Number', 'Order Number', 'Customer', 'Date',
        'Taxable Base (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)',
        'Total GST (₹)', 'Grand Total (₹)', 'Payment Status', 'Order Status'
      ];
      rows = orders.map(o => {
        const finalTotal = o.totals?.total || 0;
        const gstTotal = o.totals?.gst || 0;
        const subtotalVal = o.totals?.subtotal || (finalTotal - gstTotal);
        
        // Snapshot or compute CGST/SGST/IGST
        const cgst = o.totals?.cgst ?? (o.totals?.igst ? 0 : gstTotal / 2);
        const sgst = o.totals?.sgst ?? (o.totals?.igst ? 0 : gstTotal / 2);
        const igst = o.totals?.igst ?? 0;
        
        return [
          o.invoiceNumber || `INV-${o.id}`,
          o.displayId || o.id,
          o.userName,
          new Date(o.createdAt).toISOString().slice(0, 10),
          subtotalVal.toFixed(2),
          cgst.toFixed(2),
          sgst.toFixed(2),
          igst.toFixed(2),
          gstTotal.toFixed(2),
          finalTotal.toFixed(2),
          o.payment?.status || 'Pending',
          o.status
        ];
      });
      filename = 'gst-ledger';

    } else if (type === 'orders') {
      const filter = {};
      const df = dateFilter(from, to);
      if (df) filter.createdAt = df;
      if (req.query.status) filter.status = req.query.status;

      const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
      headers = ['Order ID', 'Customer', 'Phone', 'Status', 'Payment', 'Subtotal', 'Discount', 'GST', 'Shipping', 'Total', 'Date'];
      rows = orders.map(o => ([
        o.id, o.userName, o.userPhone, o.status,
        o.payment?.method || o.method,
        o.totals.subtotal, o.totals.discount, o.totals.gst, o.totals.shipping, o.totals.total,
        new Date(o.createdAt).toISOString().slice(0, 10)
      ]));
      filename = 'orders-report';

    } else if (type === 'customers') {
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      const customers = await Customer.find(filter).select('-refreshTokens').sort({ createdAt: -1 }).lean();
      headers = ['Name', 'Phone', 'Email', 'Status', 'Addresses', 'Coupons Used', 'Joined'];
      rows = customers.map(c => ([
        c.name, c.phone, c.email || '', c.status,
        (c.addresses || []).length,
        (c.couponsUsed || []).join('; '),
        new Date(c.createdAt).toISOString().slice(0, 10)
      ]));
      filename = 'customers-report';

    } else if (type === 'sales') {
      const filter = { status: { $in: validStatuses } };
      const df = dateFilter(from, to);
      if (df) filter.createdAt = df;

      const salesData = await Order.aggregate([
        { $match: filter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, orders: { $sum: 1 }, revenue: { $sum: '$totals.total' }, discount: { $sum: '$totals.discount' }, gst: { $sum: '$totals.gst' } } },
        { $sort: { _id: -1 } }
      ]);
      headers = ['Date', 'Orders', 'Revenue (₹)', 'Discount (₹)', 'GST (₹)'];
      rows = salesData.map(d => ([d._id, d.orders, d.revenue, d.discount, d.gst]));
      filename = 'sales-report';

    } else if (type === 'inventory') {
      const inventory = await Inventory.find().lean();
      const enriched = await Promise.all(inventory.map(async (inv) => {
        const flavor = await Flavor.findOne({ $or: [{ id: inv.flavorId }, { slug: inv.flavorId }] }).lean();
        const product = await Product.findOne({ flavorId: inv.flavorId }).lean();
        const pack = product?.packs?.find(p => p.id === inv.packId);
        return {
          flavorName: flavor?.name || inv.flavorId,
          packLabel: pack?.label || inv.packId,
          currentStock: inv.currentStock,
          reservedStock: inv.reservedStock || 0,
          availableStock: Math.max((inv.currentStock || 0) - (inv.reservedStock || 0), 0),
          lowStockLimit: inv.lowStockAlertLimit,
          costPrice: inv.costPrice || 0,
          inventoryValue: (inv.currentStock || 0) * (inv.costPrice || 0),
          lastUpdated: inv.updatedAt ? new Date(inv.updatedAt).toISOString().slice(0, 10) : ''
        };
      }));
      headers = ['Flavor', 'Pack', 'Current Stock', 'Reserved', 'Available', 'Low Stock Limit', 'Cost Price', 'Inventory Value', 'Last Updated'];
      rows = enriched.map(i => ([
        i.flavorName, i.packLabel, i.currentStock, i.reservedStock,
        i.availableStock, i.lowStockLimit, i.costPrice, i.inventoryValue, i.lastUpdated
      ]));
      filename = 'inventory-report';
    }

    // ── Format output ─────────────────────────────────────────────────────────
    if (format === 'csv') {
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.csv"`);
      return res.status(200).send(csv);

    } else if (format === 'excel') {
      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      // Auto-column widths
      ws['!cols'] = headers.map((h, i) => ({
        wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2
      }));
      XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.xlsx"`);
      return res.status(200).send(buf);

    } else if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.pdf"`);
      doc.pipe(res);

      // Title
      doc.fontSize(16).font('Helvetica-Bold').text(`Ratalu Wafers — ${type.charAt(0).toUpperCase() + type.slice(1)} Report`, { align: 'center' });
      doc.fontSize(9).font('Helvetica').text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
      doc.moveDown(1.2);

      // Table
      const colWidth = (doc.page.width - 80) / headers.length;
      let x = 40;
      let y = doc.y;

      // Header row
      doc.font('Helvetica-Bold').fontSize(8);
      headers.forEach((h, i) => {
        doc.rect(x + i * colWidth, y, colWidth, 18).fillAndStroke('#7c3aed', '#5b2c83');
        doc.fillColor('#ffffff').text(h, x + i * colWidth + 3, y + 4, { width: colWidth - 6, ellipsis: true });
      });
      doc.fillColor('#000000');
      y += 18;

      // Data rows
      doc.font('Helvetica').fontSize(7.5);
      rows.forEach((row, ri) => {
        if (y > doc.page.height - 60) {
          doc.addPage({ layout: 'landscape' });
          y = 40;
        }
        const bg = ri % 2 === 0 ? '#f9f7ff' : '#ffffff';
        row.forEach((cell, ci) => {
          doc.rect(x + ci * colWidth, y, colWidth, 16).fillAndStroke(bg, '#e5e7eb');
          doc.fillColor('#1f2937').text(String(cell ?? ''), x + ci * colWidth + 3, y + 3, { width: colWidth - 6, ellipsis: true });
        });
        y += 16;
      });

      doc.end();
      return;
    }

    return next(new Error('Unsupported export format. Use csv, excel, or pdf.'));
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed Store Financial Report
// @route   GET /api/v1/admin/reports/financials?filter=thisMonth&from=ISO&to=ISO
// @access  Private (Admin only)
exports.getFinancialReports = async (req, res, next) => {
  try {
    const { filter = 'allTime', from: customFrom, to: customTo } = req.query;

    // Use the centralized analytics service — single source of truth
    const kpis = await analytics.getDashboardKPIs({ filter, customFrom, customTo });

    sendResponse(res, 200, {
      success: true,
      data: {
        grossSales: kpis.financial.grossSales,
        netSales: kpis.financial.netSales,
        refunds: kpis.financial.refundAmount,
        deliveredRevenue: kpis.financial.deliveredRevenue,
        pendingRevenue: kpis.financial.pendingRevenue,
        gstCollected: kpis.financial.totalGst,
        shippingCharges: kpis.financial.totalShipping,
        totalDiscount: kpis.financial.totalDiscount,
        aov: kpis.financial.aov,
        totalOrders: kpis.orders.total,
        deliveredOrders: kpis.orders.delivered,
        cancelledOrders: kpis.orders.cancelled,
        customerCancelled: kpis.orders.customerCancelled,
        adminCancelled: kpis.orders.adminCancelled
      }
    });
  } catch (error) {
    next(error);
  }
};
