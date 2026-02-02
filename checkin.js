const LIFF_ID = "2008876139-ISUrdRGi"; 
const API_URL = "https://script.google.com/macros/s/AKfycbzT2U6Zf9q-ieWioQw5e1BohRYjTyqVb9mo3N6-O3-wF3U3QTYgg9LC8ia2A8oWtXwT/exec";

let profile, map, marker, currentLat, currentLon, nearbyStationsData = [];
window.stationMarkers = []; 

async function main() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) { liff.login(); return; }
        
        profile = await liff.getProfile();
        if (profile.pictureUrl) {
            document.getElementById("profileImg").src = profile.pictureUrl;
            document.getElementById("profileImg").style.display = "block";
        }

        toggleSpinner(true);
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "checkUser", lineUserId: profile.userId, lineName: profile.displayName })
        });
        const data = await res.json();
        toggleSpinner(false);

        if (data.status === "FOUND") {
            document.getElementById("welcome").innerText = "สวัสดี, " + data.user.Name;
            document.getElementById("mainSection").style.display = "block";
            initMap(); 
            loadJobs(); // 🚩 เรียกโหลดรายการงาน
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
        toggleSpinner(false);
    }
}

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([13.7, 100.5], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    moveToCurrent();
}

function moveToCurrent() {
    navigator.geolocation.getCurrentPosition(pos => {
        currentLat = pos.coords.latitude;
        currentLon = pos.coords.longitude;
        if (marker) map.removeLayer(marker);

        marker = L.circleMarker([currentLat, currentLon], {
            radius: 8, fillColor: "#28a745", color: "#fff", weight: 2, fillOpacity: 0.9
        }).addTo(map);

        map.setView([currentLat, currentLon], 16);
        loadStations();
    }, () => alert("กรุณาเปิด GPS"), { enableHighAccuracy: true });
}

async function loadStations() {
    try {
        const response = await fetch(`${API_URL}?action=getAllStations&t=${new Date().getTime()}`);
        const data = await response.json();
        const sel = document.getElementById("stationSelect");
        if (!sel) return;

        if (window.stationMarkers) {
            window.stationMarkers.forEach(m => map.removeLayer(m));
        }
        window.stationMarkers = [];
        sel.innerHTML = "";

        const stations = data.allStations || data.stations || [];
        nearbyStationsData = stations;
        let inRangeCount = 0;

        stations.forEach(st => {
            const sLat = parseFloat(st.Lat);
            const sLon = parseFloat(st.Lon);
            const radius = parseFloat(st.Radius_m) || 50;

            if (!isNaN(sLat) && !isNaN(sLon)) {
                const distMeters = map.distance([currentLat, currentLon], [sLat, sLon]);
                let distDisplayText = distMeters < 1000 ? `${Math.round(distMeters)} ม.` : `${(distMeters / 1000).toFixed(2)} กม.`;

                const m = L.marker([sLat, sLon]).addTo(map).bindPopup(`<b>${st.SName}</b><br>ห่าง: ${distDisplayText}`);
                window.stationMarkers.push(m);

                if (distMeters <= radius) {
                    inRangeCount++;
                    let o = document.createElement("option"); 
                    o.value = st.SID; 
                    o.text = `${st.SName} (${distDisplayText})`; 
                    sel.appendChild(o);

                    const c = L.circle([sLat, sLon], { radius: radius, color: '#28a745', fillOpacity: 0.1, weight: 1 }).addTo(map);
                    window.stationMarkers.push(c);
                }
            }
        });

        if (inRangeCount === 0) {
            sel.innerHTML = "<option>❌ ไม่อยู่ในรัศมีเช็คอิน</option>";
            document.getElementById("checkinBtn").disabled = true;
        } else {
            document.getElementById("checkinBtn").disabled = false;
        }
    } catch (error) { console.error("Load Stations Error:", error); }
}

/**
 * 🚩 โหลดรายการ Job แบบปกติ (ใช้ Action "getJobs")
 */
// ในไฟล์ checkin.js
async function loadJobs() {
    try {
        const res = await fetch(API_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "getJobConfigs" }) // เปลี่ยนจาก getJobs เป็น getJobConfigs
        });
        const data = await res.json();
        const sel = document.getElementById("jobSelect");
        if (sel && data.status === "OK") {
            globalJobConfigs = data.configs; // เก็บค่าเวลาไว้เช็คตอนกดบันทึก
            sel.innerHTML = '<option value="">-- เลือกประเภทงาน --</option>';
            data.configs.forEach(j => { 
                let o = document.createElement("option"); 
                o.value = j.name; 
                o.text = j.name; 
                sel.appendChild(o); 
            });
        }
    } catch (e) { console.error("Load Jobs Error", e); }
}

/**
 * 🚩 บันทึก Check-in แบบปกติ (ไม่มีการเช็คเงื่อนไขเวลา)
 */
async function confirmCheckin() {
    const selectedJobName = document.getElementById("jobSelect").value;
    const selectedSID = document.getElementById("stationSelect").value;
    const station = nearbyStationsData.find(s => s.SID == selectedSID);
    
    if (!selectedJobName) { alert("กรุณาเลือกประเภทงาน"); return; }
    if (!selectedSID || selectedSID.includes("❌")) return;

    const weather = document.querySelector('input[name="weather"]:checked').value;
    toggleSpinner(true);
    
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "checkin", 
                lineUserId: profile.userId, 
                SID: selectedSID,
                Job: selectedJobName, 
                Note: document.getElementById("note").value,
                Weather: weather,
                Unit: station ? station.Unit : "-", 
                lat: currentLat, 
                lon: currentLon
            })
        });
        const data = await res.json();
        alert(data.message);
        liff.closeWindow();
    } catch (e) {
        alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
        toggleSpinner(false);
    }
}

async function confirmBind() {
    const selectedUID = document.getElementById("userSelect").value;
    const inputUID = document.getElementById("UID").value.trim();
    if (selectedUID !== inputUID) { alert("❌ รหัสไม่ตรงกับชื่อที่เลือก"); return; }
    toggleSpinner(true);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "bindUser", uid: inputUID, lineUserId: profile.userId, lineName: profile.displayName })
        });
        const data = await res.json();
        if (data.status == "OK") location.reload(); else alert(data.message);
    } catch (e) { alert("เกิดข้อผิดพลาด"); }
    finally { toggleSpinner(false); }
}

function toggleSpinner(show) {
    const s = document.getElementById("spinner");
    if(s) s.style.display = show ? "flex" : "none";
}

main();