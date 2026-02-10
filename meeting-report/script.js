const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";
let staffData = [];
let selectedImages = [];

window.onload = async () => {
    // 1. เริ่มรัน LIFF ทันที ไม่ต้องรอ fetch เสร็จ (ป้องกันการค้างหน้า Spinner)
    initLiff();

    // 2. ค่อยๆ ดึงข้อมูล Metadata ตามหลังมา
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        if (data) {
            staffData = data.staff || [];
            setupMetadata(data);
        }
    } catch (err) {
        console.warn("Fetch Metadata ล่าช้าหรือติด CORS:", err);
        // ถึง fetch พลาด แอปก็ยังต้องทำงานต่อได้
    }
};

function initLiff() {
    liff.init({ liffId: LIFF_ID }).then(() => {
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            liff.getProfile().then(profile => {
                // ให้เวลา Metadata โหลดสักนิดก่อนเช็คสิทธิ์
                setTimeout(() => checkAccess(profile), 800);
            });
        }
    }).catch(err => console.error("LIFF Error:", err));
}

function checkAccess(profile) {
    // ถ้าข้อมูลพนักงานยังไม่มา ให้รออีกนิด
    if (staffData.length === 0) {
        setTimeout(() => checkAccess(profile), 1000);
        return;
    }

    const user = staffData.find(s => s.line === profile.userId);
    if (user) {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        const welcomeEl = document.getElementById('welcome');
        if (welcomeEl) welcomeEl.innerText = `ยินดีต้อนรับ: ${user.name}`;
        
        // ใส่ค่า UID และ LINE ไว้ใน Hidden Input
        if (document.getElementById('recorder_uid')) document.getElementById('recorder_uid').value = user.uid;
        if (document.getElementById('recorder_line')) document.getElementById('recorder_line').value = user.line;
    } else {
        // กรณีไม่พบสิทธิ์
        const statusEl = document.getElementById('spinner-text');
        if (statusEl) statusEl.innerHTML = `<b style="color:red">ไม่พบสิทธิ์สำหรับ ID: ${profile.userId}</b>`;
        const actionEl = document.getElementById('spinner-action');
        if (actionEl) actionEl.innerHTML = `<button class="btn-primary" onclick="forceLogout()">สลับบัญชี</button>`;
    }
}

// ฟังก์ชันอื่นๆ (setupMetadata, showTab, handleImageSelect) ให้คงเดิมตามไฟล์ล่าสุดของคุณ