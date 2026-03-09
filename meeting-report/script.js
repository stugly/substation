const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybyNXLKsm04GXsJU0QuKZKOjOoh3XujDbA25FrLYgFE3excmvHn1B-zCdn-rEF1cwf/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";

// แผนผังสำหรับระบบ Lock ปุ่ม (Validation) - ตรงตาม ID ใน HTML
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
    // 1. เปิดหน้าแอปทันที ไม่ต้องรอให้ข้อมูลจากเน็ตมา
    const spinner = document.getElementById('spinner');
    if(spinner) spinner.style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // 2. ตั้งค่า UI พื้นฐาน (วันที่ดำ, ปี พ.ศ.)
    setupDefaultUI();
    
    // 3. รัน LIFF และโหลดข้อมูลจาก GAS เบื้องหลัง
    initializeLiff(); 
};

function setupDefaultUI() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const mDate = document.getElementById('meeting_date');
    if (mDate) {
        mDate.value = todayStr;
        mDate.style.color = "#000000"; // บังคับดำ
    }
    
    // ตั้งเวลาปัจจุบัน
    if (document.getElementById('start_time')) {
        document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    }
    
    setCurrentYear();
}

async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            const profile = await liff.getProfile();
            fetchDataFromGAS(profile.userId);
        }
    } catch (err) {
        console.error("LIFF Error");
        fetchDataFromGAS(""); // ถ้า LIFF พังก็พยายามดึงข้อมูลทั่วไป
    }
}

async function fetchDataFromGAS(lineId) {
    try {
        const response = await fetch(`${GAS_WEBAPP_URL}?action=getUser&lineId=${lineId}`);
        const data = await response.json();
        if (data) {
            rawAppData = data;
            staffData = data.staff || [];
            currentUserUnit = (data.user && data.user.unit) ? data.user.unit : "";
            
            if (data.user) {
                document.getElementById('welcome').innerText = `สวัสดี, ${data.user.name} (${currentUserUnit})`;
                const recorderInput = document.querySelector('input[name="recorder_uid"]');
                if (recorderInput) recorderInput.value = data.user.uid;
            }
            
            updateDynamicUI();
        }
    } catch (e) {
        console.error("GAS Fetch Fail");
    }
}

function updateDynamicUI() {
    if (!rawAppData) return;
    
    // เติมหน่วยงาน
    if (document.getElementById('unit')) document.getElementById('unit').value = currentUserUnit;

    // เติมสถานที่ (สฟฟ.)
    const locSel = document.getElementById('location');
    if (locSel && rawAppData.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        rawAppData.stations.filter(s => s.unit === currentUserUnit).forEach(s => {
            locSel.add(new Option("สฟฟ." + s.name, s.name));
        });
    }

    // รายชื่อพนักงานเข้าประชุม
    const unitList = document.getElementById('unit-staff-list');
    if (unitList && staffData.length > 0) {
        const uStaff = staffData.filter(s => s.unit === currentUserUnit);
        unitList.innerHTML = uStaff.map(s => `
            <label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span></label>
        `).join('');
    }
    
    setupLeaveTable();
    setupSecuritySection();
}

// --- ระบบเพิ่มแถว + Lock ปุ่ม (Validation) ---

function validateTaskInput(type) {
    const config = taskMap[type];
    if (!config) return;
    const btn = document.getElementById(config.btn);
    const container = document.getElementById(config.container);
    if (!btn || !container) return;

    const rows = container.getElementsByClassName('task-row');
    if (rows.length === 0) {
        btn.disabled = false; btn.style.opacity = "1"; return;
    }

    const lastRow = rows[rows.length - 1];
    let isComplete = true;
    lastRow.querySelectorAll('input:not([type="hidden"]), select').forEach(el => {
        if (el.value.trim() === "") isComplete = false;
    });

    btn.disabled = !isComplete;
    btn.style.opacity = isComplete ? "1" : "0.5";
}

// ฟังก์ชันเพิ่มแถวทั่วไป (หมวด 3, 4, 10, 11, 12, 14)
function addTaskRow(type) {
    const container = document.getElementById(taskMap[type].container);
    if (!container) return;
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." style="flex:1;" oninput="validateTaskInput('${type}')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${taskMap[type].container}'); validateTaskInput('${type}')">🗑️</button>`;
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

// หมวด 6: ซ่อม (วันที่ต้องดำ)
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
        <input type="text" name="repair_detail[]" placeholder="อาการ" style="flex:1;" oninput="validateTaskInput('repair')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('repair-container'); validateTaskInput('repair')">🗑️</button>`;
    container.appendChild(div);
    validateTaskInput('repair');
}

// หมวด 7: พัสดุ
function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="procure_id[]" placeholder="PO" style="width:70px;" oninput="validateTaskInput('procure')">
        <input type="date" name="procure_date[]" style="color:#000;" onchange="validateTaskInput('procure')">
        <input type="text" name="procure_detail[]" placeholder="รายการ" style="flex:1;" oninput="validateTaskInput('procure')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('procure-container'); validateTaskInput('procure')">🗑️</button>`;
    container.appendChild(div);
    validateTaskInput('procure');
}

// หมวด 8: บุคคลภายนอก
function addExternalRow() {
    const container = document.getElementById('external-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="date" name="ext_date[]" style="color:#000;" onchange="validateTaskInput('external')">
        <input type="text" name="ext_company[]" placeholder="บริษัท" oninput="validateTaskInput('external')">
        <input type="text" name="ext_detail[]" placeholder="งานที่ทำ" style="flex:1;" oninput="validateTaskInput('external')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('external-container'); validateTaskInput('external')">🗑️</button>`;
    container.appendChild(div);
    validateTaskInput('external');
}

// หมวด 9: ทรัพย์สิน
function addAssetRow() {
    const container = document.getElementById('asset-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="date" name="asset_date[]" style="color:#000;" onchange="validateTaskInput('asset')">
        <input type="text" name="asset_item[]" placeholder="รายการ" style="flex:1;" oninput="validateTaskInput('asset')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('asset-container'); validateTaskInput('asset')">🗑️</button>`;
    container.appendChild(div);
    validateTaskInput('asset');
}

function updateTaskNumbers(id) {
    const container = document.getElementById(id);
    if (container) container.querySelectorAll('.task-number').forEach((n, i) => n.innerText = (i + 1) + ".");
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
            <td><input type="text" name="leave_note[]" placeholder="..."></td>
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
            <input type="text" name="sec_detail[]" placeholder="ผลการตรวจ รปภ." style="flex:1;">
        </div>`).join('');
}

function setCurrentYear() {
    const year = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}

// บังคับสีดำเมื่อมีการเลือกวันที่ใหม่
document.addEventListener('input', function (e) {
    if (e.target.type === 'date') e.target.style.color = "#000000";
});

// การส่งข้อมูล
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerText = "กำลังบันทึก...";
    
    // Logic การส่งข้อมูลเข้า GAS (ใส่ตามเดิมที่พี่เคยใช้ได้เลยครับ)
    alert("ระบบบันทึกกำลังเตรียมการ...");
    btn.disabled = false;
    btn.innerText = "บันทึกรายงานทั้งหมด";
};