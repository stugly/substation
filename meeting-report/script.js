const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
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
            console.log("LINE ID:", profile.userId);
            // เรียกข้อมูลผ่าน fetch เท่านั้น ไม่ใช้ google.script.run
            checkUserAndLoadData(profile.userId);
        }
    } catch (err) {
        console.error("LIFF Error:", err);
        alert("เข้าสู่โหมดทดสอบ: " + err.message);
        mockDataForTesting();
    }
}

async function checkUserAndLoadData(lineId) {
    const spinner = document.getElementById('spinner');
    if(spinner) spinner.style.display = 'flex';

    try {
        // ใช้ fetch ยิงไปที่ GAS ตรงๆ
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
        } else {
            alert("ไม่พบชื่อคุณในระบบ (ตรวจสอบ LINE ID ใน Sheet)");
            liff.closeWindow();
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        alert("เชื่อมต่อ Server ไม่สำเร็จ (google is not defined จะไม่ขึ้นแล้ว): " + err.message);
        if(spinner) spinner.style.display = 'none';
    }
}

// --- ส่วนที่ 2: ข้อมูลทดสอบ (แก้ไขเพิ่มค่าสถานะจัดซื้อ) ---
function mockDataForTesting() {
    currentUserUnit = "ผจฟ.1"; 
    rawAppData = {
        stations: [
            {name: "นครศรีธรรมราช 1", unit: "ผจฟ.1"}, 
            {name: "ปากพนัง", unit: "ผจฟ.1"}
        ],
        settings_eq: ["TR", "CB", "DS"],
        settings_status_eq: ["ปกติ", "ชำรุด"],
        // --- เพิ่ม 2 บรรทัดนี้ลงไปเพื่อให้โหมดทดสอบมีข้อมูล ---
        settings_procure_type: ["งานจ้าง", "จัดซื้อวัสดุ"], 
        settings_procure_status: ["รอดำเนินการ", "ตรวจรับแล้ว"],
        settings_asset_step: ["ขั้นตอน 1", "ขั้นตอน 2", "รอจำหน่าย"],
        // ------------------------------------------
        staff: [
            {name: "นายทดสอบ 1", uid: "U001", unit: "ผจฟ.1"}
        ]
    };
    staffData = rawAppData.staff;
    // ... ส่วนที่เหลือเหมือนเดิม ...
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('welcome').innerText = "สวัสดี, โหมดทดสอบ (" + currentUserUnit + ")";
    setupMetadata(rawAppData);
    setupLeaveTable(); 
    setupSecuritySection();
    setCurrentYear();
}

// --- ส่วนที่ 3: ฟังก์ชันจัดการ Form (เหมือนเดิมเป๊ะ) ---
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

    // 1. ตั้งปี พ.ศ. (อันนี้ทำต่อไป)
    document.querySelectorAll('.current-year').forEach(el => { el.innerText = currentYearTH; });

    // 2. ลบบรรทัดที่สั่ง el.value = todayISO ออกให้หมด
    // แล้วใส่บรรทัดนี้เพื่อล้างค่า (ถ้ามันยังดื้อดำอยู่)
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
    meetingDateEl.setAttribute('value', todayStr); 

    // เพิ่มบรรทัดนี้ครับพี่! บังคับดำทันทีแบบไม่ต้องรอ CSS
meetingDateEl.style.color = "#333333";
    
    // 1. แสดงเดือน และ พ.ศ. ที่หัวข้อ h3
    const titleEl = document.getElementById('report-title');
    if (titleEl) {
        titleEl.innerText = `รายงานการประชุมประจำเดือน ${fullDateText}`;
    }

    // ตั้งค่าค่าพื้นฐานในฟอร์ม
    document.getElementById('unit').value = currentUserUnit;
    document.getElementById('month').value = fullDateText;
    document.getElementById('meeting_date').value = now.toISOString().split('T')[0];
    document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    
    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        data.stations.filter(s => s.unit === currentUserUnit).forEach(s => locSel.add(new Option("สฟฟ." + s.name, s.name)));
    }

    // 2. ส่วนรายชื่อผู้เข้าประชุม + ติ๊กชื่อคน Login (Checked)
    const attList = document.getElementById('attendance-list');
    
    // ดึง UID ของคน Login (ต้องใช้ data.user.uid)
    const currentLoginUid = (data && data.user) ? String(data.user.uid) : null;

    if (attList && staffData) {
        const unitStaff = staffData.filter(s => s.unit === currentUserUnit);
        const pj1Staff = staffData.filter(s => s.unit === "ผจฟ.1" && s.unit !== currentUserUnit);

        let html = `
            <div class="attendance-column">
                <div class="column-header-mini">สังกัด ${currentUserUnit}</div>
                ${unitStaff.map(s => {
                    // ถ้า UID ตรงกับคน Login ให้ใส่คำว่า checked
                    const isChecked = (String(s.uid) === currentLoginUid) ? 'checked' : '';
                    return `<label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}" ${isChecked}> ${s.name}</label>`;
                }).join('')}
            </div>
            <div class="attendance-column">
                <div class="column-header-mini">เจ้าหน้าที่ ผจฟ.1</div>
                ${pj1Staff.map(s => {
                    const isChecked = (String(s.uid) === currentLoginUid) ? 'checked' : '';
                    return `<label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}" ${isChecked}> ${s.name}</label>`;
                }).join('')}
            </div>
        `;
        attList.innerHTML = html;
    }
    
    if (typeof setupPowerTab === "function") setupPowerTab(data);
}

function setupLeaveTable() {
    const leaveBody = document.getElementById('leave-table-body');
    if (!leaveBody || !staffData) return;
    leaveBody.innerHTML = staffData.filter(s => s.unit === currentUserUnit).map(s => `
        <tr>
            <td style="text-align: left; padding-left: 10px;">${s.name}<input type="hidden" name="leave_staff_name[]" value="${s.name}"></td>
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
    validateTaskInput('repair'); // สั่งล็อคปุ่มทันทีที่กดเพิ่มแถว
}

function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row procure-row-wrapper";

    // 1. ดึงข้อมูลจากคอลัมน์ C (settings_procure_type) มาทำ Dropdown ประเภท
    let typeOpt = `<option value="">-- เลือกประเภท --</option>` + 
        rawAppData.settings_procure_type.map(v => `<option value="${v}">${v}</option>`).join('');

    // 2. ดึงข้อมูลจากคอลัมน์ D (settings_procure_status) มาทำ Dropdown สถานะ
    let statusOpt = `<option value="">-- เลือกสถานะ --</option>` + 
        rawAppData.settings_procure_status.map(v => `<option value="${v}">${v}</option>`).join('');

    div.innerHTML = `
        <div class="task-number" style="padding-top:25px;">${container.children.length + 1}.</div>
        <div class="compact-grid">
            <div><span>รหัส PO</span><input type="text" name="procure_id[]" oninput="validateTaskInput('procure')"></div>
            <div><span>วันที่จัดซื้อ</span><input type="date" name="procure_date[]" onchange="validateTaskInput('procure')"></div>
            
            <div><span>ประเภท</span><select name="procure_item[]" onchange="validateTaskInput('procure')">${typeOpt}</select></div>
            <div><span>สถานะ</span><select name="procure_status[]" onchange="validateTaskInput('procure')">${statusOpt}</select></div>
            
            <input type="text" name="procure_detail[]" placeholder="รายละเอียด..." oninput="validateTaskInput('procure')" style="flex:0 0 100%;">
        </div>
        <button type="button" class="btn-remove-task" style="margin-top:25px;" 
                onclick="this.parentElement.remove(); updateTaskNumbers('procure-container'); validateTaskInput('procure');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
    validateTaskInput('procure');
}

function addAssetRow() {
    const container = document.getElementById('asset-container');
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    
    const steps = (rawAppData && rawAppData.settings_asset_step) ? rawAppData.settings_asset_step : [];
    let stepOpt = `<option value="">-- ขั้นตอน --</option>` + steps.map(v => `<option value="${v}">${v}</option>`).join('');

    div.innerHTML = `
        <div class="task-number" style="padding-top:25px;">${container.children.length + 1}.</div>
        <div style="display: flex !important; gap: 8px; align-items: flex-end; width: 100%; flex-wrap: nowrap;">
            <div style="flex: 0 0 120px !important;">
                <span style="font-size:11px; display:block; color: #666;">วันที่ดำเนินการ</span>
                <input type="date" name="asset_date[]" onchange="validateTaskInput('asset')" style="width:100%;">
            </div>
            
            <div style="flex: 1 1 auto !important;">
                <span style="font-size:11px; display:block; color: #666;">รายละเอียดจำหน่ายทรัพย์สิน</span>
                <input type="text" name="asset_item[]" placeholder="ระบุรายการ..." oninput="validateTaskInput('asset')" style="width:100%;">
            </div>
            
            <div style="flex: 0 0 140px !important;">
                <span style="font-size:11px; display:block; color: #666;">ขั้นตอน</span>
                <select name="asset_step[]" onchange="validateTaskInput('asset')" style="width:100%;">
                    ${stepOpt}
                </select>
            </div>
        </div>
        <button type="button" class="btn-remove-task" style="margin-top:25px;" 
                onclick="this.parentElement.remove(); updateTaskNumbers('asset-container'); validateTaskInput('asset');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
    validateTaskInput('asset');
}

function addExternalRow() {
    const container = document.getElementById('external-container');
    const div = document.createElement('div');
    
    // 1. ใช้ Class repair-row-wrapper เป็นกรอบนอก
    div.className = "repair-row-wrapper";
    div.style.marginBottom = "10px";
    div.style.padding = "10px"; // เพิ่มช่องว่างข้างในกรอบนิดนึงให้ดูสวย

    // 2. ยกโครงสร้างเดิมของพี่มาใส่ไว้ข้างในกรอบ (เป๊ะทุกตัวอักษร)
    div.innerHTML = `
        <div class="task-row" style="border:none; padding:0; background:transparent;">
            <div class="task-number" style="flex:0 0 25px;">${container.children.length + 1}.</div>
            <input type="date" name="ext_date[]" onchange="validateTaskInput('external')" style="flex:0 0 130px;">
            <div style="flex:0 0 55px; display:flex; flex-direction:column; align-items:center;">
                <span style="font-size:10px; color:#06C755; font-weight:600;">WP</span>
                <input type="checkbox" name="ext_wp_check[]" onchange="toggleWP(this); validateTaskInput('external');" style="width:18px; height:18px !important;">
            </div>
            <input type="text" name="ext_wp_no[]" placeholder="เลขที่ WP" disabled oninput="validateTaskInput('external')" style="flex:0 0 100px;">
            <input type="text" name="ext_company[]" placeholder="หน่วยงาน" oninput="validateTaskInput('external')" style="flex:0 0 150px;">
            <input type="text" name="ext_detail[]" placeholder="รายละเอียด..." oninput="validateTaskInput('external')" style="flex:1;">
            <button type="button" class="btn-remove-task" onclick="this.parentElement.parentElement.remove(); updateTaskNumbers('external-container'); validateTaskInput('external');">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>`;
    
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

function validateTaskInput(type) {
    const config = taskMap[type];
    if (!config || !config.btn) return;
    const btn = document.getElementById(config.btn);
    const container = document.getElementById(config.container);
    if (!btn || !container) return;
    
    const rows = container.getElementsByClassName('task-row');
    
    // ถ้ายังไม่มีการเพิ่มแถวเลย ให้เปิดปุ่ม "+" ไว้ก่อนเพื่อให้กดแถวแรกได้
    if (rows.length === 0) { 
        btn.disabled = false; 
        btn.style.opacity = "1"; 
        btn.style.cursor = "pointer";
        return; 
    }
    
    // ดึง "แถวสุดท้าย" ที่เพิ่งเพิ่มเข้าไปมาตรวจสอบ
    const lastRow = rows[rows.length - 1];
    let isComplete = true;

    // 1. กรณีพิเศษ: ส่วนบุคคลภายนอก (External)
    if (type === 'external') {
        const date = lastRow.querySelector('input[name="ext_date[]"]').value;
        const company = lastRow.querySelector('input[name="ext_company[]"]').value.trim();
        const detail = lastRow.querySelector('input[name="ext_detail[]"]').value.trim();
        const wpCheck = lastRow.querySelector('input[name="ext_wp_check[]"]').checked;
        const wpNo = lastRow.querySelector('input[name="ext_wp_no[]"]').value.trim();
        
        if (!date || !company || !detail) isComplete = false;
        if (wpCheck && wpNo === "") isComplete = false;
        
    } else {
        // 2. กรณีทั่วไป: Section 4, 10, 11, 14 และอื่นๆ
        // ค้นหาทุก Input (ยกเว้น hidden/checkbox) และ Select ในแถวนั้น
        const allInputs = lastRow.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]), select');
        
        allInputs.forEach(el => {
            // ถ้ามีช่องไหนว่าง (trim แล้วความยาวเป็น 0) ให้ถือว่ายังไม่ครบ
            if (el.value.trim().length === 0 && !el.disabled) {
                isComplete = false;
            }
        });
    }

    // สั่งเปิด-ปิดปุ่ม และปรับความจางของปุ่มตามสถานะ
    btn.disabled = !isComplete;
    btn.style.opacity = isComplete ? "1" : "0.5";
    btn.style.cursor = isComplete ? "pointer" : "not-allowed";
}

function setupPowerTab(data) {
    const container = document.getElementById('power-container');
    if (!container) return;
    container.innerHTML = data.stations.filter(s => s.unit === currentUserUnit).map((s, i) => `
        <div class="task-row">
            <div class="task-number">${i + 1}.</div>
            <div class="power-station-name">สฟฟ.${s.name}</div>
            <input type="hidden" name="power_station[]" value="สฟฟ.${s.name}">
            <input type="text" name="power_detail[]" value="สภาพการจ่ายไฟปกติ" oninput="validateTaskInput('power')" style="flex: 1;">
        </div>`).join('');
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

// ฟังก์ชันกลางสำหรับเพิ่มแถว KM, Idea, Other (Section 10, 11, 14)
function addSimpleTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const div = document.createElement('div');
    div.className = "task-row";
    
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="hidden" name="${type}_type[]" value="${config.label}">
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." 
               oninput="validateTaskInput('${type}')" style="flex:1;">
        <button type="button" class="btn-remove-task" 
                onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}');">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
        
    container.appendChild(div);
    
    // บรรทัดนี้สำคัญมาก: สั่งล็อคปุ่มทันทีที่สร้างแถวใหม่
    validateTaskInput(type); 
}

// --- ส่วนที่ 4: การบันทึกข้อมูล ---
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!confirm("ยืนยันการบันทึกรายงานข้อมูลทั้งหมด?")) return;
    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.innerText = "⌛ กำลังบันทึกข้อมูล...";
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    // --- แก้ไขเฉพาะช่วงนี้ใน onsubmit ---
    // แก้ไขช่วง arrayFields ใน onsubmit ให้ตรงกับชื่อใน HTML
    const arrayFields = [
        'assignment_detail', 'plan_detail', 'power_station', 'power_detail', // แก้จาก assignment เป็น assignment_detail ตาม name ใน input
        'repair_id', 'repair_date', 'repair_item', 'repair_status', 'repair_detail', 
        'procure_id', 'procure_date', 'procure_item', 'procure_status', 'procure_detail',
        'clean_date', 'clean_detail', 'weed_date', 'weed_detail', // ข้อ 6 และ 7
        'ext_date', 'ext_wp_no', 'ext_company', 'ext_detail', 
        'asset_date', 'asset_item', 'asset_step', 
        'km_detail', 'idea_detail', 'other_detail', 
        'leave_staff_name', 'leave_sick', 'leave_personal', 'leave_vacation', 'leave_replace', 'leave_note', 
        'sec_station', 'sec_detail'
    ];

arrayFields.forEach(f => {
    // แก้ไข Logic การดึงค่า Array ให้ครอบคลุมชื่อฟิลด์ทุกแบบ
    const fieldName = (f.includes('leave_') || f.includes('sec_')) ? f : f + '[]';
    payload[f] = formData.getAll(fieldName);
});
// ----------------------------------
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

// ฟังก์ชันสำหรับ "สะกิด" ให้ CSS รู้ว่ามีการเลือกวันที่แล้ว
document.addEventListener('input', function (e) {
    if (e.target.type === 'date') {
        if (e.target.value) {
            // เมื่อเลือกวันที่ ให้ใส่ attribute value="yyyy-mm-dd" ลงไปใน HTML
            e.target.setAttribute('value', e.target.value);
        } else {
            // เมื่อลบวันที่ออก ให้เอา attribute ออกเพื่อให้กลับไปเป็นสีเทา
            e.target.removeAttribute('value');
        }
    }
});

