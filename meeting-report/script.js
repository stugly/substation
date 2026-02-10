const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";
let selectedImages = [];

// 1. เริ่มต้นระบบเมื่อโหลดหน้าเว็บ
window.onload = function() {
    initLiff();
};

// 2. เชื่อมต่อ LIFF
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

// 3. ดึงข้อมูลจาก Google Sheets ผ่าน GAS
async function loadAppData(profile) {
    try {
        console.log("Fetching data from GAS...");
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        
        staffData = data.staff || [];
        rawAppData = data; 

        // ตรวจสอบสิทธิ์ผู้ใช้งานจาก LINE ID
        const myId = profile.userId.trim();
        const user = staffData.find(s => s.line && s.line.trim() === myId);
        
        if (user) {
            currentUserUnit = user.unit;
            
            // ตั้งค่าข้อมูลเบื้องต้นลงหน้าฟอร์ม
            setupMetadata(data); 

            // ปิดหน้าจอโหลด และแสดงหน้าแอปหลัก
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('welcome').innerText = "สวัสดี, " + user.name;
            
            // แสดงรูปโปรไฟล์
            const avatarBox = document.getElementById('user-avatar-placeholder');
            if (avatarBox && profile.pictureUrl) {
                avatarBox.innerHTML = `<img src="${profile.pictureUrl}" style="width:100%; height:100%; object-fit:cover;">`;
            }

            // ใส่ค่าตัวตนผู้บันทึกลงใน Hidden Input
            document.getElementById('recorder_uid').value = user.uid;
            document.getElementById('recorder_line').value = user.line;

        } else {
            // กรณีไม่พบ LINE ID ในฐานข้อมูล Users
            document.getElementById('spinner-text').innerHTML = 
                `<div style="padding:20px; color:#d9534f; font-family:Kanit;">
                    <b>ไม่พบสิทธิ์การใช้งานในระบบ</b><br>
                    <small style="color:gray;">ID: ${myId}</small><br>
                    <p style="font-size:12px; margin-top:10px; color:#333;">กรุณานำ ID ด้านบนไปใส่ใน Sheet 'Users' คอลัมน์ C ให้ตรงกับชื่อของคุณครับ</p>
                    <button onclick="location.reload()" style="margin-top:15px; padding:8px 20px; border-radius:10px; border:1px solid #ccc; background:#f9f9f9;">ลองใหม่อีกครั้ง</button>
                </div>`;
        }
    } catch (err) {
        console.error("Data Load Error:", err);
        document.getElementById('spinner-text').innerText = "❌ ไม่สามารถโหลดข้อมูลได้: " + err.message;
    }
}

// 4. ตั้งค่าหัวข้อ วันที่ เวลา สถานที่ และรายชื่อ
function setupMetadata(data) {
    const now = new Date();
    const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const currentMonthName = thMonths[now.getMonth()];
    const currentYearTH = now.getFullYear() + 543;
    const fullDateText = `${currentMonthName} ${currentYearTH}`;

    // ใส่ชื่อหน่วยงานและเดือนในหัวข้อรายงาน
    const reportTitle = document.getElementById('report-title');
    if (reportTitle) reportTitle.innerText = `รายงานการประชุม ${currentUserUnit} ประจำเดือน ${fullDateText}`;
    
    // ใส่ค่าลงใน Hidden Input สำหรับส่งไปเก็บใน Sheet
    document.getElementById('unit').value = currentUserUnit;
    document.getElementById('month').value = fullDateText;

    // ตั้งค่า วันที่ และ เวลาปัจจุบัน เป็น Default
    document.getElementById('meeting_date').value = now.toISOString().split('T')[0];
    document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    // แก้ไขในส่วนสถานที่ภายในฟังก์ชัน setupMetadata
    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        
        const myUnit = currentUserUnit ? currentUserUnit.trim() : "";
        // กรองเฉพาะสถานีที่ Unit ตรงกัน
        const myStations = data.stations.filter(s => s.unit && s.unit.trim() === myUnit);
        
        if (myStations.length > 0) {
            myStations.forEach(s => {
                // แสดงผล (Text): สฟฟ. + ชื่อสถานี
                // ค่าบันทึก (Value): ชื่อสถานีปกติ (SName)
                let displayText = "สฟฟ." + s.name;
                let opt = new Option(displayText, s.name); 
                locSel.add(opt);
            });
        } else {
            // กรณีไม่เจอสถานีใน Unit ตัวเอง ให้ดึงทั้งหมดมาแสดงเป็นสำรอง
            data.stations.forEach(s => {
                locSel.add(new Option("สฟฟ." + s.name, s.name));
            });
        }
    }


    // ตั้งค่ารายชื่อผู้เข้าประชุม (Unit ตัวเองก่อน ตามด้วย ผจฟ.1)
    const attList = document.getElementById('attendance-list');
    if (attList && staffData.length > 0) {
        let filteredStaff = staffData.filter(s => s.unit === currentUserUnit || s.unit === "ผจฟ.1");
        
        filteredStaff.sort((a, b) => {
            if (a.unit === currentUserUnit && b.unit !== currentUserUnit) return -1;
            if (a.unit !== currentUserUnit && b.unit === currentUserUnit) return 1;
            return 0;
        });

        // แก้ไขในส่วนแสดงรายชื่อพนักงานภายในฟังก์ชัน setupMetadata
        attList.innerHTML = filteredStaff.map(s => 
            `<label style="display:block; margin-bottom:8px; font-size:14px;">
                <input type="checkbox" name="attendance" value="${s.uid}"> ${s.name} 
                <span style="font-size:10px; color:${s.unit === 'ผจฟ.1' ? '#f39c12' : '#06C755'}; font-weight:bold;">
                    (${s.unit})
                </span>
            </label>`
        ).join('');
    }
    document.getElementById('task-container').innerHTML = '';
    addTaskRow();
}

// 5. จัดการการเลือกรูปภาพและ Preview
function handleImageSelect(input) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    selectedImages = [];
    
    Array.from(input.files).slice(0, 5).forEach(file => {
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

// 6. ส่งข้อมูลฟอร์มทั้งหมดไปที่ GAS
document.getElementById('reportForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    
    if (!confirm("ยืนยันการบันทึกรายงานข้อมูลทั้งหมด?")) return;

    btn.disabled = true;
    btn.innerText = "⌛ กำลังบันทึกข้อมูล...";
    
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    // รวบรวมข้อมูลที่เป็น Array
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
        location.reload(); // บันทึกสำเร็จแล้วรีโหลดหน้าใหม่
    } catch (err) {
        alert("❌ บันทึกไม่สำเร็จ: " + err.message);
        btn.disabled = false;
        btn.innerText = "✅ บันทึกรายงานทั้งหมด";
    }
};

// 7. ฟังก์ชันเพิ่มแถวข้อมูลอุปกรณ์และภารกิจ
function addEqRow() {
    const container = document.getElementById('eq-container');
    const div = document.createElement('div');
    div.style.cssText = "margin-top:10px; padding:10px; border:1px solid #eee; border-radius:8px; background:#fcfcfc;";
    div.innerHTML = `
        <input type="text" name="eq_id[]" placeholder="ชื่ออุปกรณ์/รหัส" style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px;">
        <textarea name="eq_detail[]" placeholder="อาการชำรุด/แนวทางแก้ไข" style="width:100%; margin-top:5px; padding:6px; border:1px solid #ddd; border-radius:4px;"></textarea>
    `;
    container.appendChild(div);
}

function addTaskRow() {
    const container = document.getElementById('task-container');
    const rows = container.getElementsByClassName('task-row');
    
    // ตรวจสอบช่องว่างก่อนเพิ่มแถวใหม่
    if (rows.length > 0) {
        const lastInput = rows[rows.length - 1].querySelector('input[name="task_detail[]"]');
        if (lastInput && lastInput.value.trim() === "") {
            alert("กรุณากรอกรายละเอียดงานในช่องก่อนหน้าก่อนครับ");
            lastInput.focus();
            return;
        }
    }

    const div = document.createElement('div');
    div.className = "task-row";
    
    div.innerHTML = `
        <div class="task-header">
            <select name="task_type[]">
                <option value="มอบหมาย">🚩 งานมอบหมาย</option>
                <option value="แผนงาน">📅 แผนประจำเดือน</option>
            </select>
            <button type="button" onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: #ff4d4d; cursor: pointer; padding: 5px;">
                <i class="fa-solid fa-trash-can"></i> ลบ
            </button>
        </div>
        <input type="text" name="task_detail[]" placeholder="ระบุรายละเอียดงานที่นี่..." required>
    `;
    container.appendChild(div);
}