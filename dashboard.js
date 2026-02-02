const API_URL = "https://script.google.com/macros/s/AKfycbzT2U6Zf9q-ieWioQw5e1BohRYjTyqVb9mo3N6-O3-wF3U3QTYgg9LC8ia2A8oWtXwT/exec";
let map, allCheckins = [], allStationsData = [], currentMarkers = L.featureGroup(), stationLayers = L.layerGroup(); 

const targetSIDs = ["NTB", "TSA", "KCD", "PPA", "TRA", "KBB", "BKO", "PKA", "PKB", "PAT", "KMA", "KBA", "PKD", "KNA", "WSA", "TMG", "KTM"];

function toggleTestSettings() {
    const panel = document.getElementById('testSettings');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function applyManualTest() { applyFilters(); }

async function initDashboard() {
    if (!map) {
        map = L.map('map').setView([13.75, 100.52], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        stationLayers.addTo(map); currentMarkers.addTo(map);
    }
    try {
        showSpinner(true);
        const response = await fetch(API_URL, { method: "GET", redirect: "follow" });
        const data = await response.json();
        allStationsData = data.allStations || [];
        allCheckins = data.checkins || [];
        renderAllStations(allStationsData);
        applyFilters(); 
    } catch (error) { console.error("Load Error:", error); } finally { showSpinner(false); }
}

function showSpinner(show) { const s = document.getElementById('spinner'); if (s) s.style.display = show ? 'flex' : 'none'; }

function renderAllStations(stations) {
    stationLayers.clearLayers();
    stations.forEach(st => {
        const lat = parseFloat(st.Lat), lon = parseFloat(st.Lon);
        if (!isNaN(lat) && !isNaN(lon)) {
            L.marker([lat, lon]).bindPopup(`<b>${st.SName}</b>`).addTo(stationLayers);
            L.circle([lat, lon], { radius: parseFloat(st.Radius_m) || 50, color: '#28a745', fillOpacity: 0.1, weight: 1 }).addTo(stationLayers);
        }
    });
}

function applyFilters() {
    const sTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    const isTestMode = document.getElementById("isTestMode")?.checked;
    const testDate = document.getElementById("testDate")?.value;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let targetDay = (isTestMode && testDate) ? testDate : (startDate || todayStr);

    const logData = allCheckins.filter(cp => {
        const d = new Date(cp.time);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const matchText = (cp.userName || "").toLowerCase().includes(sTerm) || (cp.stationName || "").toLowerCase().includes(sTerm);
        if (!matchText) return false;
        if (isTestMode && testDate) return dStr === testDate;
        if (startDate && dStr < startDate) return false;
        if (endDate && dStr > endDate) return false;
        return true;
    });

    const targetDayData = allCheckins.filter(cp => {
        const d = new Date(cp.time);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return dStr === targetDay;
    });

    renderCheckinLogs(logData);
    renderUnitStatusList(allCheckins); 
    
    const patrolItems = targetDayData.filter(cp => (cp.job || "").toString().trim() === "งาน Patrol");
    renderPatrolCardList("patrolListContainer", patrolItems, "#007bff");

    const etcItems = targetDayData.filter(cp => {
        const job = (cp.job || "").toString().trim();
        const mainShiftJobs = ["เข้าปฏิบัติงานกะ 1", "เข้าปฏิบัติงานกะ 2", "เข้าปฏิบัติงานกะ 3", "ศูนย์ฯสั่งเข้าปฏิบัติงาน", "Day Time", "งาน Patrol"];
        return !mainShiftJobs.includes(job);
    });
    renderETCCardList("ETCListContainer", etcItems, "#fd7e14");
}

function renderCheckinLogs(checkins) {
    const tableBody = document.getElementById("logTable");
    if (!tableBody) return; tableBody.innerHTML = ""; currentMarkers.clearLayers();
    [...checkins].reverse().slice(0, 50).forEach((cp) => {
        const d = new Date(cp.time);
        tableBody.innerHTML += `<tr>
            <td><span style="font-size:11px;color:#888;">${d.toLocaleDateString('th-TH',{day:'2-digit',month:'2-digit'})}</span><br><b>${d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}</b></td>
            <td><b style="color:#28a745;">${cp.stationName}</b></td>
            <td><span style="background:${(cp.job||"").includes("ปฏิบัติงาน")?"#28a745":"#6c757d"};color:white;padding:2px 8px;border-radius:12px;font-size:11px;">${cp.job || '-'}</span></td>
            <td><b>${cp.userName}</b>${cp.tel ? `<div style="font-size:11px;color:#28a745;">📞 ${cp.tel}</div>` : ''}</td>
        </tr>`;
        if (cp.lat && cp.lon) L.circleMarker([cp.lat, cp.lon], { radius: 7, fillColor: "#28a745", color: "#fff", weight: 2, fillOpacity: 0.9 }).addTo(currentMarkers);
    });
}

/**
 * Tab 1: แสดง Badge เป็นเลข Unit 1-15
 */
function renderUnitStatusList(fullCheckins) {
    const container = document.getElementById("unitCheckinToday");
    if (!container) return; container.innerHTML = "";
    
    const isTestMode = document.getElementById("isTestMode")?.checked;
    const testDate = document.getElementById("testDate")?.value, testTime = document.getElementById("testTime")?.value;
    
    let now = (isTestMode && testDate && testTime) ? new Date(`${testDate}T${testTime}:00`) : new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTimeHM = now.getHours() * 100 + now.getMinutes();

    let unitCounter = 1;
    targetSIDs.forEach((sid) => {
        const stationInfo = allStationsData.find(s => s.SID === sid);
        const displayName = stationInfo ? stationInfo.SName : sid;
        let isDayTimeType = (sid === "TMG" || sid === "KTM");
        
        let displayLabel = "";
        if (isDayTimeType) { displayLabel = "Day Time"; }
        else if (sid === "BKO") { displayLabel = "7-8"; unitCounter = 9; }
        else { displayLabel = unitCounter.toString(); unitCounter++; }

        // กำหนดกะตามช่วงเวลาปัจจุบัน
        let shiftName = (currentTimeHM >= 730 && currentTimeHM <= 1529) ? "เข้าปฏิบัติงานกะ 2" : "เข้าปฏิบัติงานกะ 3";

        const filteredLogs = fullCheckins.filter(cp => {
            const cTime = new Date(cp.time);
            const jobText = (cp.job || "").toString();
            const logHM = cTime.getHours() * 100 + cTime.getMinutes();
            const logDate = `${cTime.getFullYear()}-${String(cTime.getMonth() + 1).padStart(2, '0')}-${String(cTime.getDate()).padStart(2, '0')}`;

            if (cp.sid !== sid) return false;
            if (isDayTimeType) return jobText === "Day Time" && logDate === todayStr && cTime <= now;

            if (shiftName === "เข้าปฏิบัติงานกะ 2") {
                return jobText === "เข้าปฏิบัติงานกะ 2" && logDate === todayStr && logHM >= 730 && logHM <= 1529 && cTime <= now;
            } else {
                const isTodayShift3 = logDate === todayStr && logHM >= 1530;
                const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
                const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
                const isYesterdayShift3 = logDate === yesterdayStr && logHM >= 1530;
                const isTodayEarlyShift3 = logDate === todayStr && logHM <= 729;
                return jobText === "เข้าปฏิบัติงานกะ 3" && (isTodayShift3 || isYesterdayShift3 || isTodayEarlyShift3) && cTime <= now;
            }
        });

        const lastIn = filteredLogs.sort((a, b) => new Date(b.time) - new Date(a.time))[0];
        let bgColor = "#ffcdd2", borderColor = "#d32f2f", badgeColor = "#d32f2f";

        if (lastIn) {
            const checkTime = new Date(lastIn.time);
            const chkHM = checkTime.getHours() * 100 + checkTime.getMinutes();
            if (isDayTimeType) {
                bgColor = "#e8f5e9"; borderColor = "#28a745"; badgeColor = "#28a745";
            } else {
                const jobName = (lastIn.job || "").toString();
                if (jobName === "เข้าปฏิบัติงานกะ 2") {
                    if (chkHM >= 730 && chkHM <= 800) { bgColor = "#e8f5e9"; borderColor = "#28a745"; badgeColor = "#28a745"; }
                    else { bgColor = "#fff9c4"; borderColor = "#fbc02d"; badgeColor = "#fbc02d"; }
                } else if (jobName === "เข้าปฏิบัติงานกะ 3") {
                    if (chkHM >= 1530 && chkHM <= 1600) { bgColor = "#e8f5e9"; borderColor = "#28a745"; badgeColor = "#28a745"; }
                    else { bgColor = "#fff9c4"; borderColor = "#fbc02d"; badgeColor = "#fbc02d"; }
                }
            }
        }

        const card = document.createElement("div");
        card.style.cssText = `position:relative; padding:15px 15px 15px 25px; background:${bgColor}; border-radius:12px; border-left:6px solid ${borderColor}; box-shadow:0 2px 8px rgba(0,0,0,0.08); margin:18px 10px; min-width:280px; flex: 1 1 300px;`;
        const badgeWidth = isDayTimeType ? "85px" : "45px";
        
        if (lastIn) {
            const d = new Date(lastIn.time);
            // 🚩 คืนค่าเบอร์โทรและ Link โทรออก
            const telLink = lastIn.tel ? `<a href="tel:${lastIn.tel.toString().replace(/-/g,'')}" style="color:${borderColor};text-decoration:none;font-weight:600;margin-left:5px;">📞 ${lastIn.tel}</a>` : '';
            
            card.innerHTML = `<div style="position:absolute; top:-12px; left:-12px; width:${badgeWidth}; height:30px; background:${badgeColor}; color:white; border-radius:15px; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:13px; border:2px solid #fff; z-index:10;">${displayLabel}</div>
                <div style="display:grid; grid-template-columns:1fr auto; row-gap:8px;">
                    <div><b>${displayName}</b></div><div style="text-align:right;"><b>${d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})} น.</b></div>
                    <div style="font-size:13px;color:#555;">👤 ${lastIn.userName} ${telLink}</div>
                    <div style="text-align:right;font-size:11px;color:#888;">${d.toLocaleDateString('th-TH',{day:'numeric',month:'short'})}</div>
                </div>`;
        } else {
            card.innerHTML = `<div style="position:absolute; top:-12px; left:-12px; width:${badgeWidth}; height:30px; background:${badgeColor}; color:white; border-radius:15px; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:13px; border:2px solid #fff; z-index:10;">${displayLabel}</div><b style="color:${borderColor};">${displayName}</b><br><small style="color:${borderColor};font-weight:600;">⚠️ รอลงเวลา (${shiftName === "เข้าปฏิบัติงานกะ 2" ? "กะ 2" : "กะ 3"})</small>`;
        }
        container.appendChild(card);
    });
}

function renderPatrolCardList(containerId, items, themeColor) {
    const el = document.getElementById("patrolCount"); if (el) el.innerText = `(${items.length})`;
    const container = document.getElementById(containerId); if (!container) return;
    container.innerHTML = items.length === 0 ? `<div style="padding:20px;text-align:center;color:#999;">ไม่มีงาน Patrol</div>` : "";
    items.sort((a,b) => new Date(b.time) - new Date(a.time)).forEach(item => {
        const d = new Date(item.time);
        const telClean = item.tel ? item.tel.toString().replace(/-/g, '') : '';
        container.innerHTML += `<div style="padding:15px;background:#f0f7ff;border-radius:12px;border-left:6px solid ${themeColor};margin:15px 10px;flex:1 1 300px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="display:flex;justify-content:space-between;"><b>${item.stationName || item.sid}</b><b>${d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})} น.</b></div>
            <div style="margin-top:8px;font-size:13px;color:#555; display:flex; justify-content:space-between; align-items:flex-end;">
                <div>👤 ${item.userName} ${item.tel ? `<a href="tel:${telClean}" style="color:${themeColor};text-decoration:none;font-weight:600;margin-left:5px;">📞 ${item.tel}</a>`:''}</div>
                <div style="font-size:11px;color:#888;">${d.toLocaleDateString('th-TH',{day:'numeric',month:'short'})}</div>
            </div></div>`;
    });
}

function renderETCCardList(containerId, items, themeColor) {
    const el = document.getElementById("etcCount"); if (el) el.innerText = `(${items.length})`;
    const container = document.getElementById(containerId); if (!container) return;
    container.innerHTML = items.length === 0 ? `<div style="padding:20px;text-align:center;color:#999;">ไม่มีงานอื่น</div>` : "";
    items.sort((a,b) => new Date(b.time) - new Date(a.time)).forEach(item => {
        const d = new Date(item.time);
        const telClean = item.tel ? item.tel.toString().replace(/-/g, '') : '';
        container.innerHTML += `<div style="padding:15px;background:#fffaf5;border-radius:12px;border-left:6px solid ${themeColor};margin:15px 10px;flex:1 1 300px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="display:flex;justify-content:space-between;"><b>${item.stationName || item.sid}</b><b>${d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})} น.</b></div>
            <div style="margin-top:5px;font-weight:700;color:${themeColor};">📌 ${item.job}</div>
            <div style="margin-top:5px;font-size:13px;color:#555;">👤 ${item.userName} ${item.tel ? `<a href="tel:${telClean}" style="color:${themeColor};text-decoration:none;font-weight:600;margin-left:5px;">📞 ${item.tel}</a>`:''}</div>
            <div style="font-size:11px;color:#666;margin-top:5px;padding-top:5px;border-top:1px dashed #ccc; display:flex; justify-content:space-between; align-items:flex-end;">
                <span>📝 Note: ${item.note || '-'}</span>
                <span style="font-size:11px;color:#888;white-space:nowrap;margin-left:10px;">${d.toLocaleDateString('th-TH',{day:'numeric',month:'short'})}</span>
            </div></div>`;
    });
}

function startLiveClock() { setInterval(() => { const now = new Date(); const el = document.getElementById("clockDisplay"); if (el) el.innerHTML = `📅 ${now.toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'})} | 🕒 ${now.toLocaleTimeString('th-TH',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})} น.`; }, 1000); }

window.applyFilters = applyFilters;
window.applyManualTest = applyManualTest;
window.toggleTestSettings = toggleTestSettings;

document.addEventListener("DOMContentLoaded", () => { startLiveClock(); initDashboard(); });