const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";
let selectedImages = [];

// --- ส่วนที่ 1: Start App ---
window.onload = function() {
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
            alert("ไม่พบชื่อในระบบ");
            liff.closeWindow();
        }
    } catch (err) {
        if(spinner) spinner.style.display = 'none';
    }
}

function mockDataForTesting() {
    currentUserUnit = "ผจฟ.1"; 
    rawAppData = {
        stations: [{name: "นครศรีธรรมราช 1", unit: "ผจฟ.1"}],
        settings_eq: ["TR", "CB"], settings_status_eq: ["ปกติ", "ชำรุด"],
        settings_procure_type: ["งานจ้าง"], settings_procure_status: ["รอ"],
        settings_asset_step: ["ขั้น 1"],
        staff: [{name: "นายทดสอบ", uid: "U001", unit: "ผจฟ.1"}]
    };
    staffData = rawAppData.staff;
    document.getElementById('main-app').style.display = 'block';
    setupMetadata(rawAppData);
    setupLeaveTable();
    setupSecuritySection();
    setCurrentYear();
}

// --- ส่วนที่ 2: Config & Metadata ---
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
}

function setupMetadata(data) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const meetingDateEl = document.getElementById('meeting_date');
    if (meetingDateEl) {
        meetingDateEl.value = todayStr;
        meetingDateEl.style.color = "#000000";
        meetingDateEl.setAttribute('value', todayStr);
    }
    document.getElementById('unit').value = currentUserUnit;
    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        data.stations.filter(s => s.unit === currentUserUnit).forEach(s => locSel.add(new Option("สฟฟ." + s.name, s.name)));
    }
    const attList = document.getElementById('attendance-list');
    if (attList && staffData) {
        const unitStaff = staffData.filter(s => s.unit === currentUserUnit);
        attList.innerHTML = unitStaff.map(s => `<label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span></label>`).join('');
    }
    if (typeof setupPowerTab === "function") setupPowerTab(data);
}

// --- ส่วนที่ 3: ฟังก์ชันเพิ่มแถว (รวมตัวที่อาจทำหน้าขาว) ---
function addSimpleTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="hidden" name="${type}_type[]" value="${config.label}">
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('${type}')" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput(type);
}

// กรณีพี่เรียกชื่อ addTaskRow แทน addSimpleTaskRow
function addTaskRow(type) { addSimpleTaskRow(type); }

function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row";
    let eqOpt = rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="repair_id[]" placeholder="ID" style="width:80px;" oninput="validateTaskInput('repair')">
        <input type="date" name="repair_date[]" onchange="validateTaskInput('repair')">
        <select name="repair_item[]" onchange="validateTaskInput('repair')">${eqOpt}</select>
        <input type="text" name="repair_detail[]" placeholder="รายละเอียด" style="flex:1;" oninput="validateTaskInput('repair')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); validateTaskInput('repair');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('repair');
}

function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="procure_id[]" placeholder="PO" style="width:80px;" oninput="validateTaskInput('procure')">
        <input type="date" name="procure_date[]" onchange="validateTaskInput('procure')">
        <input type="text" name="procure_detail[]" style="flex:1;" oninput="validateTaskInput('procure')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); validateTaskInput('procure');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('procure');
}

function addAssetRow() {
    const container = document.getElementById('asset-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="date" name="asset_date[]" onchange="validateTaskInput('asset')">
        <input type="text" name="asset_item[]" style="flex:1;" oninput="validateTaskInput('asset')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); validateTaskInput('asset');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('asset');
}

function addExternalRow() {
    const container = document.getElementById('external-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="date" name="ext_date[]" onchange="validateTaskInput('external')">
        <input type="text" name="ext_company[]" placeholder="บริษัท" oninput="validateTaskInput('external')">
        <input type="text" name="ext_detail[]" style="flex:1;" oninput="validateTaskInput('external')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); validateTaskInput('external');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('external');
}

function setupLeaveTable() {
    const leaveBody = document.getElementById('leave-table-body');
    if (!leaveBody || !staffData) return;
    leaveBody.innerHTML = staffData.filter(s => s.unit === currentUserUnit).map(s => `<tr><td>${s.name}<input type="hidden" name="leave_staff_name[]" value="${s.name}"></td><td><input type="number" name="leave_sick[]" value="0"></td><td><input type="number" name="leave_personal[]" value="0"></td><td><input type="number" name="leave_vacation[]" value="0"></td><td><input type="number" name="leave_replace[]" value="0"></td><td><input type="text" name="leave_note[]"></td></tr>`).join('');
}

function setupSecuritySection() {
    const secContainer = document.getElementById('security-container');
    if (!secContainer || !rawAppData.stations) return;
    secContainer.innerHTML = rawAppData.stations.filter(s => s.unit === currentUserUnit).map((s, i) => `<div class="task-row"><div class="task-number">${i+1}.</div><div>สฟฟ.${s.name}</div><input type="hidden" name="sec_station[]" value="สฟฟ.${s.name}"><input type="text" name="sec_detail[]" style="flex:1;"></div>`).join('');
}

function updateTaskNumbers(id) {
    const container = document.getElementById(id);
    if(container) container.querySelectorAll('.task-number').forEach((num, i) => { num.innerText = (i + 1) + "."; });
}

function handleImageSelect(input) {
    const preview = document.getElementById('image-preview');
    if(!preview) return;
    preview.innerHTML = ''; selectedImages = [];
    Array.from(input.files).slice(0, 5).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImages.push({ name: file.name, data: e.target.result });
            const img = document.createElement('img'); img.src = e.target.result; img.style.width="70px"; preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

function validateTaskInput(type) {
    const config = taskMap[type];
    if (!config) return;
    const btn = document.getElementById(config.btn);
    const container = document.getElementById(config.container);
    if (!btn || !container) return;
    const rows = container.getElementsByClassName('task-row');
    if (rows.length === 0) { btn.disabled = false; btn.style.opacity = "1"; return; }
    const lastRow = rows[rows.length - 1];
    let isComplete = true;
    const inputs = lastRow.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]), select');
    inputs.forEach(el => { if (!el.disabled && el.value.trim().length === 0) isComplete = false; });
    btn.disabled = !isComplete;
    btn.style.opacity = isComplete ? "1" : "0.5";
}

// --- ส่วนที่ 4: Submit ---
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.innerText = "กำลังบันทึก...";
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    const arrayFields = ['assignment_detail', 'plan_detail', 'repair_id', 'repair_date', 'repair_item', 'repair_detail', 'procure_id', 'procure_date', 'procure_detail', 'ext_date', 'ext_company', 'ext_detail', 'asset_date', 'asset_item', 'km_detail', 'idea_detail', 'other_detail', 'leave_staff_name', 'leave_sick', 'leave_personal', 'leave_vacation', 'leave_replace', 'leave_note', 'sec_station', 'sec_detail'];
    arrayFields.forEach(f => {
        const name = (f.includes('leave_') || f.includes('sec_')) ? f : f + '[]';
        payload[f] = formData.getAll(name);
    });
    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.images = selectedImages;
    try {
        await fetch(GAS_WEBAPP_URL, { method: 'POST', body: JSON.stringify(payload) });
        alert("บันทึกสำเร็จ");
        location.reload();
    } catch (err) {
        alert("ล้มเหลว");
        btn.disabled = false;
    }
};

// ดักฟังวันที่ให้ดำ
document.addEventListener('input', function (e) {
    if (e.target.type === 'date') {
        if (e.target.value) {
            e.target.style.color = "#000000";
            e.target.setAttribute('value', e.target.value);
        }
    }
});