const LIFF_ID = "2008876139-ISUrdRGi"; 
const API_URL = "https://script.google.com/macros/s/AKfycbzT2U6Zf9q-ieWioQw5e1BohRYjTyqVb9mo3N6-O3-wF3U3QTYgg9LC8ia2A8oWtXwT/exec";


const ADMIN_LINE_ID = ""; 
//U15acdf3b0f3ba205f9d49111f6595068

let profile = { userId: "GUEST" }, map, marker, currentLat, currentLon, nearbyStationsData = [];

async function main() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) { liff.login(); return; }
        
        profile = await liff.getProfile();
        if (profile.pictureUrl) {
            document.getElementById("profileImg").src = profile.pictureUrl;
            document.getElementById("profileImg").style.display = "block";
        }

        toggleSpinner(true); // เริ่มหมุน
        
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "checkUser", lineUserId: profile.userId, lineName: profile.displayName })
        });
        const data = await res.json();

        if (data.status === "FOUND") {
            document.getElementById("welcome").innerText = "สวัสดี, " + data.user.Name;
            document.getElementById("mainSection").style.display = "block";
            initMap(); 
            await loadJobs(); // 🚩 รอให้โหลด Job เสร็จก่อนค่อยปิด Spinner ทีเดียว
        } else {
            // ส่วนของ NEED_BIND
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
        alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        toggleSpinner(false); // 🚩 ไม่ว่าจะ FOUND, NEED_BIND หรือ Error ต้องหยุดหมุนที่นี่
    }
}

async function loadJobs() {
    try {
        const res = await fetch(API_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "getJobs" }) 
        });
        const data = await res.json();
        const sel = document.getElementById("jobSelect");
        
        if (sel && data.status === "OK") {
            const now = new Date();
            // 🚩 currentHM ต้องเป็นตัวเลข เช่น 1415 (บ่าย 2 โมง 15 นาที)
            const currentHM = now.getHours() * 100 + now.getMinutes();
            const isWeekend = [0, 6].includes(now.getDay());
            
            // ตรวจสอบสถานะ Admin (ถ้า ID ไม่ตรง จะได้ค่า false)
            const isAdmin = (profile.userId === ADMIN_LINE_ID);

            sel.innerHTML = '<option value="">-- เลือกประเภทงาน --</option>';
            
            data.jobs.forEach(jobName => {
                let isVisible = false;
                const name = jobName.trim();

                if (isAdmin) {
                    isVisible = true; 
                } else {
                    // --- 🚩 Logic การกรองกะพนักงาน (ปรับช่วงเวลาไม่ให้ทับกัน) ---
                    if (name.includes("2")) {
                        // เปิด 07:00 - 14:59 (พอ 15:00 ปุ๊บ กะ 2 จะหายไปทันที)
                        if (currentHM >= 700 && currentHM < 1400) isVisible = true;
                    } 
                    else if (name.includes("3")) {
                        // เปิด 15:00 - 22:59
                        if (currentHM >= 1400 && currentHM < 2300) isVisible = true;
                    } 
                    else if (name.includes("Day Time")) {
                        // เปิด 07:30 - 15:30 (จ-ศ)
                        if (!isWeekend && currentHM >= 730 && currentHM <= 1530) isVisible = true;
                    } 
                    else {
                        // งานอื่นๆ ที่ไม่มีคำ Keyword ด้านบน ให้เห็นตลอด
                        isVisible = true; 
                    }
                }

                if (isVisible) {
                    let o = document.createElement("option"); 
                    o.value = name; 
                    o.text = isAdmin ? `[Test] ${name}` : name; 
                    sel.appendChild(o); 
                }
            });

            if (sel.options.length <= 1) {
                sel.innerHTML = '<option value="">❌ นอกเวลาปฏิบัติงาน</option>';
            }
        }
    } catch (e) { console.error("Load Jobs Error", e); }
}
function initMap() {
    map = L.map('map', { zoomControl: false }).setView([13.7, 100.5], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    moveToCurrent();
}
function moveToCurrent() {
    navigator.geolocation.getCurrentPosition(pos => {
        currentLat = pos.coords.latitude; currentLon = pos.coords.longitude;
        marker = L.circleMarker([currentLat, currentLon], { radius: 8, fillColor: "#28a745", color: "#fff", weight: 2, fillOpacity: 0.9 }).addTo(map);
        map.setView([currentLat, currentLon], 16);
        loadStations();
    }, () => {
        console.warn("GPS เข้าถึงไม่ได้ ใช้พิกัดจำลอง");
        currentLat = 13.75; currentLon = 100.52;
        loadStations();
    }, { enableHighAccuracy: true });
}
async function loadStations() {
    try {
        const response = await fetch(`${API_URL}?action=getAllStations&t=${new Date().getTime()}`);
        const data = await response.json();
        const sel = document.getElementById("stationSelect");
        if (!sel) return;
        sel.innerHTML = "";
        const stations = data.allStations || []; nearbyStationsData = stations;
        let inRangeCount = 0;
        stations.forEach(st => {
            const dist = map.distance([currentLat, currentLon], [st.Lat, st.Lon]);
            if (dist <= (st.Radius_m || 50)) {
                inRangeCount++;
                let o = document.createElement("option"); o.value = st.SID; o.text = st.SName; sel.appendChild(o);
            }
        });
        if (inRangeCount === 0) sel.innerHTML = "<option>❌ นอกรัศมี</option>";
    } catch (e) { console.error(e); }
}
function toggleSpinner(show) { const s = document.getElementById("spinner"); if(s) s.style.display = show ? "flex" : "none"; }
main();