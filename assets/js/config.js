// ============================================================
// supabase-config.js - إعداد الاتصال بـ Supabase
// ضع بيانات مشروعك هنا بعد إنشائه على supabase.com
// ============================================================

const SUPABASE_URL  = 'https://yrrmceyqedqaxylajidz.supabase.co';   // ← استبدل
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycm1jZXlxZWRxYXh5bGFqaWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NzQzODUsImV4cCI6MjA2NDU1MDM4NX0.JyDdLLiVgE8ML6bY1tXW4fQ5T_9w_gpHsNEVE7fLSeY';                         // ← استبدل

// تهيئة العميل
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// إعدادات WATI (WhatsApp Business API)
// اتركها فارغة إذا لم تشترك بعد → سيُستخدم wa.me تلقائياً
// ============================================================
const WATI_CONFIG = {
    apiKey  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NjFhNmQ5LTc2MjktNDllNS1iY2UwLTU3MzkwZTU2MDAzOCIsInR5cGUiOiJhcGkiLCJpYXQiOjE3NDg5NzQ1MjF9.W6hDfnLGRnoy7XoVL27eOQbA_OBw7cJwQ1S1S4aYfDQ',          // مفتاح WATI API
    baseUrl : 'https://live-server-33445.wati.io',          // https://live-server-XXXXX.wati.io
};

// ============================================================
// إعدادات EmailJS
// ============================================================
const EMAILJS_CONFIG = {
    serviceId  : 'service_mnsukib',       // service_XXXXXXX
    templateId : 'template_h2w4ggg',       // template_XXXXXXX
    publicKey  : 'C5Hm5gpU4QTDaf_hx',       // مفتاح EmailJS العام
};
