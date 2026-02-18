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
    clean: { container: 'clean-container', btn: 'btn-add-clean', label: 'ทำความสะอาด' },
    permit: { container: 'permit-container', btn: 'btn-add-permit', label: 'Work Permit' },
    asset: { container: 'asset-container', btn: 'btn-add-asset', label: 'ทรัพย์สิน' },
    km: { container: 'km-container', btn: 'btn-add-km', label: 'KM/ความคิดสร้างสรรค์' },
    other: { container: 'other-container', btn: 'btn-add-other', label: 'เรื่องอื่นๆ' }
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
            document.getElementById('spinner-text').innerHTML = `<div style="padding:20px; color:#d9534f;"><b>ไม่พบสิทธิ์การใช้งาน</b></div>`;
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

    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        const myStations = data.stations.filter(s => s.unit === currentUserUnit);
        (myStations.length > 0 ? myStations : data.stations).forEach(s => locSel.add(new Option("สฟฟ." + s.name, s.name)));
    }

    const attList = document.getElementById('attendance-list');
    if (attList) {
        let filteredStaff = staffData.filter(s => s.unit === currentUserUnit || s.unit === "ผจฟ.1");
        attList.innerHTML = filteredStaff.map(s => 
            `<label style="display:block; margin-bottom:8px;"><input type="checkbox" name="attendance" value="${s.uid}"> ${s.name} </label>`
        ).join('');
    }

    const leaveList = document.getElementById('leave-summary-list');
    if (leaveList) {
        let myStaff = staffData.filter(s => s.unit === currentUserUnit);
        leaveList.innerHTML = myStaff.map(s => `
            <div class="task-row" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                <div style="flex: 1; font-size: 14px;">${s.name}</div>
                <select name="leave_type_${s.uid}" style="flex: 0 0 100px;">
                    <option value="ปกติ">ปกติ</option>
                    <option value="ลากิจ">ลากิจ</option>
                    <option value="ลาป่วย">ลาป่วย</option>
                    <option value="ลาพักร้อน">ลาพักร้อน</option>
                </select>
                <input type="number" name="leave_days_${s.uid}" value="0" style="flex: 0 0 50px;" min="0">
            </div>
        `).join('');
    }

    setupPowerTab(data);
}

function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row";
    div.style.cssText = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";
    div.innerHTML = `
        <div class="task-number" style="flex: 0 0 20px;">${rowCount}.</div>
        <input type="hidden" name="${type}_type[]" value="${config.label}">
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('${type}')" required style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
    validateTaskInput(type);
}

// --- Tab 3: Power Status (รายการที่โหลดมาให้) ---
function setupPowerTab(data) {
    const container = document.getElementById('power-container');
    if (!container || !rawAppData) return;
    container.innerHTML = '';
    const myStations = rawAppData.stations.filter(s => s.unit === currentUserUnit);
    myStations.forEach((s, index) => {
        const div = document.createElement('div');
        div.className = "task-row"; 
        div.style.cssText = "display: flex; gap: 10px; margin-bottom: 12px; align-items: center;"; 
        div.innerHTML = `
            <div class="task-number" style="flex: 0 0 20px;">${index + 1}.</div>
            <div style="flex: 0 0 110px; font-size: 13px; font-weight: 600; color: #333; text-align: left;">สฟฟ.${s.name}</div> 
            <input type="hidden" name="power_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="power_detail[]" value="สภาพการจ่ายไฟปกติ" oninput="validateTaskInput('power')" style="flex: 1;">
            <div style="flex: 0 0 32px;"></div> `;
        container.appendChild(div);
    });
    validateTaskInput('power');
}

// --- Tab 3: Power Status (รายการที่กดเพิ่มเอง) ---
function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    const myStations = rawAppData.stations.filter(s => s.unit === currentUserUnit);
    let stationOptions = myStations.map(s => `<option value="สฟฟ.${s.name}">สฟฟ.${s.name}</option>`).join('');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row"; 
    div.style.cssText = "display: flex; gap: 10px; margin-bottom: 12px; align-items: center;"; 
    div.innerHTML = `
        <div class="task-number" style="flex: 0 0 20px;">${rowCount}.</div>
        <select name="power_station[]" onchange="validateTaskInput('power')" style="flex: 0 0 110px; height: 32px;"> 
            <option value="">-- เลือก --</option>${stationOptions}
        </select>
        <input type="text" name="power_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('power')" required style="flex: 1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('power-container'); validateTaskInput('power');" style="flex: 0 0 32px; height: 32px;">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
    validateTaskInput('power');
}

// --- Tab 4: Repair (ขยายช่องรหัสและช่องวันที่) ---
function addRepairRow() {
    const container = document.getElementById('repair-container');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper"; 
    let eqOptions = `<option value="">-- เลือก --</option>` + rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    let statusOptions = `<option value="">-- เลือก --</option>` + rawAppData.settings_status_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    
    div.innerHTML = `
        <div class="task-number" style="padding-top: 25px; flex: 0 0 20px;">${rowCount}.</div>
        <div class="compact-grid" style="display: flex; flex-wrap: wrap; gap: 10px; flex: 1;">
            <div style="flex: 0 0 30%; display: flex; flex-direction: column;"> 
                <span style="font-size: 11px; color: #06C755; font-weight: bold; margin-bottom: 2px;">รหัสอุปกรณ์</span>
                <input type="text" name="repair_id[]" placeholder="รหัส" oninput="validateTaskInput('repair')" style="width: 100%;">
            </div>
            <div style="flex: 0 0 30%; display: flex; flex-direction: column;">
                <span style="font-size: 11px; color: #06C755; font-weight: bold; margin-bottom: 2px;">วันที่ชำรุด</span>
                <input type="date" name="repair_date[]" onchange="validateTaskInput('repair')" style="width: 100%;">
            </div>
            <div style="flex: 0 0 16%; display: flex; flex-direction: column;">
                <span style="font-size: 11px; color: #088c3c; font-weight: bold; margin-bottom: 2px;">อุปกรณ์</span>
                <select name="repair_item[]" onchange="validateTaskInput('repair')" style="width: 100%;">${eqOptions}</select>
            </div>
            <div style="flex: 0 0 16%; display: flex; flex-direction: column;">
                <span style="font-size: 11px; color: #088c3c; font-weight: bold; margin-bottom: 2px;">สถานะ</span>
                <select name="repair_status[]" onchange="validateTaskInput('repair')" style="width: 100%;">${statusOptions}</select>
            </div>
            <input type="text" name="repair_detail[]" placeholder="รายละเอียดการชำรุด..." oninput="validateTaskInput('repair')" style="flex: 0 0 100%; margin-top: 4px !important;">
        </div>
        <button type="button" class="btn-remove-task" style="margin-top: 25px; flex: 0 0 32px;" onclick="this.parentElement.remove(); updateTaskNumbers('repair-container'); validateTaskInput('repair');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
    validateTaskInput('repair');
}

function addPermitRow() {
    const container = document.getElementById('permit-container');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    div.innerHTML = `
        <div class="task-number" style="padding-top: 25px; flex: 0 0 20px;">${rowCount}.</div>
        <div class="compact-grid" style="display: flex; flex-wrap: wrap; gap: 10px; flex: 1;">
            <div style="flex: 0 0 30%; display: flex; flex-direction: column;">
                <span style="font-size: 11px; color: #06C755; font-weight: bold; margin-bottom: 2px;">เลขที่ WP</span>
                <input type="text" name="wp_no[]" placeholder="เลขที่" oninput="validateTaskInput('permit')">
            </div>
            <div style="flex: 0 0 35%; display: flex; flex-direction: column;">
                <span style="font-size: 11px; color: #06C755; font-weight: bold; margin-bottom: 2px;">บริษัท</span>
                <input type="text" name="wp_company[]" placeholder="บริษัท" oninput="validateTaskInput('permit')">
            </div>
            <div style="flex: 0 0 25%; display: flex; flex-direction: column;">
                <span style="font-size: 11px; color: #06C755; font-weight: bold; margin-bottom: 2px;">สถานะ</span>
                <select name="wp_status[]" onchange="validateTaskInput('permit')">
                    <option value="">-- เลือก --</option>
                    <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                    <option value="ปิดใบงานแล้ว">ปิดใบงานแล้ว</option>
                </select>
            </div>
            <input type="text" name="wp_detail[]" placeholder="รายละเอียด..." oninput="validateTaskInput('permit')" style="flex: 0 0 100%; margin-top: 4px !important;">
        </div>
        <button type="button" class="btn-remove-task" style="margin-top: 25px; flex: 0 0 32px;" onclick="this.parentElement.remove(); updateTaskNumbers('permit-container'); validateTaskInput('permit');"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
    validateTaskInput('permit');
}

function validateTaskInput(type) {
    const config = taskMap[type];
    if(!config) return;
    const container = document.getElementById(config.container);
    const btn = document.getElementById(config.btn);
    if (!btn || !container) return;
    const rows = container.getElementsByClassName('task-row');
    if (rows.length === 0) { setBtnState(btn, true); return; }
    const lastRow = rows[rows.length - 1];
    const inputs = lastRow.querySelectorAll('input:not([type="hidden"]), select');
    let isComplete = true;
    inputs.forEach(el => { if (el.required && el.value.trim().length === 0) isComplete = false; });
    setBtnState(btn, isComplete);
}

function setBtnState(btn, isEnabled) {
    if(!btn) return;
    btn.disabled = !isEnabled;
    btn.style.opacity = isEnabled ? "1" : "0.5";
}

function updateTaskNumbers(containerId) {
    const container = document.getElementById(containerId);
    const rows = container.getElementsByClassName('task-row');
    Array.from(rows).forEach((row, i) => { 
        const num = row.querySelector('.task-number');
        if(num) num.innerText = (i + 1) + "."; 
    });
}

function handleImageSelect(input) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    selectedImages = [];
    Array.from(input.files).slice(0, 5).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImages.push({ name: file.name, data: e.target.result });
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!confirm("ยืนยันการบันทึกรายงานข้อมูลทั้งหมด?")) return;
    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.innerText = "⌛ กำลังบันทึกข้อมูล...";
    
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    Object.keys(taskMap).forEach(key => {
        payload[key+'_detail'] = Array.from(formData.getAll(key+'_detail[]'));
    });
    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.images = selectedImages;

    try {
        const response = await fetch(GAS_WEBAPP_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        alert("บันทึกข้อมูลเรียบร้อยแล้ว!");
        location.reload();
    } catch (err) {
        alert("บันทึกไม่สำเร็จ: " + err.message);
        btn.disabled = false;
    }
};