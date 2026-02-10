const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let selectedImages = [];
let currentUserUnit = ""; // เก็บหน่วยงานของผู้ที่ Login
let rawAppData = null;    // เก็บข้อมูล Metadata (เดือน/หน่วยงาน) สำรองไว้

// 1. เริ่มรันระบบ
window.onload = function() {
    initLiff();
};

// 2. ตรวจสอบการ Login ด้วย LIFF
async function initLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
            liff.login(); 
        } else {
            const profile = await liff.getProfile();
            loadAppData(profile);
        }
    } catch (err) {
        console.error("LIFF Error:", err);
    }
}

// 3. ดึงข้อมูลจาก GAS และตั้งค่าเริ่มต้น
async function loadAppData(profile) {
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        staffData = data.staff || [];
        rawAppData = data; // เก็บข้อมูลทั้งหมดไว้ใช้กรองภายหลัง
        
        checkAccess(profile);
    } catch (err) {
        console.error("Data Load Error:", err);
    }
}

// 4. เช็คสิทธิ์พนักงานและระบุหน่วยงาน
function checkAccess(profile) {
    const user = staffData.find(s => s.line === profile.userId);
    if (user) {
        currentUserUnit = user.unit; // ระบุหน่วยงานของผู้ใช้ (จาก cell E)
        
        // เมื่อพบตัวตนแล้ว จึงทำการ Setup ข้อมูลในหน้าฟอร์ม
        setupMetadata(rawAppData);

        document.getElementById('spinner').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('welcome').innerText = "สวัสดี, " + user.name;
        
        const avatarBox = document.getElementById('user-avatar-placeholder');
        if (avatarBox && profile.pictureUrl) {
            avatarBox.innerHTML = `<img src="${profile.pictureUrl}" alt="profile">`;
        }

        document.getElementById('recorder_uid').value = user.uid;
        document.getElementById('recorder_line').value = user.line;
    } else {
        document.getElementById('spinner-text').innerHTML = 
            `<b style="color:red">ไม่พบสิทธิ์สำหรับ ID: ${profile.userId}</b><br>
             <button onclick="forceLogout()" style="margin-top:10px; border:1px solid #ccc; padding:5px 10px; border-radius:10px; font-family:Kanit;">สลับบัญชี</button>`;
    }
}

// 5. เตรียม Dropdown และ Checkbox (กรองตามเงื่อนไขที่ระบุ)
// แก้ไขฟังก์ชัน setupMetadata
function setupMetadata(data) {
    // 1. จัดการเรื่องวันที่และเดือนปัจจุบัน
    const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const now = new Date();
    const currentMonthName = thMonths[now.getMonth()];
    const currentYearTH = now.getFullYear() + 543; // แปลง ค.ศ. เป็น พ.ศ.
    const fullDateText = `${currentMonthName} ${currentYearTH}`;

    // 2. แสดงหัวข้อรายงานและบันทึกค่าลง Hidden Input
    const reportTitle = document.getElementById('report-title');
    const unitInput = document.getElementById('unit');
    const monthInput = document.getElementById('month');

    if (reportTitle) {
        reportTitle.innerText = `รายงานการประชุม ${currentUserUnit} ประจำเดือน ${fullDateText}`;
    }
    
    // บันทึกค่าลง Input เพื่อให้ตอน Submit ค่าเหล่านี้จะถูกส่งไปด้วย
    if (unitInput) unitInput.value = currentUserUnit;
    if (monthInput) monthInput.value = fullDateText;

    // 3. กรองรายชื่อพนักงาน (หน่วยงานเดียวกัน + ผจฟ.1)
    const attList = document.getElementById('attendance-list');
    if (attList && staffData.length > 0) {
        const filteredStaff = staffData.filter(s => 
            s.unit === currentUserUnit || s.unit === "ผจฟ.1"
        );

        attList.innerHTML = filteredStaff.map(s => 
            `<label style="display:block; margin-bottom:5px;">
                <input type="checkbox" name="attendance" value="${s.uid}"> ${s.name} 
                <span style="font-size:10px; color:gray;">(${s.unit})</span>
            </label>`
        ).join('');
    }
}

// 6. จัดการรูปภาพ
function handleImageSelect(input) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    selectedImages = [];
    Array.from(input.files).slice(0, 5).forEach(file => { // จำกัด 5 รูป
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImages.push({ name: file.name, data: e.target.result });
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = "70px";
            img.style.height = "70px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "8px";
            img.style.margin = "4px";
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

// 7. ส่งฟอร์มไป GAS
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerText = "⌛ กำลังส่งข้อมูล...";
    
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

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
        alert("❌ ไม่สำเร็จ: " + err.message);
        btn.disabled = false;
        btn.innerText = "✅ บันทึกรายงานทั้งหมด";
    }
};

// 8. เพิ่มแถวไดนามิก
function addEqRow() {
    const div = document.createElement('div');
    div.style.marginTop = "10px";
    div.style.padding = "10px";
    div.style.border = "1px solid #eee";
    div.style.borderRadius = "8px";
    div.innerHTML = `<input type="text" name="eq_id[]" placeholder="ชื่ออุปกรณ์" style="width:100%; padding:5px; border:1px solid #ddd;">
                     <textarea name="eq_detail[]" placeholder="อาการชำรุด" style="width:100%; margin-top:5px; padding:5px; border:1px solid #ddd;"></textarea>`;
    document.getElementById('eq-container').appendChild(div);
}

function addTaskRow() {
    const div = document.createElement('div');
    div.style.marginTop = "10px";
    div.style.padding = "10px";
    div.style.border = "1px solid #eee";
    div.style.borderRadius = "8px";
    div.innerHTML = `<select name="task_type[]" style="width:100%; padding:5px; border:1px solid #ddd;"><option>Assignment</option><option>Plan</option></select>
                     <input type="text" name="task_detail[]" placeholder="รายละเอียด..." style="width:100%; margin-top:5px; padding:5px; border:1px solid #ddd;">`;
    document.getElementById('task-container').appendChild(div);
}

// 9. ออกจากระบบ
function forceLogout() {
    if (confirm("ต้องการสลับไปใช้บัญชีอื่นใช่หรือไม่?")) {
        liff.logout();
        location.reload();
    }
}