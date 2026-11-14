import React, { useEffect, useState } from 'react';
import { useFinance } from '../store';
import { USER_NAME } from '../config';
import { annualIncome, annualDues, yearLoanTotals, savingsTotals, peso } from '../finance';
import { Sprite, Meter, YearStepper } from '../components/ui';
import spApple from '../assets/pixel/apple.png';
import spDango from '../assets/pixel/dango.png';
import spStrawberry from '../assets/pixel/strawberry.png';
import spStamp from '../assets/pixel/stamp.png';
import spClover from '../assets/pixel/clover.png';
import spBunny from '../assets/pixel/bunny.png';

export default function Dashboard() {
  const d = useFinance();
  const [year, setYear] = useState(new Date().getFullYear());

  const income = annualIncome(d.incomes, year);
  const dues = annualDues(d, year);
  const loans = yearLoanTotals(d.loans, year);
  const sv = savingsTotals(d.savings);
  const left = income - dues;
  const pctOfIncome = (v) => (income > 0 ? Math.round((v / income) * 100) : 0);

  // the greeting follows the clock: re-checked every minute and when the app comes back to the screen
  const [h, setH] = useState(new Date().getHours());
  useEffect(() => {
    const tick = () => setH(new Date().getHours());
    const t = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  const rows = [
    { key: 'income', icon: spApple, label: 'Total annual income', value: peso(income), tone: 'green', pct: income > 0 ? 100 : 0, cap: 'earned' },
    { key: 'dues', icon: spDango, label: 'Annual obligations & expenses', value: peso(dues), tone: 'pink', pct: pctOfIncome(dues), cap: 'of income' },
    { key: 'save', icon: spStrawberry, label: 'Savings goals accumulation', value: `${peso(sv.saved)} / ${peso(sv.target)}`, tone: 'green', pct: sv.pct, cap: 'of goal' },
    { key: 'loan', icon: spStamp, label: 'Remaining outstanding loans', value: peso(loans.unpaid), tone: 'pink', pct: loans.cost > 0 ? Math.round((loans.paid / loans.cost) * 100) : 0, cap: 'repaid' },
    { key: 'left', icon: spClover, label: 'Coins left after obligations', value: peso(left), tone: left >= 0 ? 'green' : 'pink', pct: left > 0 ? pctOfIncome(left) : 0, cap: 'of income' },
  ];

  return (
    <div className="screen">
      <section className="panel">
        <div className="hello">
          <Sprite src={spBunny} />
          <div className="hello-text">
            <div className="hello-lead kutitap-title">{greet}, {USER_NAME}! ✨</div>
            <div className="hello-sub">Your money at a glance</div>
          </div>
        </div>
        <YearStepper value={year} onChange={setYear} />
      </section>

      <div className="grid2">
        <div className="tile card">
          <div className="tile-label">Income {year}<Sprite src={spApple} className="spr-row" /></div>
          <div className="tile-val">{peso(income)}</div>
          <div className="tile-sub">Actual income recorded</div>
        </div>
        <div className="tile card">
          <div className="tile-label">Dues &amp; expenses<Sprite src={spDango} className="spr-row" /></div>
          <div className="tile-val">{peso(dues)}</div>
          <div className="tile-sub">Bills, loans, expenses</div>
        </div>
        <div className="tile mint">
          <div className="tile-label green">Total saved<Sprite src={spStrawberry} className="spr-row" /></div>
          <div className="tile-val green">{peso(sv.saved)}</div>
          <div className="tile-sub green">{sv.pct}% of {peso(sv.target)}</div>
        </div>
        <div className="tile butter">
          <div className="tile-label">Loans {year}<Sprite src={spStamp} className="spr-row" /></div>
          <div className="paid-unpaid">
            <div><b className="green">PAID</b><span className="green">{peso(loans.paid)}</span></div>
            <div><b className="pink">UNPAID</b><span className="pink">{peso(loans.unpaid)}</span></div>
          </div>
          <div className="tile-sub">Total cost {peso(loans.cost)}</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-title kutitap-title">Year at a glance · {year}</div>
        <div className="glance">
          {rows.map((r) => (
            <div className="glance-item" key={r.key}>
              <div className="glance-top">
                <Sprite src={r.icon} className="spr-row" />
                <div className="glance-label">{r.label}</div>
                <div className={`glance-val ${r.tone === 'green' ? 'green' : 'pink'}`}>{r.value}</div>
              </div>
              <Meter pct={r.pct} tone={r.tone} />
              <div className="glance-cap">{Math.max(0, Math.min(100, r.pct))}% {r.cap}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
