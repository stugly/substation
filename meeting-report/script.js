const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

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

let staffData = [], rawAppData = null, currentUserUnit = "", selectedImages = [];

window.onload = function() {
    liff.init({ liffId: LIFF_ID }).then(() => {
        if (!liff.isLoggedIn()) liff.login();
        else liff.getProfile().then(loadAppData);
    }).catch(err => console.error(err));
};

async function loadAppData(profile) {
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        rawAppData = data;
        staffData = data.staff || [];
        const user = staffData.find(s => s.line.trim() === profile.userId.trim());
        if (user) {
            currentUserUnit = user.unit;
            setupMetadata(data);
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('welcome').innerText = "สวัสดี, " + user.name;
            document.getElementById('recorder_uid').value = user.uid;
        }
    } catch (err) { alert("Data Load Error: " + err); }
}

function setupMetadata(data) {
    const now = new Date();
    const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    document.getElementById('unit').value = currentUserUnit;
    document.getElementById('month').value = `${thMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
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
            `<label style="display:block;"><input type="checkbox" name="attendance" value="${s.uid}"> ${s.name} </label>`
        ).join('');
    }

    const leaveList = document.getElementById('leave-summary-list');
    if (leaveList) {
        leaveList.innerHTML = staffData.filter(s => s.unit === currentUserUnit).map(s => `
            <div class="power-row-container" style="border-bottom: 1px solid #eee; padding-bottom: 5px;">
                <div style="flex: 1; font-size: 14px;">${s.name}</div>
                <select name="leave_type_${s.uid}" style="flex: 0 0 100px;"><option value="ปกติ">ปกติ</option><option value="ลากิจ">ลากิจ</option><option value="ลาป่วย">ลาป่วย</option><option value="ลาพักร้อน">ลาพักร้อน</option></select>
                <input type="number" name="leave_days_${s.uid}" value="0" style="flex: 0 0 50px;" min="0">
            </div>`).join('');
    }
    setupPowerTab();
}

function setupPowerTab() {
    const container = document.getElementById('power-container');
    container.innerHTML = '';
    rawAppData.stations.filter(s => s.unit === currentUserUnit).forEach((s, i) => {
        const div = document.createElement('div');
        div.className = "power-row-container";
        div.innerHTML = `<div style="flex:0 0 20px;">${i+1}.</div><div class="power-label-fixed">สฟฟ.${s.name}</div><input type="hidden" name="power_station[]" value="สฟฟ.${s.name}"><input type="text" name="power_detail[]" value="สภาพการจ่ายไฟปกติ" oninput="validateTaskInput('power')" style="flex:1;"><div style="flex:0 0 32px;"></div>`;
        container.appendChild(div);
    });
    validateTaskInput('power');
}

function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    const rowCount = container.children.length + 1;
    let stationOptions = rawAppData.stations.filter(s => s.unit === currentUserUnit).map(s => `<option value="สฟฟ.${s.name}">สฟฟ.${s.name}</option>`).join('');
    const div = document.createElement('div');
    div.className = "power-row-container";
    div.innerHTML = `<div style="flex:0 0 20px;">${rowCount}.</div><select name="power_station[]" onchange="validateTaskInput('power')" style="flex:0 0 110px;"><option value="">-- เลือก --</option>${stationOptions}</select><input type="text" name="power_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('power')" required style="flex:1;"><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); validateTaskInput('power');" style="flex:0 0 32px; color:red; border:none; background:none;"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('power');
}

function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "power-row-container";
    div.innerHTML = `<div style="flex:0 0 20px;">${rowCount}.</div><input type="hidden" name="${type}_type[]" value="${config.label}"><input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." oninput="validateTaskInput('${type}')" required style="flex:1;"><button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); validateTaskInput('${type}');" style="flex:0 0 32px; color:red; border:none; background:none;"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput(type);
}

function addRepairRow() {
    const container = document.getElementById('repair-container');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "repair-row-wrapper";
    div.innerHTML = `<div style="padding-top:25px; flex:0 0 20px;">${rowCount}.</div><div class="compact-grid"><div style="flex:0 0 30%;"><span>รหัสอุปกรณ์</span><input type="text" name="repair_id[]" oninput="validateTaskInput('repair')" required></div><div style="flex:0 0 30%;"><span>วันที่ชำรุด</span><input type="date" name="repair_date[]" onchange="validateTaskInput('repair')" required></div><div style="flex:0 0 16%;"><span>อุปกรณ์</span><select name="repair_item[]">${rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`)}</select></div><div style="flex:0 0 16%;"><span>สถานะ</span><select name="repair_status[]">${rawAppData.settings_status_eq.map(v => `<option value="${v}">${v}</option>`)}</select></div><input type="text" name="repair_detail[]" placeholder="รายละเอียด..." style="flex:0 0 100%; margin-top:5px;"></div><button type="button" onclick="this.parentElement.remove(); validateTaskInput('repair');" style="margin-top:25px; flex:0 0 32px; background:none; border:none; color:red;"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('repair');
}

function addPermitRow() {
    const container = document.getElementById('permit-container');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "repair-row-wrapper";
    div.innerHTML = `<div style="padding-top:25px; flex:0 0 20px;">${rowCount}.</div><div class="compact-grid"><div style="flex:0 0 30%;"><span>เลขที่ WP</span><input type="text" name="wp_no[]" oninput="validateTaskInput('permit')" required></div><div style="flex:0 0 35%;"><span>บริษัท</span><input type="text" name="wp_company[]" oninput="validateTaskInput('permit')" required></div><div style="flex:0 0 25%;"><span>สถานะ</span><select name="wp_status[]" onchange="validateTaskInput('permit')" required><option value="">--</option><option value="กำลังดำเนินการ">กำลังดำเนินการ</option><option value="ปิดแล้ว">ปิดแล้ว</option></select></div><input type="text" name="wp_detail[]" placeholder="รายละเอียดงาน..." style="flex:0 0 100%; margin-top:5px;"></div><button type="button" onclick="this.parentElement.remove(); validateTaskInput('permit');" style="margin-top:25px; flex:0 0 32px; background:none; border:none; color:red;"><i class="fa-solid fa-trash-can"></i></button>`;
    container.appendChild(div);
    validateTaskInput('permit');
}

function validateTaskInput(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const btn = document.getElementById(config.btn);
    if (!btn || !container) return;
    const rows = container.children;
    if (rows.length === 0) { setBtnState(btn, true); return; }
    const lastRow = rows[rows.length - 1];
    const inputs = lastRow.querySelectorAll('input[required], select[required]');
    let isComplete = true;
    inputs.forEach(el => { if (el.value.trim().length === 0) isComplete = false; });
    setBtnState(btn, isComplete);
}

function setBtnState(btn, isEnabled) {
    if(!btn) return;
    btn.disabled = !isEnabled;
    btn.style.opacity = isEnabled ? "1" : "0.4";
}

function handleImageSelect(input) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = ''; selectedImages = [];
    Array.from(input.files).slice(0, 5).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImages.push({ name: file.name, data: e.target.result });
            const img = document.createElement('img'); img.src = e.target.result; img.style.width="65px"; img.style.margin="2px";
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!confirm("ยืนยันบันทึกรายงาน 10 วาระ?")) return;
    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.innerText = "⌛ กำลังบันทึก...";
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    Object.keys(taskMap).forEach(key => { payload[key+'_detail'] = Array.from(formData.getAll(key+'_detail[]')); });
    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.images = selectedImages;
    try {
        await fetch(GAS_WEBAPP_URL, { method: 'POST', body: JSON.stringify(payload) });
        alert("บันทึกสำเร็จ!"); liff.closeWindow();
    } catch (err) { alert(err); btn.disabled = false; }
};