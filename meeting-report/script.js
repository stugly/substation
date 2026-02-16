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
            document.getElementById('spinner-text').innerHTML = `<div style="padding:20px; color:#d9534f;"><b>ไม่พบสิทธิ์การใช้งาน</b><br><small>ID: ${myId}</small></div>`;
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

    // ตั้งค่าสถานที่ (Tab 1)
    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        const myUnit = currentUserUnit ? currentUserUnit.trim() : "";
        const myStations = data.stations.filter(s => s.unit && s.unit.trim() === myUnit);
        const targetList = myStations.length > 0 ? myStations : data.stations;
        targetList.forEach(s => locSel.add(new Option("สฟฟ." + s.name, s.name)));
    }

    // ตั้งค่ารายชื่อพนักงาน (Tab 2)
    const attList = document.getElementById('attendance-list');
    if (attList) {
        let filteredStaff = staffData.filter(s => s.unit === currentUserUnit || s.unit === "ผจฟ.1");
        attList.innerHTML = filteredStaff.map(s => 
            `<label style="display:block; margin-bottom:8px;"><input type="checkbox" name="attendance" value="${s.uid}"> ${s.name} </label>`
        ).join('');
    }

    // ล้างค่าและเริ่มต้น Tab 3 (Fixed Rows)
    setupPowerTab(data);
}

// --- ฟังก์ชันจัดการ Tab 3 (Power Status) ---
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
    validateTaskInput('power');
}

// --- ฟังก์ชันจัดการ Tab 4 (Repair & Procure) ---
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
            
            <div style="flex: 0 0 28%; display: flex; flex-direction: column;">
                <span style="font-size: 9px; color: #06C755; font-weight: bold; margin-bottom: 1px;">วันที่ชำรุด</span>
                <input type="date" name="repair_date[]" onchange="validateTaskInput('repair')" style="width: 100%;">
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
            
            <div style="flex: 0 0 28%; display: flex; flex-direction: column;">
                <span style="font-size: 9px; color: #06C755; font-weight: bold; margin-bottom: 1px;">วันที่จัดซื้อ</span>
                <input type="date" name="procure_date[]" onchange="validateTaskInput('procure')" style="width: 100%;">
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

// --- Common Functions ---
function validateTaskInput(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const btn = document.getElementById(config.btn);
    if (!btn || !container) return;

    const rows = container.getElementsByClassName('task-row');
    
    // ถ้ายังไม่มีแถวเลย ให้กดปุ่มเพิ่มแถวแรกได้
    if (rows.length === 0) { 
        setBtnState(btn, true); 
        return; 
    }

    // ตรวจสอบ "แถวสุดท้าย" ที่มีอยู่ในปัจจุบัน
    const lastRow = rows[rows.length - 1];
    
    // เลือกเฉพาะ input ที่ไม่ใช่ hidden และไม่ใช่ปุ่ม
    const inputs = lastRow.querySelectorAll('input:not([type="hidden"]), select');
    
    let isLastRowComplete = true;

    inputs.forEach(el => {
        // ถ้ามีช่องใดช่องหนึ่งในแถวล่าสุดว่าง (หลัง trim) ให้ถือว่าแถวยังไม่เสร็จ
        if (el.value.trim().length === 0) {
            isLastRowComplete = false;
        }
    });

    // ปุ่ม "เพิ่มรายการ" จะกดได้ก็ต่อเมื่อแถวล่าสุดกรอกครบแล้วเท่านั้น
    setBtnState(btn, isLastRowComplete);
}

function setBtnState(btn, isEnabled) {
    btn.disabled = !isEnabled;
    btn.style.opacity = isEnabled ? "1" : "0.5";
    btn.style.cursor = isEnabled ? "pointer" : "not-allowed";
}

function updateTaskNumbers(containerId) {
    const container = document.getElementById(containerId);
    const rows = container.getElementsByClassName('task-row');
    Array.from(rows).forEach((row, i) => { row.querySelector('.task-number').innerText = (i + 1) + "."; });
}