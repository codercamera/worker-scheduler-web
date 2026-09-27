const workers = [
  { name: 'Anan S.', role: 'Front desk', initials: 'AS' },
  { name: 'Mali P.', role: 'Operations', initials: 'MP' },
  { name: 'Niran K.', role: 'Support', initials: 'NK' },
  { name: 'Pim C.', role: 'Sales', initials: 'PC' },
  { name: 'Somchai T.', role: 'Warehouse', initials: 'ST' },
];

const days = ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 1', 'Fri 2', 'Sat 3', 'Sun 4'];
const shifts = [
  { worker: 0, day: 0, start: '09:00', end: '17:00', label: 'Morning' },
  { worker: 0, day: 2, start: '10:00', end: '18:00', label: 'Day shift' },
  { worker: 1, day: 1, start: '08:00', end: '16:00', label: 'Operations' },
  { worker: 1, day: 4, start: '12:00', end: '20:00', label: 'Late shift' },
  { worker: 2, day: 0, start: '12:00', end: '20:00', label: 'Support' },
  { worker: 2, day: 3, start: '09:00', end: '17:00', label: 'Support' },
  { worker: 3, day: 2, start: '11:00', end: '19:00', label: 'Sales' },
  { worker: 3, day: 5, start: '09:00', end: '15:00', label: 'Weekend' },
  { worker: 4, day: 1, start: '07:00', end: '15:00', label: 'Warehouse' },
  { worker: 4, day: 4, start: '07:00', end: '15:00', label: 'Warehouse' },
];

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">W</div><div><strong>Workly</strong><span>Scheduler</span></div></div>
        <nav>
          <a className="active" href="#">Schedule</a>
          <a href="#workers">Workers</a>
          <a href="#availability">Availability</a>
          <a href="#leave">Leave requests</a>
          <a href="#reports">Reports</a>
          <a href="#settings">Settings</a>
        </nav>
        <div className="profile"><div className="avatar">AD</div><div><strong>Admin</strong><span>Administrator</span></div></div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">WORKFORCE MANAGEMENT</p><h1>Schedule</h1><p className="subtle">Plan shifts, balance hours, and avoid conflicts.</p></div>
          <button className="primary">+ Add shift</button>
        </header>

        <section className="stats">
          <article><span>Scheduled hours</span><strong>278h</strong><small>+18h vs last week</small></article>
          <article><span>Workers scheduled</span><strong>18</strong><small>3 available</small></article>
          <article><span>Open shifts</span><strong>4</strong><small>Needs attention</small></article>
          <article><span>Conflicts</span><strong>0</strong><small>All clear</small></article>
        </section>

        <section className="calendar-card">
          <div className="calendar-toolbar">
            <div className="toolbar-left"><button>‹</button><button>Today</button><button>›</button><strong>Sep 28 – Oct 4, 2026</strong></div>
            <div className="view-switch"><button className="selected">Week</button><button>Month</button></div>
          </div>

          <div className="schedule-grid">
            <div className="corner">Worker</div>
            {days.map((day) => <div className="day-head" key={day}>{day}</div>)}
            {workers.map((worker, workerIndex) => (
              <div className="row-fragment" key={worker.name}>
                <div className="worker-cell"><div className="avatar small">{worker.initials}</div><div><strong>{worker.name}</strong><span>{worker.role}</span></div></div>
                {days.map((_, dayIndex) => {
                  const shift = shifts.find((item) => item.worker === workerIndex && item.day === dayIndex);
                  return <div className="shift-cell" key={dayIndex}>{shift && <div className="shift"><strong>{shift.label}</strong><span>{shift.start} – {shift.end}</span></div>}</div>;
                })}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
