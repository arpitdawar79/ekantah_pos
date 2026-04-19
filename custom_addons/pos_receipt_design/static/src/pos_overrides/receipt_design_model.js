/** @odoo-module */

import { registry } from "@web/core/registry";
import { Base } from "@point_of_sale/app/models/related_models";

export class ReceiptDesign extends Base {
    static pythonModel = "receipt.design";
}

registry.category("pos_available_models").add(ReceiptDesign.pythonModel, ReceiptDesign);
