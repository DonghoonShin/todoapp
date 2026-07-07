const SHEET_NAME = 'Todos'

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.appendRow(['id', 'text', 'completed'])
  }
  return sheet
}

function doGet() {
  const sheet = getSheet()
  const rows = sheet.getDataRange().getValues()
  const todos = rows.slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      id: String(row[0]),
      text: String(row[1]),
      completed: row[2] === true || row[2] === 'TRUE',
    }))
  return jsonResponse(todos)
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents)
  const sheet = getSheet()

  if (body.action === 'add') {
    sheet.appendRow([body.id, body.text, false])
  } else if (body.action === 'toggle') {
    const rowIndex = findRowById(sheet, body.id)
    if (rowIndex > -1) {
      const cell = sheet.getRange(rowIndex + 1, 3)
      cell.setValue(!cell.getValue())
    }
  } else if (body.action === 'delete') {
    const rowIndex = findRowById(sheet, body.id)
    if (rowIndex > -1) {
      sheet.deleteRow(rowIndex + 1)
    }
  }

  return jsonResponse({ ok: true })
}

function findRowById(sheet, id) {
  const rows = sheet.getDataRange().getValues()
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) return i
  }
  return -1
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
