// Stripe Fee Calculator & Merchant Processing Estimator
(function() {
  'use strict';

  let state = {
    mode: 'charge', // 'charge' | 'receive'
    amount: 100,
    cardType: 'domestic', // 'domestic' | 'international' | 'terminal' | 'manual'
    currencyConversion: false, // +1.0%
    stripeBilling: false       // +0.5%
  };

  function formatMoney(val) {
    return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getFeeRates() {
    let pct = 2.9;
    let fixed = 0.30;

    if (state.cardType === 'international') {
      pct = 4.4; // 2.9% + 1.5%
      fixed = 0.30;
    } else if (state.cardType === 'terminal') {
      pct = 2.7;
      fixed = 0.05;
    } else if (state.cardType === 'manual') {
      pct = 3.4;
      fixed = 0.30;
    }

    if (state.currencyConversion) pct += 1.0;
    if (state.stripeBilling) pct += 0.5;

    return { pct, fixed };
  }

  function recalculate() {
    const { pct, fixed } = getFeeRates();
    const rateDecimal = pct / 100;

    let grossAmount = 0;
    let netPayout = 0;
    let totalFee = 0;

    if (state.mode === 'charge') {
      grossAmount = state.amount;
      totalFee = (grossAmount * rateDecimal) + fixed;
      netPayout = grossAmount - totalFee;
    } else {
      // Reverse: want net
      netPayout = state.amount;
      grossAmount = (netPayout + fixed) / (1 - rateDecimal);
      totalFee = grossAmount - netPayout;
    }

    const effectiveFeePct = grossAmount > 0 ? (totalFee / grossAmount) * 100 : 0;

    // DOM Hero Updates
    if (state.mode === 'charge') {
      document.getElementById('hero-label').textContent = 'Net Payout in Your Bank';
      document.getElementById('hero-amount').textContent = formatMoney(netPayout);
      document.getElementById('hero-sub').textContent = `From an initial ${formatMoney(grossAmount)} charge`;
    } else {
      document.getElementById('hero-label').textContent = 'Amount You Should Invoice';
      document.getElementById('hero-amount').textContent = formatMoney(grossAmount);
      document.getElementById('hero-sub').textContent = `To keep exactly ${formatMoney(netPayout)} in hand`;
    }

    document.getElementById('res-total-fee').textContent = formatMoney(totalFee);
    document.getElementById('res-effective-rate').textContent = `${effectiveFeePct.toFixed(2)}%`;
    document.getElementById('res-gross-total').textContent = formatMoney(grossAmount);

    // Breakdown table
    document.getElementById('row-percentage-fee').textContent = `${pct.toFixed(2)}% (${formatMoney(grossAmount * rateDecimal)})`;
    document.getElementById('row-fixed-fee').textContent = formatMoney(fixed);
    document.getElementById('row-total-fee').textContent = formatMoney(totalFee);
    document.getElementById('row-net-payout').textContent = formatMoney(netPayout);

    // Competitor Comparison
    // PayPal: 3.49% + $0.49
    const paypalFee = (grossAmount * 0.0349) + 0.49;
    const paypalNet = Math.max(0, grossAmount - paypalFee);
    document.getElementById('comp-paypal-net').textContent = formatMoney(paypalNet);
    document.getElementById('comp-paypal-fee').textContent = `Fee: ${formatMoney(paypalFee)} (3.49% + $0.49)`;

    // Square online: 2.9% + $0.30
    const squareFee = (grossAmount * 0.029) + 0.30;
    const squareNet = Math.max(0, grossAmount - squareFee);
    document.getElementById('comp-square-net').textContent = formatMoney(squareNet);
    document.getElementById('comp-square-fee').textContent = `Fee: ${formatMoney(squareFee)} (2.9% + $0.30)`;

    // Stripe
    document.getElementById('comp-stripe-net').textContent = formatMoney(netPayout);
    document.getElementById('comp-stripe-fee').textContent = `Fee: ${formatMoney(totalFee)} (${pct.toFixed(2)}% + $${fixed.toFixed(2)})`;

    localStorage.setItem('stripe_calc_state', JSON.stringify(state));
  }

  function setMode(newMode) {
    state.mode = newMode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === newMode);
    });

    const label = document.getElementById('input-amount-label');
    if (newMode === 'charge') {
      label.textContent = 'Transaction Amount to Charge ($)';
    } else {
      label.textContent = 'Target Net Amount to Receive ($)';
    }
    recalculate();
  }

  function init() {
    const saved = localStorage.getItem('stripe_calc_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      } catch (e) {}
    }

    const inputAmount = document.getElementById('input-amount');
    const selectCardType = document.getElementById('select-card-type');
    const checkCurrency = document.getElementById('check-currency');
    const checkBilling = document.getElementById('check-billing');

    inputAmount.value = state.amount;
    selectCardType.value = state.cardType;
    checkCurrency.checked = state.currencyConversion;
    checkBilling.checked = state.stripeBilling;

    inputAmount.addEventListener('input', (e) => {
      state.amount = Math.max(0.50, parseFloat(e.target.value) || 0);
      recalculate();
    });

    selectCardType.addEventListener('change', (e) => {
      state.cardType = e.target.value;
      recalculate();
    });

    checkCurrency.addEventListener('change', (e) => {
      state.currencyConversion = e.target.checked;
      recalculate();
    });

    checkBilling.addEventListener('change', (e) => {
      state.stripeBilling = e.target.checked;
      recalculate();
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setMode(btn.dataset.mode);
      });
    });

    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement;
        item.classList.toggle('open');
      });
    });

    setMode(state.mode);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
