const API_URL = "https://script.google.com/macros/s/AKfycbzT2U6Zf9q-ieWioQw5e1BohRYjTyqVb9mo3N6-O3-wF3U3QTYgg9LC8ia2A8oWtXwT/exec";
let map;
let allCheckins = []; 
let allStationsData = []; // สำหรับเก็บชื่อสถานีเต็ม
let currentMarkers = L.featureGroup();
let stationLayers = L.layerGroup(); 

const targetSIDs = ["NTB", "TSA", "KCD", "PPA", "TRA", "KBB", "BKO", "PKA", "PKB", "PAT", "KMA", "KBA", "PKD", "KNA", "WSA", "TMG", "KTM"];

/**
 * 1. ฟังก์ชันเริ่มต้นระบบ
 */
async function initDashboard() {
    if (!map) {
        map = L.map('map', { zoomControl: true }).setView([13.75, 100.52], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        stationLayers.addTo(map);
        currentMarkers.addTo(map);
    }

    try {
        showSpinner(true);
        const response = await fetch(API_URL, { method: "GET", redirect: "follow" });
        const data = await response.json();

        // เก็บข้อมูลสถานีลงตัวแปรกลางก่อนเริ่มทำงานส่วนอื่น
        if (data.allStations) {
            allStationsData = data.allStations; 
            if (map) renderAllStations(data.allStations);
        }

        if (data.checkins) {
            allCheckins = data.checkins; 
            applyFilters(); 
        }
    } catch (error) { 
        console.error("Dashboard Load Error:", error); 
    } finally {
        showSpinner(false);
    }
}

function showSpinner(show) {
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.style.display = show ? 'flex' : 'none';
}

/**
 * 2. ปักหมุดสถานี
 */
function renderAllStations(stations) {
    if (!map) return;
    stationLayers.clearLayers();
    stations.forEach(st => {
        const lat = parseFloat(st.Lat);
        const lon = parseFloat(st.Lon);
        const radius = parseFloat(st.Radius_m) || 50;
        if (!isNaN(lat) && !isNaN(lon)) {
            const m = L.marker([lat, lon]).bindPopup(`<b>${st.SName}</b>`);
            stationLayers.addLayer(m);
            const c = L.circle([lat, lon], {
                radius: radius, color: '#28a745', fillColor: '#28a745', fillOpacity: 0.1, weight: 1 
            });
            stationLayers.addLayer(c);
        }
    });
}

/**
 * 3. ตารางประวัติ (Log Table)
 */
function renderCheckinLogs(checkins) {
    if (!map) return;
    currentMarkers.clearLayers(); 
    const tableBody = document.getElementById("logTable");
    if (tableBody) {
        tableBody.innerHTML = "";
        const sTerm = document.getElementById('searchInput')?.value || "";
        const startDate = document.getElementById('startDate')?.value || "";
        const endDate = document.getElementById('endDate')?.value || "";
        
        let displayData = [...checkins].reverse();
        if (!sTerm && !startDate && !endDate) displayData = displayData.slice(0, 50);

        displayData.forEach((cp) => {
            const dateObj = new Date(cp.time);
            const dateStr = dateObj.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
            const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            const telForLink = cp.tel ? cp.tel.toString().replace(/-/g, '') : '';

            let jobBadgeColor = "#6c757d"; 
            const jobText = (cp.job || "").toString();
            if (jobText.includes("ปฏิบัติงาน")) jobBadgeColor = "#28a745";
            else if (jobText.toLowerCase().includes("patrol")) jobBadgeColor = "#007bff";
            else if (jobText.includes("บำรุงรักษา")) jobBadgeColor = "#fd7e14";

            const row = `<tr>
                <td style="white-space: nowrap;">
                    <span style="font-size: 11px; color: #888;">${dateStr}</span><br>
                    <b style="color: #333;">${timeStr}</b>
                </td>
                <td><b style="color: var(--line-green);">${cp.stationName}</b></td>
                <td>
                    <span style="background: ${jobBadgeColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; white-space: nowrap;">
                        ${jobText || '-'}
                    </span>
                </td>
                <td>
                    <div style="font-weight: 600;">${cp.userName}</div>
                    ${cp.tel ? `<div style="font-size:11px; color:#28a745;">📞 ${cp.tel}</div>` : ''}
                </td>
            </tr>`;
            tableBody.innerHTML += row;

            if (cp.lat && cp.lon) {
                const m = L.circleMarker([cp.lat, cp.lon], { 
                    radius: 7, fillColor: "#28a745", color: "#fff", weight: 2, fillOpacity: 0.9 
                }).bindPopup(`<b>👤 ${cp.userName}</b><br>งาน: ${cp.job || '-'}`);
                currentMarkers.addLayer(m);
            }
        });
    }
}

/**
 * 4. ระบบ Filter และ Update Stats
 */
function applyFilters() {
    const sTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;

    const filtered = allCheckins.filter(cp => {
        const d = new Date(cp.time);
        const checkinDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; 

        const matchText = (cp.userName || "").toLowerCase().includes(sTerm) || 
                          (cp.stationName || "").toLowerCase().includes(sTerm);
        
        let matchDate = true;
        if (startDate && endDate) {
            matchDate = (checkinDateStr >= startDate && checkinDateStr <= endDate);
        } else if (startDate) {
            matchDate = (checkinDateStr >= startDate);
        } else if (endDate) {
            matchDate = (checkinDateStr <= endDate);
        }
        return matchText && matchDate;
    });

    renderCheckinLogs(filtered);
    updateStats(filtered);
}

function updateStats(checkins) {
    const isTestMode = document.getElementById("isTestMode")?.checked;
    const testDateStr = document.getElementById("testDate")?.value;
    
    let targetDate;
    if (isTestMode && testDateStr) {
        targetDate = testDateStr; 
    } else {
        const now = new Date();
        targetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // กรองข้อมูลเฉพาะ "วันที่ตรงกับเป้าหมาย" เท่านั้น
    const todayData = allCheckins.filter(cp => {
        const d = new Date(cp.time);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return dStr === targetDate;
    });

    // Tab 1: สถานะหน่วยงาน
    renderUnitStatusList(allCheckins);

    // Tab 2: งาน Patrol (ตัด Note)
    const patrolItems = todayData.filter(cp => (cp.job || "").toLowerCase().includes("patrol"));
    renderPatrolCardList("patrolListContainer", patrolItems, "#007bff"); 

    // Tab 3: งานอื่นๆ (คง Note)
    const etcItems = todayData.filter(cp => {
        const job = (cp.job || "").toString();
        const jobLower = job.toLowerCase();
        const isWork = job.includes("ปฏิบัติงาน") || jobLower.includes("day time");
        const isPatrol = jobLower.includes("patrol");
        return !isWork && !isPatrol;
    });
    renderETCCardList("ETCListContainer", etcItems, "#fd7e14");
}

/**
 * Tab 1: สถานะหน่วยงาน (ปรับสีเบอร์โทรตามสถานะขอบการ์ด)
 */
function renderUnitStatusList(fullCheckins) {
    const container = document.getElementById("unitCheckinToday");
    if (!container) return;
    container.innerHTML = "";
    
    const isTestMode = document.getElementById("isTestMode")?.checked;
    const testDate = document.getElementById("testDate")?.value;
    const testTime = document.getElementById("testTime")?.value;

    let now = isTestMode && testDate && testTime ? new Date(`${testDate}T${testTime}:00`) : new Date();
    const targetDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTimeValue = now.getHours() * 100 + now.getMinutes();
    const isWeekend = [0, 6].includes(now.getDay());

    let unitCounter = 1;

    targetSIDs.forEach((sid) => {
        const stationInfo = allStationsData.find(s => s.SID === sid);
        const displayName = stationInfo ? stationInfo.SName : sid;
        let isDayTimeType = (sid === "TMG" || sid === "KTM");
        let displayLabel = "";
        let badgeWidth = "45px";

        if (isDayTimeType) { displayLabel = "Day Time"; badgeWidth = "85px"; }
        else if (sid === "BKO") { displayLabel = "7-8"; unitCounter = 9; }
        else { displayLabel = unitCounter.toString(); unitCounter++; }

        const filteredLogs = fullCheckins.filter(cp => {
    const cTime = new Date(cp.time);
    const jobText = (cp.job || "").toString().toLowerCase();
    const isMatch = cp.sid === sid && 
        (jobText.includes("ปฏิบัติงาน") || jobText.includes("day time")) && 
        cTime <= now;

    const dStr = `${cTime.getFullYear()}-${String(cTime.getMonth() + 1).padStart(2, '0')}-${String(cTime.getDate()).padStart(2, '0')}`;

    // ---- Day Time ใช้เงื่อนไขเดิม (ห้ามแก้)
    if (isDayTimeType) {
        return isMatch && dStr === targetDateStr;
    }

    // ---- สถานีปกติ
    // ถ้าเวลาปัจจุบัน >= 08:00 → เอาเฉพาะ check-in วันนี้
    if (currentTimeValue >= 800) {
        return isMatch && dStr === targetDateStr;
    }

    // ถ้าก่อน 08:00 → ยังอนุญาตให้ใช้ของเมื่อวานต่อได้
    return isMatch;
});


        const lastIn = filteredLogs.sort((a, b) => new Date(b.time) - new Date(a.time))[0];
        let bgColor = "#ffcdd2";      // แดง = default = ไม่พบ check-in
let borderColor = "#d32f2f";
let badgeColor = "#d32f2f";
let statusMsg = "";

if (lastIn) {

    // กรณี Day Time (TMG, KTM) ยังใช้เงื่อนไขเวลางาน / นอกเวลางานได้
    if (isDayTimeType) {
        if (isWeekend || currentTimeValue >= 1600 || currentTimeValue < 800) {
            bgColor = "#f5f5f5";  
            borderColor = "#9e9e9e";
            badgeColor = "#9e9e9e";
        } else {
            bgColor = "#e8f5e9";  
            borderColor = "#28a745";
            badgeColor = "#28a745";
        }
    } 
    // สถานีปกติ → แค่มี check-in ก็ถือว่าปกติทันที
    else {
        bgColor = "#e8f5e9";  
        borderColor = "#28a745";
        badgeColor = "#28a745";
    }
}


        const card = document.createElement("div");
        card.style.cssText = `position:relative; padding:15px 15px 15px 25px; background:${bgColor}; border-radius:12px; border-left:6px solid ${borderColor}; box-shadow:0 2px 8px rgba(0,0,0,0.08); font-family:'Kanit'; margin:18px 10px; min-width:280px; flex: 1 1 300px;`;

        if (lastIn) {
            const d = new Date(lastIn.time);
            const telClean = lastIn.tel ? lastIn.tel.toString().replace(/-/g, '') : '';
            
            card.innerHTML = `
                <div style="position:absolute; top:-12px; left:-12px; width:${badgeWidth}; height:30px; background:${badgeColor}; color:white; border-radius:15px; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:13px; border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.2); white-space:nowrap; z-index:10;">${displayLabel}</div>
                
                <div style="display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; row-gap: 8px;">
                    <div style="grid-column: 1; grid-row: 1; text-align: left;">
                        <b style="font-size: 1.1em; color: #333;">${displayName}${statusMsg}</b>
                    </div>
                    <div style="grid-column: 2; grid-row: 1; text-align: right;">
                        <b style="font-size: 1.1em; color: #444;">${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</b>
                    </div>
                    <div style="grid-column: 1; grid-row: 2; text-align: left; font-size: 13px; color: #555;">
                        👤 ${lastIn.userName}
                        ${lastIn.tel ? `<a href="tel:${telClean}" style="color: ${borderColor}; text-decoration: none; font-weight: 600; margin-left: 5px;"><i class="fa-solid fa-mobile-screen-button"></i> ${lastIn.tel}</a>` : ''}
                    </div>
                    <div style="grid-column: 2; grid-row: 2; text-align: right; font-size: 11px; color: #888;">
                        ${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </div>
                </div>`;
        } else {
            card.innerHTML = `
                <div style="position:absolute; top:-12px; left:-12px; width:${badgeWidth}; height:30px; background:${badgeColor}; color:white; border-radius:15px; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:13px; border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.2); white-space:nowrap; z-index:10;">${displayLabel}</div>
                <div style="padding-left:10px;">
                    <b style="color:${borderColor}; font-size:1.1em;">${displayName}${statusMsg}</b>
                    <div style="font-size:12px; color:${borderColor}; margin-top:5px; font-weight:600;">⚠️ ไม่พบข้อมูลที่เลือก</div>
                </div>`;
        }
        container.appendChild(card);
    });
}

/**
 * Tab 2: Patrol (น้ำเงิน)
 */
function renderPatrolCardList(containerId, items, themeColor) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = items.length === 0 ? `<div style="padding:20px; text-align:center; color:#999;">ไม่มีงาน Patrol</div>` : "";

    items.sort((a,b) => new Date(b.time) - new Date(a.time)).forEach(item => {
        const d = new Date(item.time);
        const telClean = item.tel ? item.tel.toString().replace(/-/g, '') : '';
        const stationInfo = allStationsData.find(s => s.SID === item.sid);
        const displayName = stationInfo ? stationInfo.SName : (item.stationName || item.sid);

        const card = document.createElement("div");
        card.style.cssText = `padding:15px; background:#f0f7ff; border-radius:12px; border-left:6px solid ${themeColor}; box-shadow:0 2px 8px rgba(0,0,0,0.08); margin:15px 10px; font-family:'Kanit'; flex: 1 1 300px;`;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <b style="font-size:1.1em; color:#333; flex:1;">${displayName}</b>
                <b style="font-size:1.1em; color:#444; margin-left:10px;">${d.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})} น.</b>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:13px; color:#555;">
                    👤 ${item.userName} 
                    ${item.tel ? `<a href="tel:${telClean}" style="color:${themeColor}; text-decoration:none; margin-left:5px; font-weight:600;"><i class="fa-solid fa-mobile-screen-button"></i> ${item.tel}</a>` : ''}
                </div>
                <small style="font-size:11px; color:#888;">${d.toLocaleDateString('th-TH', {day:'numeric', month:'short'})}</small>
            </div>`;
        container.appendChild(card);
    });
}

/**
 * Tab 3: งานอื่นๆ (ส้ม)
 */
function renderETCCardList(containerId, items, themeColor) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = items.length === 0 ? `<div style="padding:20px; text-align:center; color:#999;">ไม่มีงานอื่น</div>` : "";

    items.sort((a,b) => new Date(b.time) - new Date(a.time)).forEach(item => {
        const d = new Date(item.time);
        const telClean = item.tel ? item.tel.toString().replace(/-/g, '') : '';
        const stationInfo = allStationsData.find(s => s.SID === item.sid);
        const displayName = stationInfo ? stationInfo.SName : (item.stationName || item.sid);

        const card = document.createElement("div");
        card.style.cssText = `padding:15px; background:#fffaf5; border-radius:12px; border-left:6px solid ${themeColor}; box-shadow:0 2px 8px rgba(0,0,0,0.08); margin:15px 10px; font-family:'Kanit'; flex: 1 1 300px;`;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <b style="font-size:1.1em; color:#333; flex:1;">${displayName}</b>
                <b style="font-size:1.1em; color:#444; margin-left:10px;">${d.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})} น.</b>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-size:13px; color:#555;">
                    👤 ${item.userName} 
                    ${item.tel ? `<a href="tel:${telClean}" style="color:${themeColor}; text-decoration:none; margin-left:5px; font-weight:600;"><i class="fa-solid fa-mobile-screen-button"></i> ${item.tel}</a>` : ''}
                </div>
                <small style="font-size:11px; color:#888;">${d.toLocaleDateString('th-TH', {day:'numeric', month:'short'})}</small>
            </div>
            <div style="font-size:11px; color:#666; padding-top:8px; border-top:1px dashed #ccc;">📝 ${item.note || '-'}</div>`;
        container.appendChild(card);
    });
}



/**
 * 7. อื่นๆ (Clock / Filter)
 */
function toggleTestSettings() {
    const panel = document.getElementById('testSettings');
    if(panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function applyManualTest() { applyFilters(); }

function startLiveClock() {
    function update() {
        const now = new Date();
        const el = document.getElementById("clockDisplay");
        if (el) el.innerHTML = `📅 ${now.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })} | 🕒 ${now.toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.`;
    }
    setInterval(update, 1000);
    update();
}

document.addEventListener("DOMContentLoaded", () => {
    startLiveClock();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if(document.getElementById('startDate')) document.getElementById('startDate').value = today;
    if(document.getElementById('endDate')) document.getElementById('endDate').value = today;
    document.getElementById('searchInput')?.addEventListener("input", applyFilters);
    document.getElementById('startDate')?.addEventListener("change", applyFilters);
    document.getElementById('endDate')?.addEventListener("change", applyFilters);
    initDashboard();
});

function resetFilters() {
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('searchInput')) document.getElementById('searchInput').value = "";
    if (document.getElementById('startDate')) document.getElementById('startDate').value = today;
    if (document.getElementById('endDate')) document.getElementById('endDate').value = today;
    applyFilters();
    if (map) map.setView([13.75, 100.52], 7);
}
