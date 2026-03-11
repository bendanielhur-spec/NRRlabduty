// NRR LabDuties — Automated Daily Reminder Sender
// Runs via GitHub Actions every Sun–Thu at 08:00 Israel time
// Requires secrets: EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID

const https = require("https");

// ── LAB DATA ─────────────────────────────────────────────────
const PEOPLE = [
  { id:1,  name:"Daniel Ben Hur",    nick:"Daniel",  email:"daniel.benhur@weizmann.ac.il" },
  { id:2,  name:"Gili Mizrachi",     nick:"Gili",    email:"gili.mizrachi@weizmann.ac.il" },
  { id:3,  name:"Neta Regev-Rudzki", nick:"Neta",    email:"neta.regev-rudzki@weizmann.ac.il" },
  { id:4,  name:"Gaya Ben Naim",     nick:"Gaya",    email:"gaya.ben-naim@weizmann.ac.il" },
  { id:5,  name:"Sonia Sofia Oren",  nick:"Sonia",   email:"sonia.oren@weizmann.ac.il" },
  { id:6,  name:"Tomer Elad",        nick:"Tomer",   email:"tomer.elad@weizmann.ac.il" },
  { id:7,  name:"Edo Kiper",         nick:"Edo",     email:"edo.kiper@weizmann.ac.il" },
  { id:8,  name:"Tomas Makowski",    nick:"Tomas",   email:"tomas.makowski@weizmann.ac.il" },
  { id:9,  name:"Gal David Efrat",   nick:"Gal",     email:"gal-david.efrat@weizmann.ac.il" },
  { id:10, name:"Abel Cruz Camacho", nick:"Abel",    email:"abel.cruzcamacho@weizmann.ac.il" },
  { id:11, name:"Daniel Alfandari",  nick:"D.Alfa",  email:"daniel.alfandari@weizmann.ac.il" },
  { id:12, name:"Avi Hizgilov",      nick:"Avi",     email:"avi.hizgilov@weizmann.ac.il" },
  { id:13, name:"Helina Otesh",      nick:"Helina",  email:"helina.otesh@weizmann.ac.il" },
  { id:14, name:"Noam Sogauker",     nick:"Noam",    email:"noam.sogauker@weizmann.ac.il" },
  { id:15, name:"Marina Friedman",   nick:"Marina",  email:"marina.friedman@weizmann.ac.il" },
];

const TASKS = [
  { id:1,  title:"Splitting Blood",               emoji:"🩸", days:{Sun:1,Mon:1,Tue:1,Wed:1,Thu:1}, aId:5,    noMark:false },
  { id:2,  title:"DDW – 2 gallons (Monday)",      emoji:"💧", days:{Mon:1},                          aId:5,    noMark:false },
  { id:3,  title:"Mycoplasma test",               emoji:"🦠", days:{Sun:1},                          aId:null, noMark:false },
  { id:4,  title:"DDW – 2 gallons (Wednesday)",   emoji:"💧", days:{Wed:1},                          aId:null, noMark:false },
  { id:5,  title:"Sinks & benches",               emoji:"🧹", days:{Thu:1},                          aId:null, noMark:false },
  { id:6,  title:"Albumax",                       emoji:"🧫", days:{Mon:1},                          aId:2,    noMark:false },
  { id:7,  title:"TC restocking (Mon)",           emoji:"🔬", days:{Mon:1},                          aId:2,    noMark:false },
  { id:8,  title:"Sodium bicarbonate",            emoji:"⚗️",  days:{Tue:1},                          aId:7,    noMark:false },
  { id:9,  title:"Clear washed items",            emoji:"🧼", days:{Wed:1},                          aId:7,    noMark:false },
  { id:10, title:"Sorbitol",                      emoji:"🧪", days:{Tue:1},                          aId:9,    noMark:false },
  { id:11, title:"Bath, incubators & sterile water", emoji:"🛁", days:{Thu:1},                       aId:9,    noMark:false },
  { id:12, title:"70% EtOH, 10% bleach",          emoji:"🧴", days:{Mon:1},                          aId:9,    noMark:false },
  { id:13, title:"Autoclave (Mon)",               emoji:"⚙️",  days:{Mon:1},                          aId:6,    noMark:false },
  { id:14, title:"Recycling",                     emoji:"♻️",  days:{Sun:1,Mon:1},                   aId:6,    noMark:false },
  { id:15, title:"Chemical hoods",                emoji:"🔬", days:{Thu:1},                          aId:6,    noMark:false },
  { id:16, title:"Autoclave (Wed)",               emoji:"⚙️",  days:{Wed:1},                          aId:4,    noMark:false },
  { id:17, title:"Coffee area",                   emoji:"☕", days:{Thu:1},                          aId:4,    noMark:false },
  { id:18, title:"TC restocking (Wed)",           emoji:"🔬", days:{Wed:1},                          aId:8,    noMark:false },
  { id:19, title:"Centrifuges",                   emoji:"🌀", days:{Thu:1},                          aId:8,    noMark:false },
  { id:20, title:"TC benches, microscope & smears", emoji:"🔬", days:{Thu:1},                        aId:8,    noMark:false },
  { id:21, title:"Machsan + unpacking orders",    emoji:"📦", days:{Sun:1,Mon:1,Tue:1,Wed:1,Thu:1}, aId:10,   noMark:true  },
];

// ── HELPERS ───────────────────────────────────────────────────
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getTodayDayName() {
  // Use Israel time (UTC+2 standard / UTC+3 DST)
  const now = new Date();
  const israelOffset = isDST(now) ? 3 : 2;
  const israelTime = new Date(now.getTime() + israelOffset * 3600 * 1000);
  return DAY_NAMES[israelTime.getUTCDay()];
}

function isDST(date) {
  // Israel DST: last Friday before April 2 → last Sunday before Yom Kippur (Oct)
  // Approximation: DST active roughly late March – late October
  const m = date.getUTCMonth() + 1;
  return m >= 4 && m <= 9;
}

function getDateStr() {
  const now = new Date();
  const israelOffset = isDST(now) ? 3 : 2;
  const d = new Date(now.getTime() + israelOffset * 3600 * 1000);
  return d.toUTCString().slice(0, 16);
}

function getTodayTasks(dayName) {
  return TASKS.filter(t => t.days[dayName] && t.aId && !t.noMark);
}

function groupByPerson(tasks) {
  const byP = {};
  tasks.forEach(t => {
    const p = PEOPLE.find(p => p.id === t.aId);
    if (!p) return;
    if (!byP[p.id]) byP[p.id] = { person: p, tasks: [] };
    byP[p.id].tasks.push(t);
  });
  return Object.values(byP);
}

// ── EMAILJS SEND ──────────────────────────────────────────────
function sendEmail(publicKey, serviceId, templateId, params) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: params,
    });
    const options = {
      hostname: "api.emailjs.com",
      path: "/api/v1.0/email/send",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "origin": "http://localhost",
      },
    };
    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        if (res.statusCode === 200) resolve(data);
        else reject(new Error(`EmailJS ${res.statusCode}: ${data}`));
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  const PUBLIC_KEY  = process.env.EMAILJS_PUBLIC_KEY;
  const SERVICE_ID  = process.env.EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;

  if (!PUBLIC_KEY || !SERVICE_ID || !TEMPLATE_ID) {
    console.error("❌ Missing EmailJS secrets. Set EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID.");
    process.exit(1);
  }

  const dayName = getTodayDayName();
  const dateStr = getDateStr();
  const workDays = new Set(["Sun","Mon","Tue","Wed","Thu"]);

  if (!workDays.has(dayName)) {
    console.log(`⏭ Today is ${dayName} — not a work day. Skipping.`);
    return;
  }

  console.log(`📅 Running reminders for ${dayName} (${dateStr})`);

  const todayTasks = getTodayTasks(dayName);
  if (!todayTasks.length) {
    console.log("✅ No tasks assigned today.");
    return;
  }

  const groups = groupByPerson(todayTasks);
  console.log(`📧 Sending to ${groups.length} people...`);

  let ok = 0, fail = 0;
  for (const { person, tasks } of groups) {
    const taskList = tasks.map(t => `  ${t.emoji} ${t.title}`).join("\n");
    const message =
      `Hi ${person.nick},\n\n` +
      `Your lab duties for today (${dateStr}):\n\n` +
      taskList +
      `\n\nPlease mark your tasks done in LabDuties.\n\nNRR LabDuties`;

    try {
      await sendEmail(PUBLIC_KEY, SERVICE_ID, TEMPLATE_ID, {
        to_email: person.email,
        to_name:  person.nick,
        subject:  `⏰ LabDuties Reminder – ${dateStr}`,
        message,
      });
      console.log(`  ✅ Sent → ${person.name} (${person.email})`);
      ok++;
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`  ❌ Failed → ${person.name}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n🏁 Done: ${ok} sent, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
