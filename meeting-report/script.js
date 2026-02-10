const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";
let staffData = [];
let selectedImages = [];

window.onload = async () => {
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        staffData = data.staff;
        setupMetadata(data);
        initLiff();
    } catch (err) {
        console.error(err);
        const spinner = document.getElementById('spinner-text');
        if (spinner) spinner.innerHTML = `<span style="color:red">❌ โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</span>`;
    }
};

function initLiff() {
    liff.init({ liffId: LIFF_ID }).then(() => {
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            liff.getProfile().then(profile => checkAccess(profile));
        }
    }).catch(err => console.error(err));
}

function checkAccess(profile) {
    if (!staffData || staffData.length === 0) {
        setTimeout(() => checkAccess(profile), 500);
        return;
    }

    const user = staffData.find(s => s.line === profile.userId);
    if (user) {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('welcome').innerText = `ยินดีต้อนรับ: ${user.name}`;
        
        const uidEl = document.getElementById('recorder_uid');
        const lineEl = document.getElementById('recorder_line');
        if (uidEl) uidEl.value = user.uid;
        if (lineEl) lineEl.value = user.line;
    } else {
        document.getElementById('spinner-text').innerHTML = `❌ ไม่พบสิทธิ์สำหรับ ID: ${profile.userId}`;
        document.getElementById('spinner-action').innerHTML = `<button class="btn-primary" onclick="forceLogout()">Login with another account</button>`;
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
        contents[i].classList.remove("active");
    }
    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = "block";
        target.classList.add("active");
    }

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
    if (confirm("ต้องการออกจากระบบ?")) {
        liff.logout();
        location.reload();
    }
}