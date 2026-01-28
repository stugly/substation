const API_URL = "https://script.google.com/macros/s/AKfycbzT2U6Zf9q-ieWioQw5e1BohRYjTyqVb9mo3N6-O3-wF3U3QTYgg9LC8ia2A8oWtXwT/exec";
const targetSIDs = ["NTB", "TSA", "KCD", "PPA", "TRA", "KBB", "BKO", "PKA", "PKB", "PAT", "KMA", "KBA", "PKD", "KNA", "WSA", "TMG", "KTM"];

let map;
let labelLayer;
let initialBounds = [];

// 1. เริ่มต้นแผนที่
async function initMap() {
    try {
        showSpinner(true); 
        map = L.map('fullMap', { zoomControl: false }).setView([13.8, 100.5], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        labelLayer = L.layerGroup().addTo(map);

        updateClock();
        setInterval(updateClock, 1000);

        await fetchData();
        setInterval(fetchData, 60000); 
    } catch (err) {
        console.error("Map Init Error:", err);
        showSpinner(false);
    }
}

// 2. ดึงข้อมูลจาก API
async function fetchData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        if (data && data.allStations) {
            renderPoints(data.allStations, data.checkins || []);
        }
    } catch (e) { 
        console.error("Fetch Error:", e); 
    } finally {
        showSpinner(false); 
    }
}

// 3. วาดจุดและการ์ดสถานะ
function renderPoints(stations, checkins) {
    if (!labelLayer) return;
    labelLayer.clearLayers();
    const now = new Date();
    initialBounds = [];
    const cleanSIDs = targetSIDs.map(s => s.trim().toUpperCase());

    stations.forEach((st, i) => {
        const sName = (st.SName || "").toString().toUpperCase();
        const sID = (st.SID || st.ID || "").toString().toUpperCase();
        const matchedSID = cleanSIDs.find(t => sID === t || sName.includes(t));

        if (matchedSID) {
            const lat = parseFloat(st.Lat);
            const lon = parseFloat(st.Lon);
            if (isNaN(lat) || isNaN(lon)) return;

            const logs = checkins.filter(cp => {
                const cpSid = (cp.sid || "").toString().toUpperCase();
                return (cpSid === sName || cpSid.includes(matchedSID)) && (cp.job || "").includes("เข้า");
            });
            const lastIn = logs.sort((a, b) => new Date(b.time) - new Date(a.time))[0];

            if (lastIn) {
                const cDate = new Date(lastIn.time);
                const isToday = cDate.toDateString() === now.toDateString();
                const diffH = (now - cDate) / 3600000;
                const isLate = isToday && diffH > 8;

                let statusClass = ""; 
                let bgStyle = ""; 
                let fontStyle = "font-family: 'Kanit', sans-serif !important;";

                if (!isToday) {
                    statusClass = "is-offline";
                } else if (isLate) {
                    statusClass = "is-late";
                } else {
                    statusClass = "";
                    bgStyle = "background-color: #e8f5e9 !important;"; 
                }

                const sidColor = (isToday && !isLate) ? 'var(--line-green)' : (isToday ? 'var(--warning-yellow)' : 'var(--offline-gray)');
                const dateStr = cDate.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
                const timeStr = cDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                const rawTel = lastIn.tel ? lastIn.tel.toString().trim() : '';
                const telLink = rawTel.replace(/-/g,'');

                const content = `
                    <div class="station-label ${statusClass}" style="${fontStyle} ${bgStyle}">
                        <div class="label-header" style="${fontStyle} border-bottom: 1px solid rgba(0,0,0,0.05); margin-bottom: 5px; padding-bottom: 3px;">
                            <b class="label-sid" style="color:${sidColor}; ${fontStyle}">${matchedSID}</b>
                            <span class="zoom-icon" onclick="zoomToPoint(${lat}, ${lon})" style="cursor:pointer; margin-left:8px;">🔍</span>
                            <span class="label-date" style="margin-left:auto; ${fontStyle} font-size: 11px;">${dateStr}</span>
                        </div>
                        <div class="label-body" style="${fontStyle} display: flex; justify-content: space-between; align-items: flex-end;">
                            <div class="label-info" style="${fontStyle} display: flex; flex-direction: column;">
                                <span class="label-user" style="${fontStyle} font-size: 13px; font-weight: 500;">👤 ${lastIn.userName}</span>
                                ${rawTel ? `
                                    <a href="tel:${telLink}" class="btn-call" style="text-decoration:none; ${fontStyle} font-size: 12px; color: var(--line-green); margin-top: 2px; display: block; font-weight: 400;">
                                        📞 ${rawTel}
                                    </a>` : ''}
                            </div>
                            <div class="label-time" style="${fontStyle} font-size: 13px; font-weight: 600; color: #444; margin-left: 10px;">${timeStr} น.</div>
                        </div>
                    </div>`;

                // คำนวณตำแหน่งวางการ์ดแบบกระจายรอบจุด (ย้ายมาประกาศที่เดียว)
                const angle = (i / targetSIDs.length) * (2 * Math.PI);
                const offset = 0.04; 
                const lLat = lat + (Math.sin(angle) * offset);
                const lLon = lon + (Math.cos(angle) * offset);

                // 1. เส้นเชื่อม (ชัดเจนขึ้น)
                L.polyline([[lat, lon], [lLat, lLon]], { 
                    color: '#444', 
                    weight: 1.5, 
                    dashArray: '5, 5', 
                    opacity: 0.8,
                    interactive: false 
                }).addTo(labelLayer);
                
                // 2. จุด Marker พิกัดจริง (เน้นขอบ)
                L.circleMarker([lat, lon], { 
                    radius: 5, 
                    color: '#ffffff', 
                    fillColor: '#28a745', 
                    fillOpacity: 1,
                    weight: 2
                }).addTo(labelLayer);
                
                // 3. วาดการ์ดข้อมูล
                const marker = L.marker([lLat, lLon], {
                    icon: L.divIcon({ 
                        className: 'custom-div-icon', 
                        html: content, 
                        iconSize: null, 
                        iconAnchor: [0, 0] 
                    })
                }).addTo(labelLayer);

                // เพิ่ม Interaction เล็กน้อยให้การ์ดไม่บังกันเอง
                marker.on('mouseover', function() {
                    this.getElement().style.zIndex = "1000";
                });
                marker.on('mouseout', function() {
                    this.getElement().style.zIndex = "auto";
                });

                initialBounds.push([lat, lon], [lLat, lLon]);
            }
        }
    });
    if (initialBounds.length > 0) resetZoom();
}

// 4. ฟังก์ชันควบคุม Spinner
function showSpinner(show) {
    const spinner = document.getElementById('spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// 5. ฟังก์ชันอื่นๆ
function resetZoom() { if (map && initialBounds.length > 0) map.fitBounds(initialBounds, { padding: [60, 60] }); }
function zoomToPoint(lat, lon) { if (map) map.setView([lat, lon], 16); }

function updateClock() {
    const d = document.getElementById('currentDate');
    const t = document.getElementById('currentTime');
    const now = new Date();
    if (d) d.innerText = now.toLocaleDateString('th-TH');
    if (t) t.innerText = now.toLocaleTimeString('th-TH');
}

document.addEventListener("DOMContentLoaded", initMap);