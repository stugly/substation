const SHEET_USERS = "Users";
const SHEET_STATIONS = "Stations";
const SHEET_CHECKPOINTS = "Checkpoints";
const SHEET_JOBS = "Jobs";

/**
 * 1. รองรับการดึงข้อมูลแบบ GET (สำหรับ Dashboard ในอนาคต)
 */
function doGet(e) {
  const data = getReportData();
  return output(data);
}

/**
 * 2. รองรับการส่งข้อมูลแบบ POST (จาก LIFF และ GitHub Pages)
 */
function doPost(e) {
  let data;
  
  // ตรวจสอบวิธีที่ข้อมูลถูกส่งมา (JSON หรือ Form-data)
  if (e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      data = e.parameter;
    }
  } else {
    data = e.parameter;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ระบบ Routing ตาม Action
  try {
    if (data.action == "checkUser") return output(checkUser(data, ss));
    if (data.action == "bindUser") return output(bindUser(data, ss));
    if (data.action == "getNearbyStations") return output(getNearbyStations(data, ss));
    if (data.action == "getJobs") return output(getJobs(ss));
    if (data.action == "checkin") return output(checkin(data, ss));
    
    return output({status: "ERROR", message: "ไม่พบ Action ที่ระบุ"});
  } catch (error) {
    return output({status: "ERROR", message: "Server Error: " + error.toString()});
  }
}

/**
 * 3. ฟังก์ชันส่งออก JSON (สำคัญมาก: ช่วยแก้ปัญหา CORS)
 */
function output(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- ฟังก์ชันการทำงานภายใน ---

function checkUser(data, ss) {
  const sh = ss.getSheetByName(SHEET_USERS);
  const values = sh.getDataRange().getValues();
  const header = values.shift();
  const idxUID = header.indexOf("UID"), 
        idxLID = header.indexOf("LINE_UserID"), 
        idxLName = header.indexOf("LINE_Name"),
        idxName = header.indexOf("Name");

  for (let i = 0; i < values.length; i++) {
    if (values[i][idxLID] == data.lineUserId) {
      // อัปเดตชื่อ LINE ถ้ามีการเปลี่ยนแปลง
      if (values[i][idxLName] != data.lineName) {
        sh.getRange(i + 2, idxLName + 1).setValue(data.lineName);
      }
      return { status: "FOUND", user: { UID: values[i][idxUID], Name: values[i][idxName] } };
    }
  }

  // ถ้าไม่เจอ ให้ส่งรายชื่อพนักงานที่ยังไม่ได้ผูกบัญชีไปให้เลือก
  let freeUsers = values.filter(r => !r[idxLID]).map(r => ({ UID: r[idxUID], Name: r[idxName] }));
  return { status: "NEED_BIND", freeUsers: freeUsers };
}

function bindUser(data, ss) {
  const sh = ss.getSheetByName(SHEET_USERS);
  const values = sh.getDataRange().getValues();
  const header = values[0];
  const idxUID = header.indexOf("UID"), 
        idxLID = header.indexOf("LINE_UserID"), 
        idxLName = header.indexOf("LINE_Name");

  const inputUID = data.uid.toString().trim();
  for (let i = 1; i < values.length; i++) {
    if (values[i][idxUID].toString().trim() === inputUID) {
      if (values[i][idxLID]) return { status: "ALREADY", message: "รหัสนี้ถูกผูกไปแล้ว" };
      sh.getRange(i + 1, idxLID + 1).setValue(data.lineUserId);
      sh.getRange(i + 1, idxLName + 1).setValue(data.lineName);
      return { status: "OK" };
    }
  }
  return { status: "NOTFOUND", message: "ไม่พบรหัสพนักงานในระบบ" };
}

function getNearbyStations(data, ss) {
  const sh = ss.getSheetByName(SHEET_STATIONS);
  const values = sh.getDataRange().getValues();
  const header = values.shift();
  const idxSID = header.indexOf("SID"), 
        idxName = header.indexOf("SName"), 
        idxUnit = header.indexOf("Unit"),
        idxLat = header.indexOf("Latitude"), 
        idxLon = header.indexOf("Longitude"), 
        idxRad = header.indexOf("Radius_m");

  let stations = [];
  values.forEach(r => {
    const dist = calcDistance(data.lat, data.lon, r[idxLat], r[idxLon]);
    if (dist <= r[idxRad]) {
      stations.push({ SID: r[idxSID], SName: r[idxName], Unit: r[idxUnit] || "-", distance: Math.round(dist) });
    }
  });
  
  if (stations.length == 0) return { status: "ERROR", message: "ไม่อยู่ในรัศมีสถานีใดๆ" };
  stations.sort((a, b) => a.distance - b.distance);
  return { status: "OK", stations: stations };
}

function getJobs(ss) {
  const sh = ss.getSheetByName(SHEET_JOBS);
  const values = sh.getDataRange().getValues();
  values.shift();
  return { status: "OK", jobs: values.map(r => r[0]).filter(j => j) };
}

function checkin(data, ss) {
  const shCP = ss.getSheetByName(SHEET_CHECKPOINTS);
  const shUsers = ss.getSheetByName(SHEET_USERS);
  const users = shUsers.getDataRange().getValues();
  const idxUID = users[0].indexOf("UID"), idxLID = users[0].indexOf("LINE_UserID");

  let uid = "";
  for(let i=1; i<users.length; i++) {
    if(users[i][idxLID] == data.lineUserId) { uid = users[i][idxUID]; break; }
  }

  if (!uid) return { status: "ERROR", message: "ไม่พบข้อมูลการลงทะเบียน" };

  shCP.appendRow([
    "CP-" + Date.now(), new Date(), uid, data.lineUserId, 
    data.SID, data.Job, data.Note || "-", data.Unit, data.lat, data.lon
  ]);
  return { status: "OK", message: "✅ บันทึกสำเร็จ" };
}

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getReportData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cp = ss.getSheetByName(SHEET_CHECKPOINTS).getDataRange().getValues();
  const st = ss.getSheetByName(SHEET_STATIONS).getDataRange().getValues();
  cp.shift(); st.shift();
  return { 
    checkins: cp.map(r => ({ id: r[0], time: r[1], uid: r[2], job: r[5], lat: r[8], lon: r[9] })),
    units: [...new Set(st.map(r => r[2]))].filter(u => u)
  };
}
