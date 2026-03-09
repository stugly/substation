const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybyNXLKsm04GXsJU0QuKZKOjOoh3XujDbA25FrLYgFE3excmvHn1B-zCdn-rEF1cwf/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";

const taskMap = {
    assignment: { container: 'assignment-container', btn: 'btn-add-assignment' },
    plan: { container: 'plan-container', btn: 'btn-add-plan' },
    power: { container: 'power-container', btn: 'btn-add-power' },
    repair: { container: 'repair-container', btn: 'btn-add-repair' },
    procure: { container: 'procure-container', btn: 'btn-add-procure' },
    external: { container: 'external-container', btn: 'btn-add-external' },
    asset: { container: 'asset-container', btn: 'btn-add-asset' },
    km: { container: 'km-container', btn: 'btn-add-km' },
    idea: { container: 'idea-container', btn: 'btn-add-idea' },
    other: { container: 'other-container', btn: 'btn-add-other' }
};

window.onload = function() {
    initializeLiff(); 
};

async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            const profile = await liff.getProfile();
            // เมื่อได้ Profile แล้วให้รีบดึงข้อมูลทันที
            checkUserAndLoadData(profile.userId);
        }
    } catch (err) {
        console.error("LIFF Error");
        // ถ้า LIFF พัง ยังไงก็ต้องเปิดหน้าฟอร์มให้พี่เห็น
        showMainApp();
    }
}

async function checkUserAndLoadData(lineId) {
    try {
        const response = await fetch(`${GAS_WEBAPP_URL}?action=getUser&lineId=${lineId}`);
        const data = await response.json();
        
        if (data) {
            rawAppData = data; 
            staffData = data.staff || []; 
            currentUserUnit = (data.user && data.user.unit) ? data.user.unit : "";
            
            if (data.user) {
                document.getElementById('welcome').innerText = `สวัสดี, ${data.user.name} (${currentUserUnit})`;
                const recorderInput = document.querySelector('input[name="recorder_uid"]');
                if (recorderInput) recorderInput.value = data.user.uid;
            }
            
            // เรียกฟังก์ชันจัดการ UI
            setupMetadata(rawAppData);
            setupLeaveTable(); 
            setupSecuritySection();
        }
    } catch (err) {
        console.error("Fetch error");
    } finally {
        showMainApp();
    }
}

function showMainApp() {
    const spinner = document.getElementById('spinner');
    if(spinner) spinner.style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    setCurrentYear();
}

function setupMetadata(data) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // --- วันที่สีดำ (เป้าหมายหลักของเรา) ---
    const mDate = document.getElementById('meeting_date');
    if (mDate) {
        mDate.value = todayStr;
        mDate.style.color = "#000000"; 
    }

    if (document.getElementById('unit')) document.getElementById('unit').value = currentUserUnit;
    
    // ตั้งเวลา
    if (document.getElementById('start_time')) {
        document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    }

    // เติมสถานที่ (ถ้ามีข้อมูล)
    if (data && data.stations) {
        const locSel = document.getElementById('location');
        if (locSel) {
            locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
            data.stations.filter(s => s.unit === currentUserUnit).forEach(s => {
                locSel.add(new Option("สฟฟ." + s.name, s.name));
            });
        }
    }
    
    // รายชื่อพนักงาน
    if (staffData && staffData.length > 0) {
        const unitList = document.getElementById('unit-staff-list');
        if (unitList) {
            const uStaff = staffData.filter(s => s.unit === currentUserUnit);
            unitList.innerHTML = uStaff.map(s => `
                <label class="check-item">
                    <input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span>
                </label>`).join('');
        }
    }
}

// --- ฟังก์ชันเสริม (Copy จากของเดิมพี่มาให้ครบ) ---
function validateTaskInput(type) {
    const config = taskMap[type];
    if (!config) return;
    const btn = document.getElementById(config.btn);
    const container = document.getElementById(config.container);
    if (!btn || !container) return;
    const rows = container.getElementsByClassName('task-row');
    if (rows.length === 0) { btn.disabled = false; btn.style.opacity = "1"; return; }
    const lastRow = rows[rows.length - 1];
    let isComplete = true;
    lastRow.querySelectorAll('input:not([type="hidden"]), select').forEach(el => {
        if (el.value.trim() === "") isComplete = false;
    });
    btn.disabled = !isComplete;
    btn.style.opacity = isComplete ? "1" : "0.5";
}

function addTaskRow(type) {
    const config = taskMap[type];
    const container = document.getElementById(config.container);
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" placeholder="ระบุรายละเอียด..." style="flex:1;" oninput="validateTaskInput('${type}')">
        <button type="button" class="btn-remove-task" onclick="this.parentElement.remove(); updateTaskNumbers('${config.container}'); validateTaskInput('${type}')">
            <i class="fa-solid fa-trash-can"></i>
        </button>`;
    container.appendChild(div);
    validateTaskInput(type);
}

// (เพิ่มฟังก์ชัน addPowerDynamicRow, addRepairRow... และอื่นๆ ต่อท้ายได้เลยครับ)
// ทุกจุดที่มี input type="date" ผมจะใส่ style="color:#000;" ไว้ให้ใน HTML string ครับ

function updateTaskNumbers(id) {
    const container = document.getElementById(id);
    if (container) container.querySelectorAll('.task-number').forEach((n, i) => n.innerText = (i + 1) + ".");
}

function setCurrentYear() {
    const year = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}

document.addEventListener('input', function (e) {
    if (e.target.type === 'date') e.target.style.color = "#000000";
});