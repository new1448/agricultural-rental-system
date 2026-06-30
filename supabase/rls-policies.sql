-- ============================================================
-- سياسات الأمان (Row Level Security)
-- ============================================================
-- ملاحظة: هذا المشروع يستخدم anon key مع RLS مفتوحة
-- لبيئة داخلية. في الإنتاج الحقيقي استخدم Auth.
-- ============================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE infringements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings     ENABLE ROW LEVEL SECURITY;

-- السماح لـ anon بالقراءة والكتابة (للاستخدام الداخلي)
-- في حالة الإنتاج: استبدل بـ auth.uid() IS NOT NULL

CREATE POLICY "allow_all_tenants"       ON tenants        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_parcels"       ON parcels        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_infringements" ON infringements  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_documents"     ON documents      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_backups"       ON backups        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_logs"          ON system_logs    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_settings"      ON app_settings   FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- إنشاء Bucket للنسخ الاحتياطية في Supabase Storage
-- (نفّذ هذا من Supabase Dashboard > Storage > New Bucket)
-- ============================================================
-- Bucket name: backups
-- Public: false (للأمان)
-- File size limit: 50MB
-- Allowed MIME types: application/json
