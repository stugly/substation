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
        
        console.log("Data from Sheets:", data); // 🚩 เพิ่มบรรทัดนี้เพื่อดูชื่อตัวแปรใน Console (F12)
        
        allCheckins = data.checkins || [];
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
    tableBody.innerHTML = ''; // ล้างข้อมูลเดิม

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">ไม่พบข้อมูล</td></tr>';
        return;
    }

    data.forEach(item => {
    const row = `
        <tr>
            <td>
                <div style="font-weight:600;">${item.time || item.Timestamp || '-'}</div>
                <div style="font-size:11px; color:#888;">${item.date || '-'}</div>
            </td>
            <td>
                <div>${item.name || item.userName || 'ไม่ระบุชื่อ'}</div>
                <div style="font-size:12px; color:var(--line-green);">${item.station || item.location || '-'}</div>
            </td>
            <td>
                <span class="badge-job">${item.jobType || item.job || '-'}</span>
                <div style="font-size:11px; color:#999; margin-top:4px;">อากาศ: ${item.weather || '-'}</div>
            </td>
        </tr>
    `;
    tableBody.insertAdjacentHTML('beforeend', row);
    });
}

// 5. ฟังก์ชันค้นหาและกรองข้อมูล (Search & Date Filter)
function filterData() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const filtered = allCheckins.filter(item => {
        // เงื่อนไขค้นหาชื่อ/หน่วยงาน
        const matchesSearch = item.name.toLowerCase().includes(searchTerm) || 
                             item.station.toLowerCase().includes(searchTerm);
        
        // เงื่อนไขวันที่ (ถ้ามีการเลือก)
        let matchesDate = true;
        if (startDate && endDate) {
            const itemDate = new Date(item.date); // ต้องมั่นใจว่า item.date เป็น Format ที่ JS อ่านได้ เช่น YYYY-MM-DD
            matchesDate = itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
        }

        return matchesSearch && matchesDate;
    });

    renderTable(filtered);
}

// 6. ตัวควบคุม Spinner (ใช้ตัวเดียวกับหน้าอื่นๆ)
function showSpinner(show) {
    document.getElementById('spinner').style.display = show ? 'flex' : 'none';
}