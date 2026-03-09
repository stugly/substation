const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybyNXLKsm04GXsJU0QuKZKOjOoh3XujDbA25FrLYgFE3excmvHn1B-zCdn-rEF1cwf/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";

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
    // 1. สั่งเปิดหน้าฟอร์มทันที ไม่ต้องรอดึงข้อมูลเสร็จ
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // 2. ตั้งค่าพื้นฐาน (วันที่ดำ, ปี พ.ศ.) ทันที
    setupBasicUI();
    
    // 3. ค่อยไปรันระบบ LIFF และดึงข้อมูลจาก GAS เบื้องหลัง
    initializeLiff(); 
};

function setupBasicUI() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // แก้วันที่ให้เป็นสีดำ
    const mDate = document.getElementById('meeting_date');
    if (mDate) {
        mDate.value = todayStr;
        mDate.style.color = "#000000"; 
    }
    
    // ตั้งเวลา
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
        console.error("LIFF Fail");
        fetchDataFromGAS(""); // ลองดึงแบบไม่มี ID
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
            
            // เติมข้อมูลลงใน List/Dropdown หลังจากโหลดเสร็จ
            updateDataToUI();
        }
    } catch (err) {
        console.error("GAS Fetch Fail");
    }
}

function updateDataToUI() {
    if (!rawAppData) return;

    // เติมหน่วยงาน
    if (document.getElementById('unit')) document.getElementById('unit').value = currentUserUnit;

    // เติมสถานที่
    const locSel = document.getElementById('location');
    if (locSel && rawAppData.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        rawAppData.stations.filter(s => s.unit === currentUserUnit).forEach(s => {
            locSel.add(new Option("สฟฟ." + s.name, s.name));
        });
    }
    
    // รายชื่อพนักงาน
    const unitList = document.getElementById('unit-staff-list');
    if (unitList && staffData.length > 0) {
        const uStaff = staffData.filter(s => s.unit === currentUserUnit);
        unitList.innerHTML = uStaff.map(s => `
            <label class="check-item">
                <input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span>
            </label>`).join('');
    }
    
    // เรียกฟังก์ชันตารางที่ต้องใช้ข้อมูลจาก GAS
    setupLeaveTable();
    setupSecuritySection();
}

// --- ฟังก์ชันเสริม (ปุ่มกด + ระบบ Lock) ---

function validateTaskInput(type) {
    const config = taskMap[type];
    const btn = document.getElementById(config.btn);
    const container = document.getElementById(config.container);
    if (!btn || !container) return;
    const rows = container.getElementsByClassName('task-row');
    if (rows.length === 0) { btn.disabled = false; btn.style.opacity = "1"; return; }
    const lastRow = rows[rows.length - 1];
    let isComplete = true;
    lastRow.querySelectorAll('input:not([type="hidden"]), select').forEach(el => {
        if (el.value.trim() === "") isComplete = false;
    });
    btn.disabled = !isComplete;
    btn.style.opacity = isComplete ? "1" : "0.5";
}

function addTaskRow(type) {
    const container = document.getElementById(taskMap[type].container);
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." style="flex:1;" oninput="validateTaskInput('${type}')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${taskMap[type].container}'); validateTaskInput('${type}')">🗑️</button>`;
    container.appendChild(div);
    validateTaskInput(type);
}

// หมวด 6: ซ่อม (วันที่ต้องดำด้วย)
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

function updateTaskNumbers(id) {
    const container = document.getElementById(id);
    if (container) container.querySelectorAll('.task-number').forEach((n, i) => n.innerText = (i + 1) + ".");
}

function setCurrentYear() {
    const year = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}

// บังคับวันที่เลือกใหม่เป็นสีดำ
document.addEventListener('input', function (e) {
    if (e.target.type === 'date') e.target.style.color = "#000000";
});

function setupLeaveTable() { /* โค้ดเดิมของพี่ */ }
function setupSecuritySection() { /* โค้ดเดิมของพี่ */ }