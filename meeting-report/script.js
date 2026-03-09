const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybyNXLKsm04GXsJU0QuKZKOjOoh3XujDbA25FrLYgFE3excmvHn1B-zCdn-rEF1cwf/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";

// แผนผังสำหรับระบบ Lock ปุ่ม (อ้างอิงตาม ID ใน HTML ของพี่)
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
    // 1. เปิดฟอร์มทันทีกันเหนื่อยใจ
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    setupInitialUI();
    initializeLiff();
};

function setupInitialUI() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const mDate = document.getElementById('meeting_date');
    if (mDate) {
        mDate.value = todayStr;
        mDate.style.color = "#000000"; // วันที่สีดำชัวร์
    }
    const sTime = document.getElementById('start_time');
    if (sTime) {
        sTime.value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
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
        fetchDataFromGAS(""); 
    }
}

function fetchDataFromGAS(lineId) {
    fetch(`${GAS_WEBAPP_URL}?action=getUser&lineId=${lineId}`)
        .then(res => res.json())
        .then(data => {
            if (data) {
                rawAppData = data;
                staffData = data.staff || [];
                currentUserUnit = (data.user && data.user.unit) ? data.user.unit : "ผจฟ.1";
                
                if (data.user) {
                    document.getElementById('welcome').innerText = `สวัสดี, ${data.user.name} (${currentUserUnit})`;
                    document.getElementById('recorder_uid').value = data.user.uid;
                }
                
                renderDynamicParts();
            }
        })
        .catch(err => console.error("GAS Fetch Fail"));
}

function renderDynamicParts() {
    // เติมสถานที่
    const locSel = document.getElementById('location');
    if (locSel && rawAppData.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        rawAppData.stations.filter(s => s.unit === currentUserUnit).forEach(s => {
            locSel.add(new Option("สฟฟ." + s.name, s.name));
        });
    }

    // เติมรายชื่อพนักงาน
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

// --- ฟังก์ชันจัดการแถว (Matching กับ HTML ของพี่) ---

function validateRow(type) {
    const config = taskMap[type];
    if (!config) return;
    const btn = document.getElementById(config.btn);
    const container = document.getElementById(config.container);
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

// สำหรับข้อความทั่วไป (assignment, plan, km, idea, other)
function addTaskRow(type) {
    const container = document.getElementById(type + '-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" placeholder="..." style="flex:1;" oninput="validateRow('${type}')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('${type}-container'); validateRow('${type}')">🗑️</button>`;
    container.appendChild(div);
    validateRow(type);
}

// สำหรับปุ่มใน HTML ที่เรียกชื่อ addSimpleTaskRow
function addSimpleTaskRow(type) {
    addTaskRow(type);
}

function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="power_station[]" placeholder="สถานี" style="width:80px;" oninput="validateRow('power')">
        <input type="text" name="power_detail[]" placeholder="ปกติ" style="flex:1;" oninput="validateRow('power')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('power-container'); validateRow('power')">🗑️</button>`;
    container.appendChild(div);
    validateRow('power');
}

function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row";
    const eqOpt = (rawAppData && rawAppData.settings_eq) ? rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('') : '<option value="TR">TR</option>';
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="repair_id[]" placeholder="ID" style="width:60px;" oninput="validateRow('repair')">
        <input type="date" name="repair_date[]" style="color:#000;" onchange="validateRow('repair')">
        <select name="repair_item[]" onchange="validateRow('repair')">${eqOpt}</select>
        <input type="text" name="repair_detail[]" style="flex:1;" oninput="validateRow('repair')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('repair-container'); validateRow('repair')">🗑️</button>`;
    container.appendChild(div);
    validateRow('repair');
}

function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="procure_id[]" placeholder="PO" style="width:70px;" oninput="validateRow('procure')">
        <input type="date" name="procure_date[]" style="color:#000;" onchange="validateRow('procure')">
        <input type="text" name="procure_detail[]" style="flex:1;" oninput="validateRow('procure')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('procure-container'); validateRow('procure')">🗑️</button>`;
    container.appendChild(div);
    validateRow('procure');
}

function addExternalRow() {
    const container = document.getElementById('external-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="date" name="ext_date[]" style="color:#000;" onchange="validateRow('external')">
        <input type="text" name="ext_company[]" placeholder="บริษัท" oninput="validateRow('external')">
        <input type="text" name="ext_detail[]" style="flex:1;" oninput="validateRow('external')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('external-container'); validateRow('external')">🗑️</button>`;
    container.appendChild(div);
    validateRow('external');
}

function addAssetRow() {
    const container = document.getElementById('asset-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="date" name="asset_date[]" style="color:#000;" onchange="validateRow('asset')">
        <input type="text" name="asset_item[]" style="flex:1;" oninput="validateRow('asset')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('asset-container'); validateRow('asset')">🗑️</button>`;
    container.appendChild(div);
    validateRow('asset');
}

// --- ฟังก์ชันเสริม ---

function updateNumbers(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.querySelectorAll('.task-number').forEach((n, i) => n.innerText = (i + 1) + ".");
    }
}

function setCurrentYear() {
    const year = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}

function setupLeaveTable() {
    const body = document.getElementById('leave-table-body');
    if (!body) return;
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

document.addEventListener('input', function (e) {
    if (e.target.type === 'date') e.target.style.color = "#000000";
});