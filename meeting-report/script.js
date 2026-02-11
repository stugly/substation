const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null; // เก็บข้อมูลทั้งหมดไว้ดึงรายชื่อสถานี
let currentUserUnit = "";
let selectedImages = [];

// แมพของ Container และ ปุ่ม ให้รองรับครบทุก Tab
const taskMap = {
    assignment: { container: 'assignment-container', btn: 'btn-add-assignment', label: 'มอบหมาย' },
    plan: { container: 'plan-container', btn: 'btn-add-plan', label: 'แผนงาน' },
    power: { container: 'power-container', btn: 'btn-add-power', label: 'สภาพจ่ายไฟ' },
    repair: { container: 'repair-container', btn: 'btn-add-repair', label: 'อุปกรณ์ชำรุด' },
    procure: { container: 'procure-container', btn: 'btn-add-procure', label: 'จัดซื้อจัดจ้าง' },
    clean: { container: 'clean-container', btn: 'btn-add-clean', label: 'ทำความสะอาด' }
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
        rawAppData = data; // เก็บข้อมูลดิบไว้ใช้ทั่วแอป
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
            document.getElementById('recorder_line').value = user.line;
        } else {
            document.getElementById('spinner-text').innerHTML = `<div style="padding:20px; color:#d9534f; font-family:Kanit;"><b>ไม่พบสิทธิ์การใช้งาน</b><br><small>ID: ${myId}</small></div>`;
        }
    } catch (err) { console.error("Data Load Error:", err); }
}

function setupMetadata(data) {
    const now = new Date();
    const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const fullDateText = `${thMonths[now.getMonth()]} ${now.getFullYear() + 543}`;

    document.getElementById('report-title').innerText = `รายงานการประชุม ${currentUserUnit} ประจำเดือน ${fullDateText}`;
    document.getElementById('unit').value = currentUserUnit;
    document.getElementById('month').value = fullDateText;
    document.getElementById('meeting_date').value = now.toISOString().split('T')[0];
    document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    // ตั้งค่าสถานที่ประชุม (Tab 1)
    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        const myUnit = currentUserUnit ? currentUserUnit.trim() : "";
        const myStations = data.stations.filter(s => s.unit && s.unit.trim() === myUnit);
        const targetList = myStations.length > 0 ? myStations : data.stations;
        targetList.forEach(s => locSel.add(new Option("สฟฟ." + s.name, s.name)));
    }

    // ตั้งค่ารายชื่อพนักงาน
    const attList = document.getElementById('attendance-list');
    if (attList) {
        let filteredStaff = staffData.filter(s => s.unit === currentUserUnit || s.unit === "ผจฟ.1");
        filteredStaff.sort((a, b) => (a.unit === currentUserUnit ? -1 : 1));
        attList.innerHTML = filteredStaff.map(s => 
            `<label style="display:block; margin-bottom:8px; font-size:14px;">
                <input type="checkbox" name="attendance" value="${s.uid}"> ${s.name} 
                <span style="font-size:10px; color:${s.unit === 'ผจฟ.1' ? '#f39c12' : '#06C755'}; font-weight:bold;">(${s.unit})</span>
            </label>`
        ).join('');
    }

    // ล้างค่าและเริ่มต้น Tab ต่างๆ
    Object.keys(taskMap).forEach(key => {
        const container = document.getElementById(taskMap[key].container);
        if (container) container.innerHTML = '';
        if (key !== 'power') validateTaskInput(key); // Tab อื่นๆ เริ่มแบบว่าง
    });

    // เริ่มต้น Tab 3 แบบพิเศษ (ดึงสถานีในสังกัดมาล็อกไว้)
    setupPowerTab(data);
}

// --- ฟังก์ชันจัดการ Running Number ---
function updateTaskNumbers(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const rows = container.getElementsByClassName('task-row');
    Array.from(rows).forEach((row, index) => {
        const numDiv = row.querySelector('.task-number');
        if (numDiv) numDiv.innerText = (index + 1) + ".";
    });
}

// --- ฟังก์ชันจัดการแถวงาน (Tab 2, 4, 5, 6) ---
function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    if (!container) return;

    const rowCount = container.getElementsByClassName('task-row').length + 1;
    const div = document.createElement('div');
    div.className = "task-row";
    div.style.cssText = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";
    
    div.innerHTML = `
        <div class="task-number">${rowCount}.</div>
        <input type="hidden" name="task_type[]" value="${config.label}">
        <input type="text" name="task_detail[]" placeholder="ระบุรายละเอียด..." 
               oninput="validateTaskInput('${type}')" required>
        <button type="button" class="btn-remove-task" 
                onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
    validateTaskInput(type);
}

// --- ฟังก์ชันพิเศษสำหรับ Tab 3 (สภาพการจ่ายไฟ) ---
// 1. แถวสถานีหลัก (Fixed)
function setupPowerTab(data) {
    const container = document.getElementById('power-container');
    if (!container) return;
    container.innerHTML = '';

    const myUnit = currentUserUnit ? currentUserUnit.trim() : "";
    const myStations = data.stations.filter(s => s.unit && s.unit.trim() === myUnit);

    myStations.forEach((s, index) => {
        const div = document.createElement('div');
        div.className = "task-row"; // ใช้ Class เดียวกันเพื่อระยะห่างที่เท่ากัน
        div.style.cssText = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";
        
        div.innerHTML = `
            <div class="task-number" style="flex: 0 0 25px;">${index + 1}.</div>
            <div class="power-station-name" style="flex: 0 0 110px; font-size: 13px; color: #333;">สฟฟ.${s.name}</div>
            <input type="hidden" name="power_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="power_detail[]" value="สภาพการจ่ายไฟปกติ" 
                   oninput="validateTaskInput('power')"
                   style="flex: 1; height: 32px; font-size: 13px; border: 1px solid #ddd; border-radius: 4px; padding: 0 8px;">
            <div style="flex: 0 0 25px;"></div> 
        `;
        container.appendChild(div);
    });
    validateTaskInput('power');
}

// 2. แถวที่เพิ่มเอง (Dynamic)
function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    if (!container || !rawAppData) return;

    const rowCount = container.getElementsByClassName('task-row').length + 1;
    const div = document.createElement('div');
    div.className = "task-row"; 
    div.style.cssText = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";

    let stationOptions = rawAppData.stations.map(s => `<option value="สฟฟ.${s.name}">สฟฟ.${s.name}</option>`).join('');

    div.innerHTML = `
        <div class="task-number" style="flex: 0 0 25px;">${rowCount}.</div>
        <select name="power_station[]" onchange="validateTaskInput('power')" 
                style="flex: 0 0 110px; height: 32px; font-size: 11px; border: 1px solid #ddd; border-radius: 4px; padding: 0 4px;">
            <option value="">-- เลือก --</option>
            ${stationOptions}
        </select>
        <input type="text" name="power_detail[]" placeholder="ระบุรายละเอียด..." 
               oninput="validateTaskInput('power')" required
               style="flex: 1; height: 32px; font-size: 13px; border: 1px solid #ddd; border-radius: 4px; padding: 0 8px;">
        <button type="button" class="btn-remove-task" 
                style="background:none; border:none; color:#ff4d4d; cursor:pointer; flex: 0 0 25px; padding:0;"
                onclick="this.parentElement.remove(); updateTaskNumbers('power-container'); validateTaskInput('power');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
    validateTaskInput('power');
}

// 3. ปรับ Logic การตรวจสอบ (Validation)
function validateTaskInput(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const btn = document.getElementById(config.btn);
    if (!btn || !container) return;

    const rows = container.getElementsByClassName('task-row');
    
    // ถ้าไม่มีแถวเลย ให้กดได้ (แต่ปกติ Tab 3 จะมีแถว Fixed เสมอ)
    if (rows.length === 0) { 
        setBtnState(btn, true); 
        return; 
    }

    // ดึงแถวสุดท้ายออกมาตรวจสอบ
    const lastRow = rows[rows.length - 1];
    const lastInput = lastRow.querySelector('input[type="text"]');
    const lastSelect = lastRow.querySelector('select');

    let isValid = true;

    // 1. เช็คช่องรายละเอียด (ต้องไม่ว่าง)
    if (lastInput && lastInput.value.trim() === "") {
        isValid = false;
    }

    // 2. เช็ค Dropdown (ถ้ามี ต้องเลือกสถานี)
    if (lastSelect && lastSelect.value === "") {
        isValid = false;
    }

    setBtnState(btn, isValid);
}

function setBtnState(btn, isEnabled) {
    btn.disabled = !isEnabled;
    btn.style.opacity = isEnabled ? "1" : "0.5";
    btn.style.cursor = isEnabled ? "pointer" : "not-allowed";
}

// --- จัดการรูปภาพ ---
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

// --- บันทึกฟอร์ม ---
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!confirm("ยืนยันการบันทึกรายงานข้อมูลทั้งหมด?")) return;

    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerText = "⌛ กำลังบันทึกข้อมูล...";
    
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.task_detail = Array.from(formData.getAll('task_detail[]'));
    payload.task_type = Array.from(formData.getAll('task_type[]'));
    
    // เก็บข้อมูลจาก Tab 3 แยกออกมา
    payload.power_station = Array.from(formData.getAll('power_station[]'));
    payload.power_detail = Array.from(formData.getAll('power_detail[]'));
    
    payload.images = selectedImages;

    try {
        const response = await fetch(GAS_WEBAPP_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload) 
        });
        const result = await response.text();
        alert(result);
        location.reload();
    } catch (err) {
        alert("❌ บันทึกไม่สำเร็จ: " + err.message);
        btn.disabled = false;
        btn.innerText = "✅ บันทึกรายงานทั้งหมด";
    }
};