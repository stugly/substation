const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";
let staffData = [];
let selectedImages = [];

// 1. เริ่มต้นระบบเมื่อโหลดหน้าเว็บ
window.onload = async () => {
    // รัน LIFF ทันทีเพื่อให้ระบบตรวจสอบการ Login
    initLiff();

    // ดึงข้อมูลพนักงานและ Metadata จาก Google Sheets
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        if (data) {
            staffData = data.staff || [];
            setupMetadata(data);
        }
    } catch (err) {
        console.error("Fetch GAS Metadata Error:", err);
    }
};

// 2. จัดการระบบ LINE LIFF
function initLiff() {
    liff.init({ liffId: LIFF_ID }).then(() => {
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            liff.getProfile().then(profile => {
                checkAccess(profile);
            });
        }
    }).catch(err => {
        console.error("LIFF Initialization failed", err);
    });
}

// 3. ตรวจสอบสิทธิ์พนักงาน (สไตล์ Argus)
function checkAccess(profile) {
    // ถ้าข้อมูลพนักงานยังโหลดไม่เสร็จ ให้รอ 500ms แล้วเช็คใหม่
    if (staffData.length === 0) {
        setTimeout(() => checkAccess(profile), 500);
        return;
    }

    const user = staffData.find(s => s.line === profile.userId);
    
    if (user) {
        // ✅ มีสิทธิ์: ซ่อน Spinner และแสดงหน้าแอปหลัก
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // แสดงชื่อพนักงานใน Card
        const welcomeEl = document.getElementById('welcome');
        if (welcomeEl) welcomeEl.innerText = user.name;
        
        // บันทึกค่า UID และ LINE ID ลงใน Hidden Input เพื่อส่งไปพร้อมฟอร์ม
        if (document.getElementById('recorder_uid')) document.getElementById('recorder_uid').value = user.uid;
        if (document.getElementById('recorder_line')) document.getElementById('recorder_line').value = user.line;
        
        console.log("Access Granted:", user.name);
    } else {
        // ❌ ไม่มีสิทธิ์: แสดงข้อความ Error และปุ่มสลับบัญชีในหน้า Spinner
        const statusEl = document.getElementById('spinner-text');
        if (statusEl) {
            statusEl.innerHTML = `
                <b style="color:#dc3545;">ไม่พบสิทธิ์การใช้งานสำหรับบัญชีนี้</b><br>
                <small style="color:#888;">ID: ${profile.userId}</small>
            `;
        }
        const actionEl = document.getElementById('spinner-action');
        if (actionEl) {
            actionEl.innerHTML = `
                <button type="button" class="btn-primary" onclick="forceLogout()" style="padding: 10px 25px; border-radius: 25px; margin-top: 15px;">
                    Login with another account
                </button>
            `;
        }
    }
}

// 4. ตั้งค่าข้อมูลใน Dropdown และรายชื่อพนักงาน
function setupMetadata(data) {
    // ตั้งค่าหน่วยงาน
    const uSel = document.getElementById('unit');
    if (uSel) {
        uSel.innerHTML = "";
        data.units.forEach(u => uSel.add(new Option(u, u)));
    }
    
    // ตั้งค่าเดือน
    const mSel = document.getElementById('month');
    if (mSel) {
        mSel.innerHTML = "";
        data.months.forEach(m => mSel.add(new Option(m, m)));
    }
    
    // สร้างรายชื่อผู้เข้าประชุม (Checkbox)
    const attList = document.getElementById('attendance-list');
    if (attList) {
        attList.innerHTML = data.staff.map(s => 
            `<label><input type="checkbox" name="attendance" value="${s.uid}"> ${s.name}</label>`
        ).join('');
    }
}

// 5. จัดการระบบ Tab 1-5
function showTab(evt, tabId, tabName) {
    // ซ่อนเนื้อหาทุก Tab
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) {
        contents[i].style.display = "none";
    }
    // แสดงเฉพาะ Tab ที่เลือก
    document.getElementById(tabId).style.display = "block";

    // เปลี่ยนสถานะปุ่มตัวเลข (Step Circle)
    const circles = document.getElementsByClassName("step-circle");
    for (let i = 0; i < circles.length; i++) {
        circles[i].classList.remove("active");
    }
    evt.currentTarget.classList.add("active");

    // อัปเดตชื่อหัวข้อ Tab
    const titleEl = document.getElementById('current-tab-title');
    if (titleEl) titleEl.innerText = tabName;

    // เลื่อนหน้าจอกลับขึ้นด้านบนเพื่อความสะดวก
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 6. จัดการการเลือกรูปภาพและ Preview
function handleImageSelect(input) {
    const preview = document.getElementById('image-preview');
    if (!preview) return;
    
    preview.innerHTML = '';
    selectedImages = [];
    
    Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            // เก็บข้อมูลภาพเป็น Base64
            selectedImages.push({ name: file.name, data: e.target.result });
            
            // สร้างรูปตัวอย่าง
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

// 7. ส่งข้อมูลไปยัง Google Apps Script
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    const originalText = btn.innerText;
    
    btn.disabled = true;
    btn.innerText = "⌛ กำลังส่งข้อมูล...";

    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    // ดึงค่าที่เป็น Array (Checkbox และ Input แถวที่เพิ่มขึ้นมา)
    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.task_detail = Array.from(formData.getAll('task_detail[]'));
    payload.task_type = Array.from(formData.getAll('task_type[]'));
    payload.eq_id = Array.from(formData.getAll('eq_id[]'));
    payload.eq_detail = Array.from(formData.getAll('eq_detail[]'));
    
    // ใส่รูปภาพ
    payload.images = selectedImages;

    try {
        const response = await fetch(GAS_WEBAPP_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        const result = await response.text();
        alert(result);
        location.reload(); // รีโหลดเมื่อบันทึกสำเร็จ
    } catch (err) {
        alert("❌ บันทึกไม่สำเร็จ: " + err.message);
        btn.disabled = false;
        btn.innerText = originalText;
    }
};

// 8. เพิ่มแถวอุปกรณ์ชำรุด (Tab 3)
function addEqRow() {
    const div = document.createElement('div');
    div.className = "card";
    div.style.marginTop = "10px";
    div.innerHTML = `
        <input type="text" name="eq_id[]" placeholder="ชื่ออุปกรณ์" style="width:100%;">
        <textarea name="eq_detail[]" placeholder="อาการชำรุด" style="width:100%; margin-top:5px;"></textarea>`;
    document.getElementById('eq-container').appendChild(div);
}

// 9. เพิ่มแถวภารกิจ/แผนงาน (Tab 4)
function addTaskRow() {
    const div = document.createElement('div');
    div.className = "card";
    div.style.marginTop = "10px";
    div.innerHTML = `
        <select name="task_type[]" style="width:100%;"><option>Assignment</option><option>Plan</option></select>
        <input type="text" name="task_detail[]" placeholder="รายละเอียด..." style="width:100%; margin-top:5px;">`;
    document.getElementById('task-container').appendChild(div);
}

// 10. ระบบสลับบัญชี (Logout)
function forceLogout() {
    if (confirm("คุณต้องการออกจากระบบเพื่อสลับไปใช้บัญชีอื่นหรือไม่?")) {
        liff.logout();
        location.reload();
    }
}