const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybyNXLKsm04GXsJU0QuKZKOjOoh3XujDbA25FrLYgFE3excmvHn1B-zCdn-rEF1cwf/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "ผจฟ.1";

window.onload = function() {
    // ปิด Loading และโชว์แอปทันที
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    setupInitialUI();
    initializeLiff();
};

function setupInitialUI() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const mDate = document.getElementById('meeting_date');
    if (mDate) {
        mDate.value = todayStr;
        mDate.style.color = "#000000"; 
    }
    const sTime = document.getElementById('start_time');
    if (sTime) {
        sTime.value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    }
    setCurrentYear();
    renderBackupData(); // โหลดค่าพื้นฐานไว้ก่อน
}

async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            const profile = await liff.getProfile();
            fetchDataFromGAS(profile.userId);
        }
    } catch (err) {
        console.warn("LIFF Init Fail:", err);
        fetchDataFromGAS(""); 
    }
}

// --- ส่วน LOAD ข้อมูล (จบในฟังก์ชันเดียว) ---
function fetchDataFromGAS(lineId) {
    fetch(`${GAS_WEBAPP_URL}?action=getUser&lineId=${lineId}`)
        .then(res => res.json())
        .then(data => {
            console.log("Data loaded from GAS:", data);
            if (data && data.staff) {
                rawAppData = data;
                staffData = data.staff;
                currentUserUnit = (data.user && data.user.unit) ? data.user.unit : "ผจฟ.1";
                
                // แสดงชื่อผู้ใช้
                const welcomeEl = document.getElementById('welcome');
                if (welcomeEl) {
                    welcomeEl.innerText = `สวัสดี, ${data.user.name} (${currentUserUnit})`;
                }
                const recorderUidEl = document.getElementById('recorder_uid');
                if (recorderUidEl) {
                    recorderUidEl.value = data.user.uid;
                }

                // วาด UI ใหม่ด้วยข้อมูลจริงจาก GAS
                renderDynamicParts();
            }
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            // ถ้าดึงไม่ได้ ระบบจะใช้ข้อมูลจาก renderBackupData ที่รันไปตอนแรก
        });
}

function renderDynamicParts() {
    if (!rawAppData) return;

    // 1. วาด Dropdown สถานี
    const locSel = document.getElementById('location');
    if (locSel && rawAppData.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        rawAppData.stations.filter(s => s.unit === currentUserUnit).forEach(s => {
            locSel.add(new Option("สฟฟ." + s.name, s.name));
        });
    }

    // 2. วาดรายชื่อพนักงาน (Checkbox)
    const unitList = document.getElementById('unit-staff-list');
    if (unitList && staffData.length > 0) {
        const uStaff = staffData.filter(s => s.unit === currentUserUnit);
        unitList.innerHTML = uStaff.map(s => `
            <label class="check-item">
                <input type="checkbox" name="attendance" value="${s.uid}"> 
                <span>${s.name}</span>
            </label>
        `).join('');
    }

    // 3. วาดตารางลา และ ส่วน รปภ.
    setupLeaveTable();
    setupSecuritySection();
}

// --- ส่วนบันทึกข้อมูล (SAVE) ---
function submitReport() {
    const btn = document.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "กำลังบันทึก...";
    }

    // รวบรวมข้อมูลตามโครงสร้างที่ saveAllData ใน GAS ต้องการ
    const payload = {
        meeting: {
            meeting_id: "MTG-" + Date.now(),
            unit_name: currentUserUnit,
            meeting_year: new Date().getFullYear() + 543,
            meeting_month: new Date().getMonth() + 1,
            meeting_date: document.getElementById('meeting_date').value,
            start_time: document.getElementById('start_time').value,
            location: document.getElementById('location').value,
            method: "On-site",
            recorder_uid: document.getElementById('recorder_uid').value
        },
        attendance: Array.from(document.querySelectorAll('input[name="attendance"]:checked')).map(cb => ({ uid: cb.value })),
        grid: Array.from(document.querySelectorAll('#power-container .task-row')).map(row => ({
            sname: row.querySelector('input[name="power_station[]"]').value,
            detail: row.querySelector('input[name="power_detail[]"]').value
        })),
        leave: Array.from(document.querySelectorAll('#leave-table-body tr')).map(row => {
            const name = row.cells[0].innerText.trim();
            const staff = staffData.find(s => s.name === name);
            return {
                uid: staff ? staff.uid : "",
                sick: row.querySelector('input[name="leave_sick[]"]').value,
                personal: row.querySelector('input[name="leave_personal[]"]').value,
                vacation: row.querySelector('input[name="leave_vacation[]"]').value,
                substitute: row.querySelector('input[name="leave_replace[]"]').value,
                remark: row.querySelector('input[name="leave_note[]"]').value
            };
        })
    };

    const finalBody = new URLSearchParams();
    finalBody.append('jsonData', JSON.stringify(payload));

    fetch(GAS_WEBAPP_URL, {
        method: 'POST',
        body: finalBody,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    .then(res => res.json())
    .then(res => {
        if (res.status === "success") {
            alert("บันทึกสำเร็จ: " + res.message);
            liff.closeWindow();
        } else {
            alert("บันทึกไม่สำเร็จ: " + res.message);
            if (btn) { btn.disabled = false; btn.innerText = "ส่งรายงานการประชุม"; }
        }
    })
    .catch(err => {
        alert("Error: " + err);
        if (btn) { btn.disabled = false; btn.innerText = "ส่งรายงานการประชุม"; }
    });
}

// --- ฟังก์ชันเสริม UI ---
function renderBackupData() {
    const locSel = document.getElementById('location');
    if (locSel && locSel.options.length <= 1) {
        locSel.innerHTML = '<option value="">-- เลือกสถานที่ --</option><option value="สำนักงาน">สำนักงาน</option>';
    }
    const unitList = document.getElementById('unit-staff-list');
    if (unitList && unitList.innerHTML === "") {
        unitList.innerHTML = "<p style='color:gray; font-size:12px;'>กำลังโหลดรายชื่อจากระบบ...</p>";
    }
}

function setupLeaveTable() {
    const body = document.getElementById('leave-table-body');
    if (!body || staffData.length === 0) return;
    const uStaff = staffData.filter(s => s.unit === currentUserUnit);
    body.innerHTML = uStaff.map(s => `
        <tr>
            <td style="text-align:left;">${s.name}<input type="hidden" name="leave_staff_name[]" value="${s.name}"></td>
            <td><input type="number" name="leave_sick[]" value="0"></td>
            <td><input type="number" name="leave_personal[]" value="0"></td>
            <td><input type="number" name="leave_vacation[]" value="0"></td>
            <td><input type="number" name="leave_replace[]" value="0"></td>
            <td><input type="text" name="leave_note[]"></td>
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
            <input type="text" name="sec_detail[]" placeholder="ปกติ" style="flex:1;">
        </div>`).join('');
}

function updateNumbers(id) {
    const c = document.getElementById(id);
    if(c) c.querySelectorAll('.task-number').forEach((n, i) => n.innerText = (i + 1) + ".");
}

function setCurrentYear() {
    const year = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}

// ฟังก์ชันเพิ่มแถว Task ทั่วไป
function addTaskRow(type) {
    const container = document.getElementById(type + '-container');
    if(!container) return;
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" placeholder="..." style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('${type}-container')">🗑️</button>`;
    container.appendChild(div);
}
function addSimpleTaskRow(type) { addTaskRow(type); }

document.addEventListener('input', function (e) {
    if (e.target.type === 'date') e.target.style.color = "#000000";
});