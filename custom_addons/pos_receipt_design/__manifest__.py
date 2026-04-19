# -*- coding: utf-8 -*-
{
    "name": "POS Receipt Design Pro",
    "summary": "Custom POS receipt templates with live preview, import/export, QR/barcode support, and analytics",
    "category": "Point Of Sale",
    "version": "19.0.3.0.0",
    "author": "Ekantah",
    "license": "LGPL-3",
    "website": "https://ekantah.com",
    "description": """
POS Receipt Design Pro — Odoo 19
=================================
Replace the default POS receipt with fully customisable OWL XML templates.

Key Features
------------
* **4 built-in receipt designs** — Standard, Modern, Compact, Restaurant
* **Live Preview** from the backend form with sample data
* **Import / Export** designs as JSON for sharing
* **Custom CSS** per template
* **Configurable QR / Barcode** — UPI, order-ref, ticket URL, or custom
* **Template categories** for organisation
* **Usage analytics** — track prints per design per session
* **Multi-company** record rules
* **Auto-print toggle** and logo visibility per POS config
* **Template versioning** with auto-increment on edit
* **Chatter / activity tracking** on designs
""",
    "depends": ["point_of_sale"],
    "data": [
        "security/security.xml",
        "security/ir.model.access.csv",
        "data/receipt_design_categories.xml",
        "data/receipt_design_classic.xml",
        "data/receipt_design_modern.xml",
        "data/receipt_design_compact.xml",
        "data/receipt_design_restaurant.xml",
        "views/receipt_design_views.xml",
        "views/pos_config_views.xml",
        "views/receipt_analytics_views.xml",
        "wizard/import_design_wizard_views.xml",
    ],
    "assets": {
        "point_of_sale._assets_pos": [
            "pos_receipt_design/static/src/pos_overrides/receipt_design_model.js",
            "pos_receipt_design/static/src/pos_overrides/order_receipt.js",
            "pos_receipt_design/static/src/pos_overrides/receipt_screen.scss",
            "pos_receipt_design/static/src/pos_overrides/order_receipt.xml",
        ],
        "web.assets_backend": [
            "pos_receipt_design/static/src/scss/receipt_backend.scss",
            "pos_receipt_design/static/src/js/receipt_preview.js",
        ],
    },
    "images": ["static/description/Banner.png"],
    "application": True,
    "installable": True,
    "auto_install": False,
    "pre_init_hook": "pre_init_check",
}
