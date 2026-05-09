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
  'Christian Korver',
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

    // ── Distant Ancestors (Gen 0) ────────────────────────────────────────
    ['P001','Timothy','O\'Brien','','1823','1873',
     'Gen0','Ancestors','Great-Great-Grandfather (O\'Brien line)',
     '','','','','FALSE',
     'Root ancestor of the O\'Brien line; from Ireland','System',now],

    ['P002','Margaret Abbie','Collins','','1829','1904',
     'Gen0','Ancestors','Great-Great-Grandmother (O\'Brien line)',
     'P001','','','','FALSE',
     'Wife of Timothy O\'Brien','System',now],

    // ── Great-Grandparents (Gen 2) ───────────────────────────────────────
    ['P003','Joseph Vincent','Redmann','','1845','1920',
     'Gen2','Ancestors','Great-Grandfather (paternal)',
     '','','','','FALSE','','System',now],

    ['P004','Ellen Maria','O\'Brien','','1851','1941',
     'Gen2','Ancestors','Great-Grandmother (paternal)',
     'P003','P001','P002','','FALSE',
     'Daughter of Timothy O\'Brien; married Joseph Vincent Redmann','System',now],

    // ── Grandparents (Gen 3) ─────────────────────────────────────────────
    ['P005','Morris Benjamin','Redmann Sr.','','1896','1955',
     'Gen3','Ancestors','Grandfather (paternal)',
     '','P003','P004','','FALSE',
     'Prominent New Orleans attorney; partner Guste, Barnett & Redmann','System',now],

    ['P006','Esther Alice','Joyce','Esther','1899','1956',
     'Gen3','Ancestors','Grandmother (paternal)',
     'P005','','','','FALSE',
     'née Joyce; excellent pianist; married Morris Benjamin Redmann Sr. Sept 3, 1924','System',now],

    // ── Grandparents\' Children — John\'s Uncles & Aunt (Gen 4) ───────────
    // Morris and Esther had 10 children: 9 sons, 1 daughter
    ['P010','Morris Benjamin','Redmann Jr.','Morris Jr.','1925','1945',
     'Gen4','Ancestors','Uncle (paternal — KIA WWII)',
     '','P005','P006','','FALSE',
     'Killed in action Jan 14, 1945, Battle of the Bulge, Ardennes. 94th Infantry, Patton\'s Army. Never married.','System',now],

    ['P011','Esther Alice','Redmann','','1926','2010',
     'Gen4','Ancestors','Aunt (the one daughter among 9 sons)',
     '','P005','P006','','FALSE',
     'Order of Saint Ursula (OSU) — Sister Mary Esther Redmann; canon judge for the Catholic Church','System',now],

    ['P012','William Vincent','Redmann','','1927','2005',
     'Gen4','Ancestors','Father (son of Morris & Esther)',
     'P029','P005','P006','','FALSE',
     'Judge, Louisiana 4th Circuit Court of Appeal; taught Loyola Law; played piano by ear; buried Dec 26, 2007','System',now],

    ['P013','Kerry Patrick','Redmann Sr.','','1929','2006',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE',
     'USAF veteran; electrical manufacturer\'s representative; author "Unfinished Journey: A WWII Remembrance"','System',now],

    ['P014','Richard Pius','Redmann','','1933','2007',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE',
     'Entered Gethsemani Abbey (Trappist) in Kentucky','System',now],

    ['P015','Jerome Joyce','Redmann','Jerry','','',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE','Goes by Jerry','System',now],

    ['P016','Ralph Christopher','Redmann','','','',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE','','System',now],

    ['P017','David Edmund','Redmann','','','',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE','','System',now],

    ['P018','Robert Eugene','Redmann','Bob','','',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE','Goes by Bob','System',now],

    ['P019','Ronald Louis','Redmann','Ronnie','','',
     'Gen4','Ancestors','Uncle (paternal)',
     '','P005','P006','','FALSE',
     'Goes by Ronnie; co-compiled "180 Songs Esther Played" songbook with brothers David and Robert (2016)','System',now],

    // ── William\'s Wife — Mother of the 8 Siblings (Gen 4) ───────────────
    ['P029','Ana Maria','Macouzet Redmann','','1932','2009',
     'Gen4','Ancestors','Mother (wife of Judge William Redmann)',
     'P012','','','','FALSE',
     'née Macouzet Munoz; born July 26, 1932, Pachuca, Mexico; daughter of Jaime Macouzet Iturbide; married Dec 26, 1955 in Morelia, Mexico; died Dec 24, 2009 in Mandeville, LA','System',now],

    // ── John\'s Generation — the 8 siblings, children of William & Ana Maria (Gen 5) ──
    // Siblings listed oldest to youngest; John is the youngest (#8)
    ['P022','Ana Maria','Redmann Chandler','Aneux','1956','',
     'Gen5','Ana Maria Redmann Chandler','Sister (oldest — sibling #1 of 8)',
     '','P012','P029','','FALSE',
     'Goes by Aneux; artist and musician; resides Mandeville, LA','System',now],

    ['P023','Mary Esther','Redmann','','1957','',
     'Gen5','Mary Redmann','Sister (sibling #2 of 8)',
     '','P012','P029','','TRUE',
     'Musician, educator; founder Children\'s Theater of New Orleans; Admin','System',now],

    ['P024','Eugene P.','Redmann','Gene','1958','',
     'Gen5','Eugene Redmann','Brother (sibling #3 of 8)',
     '','P012','P029','','FALSE',
     'Owner, Law Office of Eugene Redmann, Metairie; married Michelle Scafidi Redmann','System',now],

    ['P025','Teresita Maria','Redmann','Tere','1959','',
     'Gen5','Teresita Redmann','Sister (sibling #4 of 8)',
     '','P012','P029','','FALSE',
     'Goes by Tere; former social worker; resides New Orleans','System',now],

    ['P026','Cecilia','Redmann Whitehurst','Ceci','1960','',
     'Gen5','Ceci Redmann Whitehurst','Sister (sibling #5 of 8)',
     '','P012','P029','','FALSE',
     'Special education and art teacher; remarried Andrew Ewell Whitehurst (2008)','System',now],

    ['P027','Alice Elizabeth','Redmann','Bito','1961','',
     'Gen5','Alice Redmann','Sister (sibling #6 of 8)',
     '','P012','P029','','FALSE',
     'Goes by Bito; artist','System',now],

    ['P028','Maria Goretti','Redmann Treffinger','','1962','',
     'Gen5','Maria Redmann','Sister (sibling #7 of 8)',
     '','P012','P029','','FALSE',
     'Attorney, Dept of Child & Family Services; co-founder International School of Louisiana and L\'Ecole Bilangue; married Jeffrey Treffinger','System',now],

    ['P020','John W.','Redmann, Sr.','','1963','',
     'Gen5','John W. Redmann, Sr.','Self — Primary Administrator (youngest sibling, #8 of 8)',
     '','P012','P029','','TRUE',
     'Trial attorney; owner Law Office of John W. Redmann LLC, Gretna, LA; born 1963','System',now],

    // ── Spouses of John\'s Generation (Gen 5) ────────────────────────────
    ['P021','Amanda Marie','Redmann','Amanda','','',
     'Gen5','John W. Redmann, Sr.','Wife of John Sr.',
     'P020','','','','TRUE',
     'née Blackley; M.Ed.; grammar school teacher and reading specialist; Admin','System',now],

    ['P033','Howard Austin','Chandler','','1953','2011',
     'Gen5','Ana Maria Redmann Chandler','Husband of Ana Maria Chandler',
     'P022','','','','FALSE',
     'Electrical engineer/acoustical scientist, US Navy Stennis Space Center; died 2011','System',now],

    ['P034','Michelle','Scafidi Redmann','','','',
     'Gen5','Eugene Redmann','Wife of Eugene Redmann',
     'P024','','','','FALSE',
     'Manager at Law Office of Eugene Redmann, Metairie; mother of Christian Korver','System',now],

    ['P035','Jeffrey','Treffinger','','','',
     'Gen5','Maria Redmann','Husband of Maria Redmann',
     'P028','','','','FALSE',
     'Design/build consultant; married Maria Goretti Redmann','System',now],

    ['P036','Andrew Ewell','Whitehurst','','','',
     'Gen5','Ceci Redmann Whitehurst','Husband of Ceci Whitehurst',
     'P026','','','','FALSE',
     'Water Program Director, Healthy Gulf; married Ceci in 2008','System',now],

    // ── Children of the 8 Siblings (Gen 6) ───────────────────────────────

    // -- Ana Maria\'s children (branch: Ana Maria Redmann Chandler) --
    ['P040','Zachary William','Chandler','','1988','',
     'Gen6','Ana Maria Redmann Chandler','Son of Ana Maria',
     '','P033','P022','','FALSE','','System',now],

    // -- Mary\'s children (branch: Mary Redmann) --
    ['P041','Danielle Marie','Palmatier','','1980','',
     'Gen6','Mary Redmann','Daughter of Mary',
     '','','P023','','FALSE',
     'Research attorney, Louisiana Fifth Circuit Court of Appeal; married Kevin Michael Mitternight','System',now],

    ['P042','Michael McGrath','Duran Jr.','Mikey','1995','',
     'Gen6','Mary Redmann','Son of Mary',
     '','','P023','','FALSE',
     'Goes by Mikey; singer/songwriter; Top 120 American Idol 2015, Top 100 American Idol 2018','System',now],

    // -- Eugene\'s stepchild (branch: Eugene Redmann) --
    ['P043','Christian','Korver','','1983','',
     'Gen6','Eugene Redmann','Stepson of Eugene Redmann',
     '','','P034','','TRUE',
     'Stepson of Eugene; biological father Clayton Korver; married Aimee Folse Korver (b.1981); tech-savvy admin; resides Metairie, LA','System',now],

    // -- Teresita\'s children (branch: Teresita Redmann) --
    ['P044','Benjamin James','Bible','Ben','1989','',
     'Gen6','Teresita Redmann','Son of Teresita',
     '','','P025','','TRUE',
     'Goes by Ben; Admin','System',now],

    ['P045','Samantha Joan','Bible','Sammy','1992','',
     'Gen6','Teresita Redmann','Daughter of Teresita',
     '','','P025','','FALSE',
     'Goes by Sammy','System',now],

    ['P046','William Patrick','Bible','Will','1994','',
     'Gen6','Teresita Redmann','Son of Teresita',
     '','','P025','','FALSE',
     'Goes by Will','System',now],

    // -- Ceci\'s children from first marriage to William Warren Smith --
    ['P047','Joshua William','Smith','','1986','',
     'Gen6','Ceci Redmann Whitehurst','Son of Ceci (Smith)',
     '','','P026','','FALSE',
     'Director of Operations at MyFreeDoctor.com; married Asha Gross Smith (b.1987)','System',now],

    ['P048','Esther Margaret','Smith','','1988','',
     'Gen6','Ceci Redmann Whitehurst','Daughter of Ceci (Smith)',
     '','','P026','','FALSE',
     'Theatre teacher; married Jed Newell (musician) 2013, divorced 2021','System',now],

    ['P049','Veronica','Redmann Smith','','1990','',
     'Gen6','Ceci Redmann Whitehurst','Daughter of Ceci (Smith)',
     '','','P026','','FALSE',
     'Oncology nurse','System',now],

    // -- Ceci\'s stepchildren via Andrew Whitehurst --
    ['P050','Claire D.','Whitehurst','','1991','',
     'Gen6','Ceci Redmann Whitehurst','Stepdaughter of Ceci (Whitehurst)',
     '','P036','','','FALSE',
     'Artist/teacher; stepchild of Ceci via Andrew Whitehurst','System',now],

    ['P051','Andrew L.','Whitehurst','','1992','',
     'Gen6','Ceci Redmann Whitehurst','Stepson of Ceci (Whitehurst)',
     '','P036','','','FALSE',
     'Musician; stepchild of Ceci via Andrew Whitehurst','System',now],

    // -- Alice\'s children (branch: Alice Redmann) --
    ['P052','Amanda','Redmann Toups','','2002','',
     'Gen6','Alice Redmann','Daughter of Alice',
     '','','P027','','FALSE',
     'Father Ryan Toups; enrolled St. Mary\'s College, Moraga, CA (2021)','System',now],

    // -- Maria\'s children (branch: Maria Redmann) --
    ['P053','Ana Maria','Treffinger','','','',
     'Gen6','Maria Redmann','Daughter of Maria',
     '','P035','P028','','FALSE','','System',now],

    ['P054','Grace Margaret','Treffinger','','','',
     'Gen6','Maria Redmann','Daughter of Maria',
     '','P035','P028','','FALSE','','System',now],

    ['P055','Cecilia Augusta','Treffinger','','','',
     'Gen6','Maria Redmann','Daughter of Maria',
     '','P035','P028','','FALSE','','System',now],

    // ── John\'s Children (Gen 6) ─────────────────────────────────────────
    ['P030','John William','Redmann, Jr.','William','2009','',
     'Gen6','John W. Redmann, Sr.','Son of John Sr.',
     '','P020','P021','','FALSE',
     'Goes by William or Wm','System',now],

    ['P031','Adelaide Maria','Redmann','Adele','2012','',
     'Gen6','John W. Redmann, Sr.','Daughter of John Sr.',
     '','P020','P021','','FALSE',
     'Goes by Adele','System',now],

    ['P032','Augustine Fredric','Redmann','Augie','2016','',
     'Gen6','John W. Redmann, Sr.','Son of John Sr.',
     '','P020','P021','','FALSE',
     'Goes by Augie','System',now],

    // ── Grandchildren (Gen 7) ────────────────────────────────────────────

    // -- Danielle Palmatier\'s children (Mary\'s grandchildren) --
    ['P060','Wesley Joseph','Mitternight','','2009','',
     'Gen7','Mary Redmann','Grandson of Mary (via Danielle)',
     '','','P041','','FALSE','Father Kevin Michael Mitternight','System',now],

    ['P061','Wyatt Reid','Mitternight','','2011','',
     'Gen7','Mary Redmann','Grandson of Mary (via Danielle)',
     '','','P041','','FALSE','Father Kevin Michael Mitternight','System',now],

    ['P062','Julia Maria','Mitternight','','2017','',
     'Gen7','Mary Redmann','Granddaughter of Mary (via Danielle)',
     '','','P041','','FALSE','Father Kevin Michael Mitternight','System',now],

    ['P063','William Michael','Mitternight','','2019','',
     'Gen7','Mary Redmann','Grandson of Mary (via Danielle)',
     '','','P041','','FALSE','Father Kevin Michael Mitternight','System',now],

    // -- Esther Smith\'s children (Ceci\'s grandchildren) --
    ['P064','Cabe Warren','Smith','','2013','',
     'Gen7','Ceci Redmann Whitehurst','Grandson of Ceci (via Esther)',
     '','','P048','','FALSE','Father Jed Newell (musician)','System',now],

    ['P065','Jesse William','Smith','','2015','',
     'Gen7','Ceci Redmann Whitehurst','Grandson of Ceci (via Esther)',
     '','','P048','','FALSE','Father Jed Newell (musician)','System',now],

    // -- Veronica Smith\'s children (Ceci\'s grandchildren) --
    ['P066','Ana Lynn','Hamilton','','2008','',
     'Gen7','Ceci Redmann Whitehurst','Granddaughter of Ceci (via Veronica)',
     '','','P049','','FALSE','Father Aaron J. Hamilton','System',now],

    ['P067','Alexander Clark','Watters','','','',
     'Gen7','Ceci Redmann Whitehurst','Grandson of Ceci (via Veronica)',
     '','','P049','','FALSE','Father Jacob Watters','System',now],

    // -- Christian Korver\'s children (Eugene\'s step-grandchildren) --
    ['P068','Chloe Camille','Korver','','2012','',
     'Gen7','Eugene Redmann','Step-Granddaughter of Eugene (via Christian)',
     '','P043','','','FALSE','Mother Aimee Folse Korver (b.1981)','System',now],

    ['P069','Christian Paul','Korver','','2015','',
     'Gen7','Eugene Redmann','Step-Grandson of Eugene (via Christian)',
     '','P043','','','FALSE','Mother Aimee Folse Korver (b.1981)','System',now]

  ];

  rows.forEach(function(r) { sheet.appendRow(r); });
}
