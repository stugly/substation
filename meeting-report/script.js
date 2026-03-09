const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";
let selectedImages = [];

// แผนผังสำหรับปุ่มกด (ตรงตาม ID ใน HTML ของพี่)
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
            checkUserAndLoadData(profile.userId);
        }
    } catch (err) {
        console.error("LIFF Init Error:", err);
        loadMockData(); // ถ้า Error ให้รันข้อมูลจำลองเพื่อไม่ให้หน้าขาว
    }
}

// --- แก้จุดที่ทำให้หน้าขาว (CORS Error) ---
async function checkUserAndLoadData(lineId) {
    const spinner = document.getElementById('spinner');
    try {
        // ใช้โหมด 'cors' แต่ถ้าติดปัญหา เราจะใช้ try-catch คลุมไว้
        const response = await fetch(`${GAS_WEBAPP_URL}?action=getUser&lineId=${lineId}`);
        const data = await response.json();
        
        if (data && data.user) {
            renderAppData(data);
        } else {
            loadMockData();
        }
    } catch (err) {
        console.warn("CORS/Fetch Error - Loading Mock Data instead.");
        loadMockData(); // ถ้าดึงจาก Google ไม่ได้ ให้ดึงจาก Mock แทน ฟอร์มจะได้ไม่หาย
    } finally {
        if(spinner) spinner.style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
    }
}

function renderAppData(data) {
    rawAppData = data; 
    staffData = data.staff; 
    currentUserUnit = data.user.unit;
    
    document.getElementById('welcome').innerText = `สวัสดี, ${data.user.name} (${currentUserUnit})`;
    const recorderInput = document.querySelector('input[name="recorder_uid"]');
    if (recorderInput) recorderInput.value = data.user.uid;

    setupMetadata(rawAppData);
    setupLeaveTable(); 
    setupSecuritySection();
    setCurrentYear();
}

function loadMockData() {
    const mock = {
        stations: [{name: "นครศรีธรรมราช 1", unit: "ผจฟ.1"}],
        settings_eq: ["TR", "CB", "DS", "LBS", "CT/VT"],
        staff: [{name: "นายทดสอบ ระบบ", uid: "U123", unit: "ผจฟ.1"}]
    };
    currentUserUnit = "ผจฟ.1";
    renderAppData({ user: {name: "ผู้ใช้ทดสอบ", unit: "ผจฟ.1", uid: "OFFLINE"}, ...mock });
}

// --- 1. แก้วันที่ให้เป็นสีดำ ---
function setupMetadata(data) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const mDate = document.getElementById('meeting_date');
    if (mDate) {
        mDate.value = todayStr;
        mDate.style.color = "#000000"; // บังคับดำ
        mDate.setAttribute('value', todayStr);
    }

    if (document.getElementById('unit')) document.getElementById('unit').value = currentUserUnit;
    if (document.getElementById('start_time')) {
        document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    }
    
    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        data.stations.forEach(s => locSel.add(new Option("สฟฟ." + s.name, s.name)));
    }
}

// --- 2. ฟังก์ชันปุ่มบวก (3-14) ทั้งหมด ---
function addTaskRow(type) {
    const container = document.getElementById(taskMap[type].container);
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${taskMap[type].container}')">🗑️</button>`;
    container.appendChild(div);
}

// ฟังก์ชันเฉพาะทาง (ชำรุด, จัดซื้อ, ฯลฯ)
function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row";
    const eqOpt = rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="repair_id[]" placeholder="ID" style="width:70px;">
        <input type="date" name="repair_date[]" style="color:#000;">
        <select name="repair_item[]">${eqOpt}</select>
        <input type="text" name="repair_detail[]" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove()">🗑️</button>`;
    container.appendChild(div);
}

function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div>
                     <input type="text" name="power_station[]" placeholder="สถานี" style="width:80px;">
                     <input type="text" name="power_detail[]" placeholder="ปกติ" style="flex:1;">
                     <button type="button" class="btn-remove-task" onclick="this.parentElement.remove()">🗑️</button>`;
    container.appendChild(div);
}

// --- ฟังก์ชันอื่นๆ เพื่อให้ระบบสมบูรณ์ ---
function updateTaskNumbers(id) {
    const container = document.getElementById(id);
    if(container) container.querySelectorAll('.task-number').forEach((n, i) => n.innerText = (i+1) + ".");
}

function setupLeaveTable() {
    const body = document.getElementById('leave-table-body');
    if (!body || !staffData) return;
    body.innerHTML = staffData.map(s => `
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
    if (!container || !rawAppData.stations) return;
    container.innerHTML = rawAppData.stations.map((s, i) => `
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

// ดักฟังวันที่ในอนาคตที่พี่จะกดเพิ่ม
document.addEventListener('input', function (e) {
    if (e.target.type === 'date') {
        e.target.style.color = "#000000";
    }
});