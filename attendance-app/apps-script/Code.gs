const SHEET_NAME = 'Attendance'
const PHOTO_FOLDER_NAME = 'AttendancePhotos'
const PHOTO_FOLDER_ID_KEY = 'PHOTO_FOLDER_ID'
const ALLOWED_IPS_KEY = 'ALLOWED_IPS'

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.appendRow(['timestamp', 'name', 'ip', 'allowed', 'photoUrl'])
  }
  return sheet
}

// Script Properties(프로젝트 설정 > 스크립트 속성)에서 'ALLOWED_IPS'를
// "123.45.67.89,123.45.67.90" 형태의 쉼표 구분 문자열로 등록해두면
// 코드 수정 없이 허용 IP 목록을 바꿀 수 있다.
function getAllowedIps() {
  const raw = PropertiesService.getScriptProperties().getProperty(ALLOWED_IPS_KEY)
  if (!raw) return []
  return raw.split(',').map((ip) => ip.trim()).filter(Boolean)
}

function getOrCreatePhotoFolder() {
  const props = PropertiesService.getScriptProperties()
  const cachedId = props.getProperty(PHOTO_FOLDER_ID_KEY)
  if (cachedId) {
    try {
      return DriveApp.getFolderById(cachedId)
    } catch (err) {
      // 캐시된 폴더가 삭제된 경우 새로 생성한다.
    }
  }
  const folders = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME)
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(PHOTO_FOLDER_NAME)
  props.setProperty(PHOTO_FOLDER_ID_KEY, folder.getId())
  return folder
}

// photoDataUrl: "data:image/jpeg;base64,..." 형태의 문자열
function savePhoto(photoDataUrl, name, timestamp) {
  const match = /^data:(image\/[a-zA-Z]+);base64,(.*)$/.exec(photoDataUrl)
  if (!match) return null
  const mimeType = match[1]
  const base64Data = match[2]
  const extension = mimeType.split('/')[1] || 'jpg'
  const bytes = Utilities.base64Decode(base64Data)
  const blob = Utilities.newBlob(bytes, mimeType, `${timestamp}_${name}.${extension}`)
  const folder = getOrCreatePhotoFolder()
  const file = folder.createFile(blob)
  return file.getUrl()
}

function doGet(e) {
  const sheet = getSheet()
  const rows = sheet.getDataRange().getValues()
  const dateFilter = e && e.parameter && e.parameter.date // 'YYYY-MM-DD'

  const records = rows.slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      timestamp: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
      name: String(row[1]),
      ip: String(row[2]),
      allowed: row[3] === true || row[3] === 'TRUE',
      photoUrl: row[4] ? String(row[4]) : '',
    }))
    .filter((r) => !dateFilter || r.timestamp.slice(0, 10) === dateFilter)

  return jsonResponse(records)
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents)
  const name = (body.name || '').trim()
  const ip = (body.ip || '').trim()
  const photoDataUrl = body.photo || ''

  if (!name || !ip) {
    return jsonResponse({ ok: false, error: 'name과 ip는 필수입니다.' })
  }

  const allowedIps = getAllowedIps()
  // 허용 IP 목록이 비어 있으면(아직 설정 전) 일단 모두 허용 처리한다.
  const allowed = allowedIps.length === 0 || allowedIps.indexOf(ip) > -1

  const timestamp = new Date().toISOString()
  let photoUrl = ''
  if (photoDataUrl) {
    try {
      photoUrl = savePhoto(photoDataUrl, name, timestamp) || ''
    } catch (err) {
      // 사진 저장에 실패해도 출근 기록 자체는 남긴다.
      photoUrl = ''
    }
  }

  const sheet = getSheet()
  sheet.appendRow([timestamp, name, ip, allowed, photoUrl])

  return jsonResponse({ ok: true, allowed, timestamp, ip })
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
