/** @odoo-module */

/**
 * POS Receipt Design Pro — Order Receipt Override for Odoo 19
 *
 * Patches OrderReceipt to render a user-defined XML template whenever
 * pos.config.use_custom_receipt is enabled.
 *
 * Odoo 19 passes the live Order model via `props.order`. The built-in
 * design templates reference the older `receipt.*` / `props.data.*` shape
 * (pre-19 API). This module builds a compatibility shim from the live
 * Order record so existing templates keep working.
 */

import { markup } from "@odoo/owl";
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { formatCurrency as formatCurrencyById } from "@web/core/currency";
import { patch } from "@web/core/utils/patch";
import { renderToString } from "@web/core/utils/render";

// Cache for parsed + registered templates (keyed by design ID)
const _templateCache = new Map();

/**
 * Reload pos.config receipt settings from the server so that backend
 * changes (design selection, UPI fields, toggle flags) are reflected
 * in the running POS without requiring a full page refresh.
 */
async function _reloadPosConfig(component, pos) {
  const rpc = component.env?.services?.rpc;
  if (!rpc || !pos?.config?.id) return;

  try {
    const result = await rpc("/web/dataset/call_kw", {
      model: "pos.config",
      method: "read",
      args: [
        [pos.config.id],
        [
          "use_custom_receipt",
          "receipt_design_id",
          "receipt_show_upi_qr",
          "upi_id",
          "upi_merchant_name",
          "upi_payment_note",
          "receipt_auto_print",
          "receipt_show_logo",
        ],
      ],
      kwargs: {},
    });

    if (result && result.length > 0) {
      const fresh = result[0];
      const prevDesignId = pos.config.receipt_design_id;
      const prevUseCustom = pos.config.use_custom_receipt;

      pos.config.use_custom_receipt = fresh.use_custom_receipt || false;
      pos.config.receipt_show_upi_qr = fresh.receipt_show_upi_qr || false;
      pos.config.receipt_auto_print = fresh.receipt_auto_print || false;
      pos.config.receipt_show_logo = fresh.receipt_show_logo || false;
      pos.config.upi_id = fresh.upi_id || "";
      pos.config.upi_merchant_name = fresh.upi_merchant_name || "";
      pos.config.upi_payment_note = fresh.upi_payment_note || "";

      // Many2one: server returns [id, name], store just the integer id
      if (fresh.receipt_design_id) {
        pos.config.receipt_design_id = Array.isArray(fresh.receipt_design_id)
          ? fresh.receipt_design_id[0]
          : fresh.receipt_design_id;
      } else {
        pos.config.receipt_design_id = false;
      }

      // If the selected design changed OR custom receipt was toggled off,
      // clear the template cache so the new design XML is parsed on next render
      if (
        pos.config.receipt_design_id !== prevDesignId ||
        (prevUseCustom && !pos.config.use_custom_receipt)
      ) {
        _templateCache.clear();
      }

      console.log("[Receipt Design] Reloaded pos.config", {
        design_id: pos.config.receipt_design_id,
        use_custom: pos.config.use_custom_receipt,
        changed:
          prevDesignId !== pos.config.receipt_design_id ||
          prevUseCustom !== pos.config.use_custom_receipt,
      });
    }
  } catch (err) {
    console.error("[Receipt Design] Failed to reload pos.config:", err);
  }
}

/**
 * Reload receipt designs from the server to get latest changes.
 * Uses cache-busting to bypass Odoo's data loading cache.
 * Returns the updated models.
 */
async function _reloadReceiptDesigns(pos) {
  if (!pos?.data?.load) return null;

  try {
    // Clear the model cache before fetching to ensure fresh data
    if (pos.models?.["receipt.design"]) {
      const Model = pos.models["receipt.design"];
      Model._cache = {};
      // Also clear the indexedDB cache if present (Odoo 19+ uses this)
      if (pos.data?.db && pos.data.db["receipt.design"]) {
        delete pos.data.db["receipt.design"];
      }
    }

    // Add cache-busting timestamp by modifying the context
    const originalContext = pos.config._context || {};
    const cacheBustContext = {
      ...originalContext,
      receipt_cache_bust: Date.now(),
    };

    // Temporarily set the context for the load call
    const originalConfigContext = pos.config._context;
    pos.config._context = cacheBustContext;

    const result = await pos.data.load("receipt.design", pos.config.id);

    // Restore original context
    pos.config._context = originalConfigContext;

    if (result && pos.models?.["receipt.design"]) {
      // Update the existing model cache with fresh data
      const Model = pos.models["receipt.design"];
      Model._cache = {};
      for (const record of result) {
        Model._insert(record);
      }
      // Clear template cache so reloaded designs are re-parsed
      _templateCache.clear();
      console.log(
        "[Receipt Design] Reloaded designs with cache bust, count:",
        result.length,
      );
      return result;
    }
  } catch (err) {
    console.error("[Receipt Design] Failed to reload designs:", err);
  }
  return null;
}

/**
 * Build a pre-Odoo-19 "receipt" dict from a live Order model instance.
 * Only includes fields referenced by the 4 built-in system templates.
 */
function _buildReceiptShim(order) {
  if (!order) return null;

  const company = order.company || {};
  const currencyId = order.currency?.id;

  const format = (amount) =>
    currencyId != null
      ? formatCurrencyById(amount || 0, currencyId)
      : String(amount || 0);

  // Orderlines
  const orderlines = (order.lines || []).map((line) => ({
    id: line.id || line.uuid,
    productName:
      (typeof line.getFullProductName === "function" &&
        line.getFullProductName()) ||
      line.full_product_name ||
      line.product_id?.display_name ||
      "",
    qty: line.qty ?? line.quantity ?? 0,
    unit: line.product_id?.uom_id?.name || "",
    unitPrice: format(line.price_unit ?? 0),
    price: format(line.price_subtotal_incl ?? line.getPriceWithTax?.() ?? 0),
    discount: line.discount || 0,
    customerNote: line.customer_note || line.customerNote || "",
    l10n_in_hsn_code: line.product_id?.l10n_in_hsn_code || "",
  }));

  // Payment lines (exclude "change" line)
  const paymentlines = (order.payment_ids || [])
    .filter((p) => !p.is_change)
    .map((p, idx) => ({
      cid: p.uuid || p.id || idx,
      name: p.payment_method_id?.name || "",
      amount: p.getAmount?.() ?? p.amount ?? 0,
      ticket: p.ticket || "",
    }));

  // Tax details — best-effort extraction from order.prices / taxDetails
  const taxDetails = order.prices?.taxDetails || order.taxTotals || {};
  const subtotals = taxDetails.subtotals || [];
  const taxLines = [];
  for (const sub of subtotals) {
    for (const tg of sub.tax_groups || []) {
      taxLines.push({
        name: tg.group_name || tg.name || "",
        amount: tg.tax_amount_currency ?? tg.tax_amount ?? 0,
      });
    }
  }

  const amountTotal = order.amount_total ?? order.getTotalWithTax?.() ?? 0;
  const amountTax = order.amount_tax ?? order.getTotalTax?.() ?? 0;
  const totalWithoutTax =
    order.priceExcl ?? order.getTotalWithoutTax?.() ?? amountTotal - amountTax;

  return {
    name: order.pos_reference || order.name || order.trackingNumber || "",
    date: order.date_order || order.formattedDate || "",
    cashier:
      typeof order.getCashierName === "function" ? order.getCashierName() : "",
    partner: order.partner_id
      ? { name: order.partner_id.name, email: order.partner_id.email }
      : null,
    company: {
      header: company.receipt_header || "",
    },
    orderlines,
    paymentlines,
    tax_details: taxLines,
    amount_total: amountTotal,
    amount_tax: amountTax,
    total_without_tax: totalWithoutTax,
    total_discount:
      typeof order.getTotalDiscount === "function"
        ? order.getTotalDiscount()
        : 0,
    order_rounding: order.appliedRounding || 0,
    change:
      typeof order.getChange === "function"
        ? order.getChange()
        : order.change || 0,
    loyaltyStats: order.loyaltyStats || [],
    new_coupon_info: order.new_coupon_info || [],
    pos_qr_code:
      order.company?.point_of_sale_use_ticket_qr_code && order.finalized
        ? `/pos/ticket/validate?access_token=${order.access_token || ""}`
        : "",
    ticket_code: order.ticket_code || order.tracking_number || "",
    footer: order.config?.receipt_footer || "",
    footer_html: "",
  };
}

/**
 * Build the rendering context for the XML template.
 * Provides both the legacy `receipt` shim and direct `order` access.
 */
function _buildRenderContext(component, order) {
  const pos = component.pos || component.env?.services?.pos;
  if (!pos || !order) return null;

  const receipt = _buildReceiptShim(order);
  if (!receipt) return null;

  const headerData = {
    company: order.company || pos.company || {},
    table: order.table_id?.table_number || "",
    customer_count: order.customer_count || 0,
  };

  const currency = order.currency || pos.currency;
  // formatCurrency(amount, currency) compat helper used in templates
  const formatCurrency = (amount, cur) => {
    const id = (cur && cur.id) || currency?.id;
    return id != null
      ? formatCurrencyById(amount || 0, id)
      : String(amount || 0);
  };

  // UPI QR Code generation function for payment receipts
  // Uses api.qrserver.com — free, no API key required
  const generateQRCodeUrl = (total_amount_with_tax, include_amount = true) => {
    const config = pos.config || {};
    const upiId = config.upi_id || "";
    const merchantName = config.upi_merchant_name || "";
    const amountFinal = parseFloat(total_amount_with_tax).toFixed(2);
    const note = config.upi_payment_note || "";

    if (!upiId) return "";

    // Build UPI payment string (upi:// scheme)
    let upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&tn=${encodeURIComponent(note)}`;
    if (include_amount) {
      upiString += `&am=${encodeURIComponent(amountFinal)}`;
    }

    // Generate QR via free API service (150x150px, PNG format)
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=2&data=${encodeURIComponent(upiString)}`;
  };

  return {
    pos,
    order,
    receipt,
    orderlines: receipt.orderlines,
    paymentlines: receipt.paymentlines,
    currency,
    utils: { formatCurrency, generateQRCodeUrl },
    props: {
      data: {
        headerData,
        base_url: order.config?._base_url || pos.base_url || "",
        generalNote: order.general_note || "",
        shippingDate: order.shipping_date || "",
        l10n_in_hsn_summary: order.l10n_in_hsn_summary || null,
        l10n_co_dian: order.l10n_co_dian ?? false,
        l10n_es_pos_tbai_qrsrc: order.l10n_es_pos_tbai_qrsrc || null,
        l10n_fr_hash: order.l10n_fr_hash ?? false,
      },
    },
  };
}

/**
 * Resolve the receipt.design record from POS loaded data.
 */
function _findReceiptDesign(pos, designId) {
  const id = Array.isArray(designId) ? designId[0] : designId?.id || designId;
  if (!id) return null;

  if (pos.models?.["receipt.design"]) {
    const all = pos.models["receipt.design"].getAll();
    return all.find((d) => d.id === id) || null;
  }
  return null;
}

/**
 * Parse an XML design string into an OWL template and register it once.
 * Returns the template name on success, null on failure.
 */
function _ensureTemplate(component, designId, designXml) {
  const cacheKey = `rd_${designId}`;

  if (_templateCache.has(cacheKey)) {
    return _templateCache.get(cacheKey);
  }

  try {
    // Escape bare `&` that aren't part of a valid XML entity reference
    // (common in URLs like `?a=1&b=2` inside user-authored designs).
    const safeXml = designXml.replace(
      /&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g,
      "&amp;",
    );
    const parser = new DOMParser();
    const wrapper = `<templates><t t-name="${cacheKey}">${safeXml}</t></templates>`;
    const doc = parser.parseFromString(wrapper, "text/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      console.error("[Receipt Design] XML parse error", parseError.textContent);
      return null;
    }

    const tplNode = doc.querySelectorAll("templates > [t-name]")[0];
    if (!tplNode) return null;

    const app =
      renderToString.app || component.env?.app || component.__owl__?.app;
    if (!app) {
      console.error("[Receipt Design] No OWL app reference found");
      return null;
    }

    app.addTemplate(cacheKey, tplNode);
    _templateCache.set(cacheKey, cacheKey);
    return cacheKey;
  } catch (err) {
    console.error("[Receipt Design] Template registration failed", err);
    return null;
  }
}

/**
 * Main render pipeline — returns a Markup object or null.
 */
async function _renderCustomReceipt(component, propsArg) {
  const pos = component.pos || component.env?.services?.pos;
  if (!pos) return null;

  // Reload pos.config first so backend settings changes are reflected
  // without requiring a manual POS refresh/reload
  await _reloadPosConfig(component, pos);

  console.log("[Receipt Design] render called", {
    hasPos: !!pos,
    use_custom_receipt: pos?.config?.use_custom_receipt,
    receipt_design_id: pos?.config?.receipt_design_id,
    modelsHasReceiptDesign: !!pos?.models?.["receipt.design"],
    designCount: pos?.models?.["receipt.design"]?.getAll()?.length,
  });
  if (!pos?.config?.use_custom_receipt || !pos?.config?.receipt_design_id) {
    return null;
  }

  // Reload receipt designs to get latest changes from server
  await _reloadReceiptDesigns(pos);

  const design = _findReceiptDesign(pos, pos.config.receipt_design_id);
  console.log("[Receipt Design] design lookup", {
    requestedId: pos.config.receipt_design_id,
    found: !!design,
    hasXml: !!design?.receipt_design,
  });
  if (!design?.receipt_design) {
    console.warn(
      "[Receipt Design] No design record found for id",
      pos.config.receipt_design_id,
    );
    return null;
  }

  const order = propsArg?.order;
  if (!order) return null;

  const ctx = _buildRenderContext(component, order);
  if (!ctx) return null;

  const templateName = _ensureTemplate(
    component,
    design.id,
    design.receipt_design,
  );
  if (!templateName) return null;

  try {
    const html = await renderToString(templateName, ctx);
    console.log("[Receipt Design] rendered length", html?.length);
    return markup(html);
  } catch (err) {
    console.error("[Receipt Design] Render error", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Patch OrderReceipt — the OWL component Odoo 19 uses for receipts
// ─────────────────────────────────────────────────────────────────────
patch(OrderReceipt.prototype, {
  setup() {
    super.setup(...arguments);

    if (!this.pos) {
      this.pos = this.env?.services?.pos;
    }

    this.customReceiptMarkup = null;

    const { onWillStart, onWillUpdateProps } = owl;

    onWillStart(async () => {
      this.customReceiptMarkup = await _renderCustomReceipt(this, this.props);
    });

    onWillUpdateProps(async (nextProps) => {
      this.customReceiptMarkup = await _renderCustomReceipt(this, nextProps);
    });
  },
});
