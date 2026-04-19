# POS Receipt Design Pro v2.0.0 - Installation Guide

## Quick Install (Docker)

### 1. Start Containers

```bash
cd /Users/macbook/Desktop/projects/ekantah/pos2.0
docker-compose up -d
```

### 2. Access Odoo

Open: http://localhost:8070

### 3. Install Module

**Method A: Via Odoo UI**

1. Login as Administrator
2. Go to **Apps** menu
3. Click **Update Apps List** (top-right menu)
4. Search: "POS Receipt Design Pro"
5. Click **Install**

**Method B: Via Command Line**

```bash
# Enter the Odoo container
docker-compose exec web bash

# Install module
odoo -u pos_receipt_design -d your_database_name --stop-after-init
```

## Post-Installation Setup

### 1. Create Categories (Optional)

1. Go to **Point of Sale → Configuration → Receipt Designs → Categories**
2. Create categories: Standard, Modern, Restaurant, etc.

### 2. Configure POS

1. Go to **Point of Sale → Configuration → Settings**
2. Select your POS Config
3. Enable **"Custom Receipt Design"**
4. Select a **Receipt Design**
5. Enable **Auto Print** and **Show Logo** as needed

### 3. Import Sample Templates (Optional)

1. Go to **Receipt Designs**
2. Click **Import** button
3. Select JSON file with template definitions

## Troubleshooting

### Module Not Visible

```bash
# Update app list via CLI
docker-compose exec web odoo -u all -d your_db --stop-after-init
```

### Permission Issues

Ensure `custom_addons` has correct permissions:

```bash
chmod -R 755 /Users/macbook/Desktop/projects/ekantah/pos2.0/custom_addons
```

### Dependencies Missing

The module requires:

- `point_of_sale` (core)
- `barcodes` (for QR/barcodes)
- `web_editor` (for HTML editing)

These are included in standard Odoo 19.

## Verification

After installation, check:

1. **Point of Sale → Configuration → Receipt Designs** menu appears
2. Categories submenu is visible
3. Analytics submenu is visible
4. Create/Edit form has tabs: Design, Styling, Barcodes & QR, Notes

## Upgrade from v1.x

If upgrading from previous version:

1. Backup database
2. Update module files
3. Restart Odoo
4. Update app list
5. Click **Upgrade** on the module

The filestore is missing many asset files, not just one. You need to clear all asset bundle attachments so Odoo regenerates them all at once.

Run this on the server:

bash
docker exec -it pos-web odoo shell -d pos_ekantah_prod --db_host=pixopie-postgres --db_user=pixopie --db_password=hey.pixo.pie778 -c /etc/odoo/odoo.conf
Then inside the shell:

python

# Delete ALL asset bundle attachments (they'll be regenerated on next request)

env['ir.attachment'].search([('name', 'like', 'web.assets_%')]).unlink()
env.cr.commit()
Then exit and restart:

bash
docker restart pos-web
If that still doesn't fix it (more broken files keep appearing), the entire filestore is out of sync with the database. In that case, do a full purge:

python

# Nuclear option: delete ALL attachments stored in filestore

env['ir.attachment'].search([('store_fname', '!=', False)]).unlink()
env.cr.commit()
This forces Odoo to regenerate every asset and re-store every binary from their database db_datas column (if available). After this, restart the container.

Also note: the ir_module_module error on database pixopie is a separate issue — that's the default postgres maintenance DB being polled by cron. It's harmless and can be ignored.

Feedback submitted

Command Awaiting Approval
