const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";
let staffData = [];
let selectedImages = [];

window.onload = async () => {
    // รัน LIFF ทันที
    initLiff();

    // ดึงข้อมูลพนักงาน
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        if (data) {
            staffData = data.staff || [];
            setupMetadata(data);
        }
    } catch (err) {
        console.error("Fetch GAS Error:", err);
    }
};

function initLiff() {
    liff.init({ liffId: LIFF_ID }).then(() => {
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            liff.getProfile().then(profile => {
                checkAccess(profile);
            });
        }
    }).catch(err => console.error("LIFF Init Failed:", err));
}

function checkAccess(profile) {
    // ถ้ายังโหลดข้อมูลพนักงานไม่เสร็จ ให้รอแป๊บเดียว
    if (staffData.length === 0) {
        setTimeout(() => checkAccess(profile), 800);
        return;
    }

    const user = staffData.find(s => s.line === profile.userId);
    
    if (user) {
        // ✅ ผ่านสิทธิ์
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        const welcomeEl = document.getElementById('welcome');
        if (welcomeEl) welcomeEl.innerText = `ยินดีต้อนรับ: ${user.name}`;
        
        if (document.getElementById('recorder_uid')) document.getElementById('recorder_uid').value = user.uid;
        if (document.getElementById('recorder_line')) document.getElementById('recorder_line').value = user.line;
    } else {
        // ❌ ไม่พบพนักงานคนนี้
        document.getElementById('spinner-text').innerHTML = `
            <b style="color:#dc3545;">ไม่พบสิทธิ์การใช้งานสำหรับ ID นี้</b><br>
            <small style="color:#888;">ID: ${profile.userId}</small>
        `;
        // ปุ่มสลับบัญชีถูกโชว์อยู่ใน HTML อยู่แล้ว
    }
}

function setupMetadata(data) {
    const uSel = document.getElementById('unit');
    if (uSel) {
        uSel.innerHTML = "";
        data.units.forEach(u => uSel.add(new Option(u, u)));
    }
    const mSel = document.getElementById('month');
    if (mSel) {
        mSel.innerHTML = "";
        data.months.forEach(m => mSel.add(new Option(m, m)));
    }
    const attList = document.getElementById('attendance-list');
    if (attList) {
        attList.innerHTML = data.staff.map(s => 
            `<label><input type="checkbox" name="attendance" value="${s.uid}"> ${s.name}</label>`
        ).join('');
    }
}

function showTab(evt, tabId, tabName) {
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) {
        contents[i].style.display = "none";
    }
    document.getElementById(tabId).style.display = "block";

    const circles = document.getElementsByClassName("step-circle");
    for (let i = 0; i < circles.length; i++) {
        circles[i].classList.remove("active");
    }
    evt.currentTarget.classList.add("active");
    document.getElementById('current-tab-title').innerText = tabName;
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    payload.images = selectedImages;

    try {
        const response = await fetch(GAS_WEBAPP_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.text();
        alert(result);
        location.reload();
    } catch (err) {
        alert("❌ บันทึกไม่สำเร็จ");
        btn.disabled = false;
        btn.innerText = "✅ บันทึกรายงานทั้งหมด";
    }
};

function addTaskRow() {
    const div = document.createElement('div');
    div.className = "card"; div.style.marginTop = "10px";
    div.innerHTML = `<select name="task_type[]" style="width:100%"><option>Assignment</option><option>Plan</option></select>
                     <input type="text" name="task_detail[]" placeholder="รายละเอียด..." style="width:100%; margin-top:5px;">`;
    document.getElementById('task-container').appendChild(div);
}

function addEqRow() {
    const div = document.createElement('div');
    div.className = "card"; div.style.marginTop = "10px";
    div.innerHTML = `<input type="text" name="eq_id[]" placeholder="ชื่ออุปกรณ์" style="width:100%;">
                     <textarea name="eq_detail[]" placeholder="อาการชำรุด" style="width:100%; margin-top:5px;"></textarea>`;
    document.getElementById('eq-container').appendChild(div);
}

function forceLogout() {
    if (confirm("ต้องการสลับไปใช้บัญชีอื่นหรือไม่?")) {
        liff.logout();
        location.reload();
    }
}