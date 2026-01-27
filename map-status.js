const API_URL = "https://script.google.com/macros/s/AKfycbzT2U6Zf9q-ieWioQw5e1BohRYjTyqVb9mo3N6-O3-wF3U3QTYgg9LC8ia2A8oWtXwT/exec";
const targetSIDs = ["NTB", "TSA", "KCD", "PPA", "TRA", "KBB", "BKO", "PKA", "PKB", "PAT", "KMA", "KBA", "PKD", "KNA", "WSA", "TMG", "KTM"];

let map;
let labelLayer;

async function initMap() {
    map = L.map('fullMap').setView([13.8, 100.5], 7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
    labelLayer = L.layerGroup().addTo(map);

    await fetchData();
    // อัปเดตข้อมูลทุก 1 นาที
    setInterval(fetchData, 60000);
}

async function fetchData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        if (data) render(data.allStations, data.checkins);
    } catch (e) {
        console.error("Data fetch failed:", e);
    }
}

function render(stations, checkins) {
    labelLayer.clearLayers();
    const now = new Date();
    const bounds = [];

    // กรองเฉพาะสถานีเป้าหมายและมีพิกัด
    const displayStations = stations.filter(st => 
        targetSIDs.includes(st.SName) && !isNaN(parseFloat(st.Lat))
    );

    displayStations.forEach((st, i) => {
        const lat = parseFloat(st.Lat);
        const lon = parseFloat(st.Lon);

        const logs = checkins.filter(cp => cp.sid === st.SName && (cp.job || "").includes("เข้าปฏิบัติงานกะ"));
        const lastIn = logs.sort((a, b) => new Date(b.time) - new Date(a.time))[0];

        // --- คำนวณการเยื้อง (Offset) กระจายตัวเป็นวงกลม ---
        const angle = (i / displayStations.length) * (2 * Math.PI);
        const dist = 0.12; // ระยะห่างของเส้นลาก
        const labelLat = lat + (Math.sin(angle) * dist);
        const labelLon = lon + (Math.cos(angle) * dist);

        let labelClass = "station-label";
        let content = `<div class="label-sid">${st.SName}</div><div style="color:#999">ไม่มีข้อมูล</div>`;

        if (lastIn) {
            const checkDate = new Date(lastIn.time);
            const diffHours = (now - checkDate) / (1000 * 60 * 60);
            const isToday = checkDate.toDateString() === now.toDateString();
            const timeStr = checkDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

            if (isToday && diffHours > 8) labelClass += " is-late";
            else if (!isToday) labelClass += " is-offline";

            content = `
                <div class="label-sid">${st.SName} <span class="label-time">${timeStr} น.</span></div>
                <div class="label-user">👤 ${lastIn.userName}</div>
            `;
        }

        // 1. วาดจุด Marker จริง
        L.circleMarker([lat, lon], { radius: 5, color: '#28a745', fillOpacity: 1 }).addTo(labelLayer);

        // 2. วาดเส้นเชื่อม (Polyline)
        L.polyline([[lat, lon], [labelLat, labelLon]], { 
            color: '#999', weight: 1.5, dashArray: '5, 5', opacity: 0.6 
        }).addTo(labelLayer);

        // 3. วาด Label
        L.marker([labelLat, labelLon], {
            icon: L.divIcon({
                html: `<div class="${labelClass}">${content}</div>`,
                iconSize: [150, 60],
                iconAnchor: [75, 30]
            })
        }).addTo(labelLayer);

        bounds.push([lat, lon], [labelLat, labelLon]);
    });

    if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
}

document.addEventListener("DOMContentLoaded", initMap);