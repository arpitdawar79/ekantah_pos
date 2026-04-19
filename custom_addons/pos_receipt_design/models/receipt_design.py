# -*- coding: utf-8 -*-
from odoo import api, fields, models, _, tools
from odoo.exceptions import UserError, ValidationError
import base64
import json
import logging

_logger = logging.getLogger(__name__)


class ReceiptDesignCategory(models.Model):
    _name = "receipt.design.category"
    _description = "Receipt Design Category"
    _order = "sequence, name"

    name = fields.Char(string="Category Name", required=True, translate=True)
    sequence = fields.Integer(string="Sequence", default=10)
    color = fields.Integer(string="Color Index")
    design_count = fields.Integer(
        string="Design Count", compute="_compute_design_count"
    )
    company_id = fields.Many2one(
        "res.company", string="Company", default=lambda self: self.env.company
    )

    def _compute_design_count(self):
        data = self.env["receipt.design"].read_group(
            [("category_id", "in", self.ids)], ["category_id"], ["category_id"]
        )
        mapped = {d["category_id"][0]: d["category_id_count"] for d in data}
        for category in self:
            category.design_count = mapped.get(category.id, 0)


class ReceiptDesign(models.Model):
    _name = "receipt.design"
    _rec_name = "name"
    _description = "Receipt Design"
    _order = "sequence, name"
    _inherit = ["mail.thread", "mail.activity.mixin", "pos.load.mixin"]

    # ------------------------------------------------------------------
    # Odoo 19 POS data-loading interface
    # ------------------------------------------------------------------
    @api.model
    def _load_pos_data_domain(self, data, config):
        company_id = config.company_id.id if config else self.env.company.id
        return [
            ("active", "=", True),
            "|",
            ("company_id", "=", False),
            ("company_id", "=", company_id),
        ]

    @api.model
    def _load_pos_data_fields(self, config):
        return [
            "name",
            "receipt_design",
            "custom_css",
            "sequence",
            "show_order_barcode",
            "show_order_qr",
            "qr_code_content",
            "custom_qr_url",
            "custom_header",
            "custom_footer",
            "is_default",
            "usage_count",
        ]

    @api.model
    def _load_pos_data_domain(self, data, config):
        """Override to add cache-busting timestamp for force reload."""
        domain = super()._load_pos_data_domain(data, config) if hasattr(super(), '_load_pos_data_domain') else [
            ("active", "=", True),
            "|",
            ("company_id", "=", False),
            ("company_id", "=", config.company_id.id if config else self.env.company.id),
        ]
        return domain

    @api.model
    def invalidate_receipt_cache(self, config_id=None):
        """Invalidate all receipt-related caches after settings change.
        
        Call this method from settings changes to ensure POS gets fresh data.
        """
        self.env.invalidate_all()

        _logger.info("Receipt design cache invalidated for config_id=%s", config_id)
        return True

    # ------------------------------------------------------------------
    # Fields
    # ------------------------------------------------------------------
    # Basic
    name = fields.Char(string="Template Name", required=True, tracking=True)
    sequence = fields.Integer(string="Sequence", default=10)
    active = fields.Boolean(string="Active", default=True, tracking=True)

    # Categorisation
    category_id = fields.Many2one("receipt.design.category", string="Category")
    is_default = fields.Boolean(string="Default Template", default=False)
    is_system_template = fields.Boolean(
        string="System Template",
        default=False,
        help="System templates cannot be deleted",
    )

    # Design content
    receipt_design = fields.Text(
        string="Receipt XML Template", required=True, tracking=True
    )
    custom_css = fields.Text(
        string="Custom CSS", help="Additional CSS styles for the receipt"
    )

    # Barcode / QR configuration
    show_order_barcode = fields.Boolean(string="Show Order Barcode", default=False)
    show_order_qr = fields.Boolean(string="Show Order QR Code", default=False)
    qr_code_content = fields.Selection(
        [
            ("order_ref", "Order Reference"),
            ("pos_url", "POS Ticket URL"),
            ("custom", "Custom URL"),
        ],
        string="QR Code Content",
        default="order_ref",
    )
    custom_qr_url = fields.Char(
        string="Custom QR URL Pattern",
        help="Use {order_ref} as placeholder for order reference",
    )

    # Header / Footer
    custom_header = fields.Html(string="Custom Header")
    custom_footer = fields.Html(string="Custom Footer")

    # Company & Stats
    company_id = fields.Many2one(
        "res.company", string="Company", default=lambda self: self.env.company
    )
    usage_count = fields.Integer(string="Usage Count", default=0)
    last_used = fields.Datetime(string="Last Used")

    # Metadata
    version = fields.Char(string="Version", default="1.0")
    author = fields.Char(string="Author", default=lambda self: self.env.user.name)
    created_date = fields.Datetime(
        string="Created Date", default=fields.Datetime.now
    )
    notes = fields.Text(string="Notes / Description")

    # Import / Export file
    design_file = fields.Binary(string="Import/Export File")
    design_filename = fields.Char(string="Filename")

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------
    def action_preview(self):
        """Open a client-action preview dialog with sample data."""
        self.ensure_one()
        return {
            "type": "ir.actions.client",
            "tag": "receipt_design_preview",
            "params": {
                "design_id": self.id,
                "design_xml": self.receipt_design,
            },
        }

    def action_duplicate(self):
        """Create a copy of this design."""
        self.ensure_one()
        new = self.copy(
            default={
                "name": f"{self.name} (Copy)",
                "is_system_template": False,
                "is_default": False,
                "version": "1.0",
                "usage_count": 0,
            }
        )
        return {
            "type": "ir.actions.act_window",
            "res_model": "receipt.design",
            "res_id": new.id,
            "view_mode": "form",
            "target": "current",
        }

    def action_export(self):
        """Export this design to a downloadable JSON file."""
        self.ensure_one()
        payload = {
            "name": self.name,
            "version": self.version,
            "category": self.category_id.name if self.category_id else False,
            "receipt_design": self.receipt_design,
            "custom_css": self.custom_css or "",
            "custom_header": self.custom_header or "",
            "custom_footer": self.custom_footer or "",
            "show_order_barcode": self.show_order_barcode,
            "show_order_qr": self.show_order_qr,
            "qr_code_content": self.qr_code_content,
            "custom_qr_url": self.custom_qr_url or "",
            "notes": self.notes or "",
            "export_date": fields.Datetime.now().isoformat(),
            "odoo_version": "19.0",
        }
        blob = json.dumps(payload, indent=2, ensure_ascii=False)
        fname = f"receipt_design_{self.name.replace(' ', '_').lower()}.json"
        self.write(
            {
                "design_file": base64.b64encode(blob.encode("utf-8")),
                "design_filename": fname,
            }
        )
        return {
            "type": "ir.actions.act_url",
            "url": f"/web/content/receipt.design/{self.id}/design_file/{fname}?download=1",
            "target": "self",
        }

    def action_set_default(self):
        """Mark this design as the default for its company."""
        self.ensure_one()
        self.search(
            [
                ("is_default", "=", True),
                ("company_id", "=", self.company_id.id),
                ("id", "!=", self.id),
            ]
        ).write({"is_default": False})
        self.is_default = True

    def action_update_usage(self):
        """Increment usage counter — called from POS after each print."""
        self.write(
            {
                "usage_count": self.usage_count + 1,
                "last_used": fields.Datetime.now(),
            }
        )

    # ------------------------------------------------------------------
    # ORM overrides
    # ------------------------------------------------------------------
    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("is_default"):
                company = vals.get("company_id", self.env.company.id)
                self.search(
                    [("is_default", "=", True), ("company_id", "=", company)]
                ).write({"is_default": False})
        return super().create(vals_list)

    def write(self, vals):
        if vals.get("is_default"):
            for rec in self:
                self.search(
                    [
                        ("is_default", "=", True),
                        ("company_id", "=", rec.company_id.id),
                        ("id", "!=", rec.id),
                    ]
                ).write({"is_default": False})

        # Check if design content changed
        design_changed = "receipt_design" in vals or "custom_css" in vals

        # Auto-increment version when the template body changes
        if "receipt_design" in vals and "version" not in vals:
            for rec in self:
                try:
                    cur = float(rec.version or "1.0")
                    vals["version"] = str(round(cur + 0.1, 1))
                except (ValueError, TypeError):
                    vals["version"] = "1.0"

        result = super().write(vals)

        # Invalidate cache if design content changed
        if design_changed:
            self.invalidate_receipt_cache()

        return result

    def unlink(self):
        for rec in self:
            if rec.is_system_template:
                raise UserError(
                    _("Cannot delete system template '%s'. Archive it instead.")
                    % rec.name
                )
        return super().unlink()

    # ------------------------------------------------------------------
    # QR / Barcode helpers (used by receipt templates)
    # ------------------------------------------------------------------
    def _get_barcode_url(self, order_ref):
        return f"/report/barcode/Code128/{order_ref}"

    def _get_qr_url(self, order_ref, base_url=""):
        if self.qr_code_content == "order_ref":
            content = order_ref
        elif self.qr_code_content == "pos_url":
            content = f"{base_url}/pos/ticket/{order_ref}"
        elif self.qr_code_content == "custom" and self.custom_qr_url:
            content = self.custom_qr_url.replace("{order_ref}", str(order_ref))
        else:
            content = order_ref
        encoded = base64.urlsafe_b64encode(content.encode()).decode()
        return f"/report/barcode/QR/{encoded}"


class ReceiptDesignAnalytics(models.Model):
    _name = "receipt.design.analytics"
    _description = "Receipt Design Usage Analytics"
    _order = "date desc"

    design_id = fields.Many2one(
        "receipt.design", string="Design", required=True, ondelete="cascade"
    )
    date = fields.Datetime(string="Date", default=fields.Datetime.now)
    pos_session_id = fields.Many2one("pos.session", string="POS Session")
    pos_config_id = fields.Many2one("pos.config", string="POS Config")
    order_id = fields.Many2one("pos.order", string="Order")
    company_id = fields.Many2one(
        "res.company", string="Company", default=lambda self: self.env.company
    )
    print_triggered = fields.Boolean(string="Print Triggered", default=True)
    reprint_count = fields.Integer(string="Reprint Count", default=0)
