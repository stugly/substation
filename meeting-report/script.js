const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";
let staffData = [];

window.onload = async () => {
    // 1. ดึงข้อมูลพนักงานก่อน
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        staffData = data.staff || [];
        setupMetadata(data);
        
        // 2. เมื่อได้ข้อมูลพนักงานแล้ว ค่อยรัน LIFF
        initLiff();
    } catch (err) { console.error(err); }
};

function initLiff() {
    liff.init({ liffId: LIFF_ID }).then(() => {
        if (!liff.isLoggedIn()) {
            // ส่งไปหน้า Login ของ LINE แท้ๆ (Argus จะใช้โหมดนี้)
            liff.login();
        } else {
            liff.getProfile().then(profile => checkAccess(profile));
        }
    }).catch(err => console.error(err));
}

function checkAccess(profile) {
    const user = staffData.find(s => s.line === profile.userId);
    if (user) {
        // ✅ มีสิทธิ์: ปิด Spinner เข้าแอปทันที
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('welcome').innerText = user.name;
        document.getElementById('recorder_uid').value = user.uid;
        document.getElementById('recorder_line').value = user.line;
    } else {
        // ❌ ไม่มีสิทธิ์
        document.getElementById('spinner-text').innerHTML = `<b style="color:red">ไม่พบสิทธิ์การใช้งานสำหรับ ID: ${profile.userId}</b><br><button onclick="forceLogout()" style="margin-top:10px;">สลับบัญชี</button>`;
    }
}

function forceLogout() {
    liff.logout();
    location.reload();
}

// ฟังก์ชันอื่นๆ (setupMetadata, showTab, handleImageSelect, onsubmit) ให้คงเดิม