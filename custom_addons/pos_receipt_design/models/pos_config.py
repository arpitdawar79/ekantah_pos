# -*- coding: utf-8 -*-
from odoo import api, fields, models


class PosConfig(models.Model):
    _inherit = "pos.config"

    def write(self, vals):
        """Invalidate receipt cache when receipt-related settings change."""
        receipt_fields = [
            'use_custom_receipt', 'receipt_design_id', 'receipt_auto_print',
            'receipt_show_logo', 'receipt_show_upi_qr', 'upi_id',
            'upi_merchant_name', 'upi_payment_note', 'use_customer_display',
            'customer_display_design_id'
        ]
        # Check if any receipt-related field is being changed
        if any(field in vals for field in receipt_fields):
            # Invalidate receipt cache for all designs
            self.env['receipt.design'].sudo().invalidate_receipt_cache(self.id)
        return super(PosConfig, self).write(vals)

    use_custom_receipt = fields.Boolean(string="Use Custom Receipt")
    receipt_design_id = fields.Many2one(
        "receipt.design",
        string="Receipt Design",
        domain="[('active', '=', True), '|', ('company_id', '=', False), ('company_id', '=', company_id)]",
    )
    receipt_auto_print = fields.Boolean(string="Auto Print Receipt", default=True)
    receipt_show_logo = fields.Boolean(string="Show Logo on Receipt", default=True)

    # UPI QR Code Payment settings
    receipt_show_upi_qr = fields.Boolean(string="Show UPI QR Code", default=False)
    upi_id = fields.Char(string="UPI ID", help="UPI ID for receiving payments (e.g., 9873505995@ptsbi)")
    upi_merchant_name = fields.Char(string="Merchant Name", help="Merchant name to display on UPI payment")
    upi_payment_note = fields.Char(string="Payment Note", help="Default note for UPI payments (e.g., 'Tony's Cafe Bill Payment')")

    # Customer-facing display
    use_customer_display = fields.Boolean(string="Use Customer Display")
    customer_display_design_id = fields.Many2one(
        "receipt.design",
        string="Customer Display Design",
        domain="[('active', '=', True)]",
    )

    @api.onchange("use_custom_receipt")
    def _onchange_use_custom_receipt(self):
        """Auto-select the default design when toggling on."""
        if self.use_custom_receipt and not self.receipt_design_id:
            default = self.env["receipt.design"].search(
                [
                    ("is_default", "=", True),
                    "|",
                    ("company_id", "=", False),
                    ("company_id", "=", self.company_id.id),
                ],
                limit=1,
                order="sequence, id desc",
            )
            if default:
                self.receipt_design_id = default


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    use_custom_receipt = fields.Boolean(
        string="Use Custom Receipt",
        related="pos_config_id.use_custom_receipt",
        readonly=False,
    )
    receipt_design_id = fields.Many2one(
        "receipt.design",
        string="Receipt Design",
        related="pos_config_id.receipt_design_id",
        readonly=False,
    )
    receipt_auto_print = fields.Boolean(
        string="Auto Print Receipt",
        related="pos_config_id.receipt_auto_print",
        readonly=False,
    )
    receipt_show_logo = fields.Boolean(
        string="Show Logo on Receipt",
        related="pos_config_id.receipt_show_logo",
        readonly=False,
    )
    receipt_show_upi_qr = fields.Boolean(
        string="Show UPI QR Code",
        related="pos_config_id.receipt_show_upi_qr",
        readonly=False,
    )
    upi_id = fields.Char(
        string="UPI ID",
        related="pos_config_id.upi_id",
        readonly=False,
    )
    upi_merchant_name = fields.Char(
        string="Merchant Name",
        related="pos_config_id.upi_merchant_name",
        readonly=False,
    )
    upi_payment_note = fields.Char(
        string="Payment Note",
        related="pos_config_id.upi_payment_note",
        readonly=False,
    )
