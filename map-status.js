const API_URL = "https://script.google.com/macros/s/AKfycbzT2U6Zf9q-ieWioQw5e1BohRYjTyqVb9mo3N6-O3-wF3U3QTYgg9LC8ia2A8oWtXwT/exec";
const targetSIDs = ["NTB","TSA","KCD","PPA","TRA","KBB","BKO","PKA","PKB","PAT","KMA","KBA","PKD","KNA","WSA","TMG","KTM"];

let map;
let labelLayer;
let initialBounds = [];
const placedPoints = [];   // ใช้เก็บตำแหน่งการ์ดที่วางแล้ว

// ===============================
// 1. INIT MAP
// ===============================
async function initMap() {
    try {
        showSpinner(true);
        map = L.map('fullMap', { zoomControl:false }).setView([13.8,100.5],7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        labelLayer = L.layerGroup().addTo(map);

        updateClock();
        setInterval(updateClock,1000);

        await fetchData();
        setInterval(fetchData,60000);

    } catch(err){
        console.error("Map Init Error:",err);
        showSpinner(false);
    }
}

// ===============================
// 2. FETCH DATA
// ===============================
async function fetchData(){
    try{
        const response = await fetch(API_URL);
        const data = await response.json();
        if(data && data.allStations){
            renderPoints(data.allStations, data.checkins || []);
        }
    }catch(e){
        console.error("Fetch Error:",e);
    }finally{
        showSpinner(false);
    }
}

// ===============================
// 3. RENDER POINTS
// ===============================
function renderPoints(stations, checkins){
    if(!labelLayer) return;
    labelLayer.clearLayers();
    placedPoints.length = 0;   // ✅ สำคัญมาก: ล้างทุกครั้งที่ render

    const now = new Date();
    initialBounds = [];

    // --- Group stations by near coordinates
    const positionMap = {};
    stations.forEach(st=>{
        const lat = parseFloat(st.Lat);
        const lon = parseFloat(st.Lon);
        if(isNaN(lat)||isNaN(lon)) return;

        const posKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
        if(!positionMap[posKey]) positionMap[posKey]=[];
        positionMap[posKey].push(st);
    });

    // --- Loop groups
    Object.keys(positionMap).forEach(key=>{
        const group = positionMap[key];
        const count = group.length;

        group.forEach((st,index)=>{

            const sName = (st.SName||"").toString().toUpperCase();
            const sID   = (st.SID||st.ID||"").toString().toUpperCase();
            const cleanSIDs = targetSIDs.map(s=>s.trim().toUpperCase());
            const matchedSID = cleanSIDs.find(t=> sID===t || sName.includes(t));
            if(!matchedSID) return;

            const lat = parseFloat(st.Lat);
            const lon = parseFloat(st.Lon);

            const logs = checkins.filter(cp=>{
                const cpSid = (cp.sid||"").toString().toUpperCase();
                return (cpSid===sName || cpSid.includes(matchedSID)) 
                        && (cp.job||"").includes("เข้า");
            });

            const lastIn = logs.sort((a,b)=>new Date(b.time)-new Date(a.time))[0];
            if(!lastIn) return;

            // =========================
            // SPIDER + COLLISION SAFE
            // =========================
            const perRing = 8;
            const ring = Math.floor(index/perRing);
            const ringIndex = index % perRing;
            const ringCount = Math.min(perRing, count - ring*perRing);

            const safeCount = Math.max(2, ringCount);
            const angle = (ringIndex / safeCount) * (2*Math.PI);

            // base pixel point
            const basePoint = map.latLngToLayerPoint([lat,lon]);

            // radius per ring (pixel)
            const pixelRadius = 80 + (ring*60);

            // initial target point
            let finalPoint = L.point(
                basePoint.x + Math.cos(angle)*pixelRadius,
                basePoint.y + Math.sin(angle)*pixelRadius
            );

            // ---- Collision Avoidance in PIXEL SPACE ----
            const minPixelDist = 140; // ปรับระยะห่างการ์ดได้ตรงนี้
            let tries = 0;

            while(tries < 20){
                let collision = false;
                for(const p of placedPoints){
                    const dx = finalPoint.x - p.x;
                    const dy = finalPoint.y - p.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if(dist < minPixelDist){
                        collision = true;
                        break;
                    }
                }
                if(!collision) break;

                // push ออกแบบสุ่ม
                const pushAngle = Math.random()*Math.PI*2;
                finalPoint = L.point(
                    finalPoint.x + Math.cos(pushAngle)*70,
                    finalPoint.y + Math.sin(pushAngle)*70
                );
                tries++;
            }

            // convert back to latlon
            const finalLatLng = map.layerPointToLatLng(finalPoint);

            // store placed pixel
            placedPoints.push(finalPoint);

            const lLat = finalLatLng.lat;
            const lLon = finalLatLng.lng;
            // =========================

            // --- Status calc
            const cDate = new Date(lastIn.time);
            const isToday = cDate.toDateString() === now.toDateString();
            const isLate = isToday && (now - cDate)/3600000 > 8;

            let statusClass = !isToday ? "is-offline" : (isLate ? "is-late" : "");
            let bgStyle = (isToday && !isLate) ? "background-color:#e8f5e9 !important;" : "";
            let fontStyle = "font-family:'Kanit',sans-serif !important;";
            let sidColor = !isToday ? "var(--offline-gray)" : (isLate ? "var(--warning-yellow)" : "var(--line-green)");
            const telLink = lastIn.tel ? lastIn.tel.toString().trim().replace(/-/g,'') : '';

            const content = `
            <div class="station-label ${statusClass}" style="${fontStyle} ${bgStyle}">
                <div class="label-header" style="border-bottom:1px solid rgba(0,0,0,0.05);margin-bottom:5px;padding-bottom:3px;">
                    <b class="label-sid" style="color:${sidColor};">${matchedSID}</b>
                    <span class="zoom-icon" onclick="zoomToPoint(${lat},${lon})" style="cursor:pointer;margin-left:8px;">🔍</span>
                    <span class="label-date" style="margin-left:auto;font-size:11px;">
                        ${cDate.toLocaleDateString('th-TH',{day:'2-digit',month:'2-digit'})}
                    </span>
                </div>
                <div class="label-body" style="display:flex;justify-content:space-between;align-items:flex-end;">
                    <div style="display:flex;flex-direction:column;">
                        <span style="font-size:13px;font-weight:500;">👤 ${lastIn.userName}</span>
                        ${lastIn.tel ? `
                        <a href="tel:${telLink}" style="text-decoration:none;font-size:12px;color:var(--line-green);margin-top:4px;display:flex;align-items:center;gap:6px;">
                        <i class="fa-solid fa-mobile-screen-button"></i>${lastIn.tel}
                        </a>`:''}
                    </div>
                    <div style="font-size:13px;font-weight:600;color:#444;">
                        ${cDate.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})} น.
                    </div>
                </div>
            </div>`;

            // leader line
            L.polyline([[lat,lon],[lLat,lLon]],{
                color:'#444',weight:1.5,dashArray:'5,5',opacity:0.6,interactive:false
            }).addTo(labelLayer);

            // real point
            L.circleMarker([lat,lon],{
                radius:5,color:'#fff',fillColor:'#28a745',fillOpacity:1,weight:2
            }).addTo(labelLayer);

            // card
            const marker = L.marker([lLat,lLon],{
                icon:L.divIcon({className:'custom-div-icon',html:content,iconSize:null,iconAnchor:[0,0]})
            }).addTo(labelLayer);

            marker.on('mouseover',function(){this.getElement().style.zIndex="1000";});
            marker.on('mouseout',function(){this.getElement().style.zIndex="auto";});

            initialBounds.push([lat,lon],[lLat,lLon]);
        });
    });

    if(initialBounds.length>0) resetZoom();
}

// ===============================
function showSpinner(show){
    const spinner=document.getElementById('spinner');
    if(spinner) spinner.style.display = show?'flex':'none';
}

function resetZoom(){
    if(map && initialBounds.length>0){
        map.fitBounds(initialBounds,{padding:[60,60]});
    }
}

function zoomToPoint(lat,lon){
    if(map) map.setView([lat,lon],16);
}

function updateClock(){
    const d=document.getElementById('currentDate');
    const t=document.getElementById('currentTime');
    const now=new Date();
    if(d) d.innerText = now.toLocaleDateString('th-TH');
    if(t) t.innerText = now.toLocaleTimeString('th-TH');
}

document.addEventListener("DOMContentLoaded",initMap);
