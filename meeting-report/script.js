const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybyNXLKsm04GXsJU0QuKZKOjOoh3XujDbA25FrLYgFE3excmvHn1B-zCdn-rEF1cwf/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "ผจฟ.1";

window.onload = function() {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    setupInitialUI();
    initializeLiff();
};

function setupInitialUI() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const mDate = document.getElementById('meeting_date');
    if (mDate) mDate.value = todayStr;
    const sTime = document.getElementById('start_time');
    if (sTime) sTime.value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
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
        fetchDataFromGAS(""); 
    }
}

function fetchDataFromGAS(lineId) {
    fetch(`${GAS_WEBAPP_URL}?action=getUser&lineId=${lineId}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.staff) {
                rawAppData = data;
                staffData = data.staff;
                currentUserUnit = (data.user && data.user.unit) ? data.user.unit : "ผจฟ.1";
                
                document.getElementById('welcome').innerText = `สวัสดี, ${data.user.name} (${currentUserUnit})`;
                document.getElementById('recorder_uid').value = data.user.uid;
                
                renderDynamicParts();
            }
        })
        .catch(err => console.error("Fetch Error:", err));
}

function renderDynamicParts() {
    // 1. วาด Dropdown สถานี
    const locSel = document.getElementById('location');
    if (locSel && rawAppData.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        rawAppData.stations.filter(s => s.unit === currentUserUnit).forEach(s => {
            locSel.add(new Option("สฟฟ." + s.name, s.name));
        });
    }

    // 2. วาดพนักงาน (เฉพาะหน่วยงานตัวเอง)
    const unitList = document.getElementById('unit-staff-list');
    if (unitList) {
        const uStaff = staffData.filter(s => s.unit === currentUserUnit);
        unitList.innerHTML = uStaff.map(s => `
            <label class="check-item"><input type="checkbox" name="attendance" value="${s.uid}"> <span>${s.name}</span></label>
        `).join('');
    }

    // 3. วาดตารางลา และ รปภ.
    setupLeaveTable();
    setupSecuritySection();
}

// --- ฟังก์ชันบันทึกข้อมูล (ปรับให้ตรงกับหัวข้อ 1-14 ใน HTML) ---
function submitReport() {
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerText = "⌛ กำลังบันทึก...";

    const payload = {
        meeting: {
            meeting_id: "MTG-" + Date.now(),
            unit_name: currentUserUnit,
            meeting_year: new Date().getFullYear() + 543,
            meeting_month: new Date().getMonth() + 1,
            meeting_date: document.getElementById('meeting_date').value,
            start_time: document.getElementById('start_time').value,
            location: document.getElementById('location').value,
            method: document.querySelector('select[name="method"]').value,
            recorder_uid: document.getElementById('recorder_uid').value
        },
        attendance: Array.from(document.querySelectorAll('input[name="attendance"]:checked')).map(cb => ({ uid: cb.value })),
        
        // 3. สภาพการจ่ายไฟฟ้า
        grid: Array.from(document.querySelectorAll('#power-container .task-row')).map(row => ({
            sname: row.querySelector('input[name="power_station[]"]').value,
            detail: row.querySelector('input[name="power_detail[]"]').value
        })),

        // 4. รายงานอุปกรณ์ชำรุด
        assets: Array.from(document.querySelectorAll('#repair-container .task-row')).map(row => ({
            id_code: row.querySelector('input[name="repair_id[]"]').value,
            date: row.querySelector('input[name="repair_date[]"]').value,
            item: row.querySelector('select[name="repair_item[]"]').value,
            status: row.querySelector('input[name="repair_detail[]"]').value
        })),

        // 12. สรุปการลา
        leave: Array.from(document.querySelectorAll('#leave-table-body tr')).map(row => ({
            uid: staffData.find(s => s.name === row.cells[0].innerText.trim())?.uid || "",
            sick: row.cells[1].querySelector('input').value,
            personal: row.cells[2].querySelector('input').value,
            vacation: row.cells[3].querySelector('input').value,
            substitute: row.cells[4].querySelector('input').value,
            remark: row.cells[5].querySelector('input').value
        }))
    };

    const body = new URLSearchParams();
    body.append('jsonData', JSON.stringify(payload));

    fetch(GAS_WEBAPP_URL, {
        method: 'POST',
        body: body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    .then(res => res.json())
    .then(res => {
        alert(res.message);
        if (res.status === "success") liff.closeWindow();
        else btn.disabled = false;
    })
    .catch(err => {
        alert("Error: " + err);
        btn.disabled = false;
    });
}

// --- ฟังก์ชันช่วยงาน UI (พ่วงมาจาก HTML) ---
function addTaskRow(type) {
    const container = document.getElementById(type + '-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="${type}_detail[]" style="flex:1;">
        <button type="button" onclick="this.parentElement.remove(); updateNumbers('${type}-container')">🗑️</button>`;
    container.appendChild(div);
}

function addPowerDynamicRow() {
    const container = document.getElementById('power-container');
    const div = document.createElement('div');
    div.className = "task-row";
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="power_station[]" placeholder="สถานี" style="width:80px;">
        <input type="text" name="power_detail[]" placeholder="ปกติ" style="flex:1;">
        <button type="button" onclick="this.parentElement.remove(); updateNumbers('power-container')">🗑️</button>`;
    container.appendChild(div);
}

function addRepairRow() {
    const container = document.getElementById('repair-container');
    const div = document.createElement('div');
    div.className = "task-row";
    const eqOpt = (rawAppData && rawAppData.settings_eq) ? rawAppData.settings_eq.map(v => `<option value="${v}">${v}</option>`).join('') : '<option value="TR">TR</option>';
    div.innerHTML = `<div class="task-number">${container.children.length + 1}.</div>
        <input type="text" name="repair_id[]" placeholder="ID" style="width:60px;">
        <input type="date" name="repair_date[]">
        <select name="repair_item[]">${eqOpt}</select>
        <input type="text" name="repair_detail[]" style="flex:1;">
        <button type="button" onclick="this.parentElement.remove(); updateNumbers('repair-container')">🗑️</button>`;
    container.appendChild(div);
}

function setupLeaveTable() {
    const body = document.getElementById('leave-table-body');
    const uStaff = staffData.filter(s => s.unit === currentUserUnit);
    body.innerHTML = uStaff.map(s => `<tr>
        <td style="text-align:left;">${s.name}</td>
        <td><input type="number" value="0"></td><td><input type="number" value="0"></td>
        <td><input type="number" value="0"></td><td><input type="number" value="0"></td>
        <td><input type="text"></td>
    </tr>`).join('');
}

function setupSecuritySection() {
    const container = document.getElementById('security-container');
    const uStations = rawAppData.stations.filter(s => s.unit === currentUserUnit);
    container.innerHTML = uStations.map((s, i) => `<div class="task-row">
        <div class="task-number">${i+1}.</div><div style="width:120px;">สฟฟ.${s.name}</div>
        <input type="text" name="sec_detail[]" placeholder="ปกติ" style="flex:1;">
    </div>`).join('');
}

function updateNumbers(id) {
    document.getElementById(id).querySelectorAll('.task-number').forEach((n, i) => n.innerText = (i + 1) + ".");
}

function setCurrentYear() {
    const year = new Date().getFullYear() + 543;
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}