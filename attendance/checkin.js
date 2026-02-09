const LIFF_ID = "2008876139-ISUrdRGi"; 
const API_URL = "https://script.google.com/macros/s/AKfycbzT2U6Zf9q-ieWioQw5e1BohRYjTyqVb9mo3N6-O3-wF3U3QTYgg9LC8ia2A8oWtXwT/exec";

const ADMIN_LINE_ID = ""; 

let profile = { userId: "GUEST" }, map, marker, currentLat, currentLon, nearbyStationsData = [];

async function main() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) { liff.login(); return; }
        
        profile = await liff.getProfile();
        if (profile.pictureUrl) {
            const img = document.getElementById("profileImg");
            if(img) { img.src = profile.pictureUrl; img.style.display = "block"; }
        }

        showSpinner(true); 
        
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "checkUser", lineUserId: profile.userId, lineName: profile.displayName })
        });
        const data = await res.json();

        if (data.status === "FOUND") {
            document.getElementById("welcome").innerText = "สวัสดี, " + data.user.Name;
            document.getElementById("mainSection").style.display = "block";
            initMap(); 
            await loadJobs(); 
        } else {
            const sel = document.getElementById("userSelect");
            sel.innerHTML = '<option value="">-- เลือกชื่อ --</option>';
            if (data.freeUsers) {
                data.freeUsers.forEach(u => {
                    let o = document.createElement("option"); o.value = u.UID; o.text = u.Name; sel.appendChild(o);
                });
            }
            document.getElementById("bindSection").style.display = "block";
        }
    } catch (error) {
        console.error("Checkin Error:", error);
    } finally {
        showSpinner(false); 
    }
}

async function loadJobs() {
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "getJobs" }) });
        const data = await res.json();
        const sel = document.getElementById("jobSelect");
        if (sel && data.status === "OK") {
            const now = new Date();
            const currentHM = now.getHours() * 100 + now.getMinutes();
            const isWeekend = [0, 6].includes(now.getDay());
            const isAdmin = (profile.userId === ADMIN_LINE_ID);

            sel.innerHTML = '<option value="">-- เลือกประเภทงาน --</option>';
            data.jobs.forEach(jobName => {
                let isVisible = false;
                const name = jobName.trim();
                if (isAdmin) { isVisible = true; } 
                else {
                    if (name.includes("2")) { if (currentHM >= 700 && currentHM < 1500) isVisible = true; } 
                    else if (name.includes("3")) { if (currentHM >= 1500 && currentHM < 2300) isVisible = true; } 
                    else if (name.includes("Day Time")) { if (!isWeekend && currentHM >= 730 && currentHM <= 1530) isVisible = true; } 
                    else { isVisible = true; }
                }
                if (isVisible) {
                    let o = document.createElement("option"); o.value = name; o.text = name; sel.appendChild(o); 
                }
            });
            if (sel.options.length <= 1) sel.innerHTML = '<option value="">❌ นอกเวลาปฏิบัติงาน</option>';
        }
    } catch (e) { console.error(e); }
}

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([13.7, 100.5], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    moveToCurrent();
}

function moveToCurrent() {
    navigator.geolocation.getCurrentPosition(pos => {
        currentLat = pos.coords.latitude; currentLon = pos.coords.longitude;
        if (marker) map.removeLayer(marker);
        marker = L.marker([currentLat, currentLon], {
            icon: L.divIcon({
                className: 'user-icon',
                html: `<div style="position:relative;"><div class="pulse"></div><div style="font-size: 26px; position:relative; z-index:2;">👤</div></div>`,
                iconSize: [30, 30], iconAnchor: [15, 15]
            })
        }).addTo(map);
        map.setView([currentLat, currentLon], 16);
        loadStations();
    }, (err) => { loadStations(); }, { enableHighAccuracy: true });
}

async function loadStations() {
    try {
        const response = await fetch(`${API_URL}?action=getAllStations&t=${new Date().getTime()}`);
        const data = await response.json();
        const sel = document.getElementById("stationSelect");
        if (!sel) return;
        sel.innerHTML = "";
        
        // 🚩 เก็บข้อมูลสถานีทั้งหมดไว้ใน nearbyStationsData เพื่อใช้หา Unit ตอนกด Check-in
        nearbyStationsData = data.allStations || [];
        const stations = nearbyStationsData;

        map.eachLayer(layer => { if (layer instanceof L.Marker && layer !== marker) map.removeLayer(layer); });

        let inRangeCount = 0;
        stations.forEach(st => {
            const sLat = parseFloat(st.Lat), sLon = parseFloat(st.Lon);
            const radius = parseFloat(st.Radius_m) || 50;
            if (!isNaN(sLat) && !isNaN(sLon)) {
                const dist = map.distance([currentLat, currentLon], [sLat, sLon]);
                const isInRange = dist <= radius;
                L.marker([sLat, sLon], {
                    icon: L.divIcon({
                        className: 'station-icon',
                        html: `<i class="fa-solid fa-location-dot" style="color: ${isInRange ? '#28a745' : '#dc3545'}; font-size: 22px;"></i>`,
                        iconSize: [20, 25], iconAnchor: [10, 25]
                    })
                }).addTo(map).bindPopup(`<b>${st.SName}</b><br>ห่าง: ${Math.round(dist)} ม.`);
                if (isInRange) {
                    inRangeCount++;
                    let o = document.createElement("option"); o.value = st.SID; o.text = `${st.SName} (${Math.round(dist)} ม.)`; sel.appendChild(o);
                }
            }
        });
        const btn = document.getElementById("checkinBtn");
        if (btn) btn.disabled = (inRangeCount === 0);
        if (inRangeCount === 0) sel.innerHTML = "<option>❌ นอกรัศมีเช็คอิน</option>";
    } catch (e) { console.error(e); }
}

async function confirmCheckin() {
    const sid = document.getElementById("stationSelect").value;
    const job = document.getElementById("jobSelect").value;
    const note = document.getElementById("note").value;
    const weatherElem = document.querySelector('input[name="weather"]:checked');
    const weather = weatherElem ? weatherElem.value : "1";

    if (!sid || sid.includes("❌")) return alert("กรุณาเลือกสถานีไฟฟ้าในรัศมี");
    if (!job) return alert("กรุณาเลือกประเภทงาน");

    // 🚩 หาข้อมูลสถานีที่เลือก เพื่อดึงค่า Unit มาส่ง
    const selectedStation = nearbyStationsData.find(s => s.SID === sid);
    const unitValue = selectedStation ? selectedStation.Unit : "-";

    try {
        showSpinner(true);
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "checkin", 
                lineUserId: profile.userId, 
                lineName: profile.displayName, 
                SID: sid,      
                Job: job,      
                Weather: weather, 
                Note: note,    
                Unit: unitValue,
                lat: currentLat,
                lon: currentLon, 
                Device: getDeviceInfo()           
            })
        });
        const data = await res.json();
        if (data.status === "OK") { 
            alert("✅ บันทึกสำเร็จ"); 
            liff.closeWindow(); 
        }
        else { alert("❌ Error: " + data.message); }
    } catch (e) { alert("❌ ส่งข้อมูลไม่ได้"); } finally { showSpinner(false); }
}

async function confirmBind() {
    const uid = document.getElementById("UID").value;
    const selectedUID = document.getElementById("userSelect").value;
    if (!selectedUID || uid !== selectedUID) return alert("รหัสพนักงานไม่ถูกต้อง");
    try {
        showSpinner(true);
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "bindUser", lineUserId: profile.userId, lineName: profile.displayName, uid })
        });
        const data = await res.json();
        if (data.status === "OK") { alert("✅ ผูกบัญชีสำเร็จ"); location.reload(); }
    } catch (e) { alert("Error"); } finally { showSpinner(false); }
}

function showSpinner(show) { 
    const s = document.getElementById("spinner"); 
    if(s) s.style.display = show ? "flex" : "none"; 
}

function getDeviceInfo() {
    const ua = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    const screen = window.screen;
    
    let deviceType = "Mobile";

    // 🚩 ตรวจสอบร่องรอย Emulator
    const isEmulator = 
        ua.includes("nexus") || ua.includes("pixel") || // Emulator มักใช้ชื่อรุ่น Google
        ua.includes("bluestacks") || 
        ua.includes("nox") ||
        platform.includes("win") || // ถ้า Platform เป็น Windows แต่ส่งมาเป็น Android = ปลอม
        (screen.width > 1024 && !ua.includes("ipad")); // จอใหญ่เกินมือถือปกติ

    if (isEmulator) {
        deviceType = "🛑 EMULATOR/PC";
    } else if (/android/i.test(ua)) {
        deviceType = "Android";
    } else if (/iphone|ipad|ipod/i.test(ua)) {
        deviceType = "iOS";
    }

    // ส่งค่ากลับไปบันทึก (ระบุรุ่นละเอียดเพื่อให้เรามาไล่ดูเองได้ด้วย)
    return `${deviceType} | ${ua.split('(')[1] ? ua.split('(')[1].split(')')[0] : ua}`;
}

main();