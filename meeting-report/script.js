const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";
let staffData = [];
let selectedImages = [];

window.onload = async () => {
    try {
        // 1. ดึง Metadata จาก GAS ก่อน
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        staffData = data.staff;
        setupMetadata(data);
        
        // 2. รัน LIFF
        initLiff();
    } catch (err) {
        alert("ไม่สามารถดึงข้อมูลพนักงานได้ กรุณาเช็คอินเทอร์เน็ต");
    }
};

function initLiff() {
    liff.init({ liffId: LIFF_ID }).then(() => {
        if (!liff.isLoggedIn()) {
            // ถ้ายังไม่ได้ Login ให้เด้งหน้า Login ทันที
            liff.login();
        } else {
            // ถ้า Login แล้ว เช็คสิทธิ์พนักงานเลย
            liff.getProfile().then(profile => checkAccess(profile));
        }
    }).catch(err => console.error(err));
}

function checkAccess(profile) {
    const user = staffData.find(s => s.line === profile.userId);
    if (user) {
        // ผ่านสิทธิ์! ซ่อน Spinner และโชว์แอปหลัก
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        document.getElementById('welcome').innerText = `ยินดีต้อนรับ: ${user.name}`;
        document.getElementById('recorder_uid').value = user.uid;
        document.getElementById('recorder_line').value = user.line;
    } else {
        // ไม่พบชื่อในระบบพนักงาน
        alert("ขออภัย! LINE ของคุณยังไม่ได้ลงทะเบียนในระบบ\nID: " + profile.userId);
        liff.logout();
        location.reload();
    }
}

// ส่วนอื่นๆ คงเดิมตามความต้องการของระบบ
function setupMetadata(data) {
    const uSel = document.getElementById('unit');
    data.units.forEach(u => uSel.add(new Option(u, u)));
    const mSel = document.getElementById('month');
    data.months.forEach(m => mSel.add(new Option(m, m)));
    const attList = document.getElementById('attendance-list');
    attList.innerHTML = data.staff.map(s => 
        `<label><input type="checkbox" name="attendance" value="${s.uid}"> ${s.name}</label>`
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

function showTab(evt, tabId, tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
    // อัปเดตชื่อ Tab ที่หัวข้อ
    document.getElementById('tab-name').innerText = tabName;
}

document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerText = "กำลังส่งข้อมูล...";

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
        alert("บันทึกไม่สำเร็จ");
        btn.disabled = false;
    }
};

function addTaskRow() {
    const div = document.createElement('div');
    div.className = "card";
    div.innerHTML = `
        <select name="task_type[]" style="width:100%;"><option>Assignment</option><option>Plan</option></select>
        <input type="text" name="task_detail[]" placeholder="รายละเอียด..." style="width:100%; margin-top:5px;">`;
    document.getElementById('task-container').appendChild(div);
}

function addEqRow() {
    const div = document.createElement('div');
    div.className = "card";
    div.innerHTML = `
        <input type="text" name="eq_id[]" placeholder="ชื่ออุปกรณ์" style="width:100%;">
        <textarea name="eq_detail[]" placeholder="อาการชำรุด" style="width:100%; margin-top:5px;"></textarea>`;
    document.getElementById('eq-container').appendChild(div);
}

// ฟังก์ชันสำหรับสลับบัญชี
function forceLogout() {
    if (confirm("คุณต้องการออกจากระบบเพื่อเข้าใช้งานด้วยบัญชีอื่นใช่หรือไม่?")) {
        liff.logout();
        // หลังจาก logout ให้ reload หน้าเว็บเพื่อให้ liff.login() ทำงานใหม่
        location.reload();
    }
}

// ปรับปรุงฟังก์ชัน checkAccess เล็กน้อยเพื่อให้แสดง Error ชัดเจนถ้าไม่มีสิทธิ์
function checkAccess(profile) {
    const user = staffData.find(s => s.line === profile.userId);
    if (user) {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        document.getElementById('welcome').innerText = `ยินดีต้อนรับ: ${user.name}`;
        document.getElementById('recorder_uid').value = user.uid;
        document.getElementById('recorder_line').value = user.line;
    } else {
        // หากไม่พบสิทธิ์ ให้หยุดตัวหมุนและโชว์ปุ่ม Logout ชัดๆ
        document.getElementById('spinner').innerHTML = `
            <div style="color: red; margin-bottom: 20px;">❌ ไม่พบสิทธิ์การใช้งานสำหรับบัญชีนี้</div>
            <p style="font-size: 14px; margin-bottom: 20px;">ID: ${profile.userId}</p>
            <button class="btn-primary" onclick="forceLogout()">Login to another account</button>
        `;
    }
}