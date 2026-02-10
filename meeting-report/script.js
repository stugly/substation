const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";
let staffData = [];
let selectedImages = [];

window.onload = async () => {
    // 1. ดึงข้อมูลจาก GAS
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        staffData = data.staff;
        setupMetadata(data);
        // 2. เริ่ม LIFF
        initLiff();
    } catch (err) {
        console.error("Fetch Metadata Error:", err);
    }
};

function initLiff() {
    liff.init({ liffId: LIFF_ID }).then(() => {
        if (liff.isLoggedIn()) {
            liff.getProfile().then(profile => checkAccess(profile));
        } else {
            document.getElementById('login-screen').style.display = 'flex';
        }
    }).catch(err => console.error("LIFF Error:", err));
}

function checkAccess(profile) {
    const user = staffData.find(s => s.line === profile.userId);
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('user-display').innerText = `ผู้บันทึก: ${user.name}`;
        document.getElementById('recorder_uid').value = user.uid;
        document.getElementById('recorder_line').value = user.line;
    } else {
        alert("ขออภัย! LINE ID นี้ยังไม่ลงทะเบียนในระบบพนักงาน");
        liff.logout();
        location.reload();
    }
}

function setupMetadata(data) {
    const uSel = document.getElementById('unit');
    data.units.forEach(u => uSel.add(new Option(u, u)));
    const mSel = document.getElementById('month');
    data.months.forEach(m => mSel.add(new Option(m, m)));
    
    const attList = document.getElementById('attendance-list');
    attList.innerHTML = data.staff.map(s => 
        `<label style="display:block; font-size:14px;"><input type="checkbox" name="attendance" value="${s.uid}"> ${s.name}</label>`
    ).join('');
}

function handleImageSelect(input) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    selectedImages = [];
    
    Array.from(input.files).forEach(file => {
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

function showTab(evt, tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
}

document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerText = "กำลังสร้าง Folder และบันทึกข้อมูล...";

    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    // จัดการข้อมูลอาเรย์
    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.task_detail = Array.from(formData.getAll('task_detail[]'));
    payload.task_type = Array.from(formData.getAll('task_type[]'));
    payload.eq_id = Array.from(formData.getAll('eq_id[]'));
    payload.eq_detail = Array.from(formData.getAll('eq_detail[]'));
    payload.images = selectedImages;

    try {
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.text();
        alert(result);
        location.reload();
    } catch (err) {
        alert("บันทึกไม่สำเร็จ: " + err);
        btn.disabled = false;
        btn.innerText = "บันทึกรายงานทั้งหมด";
    }
};

function addTaskRow() {
    const div = document.createElement('div');
    div.style = "margin-bottom: 10px; border: 1px solid #eee; padding: 10px; border-radius: 5px;";
    div.innerHTML = `
        <select name="task_type[]" style="width:100%; margin-bottom:5px;">
            <option>Assignment</option><option>Plan</option>
        </select>
        <input type="text" name="task_detail[]" placeholder="รายละเอียดภารกิจ" style="width:100%;">`;
    document.getElementById('task-container').appendChild(div);
}

function addEqRow() {
    const div = document.createElement('div');
    div.style = "margin-bottom: 10px; border: 1px solid #eee; padding: 10px; border-radius: 5px;";
    div.innerHTML = `
        <input type="text" name="eq_id[]" placeholder="ชื่ออุปกรณ์/รหัส" style="width:100%; margin-bottom:5px;">
        <textarea name="eq_detail[]" placeholder="อาการชำรุด/สถานะ" style="width:100%;"></textarea>`;
    document.getElementById('eq-container').appendChild(div);
}