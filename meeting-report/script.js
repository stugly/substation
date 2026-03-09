const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybyNXLKsm04GXsJU0QuKZKOjOoh3XujDbA25FrLYgFE3excmvHn1B-zCdn-rEF1cwf/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";
let selectedImages = [];

// --- ส่วนที่ 1: โหลด App และ Login ---
window.onload = function() { initializeLiff(); };

async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) { liff.login(); } 
        else {
            const profile = await liff.getProfile();
            checkUserAndLoadData(profile.userId);
        }
    } catch (err) { mockDataForTesting(); }
}

function checkUserAndLoadData(lineId) {
    const spinner = document.getElementById('spinner');
    if(spinner) spinner.style.display = 'flex';

    window.handleUserData = function(data) {
        if (data && data.user) {
            rawAppData = data; 
            staffData = data.staff; 
            currentUserUnit = data.user.unit;
            if(spinner) spinner.style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('welcome').innerText = `สวัสดี, ${data.user.name} (${currentUserUnit})`;
            setupMetadata(rawAppData);
            setupLeaveTable(); 
            setupSecuritySection();
            setCurrentYear();
        } else {
            alert("ไม่พบชื่อคุณในระบบ");
            liff.closeWindow();
        }
        const oldScript = document.getElementById('jsonp-load');
        if(oldScript) oldScript.remove();
    };

    const script = document.createElement('script');
    script.id = 'jsonp-load';
    script.src = `${GAS_WEBAPP_URL}?action=getUser&lineId=${lineId}&callback=handleUserData`;
    document.body.appendChild(script);
}

// --- ฟังก์ชันบังคับสีวันที่ให้ดำสนิท ---
function applyDateStyle(el) {
    if (el && el.value) {
        el.style.color = "#000000";
        el.style.fontWeight = "500";
    }
}

// --- ส่วนที่ 2: บันทึกข้อมูล ---
document.getElementById('reportForm').onsubmit = function(e) {
    e.preventDefault(); 
    if (!confirm("ยืนยันการบันทึกรายงานข้อมูลทั้งหมด?")) return;

    const btn = document.getElementById('btn-submit');
    btn.disabled = true; 
    btn.innerText = "⌛ กำลังบันทึกข้อมูล...";

    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    const arrayFields = [
        'assignment_detail', 'plan_detail', 'power_station', 'power_detail',
        'repair_id', 'repair_date', 'repair_item', 'repair_status', 'repair_detail', 
        'procure_id', 'procure_date', 'procure_item', 'procure_status', 'procure_detail',
        'clean_date', 'clean_detail', 'weed_date', 'weed_detail',
        'ext_date', 'ext_wp_no', 'ext_company', 'ext_detail', 
        'asset_date', 'asset_item', 'asset_step', 
        'km_detail', 'idea_detail', 'other_detail', 
        'leave_staff_name', 'leave_sick', 'leave_personal', 'leave_vacation', 'leave_replace', 'leave_note', 
        'sec_station', 'sec_detail'
    ];

    arrayFields.forEach(f => {
        const fieldName = (f.includes('leave_') || f.includes('sec_')) ? f : f + '[]';
        payload[f] = formData.getAll(fieldName);
    });
    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.images = selectedImages;

    const hiddenForm = document.createElement('form');
    hiddenForm.method = 'POST';
    hiddenForm.action = GAS_WEBAPP_URL;
    hiddenForm.style.display = 'none';
    const input = document.createElement('input');
    input.name = 'jsonData'; 
    input.value = JSON.stringify(payload);
    hiddenForm.appendChild(input);
    document.body.appendChild(hiddenForm);
    hiddenForm.submit(); 
};

// --- ส่วนที่ 3: จัดการ Form & Dynamic Rows ---
const taskMap = {
    assignment: { container: 'assignment-container', btn: 'btn-add-assignment', label: 'มอบหมาย' },
    plan: { container: 'plan-container', btn: 'btn-add-plan', label: 'แผนงาน' },
    power: { container: 'power-container', btn: 'btn-add-power', label: 'สภาพจ่ายไฟ' },
    repair: { container: 'repair-container', btn: 'btn-add-repair', label: 'อุปกรณ์ชำรุด' },
    procure: { container: 'procure-container', btn: 'btn-add-procure', label: 'จัดซื้อจัดจ้าง' },
    external: { container: 'external-container', btn: 'btn-add-external', label: 'บุคคลภายนอก' },
    asset: { container: 'asset-container', btn: 'btn-add-asset', label: 'ทรัพย์สิน' },
    km: { container: 'km-container', btn: 'btn-add-km', label: 'KM' },
    idea: { container: 'idea-container', btn: 'btn-add-idea', label: 'ความคิดสร้างสรรค์' },
    other: { container: 'other-container', btn: 'btn-add-other', label: 'อื่นๆ' }
};

function setupMetadata(data) {
    const now = new Date();
    const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const fullDateText = `${thMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
    const meetingDateEl = document.getElementById('meeting_date');
    
    meetingDateEl.value = now.toISOString().split('T')[0];
    applyDateStyle(meetingDateEl); // ทำให้ดำทันที
    
    if (document.getElementById('report-title')) document.getElementById('report-title').innerText = `รายงานการประชุมประจำเดือน ${fullDateText}`;
    document.getElementById('unit').value = currentUserUnit;
    document.getElementById('month').value = fullDateText;
    document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    
    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        data.stations.filter(s => s.unit === currentUserUnit).forEach(s => locSel.add(new Option("สฟฟ." + s.name, s.name)));
    }

    const attList = document.getElementById('attendance-list');
    const currentLoginUid = (data && data.user) ? String(data.user.uid) : null;
    if (attList && staffData) {
        const unitStaff = staffData.filter(s => s.unit === currentUserUnit);
        const pj1Staff = staffData.filter(s => s.unit === "ผจฟ.1" && s.unit !== currentUserUnit);
        attList.innerHTML = `
            <div class="attendance-column">
                <div class="column-header-mini">สังกัด ${currentUserUnit}</div>
                ${unitStaff.map(s => `<label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}" ${String(s.uid) === currentLoginUid ? 'checked' : ''}> <span>${s.name}</span></label>`).join('')}
            </div>
            <div class="attendance-column">
                <div class="column-header-mini">เจ้าหน้าที่ ผจฟ.1</div>
                ${pj1Staff.map(s => `<label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}" ${String(s.uid) === currentLoginUid ? 'checked' : ''}> <span>${s.name}</span></label>`).join('')}
            </div>`;
    }
    if (typeof setupPowerTab === "function") setupPowerTab(data);
}

// ฟังก์ชันตรวจสอบค่าว่างเพื่อล็อคปุ่ม "+"
function validateTaskInput(type) {
    const config = taskMap[type];
    if (!config) return;
    const btn = document.getElementById(config.btn);
    const container = document.getElementById(config.container);
    const rows = container.getElementsByClassName('task-row');
    
    if (rows.length === 0) { 
        btn.disabled = false; 
        btn.style.opacity = "1"; 
        return; 
    }

    const lastRow = rows[rows.length - 1];
    let isComplete = true;
    
    // เช็คทุก input และ select ในแถวล่าสุด (ยกเว้น hidden และ checkbox)
    lastRow.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]), select').forEach(el => {
        if (!el.disabled && el.value.trim() === "") isComplete = false;
    });

    btn.disabled = !isComplete;
    btn.style.opacity = isComplete ? "1" : "0.5";
}

function updateTaskNumbers(id) {
    document.getElementById(id).querySelectorAll('.task-number').forEach((num, i) => { num.innerText = (i + 1) + "."; });
}

// --- ฟังก์ชันเพิ่มแถวแบบดักจับ Input ทุกหมวด ---

function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="hidden" name="${type}_type[]" value="${config.label}">
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('${type}')" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}');">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
    container.appendChild(div);
    validateTaskInput(type);
}

function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    let eq = rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    let st = rawAppData.settings_status_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <div style="display: flex; gap: 5px; width: 100%;">
            <input type="text" name="repair_id[]" placeholder="รหัส EQ" style="width: 80px;" oninput="validateTaskInput('repair')">
            <input type="date" name="repair_date[]" onchange="applyDateStyle(this); validateTaskInput('repair')">
            <select name="repair_item[]" onchange="validateTaskInput('repair')"><option value="">-- อุปกรณ์ --</option>${eq}</select>
            <select name="repair_status[]" onchange="validateTaskInput('repair')"><option value="">-- สถานะ --</option>${st}</select>
            <input type="text" name="repair_detail[]" placeholder="รายละเอียด..." style="flex: 1;" oninput="validateTaskInput('repair')">
        </div>
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('repair-container'); validateTaskInput('repair');">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
    container.appendChild(div);
    validateTaskInput('repair');
}

function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row procure-row-wrapper";
    let ty = rawAppData.settings_procure_type.map(v => `<option value="${v}">${v}</option>`).join('');
    let st = rawAppData.settings_procure_status.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <div style="display: flex; gap: 5px; width: 100%;">
            <input type="text" name="procure_id[]" placeholder="รหัส PO" style="width: 80px;" oninput="validateTaskInput('procure')">
            <input type="date" name="procure_date[]" onchange="applyDateStyle(this); validateTaskInput('procure')">
            <select name="procure_item[]" onchange="validateTaskInput('procure')"><option value="">-- ประเภท --</option>${ty}</select>
            <select name="procure_status[]" onchange="validateTaskInput('procure')"><option value="">-- สถานะ --</option>${st}</select>
            <input type="text" name="procure_detail[]" placeholder="รายละเอียด..." style="flex: 1;" oninput="validateTaskInput('procure')">
        </div>
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('procure-container'); validateTaskInput('procure');">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
    container.appendChild(div);
    validateTaskInput('procure');
}

function addAssetRow() {
    const container = document.getElementById('asset-container');
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    let st = rawAppData.settings_asset_step.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <div style="display: flex; gap: 8px; width: 100%;">
            <input type="date" name="asset_date[]" style="width: 130px;" onchange="applyDateStyle(this); validateTaskInput('asset')">
            <input type="text" name="asset_item[]" placeholder="รายละเอียดจำหน่ายทรัพย์สิน" style="flex: 1;" oninput="validateTaskInput('asset')">
            <select name="asset_step[]" style="width: 150px;" onchange="validateTaskInput('asset')"><option value="">-- ขั้นตอน --</option>${st}</select>
        </div>
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('asset-container'); validateTaskInput('asset');">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
    container.appendChild(div);
    validateTaskInput('asset');
}

function addExternalRow() {
    const container = document.getElementById('external-container');
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <div style="display: flex; gap: 8px; width: 100%;">
            <input type="date" name="ext_date[]" style="width: 130px;" onchange="applyDateStyle(this); validateTaskInput('external')">
            <input type="checkbox" onchange="toggleWP(this); validateTaskInput('external');"> 
            <input type="text" name="ext_wp_no[]" placeholder="เลขที่ WP" disabled style="width: 110px;" oninput="validateTaskInput('external')">
            <input type="text" name="ext_company[]" placeholder="บริษัท" style="width: 150px;" oninput="validateTaskInput('external')">
            <input type="text" name="ext_detail[]" placeholder="รายละเอียด" style="flex: 1;" oninput="validateTaskInput('external')">
        </div>
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('external-container'); validateTaskInput('external');">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
    container.appendChild(div);
    validateTaskInput('external');
}

// --- ฟังก์ชันอื่นๆ คงเดิม แต่เพิ่มจุดดัก validate ---

function setupLeaveTable() {
    const leaveBody = document.getElementById('leave-table-body');
    if (!leaveBody || !staffData) return;
    leaveBody.innerHTML = staffData.filter(s => s.unit === currentUserUnit).map(s => `
        <tr>
            <td style="text-align: left; padding-left: 10px; color: #000; font-weight: 500;">${s.name}<input type="hidden" name="leave_staff_name[]" value="${s.name}"></td>
            <td><input type="number" name="leave_sick[]" value="0" min="0" step="0.5"></td>
            <td><input type="number" name="leave_personal[]" value="0" min="0" step="0.5"></td>
            <td><input type="number" name="leave_vacation[]" value="0" min="0" step="0.5"></td>
            <td><input type="number" name="leave_replace[]" value="0" min="0" step="0.5"></td>
            <td><input type="text" name="leave_note[]" placeholder="..."></td>
        </tr>`).join('');
}

function setupSecuritySection() {
    const secContainer = document.getElementById('security-container');
    if (!secContainer || !rawAppData.stations) return;
    secContainer.innerHTML = rawAppData.stations.filter(s => s.unit === currentUserUnit).map((s, i) => `
        <div class="task-row">
            <div class="task-number">${i + 1}.</div>
            <div class="power-station-name">สฟฟ.${s.name}</div>
            <input type="hidden" name="sec_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="sec_detail[]" placeholder="ผลการตรวจสอบ รปภ. ..." style="flex: 1;">
        </div>`).join('');
}

function setupPowerTab(data) {
    const container = document.getElementById('power-container');
    if (!container) return;
    container.innerHTML = data.stations.filter(s => s.unit === currentUserUnit).map((s, i) => `
        <div class="task-row">
            <div class="task-number">${i + 1}.</div>
            <div class="power-station-name">สฟฟ.${s.name}</div>
            <input type="hidden" name="power_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="power_detail[]" value="สภาพการจ่ายไฟปกติ" style="flex: 1;" oninput="validateTaskInput('power')">
        </div>`).join('');
    validateTaskInput('power');
}

function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    let opt = rawAppData.stations.filter(s => s.unit === currentUserUnit).map(s => `<option value="สฟฟ.${s.name}">สฟฟ.${s.name}</option>`).join('');
    const div = document.createElement('div');
    div.className = "task-row"; 
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <select name="power_station[]" style="flex: 0 0 260px;" onchange="validateTaskInput('power')"><option value="">-- เลือกสถานี --</option>${opt}</select>
        <input type="text" name="power_detail[]" placeholder="ระบุรายละเอียด..." style="flex: 1;" oninput="validateTaskInput('power')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('power-container'); validateTaskInput('power');">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
    container.appendChild(div);
    validateTaskInput('power');
}

function toggleWP(chk) {
    const wpInput = chk.parentElement.querySelector('input[name="ext_wp_no[]"]');
    wpInput.disabled = !chk.checked;
    if(!chk.checked) wpInput.value = "";
}

function handleImageSelect(input) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = ''; selectedImages = [];
    Array.from(input.files).slice(0, 5).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImages.push({ name: file.name, data: e.target.result });
            const img = document.createElement('img'); img.src = e.target.result; preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

function addSimpleTaskRow(type) { addTaskRow(type); }

function setCurrentYear() {
    const currentYearTH = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => { el.innerText = currentYearTH; });
}

function mockDataForTesting() {
    currentUserUnit = "ผจฟ.1"; 
    rawAppData = {
        stations: [{name: "นครศรีธรรมราช 1", unit: "ผจฟ.1"}, {name: "ปากพนัง", unit: "ผจฟ.1"}],
        settings_eq: ["TR", "CB", "DS"],
        settings_status_eq: ["ปกติ", "ชำรุด"],
        settings_procure_type: ["งานจ้าง", "จัดซื้อวัสดุ"], 
        settings_procure_status: ["รอดำเนินการ", "ตรวจรับแล้ว"],
        settings_asset_step: ["ขั้นตอน 1", "ขั้นตอน 2", "รอจำหน่าย"],
        staff: [{name: "นายทดสอบ 1", uid: "U001", unit: "ผจฟ.1"}]
    };
    staffData = rawAppData.staff;
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    setupMetadata(rawAppData);
    setupLeaveTable(); 
    setupSecuritySection();
    setCurrentYear();
}