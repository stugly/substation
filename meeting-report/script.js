const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwe_OPptH3rOfFH2usmXvKbN45tXw1HSldiAzM7MIxYPCHPUFvs4x7q6k2gxDOZIeAD/exec";
const LIFF_ID = "2008876139-kiwCd2kF";
let staffData = [];
let selectedImages = [];
let currentUser = null;

window.onload = async () => {
    initLiff();
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        const data = await response.json();
        staffData = data.staff || [];
        setupMetadata(data);
    } catch (err) { console.error(err); }
};

function initLiff() {
    liff.init({ liffId: LIFF_ID }).then(() => {
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            liff.getProfile().then(profile => checkAccess(profile));
        }
    });
}

function checkAccess(profile) {
    if (staffData.length === 0) {
        setTimeout(() => checkAccess(profile), 500);
        return;
    }

    const user = staffData.find(s => s.line === profile.userId);
    
    if (user) {
        // ✅ พบสิทธิ์: แทนที่จะเข้าแอปเลย ให้หยุดที่หน้าเลือกบัญชีก่อน
        currentUser = user;
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('account-selection').style.display = 'flex';
        
        // แสดงข้อมูลในหน้าเลือกบัญชี
        document.getElementById('user-img').src = profile.pictureUrl || 'https://via.placeholder.com/80';
        document.getElementById('user-name-label').innerText = user.name;
    } else {
        // ❌ ไม่พบสิทธิ์
        document.getElementById('spinner-text').innerHTML = `<b style="color:red">ไม่พบสิทธิ์การใช้งานสำหรับ ID: ${profile.userId}</b>`;
    }
}

// ฟังก์ชันเมื่อกดปุ่ม "เข้าใช้งานด้วยชื่อนี้"
function enterApp() {
    if (!currentUser) return;
    
    document.getElementById('account-selection').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    document.getElementById('welcome').innerText = `ยินดีต้อนรับ: ${currentUser.name}`;
    document.getElementById('recorder_uid').value = currentUser.uid;
    document.getElementById('recorder_line').value = currentUser.line;
}

function forceLogout() {
    if (confirm("ต้องการออกจากระบบเพื่อใช้บัญชีอื่นใช่หรือไม่?")) {
        liff.logout();
        location.reload();
    }
}

// ฟังก์ชัน Metadata และ Tab คงเดิม...