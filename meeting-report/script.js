const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";
let selectedImages = [];

// --- ส่วนที่ 1: การโหลด App และ Login (ปรับปรุงใหม่) ---
window.onload = function() {
    // ตรวจสอบว่าเป็นสภาพแวดล้อม Local หรือไม่ (ถ้าไม่ใช่ให้รัน LIFF)
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        console.log("Running on Local: Using Mock Data");
        mockDataForTesting(); 
    } else {
        initializeLiff();
    }
};

async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            const profile = await liff.getProfile();
            // เรียกข้อมูลจริงจาก GAS โดยส่ง LINE ID ไปเช็คสิทธิ์
            checkUserAndLoadData(profile.userId);
        }
    } catch (err) {
        console.error("LIFF Error:", err);
        mockDataForTesting(); 
    }
}

function checkUserAndLoadData(lineId) {
    document.getElementById('spinner').style.display = 'flex';

    google.script.run
        .withSuccessHandler(data => {
            if (data && data.user) {
                // ✅ ได้ข้อมูลจริงที่กรองมาจาก Server แล้ว
                rawAppData = data; 
                staffData = data.staff; // มีคนใน Unit + ผจฟ.1
                currentUserUnit = data.user.unit;

                // อัปเดต UI
                document.getElementById('spinner').style.display = 'none';
                document.getElementById('main-app').style.display = 'block';
                document.getElementById('welcome').innerText = `สวัสดี, ${data.user.name} (${currentUserUnit})`;

                // รัน Setup กระจายข้อมูลลง Form
                setupMetadata(rawAppData);
                setupLeaveTable(); 
                setupSecuritySection();
                setCurrentYear();
            } else {
                alert("ขออภัย ไม่พบชื่อคุณในระบบผู้ใช้งาน (Unit ของคุณอาจไม่ถูกต้อง)");
                liff.closeWindow();
            }
        })
        .withFailureHandler(err => {
            alert("Error connecting to server: " + err);
            document.getElementById('spinner').style.display = 'none';
        })
        .getUserByLineId(lineId); // เรียกฟังก์ชันที่เราแก้ใน code.gs
}

// 1. taskMap ระบุ ID ปุ่มให้ครบเพื่อให้ระบบ Validation ทำงาน
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

window.onload = function() { 
    mockDataForTesting(); 
};

function setCurrentYear() {
    const currentYearTH = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => { el.innerText = currentYearTH; });
}

function mockDataForTesting() {
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
            {name: "นายทดสอบ 1", uid: "U001", unit: "ผจฟ.1"},
            {name: "นายทดสอบ 2", uid: "U002", unit: "ผจฟ.1"}
        ]
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
        data.stations.filter(s => s.unit === currentUserUnit).forEach(s => locSel.add(new Option("สฟฟ." + s.name, s.name)));
    }

    const attList = document.getElementById('attendance-list');
    if (attList) {
        attList.innerHTML = staffData.filter(s => s.unit === currentUserUnit || s.unit === "ผจฟ.1").map(s => 
            `<label style="display:block; margin-bottom:8px;"><input type="checkbox" name="attendance" value="${s.uid}"> ${s.name} </label>`
        ).join('');
    }
    setupPowerTab(data);
}

// ข้อ 12: ดึงรายชื่อ
function setupLeaveTable() {
    const leaveBody = document.getElementById('leave-table-body');
    if (!leaveBody || !staffData) return;
    leaveBody.innerHTML = staffData.filter(s => s.unit === currentUserUnit).map(s => `
        <tr>
            <td style="text-align: left; padding-left: 10px;">${s.name}<input type="hidden" name="leave_staff_name[]" value="${s.name}"></td>
            <td><input type="number" name="leave_sick[]" value="0" min="0"></td>
            <td><input type="number" name="leave_personal[]" value="0" min="0"></td>
            <td><input type="number" name="leave_vacation[]" value="0" min="0"></td>
            <td><input type="text" name="leave_replace[]" placeholder="..."></td>
            <td><input type="text" name="leave_note[]" placeholder="..."></td>
        </tr>
    `).join('');
}

// ข้อ 13: ดึงสถานี
function setupSecuritySection() {
    const secContainer = document.getElementById('security-container');
    if (!secContainer || !rawAppData.stations) return;
    secContainer.innerHTML = rawAppData.stations.filter(s => s.unit === currentUserUnit).map((s, i) => `
        <div class="task-row">
            <div class="task-number">${i + 1}.</div>
            <div class="power-station-name">สฟฟ.${s.name}</div>
            <input type="hidden" name="sec_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="sec_detail[]" placeholder="ผลการตรวจสอบ รปภ. ..." style="flex: 1;">
        </div>
    `).join('');
}

// --- ฟังก์ชันเพิ่มแถวงาน (ใส่ validateTaskInput กลับเข้าไปทุกที่) ---
function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="hidden" name="${type}_type[]" value="${config.label}">
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('${type}')" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
    validateTaskInput(type);
}

function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    let eqOpt = `<option value="">-- เลือก --</option>` + rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    let stOpt = `<option value="">-- เลือก --</option>` + rawAppData.settings_status_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `
        <div class="task-number" style="padding-top:25px;">${container.children.length + 1}.</div>
        <div class="compact-grid">
            <div><span>รหัส EQ</span><input type="text" name="repair_id[]" oninput="validateTaskInput('repair')"></div>
            <div><span>วันที่ชำรุด</span><input type="date" name="repair_date[]" onchange="validateTaskInput('repair')"></div>
            <div><span>อุปกรณ์</span><select name="repair_item[]" onchange="validateTaskInput('repair')">${eqOpt}</select></div>
            <div><span>สถานะ</span><select name="repair_status[]" onchange="validateTaskInput('repair')">${stOpt}</select></div>
            <input type="text" name="repair_detail[]" placeholder="รายละเอียด..." oninput="validateTaskInput('repair')" style="flex:0 0 100%;">
        </div>
        <button type="button" class="btn-remove-task" style="margin-top:25px;" onclick="this.parentElement.remove(); updateTaskNumbers('repair-container'); validateTaskInput('repair');"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
    validateTaskInput('repair');
}

function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row procure-row-wrapper";
    div.innerHTML = `
        <div class="task-number" style="padding-top:25px;">${container.children.length + 1}.</div>
        <div class="compact-grid">
            <div><span>รหัส PO</span><input type="text" name="po_id[]" oninput="validateTaskInput('procure')"></div>
            <div><span>วันที่จัดซื้อ</span><input type="date" name="po_date[]" onchange="validateTaskInput('procure')"></div>
            <div><span>ประเภท</span><select name="po_type[]" onchange="validateTaskInput('procure')"><option value="">-- เลือก --</option><option value="งานจ้าง">งานจ้าง</option><option value="จัดซื้อวัสดุ">จัดซื้อวัสดุ</option></select></div>
            <div><span>สถานะ</span><select name="po_status[]" onchange="validateTaskInput('procure')"><option value="">-- เลือก --</option><option value="รอดำเนินการ">รอดำเนินการ</option><option value="ตรวจรับแล้ว">ตรวจรับแล้ว</option></select></div>
            <input type="text" name="procure_detail[]" placeholder="รายละเอียด..." oninput="validateTaskInput('procure')" style="flex:0 0 100%;">
        </div>
        <button type="button" class="btn-remove-task" style="margin-top:25px;" onclick="this.parentElement.remove(); updateTaskNumbers('procure-container'); validateTaskInput('procure');"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
    validateTaskInput('procure');
}

function addAssetRow() {
    const container = document.getElementById('asset-container');
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    div.innerHTML = `
        <div class="task-number" style="padding-top:25px;">${container.children.length + 1}.</div>
        <div class="compact-grid">
            <div style="flex:0 0 25%;"><span>วันที่ดำเนินการ</span><input type="date" name="asset_date[]" onchange="validateTaskInput('asset')"></div>
            <div style="flex:0 0 40%;"><span>รายละเอียดจำหน่ายทรัพย์สิน</span><input type="text" name="asset_item[]" oninput="validateTaskInput('asset')"></div>
            <div style="flex:0 0 30%;"><span>ขั้นตอน</span><input type="text" name="asset_step[]" oninput="validateTaskInput('asset')"></div>
        </div>
        <button type="button" class="btn-remove-task" style="margin-top:25px;" onclick="this.parentElement.remove(); updateTaskNumbers('asset-container'); validateTaskInput('asset');"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
    validateTaskInput('asset');
}

function addExternalRow() {
    const container = document.getElementById('external-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number" style="flex:0 0 25px;">${container.children.length + 1}.</div>
        <input type="date" name="ext_date[]" onchange="validateTaskInput('external')" style="flex:0 0 130px;">
        <div style="flex:0 0 55px; display:flex; flex-direction:column; align-items:center;">
            <span style="font-size:10px; color:#06C755; font-weight:600;">WP</span>
            <input type="checkbox" name="ext_wp_check[]" onchange="toggleWP(this); validateTaskInput('external');" style="width:18px; height:18px !important;">
        </div>
        <input type="text" name="ext_wp_no[]" placeholder="เลขที่ WP" disabled oninput="validateTaskInput('external')" style="flex:0 0 100px;">
        <input type="text" name="ext_company[]" placeholder="หน่วยงาน" oninput="validateTaskInput('external')" style="flex:0 0 150px;">
        <input type="text" name="ext_detail[]" placeholder="รายละเอียด..." oninput="validateTaskInput('external')" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('external-container'); validateTaskInput('external');"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
    validateTaskInput('external');
}

function toggleWP(chk) {
    const row = chk.parentElement.parentElement;
    const wpInput = row.querySelector('input[name="ext_wp_no[]"]');
    wpInput.disabled = !chk.checked;
    if(!chk.checked) wpInput.value = "";
    wpInput.required = chk.checked;
}

// 2. ปรับฟังก์ชันให้เช็คว่าง "ทุกข้อ" และบวกเงื่อนไขพิเศษของข้อ 8 เข้าไป
function validateTaskInput(type) {
    const config = taskMap[type];
    if (!config || !config.btn) return;
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

    if (type === 'external') {
        // --- ดึงค่าจากช่องต่างๆ ของข้อ 8 ---
        const date = lastRow.querySelector('input[name="ext_date[]"]').value;
        const wpCheck = lastRow.querySelector('input[name="ext_wp_check[]"]').checked;
        const wpNo = lastRow.querySelector('input[name="ext_wp_no[]"]').value.trim();
        const company = lastRow.querySelector('input[name="ext_company[]"]').value.trim();
        const detail = lastRow.querySelector('input[name="ext_detail[]"]').value.trim();

        // 1. วันที่, หน่วยงาน, รายละเอียด ห้ามว่าง
        if (!date || !company || !detail) {
            isComplete = false;
        }
        
        // 2. ถ้าติ๊ก WP (wpCheck เป็น true) ช่องเลขที่ WP ห้ามว่าง
        if (wpCheck && wpNo === "") {
            isComplete = false;
        }
    } else {
        // เงื่อนไขข้ออื่นๆ: ทุกช่องห้ามว่าง
        const inputs = lastRow.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]), select');
        inputs.forEach(el => {
            if (el.value.trim().length === 0 && !el.disabled) {
                isComplete = false;
            }
        });
    }

    // สั่งเปิด-ปิดปุ่ม
    btn.disabled = !isComplete;
    btn.style.opacity = isComplete ? "1" : "0.5";
}

// --- ฟังก์ชันเสริม ---
function setupPowerTab(data) {
    const container = document.getElementById('power-container');
    if (!container) return;
    container.innerHTML = data.stations.filter(s => s.unit === currentUserUnit).map((s, i) => `
        <div class="task-row">
            <div class="task-number">${i + 1}.</div>
            <div class="power-station-name">สฟฟ.${s.name}</div>
            <input type="hidden" name="power_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="power_detail[]" value="สภาพการจ่ายไฟปกติ" oninput="validateTaskInput('power')" style="flex: 1;">
        </div>
    `).join('');
    validateTaskInput('power');
}

function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    let opt = rawAppData.stations.filter(s => s.unit === currentUserUnit).map(s => `<option value="สฟฟ.${s.name}">สฟฟ.${s.name}</option>`).join('');
    const div = document.createElement('div');
    div.className = "task-row"; 
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><select name="power_station[]" onchange="validateTaskInput('power')" style="flex: 0 0 260px;"><option value="">-- เลือกสถานี --</option>${opt}</select><input type="text" name="power_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('power')" style="flex: 1;"><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('power-container'); validateTaskInput('power');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('power');
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

document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!confirm("ยืนยันการบันทึกรายงานข้อมูลทั้งหมด?")) return;
    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.innerText = "⌛ กำลังบันทึกข้อมูล...";
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    const arrayFields = ['assignment', 'plan', 'power_station', 'power_detail', 'repair_id', 'repair_date', 'repair_item', 'repair_status', 'repair_detail', 'po_id', 'po_date', 'po_type', 'po_status', 'procure_detail', 'clean_date', 'clean_detail', 'weed_date', 'weed_detail', 'ext_date', 'ext_wp_no', 'ext_company', 'ext_detail', 'asset_date', 'asset_item', 'asset_step', 'km_detail', 'idea_detail', 'other_detail', 'leave_staff_name', 'leave_sick', 'leave_personal', 'leave_vacation', 'leave_replace', 'leave_note', 'sec_station', 'sec_detail'];
    arrayFields.forEach(f => {
        payload[f] = Array.from(formData.getAll(f + (f.includes('leave') || f.includes('sec') ? '' : '[]')));
    });
    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.images = selectedImages;
    try {
        await fetch(GAS_WEBAPP_URL, { method: 'POST', body: JSON.stringify(payload) });
        alert("บันทึกข้อมูลเรียบร้อยแล้ว!");
        location.reload();
    } catch (err) {
        alert("บันทึกไม่สำเร็จ: " + err.message);
        btn.disabled = false; btn.innerText = "✅ บันทึกรายงานทั้งหมด";
    }
};