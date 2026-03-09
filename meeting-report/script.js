const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybyNXLKsm04GXsJU0QuKZKOjOoh3XujDbA25FrLYgFE3excmvHn1B-zCdn-rEF1cwf/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";
let selectedImages = [];

// --- ส่วนที่ 1: การโหลด App และ Login ---
window.onload = function() {
    console.log("เริ่มระบบ LIFF...");
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

// --- แก้ไข: ใช้ JSONP เพื่อเลี่ยง Failed to fetch (Load) ---
function checkUserAndLoadData(lineId) {
    const spinner = document.getElementById('spinner');
    if(spinner) spinner.style.display = 'flex';

    // สร้าง callback มารับข้อมูล
    window.handleUserData = function(data) {
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
        } else {
            alert("ไม่พบชื่อคุณในระบบ");
            liff.closeWindow();
        }
        const oldScript = document.getElementById('jsonp-load');
        if(oldScript) oldScript.remove();
    };

    const script = document.createElement('script');
    script.id = 'jsonp-load';
    script.src = `${GAS_WEBAPP_URL}?action=getUser&lineId=${lineId}&callback=handleUserData`;
    document.body.appendChild(script);
}

// --- แก้ไข: ใช้ Hidden Form เพื่อเลี่ยง Failed to fetch (Save) ---
document.getElementById('reportForm').onsubmit = function(e) {
    e.preventDefault(); 
    if (!confirm("ยืนยันการบันทึกรายงานข้อมูลทั้งหมด?")) return;

    const btn = document.getElementById('btn-submit');
    btn.disabled = true; 
    btn.innerText = "⌛ กำลังบันทึกข้อมูล...";

    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    const arrayFields = [
        'assignment_detail', 'plan_detail', 'power_station', 'power_detail',
        'repair_id', 'repair_date', 'repair_item', 'repair_status', 'repair_detail', 
        'procure_id', 'procure_date', 'procure_item', 'procure_status', 'procure_detail',
        'clean_date', 'clean_detail', 'weed_date', 'weed_detail',
        'ext_date', 'ext_wp_no', 'ext_company', 'ext_detail', 
        'asset_date', 'asset_item', 'asset_step', 
        'km_detail', 'idea_detail', 'other_detail', 
        'leave_staff_name', 'leave_sick', 'leave_personal', 'leave_vacation', 'leave_replace', 'leave_note', 
        'sec_station', 'sec_detail'
    ];

    arrayFields.forEach(f => {
        const fieldName = (f.includes('leave_') || f.includes('sec_')) ? f : f + '[]';
        payload[f] = formData.getAll(fieldName);
    });
    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.images = selectedImages;

    // สร้างฟอร์มส่งข้อมูลแบบมาตรฐาน (CORS จะไม่บล็อกวิธีนี้)
    const hiddenForm = document.createElement('form');
    hiddenForm.method = 'POST';
    hiddenForm.action = GAS_WEBAPP_URL;
    hiddenForm.style.display = 'none';

    const input = document.createElement('input');
    input.name = 'jsonData'; 
    input.value = JSON.stringify(payload);
    hiddenForm.appendChild(input);

    document.body.appendChild(hiddenForm);
    hiddenForm.submit(); 
};

// --- ฟังก์ชันอื่นๆ ของพี่ (คงเดิมเป๊ะ ไม่แตะต้องเรื่องสี/Layout) ---
function mockDataForTesting() {
    currentUserUnit = "ผจฟ.1"; 
    rawAppData = {
        stations: [{name: "นครศรีธรรมราช 1", unit: "ผจฟ.1"}, {name: "ปากพนัง", unit: "ผจฟ.1"}],
        settings_eq: ["TR", "CB", "DS"],
        settings_status_eq: ["ปกติ", "ชำรุด"],
        settings_procure_type: ["งานจ้าง", "จัดซื้อวัสดุ"], 
        settings_procure_status: ["รอดำเนินการ", "ตรวจรับแล้ว"],
        settings_asset_step: ["ขั้นตอน 1", "ขั้นตอน 2", "รอจำหน่าย"],
        staff: [{name: "นายทดสอบ 1", uid: "U001", unit: "ผจฟ.1"}]
    };
    staffData = rawAppData.staff;
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('welcome').innerText = "สวัสดี, โหมดทดสอบ (" + currentUserUnit + ")";
    setupMetadata(rawAppData);
    setupLeaveTable(); 
    setupSecuritySection();
    setCurrentYear();
}

const taskMap = {
    assignment: { container: 'assignment-container', btn: 'btn-add-assignment', label: 'มอบหมาย' },
    plan: { container: 'plan-container', btn: 'btn-add-plan', label: 'แผนงาน' },
    power: { container: 'power-container', btn: 'btn-add-power', label: 'สภาพจ่ายไฟ' },
    repair: { container: 'repair-container', btn: 'btn-add-repair', label: 'อุปกรณ์ชำรุด' },
    procure: { container: 'procure-container', btn: 'btn-add-procure', label: 'จัดซื้อจัดจ้าง' },
    external: { container: 'external-container', btn: 'btn-add-external', label: 'บุคคลภายนอก' },
    asset: { container: 'asset-container', btn: 'btn-add-asset', label: 'ทรัพย์สิน' },
    km: { container: 'km-container', btn: 'btn-add-km', label: 'KM' },
    idea: { container: 'idea-container', btn: 'btn-add-idea', label: 'ความคิดสร้างสรรค์' },
    other: { container: 'other-container', btn: 'btn-add-other', label: 'อื่นๆ' }
};

function setCurrentYear() {
    const now = new Date();
    const currentYearTH = now.getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => { el.innerText = currentYearTH; });
    document.querySelectorAll('input[name^="clean_date"], input[name^="weed_date"]').forEach(el => {
        el.value = ""; 
        el.removeAttribute('value'); 
    });
}

function setupMetadata(data) {
    const now = new Date();
    const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const fullDateText = `${thMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
    const meetingDateEl = document.getElementById('meeting_date');
    const todayStr = now.toISOString().split('T')[0];

    meetingDateEl.value = todayStr;
    meetingDateEl.style.color = "#333333";
    
    const titleEl = document.getElementById('report-title');
    if (titleEl) titleEl.innerText = `รายงานการประชุมประจำเดือน ${fullDateText}`;

    document.getElementById('unit').value = currentUserUnit;
    document.getElementById('month').value = fullDateText;
    document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    
    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        data.stations.filter(s => s.unit === currentUserUnit).forEach(s => locSel.add(new Option("สฟฟ." + s.name, s.name)));
    }

    const attList = document.getElementById('attendance-list');
    const currentLoginUid = (data && data.user) ? String(data.user.uid) : null;

    if (attList && staffData) {
        const unitStaff = staffData.filter(s => s.unit === currentUserUnit);
        const pj1Staff = staffData.filter(s => s.unit === "ผจฟ.1" && s.unit !== currentUserUnit);

        attList.innerHTML = `
            <div class="attendance-column">
                <div class="column-header-mini">สังกัด ${currentUserUnit}</div>
                ${unitStaff.map(s => `<label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}" ${String(s.uid) === currentLoginUid ? 'checked' : ''}> <span>${s.name}</span></label>`).join('')}
            </div>
            <div class="attendance-column">
                <div class="column-header-mini">เจ้าหน้าที่ ผจฟ.1</div>
                ${pj1Staff.map(s => `<label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}" ${String(s.uid) === currentLoginUid ? 'checked' : ''}> <span>${s.name}</span></label>`).join('')}
            </div>`;
    }
    if (typeof setupPowerTab === "function") setupPowerTab(data);
}

function setupLeaveTable() {
    const leaveBody = document.getElementById('leave-table-body');
    if (!leaveBody || !staffData) return;
    leaveBody.innerHTML = staffData.filter(s => s.unit === currentUserUnit).map(s => `
        <tr>
            <td style="text-align: left; padding-left: 10px; color: #000; font-weight: 500;">${s.name}<input type="hidden" name="leave_staff_name[]" value="${s.name}"></td>
            <td><input type="number" name="leave_sick[]" value="0" min="0" step="0.5"></td>
            <td><input type="number" name="leave_personal[]" value="0" min="0" step="0.5"></td>
            <td><input type="number" name="leave_vacation[]" value="0" min="0" step="0.5"></td>
            <td><input type="number" name="leave_replace[]" value="0" min="0" step="0.5"></td>
            <td><input type="text" name="leave_note[]" placeholder="..."></td>
        </tr>`).join('');
}

function setupSecuritySection() {
    const secContainer = document.getElementById('security-container');
    if (!secContainer || !rawAppData.stations) return;
    secContainer.innerHTML = rawAppData.stations.filter(s => s.unit === currentUserUnit).map((s, i) => `
        <div class="task-row">
            <div class="task-number">${i + 1}.</div>
            <div class="power-station-name">สฟฟ.${s.name}</div>
            <input type="hidden" name="sec_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="sec_detail[]" placeholder="ผลการตรวจสอบ รปภ. ..." style="flex: 1;">
        </div>`).join('');
}

function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><input type="hidden" name="${type}_type[]" value="${config.label}"><input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('${type}')" style="flex:1;"><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput(type);
}

function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    let eqOpt = `<option value="">-- อุปกรณ์ --</option>` + rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    let stOpt = `<option value="">-- สถานะ --</option>` + rawAppData.settings_status_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><div style="display: flex; gap: 5px; width: 100%;"><input type="text" name="repair_id[]" placeholder="รหัส EQ" style="width: 80px;"><input type="date" name="repair_date[]"><select name="repair_item[]">${eqOpt}</select><select name="repair_status[]">${stOpt}</select><input type="text" name="repair_detail[]" placeholder="รายละเอียด..." style="flex: 1;"></div><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('repair-container');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row procure-row-wrapper";
    let typeOpt = `<option value="">-- ประเภท --</option>` + rawAppData.settings_procure_type.map(v => `<option value="${v}">${v}</option>`).join('');
    let statusOpt = `<option value="">-- สถานะ --</option>` + rawAppData.settings_procure_status.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><div style="display: flex; gap: 5px; width: 100%;"><input type="text" name="procure_id[]" placeholder="รหัส PO" style="width: 80px;"><input type="date" name="procure_date[]"><select name="procure_item[]">${typeOpt}</select><select name="procure_status[]">${statusOpt}</select><input type="text" name="procure_detail[]" placeholder="รายละเอียด..." style="flex: 1;"></div><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('procure-container');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

function addAssetRow() {
    const container = document.getElementById('asset-container');
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    let stepOpt = `<option value="">-- ขั้นตอน --</option>` + rawAppData.settings_asset_step.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><div style="display: flex; gap: 8px; width: 100%;"><input type="date" name="asset_date[]" style="width: 130px;"><input type="text" name="asset_item[]" placeholder="รายละเอียดจำหน่ายทรัพย์สิน" style="flex: 1;"><select name="asset_step[]" style="width: 150px;">${stepOpt}</select></div><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('asset-container');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

function addExternalRow() {
    const container = document.getElementById('external-container');
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><div style="display: flex; gap: 8px; width: 100%;"><input type="date" name="ext_date[]" style="width: 130px;"><input type="checkbox" onchange="toggleWP(this)"> <input type="text" name="ext_wp_no[]" placeholder="เลขที่ WP" disabled style="width: 110px;"><input type="text" name="ext_company[]" placeholder="บริษัท" style="width: 150px;"><input type="text" name="ext_detail[]" placeholder="รายละเอียด" style="flex: 1;"></div><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('external-container');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

function toggleWP(chk) {
    const wpInput = chk.parentElement.querySelector('input[name="ext_wp_no[]"]');
    wpInput.disabled = !chk.checked;
    if(!chk.checked) wpInput.value = "";
}

function validateTaskInput(type) {
    const config = taskMap[type];
    if (!config || !config.btn) return;
    const btn = document.getElementById(config.btn);
    const container = document.getElementById(config.container);
    if (!btn || !container) return;
    const rows = container.getElementsByClassName('task-row');
    if (rows.length === 0) { btn.disabled = false; return; }
    const lastRow = rows[rows.length - 1];
    let isComplete = true;
    const allInputs = lastRow.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]), select');
    allInputs.forEach(el => { if (el.value.trim().length === 0 && !el.disabled) isComplete = false; });
    btn.disabled = !isComplete;
    btn.style.opacity = isComplete ? "1" : "0.5";
}

function setupPowerTab(data) {
    const container = document.getElementById('power-container');
    if (!container) return;
    container.innerHTML = data.stations.filter(s => s.unit === currentUserUnit).map((s, i) => `
        <div class="task-row">
            <div class="task-number">${i + 1}.</div>
            <div class="power-station-name">สฟฟ.${s.name}</div>
            <input type="hidden" name="power_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="power_detail[]" value="สภาพการจ่ายไฟปกติ" style="flex: 1;">
        </div>`).join('');
}

function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    let opt = rawAppData.stations.filter(s => s.unit === currentUserUnit).map(s => `<option value="สฟฟ.${s.name}">สฟฟ.${s.name}</option>`).join('');
    const div = document.createElement('div');
    div.className = "task-row"; 
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><select name="power_station[]" style="flex: 0 0 260px;"><option value="">-- เลือกสถานี --</option>${opt}</select><input type="text" name="power_detail[]" placeholder="ระบุรายละเอียด..." style="flex: 1;"><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('power-container');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

function updateTaskNumbers(id) {
    document.getElementById(id).querySelectorAll('.task-number').forEach((num, i) => { num.innerText = (i + 1) + "."; });
}

function handleImageSelect(input) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = ''; selectedImages = [];
    Array.from(input.files).slice(0, 5).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImages.push({ name: file.name, data: e.target.result });
            const img = document.createElement('img'); img.src = e.target.result; preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

function addSimpleTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><input type="hidden" name="${type}_type[]" value="${config.label}"><input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('${type}')" style="flex:1;"><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput(type);
}