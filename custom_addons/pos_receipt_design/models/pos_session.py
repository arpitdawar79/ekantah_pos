# -*- coding: utf-8 -*-
from odoo import api, models
import logging

_logger = logging.getLogger(__name__)


class PosSession(models.Model):
    _inherit = "pos.session"

    @api.model
    def _load_pos_data_models(self, config):
        """Register receipt.design so the POS loads it automatically."""
        models_list = super()._load_pos_data_models(config)
        if "receipt.design" not in models_list:
            models_list.append("receipt.design")
        return models_list
