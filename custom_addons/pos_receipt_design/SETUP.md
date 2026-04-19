# Setup & Installation Guide

**POS Receipt Design Pro for Odoo 19**

This guide covers every step from prerequisites to configuring custom receipts on your POS terminals.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Installation Methods](#2-installation-methods)
   - [Method A: CLI (Command Line)](#method-a-cli-command-line)
   - [Method B: Odoo Web UI](#method-b-odoo-web-ui)
3. [Post-Installation Verification](#3-post-installation-verification)
4. [Configuration](#4-configuration)
   - [Step 1: Enable Custom Receipts](#step-1-enable-custom-receipts)
   - [Step 2: Select a Receipt Design](#step-2-select-a-receipt-design)
   - [Step 3: Configure Receipt Options](#step-3-configure-receipt-options)
5. [Managing Receipt Designs](#5-managing-receipt-designs)
   - [Browse Designs](#browse-designs)
   - [Edit a Design](#edit-a-design)
   - [Preview a Design](#preview-a-design)
   - [Create a New Design](#create-a-new-design)
   - [Set Default Design](#set-default-design)
   - [Import / Export Designs](#import--export-designs)
6. [Template Customisation](#6-template-customisation)
   - [Adding Company Logo](#adding-company-logo)
   - [Adding a UPI QR Code](#adding-a-upi-qr-code)
   - [Adding Custom CSS](#adding-custom-css)
   - [Conditional Sections](#conditional-sections)
7. [Analytics & Tracking](#7-analytics--tracking)
8. [Upgrading the Module](#8-upgrading-the-module)
9. [Uninstalling](#9-uninstalling)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Requirement | Version |
|-------------|---------|
| **Odoo** | 19.0 (Community or Enterprise) |
| **Python** | 3.10 or higher |
| **PostgreSQL** | 14 or higher |
| **Dependencies** | `point_of_sale` module (included in Odoo) |

No additional Python packages or npm dependencies are required.

---

## 2. Installation Methods

### Method A: CLI (Command Line)

This is the recommended method for developers and sysadmins.

#### Step 1: Place the addon

Copy the `pos_receipt_design` folder into your Odoo custom addons directory:

```bash
# If your custom addons path is configured in odoo.conf:
cp -r pos_receipt_design /path/to/custom_addons/

# Verify it's in the right place:
ls /path/to/custom_addons/pos_receipt_design/__manifest__.py
```

#### Step 2: Update the addons path

Make sure your `odoo.conf` includes the custom addons directory:

```ini
[options]
addons_path = /path/to/odoo/addons,/path/to/custom_addons
```

#### Step 3: Update the module list

```bash
# Update the apps list so Odoo discovers the new module:
python3 odoo-bin -c /path/to/odoo.conf -d YOUR_DATABASE --update=base --stop-after-init
```

Or restart your Odoo server and update the apps list from the UI.

#### Step 4: Install the module

```bash
# Install directly from CLI:
python3 odoo-bin -c /path/to/odoo.conf -d YOUR_DATABASE -i pos_receipt_design --stop-after-init
```

#### Step 5: Restart Odoo

```bash
# Restart the service to load all assets:
sudo systemctl restart odoo

# Or if running manually:
python3 odoo-bin -c /path/to/odoo.conf
```

#### One-liner (for development)

```bash
python3 odoo-bin -c odoo.conf -d mydb -i pos_receipt_design --stop-after-init && python3 odoo-bin -c odoo.conf -d mydb
```

---

### Method B: Odoo Web UI

This method works for administrators without CLI access.

#### Step 1: Place the addon

Upload the `pos_receipt_design` folder to the server's custom addons path.

#### Step 2: Activate developer mode

1. Go to **Settings** → scroll to the bottom
2. Click **Activate the developer mode** (or add `?debug=1` to the URL)

#### Step 3: Update the Apps list

1. Go to **Apps** in the top menu
2. Click **Update Apps List** (in the dropdown menu or top-right area)
3. Click **Update** in the confirmation dialog

#### Step 4: Search and install

1. In the **Apps** menu, remove the "Apps" filter in the search bar
2. Search for **"POS Receipt Design Pro"**
3. Click **Install**

#### Step 5: Wait for installation

Odoo will:
- Create the database tables (`receipt.design`, `receipt.design.category`, `receipt.design.analytics`)
- Load the 4 default receipt designs
- Create the 4 default categories (Standard, Modern, Compact, Restaurant)
- Compile the SCSS and JS assets

---

## 3. Post-Installation Verification

After installation, verify everything is working:

### Check the menu

1. Go to **Point of Sale** → **Configuration** → **Receipt Designs**
2. You should see 4 default designs:
   - Classic Receipt (marked as Default)
   - Modern Minimal
   - Compact Grid
   - Restaurant Receipt

### Check POS settings

1. Go to **Point of Sale** → **Configuration** → **Settings**
2. Select a POS configuration
3. Scroll to the **Interface** section
4. You should see the **Custom Receipt Design** option

### Check assets

1. Open the POS interface in your browser
2. Open the browser console (`F12` → Console tab)
3. There should be no `[Receipt Design]` error messages during boot

---

## 4. Configuration

### Step 1: Enable Custom Receipts

1. Navigate to **Point of Sale** → **Configuration** → **Settings**
2. Select the POS configuration you want to customise (e.g., "Shop")
3. Scroll to the **Interface** section
4. Toggle **Custom Receipt Design** to **ON**

### Step 2: Select a Receipt Design

Once custom receipts are enabled:

1. The **Receipt Template** dropdown appears
2. Select one of the 4 built-in designs, or any custom design you've created
3. Click **Save**

> **Tip:** If you don't see any designs in the dropdown, go to **Receipt Designs** and make sure at least one design is **Active** and belongs to your company (or has no company set).

### Step 3: Configure Receipt Options

Below the template selector, you'll find:

| Setting | Description | Default |
|---------|-------------|---------|
| **Auto Print** | Automatically print the receipt when an order is completed | ✅ On |
| **Show Logo** | Display the company logo on the receipt | ✅ On |

Click **Save** to apply.

### Step 4: Test in POS

1. Open the POS interface for the configured terminal
2. Create a test order with a few items
3. Process payment
4. The receipt screen should show your custom design instead of the default

---

## 5. Managing Receipt Designs

### Browse Designs

Navigate to **Point of Sale** → **Configuration** → **Receipt Designs**

- **List view** — See all designs with version, usage count, and default status
- **Kanban view** — Visual cards grouped by category
- **Search filters** — Active, Archived, System Templates, Default

### Edit a Design

1. Click on any design to open the form view
2. Switch to the **Template Design** tab
3. Edit the XML in the ACE code editor
4. Click **Save** — the version number auto-increments

### Preview a Design

1. Open a design in form view
2. Click the **Preview** button in the header bar
3. A dialog shows the receipt rendered with sample data (4 items, tax lines, payment)
4. Check layout, spacing, and formatting

### Create a New Design

1. Click **New** in the Receipt Designs list
2. Enter a **Template Name**
3. Select a **Category**
4. Paste or write your XML template in the **Template Design** tab
5. Optionally add **Custom CSS** in the Styling tab
6. Click **Save**
7. Click **Preview** to check it

### Set Default Design

1. Open the design you want as default
2. Click the **Set as Default** button in the header
3. The green "Default" ribbon appears
4. This design is auto-selected when enabling custom receipts on a new POS config

### Import / Export Designs

#### Export

1. Open a design → click **Export** in the header
2. A JSON file downloads to your browser
3. Share this file with other Odoo instances

#### Import

1. Go to **Receipt Designs** → **Import Design** (in the menu)
2. Select **Create New** or **Update Existing**
3. Upload the JSON file
4. Click **Import**
5. The design is created/updated with all settings

---

## 6. Template Customisation

### Adding Company Logo

```xml
<!-- Dynamic logo from company record -->
<img t-attf-src="/web/image?model=res.company&amp;id={{props.data.headerData.company.id}}&amp;field=logo"
     alt="Logo" class="pos-receipt-logo"/>
```

### Adding a UPI QR Code

```xml
<!-- UPI Payment QR (replace YOUR_UPI_ID with actual VPA) -->
<t t-set="upi_id" t-value="'merchant@upi'"/>
<t t-set="merchant_name" t-value="'Your Business Name'"/>
<div style="text-align:center;margin:10px 0;">
    <img t-att-src="'https://api.qrserver.com/v1/create-qr-code/?size=177x177&amp;data=upi://pay?pa=' + upi_id + '&amp;pn=' + encodeURIComponent(merchant_name) + '&amp;am=' + receipt.amount_total + '&amp;cu=INR'"
         style="width:177px;height:177px;" alt="Pay via UPI"/>
    <div style="font-size:12px;margin-top:4px;">Scan to pay via UPI</div>
</div>
```

> **Note:** The UPI ID is set in the template itself — not hardcoded in the module. Each design can have its own UPI configuration.

### Adding Custom CSS

Go to the **Styling (CSS)** tab in the design form:

```css
/* Make the header bold and centered */
.pos-receipt h4 {
    font-weight: 800;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* Dashed dividers instead of solid */
.pos-receipt hr {
    border: none;
    border-top: 1px dashed #000;
}

/* Larger total amount */
.pos-receipt .receipt-total {
    font-size: 24px;
    font-weight: 900;
}
```

### Conditional Sections

Show content only when certain data exists:

```xml
<!-- Show customer info only if a customer is set -->
<t t-if="receipt.partner">
    <div>Customer: <t t-esc="receipt.partner.name"/></div>
</t>

<!-- Show discount only if there's a discount -->
<t t-if="line.discount and line.discount > 0">
    <div style="color:#888;font-size:12px;">
        <t t-esc="line.discount"/>% off
    </div>
</t>

<!-- Show table info (restaurant mode) -->
<t t-if="props.data.headerData.table">
    <div>
        Table: <t t-esc="props.data.headerData.table"/>
        <t t-if="props.data.headerData.customer_count">
            | Guests: <t t-esc="props.data.headerData.customer_count"/>
        </t>
    </div>
</t>

<!-- Tax included vs excluded logic -->
<t t-set="taxincluded" t-value="Math.abs(receipt.total_without_tax - receipt.amount_total) &lt;= 0.000001"/>
<t t-if="!taxincluded">
    <!-- Show subtotal + individual taxes -->
</t>
<t t-if="taxincluded">
    <!-- Show tax breakdown after total -->
</t>
```

---

## 7. Analytics & Tracking

Navigate to **Point of Sale** → **Configuration** → **Receipt Designs** → **Analytics**

### Available Views

| View | Use |
|------|-----|
| **List** | Detailed log of every receipt print |
| **Graph** | Bar chart of prints per day per design |
| **Pivot** | Cross-tab of designs vs time with print counts |

### Filters

- **Today** — Today's prints
- **This Week** — Last 7 days
- **This Month** — Last 30 days
- **Group by Design** — See which templates are most used
- **Group by POS Config** — See usage per terminal

---

## 8. Upgrading the Module

When you have a new version of the module:

### Via CLI

```bash
# Replace the addon files, then:
python3 odoo-bin -c odoo.conf -d YOUR_DATABASE -u pos_receipt_design --stop-after-init

# Restart:
sudo systemctl restart odoo
```

### Via UI

1. Go to **Apps**
2. Search for "POS Receipt Design Pro"
3. Click the **⋮** menu → **Upgrade**

> **Important:** The 4 built-in designs are loaded with `noupdate="1"`, so upgrading will NOT overwrite your customisations to those designs.

---

## 9. Uninstalling

### Via CLI

```bash
python3 odoo-bin -c odoo.conf -d YOUR_DATABASE --uninstall=pos_receipt_design --stop-after-init
```

### Via UI

1. Go to **Apps**
2. Search for "POS Receipt Design Pro"
3. Click the **⋮** menu → **Uninstall**

This will:
- Remove all receipt design records
- Remove the custom fields from `pos.config`
- Restore the default POS receipt behaviour
- Drop the analytics tables

---

## 10. Troubleshooting

### POS won't load after installation

**Cause:** Asset compilation error.

**Fix:**
```bash
# Clear all asset caches:
python3 odoo-bin -c odoo.conf -d YOUR_DATABASE shell -c "
env['ir.attachment'].search([('url', 'like', '/web/assets/')]).unlink()
env.cr.commit()
"

# Restart Odoo:
sudo systemctl restart odoo
```

Or in the browser: `your-odoo-url/web?debug=assets` and hard-refresh (`Ctrl+Shift+R`).

### Custom receipt not showing

**Checklist:**
1. ✅ Is **Custom Receipt Design** enabled in POS Settings?
2. ✅ Is a **Receipt Template** selected?
3. ✅ Is the selected design **Active**?
4. ✅ Does the design belong to the same **Company** as the POS config (or no company set)?
5. ✅ Open browser console — any `[Receipt Design]` errors?

### Template rendering error

**Symptoms:** Default receipt shows instead of custom; console shows `[Receipt Design] Render error`.

**Common causes:**
- Invalid XML (unclosed tags, missing quotes)
- Using `t-esc` on an undefined variable
- Missing `t-key` on `t-foreach` loops

**Fix:** Click **Preview** in the design form to see the exact error message.

### "Module support Odoo series 19.0 but found X.0"

**Cause:** You're trying to install on Odoo 17 or 18.

**Fix:** This module is exclusively for Odoo 19. Use the appropriate version for your Odoo installation.

### Changes to template not reflected in POS

**Cause:** Template cache in the POS frontend.

**Fix:**
1. Close and reopen the POS session
2. Hard-refresh the POS browser tab (`Ctrl+Shift+R`)
3. The template cache is per-session; a new session always loads fresh data

### Import fails with "Invalid JSON file"

**Cause:** The file is not a valid JSON export from this module.

**Fix:**
- Ensure the file was exported using the **Export** button in this module
- Check that the file contains a `receipt_design` key
- Verify the file encoding is UTF-8

---

**Need help?** Contact [Ekantah Support](https://ekantah.com/contact)
