# POS Receipt Design Pro

**Custom POS Receipt Templates for Odoo 19**

Replace the default Point of Sale receipt with fully customisable OWL XML templates. Design, preview, and deploy beautiful thermal-printer-ready receipts — all from the Odoo backend.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [File Structure](#file-structure)
- [Template Variables Reference](#template-variables-reference)
- [Creating Custom Templates](#creating-custom-templates)
- [FAQ](#faq)
- [License](#license)

---

## Features

### Core
- **4 Built-in Receipt Designs** — Classic, Modern Minimal, Compact Grid, Restaurant
- **Custom Receipt Override** — Completely replaces the default POS receipt when enabled
- **Live Preview** — Render your design with sample data before deploying to POS
- **Graceful Fallback** — If anything goes wrong, the default receipt shows automatically

### Design & Customisation
- **OWL XML Templates** — Full access to Odoo's QWeb/OWL template language
- **Custom CSS per Template** — Add scoped styles to any design
- **Custom Header & Footer** — Rich HTML header/footer fields
- **Template Versioning** — Auto-increments version number on every design save
- **Template Categories** — Organise designs into Standard, Modern, Compact, Restaurant, or custom categories

### QR & Barcode
- **Order Barcode** — Code128 barcode of the order reference
- **QR Code Options** — Order reference, POS ticket URL, or fully custom URL pattern
- **Configurable per Template** — Each design controls its own QR/barcode behaviour

### Management
- **Import / Export** — Share designs as JSON files between Odoo instances
- **Kanban + List Views** — Browse designs visually or in a detailed list
- **Usage Analytics** — Track prints per design, per session, per POS config
- **Graph & Pivot Reports** — Visualise receipt usage over time
- **Multi-Company Support** — Record rules ensure company isolation
- **Chatter & Activities** — Track changes and assign tasks on designs

### POS Integration
- **Per-POS Config** — Enable custom receipts on specific POS configurations
- **Auto Print Toggle** — Control whether receipts auto-print
- **Show/Hide Logo** — Toggle company logo visibility
- **Customer Display** — Optional separate design for customer-facing screens

### Localisation Support
- **India** — HSN code per line item + HSN Summary table (CGST/SGST/IGST/CESS)
- **France** — `l10n_fr_hash` signature display
- **Spain** — TicketBai QR code
- **Colombia** — DIAN electronic invoice text
- **Portal QR** — Odoo's built-in ticket portal QR/URL display

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Odoo 19 POS Frontend                     │
│                                                              │
│  ┌──────────────┐    ┌─────────────────────────────────┐    │
│  │ OrderReceipt  │◄───│  order_receipt.js (OWL patch)    │    │
│  │  Component    │    │                                  │    │
│  │              │    │  1. Check config.use_custom_receipt│    │
│  │  ┌──────────┐│    │  2. Find design from models cache │    │
│  │  │ Default  ││    │  3. Parse XML → cache template    │    │
│  │  │ Receipt  ││    │  4. Render with receipt context    │    │
│  │  └──────────┘│    │  5. Set customReceiptMarkup       │    │
│  │  ┌──────────┐│    └─────────────────────────────────┘    │
│  │  │ Custom   ││                                           │
│  │  │ Receipt  ││◄── order_receipt.xml (template switch)     │
│  │  └──────────┘│                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ _load_pos_data()
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Odoo 19 Backend                          │
│                                                              │
│  receipt.design ──── Template XML + CSS + metadata           │
│  pos.config ──────── use_custom_receipt + receipt_design_id   │
│  pos.session ─────── Registers receipt.design in POS data    │
│  receipt.design.analytics ── Print tracking                  │
└─────────────────────────────────────────────────────────────┘
```

### How It Works

1. **POS Boot** — `pos.session._load_pos_data_models()` registers `receipt.design` so its records are sent to the frontend
2. **Data Loading** — `receipt.design._load_pos_data()` sends all active designs matching the company
3. **Component Patch** — `order_receipt.js` patches `OrderReceipt.setup()` with `onWillStart` and `onWillUpdateProps` hooks
4. **Template Cache** — On first render, the design XML is parsed, registered as an OWL template, and cached by design ID
5. **Conditional Rendering** — `order_receipt.xml` checks `this.customReceiptMarkup` — if present, shows the custom receipt; otherwise shows the default

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.10+, Odoo 19 ORM |
| **Frontend (POS)** | OWL 2 (Odoo Web Library), JavaScript ES Modules |
| **Templates** | QWeb XML (OWL variant) |
| **Styling** | SCSS (compiled by Odoo asset pipeline) |
| **Data Format** | XML (data records), JSON (import/export) |
| **Database** | PostgreSQL (via Odoo ORM) |

### Key Odoo 19 APIs Used

- `@web/core/utils/patch` — `patch()` for OWL component extension
- `@web/core/utils/render` — `renderToString()` with `app.addTemplate()`
- `@odoo/owl` — `markup()`, `onWillStart`, `onWillUpdateProps`
- `_load_pos_data_models()` — POS data registration hook
- `_load_pos_data()` / `_load_pos_data_fields()` / `_load_pos_data_domain()` — POS data loading interface

---

## File Structure

```
pos_receipt_design/
│
├── __init__.py                           # Package init + pre_init_check (Odoo 19 only)
├── __manifest__.py                       # Module metadata, version 19.0.3.0.0
├── README.md                             # This file
├── SETUP.md                              # Installation & configuration guide
├── LICENSE                               # LGPL-3
│
├── data/
│   └── receipt_design_data.xml           # 4 categories + 4 built-in receipt designs
│
├── models/
│   ├── __init__.py
│   ├── receipt_design.py                 # receipt.design + receipt.design.category
│   │                                     #   + receipt.design.analytics models
│   ├── pos_config.py                     # pos.config field extensions
│   │                                     #   + res.config.settings related fields
│   └── pos_session.py                    # Registers receipt.design in POS data pipeline
│
├── security/
│   ├── ir.model.access.csv              # CRUD permissions (user=read, manager=all)
│   └── security.xml                     # Multi-company record rules
│
├── static/
│   ├── description/                     # App store screenshots & icons
│   └── src/
│       ├── pos_overrides/
│       │   ├── order_receipt.js         # OWL component patch (template cache + render)
│       │   ├── order_receipt.xml        # OWL template: conditional receipt switch
│       │   └── receipt_screen.scss      # POS print styles + .pos-custom-receipt
│       ├── js/
│       │   └── receipt_preview.js       # Backend preview client action
│       └── scss/
│           └── receipt_backend.scss     # Backend form, kanban, preview dialog styles
│
├── views/
│   ├── receipt_design_views.xml         # List, Kanban, Form, Search views + menus
│   ├── pos_config_views.xml             # POS Settings panel inheritance
│   └── receipt_analytics_views.xml      # Analytics list, graph, pivot + menu
│
└── wizard/
    ├── __init__.py
    ├── import_design_wizard.py          # JSON import transient model
    └── import_design_wizard_views.xml   # Import dialog + menu
```

---

## Template Variables Reference

When writing a custom receipt design, these variables are available in your OWL XML template:

### Order Data (`receipt.*`)

| Variable | Type | Description |
|----------|------|-------------|
| `receipt.name` | String | Order reference (e.g., `Order 00142-001-0001`) |
| `receipt.date` | String | Order date and time |
| `receipt.amount_total` | Number | Total amount including tax |
| `receipt.amount_tax` | Number | Total tax amount |
| `receipt.total_without_tax` | Number | Subtotal before tax |
| `receipt.total_discount` | Number | Total discount amount |
| `receipt.change` | Number | Change given to customer |
| `receipt.cashier` | String | Cashier/server name |
| `receipt.partner` | Object | Customer: `{ name: "..." }` |
| `receipt.footer` | String | Plain text footer from POS config |
| `receipt.footer_html` | String | HTML footer from POS config |
| `receipt.order_rounding` | Number | Rounding adjustment |
| `receipt.pos_qr_code` | String | Portal QR code data URL |
| `receipt.ticket_code` | String | Unique ticket code |

### Order Lines (`receipt.orderlines`)

Use with `t-foreach="receipt.orderlines" t-as="line"`:

| Variable | Type | Description |
|----------|------|-------------|
| `line.id` | Number | Line ID (use as `t-key`) |
| `line.productName` | String | Product display name |
| `line.qty` | Number | Quantity |
| `line.unit` | String | Unit of measure (e.g., `"Units"`, `"kg"`) |
| `line.unitPrice` | String | Formatted unit price |
| `line.price` | String | Formatted line total |
| `line.discount` | Number | Discount percentage |
| `line.customerNote` | String | Customer note on the line |
| `line.l10n_in_hsn_code` | String | HSN code (India) |

### Payment Lines (`receipt.paymentlines`)

Use with `t-foreach="receipt.paymentlines" t-as="line"`:

| Variable | Type | Description |
|----------|------|-------------|
| `line.cid` | String | Client ID (use as `t-key`) |
| `line.name` | String | Payment method name |
| `line.amount` | Number | Payment amount |
| `line.ticket` | String | Terminal ticket HTML |

### Tax Details (`receipt.tax_details`)

Use with `t-foreach="receipt.tax_details" t-as="tax"`:

| Variable | Type | Description |
|----------|------|-------------|
| `tax.name` | String | Tax name (e.g., `"CGST 9%"`) |
| `tax.amount` | Number | Tax amount |

### Company / Header (`props.data.headerData`)

| Variable | Type | Description |
|----------|------|-------------|
| `props.data.headerData.company.name` | String | Company name |
| `props.data.headerData.company.phone` | String | Phone number |
| `props.data.headerData.company.email` | String | Email |
| `props.data.headerData.company.website` | String | Website |
| `props.data.headerData.company.id` | Number | Company ID (for logo URL) |
| `props.data.headerData.table` | String | Table name (restaurant) |
| `props.data.headerData.customer_count` | Number | Guest count |

### Utilities

| Variable | Usage | Description |
|----------|-------|-------------|
| `utils.formatCurrency(amount, currency)` | `t-esc="utils.formatCurrency(receipt.amount_total, currency)"` | Format number as currency |
| `currency` | Object | Currency object with symbol, position, decimals |

### Localisation

| Variable | Description |
|----------|-------------|
| `props.data.l10n_in_hsn_summary` | India HSN summary object |
| `props.data.l10n_co_dian` | Colombia DIAN text |
| `props.data.l10n_es_pos_tbai_qrsrc` | Spain TicketBai QR |
| `props.data.l10n_fr_hash` | France hash signature |
| `props.data.base_url` | Odoo instance base URL |
| `props.data.generalNote` | General order note |
| `props.data.shippingDate` | Expected delivery date |

---

## Creating Custom Templates

### Minimal Example

```xml
<div class="pos-receipt">
    <h3 style="text-align:center;" t-esc="props.data.headerData.company.name"/>
    <div style="text-align:center;font-size:12px;" t-esc="receipt.date"/>
    <hr/>
    <t t-foreach="receipt.orderlines" t-as="line" t-key="line.id">
        <div class="d-flex justify-content-between">
            <span t-esc="line.productName"/>
            <span t-esc="line.price"/>
        </div>
    </t>
    <hr/>
    <div style="font-weight:bold;text-align:right;font-size:18px;">
        TOTAL: <span t-esc="utils.formatCurrency(receipt.amount_total, currency)"/>
    </div>
    <br/>
    <div style="text-align:center;">Thank you!</div>
</div>
```

### Tips

1. **Always wrap in `<div class="pos-receipt">`** — this ensures proper thermal printer width
2. **Use `t-key` on loops** — required by OWL for `t-foreach`
3. **Use `utils.formatCurrency()`** — never display raw numbers
4. **Use `t-esc` for text, `t-out` for HTML** — `t-esc` escapes HTML, `t-out` renders it
5. **Test with Preview** — click the Preview button in the form to see your design with sample data
6. **Use inline styles** — thermal printers don't load external CSS reliably; inline styles are safest

---

## FAQ

**Q: Can I use multiple receipt designs on different POS terminals?**  
A: Yes. Each POS configuration has its own `Receipt Design` setting. You can assign different designs to different terminals.

**Q: What happens if my custom template has an error?**  
A: The module falls back to the default Odoo receipt automatically. Check the browser console for `[Receipt Design]` error messages.

**Q: Can I use JavaScript in my templates?**  
A: The templates support OWL's QWeb expressions (e.g., `Math.abs()`, ternary operators, string methods). You cannot add arbitrary `<script>` tags.

**Q: How do I add a QR code for UPI payments?**  
A: Add an `<img>` tag in your template pointing to a QR code API:
```xml
<img t-att-src="'https://api.qrserver.com/v1/create-qr-code/?size=150x150&amp;data=upi://pay?pa=YOUR_UPI_ID&amp;am=' + receipt.amount_total"
     style="width:150px;height:150px;" alt="UPI QR"/>
```

**Q: Does it work with thermal printers?**  
A: Yes. The print styles are optimised for 80mm thermal printers (300px width). All designs are tested for thermal output.

---

## License

LGPL-3.0 — See [LICENSE](LICENSE) for details.

**Built by [Ekantah](https://ekantah.com)**
