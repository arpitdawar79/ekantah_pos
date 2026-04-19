# -*- coding: utf-8 -*-
from odoo import api, fields, models, _
from odoo.exceptions import UserError
import base64
import json


class ReceiptDesignImportWizard(models.TransientModel):
    _name = "receipt.design.import.wizard"
    _description = "Import Receipt Design Wizard"

    import_file = fields.Binary(string="Design File", required=True)
    filename = fields.Char(string="Filename")
    import_mode = fields.Selection(
        [("create", "Create New"), ("update", "Update Existing")],
        string="Import Mode",
        default="create",
    )
    target_design = fields.Many2one(
        "receipt.design",
        string="Design to Update",
        domain="[('is_system_template', '=', False)]",
    )

    def action_import(self):
        """Import receipt design from a JSON file."""
        self.ensure_one()
        if not self.import_file:
            raise UserError(_("Please select a file to import."))

        try:
            raw = base64.b64decode(self.import_file)
            data = json.loads(raw.decode("utf-8"))
        except Exception as e:
            raise UserError(_("Invalid JSON file: %s") % str(e))

        if "receipt_design" not in data:
            raise UserError(
                _("Invalid design file: missing 'receipt_design' content.")
            )

        vals = {
            "name": data.get("name", "Imported Design"),
            "receipt_design": data["receipt_design"],
            "custom_css": data.get("custom_css") or False,
            "custom_header": data.get("custom_header") or False,
            "custom_footer": data.get("custom_footer") or False,
            "show_order_barcode": data.get("show_order_barcode", False),
            "show_order_qr": data.get("show_order_qr", False),
            "qr_code_content": data.get("qr_code_content", "order_ref"),
            "custom_qr_url": data.get("custom_qr_url") or False,
            "notes": data.get("notes") or False,
            "version": data.get("version", "1.0"),
            "is_system_template": False,
            "is_default": False,
        }

        # Auto-create category if specified
        cat_name = data.get("category")
        if cat_name:
            cat = self.env["receipt.design.category"].search(
                [("name", "=", cat_name)], limit=1
            )
            if not cat:
                cat = self.env["receipt.design.category"].create({"name": cat_name})
            vals["category_id"] = cat.id

        if self.import_mode == "create":
            design = self.env["receipt.design"].create(vals)
        else:
            if not self.target_design:
                raise UserError(_("Please select a design to update."))
            self.target_design.write(vals)
            design = self.target_design

        return {
            "type": "ir.actions.client",
            "tag": "display_notification",
            "params": {
                "title": _("Import Successful"),
                "message": _("Design '%s' imported successfully.") % design.name,
                "type": "success",
                "next": {
                    "type": "ir.actions.act_window",
                    "res_model": "receipt.design",
                    "res_id": design.id,
                    "view_mode": "form",
                    "target": "current",
                },
            },
        }
