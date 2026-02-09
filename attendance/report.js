// 1. กำหนดตัวแปรหลัก
let allCheckins = []; // เก็บข้อมูลทั้งหมดที่โหลดมาครั้งแรกเพื่อใช้ Filter
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzT2U6Zf9q-ieWioQw5e1BohRYjTyqVb9mo3N6-O3-wF3U3QTYgg9LC8ia2A8oWtXwT/exec"; 

// 2. โหลดข้อมูลเมื่อเปิดหน้าจอ
document.addEventListener('DOMContentLoaded', function() {
    loadReportData();
    
    // ตั้งค่า Event Listener ให้ปุ่มค้นหา
    document.getElementById('btnSearch').addEventListener('click', filterData);
});

// 3. ฟังก์ชันดึงข้อมูลจาก Google Sheets
async function loadReportData() {
    showSpinner(true);
    try {
        const response = await fetch(SCRIPT_URL + "?action=getCheckins");
        const data = await response.json();
        
        console.log("Data from Sheets:", data); 

        allCheckins = (data.checkins || []).reverse(); 
        renderTable(allCheckins);   
    } catch (error) {
        console.error("Error loading data:", error);
        alert("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
        showSpinner(false);
    }
}

// 4. ฟังก์ชันแสดงผลข้อมูลลงในตาราง
function renderTable(data) {
    const tableBody = document.getElementById('logTable');
    tableBody.innerHTML = ''; 

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">ไม่พบข้อมูล</td></tr>';
        return;
    }

    data.forEach(item => {
        // 1. เตรียมข้อมูลจาก GS
        const rawDate = new Date(item.time);
        const timeStr = rawDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const dateStr = rawDate.toLocaleDateString('th-TH');

        const userName = item.userName || "-";
        const tel = item.tel || "";
        const station = item.stationName || "-";
        const unit = item.unit || "-"; 
        const jobType = item.job || "-";
        const weather = item.weather || "-";

        // 2. สร้างแถวตาราง (4 คอลัมน์ตามหัวข้อ)
        const row = `
            <tr>
                <td style="white-space: nowrap;">
                    <div style="font-weight:600; color:#333;">${timeStr} น.</div>
                    <div style="font-size:11px; color:#888;">${dateStr}</div>
                </td>
                <td>
                    <div style="margin-top:5px;"><span class="badge-job">${jobType}</span></div>
                </td>
                <td>
                    <div style="font-weight:600; color:#333;">${userName}</div>
                    ${tel && tel !== "-" ? 
                        `<div style="font-size:11px;">
                            <a href="tel:${tel}" style="color:#28a745; text-decoration:none;">📞 ${tel}</a>
                        </div>` 
                        : ''
                    }
                </td>
                <td>
                    <div style="font-weight:600; color:var(--line-green);">${station}</div>
                    <div style="font-size:11px; color:#666; margin-top:2px;">หน่วย: ${unit}</div>
                </td>
                
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

// 5. ฟังก์ชันค้นหาและกรองข้อมูล (Search & Date Filter)
function filterData() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const startDateInput = document.getElementById('startDate').value;
    const endDateInput = document.getElementById('endDate').value;

    const filtered = allCheckins.filter(item => {
        // กรองด้วยชื่อและสถานี
        const n = String(item.userName || "").toLowerCase();
        const s = String(item.stationName || "").toLowerCase();
        const matchesSearch = n.includes(searchTerm) || s.includes(searchTerm);

        // กรองด้วยวันที่
        let matchesDate = true;
        if (startDateInput && endDateInput) {
            const itemDate = new Date(item.time).setHours(0,0,0,0);
            const start = new Date(startDateInput).setHours(0,0,0,0);
            const end = new Date(endDateInput).setHours(0,0,0,0);
            matchesDate = itemDate >= start && itemDate <= end;
        }

        return matchesSearch && matchesDate;
    });

    renderTable(filtered);
}

// 6. ตัวควบคุม Spinner (ใช้ตัวเดียวกับหน้าอื่นๆ)
function showSpinner(show) {
    document.getElementById('spinner').style.display = show ? 'flex' : 'none';
}