# -*- coding: utf-8 -*-
from . import models
from . import wizard


def pre_init_check(env):
    from odoo.service import common
    from odoo.exceptions import UserError

    version_info = common.exp_version()
    server_serie = version_info.get("server_serie")
    if server_serie and not server_serie.startswith("19."):
        raise UserError(
            f"POS Receipt Design Pro requires Odoo 19.x but found {server_serie}."
        )
