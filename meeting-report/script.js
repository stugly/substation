const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybyNXLKsm04GXsJU0QuKZKOjOoh3XujDbA25FrLYgFE3excmvHn1B-zCdn-rEF1cwf/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";

window.onload = function() {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    setupInitialUI();
    initializeLiff();
};

function setupInitialUI() {
    const now = new Date();
    document.getElementById('meeting_date').value = now.toISOString().split('T')[0];
    document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    setCurrentYear();
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
        console.error("LIFF Error", err);
        fetchDataFromGAS(""); // Test mode
    }
}

function fetchDataFromGAS(lineId) {
    fetch(`${GAS_WEBAPP_URL}?action=getUser&lineId=${lineId}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.staff) {
                rawAppData = data;
                staffData = data.staff;
                currentUserUnit = (data.user && data.user.unit) ? data.user.unit.trim() : "ผจฟ.1";
                
                document.getElementById('welcome').innerText = `สวัสดี, ${data.user.name} (${currentUserUnit})`;
                document.getElementById('recorder_uid').value = data.user.uid;
                
                renderDynamicParts();
            }
        })
        .catch(err => alert("โหลดข้อมูลไม่สำเร็จ: " + err));
}

function renderDynamicParts() {
    // 1. วาด Dropdown สถานที่ (สฟฟ. ในสังกัด)
    const locSel = document.getElementById('location');
    if (locSel && rawAppData.stations) {
        locSel.innerHTML = '<option value="">-- เลือกสถานที่ --</option>';
        rawAppData.stations.filter(s => s.unit.trim() === currentUserUnit).forEach(s => {
            locSel.add(new Option("สฟฟ." + s.name, s.name));
        });
        locSel.add(new Option("สำนักงาน", "สำนักงาน"));
    }

    // 2. แยกรายชื่อพนักงาน (สำคัญมาก!)
    const unitListContainer = document.getElementById('unit-staff-list');
    const saListContainer = document.getElementById('sa-staff-list');

    if (unitListContainer) {
        // พนักงานในสังกัดตัวเอง (เช่น สฟฟ.สิชล)
        const myStaff = staffData.filter(s => s.unit.trim() === currentUserUnit);
        unitListContainer.innerHTML = myStaff.map(s => `
            <label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span></label>
        `).join('') || "ไม่มีรายชื่อในหน่วยงาน";
    }

    if (saListContainer) {
        // พนักงาน ผจฟ.1 (ที่ไม่ใช่คนในหน่วยงานตัวเอง เพื่อไม่ให้ซ้ำ)
        const saStaff = staffData.filter(s => s.unit.trim() === "ผจฟ.1" && s.unit.trim() !== currentUserUnit);
        saListContainer.innerHTML = saStaff.map(s => `
            <label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span></label>
        `).join('') || "ไม่มีรายชื่อ ผจฟ.1";
    }

    setupLeaveTable();
    setupSecuritySection();
}

function setupLeaveTable() {
    const body = document.getElementById('leave-table-body');
    // ตารางลาโชว์เฉพาะคนในหน่วยงานตัวเอง
    const myStaff = staffData.filter(s => s.unit.trim() === currentUserUnit);
    body.innerHTML = myStaff.map(s => `
        <tr>
            <td style="text-align:left;">${s.name}</td>
            <td><input type="number" name="l_sick[]" value="0" min="0"></td>
            <td><input type="number" name="l_pers[]" value="0" min="0"></td>
            <td><input type="number" name="l_vac[]" value="0" min="0"></td>
            <td><input type="number" name="l_sub[]" value="0" min="0"></td>
            <td><input type="text" name="l_note[]"></td>
        </tr>
    `).join('');
}

function setupSecuritySection() {
    const container = document.getElementById('security-container');
    if (!rawAppData.stations) return;
    const myStations = rawAppData.stations.filter(s => s.unit.trim() === currentUserUnit);
    container.innerHTML = myStations.map((s, i) => `
        <div class="task-row">
            <div class="task-number">${i+1}.</div>
            <div style="width:120px; font-size:13px;">สฟฟ.${s.name}</div>
            <input type="text" name="sec_detail[]" placeholder="ปกติ" style="flex:1;">
        </div>
    `).join('');
}

function submitReport() {
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';

    const payload = {
        meeting: {
            date: document.getElementById('meeting_date').value,
            unit: currentUserUnit,
            location: document.getElementById('location').value,
            recorder: document.getElementById('recorder_uid').value
        },
        attendance: Array.from(document.querySelectorAll('input[name="attendance"]:checked')).map(cb => cb.value),
        // เพิ่มส่วนรวบรวมข้อมูลอื่นๆ ตามต้องการ...
    };

    console.log("Saving...", payload);
    
    // จำลองการส่ง (ส่งจริงใช้ fetch แบบเดิม)
    setTimeout(() => {
        alert("บันทึกข้อมูลสำเร็จ (โหมดจำลอง)");
        btn.disabled = false;
        btn.innerHTML = "✅ บันทึกรายงานทั้งหมด";
    }, 2000);
}

function setCurrentYear() {
    const year = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}

function addTaskRow(type) {
    const container = document.getElementById(type + '-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `
        <div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" style="flex:1;">
        <button type="button" onclick="this.parentElement.remove(); updateNumbers('${type}-container')">🗑️</button>`;
    container.appendChild(div);
}