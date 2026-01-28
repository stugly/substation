const API_URL = "https://script.google.com/macros/s/AKfycbzT2U6Zf9q-ieWioQw5e1BohRYjTyqVb9mo3N6-O3-wF3U3QTYgg9LC8ia2A8oWtXwT/exec";
const targetSIDs = ["NTB", "TSA", "KCD", "PPA", "TRA", "KBB", "BKO", "PKA", "PKB", "PAT", "KMA", "KBA", "PKD", "KNA", "WSA", "TMG", "KTM"];

let map;
let labelLayer;
let initialBounds = [];

async function initMap() {
    map = L.map('fullMap', { zoomControl: false }).setView([13.8, 100.5], 7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
    
    labelLayer = L.layerGroup().addTo(map);
    
    updateClock();
    setInterval(updateClock, 1000);
    
    await fetchData();
    setInterval(fetchData, 60000); // Auto Refresh ทุก 1 นาที
}

function updateClock() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    if(dateEl) dateEl.innerText = now.toLocaleDateString('th-TH');
    if(timeEl) timeEl.innerText = now.toLocaleTimeString('th-TH');
}

function resetZoom() {
    if (initialBounds.length > 0) map.fitBounds(initialBounds, { padding: [80, 80] });
}

async function fetchData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        if (data && data.allStations) {
            renderPoints(data.allStations, data.checkins || []);
        }
    } catch (e) { console.error("Fetch failed:", e); }
}

function renderPoints(stations, checkins) {
    labelLayer.clearLayers();
    const now = new Date();
    initialBounds = [];
    const cleanSIDs = targetSIDs.map(s => s.trim().toUpperCase());

    stations.forEach((st, i) => {
        const fullSName = (st.SName || "").toUpperCase();
        const sID = (st.SID || st.ID || "").toUpperCase();
        const matched = cleanSIDs.find(t => sID === t || fullSName.includes(t));

        if (matched) {
            const lat = parseFloat(st.Lat);
            const lon = parseFloat(st.Lon);
            if (isNaN(lat) || isNaN(lon)) return;

            const logs = checkins.filter(cp => {
                const cpSid = (cp.sid || "").toUpperCase();
                return (cpSid === fullSName || cpSid.includes(matched)) && (cp.job || "").includes("เข้า");
            });
            const lastIn = logs.sort((a, b) => new Date(b.time) - new Date(a.time))[0];

            // --- Logic กระจาย Card ไม่ให้ทับกัน ---
            const angle = (i / cleanSIDs.length) * (2 * Math.PI);
            const dist = 0.15; // ระยะห่างเส้นโยง
            const lLat = lat + (Math.sin(angle) * dist);
            const lLon = lon + (Math.cos(angle) * dist);

            let labelClass = "station-label";
            let content = `<div class="label-header"><b class="label-sid">${matched}</b><span class="label-date">Offline</span></div>`;

            if (lastIn) {
                const cDate = new Date(lastIn.time);
                const isToday = cDate.toDateString() === now.toDateString();
                const diffH = (now - cDate) / (3600000);
                const isLate = isToday && diffH > 8;

                if (isToday) { if (isLate) labelClass += " is-late"; } 
                else { labelClass += " is-offline"; }

                const sColor = (isToday && !isLate) ? '#28a745' : (isToday ? '#fbc02d' : '#616161');
                const tel = lastIn.tel ? lastIn.tel.toString().trim() : '';

                content = `
                    <div class="label-header">
                        <b class="label-sid" style="color:${sColor}">${matched}</b>
                        <span class="zoom-icon" onclick="map.setView([${lat},${lon}], 14)">🔍</span>
                        <span class="label-date">${cDate.toLocaleDateString('th-TH',{day:'2-digit',month:'2-digit'})}</span>
                    </div>
                    <div class="label-body">
                        <div class="label-info">
                            <span class="label-user">👤 ${lastIn.userName}</span>
                            ${tel ? `<a href="tel:${tel.replace(/-/g,'')}" class="btn-call">📞 ${tel}</a>` : ''}
                        </div>
                        <span class="label-time">${cDate.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})} น.</span>
                    </div>`;
            }

            // วาดจุด, เส้นโยง และ Card
            L.circleMarker([lat, lon], { radius: 5, color: '#28a745', fillOpacity: 1 }).addTo(labelLayer);
            L.polyline([[lat, lon], [lLat, lLon]], { color: '#bbb', weight: 1, dashArray: '4,4' }).addTo(labelLayer);
            L.marker([lLat, lLon], {
                icon: L.divIcon({ html: `<div class="${labelClass}">${content}</div>`, iconSize: null, iconAnchor: [0, 0] })
            }).addTo(labelLayer);

            initialBounds.push([lat, lon], [lLat, lLon]);
        }
    });
    if (initialBounds.length > 0) resetZoom();
}

document.addEventListener("DOMContentLoaded", initMap);