const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";
let selectedImages = [];

// แผนผังแมพปุ่มล็อค (ต้องตรงกับ ID ใน HTML)
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
        console.error("LIFF Error:", err);
        mockDataForTesting(); 
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
            
            // แก้ไขจุดที่ทำให้หน้าขาว (เช็คก่อนใส่ค่า)
            const recorderInput = document.querySelector('input[name="recorder_uid"]');
            if (recorderInput) recorderInput.value = data.user.uid;

            if(spinner) spinner.style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('welcome').innerText = `สวัสดี, ${data.user.name} (${currentUserUnit})`;
            
            setupMetadata(rawAppData);
            setupLeaveTable(); 
            setupSecuritySection();
            setCurrentYear();
        } else {
            alert("ไม่พบข้อมูลผู้ใช้ในฐานข้อมูล");
        }
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

function setupMetadata(data) {
    const now = new Date();
    const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const fullDateText = `${thMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
    const todayStr = now.toISOString().split('T')[0];

    const mDate = document.getElementById('meeting_date');
    if (mDate) {
        mDate.value = todayStr;
        mDate.style.color = "#000000"; // วันที่ประชุมดำ
        mDate.setAttribute('value', todayStr);
    }

    if (document.getElementById('report-title')) document.getElementById('report-title').innerText = `รายงานการประชุมประจำเดือน ${fullDateText}`;
    if (document.getElementById('unit')) document.getElementById('unit').value = currentUserUnit;
    if (document.getElementById('month')) document.getElementById('month').value = fullDateText;
    if (document.getElementById('start_time')) document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    
    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        data.stations.filter(s => s.unit === currentUserUnit).forEach(s => locSel.add(new Option("สฟฟ." + s.name, s.name)));
    }

    // จัดการรายชื่อผู้เข้าประชุม
    const unitList = document.getElementById('unit-staff-list');
    const pjList = document.getElementById('pj-staff-list');
    if (staffData) {
        const uStaff = staffData.filter(s => s.unit === currentUserUnit);
        const pStaff = staffData.filter(s => s.unit === "ผจฟ.1" && s.unit !== currentUserUnit);
        if(unitList) unitList.innerHTML = uStaff.map(s => `<label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span></label>`).join('');
        if(pjList) pjList.innerHTML = pStaff.map(s => `<label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span></label>`).join('');
    }
}

// --- ฟังก์ชันปุ่มบวก (3-14) ตามที่เรียกใน HTML ---
function addTaskRow(type) { addSimpleTaskRow(type); }

function addSimpleTaskRow(type) {
    const container = document.getElementById(taskMap[type].container);
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('${type}')" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${taskMap[type].container}'); validateTaskInput('${type}');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput(type);
}

function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="power_station[]" placeholder="ชื่อสถานี" style="width:100px;" oninput="validateTaskInput('power')">
        <input type="text" name="power_detail[]" placeholder="สภาพการจ่ายไฟ" style="flex:1;" oninput="validateTaskInput('power')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('power-container'); validateTaskInput('power');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('power');
}

function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row";
    const eqOpt = (rawAppData && rawAppData.settings_eq) ? rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('') : '';
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="repair_id[]" placeholder="ID" style="width:70px;" oninput="validateTaskInput('repair')">
        <input type="date" name="repair_date[]" onchange="validateTaskInput('repair')">
        <select name="repair_item[]" onchange="validateTaskInput('repair')"><option value="">--อุปกรณ์--</option>${eqOpt}</select>
        <input type="text" name="repair_detail[]" placeholder="อาการ..." style="flex:1;" oninput="validateTaskInput('repair')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('repair-container'); validateTaskInput('repair');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('repair');
}

function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="procure_id[]" placeholder="PO" style="width:70px;" oninput="validateTaskInput('procure')">
        <input type="date" name="procure_date[]" onchange="validateTaskInput('procure')">
        <input type="text" name="procure_detail[]" placeholder="รายละเอียด" style="flex:1;" oninput="validateTaskInput('procure')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('procure-container'); validateTaskInput('procure');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('procure');
}

function addExternalRow() {
    const container = document.getElementById('external-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="date" name="ext_date[]" onchange="validateTaskInput('external')">
        <input type="text" name="ext_company[]" placeholder="บริษัท" oninput="validateTaskInput('external')">
        <input type="text" name="ext_detail[]" placeholder="งาน" style="flex:1;" oninput="validateTaskInput('external')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('external-container'); validateTaskInput('external');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('external');
}

function addAssetRow() {
    const container = document.getElementById('asset-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="date" name="asset_date[]" onchange="validateTaskInput('asset')">
        <input type="text" name="asset_item[]" placeholder="ทรัพย์สิน" style="flex:1;" oninput="validateTaskInput('asset')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('asset-container'); validateTaskInput('asset');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('asset');
}

// --- การจัดการรูปภาพ ---
function handleImageSelect(input) {
    const preview = document.getElementById('image-preview');
    if(!preview) return;
    preview.innerHTML = ''; selectedImages = [];
    Array.from(input.files).slice(0, 5).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImages.push({ name: file.name, data: e.target.result });
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = "70px"; img.style.margin = "5px"; img.style.borderRadius = "5px";
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

// --- ฟังก์ชันช่วยเหลืออื่นๆ ---
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
    lastRow.querySelectorAll('input:not([type="hidden"]), select').forEach(el => {
        if (!el.disabled && el.value.trim().length === 0) isComplete = false;
    });
    btn.disabled = !isComplete;
    btn.style.opacity = isComplete ? "1" : "0.5";
}

function updateTaskNumbers(id) {
    const container = document.getElementById(id);
    if(container) container.querySelectorAll('.task-number').forEach((n, i) => n.innerText = (i+1) + ".");
}

function setupLeaveTable() {
    const body = document.getElementById('leave-table-body');
    if (!body || !staffData) return;
    body.innerHTML = staffData.filter(s => s.unit === currentUserUnit).map(s => `
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
    if (!container || !rawAppData.stations) return;
    container.innerHTML = rawAppData.stations.filter(s => s.unit === currentUserUnit).map((s, i) => `
        <div class="task-row">
            <div class="task-number">${i+1}.</div>
            <div style="width:120px;">สฟฟ.${s.name}</div>
            <input type="hidden" name="sec_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="sec_detail[]" placeholder="ผลตรวจ รปภ." style="flex:1;">
        </div>`).join('');
}

function setCurrentYear() {
    const year = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}

// วันที่ในตารางทำความสะอาด/วัชพืช ต้องดำ
document.addEventListener('input', function (e) {
    if (e.target.type === 'date') {
        if (e.target.value) {
            e.target.style.color = "#000000";
            e.target.setAttribute('value', e.target.value);
        }
    }
});

function mockDataForTesting() {
    currentUserUnit = "ผจฟ.1";
    rawAppData = { 
        stations: [{name: "นครศรีธรรมราช 1", unit: "ผจฟ.1"}],
        settings_eq: ["TR", "CB"],
        staff: [{name: "นายทดสอบ", uid: "U123", unit: "ผจฟ.1"}]
    };
    staffData = rawAppData.staff;
    document.getElementById('main-app').style.display = 'block';
    setupMetadata(rawAppData);
    setupLeaveTable();
    setupSecuritySection();
    setCurrentYear();
}

document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.innerText = "⌛ กำลังบันทึก...";
    
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    const arrayFields = [
        'assignment_detail', 'plan_detail', 'power_station', 'power_detail',
        'repair_id', 'repair_date', 'repair_item', 'repair_detail',
        'procure_id', 'procure_date', 'procure_detail',
        'ext_date', 'ext_company', 'ext_detail',
        'asset_date', 'asset_item', 'km_detail', 'idea_detail', 'other_detail',
        'leave_staff_name', 'leave_sick', 'leave_personal', 'leave_vacation', 'leave_replace', 'leave_note',
        'sec_station', 'sec_detail', 'clean_date', 'clean_detail', 'weed_date', 'weed_detail'
    ];

    arrayFields.forEach(f => {
        payload[f] = formData.getAll(f + '[]');
    });

    payload.attendance = formData.getAll('attendance');
    payload.images = selectedImages;

    try {
        await fetch(GAS_WEBAPP_URL, { method: 'POST', body: JSON.stringify(payload) });
        alert("✅ บันทึกรายงานสำเร็จ!");
        liff.closeWindow();
    } catch (err) {
        alert("❌ บันทึกไม่สำเร็จ: " + err.message);
        btn.disabled = false; btn.innerText = "✅ บันทึกรายงานทั้งหมด";
    }
};