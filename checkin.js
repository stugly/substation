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
            if(img) {
                img.src = profile.pictureUrl;
                img.style.display = "block";
            }
        }

        showSpinner(true); // 🚩 เริ่มหมุนกลางจอ
        
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "checkUser", lineUserId: profile.userId, lineName: profile.displayName })
        });
        const data = await res.json();

        if (data.status === "FOUND") {
            document.getElementById("welcome").innerText = "สวัสดี, " + data.user.Name;
            document.getElementById("mainSection").style.display = "block";
            initMap(); 
            await loadJobs(); // 🚩 โหลดงานเสร็จก่อนค่อยปิดตัวหมุน
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
        alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        showSpinner(false); // 🚩 หยุดหมุนเสมอ
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
            const currentHM = now.getHours() * 100 + now.getMinutes();
            const isWeekend = [0, 6].includes(now.getDay());
            const isAdmin = (profile.userId === ADMIN_LINE_ID);

            sel.innerHTML = '<option value="">-- เลือกประเภทงาน --</option>';
            
            data.jobs.forEach(jobName => {
                let isVisible = false;
                const name = jobName.trim();

                if (isAdmin) {
                    isVisible = true; 
                } else {
                    if (name.includes("2")) {
                        if (currentHM >= 700 && currentHM < 1500) isVisible = true;
                    } 
                    else if (name.includes("3")) {
                        if (currentHM >= 1500 && currentHM < 2300) isVisible = true;
                    } 
                    else if (name.includes("Day Time")) {
                        if (!isWeekend && currentHM >= 730 && currentHM <= 1530) isVisible = true;
                    } 
                    else {
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
        if (marker) map.removeLayer(marker);
        
        // 👤 ใช้ไอคอนรูปคน และมีวงกลมสีเขียวจางๆ รอบตัว
        marker = L.marker([currentLat, currentLon], {
            icon: L.divIcon({
                className: 'user-icon',
                html: `
                    <div style="position:relative;">
                        <div class="pulse"></div>
                        <div style="font-size: 26px; position:relative; z-index:2;">👤</div>
                    </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map);
        
        map.setView([currentLat, currentLon], 16);
        loadStations();
    }, (err) => { 
        console.warn("GPS Error", err); 
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
        const stations = data.allStations || []; 
        nearbyStationsData = stations;
        
        // 🚩 1. ล้างหมุดสถานีเดิมออกก่อน (ยกเว้นหมุดสีเขียวของพนักงาน)
        map.eachLayer(layer => {
            // เช็คว่าเป็นหมุดสถานี (ไม่ใช่หมุดพนักงาน และไม่ใช่แผ่นแผนที่)
            if (layer instanceof L.CircleMarker && layer !== marker) {
                map.removeLayer(layer);
            }
        });

        let inRangeCount = 0;
        stations.forEach(st => {
            const sLat = parseFloat(st.Lat), sLon = parseFloat(st.Lon);
            const radius = parseFloat(st.Radius_m) || 50;
            
            if (!isNaN(sLat) && !isNaN(sLon)) {
                const distMeters = map.distance([currentLat, currentLon], [sLat, sLon]);
                const isInRange = distMeters <= radius;

                // 🚩 2. วาดหมุดสถานีด้วย CircleMarker (เสถียรกว่า Marker ปกติ)
                L.circleMarker([sLat, sLon], {
                    radius: 6,
                    fillColor: isInRange ? "#28a745" : "#dc3545", // เขียวถ้าเข้าใกล้, แดงถ้าห่าง
                    color: "#fff",
                    weight: 2,
                    fillOpacity: 0.9
                })
                .addTo(map)
                .bindPopup(`<b>${st.SName}</b><br>ระยะห่าง: ${Math.round(distMeters)} ม.`);

                // 🚩 3. เพิ่มลงใน Dropdown เฉพาะที่อยู่ในรัศมี
                if (isInRange) {
                    inRangeCount++;
                    let o = document.createElement("option"); 
                    o.value = st.SID; 
                    o.text = `${st.SName} (${Math.round(distMeters)} ม.)`; 
                    sel.appendChild(o);
                }
            }
        });

        // 🚩 4. จัดการปุ่มบันทึก
        const btn = document.getElementById("checkinBtn");
        if (inRangeCount === 0) {
            sel.innerHTML = "<option>❌ นอกรัศมีเช็คอิน</option>";
            if(btn) btn.disabled = true;
        } else { 
            if(btn) btn.disabled = false; 
        }
    } catch (e) { 
        console.error("Load Stations Error:", e); 
    }
}

// 🚩 เปลี่ยนชื่อเป็น showSpinner ให้ตรงกับ Dashboard
function showSpinner(show) { 
    const s = document.getElementById("spinner"); 
    if(s) s.style.display = show ? "flex" : "none"; 
}

main();