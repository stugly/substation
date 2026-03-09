const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";
let selectedImages = [];

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
        console.error("LIFF Error");
    }
}

async function checkUserAndLoadData(lineId) {
    const spinner = document.getElementById('spinner');
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
        }
    } catch (err) {
        // ถ้าดึงข้อมูลไม่ได้ ให้ปิด Spinner เพื่อให้เห็นหน้าฟอร์ม (แม้ข้อมูลบางส่วนจะว่าง)
        if(spinner) spinner.style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        console.error("Fetch error - showing form anyway");
    }
}

function setupMetadata(data) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // --- จุดที่พี่ต้องการ: แก้วันที่ให้สีดำ ---
    const mDate = document.getElementById('meeting_date');
    if (mDate) {
        mDate.value = todayStr;
        mDate.style.color = "#000000"; // บังคับดำ
        mDate.setAttribute('value', todayStr);
    }

    if (document.getElementById('unit')) document.getElementById('unit').value = currentUserUnit;
    
    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        data.stations.filter(s => s.unit === currentUserUnit).forEach(s => locSel.add(new Option("สฟฟ." + s.name, s.name)));
    }
    
    // รายชื่อผู้เข้าประชุม
    const unitList = document.getElementById('unit-staff-list');
    if (unitList && staffData) {
        const uStaff = staffData.filter(s => s.unit === currentUserUnit);
        unitList.innerHTML = uStaff.map(s => `<label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span></label>`).join('');
    }
}

// --- ฟังก์ชันปุ่มกด (อิงตามชื่อใน HTML ของพี่เป๊ะๆ) ---

function addTaskRow(type) {
    addSimpleTaskRow(type);
}

function addSimpleTaskRow(type) {
    const container = document.getElementById(type + '-container');
    if(!container) return;
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${type}-container')"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="power_station[]" placeholder="สถานี" style="width:100px;">
        <input type="text" name="power_detail[]" placeholder="สภาพจ่ายไฟ" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row";
    const eqOpt = (rawAppData && rawAppData.settings_eq) ? rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('') : '';
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="repair_id[]" placeholder="ID" style="width:70px;">
        <input type="date" name="repair_date[]" style="color:#000;">
        <select name="repair_item[]">${eqOpt}</select>
        <input type="text" name="repair_detail[]" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash-can"></i></button>`;
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
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash-can"></i></button>`;
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
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash-can"></i></button>`;
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
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

// --- ฟังก์ชันเสริม (เหมือนของเดิมพี่) ---
function updateTaskNumbers(id) {
    const container = document.getElementById(id);
    if(container) container.querySelectorAll('.task-number').forEach((n, i) => n.innerText = (i+1) + ".");
}

function setupLeaveTable() {
    const body = document.getElementById('leave-table-body');
    if (!body || !staffData) return;
    const uStaff = staffData.filter(s => s.unit === currentUserUnit);
    body.innerHTML = uStaff.map(s => `<tr><td>${s.name}</td><td><input type="number" name="leave_sick[]" value="0"></td><td><input type="number" name="leave_personal[]" value="0"></td><td><input type="number" name="leave_vacation[]" value="0"></td><td><input type="number" name="leave_replace[]" value="0"></td><td><input type="text" name="leave_note[]"></td></tr>`).join('');
}

function setupSecuritySection() {
    const container = document.getElementById('security-container');
    if (!container || !rawAppData || !rawAppData.stations) return;
    const uStations = rawAppData.stations.filter(s => s.unit === currentUserUnit);
    container.innerHTML = uStations.map((s, i) => `<div class="task-row"><div class="task-number">${i+1}.</div><div style="width:120px;">สฟฟ.${s.name}</div><input type="text" name="sec_detail[]" style="flex:1;"></div>`).join('');
}

function setCurrentYear() {
    const year = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}

// บังคับวันที่เลือกใหม่เป็นสีดำ
document.addEventListener('input', function (e) {
    if (e.target.type === 'date') {
        e.target.style.color = "#000000";
    }
});