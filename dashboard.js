const API_URL = "https://script.google.com/macros/s/AKfycbzT2U6Zf9q-ieWioQw5e1BohRYjTyqVb9mo3N6-O3-wF3U3QTYgg9LC8ia2A8oWtXwT/exec";
let map;
let allCheckins = []; 
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
        // --- แสดง Spinner ก่อนเริ่มดึงข้อมูล ---
        showSpinner(true);

        const response = await fetch(API_URL, { method: "GET", redirect: "follow" });
        const data = await response.json();

        if (data.allStations && map) renderAllStations(data.allStations);
        if (data.checkins) {
            allCheckins = data.checkins; 
            applyFilters(); 
        }
    } catch (error) { 
        console.error("Dashboard Load Error:", error); 
    } finally {
        // --- ปิด Spinner เมื่อทำงานเสร็จทุกกรณี ---
        showSpinner(false);
    }
}

/**
 * ฟังก์ชันแสดง/ซ่อน Spinner (ใช้ร่วมกับ HTML ที่คุณเพิ่ม)
 */
function showSpinner(show) {
    const spinner = document.getElementById('spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
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
 * 3. แสดงจุดเช็คอินพนักงาน (ตาราง + แผนที่)
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
        
        if (!sTerm && !startDate && !endDate) {
            displayData = displayData.slice(0, 50);
        }

        displayData.forEach((cp) => {
            const dateObj = new Date(cp.time);
            const dateStr = dateObj.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
            const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            const telForLink = cp.tel ? cp.tel.toString().replace(/-/g, '') : '';

            let jobBadgeColor = "#6c757d"; 
            const jobText = (cp.job || "").toString();
            if (jobText.includes("เข้าปฏิบัติงานกะ")) jobBadgeColor = "#28a745";
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
                    ${cp.tel ? `<a href="tel:${telForLink}" style="text-decoration:none; font-size:11px; color:#28a745;">📞 ${cp.tel}</a>` : ''}
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
    if (currentMarkers.getLayers().length > 0) map.fitBounds(currentMarkers.getBounds().pad(0.1));
}

/**
 * 4. ระบบ Filter
 */
function applyFilters() {
    const sTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;

    const filtered = allCheckins.filter(cp => {
        const d = new Date(cp.time || cp.timestamp);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const checkinDateStr = `${y}-${m}-${day}`; 

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
    renderUnitStatusList(checkins);

    const patrolItems = checkins.filter(cp => {
        const jobName = (cp.job || "").toString().toLowerCase();
        return jobName.includes("patrol");
    });
    renderSimpleCardList("patrolListContainer", patrolItems);

    const etcItems = checkins.filter(cp => {
        const jobName = (cp.job || "").toString().trim();
        return jobName === "งานอื่นๆ"; 
    });
    renderSimpleCardList("ETCListContainer", etcItems);
}

/**
 * Card 1: สถานะหน่วยงาน (KBA, KBB...)
 */
function renderUnitStatusList(checkins) {
    const container = document.getElementById("unitCheckinToday");
    if (!container) return;
    container.innerHTML = "";
    
    const now = new Date();

    let statusData = targetSIDs.map(sid => {
        const logs = checkins.filter(cp => {
        const jobName = (cp.job || "").toString().trim();
        // ตรวจสอบว่ามีคำว่า "เข้าปฏิบัติงานกะ" หรือ "Day Time" (แบบไม่สนตัวพิมพ์เล็ก/ใหญ่)
        return cp.sid === sid && (
        jobName.includes("เข้าปฏิบัติงานกะ") || 
        jobName.toLowerCase().includes("day time")
    );
});
        const lastIn = logs.sort((a, b) => new Date(b.time) - new Date(a.time))[0];
        return { sid, lastIn };
    });

    statusData.sort((a, b) => (b.lastIn ? new Date(b.lastIn.time).getTime() : 0) - (a.lastIn ? new Date(a.lastIn.time).getTime() : 0));

    statusData.forEach(item => {
        const row = document.createElement("div");
        row.style.cssText = "padding:10px; margin-bottom:6px; border-radius:8px; border-left: 5px solid #28a745; text-align:left; font-family: 'Kanit'; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";

        if (item.lastIn) {
            const checkinDate = new Date(item.lastIn.time);
            const isToday = (checkinDate.getFullYear() === now.getFullYear() && checkinDate.getMonth() === now.getMonth() && checkinDate.getDate() === now.getDate());
            const diffInHours = (now - checkinDate) / (1000 * 60 * 60);
            const isLate = diffInHours > 8;

            const dateStr = checkinDate.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
            const timeStr = checkinDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            const telLink = item.lastIn.tel ? item.lastIn.tel.toString().replace(/-/g, '') : '';

            if (isToday) {
                if (isLate) {
                    row.style.background = "#fff9c4"; 
                    row.style.borderLeftColor = "#fbc02d";
                } else {
                    row.style.background = "#e8f5e9"; 
                    row.style.borderLeftColor = "#28a745";
                }
            } else {
                row.style.background = "#f5f5f5"; 
                row.style.borderLeftColor = "#9e9e9e";
            }

            row.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b style="color:${isToday && !isLate ? '#28a745' : (isToday ? '#fbc02d' : '#616161')}; font-size:14px;">${item.sid}</b>
                    <span style="font-size:11px; color:#888;">${dateStr}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                    <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
                        <span style="font-size:12px; color:#333; white-space:nowrap;">👤 ${item.lastIn.userName}</span>
                        ${item.lastIn.tel ? `<a href="tel:${telLink}" style="text-decoration:none; color:#28a745; font-size:11px;">📞 โทร</a>` : ''}
                    </div>
                    <span style="font-size:12px; color:#444; font-weight:600; min-width:fit-content; margin-left:10px;">${timeStr} น.</span>
                </div>`;
        } else {
            row.style.background = "#ffffff";
            row.style.borderLeftColor = "#eee";
            row.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><b style="color:#ccc; font-size:14px;">${item.sid}</b><span style="color:#ccc; font-size:11px;">ไม่มีข้อมูล</span></div>`;
        }
        container.appendChild(row);
    });
}

/**
 * Card 2 & 3: Patrol และ งานอื่นๆ
 */
function renderSimpleCardList(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    if (items.length === 0) {
        container.innerHTML = `<div style="color:#999; padding:20px; text-align:center; font-size:14px;">ไม่มีข้อมูล</div>`;
        return;
    }
    const now = new Date();

    [...items].sort((a, b) => new Date(b.time) - new Date(a.time)).forEach(item => {
        const checkinDate = new Date(item.time);
        const isToday = (checkinDate.getFullYear() === now.getFullYear() && checkinDate.getMonth() === now.getMonth() && checkinDate.getDate() === now.getDate());
        const dateStr = checkinDate.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
        const timeStr = checkinDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        
        const telLink = item.tel ? item.tel.toString().replace(/-/g, '') : '';
        const detailText = item.note || "-";

        const row = document.createElement("div");
        row.style.cssText = "padding:10px; margin-bottom:6px; border-radius:8px; border-left: 5px solid #28a745; text-align:left; font-family: 'Kanit'; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";
        row.style.background = isToday ? "#e8f5e9" : "#f5f5f5";
        row.style.borderLeftColor = isToday ? "#28a745" : "#9e9e9e";

        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <b style="color:${isToday ? '#28a745' : '#616161'}; font-size:14px;">${item.sid || item.stationName}</b>
                <span style="font-size:11px; color:#888;">${dateStr}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
                    <span style="font-size:12px; color:#333; white-space:nowrap;">👤 ${item.userName}</span>
                    ${item.tel ? `<a href="tel:${telLink}" style="text-decoration:none; color:#28a745; font-size:11px;">📞 โทร</a>` : ''}
                </div>
                <span style="font-size:12px; color:#444; font-weight:600; min-width:fit-content; margin-left:10px;">${timeStr} น.</span>
            </div>
            ${containerId === 'ETCListContainer' ? `
                <div style="font-size:10px; color:#666; margin-top:3px; border-top: 1px dashed #ddd; padding-top:2px; font-style:italic;">
                    📝 ${detailText}
                </div>` : ''} 
        `;
        container.appendChild(row);
    });
}

/**
 * 5. Event Listeners & Live Clock
 */
document.addEventListener("DOMContentLoaded", () => {
    startLiveClock();
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const sInput = document.getElementById('startDate');
    const eInput = document.getElementById('endDate');
    const searchInput = document.getElementById('searchInput');

    if(sInput) sInput.value = todayStr;
    if(eInput) eInput.value = todayStr;
    
    searchInput?.addEventListener("input", applyFilters);
    sInput?.addEventListener("change", applyFilters);
    eInput?.addEventListener("change", applyFilters);
    
    initDashboard();
});

function resetFilters() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (document.getElementById('searchInput')) document.getElementById('searchInput').value = "";
    if (document.getElementById('startDate')) document.getElementById('startDate').value = today;
    if (document.getElementById('endDate')) document.getElementById('endDate').value = today;
    
    applyFilters();
    if (map) map.setView([13.75, 100.52], 7);
}

function startLiveClock() {
    function updateClock() {
        const now = new Date();
        const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
        const dateStr = now.toLocaleDateString('th-TH', dateOptions);
        const timeStr = now.toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const clockEl = document.getElementById("clockDisplay");
        if (clockEl) clockEl.innerHTML = `📅 ${dateStr} | 🕒 ${timeStr} น.`;
    }
    setInterval(updateClock, 1000);
    updateClock();
}