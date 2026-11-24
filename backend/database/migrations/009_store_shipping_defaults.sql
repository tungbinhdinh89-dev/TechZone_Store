-- Required store configuration for a newly migrated database.
-- Preserve values already configured by an administrator.
INSERT INTO site_settings (setting_key, title, setting_value, status)
VALUES
    ('shipping_fee', 'Phí giao hàng', '30000', 'published'),
    ('shipping_free_from', 'Ngưỡng miễn phí giao hàng', '2000000', 'published')
ON DUPLICATE KEY UPDATE id = id;
