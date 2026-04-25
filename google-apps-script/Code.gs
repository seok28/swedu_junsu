const SHEET_NAME = "manuals";
const SPREADSHEET_ID = "1aMOq2uZB9CWhtCICTXsd8FARGdhBHgGJkN4B7YEuDdM";
const ADMIN_KEY = "";
const HEADERS = ["id", "title", "category", "owner", "status", "updatedAt", "summary", "steps", "reference"];

function doGet() {
  return jsonResponse({ ok: true, manuals: readManuals() });
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    const action = payload.action || "list";

    if (action === "list") {
      return jsonResponse({ ok: true, manuals: readManuals() });
    }

    if (ADMIN_KEY && payload.adminKey !== ADMIN_KEY) {
      return jsonResponse({ ok: false, error: "관리자 키가 올바르지 않습니다." });
    }

    if (action === "upsert") {
      upsertManual(payload.manual);
      return jsonResponse({ ok: true, manuals: readManuals() });
    }

    if (action === "delete") {
      deleteManual(payload.id);
      return jsonResponse({ ok: true, manuals: readManuals() });
    }

    return jsonResponse({ ok: false, error: "지원하지 않는 action입니다." });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function readManuals() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values.slice(1).filter((row) => row[0]).map((row) => ({
    id: String(row[0]),
    title: String(row[1] || ""),
    category: String(row[2] || "etc"),
    owner: String(row[3] || "AI/SW교육지원팀"),
    status: String(row[4] || "정상"),
    updatedAt: formatDate(row[5]),
    summary: String(row[6] || ""),
    steps: String(row[7] || "").split("\n").filter(Boolean),
    reference: String(row[8] || ""),
  }));
}

function upsertManual(manual) {
  if (!manual || !manual.id) {
    throw new Error("저장할 매뉴얼 id가 없습니다.");
  }

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const rowValues = manualToRow(manual);
  const rowIndex = values.findIndex((row, index) => index > 0 && String(row[0]) === String(manual.id));

  if (rowIndex === -1) {
    sheet.appendRow(rowValues);
  } else {
    sheet.getRange(rowIndex + 1, 1, 1, HEADERS.length).setValues([rowValues]);
  }
}

function deleteManual(id) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const rowIndex = values.findIndex((row, index) => index > 0 && String(row[0]) === String(id));

  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex + 1);
  }
}

function manualToRow(manual) {
  return [
    manual.id,
    manual.title || "",
    manual.category || "etc",
    manual.owner || "AI/SW교육지원팀",
    manual.status || "정상",
    manual.updatedAt || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    manual.summary || "",
    Array.isArray(manual.steps) ? manual.steps.join("\n") : String(manual.steps || ""),
    manual.reference || "",
  ];
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = HEADERS.every((header, index) => firstRow[index] === header);

  if (!hasHeaders) {
    sheet.clear();
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function formatDate(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  return String(value || "");
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
