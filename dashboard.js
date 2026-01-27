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
        const response = await fetch(API_URL, { method: "GET", redirect: "follow" });
        const data = await response.json();

        if (data.allStations && map) renderAllStations(data.allStations);
        if (data.checkins) {
            allCheckins = data.checkins; 
            applyFilters();
        }
    } catch (error) { 
        console.error("Dashboard Load Error:", error); 
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
        [...checkins].reverse().slice(0, 50).forEach((cp) => {
            const dateObj = new Date(cp.time);
            const dateStr = dateObj.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
            const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

            const telForLink = cp.tel ? cp.tel.toString().replace(/-/g, '') : '';

            const row = `<tr>
                <td style="line-height: 1.2;"><span style="font-size: 12px; color: #666;">${dateStr}</span><br><b>${timeStr}</b></td>
                <td>${cp.stationName}</td>
                <td>${cp.job || '-'}</td>
                <td>
                    ${cp.userName}
                    ${cp.tel ? `
                        <br>
                        <a href="tel:${telForLink}" style="text-decoration:none; font-size:11px; color:#28a745; display:inline-flex; align-items:center; gap:3px;">
                            📞 ${cp.tel}
                        </a>` : ''}
                </td>
            </tr>`;
            tableBody.innerHTML += row;

            if (cp.lat && cp.lon) {
                const m = L.circleMarker([cp.lat, cp.lon], { 
                    radius: 7, fillColor: "#28a745", color: "#fff", weight: 2, fillOpacity: 0.9 
                }).bindPopup(`
                    <b>👤 ${cp.userName}</b><br>
                    งาน: ${cp.job || '-'}<br>
                    ${cp.tel ? `📞 <a href="tel:${telForLink}">${cp.tel}</a>` : ''}
                `);
                currentMarkers.addLayer(m);
            }
        });
    }
    if (currentMarkers.getLayers().length > 0) map.fitBounds(currentMarkers.getBounds().pad(0.1));
}

/**
 * 4. ระบบ Filter และจัดการ Card
 */
function applyFilters() {
    const sTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const startDate = document.getElementById('startDate')?.value || "";
    const endDate = document.getElementById('endDate')?.value || "";

    const filtered = allCheckins.filter(cp => {
        const rawDate = cp.time || cp.timestamp;
        const checkinDateStr = new Date(rawDate).toISOString().split('T')[0];
        const matchText = (cp.userName || "").toLowerCase().includes(sTerm) || (cp.stationName || "").toLowerCase().includes(sTerm);
        let matchDate = true;
        if (startDate && endDate) matchDate = (checkinDateStr >= startDate && checkinDateStr <= endDate);
        else if (startDate) matchDate = (checkinDateStr >= startDate);
        else if (endDate) matchDate = (checkinDateStr <= endDate);
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
 * Card 1: สถานะสถานีหลัก (Unit Status)
 */
function renderUnitStatusList(checkins) {
    const container = document.getElementById("unitCheckinToday");
    if (!container) return;
    container.innerHTML = "";
    const todayStr = new Date().toLocaleDateString('en-CA'); 

    let statusData = targetSIDs.map(sid => {
        const logs = checkins.filter(cp => (cp.sid === sid && (cp.job || "").toString().trim().includes("เข้าปฏิบัติงานกะ")));
        const lastIn = logs.sort((a, b) => new Date(b.time) - new Date(a.time))[0];
        return { sid, lastIn };
    });

    statusData.sort((a, b) => (b.lastIn ? new Date(b.lastIn.time).getTime() : 0) - (a.lastIn ? new Date(a.lastIn.time).getTime() : 0));

    statusData.forEach(item => {
        const row = document.createElement("div");
        row.style.cssText = "padding:10px; margin-bottom:6px; border-radius:8px; border-left: 5px solid #ccc; text-align:left; font-family: 'Kanit'; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";

        if (item.lastIn) {
            const checkinDate = new Date(item.lastIn.time);
            const isToday = (checkinDate.toLocaleDateString('en-CA') === todayStr);
            const dateStr = checkinDate.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
            const timeStr = checkinDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            const telLink = item.lastIn.tel ? item.lastIn.tel.toString().replace(/-/g, '') : '';

            row.style.background = isToday ? "#e8f5e9" : "#f5f5f5";
            row.style.borderLeftColor = isToday ? "#28a745" : "#9e9e9e";

            row.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b style="color:${isToday ? '#28a745' : '#616161'}; font-size:14px;">${item.sid}</b>
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
    const todayStr = new Date().toLocaleDateString('en-CA');

    [...items].sort((a, b) => new Date(b.time) - new Date(a.time)).forEach(item => {
        const checkinDate = new Date(item.time);
        const isToday = (checkinDate.toLocaleDateString('en-CA') === todayStr);
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
 * 5. Event Listeners
 */
document.addEventListener("DOMContentLoaded", () => {
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('startDate')) document.getElementById('startDate').value = today;
    if(document.getElementById('endDate')) document.getElementById('endDate').value = today;
    
    document.getElementById("searchInput")?.addEventListener("input", applyFilters);
    document.getElementById("startDate")?.addEventListener("change", applyFilters);
    document.getElementById("endDate")?.addEventListener("change", applyFilters);
    
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
