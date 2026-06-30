// ============================================================
// reports.js - التقارير والطباعة والبريد والواتساب
// ============================================================

// بناء بيانات التقرير الكاملة
async function buildReportData(tenant) {
    const [parcels, infringements, documents, settings] = await Promise.all([
        Parcels.getByTenant(tenant.id),
        Infringements.getByTenant(tenant.id),
        Documents.getByTenant(tenant.id),
        Settings.getAll(),
    ]);

    const feddanPrice = Number(settings.feddan_price) || 0;
    const totalFeddan = calcTotalFeddan(tenant, parcels);
    const totalRent   = totalFeddan * feddanPrice;
    const fqs         = feddanToFQS(totalFeddan);
    const totalSqm    = infringements.reduce((s, i) => s + Number(i.area_sqm || 0), 0);
    const status      = infringementStatus(infringements.length, totalSqm);

    return { tenant, parcels, infringements, documents, settings,
             feddanPrice, totalFeddan, totalRent, fqs, totalSqm, status };
}

// ============================================================
// HTML التقرير (مشترك بين الطباعة والإرسال)
// ============================================================
function buildReportHTML(r, forPrint = false) {
    const { tenant: t, parcels, infringements, documents,
            feddanPrice, fqs, totalRent, status } = r;

    const fmtDate = d => d ? new Date(d).toLocaleDateString('ar-EG') : '—';
    const fmtNum  = n => Number(n || 0).toLocaleString('ar-EG');

    const parcelRows = parcels.map(p => `
        <tr>
          <td>${p.district || '—'}</td>
          <td>${p.basin || '—'}</td>
          <td>${p.feddan || 0} ف ${p.qirat || 0} ق ${p.sahm || 0} س</td>
          <td>${p.location || '—'}</td>
        </tr>`).join('') || '<tr><td colspan="4" style="text-align:center">لا توجد قطع فرعية</td></tr>';

    const infrRows = infringements.map(i => `
        <tr>
          <td>${fmtDate(i.registered_at)}</td>
          <td>${i.infringement_type || '—'}</td>
          <td>${i.transgressor_name || '—'}</td>
          <td>${fmtNum(i.area_sqm)} م²</td>
          <td>${i.action_taken || '—'}</td>
        </tr>`).join('') || '<tr><td colspan="5" style="text-align:center">لا توجد تعديات</td></tr>';

    const docRows = documents.map(d => `
        <tr>
          <td>${fmtDate(d.document_date)}</td>
          <td>${d.document_number || '—'}</td>
          <td>${d.entity || '—'}</td>
          <td>${d.document_type || '—'}</td>
          <td>${d.document_name || '—'}</td>
        </tr>`).join('') || '<tr><td colspan="5" style="text-align:center">لا توجد وثائق</td></tr>';

    const badgeColor = status.label === 'جيد' ? '#22c55e' : status.label === 'تحت المراقبة' ? '#f59e0b' : '#ef4444';

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>ملف المستأجر - ${t.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl;
         background: #f8fafc; color: #1e293b; padding: ${forPrint ? '0' : '2rem'}; }
  .report-wrap { max-width: 900px; margin: 0 auto; background: #fff;
                 border-radius: 12px; overflow: hidden;
                 box-shadow: 0 4px 24px rgba(0,0,0,.08); }
  .report-header { background: linear-gradient(135deg, #1a6b3c 0%, #2d9d6b 100%);
                   color: #fff; padding: 2rem; }
  .report-header h1 { font-size: 1.6rem; margin-bottom: .4rem; }
  .report-header p  { opacity: .85; font-size: .9rem; }
  .report-body { padding: 2rem; }
  .section { margin-bottom: 2rem; }
  .section h2 { font-size: 1.1rem; color: #1a6b3c; border-bottom: 2px solid #e2e8f0;
                padding-bottom: .5rem; margin-bottom: 1rem; }
  .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 1rem; }
  .info-item label { font-size: .78rem; color: #64748b; display: block; margin-bottom: .2rem; }
  .info-item span  { font-weight: 600; color: #1e293b; }
  .badge { display: inline-block; padding: .3rem .8rem; border-radius: 20px;
           font-size: .85rem; font-weight: 700; color: #fff; background: ${badgeColor}; }
  .highlight-box { background: linear-gradient(135deg, #f0fdf4, #dcfce7);
                   border: 1px solid #bbf7d0; border-radius: 10px; padding: 1.2rem;
                   display: flex; gap: 2rem; flex-wrap: wrap; align-items: center; }
  .highlight-item { text-align: center; }
  .highlight-item .val { font-size: 1.6rem; font-weight: 800; color: #15803d; }
  .highlight-item .lbl { font-size: .8rem; color: #166534; }
  table { width: 100%; border-collapse: collapse; font-size: .88rem; }
  th { background: #f1f5f9; color: #475569; padding: .6rem .8rem;
       text-align: right; font-weight: 600; }
  td { padding: .6rem .8rem; border-bottom: 1px solid #e2e8f0; color: #334155; }
  tr:last-child td { border-bottom: none; }
  .report-footer { text-align: center; padding: 1.2rem; background: #f8fafc;
                   font-size: .8rem; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  @media print { body { padding: 0; background: #fff; }
                 .report-wrap { box-shadow: none; border-radius: 0; } }
</style>
</head>
<body>
<div class="report-wrap">
  <div class="report-header">
    <h1><i>🌾</i> ملف المستأجر الزراعي</h1>
    <p>نظام الإيجارات الزراعية — تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' })}</p>
  </div>
  <div class="report-body">

    <!-- البيانات الأساسية -->
    <div class="section">
      <h2>📋 البيانات الأساسية</h2>
      <div class="info-grid">
        <div class="info-item"><label>الاسم</label><span>${t.name}</span></div>
        <div class="info-item"><label>رقم الجريدة</label><span>${t.journal || '—'}</span></div>
        <div class="info-item"><label>الناحية</label><span>${t.district || '—'}</span></div>
        <div class="info-item"><label>واضع اليد</label><span>${t.hand_holder || '—'}</span></div>
        <div class="info-item"><label>رقم الهاتف</label><span>${t.phone || '—'}</span></div>
        <div class="info-item"><label>حالة التعديات</label><span class="badge">${status.label}</span></div>
      </div>
      ${t.notes ? `<p style="margin-top:.8rem;color:#64748b;font-size:.88rem">ملاحظات: ${t.notes}</p>` : ''}
    </div>

    <!-- ملخص المساحة والإيجار -->
    <div class="section">
      <h2>📐 المساحة والإيجار</h2>
      <div class="highlight-box">
        <div class="highlight-item">
          <div class="val">${fqs.feddan} ف ${fqs.qirat} ق ${fqs.sahm} س</div>
          <div class="lbl">المساحة الإجمالية</div>
        </div>
        <div class="highlight-item">
          <div class="val">${fmtNum(feddanPrice)}</div>
          <div class="lbl">سعر الفدان (ج.م)</div>
        </div>
        <div class="highlight-item">
          <div class="val" style="color:#1d4ed8">${fmtNum(Math.round(totalRent))}</div>
          <div class="lbl">الإيجار المستحق (ج.م)</div>
        </div>
      </div>
    </div>

    <!-- القطع الفرعية -->
    <div class="section">
      <h2>🗺️ القطع الفرعية (${parcels.length})</h2>
      <table>
        <thead><tr><th>الناحية</th><th>الحوض</th><th>المساحة</th><th>الموقع</th></tr></thead>
        <tbody>${parcelRows}</tbody>
      </table>
    </div>

    <!-- التعديات -->
    <div class="section">
      <h2>⚠️ التعديات (${infringements.length})</h2>
      <table>
        <thead><tr><th>التاريخ</th><th>نوع التعدي</th><th>اسم المتعدي</th><th>المساحة</th><th>الإجراء</th></tr></thead>
        <tbody>${infrRows}</tbody>
      </table>
    </div>

    <!-- الوثائق -->
    <div class="section">
      <h2>📄 الوثائق الرسمية (${documents.length})</h2>
      <table>
        <thead><tr><th>التاريخ</th><th>رقم الوثيقة</th><th>الجهة</th><th>النوع</th><th>الاسم</th></tr></thead>
        <tbody>${docRows}</tbody>
      </table>
    </div>

  </div>
  <div class="report-footer">
    نظام الإيجارات الزراعية © ${new Date().getFullYear()} — جميع الحقوق محفوظة
  </div>
</div>
${forPrint ? '<script>window.onload=()=>{ window.print(); }<\/script>' : ''}
</body>
</html>`;
}

// ============================================================
// طباعة التقرير
// ============================================================
async function printReport(tenant) {
    const r = await buildReportData(tenant);
    const html = buildReportHTML(r, true);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

// ============================================================
// إرسال بالبريد الإلكتروني (EmailJS)
// ============================================================
async function emailReport(tenant, toEmail) {
    const r = await buildReportData(tenant);
    const fqs = r.fqs;

    if (!EMAILJS_CONFIG.publicKey) {
        // وضع التجريب: فتح mailto
        const subject = encodeURIComponent(`ملف المستأجر: ${tenant.name}`);
        const body    = encodeURIComponent(buildPlainTextReport(r));
        window.open(`mailto:${toEmail}?subject=${subject}&body=${body}`);
        return;
    }

    await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        {
            to_email   : toEmail,
            tenant_name: tenant.name,
            district   : tenant.district || '—',
            total_area : `${fqs.feddan} فدان ${fqs.qirat} قيراط ${fqs.sahm} سهم`,
            total_rent : r.totalRent.toLocaleString('ar-EG'),
            status     : r.status.label,
            report_html: buildReportHTML(r, false),
        },
        EMAILJS_CONFIG.publicKey
    );
}

// ============================================================
// مشاركة واتساب
// ============================================================
async function shareWhatsApp(tenant) {
    const r   = await buildReportData(tenant);
    const txt = buildPlainTextReport(r);
    const phone = (tenant.phone || '').replace(/\D/g, '');

    if (WATI_CONFIG.apiKey && WATI_CONFIG.baseUrl && phone) {
        // مسار WATI API
        try {
            const res = await fetch(`${WATI_CONFIG.baseUrl}/api/v1/sendSessionMessage/${phone}`, {
                method : 'POST',
                headers: {
                    'Content-Type' : 'application/json-patch+json',
                    'Authorization': `Bearer ${WATI_CONFIG.apiKey}`,
                },
                body: JSON.stringify({ messageText: txt }),
            });
            if (res.ok) { showToast('تم إرسال التقرير عبر واتساب ✓', 'success'); return; }
        } catch (e) {
            console.warn('WATI فشل، سيُستخدم wa.me:', e);
        }
    }

    // البديل: wa.me
    const encoded = encodeURIComponent(txt);
    const url = phone
        ? `https://wa.me/${phone}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
}

// ============================================================
// نص التقرير المنسّق (للواتساب والبريد النصي)
// ============================================================
function buildPlainTextReport(r) {
    const { tenant: t, parcels, infringements, fqs, totalRent, feddanPrice, status } = r;
    const line = '━━━━━━━━━━━━━━━━━━━━━━━━';
    return `🌾 *نظام الإيجارات الزراعية*
${line}
👤 *الاسم:* ${t.name}
📋 *الجريدة:* ${t.journal || '—'}
📍 *الناحية:* ${t.district || '—'}
📞 *الهاتف:* ${t.phone || '—'}
🏷️ *الحالة:* ${status.label}
${line}
📐 *المساحة الإجمالية:*
${fqs.feddan} فدان ${fqs.qirat} قيراط ${fqs.sahm} سهم
💰 *سعر الفدان:* ${feddanPrice.toLocaleString('ar-EG')} ج.م
💵 *الإيجار المستحق:* ${Math.round(totalRent).toLocaleString('ar-EG')} ج.م
${line}
📦 *القطع الفرعية:* ${parcels.length}
⚠️ *التعديات المسجلة:* ${infringements.length}
${line}
📅 ${new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' })}`;
}
