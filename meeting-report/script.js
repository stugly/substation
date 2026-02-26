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
    procure: { container: 'procure-container', btn: 'btn-add-procure', label: 'จัดซื้อจัดจ้าง' }
};

// บรรทัดนี้คือจุดเริ่มงาน
window.onload = function() { 
    // initLiff(); // <-- ปิดตัวนี้ไว้ก่อนตอนทดสอบ
    mockDataForTesting(); 
};

// --- ฟังก์ชันจัดการปี พ.ศ. อัตโนมัติในตาราง ---
function setCurrentYear() {
    const currentYearTH = new Date().getFullYear() + 543;
    const yearElements = document.querySelectorAll('.current-year');
    yearElements.forEach(el => {
        el.innerText = currentYearTH;
    });
}

// สร้างฟังก์ชันหลอกข้อมูลขึ้นมา (โหมดทดสอบ)
function mockDataForTesting() {
    console.log("Running in Mock Mode (No LINE)");
    currentUserUnit = "ผจฟ.1"; 
    rawAppData = {
        stations: [
            {name: "นครศรีธรรมราช 1", unit: "ผจฟ.1"}, 
            {name: "ปากพนัง", unit: "ผจฟ.1"},
            {name: "นครศรีธรรมราช 3 ชั่วคราว", unit: "ผจฟ.1"}
        ],
        settings_eq: ["TR", "CB", "DS"],
        settings_status_eq: ["ปกติ", "ชำรุด", "รอซ่อม"],
        staff: [
            {name: "นายทดสอบ 1", uid: "U001", unit: "ผจฟ.1", line: "123"},
            {name: "นายทดสอบ 2", uid: "U002", unit: "ผจฟ.1", line: "456"}
        ]
    };
    staffData = rawAppData.staff;

    document.getElementById('spinner').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('welcome').innerText = "สวัสดี, โหมดทดสอบ (" + currentUserUnit + ")";
    
    setupMetadata(rawAppData);
    setCurrentYear(); // รันปี พ.ศ. ทันที
}

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
            setCurrentYear();
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
    setupPowerTab(data);
}

// --- การจัดการแถวงาน (แบบเพิ่มเอง) ---
function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${rowCount}.</div>
        <input type="hidden" name="${type}_type[]" value="${config.label}">
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('${type}')" required style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
    validateTaskInput(type);
}

// --- ข้อ 3: สภาพจ่ายไฟ ---
function setupPowerTab(data) {
    const container = document.getElementById('power-container');
    if (!container || !rawAppData) return;
    container.innerHTML = '';
    const myStations = rawAppData.stations.filter(s => s.unit === currentUserUnit);
    myStations.forEach((s, index) => {
        const div = document.createElement('div');
        div.className = "task-row"; 
        div.innerHTML = `
            <div class="task-number">${index + 1}.</div>
            <div class="power-station-name">สฟฟ.${s.name}</div>
            <input type="hidden" name="power_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="power_detail[]" value="สภาพการจ่ายไฟปกติ" oninput="validateTaskInput('power')" style="flex: 1;">
        `;
        container.appendChild(div);
    });
    validateTaskInput('power');
}

function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    const myStations = rawAppData.stations.filter(s => s.unit === currentUserUnit);
    let stationOptions = myStations.map(s => `<option value="สฟฟ.${s.name}">สฟฟ.${s.name}</option>`).join('');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row"; 
    div.innerHTML = `
        <div class="task-number">${rowCount}.</div>
        <select name="power_station[]" onchange="validateTaskInput('power')" style="flex: 0 0 260px;">
            <option value="">-- เลือก --</option>
            ${stationOptions}
        </select>
        <input type="text" name="power_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('power')" required style="flex: 1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('power-container'); validateTaskInput('power');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
}

// --- ข้อ 4: อุปกรณ์ชำรุด ---
function addRepairRow() {
    const container = document.getElementById('repair-container');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper"; 
    let eqOptions = `<option value="">-- เลือก --</option>` + rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    let statusOptions = `<option value="">-- เลือก --</option>` + rawAppData.settings_status_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    
    div.innerHTML = `
        <div class="task-number" style="padding-top: 25px;">${rowCount}.</div>
        <div class="compact-grid">
            <div><span>รหัส EQ</span><input type="text" name="repair_id[]" placeholder="รหัส"></div>
            <div><span>วันที่ชำรุด</span><input type="date" name="repair_date[]"></div>
            <div><span>อุปกรณ์</span><select name="repair_item[]">${eqOptions}</select></div>
            <div><span>สถานะ</span><select name="repair_status[]">${statusOptions}</select></div>
            <input type="text" name="repair_detail[]" placeholder="รายละเอียด..." style="flex: 0 0 100%;">
        </div>
        <button type="button" class="btn-remove-task" style="margin-top: 25px;" onclick="this.parentElement.remove(); updateTaskNumbers('repair-container');"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
}

// --- ข้อ 5: จัดซื้อจัดจ้าง ---
function addProcureRow() {
    const container = document.getElementById('procure-container');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row procure-row-wrapper"; 
    let typeOptions = ["งานจ้าง", "จัดซื้อวัสดุ", "ครุภัณฑ์"].map(v => `<option value="${v}">${v}</option>`).join('');
    let statusOptions = ["รอดำเนินการ", "กำลังดำเนินการ", "ตรวจรับแล้ว"].map(v => `<option value="${v}">${v}</option>`).join('');
    
    div.innerHTML = `
        <div class="task-number" style="padding-top: 25px;">${rowCount}.</div>
        <div class="compact-grid">
            <div><span>รหัส PO</span><input type="text" name="po_id[]" placeholder="เลขที่"></div>
            <div><span>วันที่จัดซื้อ/จ้าง</span><input type="date" name="po_date[]"></div>
            <div><span>ประเภท</span><select name="po_type[]"><option value="">-- เลือก --</option>${typeOptions}</select></div>
            <div><span>สถานะ</span><select name="po_status[]"><option value="">-- เลือก --</option>${statusOptions}</select></div>
            <input type="text" name="procure_detail[]" placeholder="รายละเอียด..." style="flex: 0 0 100%;">
        </div>
        <button type="button" class="btn-remove-task" style="margin-top: 25px;" onclick="this.parentElement.remove(); updateTaskNumbers('procure-container');"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
}

// --- ฟังก์ชันเสริมอื่นๆ ---
function validateTaskInput(type) {
    const config = taskMap[type];
    if(!config || !config.btn) return;
    const btn = document.getElementById(config.btn);
    const container = document.getElementById(config.container);
    if (!btn || !container) return;
    const rows = container.getElementsByClassName('task-row');
    if (rows.length === 0) { btn.disabled = false; btn.style.opacity = "1"; return; }
    const lastRow = rows[rows.length - 1];
    const inputs = lastRow.querySelectorAll('input:not([type="hidden"]), select');
    let isComplete = true;
    inputs.forEach(el => { if (el.value.trim().length === 0) isComplete = false; });
    btn.disabled = !isComplete;
    btn.style.opacity = isComplete ? "1" : "0.5";
}

function updateTaskNumbers(containerId) {
    const container = document.getElementById(containerId);
    const rows = container.getElementsByClassName('task-number');
    Array.from(rows).forEach((num, i) => { num.innerText = (i + 1) + "."; });
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

// เพิ่มข้อมูลใน taskMap
const extraTaskMap = {
    km: { container: 'km-container', label: 'KM' },
    idea: { container: 'idea-container', label: 'ความคิดสร้างสรรค์' },
    other: { container: 'other-container', label: 'อื่นๆ' }
};

// ฟังก์ชันข้อ 8: บุคคลภายนอก
function addExternalRow() {
    const container = document.getElementById('external-container');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row"; // ใช้ task-row ปกติเพื่อให้เหมือนข้อ 3
    div.style.cssText = "display: flex; align-items: center; gap: 8px; margin-bottom: 8px;";
    
    div.innerHTML = `
        <div class="task-number" style="flex: 0 0 25px;">${rowCount}.</div>
        
        <input type="date" name="ext_date[]" style="flex: 0 0 130px;">
        
        <div style="flex: 0 0 55px; display: flex; flex-direction: column; align-items: center; gap: 2px;">
            <span style="font-size: 10px; color: #06C755; font-weight: 600;">WP</span>
            <input type="checkbox" name="ext_wp_check[]" onchange="toggleWP(this)" style="width: 18px; height: 18px !important;">
        </div>
        
        <input type="text" name="ext_wp_no[]" placeholder="เลขที่ WP" disabled style="flex: 0 0 100px;">
        
        <input type="text" name="ext_company[]" placeholder="หน่วยงาน/บริษัท" style="flex: 0 0 150px;">
        
        <input type="text" name="ext_detail[]" placeholder="รายละเอียดดำเนินงาน..." style="flex: 1; min-width: 150px;">
        
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('external-container');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
}

// ฟังก์ชันเปิด/ปิดช่องเลขที่ WP (เหมือนเดิม)
function toggleWP(chk) {
    const row = chk.parentElement.parentElement;
    const wpInput = row.querySelector('input[name="ext_wp_no[]"]');
    wpInput.disabled = !chk.checked;
    if(!chk.checked) wpInput.value = "";
    wpInput.required = chk.checked;
}

// ระบบล็อกช่อง WP (ถ้าติ๊กถูก ถึงจะพิมพ์ได้)
function toggleWP(chk) {
    const row = chk.closest('.compact-grid');
    const wpInput = row.querySelector('input[name="ext_wp_no[]"]');
    wpInput.disabled = !chk.checked;
    if(!chk.checked) wpInput.value = "";
    wpInput.required = chk.checked;
}

// ฟังก์ชันข้อ 9: ทรัพย์สิน
function addAssetRow() {
    const container = document.getElementById('asset-container');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    div.innerHTML = `
        <div class="task-number" style="padding-top: 25px;">${rowCount}.</div>
        <div class="compact-grid">
            <div style="flex: 0 0 25%;"><span>วันที่ดำเนินการ</span><input type="date" name="asset_date[]"></div>
            <div style="flex: 0 0 40%;"><span>รายละเอียดจำหน่ายทรัพย์สิน</span><input type="text" name="asset_item[]" placeholder="รายการ..."></div>
            <div style="flex: 0 0 30%;"><span>ขั้นตอน</span><input type="text" name="asset_step[]" placeholder="อยู่ระหว่าง..."></div>
        </div>
        <button type="button" class="btn-remove-task" style="margin-top: 25px;" onclick="this.parentElement.remove(); updateTaskNumbers('asset-container');"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
}

// ฟังก์ชันดึงพนักงาน (ข้อ 12) และ สถานี (ข้อ 13)
function setupFixedSections() {
    // 12. สรุปการลา
    const leaveBody = document.getElementById('leave-table-body');
    const myStaff = staffData.filter(s => s.unit === currentUserUnit);
    leaveBody.innerHTML = myStaff.map(s => `
        <tr>
            <td style="text-align: left;">${s.name}<input type="hidden" name="leave_staff_name[]" value="${s.name}"></td>
            <td><input type="number" name="leave_sick[]" value="0" min="0"></td>
            <td><input type="number" name="leave_personal[]" value="0" min="0"></td>
            <td><input type="number" name="leave_vacation[]" value="0" min="0"></td>
            <td><input type="text" name="leave_replace[]" placeholder="..."></td>
            <td><input type="text" name="leave_note[]" placeholder="..."></td>
        </tr>
    `).join('');

    // 13. ตรวจสอบ รปภ.
    const secContainer = document.getElementById('security-container');
    const myStations = rawAppData.stations.filter(s => s.unit === currentUserUnit);
    secContainer.innerHTML = myStations.map((s, i) => `
        <div class="task-row">
            <div class="task-number">${i + 1}.</div>
            <div class="power-station-name">สฟฟ.${s.name}</div>
            <input type="hidden" name="sec_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="sec_detail[]" placeholder="ผลการตรวจสอบ..." style="flex: 1;">
        </div>
    `).join('');
}

// --- บันทึกข้อมูล ---
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!confirm("ยืนยันการบันทึกรายงานข้อมูลทั้งหมด?")) return;
    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.innerText = "⌛ กำลังบันทึกข้อมูล...";
    
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    // ดึงข้อมูล Array ทั้งหมด
    const arrayFields = ['assignment', 'plan', 'power_station', 'power_detail', 'repair_id', 'repair_date', 'repair_item', 'repair_status', 'repair_detail', 'po_id', 'po_date', 'po_type', 'po_status', 'procure_detail', 'clean_date', 'clean_detail', 'weed_date', 'weed_detail'];
    arrayFields.forEach(field => {
        payload[field] = Array.from(formData.getAll(field + '[]'));
    });

    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.images = selectedImages;

    try {
        const response = await fetch(GAS_WEBAPP_URL, { method: 'POST', body: JSON.stringify(payload) });
        alert("บันทึกข้อมูลเรียบร้อยแล้ว!");
        location.reload();
    } catch (err) {
        alert("บันทึกไม่สำเร็จ: " + err.message);
        btn.disabled = false;
        btn.innerText = "✅ บันทึกรายงานทั้งหมด";
    }
};