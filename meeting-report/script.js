const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";
let staffData = [];
let selectedImages = [];

window.onload = async () => {
    // แสดง Spinner ไว้ตั้งแต่เริ่ม (ถูกตั้งใน HTML อยู่แล้ว)
    try {
        // 1. ดึงข้อมูลพนักงานจาก GAS ก่อนเป็นอันดับแรก
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);

        staffData = data.staff;
        setupMetadata(data);
        
        // 2. เมื่อข้อมูลพนักงานมาครบแล้ว ค่อยเริ่มรัน LIFF
        initLiff();
    } catch (err) {
        console.error(err);
        document.getElementById('spinner').innerHTML = `
            <div style="color: red; padding: 20px;">
                <h3>❌ ไม่สามารถโหลดข้อมูลได้</h3>
                <p>กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</p>
                <button onclick="location.reload()" style="padding:10px 20px; border-radius:20px; border:none; background:#28a745; color:#fff;">ลองใหม่อีกครั้ง</button>
            </div>
        `;
    }
};


function initLiff() {
    liff.init({ liffId: LIFF_ID }).then(() => {
        if (!liff.isLoggedIn()) {
            // ถ้ายังไม่ Login ให้สั่ง Login ทันที (จะ Redirect ไปหน้า LINE)
            liff.login();
        } else {
            // ถ้า Login แล้ว ตรวจสอบสิทธิ์ทันที
            liff.getProfile().then(profile => checkAccess(profile));
        }
    }).catch(err => {
        console.error("LIFF Initialization failed", err);
    });
}


function checkAccess(profile) {
    // 1. ตรวจสอบว่า staffData โหลดมาหรือยัง (ป้องกันการค้างถ้า GAS ตอบช้า)
    if (!staffData || staffData.length === 0) {
        console.log("Waiting for staff data...");
        // ให้ลองเช็คใหม่ทุกๆ 500 มิลลิวินาที จนกว่าข้อมูลจะมา
        setTimeout(() => checkAccess(profile), 500);
        return;
    }

    const user = staffData.find(s => s.line === profile.userId);
    
    if (user) {
        // ✅ ผ่านสิทธิ์: ซ่อนหน้าโหลดและโชว์หน้าแอป
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        document.getElementById('welcome').innerText = `ยินดีต้อนรับ: ${user.name}`;
        
        // ตรวจสอบว่ามี Element เหล่านี้ใน HTML หรือไม่ก่อนใส่ค่า
        const uidEl = document.getElementById('recorder_uid');
        const lineEl = document.getElementById('recorder_line');
        if (uidEl) uidEl.value = user.uid;
        if (lineEl) lineEl.value = user.line;
        
        console.log("Access Granted:", user.name);
    } else {
        // ❌ ไม่พบสิทธิ์
        const textEl = document.getElementById('spinner-text');
        const actionEl = document.getElementById('spinner-action');
        
        if (textEl) textEl.innerHTML = `
            <span style="color: #dc3545; font-weight: 500;">❌ ไม่พบสิทธิ์การใช้งานสำหรับบัญชีนี้</span><br>
            <small style="color: #999;">ID: ${profile.userId}</small>
        `;
        
        if (actionEl) actionEl.innerHTML = `
            <button class="btn-primary" onclick="forceLogout()" style="padding: 12px 25px; border-radius: 25px; margin-top: 10px;">
                Login to another account
            </button>
        `;
    }
}

// --- ฟังก์ชันการทำงานของฟอร์ม (คงเดิม) ---

function setupMetadata(data) {
    const uSel = document.getElementById('unit');
    uSel.innerHTML = ""; // Clear old options
    data.units.forEach(u => uSel.add(new Option(u, u)));
    
    const mSel = document.getElementById('month');
    mSel.innerHTML = "";
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
    // 1. ซ่อนทุก Tab Content
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) {
        contents[i].style.display = "none";
    }

    // 2. แสดง Tab ที่เลือก
    document.getElementById(tabId).style.display = "block";

    // 3. ปรับสีปุ่มตัวเลข
    const circles = document.getElementsByClassName("step-circle");
    for (let i = 0; i < circles.length; i++) {
        circles[i].classList.remove("active");
    }
    evt.currentTarget.classList.add("active");

    // 4. อัปเดตชื่อหัวข้อตัวหนังสือ
    document.getElementById('current-tab-title').innerText = tabName;
    
    // เลื่อนหน้าจอกลับขึ้นบน
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    const originalText = btn.innerText;
    
    btn.disabled = true;
    btn.innerText = "⌛ กำลังส่งข้อมูล...";

    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    payload.attendance = Array.from(formData.getAll('attendance'));
    payload.task_detail = Array.from(formData.getAll('task_detail[]'));
    payload.task_type = Array.from(formData.getAll('task_type[]'));
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
        alert("❌ บันทึกไม่สำเร็จ: " + err.message);
        btn.disabled = false;
        btn.innerText = originalText;
    }
};

function addTaskRow() {
    const div = document.createElement('div');
    div.className = "card";
    div.style.marginTop = "10px";
    div.innerHTML = `
        <select name="task_type[]" style="width:100%;"><option>Assignment</option><option>Plan</option></select>
        <input type="text" name="task_detail[]" placeholder="รายละเอียด..." style="width:100%; margin-top:5px;">`;
    document.getElementById('task-container').appendChild(div);
}

function addEqRow() {
    const div = document.createElement('div');
    div.className = "card";
    div.style.marginTop = "10px";
    div.innerHTML = `
        <input type="text" name="eq_id[]" placeholder="ชื่ออุปกรณ์" style="width:100%;">
        <textarea name="eq_detail[]" placeholder="อาการชำรุด" style="width:100%; margin-top:5px;"></textarea>`;
    document.getElementById('eq-container').appendChild(div);
}

function forceLogout() {
    if (confirm("คุณต้องการออกจากระบบเพื่อเข้าใช้งานด้วยบัญชีอื่นใช่หรือไม่?")) {
        liff.logout();
        location.reload();
    }
}