const form = document.getElementById("debtForm");
const debtList = document.getElementById("debtList");

const nameInput = document.getElementById("name");
const totalInput = document.getElementById("total");
const interestInput = document.getElementById("interest");
const downInput = document.getElementById("downpayment");

// Theme handling
const themeToggle = document.getElementById('themeToggle');
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('theme', theme);
  if (themeToggle) themeToggle.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

// initialize theme from storage or system preference
(function(){
  const saved = localStorage.getItem('theme');
  if (saved) return applyTheme(saved);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
})();

if (themeToggle) themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

// sticky header buttons (may or may not exist)
const stickyAddBtn = document.getElementById('stickyAddBtn');
const stickyThemeToggle = document.getElementById('stickyThemeToggle');
const stickyExport = document.getElementById('stickyExport');
const stickyImport = document.getElementById('stickyImport');
const importFile = document.getElementById('importFile');
if (stickyAddBtn) {
  stickyAddBtn.addEventListener('click', () => {
    const rect = form.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + rect.top - 12, behavior: 'smooth' });
    nameInput.focus();
  });
}
if (stickyThemeToggle) {
  stickyThemeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
}

// export/import handlers for simple multi-device transfer
if (stickyExport) {
  stickyExport.addEventListener('click', () => {
    const data = { debts, theme: localStorage.getItem('theme') };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'debts-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

if (stickyImport && importFile) {
  stickyImport.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj || !Array.isArray(obj.debts)) {
          alert('Invalid import file');
          return;
        }
        // ask user whether to merge or replace
        const choice = confirm('OK = replace existing data. Cancel = merge (append)');
        if (choice) {
          debts = obj.debts.map(d => ({ ...d, payments: d.payments || [] }));
        } else {
          const appended = obj.debts.map(d => ({ ...d, payments: d.payments || [] }));
          debts = debts.concat(appended);
        }
        if (obj.theme) localStorage.setItem('theme', obj.theme);
        saveDebts();
        renderDebts();
        alert('Import complete');
      } catch (err) {
        alert('Failed to parse file: ' + err.message);
      }
    };
    reader.readAsText(f);
    importFile.value = '';
  });
}

// sticky header animation: hide on scroll down, show on scroll up (small screens only)
let lastScroll = window.scrollY;
const sticky = document.querySelector('.sticky-header');
const scrollThreshold = 10;
window.addEventListener('scroll', () => {
  if (!sticky) return;
  if (window.innerWidth > 800) return; // only animate on small screens
  const current = window.scrollY;
  const delta = current - lastScroll;
  if (Math.abs(delta) < scrollThreshold) return;
  if (delta > 0 && current > 50) {
    // scrolling down
    sticky.classList.add('sticky-hidden');
  } else {
    sticky.classList.remove('sticky-hidden');
  }
  lastScroll = current;
});

let debts = (JSON.parse(localStorage.getItem("debts")) || []).map(d => ({ ...d, payments: d.payments || [] }));

function saveDebts() {
  localStorage.setItem("debts", JSON.stringify(debts));
}

function renderDebts() {
  debtList.innerHTML = "";

  debts.forEach((debt, index) => {
    const paidPercent = Math.min(
      100,
      ((debt.total - debt.balance) / debt.total) * 100
    );

    const div = document.createElement("div");
    div.className = "debt";

    const clampedPercent = Math.max(0, Math.min(100, paidPercent));

    div.innerHTML = `
      <div class="debt-header">
        <span>${debt.name}</span>
        <div>
          <button onclick="removeDebt(${index})">✕</button>
        </div>
      </div>
      <p>Total: $${debt.total.toLocaleString()}</p>
      <p class="balance">Balance: $${debt.balance.toLocaleString()}</p>
      <p>Interest: ${debt.interest || 0}%</p>

      <div class="circular-wrap">
        <svg viewBox="0 0 36 36" class="circular">
          <path class="circle-bg" d="M18 2.0845a 15.9155 15.9155 0 1 1 0 31.831a 15.9155 15.9155 0 1 1 0 -31.831"/>
          <path class="circle-paid" stroke-dasharray="${clampedPercent} ${100 - clampedPercent}" d="M18 2.0845a 15.9155 15.9155 0 1 1 0 31.831a 15.9155 15.9155 0 1 1 0 -31.831"/>
        </svg>
        <div class="circular-center"><strong>$${debt.balance.toLocaleString()}</strong></div>
      </div>

      <div class="payment-row">
        <input type="number" step="0.01" min="0" id="payment-${index}" placeholder="Add payment" />
        <button onclick="addPayment(${index})">Pay</button>
        <button class="history-btn" onclick="toggleHistory(${index})">History</button>
        <button class="undo-btn" onclick="undoLastPayment(${index})">Undo Last</button>
      </div>
      <small>${clampedPercent.toFixed(1)}% paid off</small>

      <div class="history" id="history-${index}" style="display:none">
        ${debt.payments && debt.payments.length ? debt.payments.map(p => `<div class="payment-item">${new Date(p.date).toLocaleString()} — $${Number(p.amount).toLocaleString()}</div>`).join('') : '<div class="payment-item">No payments yet</div>'}
      </div>
    `;

    debtList.appendChild(div);
  });

  // after rendering debts, render the payments-over-time chart
  renderPaymentsChart();
}

function formatCurrency(v) {
  return `$${Number(v).toLocaleString()}`;
}

function renderPaymentsChart() {
  const chart = document.getElementById('paymentsChart');
  if (!chart) return;

  // prepare chart area and legend
  chart.innerHTML = '';

  // build month keys and per-debt sums per month
  // months format: YYYY-MM
  const monthsSet = new Set();
  const perMonthPerDebt = {}; // { month: { debtIndex: sum } }

  debts.forEach((d, di) => {
    (d.payments || []).forEach(p => {
      const dt = new Date(p.date);
      if (isNaN(dt)) return;
      const month = dt.toISOString().slice(0,7);
      monthsSet.add(month);
      perMonthPerDebt[month] = perMonthPerDebt[month] || {};
      perMonthPerDebt[month][di] = (perMonthPerDebt[month][di] || 0) + Number(p.amount || 0);
    });
  });

  const months = Array.from(monthsSet).sort();
  if (!months.length) {
    chart.innerHTML = '<div class="no-payments">No payments recorded yet</div>';
    return;
  }

  // compute totals per month and overall max
  const monthTotals = months.map(m => {
    const sum = Object.values(perMonthPerDebt[m] || {}).reduce((a,b) => a+b, 0);
    return { month: m, total: sum };
  });
  const max = Math.max(...monthTotals.map(m => m.total));

  // use a nicer fixed palette and cycle when needed
  const palette = ['#2563EB','#059669','#EA580C','#7C3AED','#F43F5E','#0EA5E9','#84CC16','#F59E0B'];
  const colors = debts.map((d, i) => palette[i % palette.length]);

  // legend
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  legend.innerHTML = debts.map((d,i) => `<div class="legend-item"><span class="legend-swatch" style="background:${colors[i]}"></span><span class="legend-label">${d.name}</span></div>`).join('');
  chart.appendChild(legend);

  // create bars container
  const bars = document.createElement('div');
  bars.className = 'chart-bars';

  // ensure tooltip exists
  let tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'chart-tooltip';
    tooltip.className = 'chart-tooltip';
    document.body.appendChild(tooltip);
  }

  months.forEach(month => {
    const monthTotal = monthTotals.find(m => m.month === month)?.total || 0;
    const barItem = document.createElement('div');
    barItem.className = 'bar-item';

    const stack = document.createElement('div');
    stack.className = 'bar-stack';
    const monthData = perMonthPerDebt[month] || {};

    // create stacked segments for each debt
    debts.forEach((d, di) => {
      const amt = monthData[di] || 0;
      if (amt <= 0) return;
      const height = max > 0 ? (amt / max) * 100 : 0;
      const seg = document.createElement('div');
      seg.className = 'bar-segment';
      seg.style.height = height + '%';
      seg.style.background = colors[di];
      seg.dataset.debtIndex = di;
      seg.dataset.amount = amt;
      seg.dataset.month = month;
      // tooltip handlers
      seg.addEventListener('mouseenter', (e) => {
        tooltip.innerHTML = `<strong>${d.name}</strong><br/>${month}: ${formatCurrency(amt)}`;
        tooltip.style.display = 'block';
      });
      seg.addEventListener('mousemove', (e) => {
        tooltip.style.left = (e.pageX + 12) + 'px';
        tooltip.style.top = (e.pageY + 12) + 'px';
      });
      seg.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
      stack.appendChild(seg);
    });

    const label = document.createElement('div');
    label.className = 'bar-label';
    // friendly month label: "Mon YYYY"
    try {
      const dt = new Date(month + '-01');
      label.textContent = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(dt);
    } catch (e) {
      label.textContent = month;
    }

    const amtLabel = document.createElement('div');
    amtLabel.className = 'bar-amt';
    amtLabel.textContent = formatCurrency(monthTotal);

    barItem.appendChild(stack);
    barItem.appendChild(label);
    barItem.appendChild(amtLabel);
    bars.appendChild(barItem);
  });

  chart.appendChild(bars);
}

function removeDebt(index) {
  debts.splice(index, 1);
  saveDebts();
  renderDebts();
}

function addPayment(index) {
  const input = document.getElementById(`payment-${index}`);
  if (!input) return;
  const value = Number(input.value);
  if (isNaN(value) || value <= 0) {
    alert('Enter a payment amount greater than 0');
    return;
  }

  const debt = debts[index];
  // reduce balance, do not go below 0
  const newBalance = Math.max(0, Number(debt.balance) - value);
  const actualPaid = Number(debt.balance) - newBalance;

  debt.balance = newBalance;
  debt.payments = debt.payments || [];
  debt.payments.push({ amount: actualPaid, date: new Date().toISOString() });

  saveDebts();
  renderDebts();
}

function toggleHistory(index) {
  const el = document.getElementById(`history-${index}`);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function undoLastPayment(index) {
  const debt = debts[index];
  if (!debt || !debt.payments || debt.payments.length === 0) {
    alert('No payments to undo');
    return;
  }
  const last = debt.payments.pop();
  debt.balance = Number(debt.balance) + Number(last.amount);
  saveDebts();
  renderDebts();
}

// Allocation across debts
const allocateBtn = document.getElementById('allocateBtn');
if (allocateBtn) {
  allocateBtn.addEventListener('click', () => allocateIncome());
}

function allocateIncome() {
  const amtEl = document.getElementById('allocateAmount');
  const methodEl = document.getElementById('allocateMethod');
  if (!amtEl || !methodEl) return;
  let amount = Number(amtEl.value);
  if (isNaN(amount) || amount <= 0) {
    alert('Enter an amount to allocate');
    return;
  }

  const method = methodEl.value;
  // build list of debt indices and sort according to method
  const order = debts.map((d, i) => ({ i, interest: d.interest || 0, balance: Number(d.balance || 0) }));
  if (method === 'highestInterest') {
    order.sort((a, b) => b.interest - a.interest);
  } else if (method === 'largestBalance') {
    order.sort((a, b) => b.balance - a.balance);
  }

  for (const item of order) {
    if (amount <= 0) break;
    const debt = debts[item.i];
    const bal = Number(debt.balance || 0);
    if (bal <= 0) continue;
    const pay = Math.min(bal, amount);
    debt.balance = Math.max(0, bal - pay);
    debt.payments = debt.payments || [];
    debt.payments.push({ amount: pay, date: new Date().toISOString(), allocated: true });
    amount = Math.max(0, amount - pay);
  }

  saveDebts();
  renderDebts();
  if (amount > 0) alert(`$${amount.toLocaleString()} leftover after allocation`);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const debt = {
    name: nameInput.value.trim(),
    total: Number(totalInput.value) || 0,
    // compute balance: use down payment if provided, otherwise full total
    balance: (function(){
      const t = Number(totalInput.value) || 0;
      const d = Number(downInput && downInput.value) || 0;
      return d > 0 ? Math.max(0, t - d) : t;
    })(),
    interest: Number(interestInput.value) || 0,
    payments: (function(){
      const arr = [];
      const d = Number(downInput && downInput.value) || 0;
      if (d > 0) arr.push({ amount: d, date: new Date().toISOString(), type: 'downpayment' });
      return arr;
    })()
  };

  if (!debt.name) {
    alert('Please enter a debt name.');
    return;
  }

  if (debt.total <= 0) {
    alert('Please enter a valid total amount.');
    return;
  }

  debts.push(debt);
  saveDebts();
  renderDebts();
  form.reset();
});

renderDebts();
