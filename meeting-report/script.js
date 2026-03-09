const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybyNXLKsm04GXsJU0QuKZKOjOoh3XujDbA25FrLYgFE3excmvHn1B-zCdn-rEF1cwf/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "ผจฟ.1"; // ค่าเริ่มต้นถ้าดึงจาก GAS ไม่ได้

window.onload = function() {
    // 1. โชว์หน้าแอปทันที ไม่ต้องรออะไรทั้งนั้น
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
        mDate.style.color = "#000000"; 
    }
    const sTime = document.getElementById('start_time');
    if (sTime) {
        sTime.value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    }
    setCurrentYear();
    
    // โหลดข้อมูล "สำรอง" ไว้ก่อนเลย เผื่อ GAS พัง
    renderBackupData();
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
        .catch(err => {
            console.warn("GAS Fetch Fail - ใช้ข้อมูลสำรองแทน");
            // ถ้าดึงไม่ได้ ก็ไม่ต้องทำอะไร เพราะ renderBackupData ทำงานไปแล้ว
        });
}

// ข้อมูลสำรองเผื่อเน็ตเน่าหรือ GAS มีปัญหา
function renderBackupData() {
    const locSel = document.getElementById('location');
    if (locSel && locSel.options.length <= 1) {
        locSel.innerHTML = `
            <option value="">-- เลือกสถานที่ --</option>
            <option value="สฟฟ.1">สฟฟ.1</option>
            <option value="สฟฟ.2">สฟฟ.2</option>
            <option value="สำนักงาน">สำนักงาน</option>
        `;
    }
    
    const unitList = document.getElementById('unit-staff-list');
    if (unitList && unitList.innerHTML === "") {
        unitList.innerHTML = "<p style='color:red; font-size:12px;'>ดึงรายชื่อไม่สำเร็จ กรุณาพิมพ์ในหมายเหตุแทน</p>";
    }
}

function renderDynamicParts() {
    const locSel = document.getElementById('location');
    if (locSel && rawAppData.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        rawAppData.stations.filter(s => s.unit === currentUserUnit).forEach(s => {
            locSel.add(new Option("สฟฟ." + s.name, s.name));
        });
    }

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

// --- ฟังก์ชันเพิ่มแถว (ตามที่ HTML เรียก) ---

function addTaskRow(type) {
    const container = document.getElementById(type + '-container');
    if(!container) return;
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" placeholder="..." style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('${type}-container')">🗑️</button>`;
    container.appendChild(div);
}

function addSimpleTaskRow(type) { addTaskRow(type); }

function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="power_station[]" placeholder="สถานี" style="width:80px;">
        <input type="text" name="power_detail[]" placeholder="ปกติ" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('power-container')">🗑️</button>`;
    container.appendChild(div);
}

function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row";
    const eqOpt = (rawAppData && rawAppData.settings_eq) ? rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('') : '<option value="TR">TR</option><option value="Breaker">Breaker</option>';
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="repair_id[]" placeholder="ID" style="width:60px;">
        <input type="date" name="repair_date[]" style="color:#000;">
        <select name="repair_item[]">${eqOpt}</select>
        <input type="text" name="repair_detail[]" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('repair-container')">🗑️</button>`;
    container.appendChild(div);
}

function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="procure_id[]" placeholder="PO" style="width:70px;">
        <input type="date" name="procure_date[]" style="color:#000;">
        <input type="text" name="procure_detail[]" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('procure-container')">🗑️</button>`;
    container.appendChild(div);
}

function addExternalRow() {
    const container = document.getElementById('external-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="date" name="ext_date[]" style="color:#000;">
        <input type="text" name="ext_company[]" placeholder="บริษัท">
        <input type="text" name="ext_detail[]" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('external-container')">🗑️</button>`;
    container.appendChild(div);
}

function addAssetRow() {
    const container = document.getElementById('asset-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="date" name="asset_date[]" style="color:#000;">
        <input type="text" name="asset_item[]" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('asset-container')">🗑️</button>`;
    container.appendChild(div);
}

function updateNumbers(id) {
    const c = document.getElementById(id);
    if(c) c.querySelectorAll('.task-number').forEach((n, i) => n.innerText = (i + 1) + ".");
}

function setCurrentYear() {
    const year = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}

function setupLeaveTable() {
    const body = document.getElementById('leave-table-body');
    if (!body || staffData.length === 0) return;
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