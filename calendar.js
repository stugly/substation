const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzT2U6Zf9q-ieWioQw5e1BohRYjTyqVb9mo3N6-O3-wF3U3QTYgg9LC8ia2A8oWtXwT/exec";
let allCheckins = [];

document.addEventListener('DOMContentLoaded', async () => {
    initSelectors(); // สร้างตัวเลือกเดือน/ปี
    await loadData();
});

function initSelectors() {
    const months = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
    const mSelect = document.getElementById('monthSelector');
    const ySelect = document.getElementById('yearSelector');
    const now = new Date();

    months.forEach((m, i) => {
        mSelect.insertAdjacentHTML('beforeend', `<option value="${i}" ${i === now.getMonth() ? 'selected' : ''}>${m}</option>`);
    });

    for(let y = now.getFullYear(); y >= now.getFullYear() - 1; y--) {
        ySelect.insertAdjacentHTML('beforeend', `<option value="${y}">${y + 543}</option>`); // แสดงเป็น พ.ศ.
    }
}

async function loadData() {
    document.getElementById('spinner').style.display = 'flex';
    try {
        const response = await fetch(SCRIPT_URL + "?action=getCheckins");
        const data = await response.json();
        allCheckins = data.checkins || [];
        
        const stations = [...new Set(allCheckins.map(item => item.stationName))].sort();
        const sSelect = document.getElementById('stationSelector');
        stations.forEach(s => {
            if(s) sSelect.insertAdjacentHTML('beforeend', `<option value="${s}">${s}</option>`);
        });
        updateCalendar();
    } catch (e) { alert("โหลดข้อมูลไม่สำเร็จ"); }
    document.getElementById('spinner').style.display = 'none';
}

function updateCalendar() {
    const grid = document.getElementById('calendarGrid');
    const station = document.getElementById('stationSelector').value;
    const month = parseInt(document.getElementById('monthSelector').value);
    const year = parseInt(document.getElementById('yearSelector').value);

    // ล้างช่องเก่าออกคงไว้แค่หัววัน
    const heads = grid.querySelectorAll('.cal-day-head');
    grid.innerHTML = '';
    heads.forEach(h => grid.appendChild(h));

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) grid.insertAdjacentHTML('beforeend', '<div class="cal-cell"></div>');

    for (let day = 1; day <= daysInMonth; day++) {
        const searchDateStr = new Date(year, month, day).toLocaleDateString('en-CA');

        // กรองข้อมูล: หาคนที่เข้าสถานีนี้ในวันนี้
        const staffInDay = allCheckins.filter(item => {
            const checkinDate = new Date(item.time).toLocaleDateString('en-CA');
            return checkinDate === searchDateStr && item.stationName === station;
        });

        // ดึงพนักงานและงาน (ใช้ Map เพื่อให้ได้คน+งานที่ไม่ซ้ำกัน)
        const staffEntries = staffInDay.map(s => ({
            name: s.userName,
            job: s.job || ""
        }));

        // กรองข้อมูลที่ซ้ำออก (กรณีคนเดียวเช็คอินงานเดิมซ้ำในวันเดียว)
        const uniqueStaff = staffEntries.filter((v, i, a) => 
            a.findIndex(t => (t.name === v.name && t.job === v.job)) === i
        );

        let staffHtml = uniqueStaff.map(s => {
            let colorClass = 'bg-other'; // ค่าเริ่มต้นสีส้ม
            
            // 🚩 ปรับตรงนี้: ทำให้เป็นตัวเล็กให้หมด และตัดช่องว่างทิ้งก่อนเช็ค
            const jobTitle = (s.job || "").toLowerCase().trim();
            
            if (jobTitle.includes('กะ')) {
                colorClass = 'bg-shift'; // สีเขียว
            } else if (jobTitle.includes('patrol')) { // คราวนี้ Patrol หรือ patrol ก็จะติดสีฟ้าครับ
                colorClass = 'bg-patrol'; // สีฟ้า
            }

            return `<div class="cal-staff ${colorClass}">${s.name} (${s.job})</div>`;
        }).join('');

        grid.insertAdjacentHTML('beforeend', `
            <div class="cal-cell">
                <div class="cal-date current-month-date">${day}</div>
                <div style="overflow-y: auto;">${staffHtml}</div>
            </div>
        `);
    }
}