const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybyNXLKsm04GXsJU0QuKZKOjOoh3XujDbA25FrLYgFE3excmvHn1B-zCdn-rEF1cwf/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";

// แผนผังสำหรับระบบ Lock ปุ่ม (Validation) - ต้องตรงกับ ID ใน HTML
const taskMap = {
    assignment: { container: 'assignment-container', btn: 'btn-add-assignment' },
    plan: { container: 'plan-container', btn: 'btn-add-plan' },
    power: { container: 'power-container', btn: 'btn-add-power' },
    repair: { container: 'repair-container', btn: 'btn-add-repair' },
    procure: { container: 'procure-container', btn: 'btn-add-procure' },
    external: { container: 'external-container', btn: 'btn-add-external' },
    asset: { container: 'asset-container', btn: 'btn-add-asset' },
    km: { container: 'km-container', btn: 'btn-add-km' },
    idea: { container: 'idea-container', btn: 'btn-add-idea' },
    other: { container: 'other-container', btn: 'btn-add-other' }
};

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
            // ดึงข้อมูลจาก GAS ให้เสร็จก่อนค่อยเปิดหน้าจอ
            await checkUserAndLoadData(profile.userId);
        }
    } catch (err) {
        console.error("LIFF Error");
        await checkUserAndLoadData(""); // กรณี LIFF พัง
    }
}

async function checkUserAndLoadData(lineId) {
    const spinner = document.getElementById('spinner');
    try {
        const response = await fetch(`${GAS_WEBAPP_URL}?action=getUser&lineId=${lineId}`);
        const data = await response.json();
        
        if (data) {
            rawAppData = data; 
            staffData = data.staff || []; 
            currentUserUnit = (data.user && data.user.unit) ? data.user.unit : "";
            
            // แสดงผล UI ทั้งหมด
            renderUI(data.user);
        }
    } catch (err) {
        console.error("Fetch error");
        renderUI(null); // กรณีดึงข้อมูลไม่ได้ ให้เปิดฟอร์มเปล่า
    } finally {
        if(spinner) spinner.style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
    }
}

function renderUI(user) {
    if (user) {
        document.getElementById('welcome').innerText = `สวัสดี, ${user.name} (${currentUserUnit})`;
        const recorderInput = document.querySelector('input[name="recorder_uid"]');
        if (recorderInput) recorderInput.value = user.uid;
    }
    
    setupMetadata(rawAppData);
    setupLeaveTable(); 
    setupSecuritySection();
    setCurrentYear();
}

function setupMetadata(data) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // --- บังคับวันที่เป็นสีดำ ---
    const mDate = document.getElementById('meeting_date');
    if (mDate) {
        mDate.value = todayStr;
        mDate.style.color = "#000000"; 
    }

    if (document.getElementById('unit')) document.getElementById('unit').value = currentUserUnit;
    
    // ตั้งเวลา
    if (document.getElementById('start_time')) {
        document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    }

    // เติมสถานที่ (สฟฟ.)
    if (data && data.stations) {
        const locSel = document.getElementById('location');
        if (locSel) {
            locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
            data.stations.filter(s => s.unit === currentUserUnit).forEach(s => {
                locSel.add(new Option("สฟฟ." + s.name, s.name));
            });
        }
    }
    
    // รายชื่อผู้เข้าประชุม
    if (staffData.length > 0) {
        const unitList = document.getElementById('unit-staff-list');
        if (unitList) {
            const uStaff = staffData.filter(s => s.unit === currentUserUnit);
            unitList.innerHTML = uStaff.map(s => `
                <label class="check-item">
                    <input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span>
                </label>`).join('');
        }
    }
}

// --- ระบบเพิ่มแถวและ Lock ปุ่ม (Validation) ---

function validateTaskInput(type) {
    const config = taskMap[type];
    if (!config) return;
    const btn = document.getElementById(config.btn);
    const container = document.getElementById(config.container);
    if (!btn || !container) return;

    const rows = container.getElementsByClassName('task-row');
    if (rows.length === 0) {
        btn.disabled = false;
        btn.style.opacity = "1";
        return;
    }

    const lastRow = rows[rows.length - 1];
    let isComplete = true;
    lastRow.querySelectorAll('input:not([type="hidden"]), select').forEach(el => {
        if (el.value.trim() === "") isComplete = false;
    });

    btn.disabled = !isComplete;
    btn.style.opacity = isComplete ? "1" : "0.5";
}

function updateTaskNumbers(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.querySelectorAll('.task-number').forEach((n, i) => n.innerText = (i + 1) + ".");
    }
}

// หมวดทั่วไป (ใช้ร่วมกันหลายหมวด)
function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" placeholder="..." style="flex:1;" oninput="validateTaskInput('${type}')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}')">🗑️</button>`;
    container.appendChild(div);
    validateTaskInput(type);
}

// หมวด 5: สภาพจ่ายไฟ
function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="power_station[]" placeholder="สถานี" style="width:80px;" oninput="validateTaskInput('power')">
        <input type="text" name="power_detail[]" placeholder="ปกติ" style="flex:1;" oninput="validateTaskInput('power')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('power-container'); validateTaskInput('power')">🗑️</button>`;
    container.appendChild(div);
    validateTaskInput('power');
}

// หมวด 6: ซ่อม (มีวันที่)
function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row";
    const eqOpt = (rawAppData && rawAppData.settings_eq) ? rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('') : '<option value="TR">TR</option>';
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="repair_id[]" placeholder="ID" style="width:60px;" oninput="validateTaskInput('repair')">
        <input type="date" name="repair_date[]" style="color:#000;" onchange="validateTaskInput('repair')">
        <select name="repair_item[]" onchange="validateTaskInput('repair')">${eqOpt}</select>
        <input type="text" name="repair_detail[]" style="flex:1;" oninput="validateTaskInput('repair')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); validateTaskInput('repair')">🗑️</button>`;
    container.appendChild(div);
    validateTaskInput('repair');
}

// หมวด 7: พัสดุ (มีวันที่)
function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="procure_id[]" placeholder="PO" style="width:70px;" oninput="validateTaskInput('procure')">
        <input type="date" name="procure_date[]" style="color:#000;" onchange="validateTaskInput('procure')">
        <input type="text" name="procure_detail[]" style="flex:1;" oninput="validateTaskInput('procure')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); validateTaskInput('procure')">🗑️</button>`;
    container.appendChild(div);
    validateTaskInput('procure');
}

// หมวด 8: บุคคลภายนอก (มีวันที่)
function addExternalRow() {
    const container = document.getElementById('external-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="date" name="ext_date[]" style="color:#000;" onchange="validateTaskInput('external')">
        <input type="text" name="ext_company[]" placeholder="บริษัท" oninput="validateTaskInput('external')">
        <input type="text" name="ext_detail[]" style="flex:1;" oninput="validateTaskInput('external')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); validateTaskInput('external')">🗑️</button>`;
    container.appendChild(div);
    validateTaskInput('external');
}

// หมวด 9: ทรัพย์สิน (มีวันที่)
function addAssetRow() {
    const container = document.getElementById('asset-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="date" name="asset_date[]" style="color:#000;" onchange="validateTaskInput('asset')">
        <input type="text" name="asset_item[]" style="flex:1;" oninput="validateTaskInput('asset')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); validateTaskInput('asset')">🗑️</button>`;
    container.appendChild(div);
    validateTaskInput('asset');
}

function setupLeaveTable() {
    const body = document.getElementById('leave-table-body');
    if (!body || !staffData) return;
    const uStaff = staffData.filter(s => s.unit === currentUserUnit);
    body.innerHTML = uStaff.map(s => `
        <tr>
            <td style="text-align:left;">${s.name}<input type="hidden" name="leave_staff_name[]" value="${s.name}"></td>
            <td><input type="number" name="leave_sick[]" value="0"></td>
            <td><input type="number" name="leave_personal[]" value="0"></td>
            <td><input type="number" name="leave_vacation[]" value="0"></td>
            <td><input type="number" name="leave_replace[]" value="0"></td>
            <td><input type="text" name="leave_note[]"></td>
        </tr>`).join('');
}

function setupSecuritySection() {
    const container = document.getElementById('security-container');
    if (!container || !rawAppData || !rawAppData.stations) return;
    const uStations = rawAppData.stations.filter(s => s.unit === currentUserUnit);
    container.innerHTML = uStations.map((s, i) => `
        <div class="task-row">
            <div class="task-number">${i+1}.</div>
            <div style="width:120px;">สฟฟ.${s.name}</div>
            <input type="hidden" name="sec_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="sec_detail[]" placeholder="ปกติ" style="flex:1;">
        </div>`).join('');
}

function setCurrentYear() {
    const year = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}

// บังคับสีวันที่เป็นสีดำ เมื่อมีการเลือกใหม่
document.addEventListener('input', function (e) {
    if (e.target.type === 'date') e.target.style.color = "#000000";
});