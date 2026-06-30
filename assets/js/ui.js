// ============================================================
// ui.js - الواجهة: المودالات، البطاقات، Toast، الملف الشخصي
// ============================================================

// ============================================================
// Toast الإشعارات
// ============================================================
function showToast(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { success:'fa-check-circle', error:'fa-times-circle',
                    info:'fa-info-circle', warning:'fa-exclamation-triangle' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fa ${icons[type] || icons.info}"></i> <span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('toast-visible'), 10);
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// ============================================================
// فتح / إغلاق مودال
// ============================================================
function openModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add('modal-open'); document.body.classList.add('body-locked'); }
}
function closeModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('modal-open'); document.body.classList.remove('body-locked'); }
}

// إغلاق بالضغط خارج المودال
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('modal-open');
        document.body.classList.remove('body-locked');
    }
});

// ============================================================
// بطاقة المستأجر
// ============================================================
function buildTenantCard(t) {
    const statusMap = {
        0: { label: 'جيد', cls: 'status-good' },
    };
    const infCount = t.infringements_count || 0;
    let statusObj;
    if (infCount === 0) statusObj = { label: 'جيد', cls: 'status-good' };
    else if (infCount <= 2) statusObj = { label: 'مراقبة', cls: 'status-warn' };
    else statusObj = { label: 'خطير', cls: 'status-danger' };

    const areaStr = [
        t.feddan ? t.feddan + ' ف' : '',
        t.qirat  ? t.qirat  + ' ق' : '',
        t.sahm   ? t.sahm   + ' س' : '',
    ].filter(Boolean).join(' ') || '—';

    return `
    <div class="tenant-card" data-id="${t.id}">
      <div class="card-top">
        <div class="card-title-row">
          <button class="tenant-name-btn" onclick="openProfile('${t.id}')">${t.name}</button>
          <span class="status-badge ${statusObj.cls}">${statusObj.label}</span>
        </div>
        <div class="card-meta">
          ${t.journal  ? `<span><i class="fa fa-book"></i> ${t.journal}</span>` : ''}
          ${t.district ? `<span><i class="fa fa-map-marker-alt"></i> ${t.district}</span>` : ''}
          ${t.phone    ? `<span><i class="fa fa-phone"></i> ${t.phone}</span>` : ''}
          <span><i class="fa fa-expand-arrows-alt"></i> ${areaStr}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn btn-sm btn-teal"    onclick="openParcelModal('${t.id}','${t.name}')">
          <i class="fa fa-vector-square"></i> مساحة
        </button>
        <button class="btn btn-sm btn-orange"  onclick="openInfrModal('${t.id}','${t.name}')">
          <i class="fa fa-exclamation-triangle"></i> تعدي
        </button>
        <button class="btn btn-sm btn-blue"    onclick="openDocModal('${t.id}','${t.name}')">
          <i class="fa fa-file-alt"></i> وثائق
        </button>
        <button class="btn btn-sm btn-slate"   onclick="openEditModal('${t.id}')">
          <i class="fa fa-edit"></i> تعديل
        </button>
        <button class="btn btn-sm btn-red"     onclick="deleteTenant('${t.id}','${t.name}')">
          <i class="fa fa-trash"></i> حذف
        </button>
      </div>
    </div>`;
}

// ============================================================
// عرض نتائج البحث
// ============================================================
function renderResults(tenants) {
    const grid = document.getElementById('resultsGrid');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('resultsCount');

    if (!tenants.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        count.textContent = '';
        return;
    }

    empty.style.display = 'none';
    count.textContent = `${tenants.length} مستأجر`;
    grid.innerHTML = tenants.map(buildTenantCard).join('');
}

// ============================================================
// الملف الشخصي المتكامل
// ============================================================
let _currentProfileTenant = null;

async function openProfile(tenantId) {
    openModal('profileModal');
    const body = document.getElementById('profileBody');
    body.innerHTML = '<div class="profile-loading"><i class="fa fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const tenant = await Tenants.getById(tenantId);
        _currentProfileTenant = tenant;
        const r = await buildReportData(tenant);
        body.innerHTML = buildProfileHTML(r);
    } catch (e) {
        body.innerHTML = `<div class="error-msg">خطأ في تحميل البيانات: ${e.message}</div>`;
    }
}

function buildProfileHTML(r) {
    const { tenant: t, parcels, infringements, documents, fqs, totalRent, feddanPrice, status, totalSqm } = r;
    const fmtDate = d => d ? new Date(d).toLocaleDateString('ar-EG') : '—';
    const fmtNum  = n => Number(n || 0).toLocaleString('ar-EG');

    const badgeClass = status.label === 'جيد' ? 'status-good' : status.label === 'تحت المراقبة' ? 'status-warn' : 'status-danger';

    return `
    <!-- رأس الملف -->
    <div class="profile-header">
      <div class="profile-avatar"><i class="fa fa-user-circle"></i></div>
      <div class="profile-title-info">
        <h2>${t.name}</h2>
        <div class="profile-meta-row">
          ${t.journal  ? `<span><i class="fa fa-book"></i> ${t.journal}</span>` : ''}
          ${t.district ? `<span><i class="fa fa-map-marker-alt"></i> ${t.district}</span>` : ''}
          ${t.phone    ? `<a href="tel:${t.phone}"><i class="fa fa-phone"></i> ${t.phone}</a>` : ''}
          ${t.location_url ? `<a href="${t.location_url}" target="_blank"><i class="fa fa-map"></i> الموقع</a>` : ''}
        </div>
        <span class="status-badge ${badgeClass}">${status.label}</span>
      </div>
    </div>

    <!-- بطاقات الملخص -->
    <div class="profile-stats">
      <div class="stat-card stat-green">
        <div class="stat-val">${fqs.feddan} <small>ف</small> ${fqs.qirat} <small>ق</small> ${fqs.sahm} <small>س</small></div>
        <div class="stat-lbl">المساحة الإجمالية</div>
      </div>
      <div class="stat-card stat-blue">
        <div class="stat-val">${fmtNum(Math.round(totalRent))} <small>ج.م</small></div>
        <div class="stat-lbl">الإيجار المستحق</div>
      </div>
      <div class="stat-card stat-orange">
        <div class="stat-val">${infringements.length}</div>
        <div class="stat-lbl">تعديات مسجلة</div>
      </div>
      <div class="stat-card stat-purple">
        <div class="stat-val">${documents.length}</div>
        <div class="stat-lbl">وثيقة رسمية</div>
      </div>
    </div>

    <!-- تبويبات -->
    <div class="profile-tabs">
      <button class="tab-btn active" onclick="switchTab('parcels-tab', this)">
        <i class="fa fa-vector-square"></i> القطع (${parcels.length})
      </button>
      <button class="tab-btn" onclick="switchTab('infr-tab', this)">
        <i class="fa fa-exclamation-triangle"></i> التعديات (${infringements.length})
      </button>
      <button class="tab-btn" onclick="switchTab('docs-tab', this)">
        <i class="fa fa-file-alt"></i> الوثائق (${documents.length})
      </button>
    </div>

    <!-- القطع -->
    <div id="parcels-tab" class="tab-content active">
      ${parcels.length ? `
      <table class="data-table">
        <thead><tr><th>الناحية</th><th>الحوض</th><th>المساحة</th><th>الموقع</th><th></th></tr></thead>
        <tbody>${parcels.map(p => `
          <tr>
            <td>${p.district||'—'}</td>
            <td>${p.basin||'—'}</td>
            <td>${p.feddan||0} ف ${p.qirat||0} ق ${p.sahm||0} س</td>
            <td>${p.location||'—'}</td>
            <td><button class="btn btn-xs btn-red" onclick="deleteParcelInline('${p.id}')"><i class="fa fa-trash"></i></button></td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<div class="empty-tab">لا توجد قطع فرعية مضافة</div>'}
    </div>

    <!-- التعديات -->
    <div id="infr-tab" class="tab-content">
      ${infringements.length ? `
      <table class="data-table">
        <thead><tr><th>التاريخ</th><th>النوع</th><th>المتعدي</th><th>المساحة م²</th><th>الإجراء</th><th></th></tr></thead>
        <tbody>${infringements.map(i => `
          <tr>
            <td>${fmtDate(i.registered_at)}</td>
            <td>${i.infringement_type||'—'}</td>
            <td>${i.transgressor_name||'—'}</td>
            <td>${fmtNum(i.area_sqm)}</td>
            <td>${i.action_taken||'—'}</td>
            <td><button class="btn btn-xs btn-red" onclick="deleteInfrInline('${i.id}')"><i class="fa fa-trash"></i></button></td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<div class="empty-tab">لا توجد تعديات مسجلة</div>'}
    </div>

    <!-- الوثائق -->
    <div id="docs-tab" class="tab-content">
      ${documents.length ? `
      <table class="data-table">
        <thead><tr><th>التاريخ</th><th>رقم</th><th>الجهة</th><th>النوع</th><th>الاسم</th><th></th></tr></thead>
        <tbody>${documents.map(d => `
          <tr>
            <td>${fmtDate(d.document_date)}</td>
            <td>${d.document_number||'—'}</td>
            <td>${d.entity||'—'}</td>
            <td>${d.document_type||'—'}</td>
            <td>${d.document_link ? `<a href="${d.document_link}" target="_blank">${d.document_name||'رابط'}</a>` : (d.document_name||'—')}</td>
            <td><button class="btn btn-xs btn-red" onclick="deleteDocInline('${d.id}')"><i class="fa fa-trash"></i></button></td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<div class="empty-tab">لا توجد وثائق مضافة</div>'}
    </div>

    ${t.notes ? `<div class="profile-notes"><i class="fa fa-sticky-note"></i> ${t.notes}</div>` : ''}
    `;
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
}

// حذف من داخل الملف الشخصي
async function deleteParcelInline(id) {
    if (!confirm('حذف هذه القطعة؟')) return;
    await Parcels.delete(id);
    if (_currentProfileTenant) await openProfile(_currentProfileTenant.id);
    showToast('تم حذف القطعة ✓', 'success');
}
async function deleteInfrInline(id) {
    if (!confirm('حذف هذا التعدي؟')) return;
    await Infringements.delete(id);
    if (_currentProfileTenant) await openProfile(_currentProfileTenant.id);
    showToast('تم حذف التعدي ✓', 'success');
}
async function deleteDocInline(id) {
    if (!confirm('حذف هذه الوثيقة؟')) return;
    await Documents.delete(id);
    if (_currentProfileTenant) await openProfile(_currentProfileTenant.id);
    showToast('تم حذف الوثيقة ✓', 'success');
}

// ============================================================
// فتح مودالات الإضافة
// ============================================================
function openParcelModal(tenantId, tenantName) {
    document.getElementById('parcelTenantId').value   = tenantId;
    document.getElementById('parcelTenantName').value = tenantName;
    document.getElementById('parcelForm').reset();
    document.getElementById('parcelTenantId').value   = tenantId;
    document.getElementById('parcelTenantName').value = tenantName;
    document.getElementById('parcelTenantLabel').textContent = tenantName;
    openModal('parcelModal');
}

function openInfrModal(tenantId, tenantName) {
    document.getElementById('infrTenantId').value   = tenantId;
    document.getElementById('infrTenantName').value = tenantName;
    document.getElementById('infrForm').reset();
    document.getElementById('infrTenantId').value   = tenantId;
    document.getElementById('infrTenantName').value = tenantName;
    document.getElementById('infrTenantLabel').textContent = tenantName;
    openModal('infrModal');
}

function openDocModal(tenantId, tenantName) {
    document.getElementById('docTenantId').value   = tenantId;
    document.getElementById('docTenantName').value = tenantName;
    document.getElementById('docForm').reset();
    document.getElementById('docTenantId').value   = tenantId;
    document.getElementById('docTenantName').value = tenantName;
    document.getElementById('docTenantLabel').textContent = tenantName;
    openModal('docModal');
}

let _editTenantId = null;
async function openEditModal(tenantId) {
    _editTenantId = tenantId;
    const t = await Tenants.getById(tenantId);
    const f = document.getElementById('editForm');
    f.elements['name'].value        = t.name        || '';
    f.elements['journal'].value     = t.journal     || '';
    f.elements['district'].value    = t.district    || '';
    f.elements['feddan'].value      = t.feddan      || '';
    f.elements['qirat'].value       = t.qirat       || '';
    f.elements['sahm'].value        = t.sahm        || '';
    f.elements['hand_holder'].value = t.hand_holder || '';
    f.elements['location_url'].value= t.location_url|| '';
    f.elements['phone'].value       = t.phone       || '';
    f.elements['notes'].value       = t.notes       || '';
    openModal('editModal');
}
