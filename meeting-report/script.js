const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";
let selectedImages = [];

// แผนผังสำหรับระบบ Lock ปุ่ม (Validation) - ต้องตรงกับ ID ใน HTML ของพี่
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
        console.error("LIFF Error");
        // ถ้า LIFF มีปัญหา ให้เปิดหน้าฟอร์มเพื่อให้ทำงานต่อได้
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
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
            
            if(spinner) spinner.style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            
            if (data.user) {
                document.getElementById('welcome').innerText = `สวัสดี, ${data.user.name} (${currentUserUnit})`;
                const recorderInput = document.querySelector('input[name="recorder_uid"]');
                if (recorderInput) recorderInput.value = data.user.uid;
            }
            
            setupMetadata(rawAppData);
            setupLeaveTable(); 
            setupSecuritySection();
            setCurrentYear();
        }
    } catch (err) {
        console.error("Fetch error");
        if(spinner) spinner.style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        setCurrentYear();
    }
}

function setupMetadata(data) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // --- แก้ไข: บังคับวันที่ประชุมเป็นสีดำ ---
    const mDate = document.getElementById('meeting_date');
    if (mDate) {
        mDate.value = todayStr;
        mDate.style.color = "#000000"; 
    }

    if (document.getElementById('unit')) document.getElementById('unit').value = currentUserUnit;
    
    // ตั้งเวลาเริ่มต้น
    if (document.getElementById('start_time')) {
        document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    }

    // เติมสถานที่
    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        data.stations.filter(s => s.unit === currentUserUnit).forEach(s => {
            locSel.add(new Option("สฟฟ." + s.name, s.name));
        });
    }
    
    // รายชื่อผู้เข้าประชุม
    const unitList = document.getElementById('unit-staff-list');
    if (unitList && staffData.length > 0) {
        const uStaff = staffData.filter(s => s.unit === currentUserUnit);
        unitList.innerHTML = uStaff.map(s => `
            <label class="check-item">
                <input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span>
            </label>`).join('');
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

// ฟังก์ชันเพิ่มแถวพื้นฐาน (หมวด 3, 4, 10, 11, 12, 14)
function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." style="flex:1;" oninput="validateTaskInput('${type}')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}')">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
    container.appendChild(div);
    validateTaskInput(type);
}

// หมวด 5: สภาพการจ่ายไฟ
function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="power_station[]" placeholder="สถานี" style="width:80px;" oninput="validateTaskInput('power')">
        <input type="text" name="power_detail[]" placeholder="ปกติ" style="flex:1;" oninput="validateTaskInput('power')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('power-container'); validateTaskInput('power')">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
    container.appendChild(div);
    validateTaskInput('power');
}

// หมวด 6: อุปกรณ์ชำรุด
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
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('repair-container'); validateTaskInput('repair')">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
    container.appendChild(div);
    validateTaskInput('repair');
}

// หมวด 7: ติดตามงานพัสดุ
function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="procure_id[]" placeholder="เลขที่ PO" style="width:80px;" oninput="validateTaskInput('procure')">
        <input type="date" name="procure_date[]" style="color:#000;" onchange="validateTaskInput('procure')">
        <input type="text" name="procure_detail[]" placeholder="รายการ" style="flex:1;" oninput="validateTaskInput('procure')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('procure-container'); validateTaskInput('procure')">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
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
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('external-container'); validateTaskInput('external')">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
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
        <input type="text" name="asset_item[]" placeholder="รายการทรัพย์สิน" style="flex:1;" oninput="validateTaskInput('asset')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('asset-container'); validateTaskInput('asset')">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
    container.appendChild(div);
    validateTaskInput('asset');
}

// --- ส่วนตารางและการจัดการข้อมูลอื่นๆ ---

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

// ดักฟังการป้อนข้อมูลวันที่ เพื่อบังคับให้เป็นสีดำ
document.addEventListener('input', function (e) {
    if (e.target.type === 'date') {
        e.target.style.color = "#000000";
    }
});

// --- การส่งข้อมูล ---
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerText = "กำลังบันทึก...";

    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    // จัดการข้อมูลแบบ Array (ตัวอย่าง)
    const arrayFields = ['assignment_detail', 'plan_detail', 'power_station', 'power_detail', 'repair_id', 'repair_date', 'repair_item', 'repair_detail'];
    arrayFields.forEach(f => {
        payload[f] = formData.getAll(f + '[]');
    });

    try {
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        alert("บันทึกสำเร็จ!");
        liff.closeWindow();
    } catch (err) {
        alert("เกิดข้อผิดพลาดในการบันทึก");
        btn.disabled = false;
        btn.innerText = "บันทึกรายงานทั้งหมด";
    }
};