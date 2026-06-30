// ============================================================
// db.js - جميع عمليات قاعدة البيانات
// ============================================================

// ---- مساعد: تسجيل العمليات ----
async function logOp(type, operation, details, context = {}) {
    try {
        await db.from('system_logs').insert({
            log_type: type, operation, details,
            context, user: 'admin'
        });
    } catch (_) { /* لا نوقف التطبيق بسبب خطأ في السجل */ }
}

// ============================================================
// الإعدادات (app_settings)
// ============================================================
const Settings = {
    async get(key) {
        const { data } = await db.from('app_settings').select('value').eq('key', key).single();
        return data?.value ?? null;
    },
    async set(key, value) {
        await db.from('app_settings')
            .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    },
    async getAll() {
        const { data } = await db.from('app_settings').select('*');
        return Object.fromEntries((data || []).map(r => [r.key, r.value]));
    }
};

// ============================================================
// المستأجرون (tenants)
// ============================================================
const Tenants = {
    // قراءة الكل
    async getAll() {
        const { data, error } = await db.from('tenants').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    // بحث
    async search(query) {
        if (!query?.trim()) return this.getAll();
        const q = query.trim();
        const { data, error } = await db.from('tenants').select('*')
            .or(`name.ilike.%${q}%,journal.ilike.%${q}%,district.ilike.%${q}%,hand_holder.ilike.%${q}%,phone.ilike.%${q}%,notes.ilike.%${q}%`)
            .order('name');
        if (error) throw error;
        return data || [];
    },

    // قراءة واحد بالمعرف
    async getById(id) {
        const { data, error } = await db.from('tenants').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },

    // إضافة
    async add(payload) {
        const { data, error } = await db.from('tenants').insert(payload).select().single();
        if (error) throw error;
        await logOp('success', 'add', `تمت إضافة المستأجر: ${payload.name}`, { id: data.id });
        invalidateCache();
        return data;
    },

    // تعديل
    async update(id, payload) {
        const { data, error } = await db.from('tenants').update(payload).eq('id', id).select().single();
        if (error) throw error;
        await logOp('success', 'update', `تم تعديل المستأجر: ${payload.name}`, { id });
        invalidateCache();
        return data;
    },

    // حذف (CASCADE يحذف المرتبطات تلقائياً عبر FK)
    async delete(id, name) {
        const { error } = await db.from('tenants').delete().eq('id', id);
        if (error) throw error;
        await logOp('warning', 'delete', `تم حذف المستأجر: ${name}`, { id });
        invalidateCache();
    }
};

// ============================================================
// القطع (parcels)
// ============================================================
const Parcels = {
    async getByTenant(tenantId) {
        const { data, error } = await db.from('parcels').select('*').eq('tenant_id', tenantId).order('created_at');
        if (error) throw error;
        return data || [];
    },
    async add(payload) {
        const { data, error } = await db.from('parcels').insert(payload).select().single();
        if (error) throw error;
        await logOp('success', 'add', `تمت إضافة قطعة لـ: ${payload.tenant_name}`);
        return data;
    },
    async delete(id) {
        const { error } = await db.from('parcels').delete().eq('id', id);
        if (error) throw error;
    }
};

// ============================================================
// التعديات (infringements)
// ============================================================
const Infringements = {
    async getByTenant(tenantId) {
        const { data, error } = await db.from('infringements').select('*').eq('tenant_id', tenantId).order('registered_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async add(payload) {
        const { data, error } = await db.from('infringements').insert(payload).select().single();
        if (error) throw error;
        await logOp('warning', 'add', `تعدي مسجّل لـ: ${payload.tenant_name} - ${payload.infringement_type}`);
        return data;
    },
    async delete(id) {
        const { error } = await db.from('infringements').delete().eq('id', id);
        if (error) throw error;
    }
};

// ============================================================
// الوثائق (documents)
// ============================================================
const Documents = {
    async getByTenant(tenantId) {
        const { data, error } = await db.from('documents').select('*').eq('tenant_id', tenantId).order('document_date', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async add(payload) {
        const { data, error } = await db.from('documents').insert(payload).select().single();
        if (error) throw error;
        await logOp('success', 'add', `وثيقة مضافة لـ: ${payload.tenant_name} - ${payload.document_name}`);
        return data;
    },
    async delete(id) {
        const { error } = await db.from('documents').delete().eq('id', id);
        if (error) throw error;
    }
};

// ============================================================
// النسخ الاحتياطية (backups)
// ============================================================
const Backups = {
    async getAll() {
        const { data, error } = await db.from('backups').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    // إنشاء نسخة: جمع البيانات + رفع إلى Storage + تسجيل
    async create() {
        // 1. جمع كل البيانات
        const [tenants, parcels, infringements, documents, settings] = await Promise.all([
            db.from('tenants').select('*'),
            db.from('parcels').select('*'),
            db.from('infringements').select('*'),
            db.from('documents').select('*'),
            db.from('app_settings').select('*'),
        ]);

        const payload = {
            version: '1.0.0',
            created_at: new Date().toISOString(),
            tables: {
                tenants:       tenants.data      || [],
                parcels:       parcels.data      || [],
                infringements: infringements.data || [],
                documents:     documents.data    || [],
                app_settings:  settings.data     || [],
            }
        };

        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const filename = `backup_${Date.now()}.json`;
        const sizeKB = (blob.size / 1024).toFixed(1) + ' KB';

        // 2. رفع إلى Supabase Storage
        let downloadLink = '';
        try {
            const { data: uploadData, error: uploadError } = await db.storage
                .from('backups')
                .upload(filename, blob, { contentType: 'application/json', upsert: false });

            if (!uploadError) {
                const { data: urlData } = db.storage.from('backups').getPublicUrl(filename);
                downloadLink = urlData?.publicUrl || '';
            }
        } catch (storageErr) {
            console.warn('تعذّر الرفع إلى Storage، ستُحفظ النسخة محلياً فقط:', storageErr);
        }

        // 3. تسجيل في جدول backups
        const now = new Date();
        const { data: record, error } = await db.from('backups').insert({
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            type: 'full',
            size: sizeKB,
            notes: 'نسخة احتياطية تلقائية',
            download_link: downloadLink,
        }).select().single();

        if (error) throw error;
        await logOp('success', 'backup', `نسخة احتياطية رقم ${record.backup_number}`, { size: sizeKB });

        // إرجاع JSON للتحميل المحلي أيضاً
        return { record, json, filename };
    },

    // استعادة نسخة من Storage
    async restore(downloadLink) {
        const res = await fetch(downloadLink);
        if (!res.ok) throw new Error('تعذّر تحميل ملف النسخة الاحتياطية');
        const payload = await res.json();
        return this._applyRestore(payload);
    },

    // استعادة من ملف JSON محلي
    async restoreFromJSON(json) {
        const payload = typeof json === 'string' ? JSON.parse(json) : json;
        return this._applyRestore(payload);
    },

    async _applyRestore(payload) {
        if (!payload?.tables) throw new Error('ملف النسخة الاحتياطية غير صالح');

        const tables = ['infringements', 'documents', 'parcels', 'tenants'];

        // مسح البيانات بالترتيب الصحيح (من التابع إلى الأصل)
        for (const t of tables) {
            await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }

        // إعادة الإدراج
        for (const t of tables.reverse()) {
            const rows = payload.tables[t];
            if (rows?.length) {
                await db.from(t).insert(rows);
            }
        }

        // استعادة الإعدادات
        if (payload.tables.app_settings?.length) {
            for (const s of payload.tables.app_settings) {
                await db.from('app_settings').upsert(s, { onConflict: 'key' });
            }
        }

        await logOp('warning', 'restore', 'تمت استعادة النسخة الاحتياطية بنجاح');
        invalidateCache();
    }
};

// ============================================================
// السجلات
// ============================================================
const Logs = {
    async getAll(limit = 100) {
        const { data, error } = await db.from('system_logs').select('*').order('timestamp', { ascending: false }).limit(limit);
        if (error) throw error;
        return data || [];
    }
};

// ============================================================
// كاش المستأجرين (LocalStorage)
// ============================================================
const CACHE_KEY = 'ars_tenants_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

function invalidateCache() {
    localStorage.removeItem(CACHE_KEY);
}

function getCachedTenants() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) { invalidateCache(); return null; }
        return data;
    } catch { return null; }
}

function setCachedTenants(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* تجاهل إذا امتلأ LocalStorage */ }
}

// ============================================================
// حساب المساحة الإجمالية
// نظام: 1 فدان = 24 قيراط = 576 سهم
// ============================================================
function calcTotalFeddan(tenantRow, parcelsArr) {
    function toFeddan(f, q, s) {
        return (Number(f) || 0) + (Number(q) || 0) / 24 + (Number(s) || 0) / 576;
    }
    let total = toFeddan(tenantRow.feddan, tenantRow.qirat, tenantRow.sahm);
    for (const p of parcelsArr) {
        total += toFeddan(p.feddan, p.qirat, p.sahm);
    }
    return total; // بالفدان
}

// تحويل فدان عشري → فدان/قيراط/سهم
function feddanToFQS(totalFeddan) {
    const f = Math.floor(totalFeddan);
    const remaining = totalFeddan - f;
    const q = Math.floor(remaining * 24);
    const s = Math.round((remaining * 24 - q) * 24);
    return { feddan: f, qirat: q, sahm: s };
}

// حالة التعديات
function infringementStatus(count, totalSqm) {
    if (count === 0) return { label: 'جيد', cls: 'badge-good', icon: 'fa-check-circle' };
    if (count <= 2 && totalSqm < 500) return { label: 'تحت المراقبة', cls: 'badge-warn', icon: 'fa-eye' };
    return { label: 'خطير', cls: 'badge-danger', icon: 'fa-exclamation-triangle' };
}
