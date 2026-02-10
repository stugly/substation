const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";

let staffData = [];
let rawAppData = null;
let currentUserUnit = "";
let selectedImages = [];

window.onload = function() {
    initLiff();
};

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

async function loadAppData(profile) {
    try {
        console.log("Fetching data...");
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        
        staffData = data.staff || [];
        rawAppData = data; 

        // ตรวจสอบสิทธิ์ผู้ใช้งาน
        const myId = profile.userId.trim();
        const user = staffData.find(s => s.line && s.line.trim() === myId);
        
        if (user) {
            currentUserUnit = user.unit;
            
            // 1. ตั้งค่าข้อมูลลงฟอร์มทันที
            setupMetadata(data); 

            // 2. แสดงหน้าแอป
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('welcome').innerText = "สวัสดี, " + user.name;
            
            if (profile.pictureUrl) {
                document.getElementById('user-avatar-placeholder').innerHTML = 
                    `<img src="${profile.pictureUrl}" style="width:100%; height:100%; object-fit:cover;">`;
            }

            // 3. ใส่ค่า Hidden Fields
            document.getElementById('recorder_uid').value = user.uid;
            document.getElementById('recorder_line').value = user.line;

        } else {
            // กรณีหา User ไม่เจอ
            document.getElementById('spinner-text').innerHTML = 
                `<div style="padding:20px; color:red;">
                    <b>ไม่พบสิทธิ์การใช้งาน</b><br>
                    <small style="color:gray;">ID: ${myId}</small><br>
                    <p style="font-size:12px; margin-top:10px; color:#333;">กรุณานำ ID นี้ไปใส่ใน Sheet 'Users' คอลัมน์ C</p>
                    <button onclick="location.reload()" style="margin-top:10px; padding:5px 15px;">ลองใหม่อีกครั้ง</button>
                </div>`;
        }
    } catch (err) {
        console.error("Load Error:", err);
    }
}

function setupMetadata(data) {
    const now = new Date();
    const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const fullDateText = `${thMonths[now.getMonth()]} ${now.getFullYear() + 543}`;

    // --- ส่วนแสดงผลหัวข้อและค่า Hidden ---
    document.getElementById('report-title').innerText = `รายงานการประชุม ${currentUserUnit} ประจำเดือน ${fullDateText}`;
    document.getElementById('unit').value = currentUserUnit;
    document.getElementById('month').value = fullDateText;

    // --- ส่วนค่า Default วันที่และเวลา ---
    document.getElementById('meeting_date').value = now.toISOString().split('T')[0];
    document.getElementById('start_time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    // --- ส่วน Dropdown สถานที่ (SName จาก Unit เดียวกัน) ---
    const locSel = document.getElementById('location');
    if (locSel && data.stations) {
        locSel.innerHTML = '<option value="">-- สถานที่ --</option>';
        const myStations = data.stations.filter(s => s.unit === currentUserUnit);
        myStations.forEach(s => locSel.add(new Option(s.name, s.name)));
    }

    // --- ส่วนรายชื่อผู้เข้าประชุม ---
    const attList = document.getElementById('attendance-list');
    if (attList && staffData.length > 0) {
        let filteredStaff = staffData.filter(s => s.unit === currentUserUnit || s.unit === "ผจฟ.1");
        // เรียงลำดับ Unit ตัวเองขึ้นก่อน
        filteredStaff.sort((a, b) => (a.unit === currentUserUnit ? -1 : 1));

        attList.innerHTML = filteredStaff.map(s => 
            `<label style="display:block; margin-bottom:8px;">
                <input type="checkbox" name="attendance" value="${s.uid}"> ${s.name} 
                <span style="font-size:10px; color:${s.unit === 'ผจฟ.1' ? '#f39c12' : '#06C755'};">(${s.unit})</span>
            </label>`
        ).join('');
    }
}

// ฟังก์ชันอื่นๆ (handleImageSelect, addEqRow, addTaskRow, onsubmit) ให้คงเดิมจากเวอร์ชันก่อนหน้า