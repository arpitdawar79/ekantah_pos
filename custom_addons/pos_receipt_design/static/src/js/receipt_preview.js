/** @odoo-module */

/**
 * POS Receipt Design Pro — Backend Preview Client Action
 *
 * Renders a receipt design template in a dialog with sample data so
 * the user can see what it looks like before deploying to POS.
 */

import { markup } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { renderToString } from "@web/core/utils/render";

const { Component, xml } = owl;

// ─────────────────────────────────────────────────────
//  Preview Dialog Component
// ─────────────────────────────────────────────────────
class ReceiptPreviewDialog extends Component {
  static template = xml`
        <Dialog size="'md'" title="props.title">
            <div class="o_receipt_preview_dialog">
                <div class="receipt-preview-container" t-out="props.previewHtml"/>
            </div>
        </Dialog>
    `;
  static components = { Dialog };
  static props = ["title", "previewHtml", "close"];
}

// ─────────────────────────────────────────────────────
//  Sample receipt data for preview rendering
// ─────────────────────────────────────────────────────
const SAMPLE_DATA = {
  receipt: {
    name: "Order 00142-001-0001",
    date: new Date().toLocaleString(),
    amount_total: 1250.0,
    amount_tax: 107.14,
    total_without_tax: 1142.86,
    total_discount: 50.0,
    change: 250.0,
    cashier: "John Doe",
    footer: "Thank you for dining with us!",
    footer_html: "",
    partner: { name: "Jane Smith" },
    company: {
      header: "Welcome to Our Store!",
      company: {
        id: 1,
        name: "Demo Company Pvt. Ltd.",
        phone: "+91 98765 43210",
        email: "hello@democompany.com",
        website: "www.democompany.com",
      },
    },
    orderlines: [
      {
        id: 1,
        productName: "Espresso Coffee",
        qty: 2,
        unit: "Units",
        unitPrice: "₹150.00",
        price: "₹300.00",
        discount: 0,
        customerNote: "",
      },
      {
        id: 2,
        productName: "Grilled Sandwich",
        qty: 1,
        unit: "Units",
        unitPrice: "₹250.00",
        price: "₹250.00",
        discount: 10,
        customerNote: "No onions",
      },
      {
        id: 3,
        productName: "Chocolate Brownie",
        qty: 3,
        unit: "Units",
        unitPrice: "₹180.00",
        price: "₹540.00",
        discount: 0,
        customerNote: "",
      },
      {
        id: 4,
        productName: "Fresh Lime Soda",
        qty: 2,
        unit: "Units",
        unitPrice: "₹80.00",
        price: "₹160.00",
        discount: 0,
        customerNote: "",
      },
    ],
    paymentlines: [{ cid: "p1", name: "Cash", amount: 1500.0 }],
    tax_details: [
      { name: "CGST 2.5%", amount: 53.57 },
      { name: "SGST 2.5%", amount: 53.57 },
    ],
    loyaltyStats: [],
    new_coupon_info: [],
    pos_qr_code: "",
    ticket_code: "",
    order_rounding: 0,
  },
  paymentlines: [
    {
      cid: "p1",
      name: "Cash",
      amount: 1500.0,
      payment_method_id: { name: "Cash" },
    },
  ],
  currency: { symbol: "₹", position: "before", decimals: 2 },
  utils: {
    formatCurrency: (amount) => {
      const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
      return `₹${num.toFixed(2)}`;
    },
    generateQRCodeUrl: (total_amount_with_tax, include_amount = true) => {
      const upiId = "demo@upi";
      const merchantName = "Demo Company Pvt. Ltd.";
      const amountFinal = parseFloat(total_amount_with_tax).toFixed(2);
      let upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}`;
      if (include_amount) upiString += `&am=${encodeURIComponent(amountFinal)}`;
      return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=2&data=${encodeURIComponent(upiString)}`;
    },
  },
  props: {
    data: {
      headerData: {
        company: {
          id: 1,
          name: "Demo Company Pvt. Ltd.",
          phone: "+91 98765 43210",
          email: "hello@democompany.com",
          website: "www.democompany.com",
          country_id: { code: "IN" },
          point_of_sale_ticket_portal_url_display_mode: "none",
        },
        table: "",
        customer_count: 0,
      },
      base_url: "https://demo.odoo.com",
      generalNote: "",
      shippingDate: "",
      l10n_in_hsn_summary: null,
      l10n_co_dian: false,
      l10n_es_pos_tbai_qrsrc: null,
      l10n_fr_hash: false,
    },
  },
};

// ─────────────────────────────────────────────────────
//  Client action handler
// ─────────────────────────────────────────────────────
async function receiptDesignPreview(env, action) {
  const { design_xml } = action.params || {};
  if (!design_xml) {
    env.services.notification.add(_t("No design XML to preview."), {
      type: "warning",
    });
    return;
  }

  let previewHtml = "";
  const templateName = `preview_${Date.now()}`;

  try {
    const parser = new DOMParser();
    const wrapped = `<templates><t t-name="${templateName}">${design_xml}</t></templates>`;
    const doc = parser.parseFromString(wrapped, "text/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) throw new Error(parseError.textContent);

    const tplNode = doc.querySelectorAll("templates > [t-name]")[0];
    if (!tplNode) throw new Error("No valid template node found.");

    const app = renderToString.app || env.app;
    if (!app) throw new Error("OWL app not available for rendering.");

    app.addTemplate(templateName, tplNode);
    previewHtml = await renderToString(templateName, SAMPLE_DATA);
  } catch (err) {
    previewHtml = `
            <div class="alert alert-danger">
                <strong>Render Error:</strong><br/>
                <pre style="white-space:pre-wrap;font-size:12px;">${err.message || err}</pre>
            </div>`;
  }

  env.services.dialog.add(ReceiptPreviewDialog, {
    title: _t("Receipt Preview"),
    previewHtml: markup(previewHtml),
  });
}

registry
  .category("actions")
  .add("receipt_design_preview", receiptDesignPreview);

export { receiptDesignPreview, ReceiptPreviewDialog };
