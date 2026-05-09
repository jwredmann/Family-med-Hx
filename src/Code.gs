// =====================================================================
// Redmann Family Medical History — Code.gs
// Google Apps Script | Server-Side Logic
// =====================================================================

// ── Constants ─────────────────────────────────────────────────────────

var SHEET = {
  PEOPLE:  'People',
  MEDICAL: 'MedicalHistory',
  AUDIT:   'AuditLog'
};

var FAMILY_BRANCHES = [
  'John W. Redmann, Sr.',
  'Ana Maria Redmann Chandler',
  'Mary Redmann',
  'Eugene Redmann',
  'Teresita Redmann',
  'Ceci Redmann Whitehurst',
  'Alice Redmann',
  'Maria Redmann'
];

var ADMIN_NAMES = [
  'John W. Redmann, Sr.',
  'Amanda Redmann',
  'Christian Courier',
  'Anna Redmann',
  'Mary Redmann',
  'Tara Redmann',
  'Ben Bible'
];

var CATEGORIES = [
  'Chronic Condition',
  'Mental Health',
  'Genetic / Hereditary',
  'Allergy',
  'Surgical History',
  'Medication',
  'Cause of Death',
  'Other'
];

var GENERATIONS = [
  { value: 'Gen0', label: 'Gen 0 — Distant Ancestors' },
  { value: 'Gen1', label: 'Gen 1 — Great-Great-Grandparents' },
  { value: 'Gen2', label: 'Gen 2 — Great-Grandparents' },
  { value: 'Gen3', label: 'Gen 3 — Grandparents (Morris & Esther)' },
  { value: 'Gen4', label: "Gen 4 — Parents' Generation (grandparents' children)" },
  { value: 'Gen5', label: "Gen 5 — John's Generation (the 8 siblings)" },
  { value: 'Gen6', label: 'Gen 6 — Children of the Siblings' },
  { value: 'Gen7', label: 'Gen 7 — Grandchildren' }
];

// ── Web App Entry Point ───────────────────────────────────────────────

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Redmann Family Medical History')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ── Configuration ─────────────────────────────────────────────────────

function getConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: props.getProperty('SPREADSHEET_ID') || '',
    adminPassword:  props.getProperty('ADMIN_PASSWORD')  || 'RedmannFamily2024!'
  };
}

// ── Spreadsheet Helpers ───────────────────────────────────────────────

function getSpreadsheet() {
  var id = getConfig().spreadsheetId;
  if (!id) {
    throw new Error(
      'Database not configured. ' +
      'Please run setupDatabase() once from the Apps Script editor (Extensions > Apps Script > Run > setupDatabase).'
    );
  }
  return SpreadsheetApp.openById(id);
}

function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

// ── Authentication ────────────────────────────────────────────────────

function checkAdminPassword(password) {
  return (password === getConfig().adminPassword);
}

// ── People ────────────────────────────────────────────────────────────

function getAllPeople() {
  return sheetToObjects(getSheet(SHEET.PEOPLE));
}

function addPerson(data, enteredBy) {
  var sheet = getSheet(SHEET.PEOPLE);
  var id    = 'P' + Date.now();
  var now   = new Date().toISOString();
  sheet.appendRow([
    id,
    data.firstName    || '',
    data.lastName     || '',
    data.nickname     || '',
    data.dob          || '',
    data.dod          || '',
    data.generation   || 'Gen6',
    data.familyBranch || '',
    data.relationship || '',
    data.spouseOfId   || '',
    data.fatherId     || '',
    data.motherId     || '',
    data.email        || '',
    'FALSE',
    data.notes        || '',
    enteredBy         || 'Family Member',
    now
  ]);
  auditLog('ADD_PERSON', (data.firstName || '') + ' ' + (data.lastName || ''), enteredBy);
  return { success: true, id: id };
}

// ── Medical History ───────────────────────────────────────────────────

function getAllMedicalHistory(isAdmin, userBranch) {
  var records = sheetToObjects(getSheet(SHEET.MEDICAL));
  return records.filter(function(r) {
    var level = r.PrivacyLevel || 'Public';
    if (level === 'Public')     return true;
    if (isAdmin)                return true;
    if (level === 'BranchOnly') {
      var branches = (r.VisibleToBranches || '').split(',').map(function(b) { return b.trim(); });
      return userBranch && branches.indexOf(userBranch) !== -1;
    }
    return false; // Private — admins only
  });
}

function addMedicalRecord(data, enteredBy) {
  var sheet = getSheet(SHEET.MEDICAL);
  var id    = 'M' + Date.now();
  var now   = new Date().toISOString();
  sheet.appendRow([
    id,
    data.personId         || '',
    data.personName       || '',
    data.condition        || '',
    data.category         || '',
    data.tier             || '',
    data.ageAtDiagnosis   || '',
    data.yearDiagnosed    || '',
    data.status           || 'Active',
    data.notes            || '',
    data.privacyLevel     || 'Public',
    data.visibleToBranches|| '',
    enteredBy             || 'Family Member',
    now,
    now
  ]);
  auditLog('ADD_MEDICAL', (data.personName || '') + ': ' + (data.condition || ''), enteredBy);
  return { success: true, id: id };
}

// ── App Data (called on page load) ────────────────────────────────────

function getAppData(userBranch, isAdmin) {
  try {
    return {
      success:    true,
      people:     getAllPeople(),
      medical:    getAllMedicalHistory(isAdmin, userBranch),
      branches:   FAMILY_BRANCHES,
      adminNames: ADMIN_NAMES,
      categories: CATEGORIES,
      generations: GENERATIONS
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── Audit Log ─────────────────────────────────────────────────────────

function auditLog(action, detail, who) {
  try {
    var sheet = getSheet(SHEET.AUDIT);
    if (sheet) sheet.appendRow([new Date().toISOString(), action, detail, who || '']);
  } catch (e) { /* audit failures must never crash the app */ }
}

// ── One-Time Database Setup ───────────────────────────────────────────
// Run this ONCE from the Apps Script editor:
//   Extensions > Apps Script > (select setupDatabase) > Run

function setupDatabase() {
  var ss   = SpreadsheetApp.create('Redmann Family Medical History — Database');
  var id   = ss.getId();
  var prop = PropertiesService.getScriptProperties();
  prop.setProperty('SPREADSHEET_ID', id);
  prop.setProperty('ADMIN_PASSWORD',  'RedmannFamily2024!');

  var blank = ss.getSheets()[0];

  // People
  var pSheet = ss.insertSheet(SHEET.PEOPLE);
  pSheet.appendRow([
    'ID','FirstName','LastName','Nickname','DOB','DOD',
    'Generation','FamilyBranch','RelationshipToJohn',
    'SpouseOfID','FatherID','MotherID','Email','IsAdmin',
    'Notes','EnteredBy','DateEntered'
  ]);
  styleHeader(pSheet);
  populatePeople(pSheet);

  // Medical History
  var mSheet = ss.insertSheet(SHEET.MEDICAL);
  mSheet.appendRow([
    'ID','PersonID','PersonName','Condition','Category','Tier',
    'AgeAtDiagnosis','YearDiagnosed','Status','Notes',
    'PrivacyLevel','VisibleToBranches','EnteredBy','DateEntered','LastUpdated'
  ]);
  styleHeader(mSheet);

  // Audit Log
  var aSheet = ss.insertSheet(SHEET.AUDIT);
  aSheet.appendRow(['Timestamp','Action','Detail','EnteredBy']);
  styleHeader(aSheet);

  ss.deleteSheet(blank);

  Logger.log('✅ Setup complete!');
  Logger.log('📊 Spreadsheet URL: ' + ss.getUrl());
  Logger.log('🔑 Default admin password: RedmannFamily2024!');
  Logger.log('   Change via: Script Properties > ADMIN_PASSWORD');

  return { success: true, url: ss.getUrl(), id: id };
}

function styleHeader(sheet) {
  var last  = sheet.getLastColumn();
  var range = sheet.getRange(1, 1, 1, last);
  range.setFontWeight('bold')
       .setBackground('#1a3a6b')
       .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, last);
}

// ── Pre-Populated Family Data ─────────────────────────────────────────

function populatePeople(sheet) {
  var now = new Date().toISOString();

  // Columns: ID, FirstName, LastName, Nickname, DOB, DOD, Generation,
  //          FamilyBranch, RelationshipToJohn, SpouseOfID, FatherID, MotherID,
  //          Email, IsAdmin, Notes, EnteredBy, DateEntered
  var rows = [

    // ── Distant Ancestors (Gen 0) ───────────────────────────────────────
    ['P001','Timothy','O\'Brien','','1823','1873',
     'Gen0','Ancestors','Great-Great-Grandfather (O\'Brien line)',
     '','','','','FALSE',
     'Root ancestor of the O\'Brien descendant chart','System',now],

    ['P002','Margaret Abbie','Collins','','1829','1904',
     'Gen0','Ancestors','Great-Great-Grandmother (O\'Brien line)',
     'P001','','','','FALSE',
     'Wife of Timothy O\'Brien','System',now],

    // ── Great-Grandparents (Gen 1 / 2) ─────────────────────────────────
    ['P003','Joseph Vincent','Redmann','','1845','1920',
     'Gen2','Ancestors','Great-Grandfather (paternal)',
     '','','','','FALSE','','System',now],

    ['P004','Ellen Maria','O\'Brien','','1851','1941',
     'Gen2','Ancestors','Great-Grandmother (paternal)',
     'P003','P001','P002','','FALSE',
     'Daughter of Timothy O\'Brien; married Joseph Vincent Redmann','System',now],

    // ── Grandparents (Gen 3) ────────────────────────────────────────────
    ['P005','Morris Benjamin','Redmann Sr.','','1896','1955',
     'Gen3','Ancestors','Grandfather (paternal)',
     '','P003','P004','','FALSE',
     'Morris Benjamin Redmann Sr.','System',now],

    ['P006','Esther Alice','Joyce','Esther','1899','1956',
     'Gen3','Ancestors','Grandmother (paternal)',
     'P005','','','','FALSE',
     'née Joyce; married Morris Benjamin Redmann Sr.','System',now],

    // ── Parents\' Generation — Grandparents\' children (Gen 4) ───────────
    ['P010','Morris Benjamin','Redmann Jr.','Morris Jr.','1925','1945',
     'Gen4','Ancestors','Uncle (paternal — deceased young)',
     '','P005','P006','','FALSE',
     'Died age 20, likely in WWII','System',now],

    ['P011','Esther Alice','Redmann','','1926','2010',
     'Gen4','Ancestors','Aunt (the one daughter among 9 sons)',
     '','P005','P006','','FALSE',
     'Order of Saint Ursula (OSU) — religious sister','System',now],

    ['P012','William Vincent','Redmann','','1927','2005',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE','','System',now],

    ['P013','Kerry Patrick','Redmann','','1929','2006',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE','','System',now],

    ['P014','Richard Pius','Redmann','','1933','2007',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE','','System',now],

    ['P015','Jerry','Redmann','','','',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE','','System',now],

    ['P016','Ralph','Redmann','','','',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE','','System',now],

    ['P017','David','Redmann','','','',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE','','System',now],

    ['P018','Robert','Redmann','','','',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE','','System',now],

    // ── John\'s Generation — the 8 siblings (Gen 5) ─────────────────────
    ['P020','John W.','Redmann, Sr.','','','',
     'Gen5','John W. Redmann, Sr.','Self — Primary Administrator',
     '','','','','TRUE',
     'Project creator and primary administrator','System',now],

    ['P021','Amanda Marie','Redmann','Amanda','','',
     'Gen5','John W. Redmann, Sr.','Wife of John Sr.',
     'P020','','','','TRUE','Admin','System',now],

    ['P022','Ana Maria','Redmann Chandler','Aneux','','',
     'Gen5','Ana Maria Redmann Chandler','Sister (oldest sibling)',
     '','','','','FALSE','Goes by Aneux','System',now],

    ['P023','Mary','Redmann','','','',
     'Gen5','Mary Redmann','Sister',
     '','','','','TRUE','Admin','System',now],

    ['P024','Eugene','Redmann','','','',
     'Gen5','Eugene Redmann','Brother',
     '','','','','FALSE','','System',now],

    ['P025','Teresita','Redmann','Tere','','',
     'Gen5','Teresita Redmann','Sister',
     '','','','','FALSE','Goes by Tere','System',now],

    ['P026','Ceci','Redmann Whitehurst','','','',
     'Gen5','Ceci Redmann Whitehurst','Sister',
     '','','','','FALSE','','System',now],

    ['P027','Alice','Redmann','','','',
     'Gen5','Alice Redmann','Sister',
     '','','','','FALSE','','System',now],

    ['P028','Maria','Redmann','','','',
     'Gen5','Maria Redmann','Sister',
     '','','','','FALSE','','System',now],

    // ── John\'s Children (Gen 6) ─────────────────────────────────────────
    ['P030','John William','Redmann, Jr.','William','','',
     'Gen6','John W. Redmann, Sr.','Son of John Sr.',
     '','P020','P021','','FALSE',
     'Goes by William or Wm','System',now],

    ['P031','Adelaide','Redmann','Adele','','',
     'Gen6','John W. Redmann, Sr.','Daughter of John Sr.',
     '','P020','P021','','FALSE',
     'Goes by Adele','System',now],

    ['P032','Augustine','Redmann','Augie','','',
     'Gen6','John W. Redmann, Sr.','Son of John Sr.',
     '','P020','P021','','FALSE',
     'Goes by Augie','System',now]
  ];

  rows.forEach(function(r) { sheet.appendRow(r); });
}
