const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";
let staffData = [];
let selectedImages = [];

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

// 3. ดึงข้อมูลจาก GAS หลัง Login สำเร็จ
async function loadAppData(profile) {
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        staffData = data.staff || [];
        
        setupMetadata(data);
        checkAccess(profile);
    } catch (err) {
        console.error("Data Load Error:", err);
    }
}

// 4. เตรียม Dropdown และ Checkbox รายชื่อพนักงาน
function setupMetadata(data) {
    const uSel = document.getElementById('unit');
    if (uSel) { uSel.innerHTML = ""; data.units.forEach(u => uSel.add(new Option(u, u))); }
    
    const mSel = document.getElementById('month');
    if (mSel) { mSel.innerHTML = ""; data.months.forEach(m => mSel.add(new Option(m, m))); }
    
    const attList = document.getElementById('attendance-list');
    if (attList) {
        attList.innerHTML = data.staff.map(s => 
            `<label><input type="checkbox" name="attendance" value="${s.uid}"> ${s.name}</label>`
        ).join('');
    }
}

// 5. เช็คสิทธิ์พนักงาน
function checkAccess(profile) {
    const user = staffData.find(s => s.line === profile.userId);
    if (user) {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('welcome').innerText = user.name;
        document.getElementById('recorder_uid').value = user.uid;
        document.getElementById('recorder_line').value = user.line;
    } else {
        document.getElementById('spinner-text').innerHTML = 
            `<b style="color:red">ไม่พบสิทธิ์สำหรับ ID: ${profile.userId}</b><br>
             <button onclick="forceLogout()" style="margin-top:10px; border:1px solid #ccc; padding:5px 10px; border-radius:10px;">สลับบัญชี</button>`;
    }
}

// 6. จัดการรูปภาพ
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

// 7. ส่งฟอร์มไป GAS (เพิ่มการเก็บค่าตัวแปรใหม่ๆ ให้ครบทุก Sheet)
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerText = "⌛ กำลังส่งข้อมูล...";
    
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    // ดึงค่าที่เป็น Array
    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.task_detail = Array.from(formData.getAll('task_detail[]'));
    payload.task_type = Array.from(formData.getAll('task_type[]'));
    payload.eq_id = Array.from(formData.getAll('eq_id[]'));
    payload.eq_detail = Array.from(formData.getAll('eq_detail[]'));

    // ดึงค่าตัวแปรจากกล่องข้อความที่เพิ่มเข้ามา (Tab 3-5)
    payload.site_detail = formData.get('site_detail') || "";
    payload.procure_detail = formData.get('procure_detail') || "";
    payload.assets_detail = formData.get('assets_detail') || "";
    payload.other_detail = formData.get('other_detail') || "";
    
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

// 8. เพิ่มแถวไดนามิก (ซ่อมบำรุง และ ภารกิจ)
function addEqRow() {
    const div = document.createElement('div');
    div.className = "dynamic-row card-inner"; 
    div.style.marginTop = "10px";
    div.style.padding = "10px";
    div.style.border = "1px solid #eee";
    div.style.borderRadius = "8px";
    div.innerHTML = `<input type="text" name="eq_id[]" placeholder="ชื่ออุปกรณ์" style="width:100%; border: 1px solid #ddd; padding: 5px;">
                     <textarea name="eq_detail[]" placeholder="อาการชำรุด" style="width:100%; margin-top:5px; border: 1px solid #ddd; padding: 5px;"></textarea>`;
    document.getElementById('eq-container').appendChild(div);
}

function addTaskRow() {
    const div = document.createElement('div');
    div.className = "dynamic-row card-inner";
    div.style.marginTop = "10px";
    div.style.padding = "10px";
    div.style.border = "1px solid #eee";
    div.style.borderRadius = "8px";
    div.innerHTML = `<select name="task_type[]" style="width:100%; border: 1px solid #ddd; padding: 5px;"><option>Assignment</option><option>Plan</option></select>
                     <input type="text" name="task_detail[]" placeholder="รายละเอียด..." style="width:100%; margin-top:5px; border: 1px solid #ddd; padding: 5px;">`;
    document.getElementById('task-container').appendChild(div);
}

// 9. ออกจากระบบ
function forceLogout() {
    if (confirm("ต้องการสลับไปใช้บัญชีอื่นใช่หรือไม่?")) {
        liff.logout();
        location.reload();
    }
}

if (profile.pictureUrl) {
    document.getElementById('user-avatar-placeholder').innerHTML = 
        `<img src="${profile.pictureUrl}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">`;
}