const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let currentUserUnit = "";
let selectedImages = [];

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
            document.getElementById('spinner-text').innerHTML = `<div style="padding:20px; color:#d9534f;"><b>ไม่พบสิทธิ์การใช้งาน</b><br><small>ID: ${myId}</small></div>`;
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

    // ตั้งค่าสถานที่
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
            `<label><input type="checkbox" name="attendance" value="${s.uid}"> ${s.name} 
            <span style="font-size:10px; color:${s.unit === 'ผจฟ.1' ? '#f39c12' : '#06C755'}; font-weight:bold;">(${s.unit})</span></label>`
        ).join('');
    }

    // ล้างค่าในกล่อง แต่ "ไม่ต้อง" สั่ง addTaskRow() เพื่อให้เปิดมาโล่งๆ
    const assignCont = document.getElementById('assignment-container');
    const planCont = document.getElementById('plan-container');
    if (assignCont) { assignCont.innerHTML = ''; }
    if (planCont) { planCont.innerHTML = ''; }
    
    // อัปเดตสถานะปุ่ม (เพื่อให้กดปุ่มบวกได้ทันทีที่เปิดแอป)
    validateTaskInput('assignment');
    validateTaskInput('plan');
}

// แก้ไขแมพของ Container และ ปุ่ม ให้รองรับครบทุก Tab
const taskMap = {
    assignment: { container: 'assignment-container', btn: 'btn-add-assignment', label: 'มอบหมาย' },
    plan: { container: 'plan-container', btn: 'btn-add-plan', label: 'แผนงาน' },
    power: { container: 'power-container', btn: 'btn-add-power', label: 'สภาพจ่ายไฟ' },
    repair: { container: 'repair-container', btn: 'btn-add-repair', label: 'อุปกรณ์ชำรุด' },
    procure: { container: 'procure-container', btn: 'btn-add-procure', label: 'จัดซื้อจัดจ้าง' },
    clean: { container: 'clean-container', btn: 'btn-add-clean', label: 'ทำความสะอาด' }
};

function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const rowCount = container.getElementsByClassName('task-row').length + 1;

    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${rowCount}.</div>
        <input type="hidden" name="task_type[]" value="${config.label}">
        <input type="text" name="task_detail[]" placeholder="ระบุรายละเอียด..." 
               oninput="validateTaskInput('${type}')" required>
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}');">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
    validateTaskInput(type);
}

function validateTaskInput(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const btn = document.getElementById(config.btn);
    if (!btn) return;

    const rows = container.getElementsByClassName('task-row');
    if (rows.length === 0) { setBtnState(btn, true); return; }

    const lastInput = rows[rows.length - 1].querySelector('input[name="task_detail[]"]');
    setBtnState(btn, (lastInput && lastInput.value.trim() !== ""));
}

function setBtnState(btn, isEnabled) {
    btn.disabled = !isEnabled;
    btn.style.opacity = isEnabled ? "1" : "0.5";
    btn.style.cursor = isEnabled ? "pointer" : "not-allowed";
}

// จัดการรูปภาพ
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

// บันทึกฟอร์ม
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
    payload.images = selectedImages;

    try {
        const response = await fetch(GAS_WEBAPP_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.text();
        alert(result);
        location.reload();
    } catch (err) {
        alert("❌ บันทึกไม่สำเร็จ: " + err.message);
        btn.disabled = false;
        btn.innerText = "✅ บันทึกรายงานทั้งหมด";
    }
};

function addEqRow() {
    const container = document.getElementById('eq-container');
    const div = document.createElement('div');
    div.style.cssText = "margin-top:10px; padding:10px; border:1px solid #eee; border-radius:8px; background:#fcfcfc;";
    div.innerHTML = `
        <input type="text" name="eq_id[]" placeholder="ชื่ออุปกรณ์/รหัส" style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px;">
        <textarea name="eq_detail[]" placeholder="อาการชำรุด/แนวทางแก้ไข" style="width:100%; margin-top:5px; padding:6px; border:1px solid #ddd; border-radius:4px;"></textarea>
    `;
    container.appendChild(div);
}