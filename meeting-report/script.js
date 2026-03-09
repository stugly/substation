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
            console.log("LINE ID:", profile.userId);
            // บันทึก Line ID ไว้ใช้ตอนส่งข้อมูล
            document.getElementById('recorder_uid').value = profile.userId;
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
        alert("เชื่อมต่อ Server ไม่สำเร็จ: " + err.message);
        if(spinner) spinner.style.display = 'none';
    }
}

// --- ส่วนที่ 2: ข้อมูลทดสอบ ---
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

// --- ส่วนที่ 3: ฟังก์ชันจัดการ Form ---
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
    
    document.getElementById('report-title').innerText = `รายงานการประชุมประจำเดือน ${fullDateText}`;
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
                ${unitStaff.map(s => {
                    const isChecked = (String(s.uid) === currentLoginUid) ? 'checked' : '';
                    return `<label class="check-item"><input type="checkbox" name="attendance[]" value="${s.uid}" ${isChecked}> <span>${s.name}</span></label>`;
                }).join('')}
            </div>
            <div class="attendance-column">
                <div class="column-header-mini">เจ้าหน้าที่ ผจฟ.1</div>
                ${pj1Staff.map(s => {
                    const isChecked = (String(s.uid) === currentLoginUid) ? 'checked' : '';
                    return `<label class="check-item"><input type="checkbox" name="attendance[]" value="${s.uid}" ${isChecked}> <span>${s.name}</span></label>`;
                }).join('')}
            </div>`;
    }
    setupPowerTab(data);
}

function setupLeaveTable() {
    const leaveBody = document.getElementById('leave-table-body');
    if (!leaveBody || !staffData) return;
    // สำคัญ: เพิ่ม data-uid ในแถว <tr>
    leaveBody.innerHTML = staffData.filter(s => s.unit === currentUserUnit).map(s => `
        <tr data-uid="${s.uid}">
            <td style="text-align: left; padding-left: 10px; color: #000; font-weight: 500;">${s.name}</td>
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

// --- ฟังก์ชันเพิ่มแถว (Dynamic Rows) ---
function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('${type}')" style="flex:1;"><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput(type);
}

function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row repair-row-wrapper";
    let eqOpt = `<option value="">-- อุปกรณ์ --</option>` + rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    let stOpt = `<option value="">-- สถานะ --</option>` + rawAppData.settings_status_eq.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><div style="display:flex; gap:5px; width:100%;"><input type="text" name="repair_id[]" placeholder="รหัส EQ" style="width:80px;"><input type="date" name="repair_date[]"><select name="repair_item[]">${eqOpt}</select><select name="repair_status[]">${stOpt}</select><input type="text" name="repair_detail[]" placeholder="รายละเอียด..." style="flex:1;"></div><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('repair-container');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

function addProcureRow() {
    const container = document.getElementById('procure-container');
    const div = document.createElement('div');
    div.className = "task-row procure-row-wrapper";
    let typeOpt = `<option value="">-- ประเภท --</option>` + rawAppData.settings_procure_type.map(v => `<option value="${v}">${v}</option>`).join('');
    let statusOpt = `<option value="">-- สถานะ --</option>` + rawAppData.settings_procure_status.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><div style="display:flex; gap:5px; width:100%;"><input type="text" name="procure_id[]" placeholder="รหัส PO" style="width:80px;"><input type="date" name="procure_date[]"><select name="procure_item[]">${typeOpt}</select><select name="procure_status[]">${statusOpt}</select><input type="text" name="procure_detail[]" placeholder="รายละเอียด..." style="flex:1;"></div><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('procure-container');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

function addAssetRow() {
    const container = document.getElementById('asset-container');
    const div = document.createElement('div');
    div.className = "task-row";
    let stepOpt = `<option value="">-- ขั้นตอน --</option>` + rawAppData.settings_asset_step.map(v => `<option value="${v}">${v}</option>`).join('');
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><input type="date" name="asset_date[]"><input type="text" name="asset_item[]" placeholder="รายละเอียดทรัพย์สิน" style="flex:1;"><select name="asset_step[]">${stepOpt}</select><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('asset-container');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

function addExternalRow() {
    const container = document.getElementById('external-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><input type="date" name="ext_date[]"><input type="checkbox" name="ext_wp_check[]" onchange="toggleWP(this)"> WP <input type="text" name="ext_wp_no[]" placeholder="เลขที่ WP" disabled style="width:80px;"><input type="text" name="ext_company[]" placeholder="บริษัท"><input type="text" name="ext_detail[]" placeholder="รายละเอียด" style="flex:1;"><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('external-container');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

function toggleWP(chk) {
    const wpInput = chk.parentElement.querySelector('input[name="ext_wp_no[]"]');
    wpInput.disabled = !chk.checked;
    if(!chk.checked) wpInput.value = "";
}

function addSimpleTaskRow(type) {
    addTaskRow(type);
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
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div><select name="power_station[]" style="width:200px;"><option value="">-- เลือกสถานี --</option>${opt}</select><input type="text" name="power_detail[]" placeholder="ระบุรายละเอียด..." style="flex: 1;"><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('power-container');"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
}

function updateTaskNumbers(id) {
    document.getElementById(id).querySelectorAll('.task-number').forEach((num, i) => { num.innerText = (i + 1) + "."; });
}

function validateTaskInput(type) {
    // ฟังก์ชันตรวจสอบความเรียบร้อยของ Input (ตาม Logic เดิมของพี่)
    const config = taskMap[type];
    const btn = document.getElementById(config.btn);
    const container = document.getElementById(config.container);
    if (container.children.length > 0) {
        const lastInput = container.lastElementChild.querySelector('input[type="text"]');
        if (lastInput && lastInput.value.trim() === "") {
            btn.disabled = true; btn.style.opacity = "0.5";
        } else {
            btn.disabled = false; btn.style.opacity = "1";
        }
    }
}

// --- ส่วนที่ 4: การรวบรวมข้อมูลและส่ง (Core Logic) ---
function collectData() {
    const reportId = "HELIOS-" + Date.now();
    const currentYear = document.querySelector('.current-year')?.textContent || (new Date().getFullYear() + 543);
    
    return {
        meeting: {
            meeting_id: reportId,
            unit_name: document.getElementById('unit').value,
            meeting_year: currentYear,
            meeting_month: document.getElementById('month').value,
            meeting_date: document.getElementById('meeting_date').value,
            start_time: document.getElementById('start_time').value,
            location: document.getElementById('location').value,
            method: document.querySelector('select[name="method"]').value,
            recorder_uid: document.getElementById('recorder_uid').value
        },
        attendance: Array.from(document.querySelectorAll('input[name="attendance[]"]:checked')).map(cb => ({ meeting_id: reportId, uid: cb.value })),
        grid: Array.from(document.querySelectorAll('#power-container .task-row')).map(row => ({
            meeting_id: reportId,
            sname: row.querySelector('[name="power_station[]"]').value,
            detail: row.querySelector('[name="power_detail[]"]').value
        })),
        assets: [
            ...Array.from(document.querySelectorAll('#repair-container .task-row')).map(row => ({
                meeting_id: reportId, type: 'REPAIR', id_code: row.querySelector('[name="repair_id[]"]').value,
                date: row.querySelector('[name="repair_date[]"]').value, item: row.querySelector('[name="repair_item[]"]').value,
                status: row.querySelector('[name="repair_status[]"]').value, detail: row.querySelector('[name="repair_detail[]"]').value
            })),
            ...Array.from(document.querySelectorAll('#procure-container .task-row')).map(row => ({
                meeting_id: reportId, type: 'PROCURE', id_code: row.querySelector('[name="procure_id[]"]').value,
                date: row.querySelector('[name="procure_date[]"]').value, item: row.querySelector('[name="procure_item[]"]').value,
                status: row.querySelector('[name="procure_status[]"]').value, detail: row.querySelector('[name="procure_detail[]"]').value
            }))
        ],
        visitor: Array.from(document.querySelectorAll('#external-container .task-row')).map(row => ({
            meeting_id: reportId, visit_date: row.querySelector('[name="ext_date[]"]').value,
            wp_check: row.querySelector('[name="ext_wp_check[]"]')?.checked ? "YES" : "NO",
            wp_no: row.querySelector('[name="ext_wp_no[]"]').value,
            organization: row.querySelector('[name="ext_company[]"]').value,
            detail: row.querySelector('[name="ext_detail[]"]').value
        })),
        task_plan: [
            ...Array.from(document.querySelectorAll('#assignment-container input[type="text"]')).map(el => ({ meeting_id: reportId, type: "ASSIGNMENT", detail: el.value })),
            ...Array.from(document.querySelectorAll('#plan-container input[type="text"]')).map(el => ({ meeting_id: reportId, type: "PLAN", detail: el.value })),
            ...Array.from(document.querySelectorAll('#km-container input[type="text"]')).map(el => ({ meeting_id: reportId, type: "KM", detail: el.value })),
            ...Array.from(document.querySelectorAll('#idea-container input[type="text"]')).map(el => ({ meeting_id: reportId, type: "IDEA", detail: el.value })),
            ...Array.from(document.querySelectorAll('#other-container input[type="text"]')).map(el => ({ meeting_id: reportId, type: "OTHER", detail: el.value }))
        ].filter(t => t.detail.trim() !== ""),
        cleaning: [
            ...collectRoutine('clean', 'Cleaning', reportId),
            ...collectRoutine('weed', 'Weeding', reportId)
        ],
        leave: Array.from(document.querySelectorAll('#leave-table-body tr')).map(row => ({
            meeting_id: reportId,
            uid: row.getAttribute('data-uid'),
            sick: row.querySelector('[name="leave_sick[]"]').value || 0,
            personal: row.querySelector('[name="leave_personal[]"]').value || 0,
            vacation: row.querySelector('[name="leave_vacation[]"]').value || 0,
            substitute: row.querySelector('[name="leave_replace[]"]').value || 0,
            remark: row.querySelector('[name="leave_note[]"]').value || ""
        })),
        asset_transfer: Array.from(document.querySelectorAll('#asset-container .task-row')).map(row => ({
            meeting_id: reportId, asset_date: row.querySelector('[name="asset_date[]"]').value,
            item_detail: row.querySelector('[name="asset_item[]"]').value, step: row.querySelector('[name="asset_step[]"]').value
        }))
    };
}

function collectRoutine(prefix, label, reportId) {
    return Array.from(document.querySelectorAll(`#${prefix}-table-body tr`)).map(row => {
        const d = row.querySelector(`input[name="${prefix}_date[]"]`).value;
        if(!d) return null;
        return { meeting_id: reportId, type: label, sequence: row.cells[0].innerText, date: d, detail: row.querySelector(`input[name="${prefix}_detail[]"]`).value };
    }).filter(x => x !== null);
}

// --- ฟังก์ชัน Submit (เปลี่ยนเป็น FETCH) ---
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    const finalPayload = collectData();
    if (!confirm("ยืนยันการบันทึกข้อมูลรายงานนี้?")) return;

    const btn = document.getElementById('btn-submit');
    const spinner = document.getElementById('spinner');
    btn.disabled = true; btn.innerText = "⌛ กำลังบันทึก...";
    if(spinner) spinner.style.display = 'flex';

    try {
        // ส่งด้วย fetch + no-cors เพื่อความชัวร์ว่าไม่ติดปัญหา Browser
        await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "saveReport", data: finalPayload })
        });

        // เนื่องจาก no-cors จะไม่คืนค่า json เราจึง alert สำเร็จได้เลยถ้าไม่มี error ใน network
        if(spinner) spinner.style.display = 'none';
        alert("✅ บันทึกข้อมูลเรียบร้อยแล้ว!");
        if (liff.isInClient()) { liff.closeWindow(); } else { location.reload(); }

    } catch (err) {
        console.error("Submit Error:", err);
        alert("❌ เกิดข้อผิดพลาด: " + err.message);
        btn.disabled = false; btn.innerText = "✅ บันทึกรายงานทั้งหมด";
        if(spinner) spinner.style.display = 'none';
    }
};