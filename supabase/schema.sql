-- ============================================================
-- نظام الإيجارات الزراعية - مخطط قاعدة البيانات
-- Agricultural Rental System - Database Schema
-- الإصدار: 1.0.0
-- ============================================================

-- تفعيل امتداد UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. جدول المستأجرين (tenants)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal       TEXT,                          -- رقم الجريدة
    name          TEXT NOT NULL,                  -- اسم المستأجر
    district      TEXT,                          -- الناحية
    sahm          NUMERIC(10,4) DEFAULT 0,        -- السهم
    qirat         NUMERIC(10,4) DEFAULT 0,        -- القيراط
    feddan        NUMERIC(10,4) DEFAULT 0,        -- الفدان
    infringements_count INTEGER DEFAULT 0,        -- عدد التعديات
    hand_holder   TEXT,                          -- واضع اليد
    location_url  TEXT,                          -- رابط الموقع
    phone         TEXT,                          -- رقم الهاتف
    notes         TEXT,                          -- ملاحظات
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. جدول القطع (parcels) - تفاصيل المساحات الفرعية
-- ============================================================
CREATE TABLE IF NOT EXISTS parcels (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tenant_name   TEXT,                          -- اسم المستأجر (للعرض السريع)
    district      TEXT,                          -- الناحية
    basin         TEXT,                          -- الحوض
    sahm          NUMERIC(10,4) DEFAULT 0,
    qirat         NUMERIC(10,4) DEFAULT 0,
    feddan        NUMERIC(10,4) DEFAULT 0,
    location      TEXT,                          -- وصف الموقع
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. جدول التعديات (infringements)
-- ============================================================
CREATE TABLE IF NOT EXISTS infringements (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tenant_name       TEXT,
    infringement_type TEXT,                      -- نوع التعدي
    transgressor_name TEXT,                      -- اسم المتعدي
    area_sqm          NUMERIC(12,2) DEFAULT 0,   -- المساحة بالمتر المربع
    description       TEXT,                      -- وصف التعدي
    action_taken      TEXT,                      -- الإجراء المتخذ
    registered_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. جدول الوثائق (documents)
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tenant_name     TEXT,
    document_date   DATE,                        -- تاريخ الوثيقة
    document_number TEXT,                        -- رقم الوثيقة
    entity          TEXT,                        -- الجهة المصدرة
    document_type   TEXT,                        -- نوع الوثيقة
    document_link   TEXT,                        -- رابط الوثيقة
    document_name   TEXT,                        -- اسم الوثيقة
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. جدول النسخ الاحتياطية (backups)
-- ============================================================
CREATE TABLE IF NOT EXISTS backups (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_number   SERIAL,                      -- رقم النسخة
    date            DATE DEFAULT CURRENT_DATE,
    time            TIME DEFAULT CURRENT_TIME,
    "user"          TEXT DEFAULT 'admin',
    type            TEXT DEFAULT 'full',         -- full / partial
    size            TEXT,                        -- حجم الملف
    notes           TEXT,
    download_link   TEXT,                        -- رابط التحميل من Supabase Storage
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. جدول سجلات النظام (system_logs)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp   TIMESTAMPTZ DEFAULT NOW(),
    log_type    TEXT,      -- info / warning / error / success
    operation   TEXT,      -- add / update / delete / backup / restore / export / import
    "user"      TEXT DEFAULT 'admin',
    details     TEXT,
    context     JSONB      -- بيانات إضافية (اسم المستأجر، المعرف، إلخ)
);

-- ============================================================
-- 7. جدول الإعدادات (app_settings)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- القيم الافتراضية للإعدادات
INSERT INTO app_settings (key, value) VALUES
    ('feddan_price', '1000'),
    ('system_name', 'نظام الإيجارات الزراعية'),
    ('restore_code', ''),
    ('wati_api_key', ''),
    ('wati_base_url', ''),
    ('emailjs_service_id', ''),
    ('emailjs_template_id', ''),
    ('emailjs_public_key', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- الفهارس لتحسين الأداء
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tenants_name       ON tenants(name);
CREATE INDEX IF NOT EXISTS idx_tenants_district   ON tenants(district);
CREATE INDEX IF NOT EXISTS idx_tenants_journal    ON tenants(journal);
CREATE INDEX IF NOT EXISTS idx_parcels_tenant     ON parcels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_infringements_tenant ON infringements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant   ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp     ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_type          ON system_logs(log_type);

-- ============================================================
-- دالة تحديث عدد التعديات تلقائياً
-- ============================================================
CREATE OR REPLACE FUNCTION update_infringements_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tenants
        SET infringements_count = infringements_count + 1
        WHERE id = NEW.tenant_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tenants
        SET infringements_count = GREATEST(infringements_count - 1, 0)
        WHERE id = OLD.tenant_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_infringements_count
AFTER INSERT OR DELETE ON infringements
FOR EACH ROW EXECUTE FUNCTION update_infringements_count();
