const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybyNXLKsm04GXsJU0QuKZKOjOoh3XujDbA25FrLYgFE3excmvHn1B-zCdn-rEF1cwf/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";

// 1. ทันทีที่เปิดหน้าเว็บ สั่งโชว์ฟอร์มก่อนเลย ไม่ต้องรอดึงข้อมูล
window.onload = function() {
    // โชว์แอปทันที กันหน้าขาว
    const spinner = document.getElementById('spinner');
    if(spinner) spinner.style.display = 'none';
    document.getElementById('main-app').style.display = 'block';

    // ตั้งค่าพื้นฐาน (วันที่สีดำ)
    setupInitialUI();
    
    // ค่อยไปรันระบบ LIFF และดึงข้อมูลเบื้องหลัง
    initializeLiff();
};

function setupInitialUI() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // วันที่ประชุม - บังคับสีดำตั้งแต่ออกตัว
    const mDate = document.getElementById('meeting_date');
    if (mDate) {
        mDate.value = todayStr;
        mDate.style.color = "#000000"; 
    }

    // เวลาปัจจุบัน
    const sTime = document.getElementById('start_time');
    if (sTime) {
        sTime.value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    }

    setCurrentYear();
}

async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            const profile = await liff.getProfile();
            fetchData(profile.userId);
        }
    } catch (err) {
        console.log("LIFF Connect Fail");
        fetchData(""); 
    }
}

// 2. ดึงข้อมูลจาก GAS (ถ้าดึงไม่ได้ ฟอร์มก็ยังทำงานต่อได้)
function fetchData(lineId) {
    fetch(`${GAS_WEBAPP_URL}?action=getUser&lineId=${lineId}`)
        .then(res => res.json())
        .then(data => {
            if (data) {
                rawAppData = data;
                staffData = data.staff || [];
                currentUserUnit = (data.user && data.user.unit) ? data.user.unit : "ผจฟ.1";
                
                if (data.user) {
                    document.getElementById('welcome').innerText = `สวัสดี, ${data.user.name} (${currentUserUnit})`;
                }
                
                // อัปเดต Dropdown และตารางพนักงาน
                updateDynamicElements();
            }
        })
        .catch(err => console.log("GAS Fetch Fail: ข้อมูลไม่มาแต่ฟอร์มยังใช้ได้"));
}

function updateDynamicElements() {
    // เติมสถานที่ (สฟฟ.)
    const locSel = document.getElementById('location');
    if (locSel && rawAppData && rawAppData.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        rawAppData.stations.filter(s => s.unit === currentUserUnit).forEach(s => {
            locSel.add(new Option("สฟฟ." + s.name, s.name));
        });
    }

    // รายชื่อพนักงานเข้าประชุม
    const unitList = document.getElementById('unit-staff-list');
    if (unitList && staffData.length > 0) {
        const uStaff = staffData.filter(s => s.unit === currentUserUnit);
        unitList.innerHTML = uStaff.map(s => `
            <label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span></label>
        `).join('');
    }

    setupLeaveTable();
    setupSecuritySection();
}

// 3. ระบบเพิ่มแถว (แบบพื้นฐาน รันง่าย ไม่ล็อคจนพัง)
function addTaskRow(type) {
    const container = document.getElementById(type + '-container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" placeholder="..." style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('${type}-container')">🗑️</button>`;
    container.appendChild(div);
}

function addRepairRow() {
    const container = document.getElementById('repair-container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = "task-row";
    const eqOpt = (rawAppData && rawAppData.settings_eq) ? rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('') : '<option value="TR">TR</option>';
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="repair_id[]" placeholder="ID" style="width:60px;">
        <input type="date" name="repair_date[]" style="color:#000;">
        <select name="repair_item[]">${eqOpt}</select>
        <input type="text" name="repair_detail[]" placeholder="อาการ" style="flex:1;">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateNumbers('repair-container')">🗑️</button>`;
    container.appendChild(div);
}

// ฟังก์ชันจุกจิก
function updateNumbers(id) {
    const container = document.getElementById(id);
    if (container) container.querySelectorAll('.task-number').forEach((n, i) => n.innerText = (i + 1) + ".");
}

function setCurrentYear() {
    const year = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}

// บังคับวันที่เลือกใหม่เป็นสีดำ
document.addEventListener('input', function (e) {
    if (e.target.type === 'date') e.target.style.color = "#000000";
});

// ตารางพนักงานลา
function setupLeaveTable() {
    const body = document.getElementById('leave-table-body');
    if (!body || !staffData) return;
    const uStaff = staffData.filter(s => s.unit === currentUserUnit);
    body.innerHTML = uStaff.map(s => `
        <tr>
            <td style="text-align:left;">${s.name}<input type="hidden" name="leave_staff_name[]" value="${s.name}"></td>
            <td><input type="number" name="leave_sick[]" value="0"></td>
            <td><input type="number" name="leave_personal[]" value="0"></td>
            <td><input type="number" name="leave_vacation[]" value="0"></td>
            <td><input type="number" name="leave_replace[]" value="0"></td>
            <td><input type="text" name="leave_note[]" placeholder="..."></td>
        </tr>`).join('');
}

// ตาราง รปภ.
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