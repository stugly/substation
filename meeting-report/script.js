const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";
let selectedImages = [];

const taskMap = {
    assignment: { container: 'assignment-container', btn: 'btn-add-assignment', label: 'มอบหมาย' },
    plan: { container: 'plan-container', btn: 'btn-add-plan', label: 'แผนงาน' },
    power: { container: 'power-container', btn: 'btn-add-power', label: 'สภาพจ่ายไฟ' },
    repair: { container: 'repair-container', btn: 'btn-add-repair', label: 'อุปกรณ์ชำรุด' },
    procure: { container: 'procure-container', btn: 'btn-add-procure', label: 'จัดซื้อจัดจ้าง' },
    clean: { container: 'clean-container', btn: 'btn-add-clean', label: 'ทำความสะอาด' }
};

window.onload = function() { initLiff(); };

async function initLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) { liff.login(); } 
        else { const profile = await liff.getProfile(); loadAppData(profile); }
    } catch (err) { console.error("LIFF Error:", err); }
}

async function loadAppData(profile) {
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        rawAppData = data;
        staffData = data.staff || [];
        const myId = profile.userId.trim();
        const user = staffData.find(s => s.line && s.line.trim() === myId);
        
        if (user) {
            currentUserUnit = user.unit;
            setupMetadata(data); 
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('welcome').innerText = "สวัสดี, " + user.name;
            if (profile.pictureUrl) {
                document.getElementById('user-avatar-placeholder').innerHTML = `<img src="${profile.pictureUrl}">`;
            }
            document.getElementById('recorder_uid').value = user.uid;
        } else {
            document.getElementById('spinner-text').innerHTML = `<div style="padding:20px; color:#d9534f;"><b>ไม่พบสิทธิ์การใช้งาน</b></div>`;
        }
    } catch (err) { console.error("Data Load Error:", err); }
}

function setupMetadata(data) {
    const now = new Date();
    const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const fullDateText = `${thMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
    document.getElementById('unit').value = currentUserUnit;
    document.getElementById('month').value = fullDateText;
    document.getElementById('meeting_date').value = now.toISOString().split('T')[0];
    document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        const myUnit = currentUserUnit ? currentUserUnit.trim() : "";
        const myStations = data.stations.filter(s => s.unit && s.unit.trim() === myUnit);
        const targetList = myStations.length > 0 ? myStations : data.stations;
        targetList.forEach(s => locSel.add(new Option("สฟฟ." + s.name, s.name)));
    }

    const attList = document.getElementById('attendance-list');
    if (attList) {
        let filteredStaff = staffData.filter(s => s.unit === currentUserUnit || s.unit === "ผจฟ.1");
        attList.innerHTML = filteredStaff.map(s => 
            `<label style="display:block; margin-bottom:8px;"><input type="checkbox" name="attendance" value="${s.uid}"> ${s.name} </label>`
        ).join('');
    }
    setupPowerTab(data);
}

// --- Tab 3: Power Status ---
function setupPowerTab(data) {
    const container = document.getElementById('power-container');
    if (!container || !rawAppData) return;
    container.innerHTML = '';
    const myUnit = currentUserUnit ? currentUserUnit.trim() : "";
    const myStations = rawAppData.stations.filter(s => s.unit && s.unit.trim() === myUnit);
    myStations.forEach((s, index) => {
        const div = document.createElement('div');
        div.className = "task-row"; 
        div.innerHTML = `
            <div class="task-number" style="flex: 0 0 20px;">${index + 1}.</div>
            <div class="power-station-name">สฟฟ.${s.name}</div>
            <input type="hidden" name="power_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="power_detail[]" value="สภาพการจ่ายไฟปกติ" oninput="validateTaskInput('power')" style="flex: 1;">
            <div style="flex: 0 0 25px;"></div> 
        `;
        container.appendChild(div);
    });
    validateTaskInput('power');
}

function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    const myUnit = currentUserUnit ? currentUserUnit.trim() : "";
    const myStations = rawAppData.stations.filter(s => s.unit && s.unit.trim() === myUnit);
    let stationOptions = myStations.map(s => `<option value="สฟฟ.${s.name}">สฟฟ.${s.name}</option>`).join('');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row"; 
    div.innerHTML = `
        <div class="task-number" style="flex: 0 0 20px;">${rowCount}.</div>
        <select name="power_station[]" onchange="validateTaskInput('power')" style="flex: 0 0 105px;">
            <option value="">-- เลือก --</option>${stationOptions}
        </select>
        <input type="text" name="power_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('power')" required style="flex: 1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('power-container'); validateTaskInput('power');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
    validateTaskInput('power'); // ล็อกทันทีเพื่อบังคับกรอกแถวที่เพิ่งเพิ่ม
}

// --- Tab 2, 5, 6: General Tasks ---
function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const rowCount = container.getElementsByClassName('task-row').length + 1;
    const div = document.createElement('div');
    div.className = "task-row";
    div.style.cssText = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";
    div.innerHTML = `
        <div class="task-number">${rowCount}.</div>
        <input type="hidden" name="task_type[]" value="${config.label}">
        <input type="text" name="task_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('${type}')" required>
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
    validateTaskInput(type); // ล็อกปุ่มเพิ่มจนกว่าจะพิมพ์แถวนี้
}

// --- Tab 4: Repair & Procure (ปรับระดับความสูงช่องวันที่ให้เท่ากัน) ---
function addRepairRow() {
    const container = document.getElementById('repair-container');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper"; 
    let eqOptions = `<option value="">-- อุปกรณ์ --</option>` + rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    let statusOptions = `<option value="">-- สถานะ --</option>` + rawAppData.settings_status_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `
        <div class="task-number">${rowCount}.</div>
        <div class="compact-grid">
            <input type="text" name="repair_id[]" placeholder="รหัส" oninput="validateTaskInput('repair')">
            <div style="flex: 0 0 28%; display: flex; flex-direction: column; justify-content: flex-end;">
                <span style="font-size: 9px; color: #06C755; font-weight: bold; margin-bottom: 2px;">วันที่ชำรุด</span>
                <input type="date" name="repair_date[]" onchange="validateTaskInput('repair')" style="width: 100%; margin: 0 !important;">
            </div>
            <select name="repair_item[]" onchange="validateTaskInput('repair')">${eqOptions}</select>
            <select name="repair_status[]" onchange="validateTaskInput('repair')">${statusOptions}</select>
            <input type="text" name="repair_detail[]" placeholder="รายละเอียด..." oninput="validateTaskInput('repair')" style="flex: 0 0 98%; margin-top: 4px !important;">
        </div>
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('repair-container'); validateTaskInput('repair');"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
    validateTaskInput('repair');
}

function addProcureRow() {
    const container = document.getElementById('procure-container');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    let typeOptions = `<option value="">-- ประเภท --</option>` + rawAppData.settings_procure_type.map(v => `<option value="${v}">${v}</option>`).join('');
    let statusOptions = `<option value="">-- สถานะ --</option>` + rawAppData.settings_procure_status.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `
        <div class="task-number">${rowCount}.</div>
        <div class="compact-grid">
            <input type="text" name="procure_id[]" placeholder="รหัส" oninput="validateTaskInput('procure')">
            <div style="flex: 0 0 28%; display: flex; flex-direction: column; justify-content: flex-end;">
                <span style="font-size: 9px; color: #06C755; font-weight: bold; margin-bottom: 2px;">วันที่จัดซื้อ</span>
                <input type="date" name="procure_date[]" onchange="validateTaskInput('procure')" style="width: 100%; margin: 0 !important;">
            </div>
            <select name="procure_type[]" onchange="validateTaskInput('procure')">${typeOptions}</select>
            <select name="procure_status[]" onchange="validateTaskInput('procure')">${statusOptions}</select>
            <input type="text" name="procure_detail[]" placeholder="รายละเอียด..." oninput="validateTaskInput('procure')" style="flex: 0 0 98%; margin-top: 4px !important;">
        </div>
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('procure-container'); validateTaskInput('procure');"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
    validateTaskInput('procure');
}

function validateTaskInput(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const btn = document.getElementById(config.btn);
    if (!btn || !container) return;
    const rows = container.getElementsByClassName('task-row');
    if (rows.length === 0) { setBtnState(btn, true); return; }
    const lastRow = rows[rows.length - 1];
    const inputs = lastRow.querySelectorAll('input:not([type="hidden"]), select');
    let isComplete = true;
    inputs.forEach(el => {
        if (el.value.trim().length === 0) isComplete = false;
    });
    setBtnState(btn, isComplete);
}

function setBtnState(btn, isEnabled) {
    btn.disabled = !isEnabled;
    btn.style.opacity = isEnabled ? "1" : "0.5";
    btn.style.cursor = isEnabled ? "pointer" : "not-allowed";
}

function updateTaskNumbers(containerId) {
    const container = document.getElementById(containerId);
    const rows = container.getElementsByClassName('task-row');
    Array.from(rows).forEach((row, i) => { 
        const num = row.querySelector('.task-number');
        if(num) num.innerText = (i + 1) + "."; 
    });
}

function handleImageSelect(input) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    selectedImages = [];
    Array.from(input.files).slice(0, 5).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImages.push({ name: file.name, data: e.target.result });
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!confirm("ยืนยันการบันทึกรายงานข้อมูลทั้งหมด?")) return;
    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.innerText = "⌛ กำลังบันทึกข้อมูล...";
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.task_detail = Array.from(formData.getAll('task_detail[]'));
    payload.task_type = Array.from(formData.getAll('task_type[]'));
    payload.power_station = Array.from(formData.getAll('power_station[]'));
    payload.power_detail = Array.from(formData.getAll('power_detail[]'));
    payload.images = selectedImages;
    try {
        const response = await fetch(GAS_WEBAPP_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload) 
        });
        const result = await response.text();
        alert(result);
        location.reload();
    } catch (err) {
        alert("❌ บันทึกไม่สำเร็จ: " + err.message);
        btn.disabled = false; btn.innerText = "✅ บันทึกรายงานทั้งหมด";
    }
};