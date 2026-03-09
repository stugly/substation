const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";
let selectedImages = [];

// --- ส่วนที่ 1: การโหลด App และ Login ---
window.onload = function() {
    console.log("เริ่มระบบ LIFF...");
    initializeLiff(); 
};

async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            const profile = await liff.getProfile();
            checkUserAndLoadData(profile.userId);
        }
    } catch (err) {
        console.error("LIFF Error:", err);
        mockDataForTesting();
    }
}

async function checkUserAndLoadData(lineId) {
    const spinner = document.getElementById('spinner');
    if(spinner) spinner.style.display = 'flex';
    try {
        const response = await fetch(`${GAS_WEBAPP_URL}?action=getUser&lineId=${lineId}`);
        const data = await response.json();
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
            alert("ไม่พบชื่อคุณในระบบ (ตรวจสอบ LINE ID ใน Sheet)");
            liff.closeWindow();
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        if(spinner) spinner.style.display = 'none';
    }
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

// --- ส่วนที่ 2: ฟังก์ชันจัดการ Form ---
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

function setCurrentYear() {
    const now = new Date();
    const currentYearTH = now.getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => { el.innerText = currentYearTH; });
    document.querySelectorAll('input[name^="clean_date"], input[name^="weed_date"]').forEach(el => {
        el.value = ""; 
        el.removeAttribute('value'); 
    });
}

function setupMetadata(data) {
    const now = new Date();
    const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const fullDateText = `${thMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
    const todayStr = now.toISOString().split('T')[0];

    const meetingDateEl = document.getElementById('meeting_date');
    if (meetingDateEl) {
        meetingDateEl.value = todayStr;
        meetingDateEl.setAttribute('value', todayStr);
        meetingDateEl.style.color = "#000000"; // บังคับดำทันทีตอนโหลด
    }

    if (document.getElementById('report-title')) {
        document.getElementById('report-title').innerText = `รายงานการประชุมประจำเดือน ${fullDateText}`;
    }

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

function setupLeaveTable() {
    const leaveBody = document.getElementById('leave-table-body');
    if (!leaveBody || !staffData) return;
    leaveBody.innerHTML = staffData.filter(s => s.unit === currentUserUnit).map(s => `
        <tr>
            <td style="text-align: left; padding-left: 10px; color: #000; font-weight: 500;">
                ${s.name}<input type="hidden" name="leave_staff_name[]" value="${s.name}">
            </td>
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

// --- ส่วนที่ 3: ฟังก์ชันเพิ่มแถวต่างๆ ---
function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    let eqOpt = `<option value="">-- อุปกรณ์ --</option>` + rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    let stOpt = `<option value="">-- สถานะ --</option>` + rawAppData.settings_status_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <div style="display: flex; gap: 5px; width: 100%;">
            <input type="text" name="repair_id[]" placeholder="รหัส EQ" style="flex: 0 0 80px;" oninput="validateTaskInput('repair')">
            <input type="date" name="repair_date[]" style="flex: 0 0 120px;" onchange="validateTaskInput('repair')">
            <select name="repair_item[]" style="flex: 1;" onchange="validateTaskInput('repair')">${eqOpt}</select>
            <select name="repair_status[]" style="flex: 0 0 90px;" onchange="validateTaskInput('repair')">${stOpt}</select>
            <input type="text" name="repair_detail[]" placeholder="รายละเอียด..." style="flex: 1;" oninput="validateTaskInput('repair')">
        </div>
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('repair-container'); validateTaskInput('repair');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('repair');
}

function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row procure-row-wrapper";
    let typeOpt = `<option value="">-- ประเภท --</option>` + rawAppData.settings_procure_type.map(v => `<option value="${v}">${v}</option>`).join('');
    let statusOpt = `<option value="">-- สถานะ --</option>` + rawAppData.settings_procure_status.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <div style="display: flex; gap: 5px; width: 100%;">
            <input type="text" name="procure_id[]" placeholder="รหัส PO" style="flex: 0 0 80px;" oninput="validateTaskInput('procure')">
            <input type="date" name="procure_date[]" style="flex: 0 0 120px;" onchange="validateTaskInput('procure')">
            <select name="procure_item[]" style="flex: 1;" onchange="validateTaskInput('procure')">${typeOpt}</select>
            <select name="procure_status[]" style="flex: 0 0 90px;" onchange="validateTaskInput('procure')">${statusOpt}</select>
            <input type="text" name="procure_detail[]" placeholder="รายละเอียด..." style="flex: 1;" oninput="validateTaskInput('procure')">
        </div>
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('procure-container'); validateTaskInput('procure');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('procure');
}

function addAssetRow() {
    const container = document.getElementById('asset-container');
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    let stepOpt = `<option value="">-- ขั้นตอน --</option>` + rawAppData.settings_asset_step.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <div style="display: flex; gap: 8px; width: 100%;">
            <input type="date" name="asset_date[]" onchange="validateTaskInput('asset')" style="flex: 0 0 130px;">
            <input type="text" name="asset_item[]" placeholder="รายละเอียดจำหน่ายทรัพย์สิน" oninput="validateTaskInput('asset')" style="flex: 1;">
            <select name="asset_step[]" onchange="validateTaskInput('asset')" style="flex: 0 0 150px;">${stepOpt}</select>
        </div>
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('asset-container'); validateTaskInput('asset');"><i class="fa-solid fa-trash-can"></i></button>`;
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
            <input type="date" name="ext_date[]" onchange="validateTaskInput('external')" style="flex: 0 0 130px;">
            <div style="flex: 0 0 45px; text-align: center;"><span style="font-size:10px; color:#06C755; font-weight:bold;">WP</span><input type="checkbox" name="ext_wp_check[]" onchange="toggleWP(this); validateTaskInput('external');"></div>
            <input type="text" name="ext_wp_no[]" placeholder="เลขที่ WP" disabled oninput="validateTaskInput('external')" style="flex: 0 1 110px;">
            <input type="text" name="ext_company[]" placeholder="หน่วยงาน/บริษัท" oninput="validateTaskInput('external')" style="flex: 0 1 150px;">
            <input type="text" name="ext_detail[]" placeholder="รายละเอียดการเข้าทำงาน..." oninput="validateTaskInput('external')" style="flex: 1;">
        </div>
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('external-container'); validateTaskInput('external');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('external');
}

function toggleWP(chk) {
    const row = chk.parentElement.parentElement;
    const wpInput = row.querySelector('input[name="ext_wp_no[]"]');
    wpInput.disabled = !chk.checked;
    if(!chk.checked) wpInput.value = "";
}

function validateTaskInput(type) {
    const config = taskMap[type];
    if (!config || !config.btn) return;
    const btn = document.getElementById(config.btn);
    const container = document.getElementById(config.container);
    const rows = container.getElementsByClassName('task-row');
    if (rows.length === 0) { btn.disabled = false; btn.style.opacity = "1"; return; }
    
    const lastRow = rows[rows.length - 1];
    let isComplete = true;
    if (type === 'external') {
        const date = lastRow.querySelector('input[name="ext_date[]"]').value;
        const company = lastRow.querySelector('input[name="ext_company[]"]').value.trim();
        const detail = lastRow.querySelector('input[name="ext_detail[]"]').value.trim();
        if (!date || !company || !detail) isComplete = false;
    } else {
        const inputs = lastRow.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]), select');
        inputs.forEach(el => { if (!el.disabled && el.value.trim().length === 0) isComplete = false; });
    }
    btn.disabled = !isComplete;
    btn.style.opacity = isComplete ? "1" : "0.5";
}

function updateTaskNumbers(id) {
    document.getElementById(id).querySelectorAll('.task-number').forEach((num, i) => { num.innerText = (i + 1) + "."; });
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

// --- ส่วนที่ 4: การบันทึกข้อมูล ---
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!confirm("ยืนยันการบันทึกรายงานข้อมูลทั้งหมด?")) return;
    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.innerText = "⌛ กำลังบันทึกข้อมูล...";
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
    try {
        await fetch(GAS_WEBAPP_URL, { method: 'POST', body: JSON.stringify(payload) });
        alert("บันทึกข้อมูลเรียบร้อยแล้ว!");
        location.reload();
    } catch (err) {
        alert("บันทึกไม่สำเร็จ: " + err.message);
        btn.disabled = false; btn.innerText = "✅ บันทึกรายงานทั้งหมด";
    }
};

// ฟังก์ชันดักจับเพื่อเปลี่ยนสีวันที่เป็นสีดำอัตโนมัติ
document.addEventListener('input', function (e) {
    if (e.target.type === 'date') {
        if (e.target.value) {
            e.target.style.color = "#000000"; // บังคับดำเมื่อเลือกวันที่
            e.target.setAttribute('value', e.target.value);
        } else {
            e.target.style.color = "";
            e.target.removeAttribute('value');
        }
    }
});