import './styles.css';
import {
  buildOwnerDecisionPacket,
  createInbox,
  demoLeads,
  draftLeadReply,
  generateFollowUpPlan,
  qualifyLead,
  simulateRevenueImpact,
  summarizePipeline
} from './core.js';

const business = {
  businessName: 'Technical Punch',
  voice: 'polished, fast, conversion-focused',
  bookingLink: 'https://technicalpunch.example/book'
};

const savedLeads = (() => {
  try {
    const stored = localStorage.getItem('technicalPunchLeads');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
})();

let leads = Array.isArray(savedLeads) && savedLeads.length ? savedLeads : [...demoLeads];
let selectedLeadId = leads[0].id;

const sourceOptions = [
  ['instagram_dm', 'Instagram DM'],
  ['site_form', 'Site form'],
  ['email', 'Inquiry email']
];

const intentOptions = [
  ['private_event', 'Private event'],
  ['reservation', 'Reservation'],
  ['catering', 'Catering'],
  ['vip_experience', 'VIP experience'],
  ['room_block', 'Room block']
];

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

function optionTags(options) {
  return options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
}

function render() {
  const inbox = createInbox(leads, business);
  const summary = summarizePipeline(leads);
  const selected = inbox.ranked.find((lead) => lead.id === selectedLeadId) || inbox.ranked[0];
  selectedLeadId = selected?.id;
  const reply = selected ? draftLeadReply(selected, business) : null;
  const followUps = selected ? generateFollowUpPlan(selected) : [];
  const impact = simulateRevenueImpact(leads);
  const ownerPackets = inbox.board.ownerAttention.map((lead) => buildOwnerDecisionPacket(lead, business));
  const selectedPacket = selected ? buildOwnerDecisionPacket(selected, business) : null;

  document.querySelector('#app').innerHTML = `
    <main>
      <section class="hero shell">
        <nav class="nav">
          <div class="brand-mark">TP</div>
          <span>Technical Punch</span>
          <a href="#lead-form">Capture a lead</a>
        </nav>

        <div class="hero-grid">
          <div>
            <p class="eyebrow">AI booking & lead conversion OS</p>
            <h1>Turn every inquiry into a revenue-controlled service lane.</h1>
            <p class="hero-copy">
              Technical Punch captures leads from site forms, Instagram DMs, and inquiry emails, qualifies intent,
              drafts owner-approved replies, schedules follow-ups, and shows hospitality operators which requests are most likely to convert.
            </p>
            <div class="hero-actions">
              <a class="button primary" href="#operator-board">Open the command floor</a>
              <a class="button ghost" href="#reply-draft">View AI reply draft</a>
            </div>
          </div>
          <aside class="signal-card">
            <span class="scanline"></span>
            <p>Highest-converting inquiry</p>
            <h2>${summary.topLead?.name || 'No lead yet'}</h2>
            <strong>${summary.topLead?.conversionScore || 0}/100</strong>
            <span>${summary.ownerBrief}</span>
          </aside>
        </div>
      </section>

      <section class="metrics shell" aria-label="Pipeline metrics">
        <article>
          <span>Total potential revenue</span>
          <strong>${money(summary.totalPotentialRevenue)}</strong>
        </article>
        <article>
          <span>Private-event pipeline</span>
          <strong>${money(summary.eventRevenue)}</strong>
        </article>
        <article>
          <span>Hot inquiries</span>
          <strong>${summary.hotCount}</strong>
        </article>
        <article>
          <span>Sources online</span>
          <strong>${Object.keys(summary.sourceMix).length}</strong>
        </article>
      </section>

      <section class="shell roi-panel" id="roi-case">
        <div class="section-head">
          <div>
            <p class="eyebrow">Client ROI case</p>
            <h2>Show the operator why this pays for itself.</h2>
          </div>
          <a class="button ghost" href="#approval-queue">Review owner packets</a>
        </div>
        <div class="roi-grid">
          <article>
            <span>Projected monthly lift</span>
            <strong>${money(impact.economics.monthlyRevenueLift)}</strong>
            <p>Based on moving capture from ${(impact.economics.assumptions.currentCaptureRate * 100).toFixed(0)}% to ${(impact.economics.assumptions.improvedCaptureRate * 100).toFixed(0)}% across similar monthly inquiry volume.</p>
          </article>
          <article>
            <span>Net lift after platform</span>
            <strong>${money(impact.economics.netMonthlyLift)}</strong>
            <p>Assumes ${money(impact.economics.assumptions.monthlyPlatformCost)} / month software + ops cost.</p>
          </article>
          <article>
            <span>Payback window</span>
            <strong>${impact.economics.paybackDays} days</strong>
            <p>${impact.economics.roiMultiple}× gross monthly ROI multiple on the demo pipeline.</p>
          </article>
          <article>
            <span>At-risk stale revenue</span>
            <strong>${money(impact.slaRisk.atRiskRevenue)}</strong>
            <p>${impact.slaRisk.verdict}</p>
          </article>
        </div>
        <ul class="recommendations">
          ${impact.recommendations.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      </section>

      <section class="shell board-layout" id="operator-board">
        <div class="panel wide">
          <div class="section-head">
            <p class="eyebrow">Conversion radar</p>
            <h2>Owner-ready revenue board</h2>
          </div>
          <div class="lead-list">
            ${inbox.ranked.map(renderLeadCard).join('')}
          </div>
        </div>

        <aside class="panel detail-panel">
          <p class="eyebrow">Live qualification</p>
          ${selected ? renderSelectedLead(selected, reply, followUps, selectedPacket) : '<p>No leads captured yet.</p>'}
        </aside>
      </section>

      <section class="shell approval-panel" id="approval-queue">
        <div class="section-head">
          <div>
            <p class="eyebrow">Approve / edit / send</p>
            <h2>Owner decision packets</h2>
          </div>
          <button class="button ghost export-packets" type="button">Export packets JSON</button>
        </div>
        <div class="packet-grid">
          ${ownerPackets.map(renderDecisionPacket).join('') || '<p>No owner approvals required right now.</p>'}
        </div>
      </section>

      <section class="shell ops-grid">
        <article class="panel">
          <p class="eyebrow">Intake sources</p>
          <h2>Capture lanes</h2>
          <div class="lanes">
            <span>Website forms</span>
            <span>Instagram DMs</span>
            <span>Inquiry email</span>
            <span>Manual concierge entry</span>
          </div>
        </article>
        <article class="panel">
          <p class="eyebrow">Automation policy</p>
          <h2>Fast, but owner-safe</h2>
          <p>
            Premium events and high-value leads require owner approval before sending. The system drafts and schedules,
            but the operator controls final tone, exceptions, and holds.
          </p>
        </article>
      </section>

      <section class="shell form-panel" id="lead-form">
        <div>
          <p class="eyebrow">Lead simulator</p>
          <h2>Add a new inquiry</h2>
          <p>Drop in an Instagram DM, email, or form submission and watch the OS qualify the lead instantly.</p>
        </div>
        <form id="captureForm">
          <label>Name <input name="name" required value="Avery Knox" /></label>
          <label>Source <select name="source">${optionTags(sourceOptions)}</select></label>
          <label>Intent <select name="intent">${optionTags(intentOptions)}</select></label>
          <label>Party size <input name="partySize" type="number" min="1" value="36" /></label>
          <label>Budget <input name="budget" type="number" min="0" value="8400" /></label>
          <label>Requested date <input name="requestedDate" type="date" value="2026-09-19" /></label>
          <label class="full">Message <textarea name="message" rows="4">Hi, we are planning a private birthday dinner for 36 guests and want a premium menu with cocktails. Do you have availability?</textarea></label>
          <button class="button primary" type="submit">Qualify lead</button>
        </form>
      </section>
    </main>
  `;

  bindEvents();
}

function renderLeadCard(lead) {
  const active = lead.id === selectedLeadId ? 'active' : '';
  return `
    <button class="lead-card ${active}" data-lead-id="${lead.id}">
      <span class="lead-source">${lead.channelLabel}</span>
      <strong>${lead.name}</strong>
      <span>${lead.intentLabel} · ${lead.partySize || '?'} guests · ${money(lead.estimatedRevenue)}</span>
      <div class="score-row"><span style="width:${lead.conversionScore}%"></span></div>
      <em>${lead.conversionScore}/100 · ${lead.urgency}</em>
    </button>
  `;
}

function renderSelectedLead(lead, reply, followUps, packet) {
  return `
    <h2>${lead.name}</h2>
    <div class="badge-row">
      <span>${lead.valueTier}</span>
      <span>${lead.urgency}</span>
      <span>${lead.conversionScore}/100</span>
    </div>
    <p class="message">“${lead.message}”</p>
    <h3>Detected needs</h3>
    <div class="chips">${lead.detectedNeeds.map((need) => `<span>${need}</span>`).join('')}</div>
    <h3>Next action</h3>
    <p>${lead.nextAction}</p>
    ${packet ? `<div class="decision-strip"><strong>${packet.decision.replaceAll('_', ' ')}</strong><span>${money(packet.revenueAtStake)} at stake</span></div>` : ''}
    <div id="reply-draft" class="reply-box">
      <p class="eyebrow">AI reply draft · ${reply.channel}</p>
      <strong>${reply.subject}</strong>
      <pre>${reply.body}</pre>
      <button class="button ghost copy-reply" type="button">Copy draft</button>
    </div>
    <h3>Follow-up automation</h3>
    <ol class="followups">
      ${followUps.map((step) => `<li><strong>+${step.afterHours}h</strong> ${step.message}</li>`).join('')}
    </ol>
  `;
}

function renderDecisionPacket(packet) {
  return `
    <article class="decision-card">
      <p class="eyebrow">${packet.decision.replaceAll('_', ' ')}</p>
      <h3>${packet.headline}</h3>
      <div class="badge-row">
        <span>${packet.score}/100</span>
        <span>${money(packet.revenueAtStake)}</span>
      </div>
      <p>${packet.nextAction}</p>
      <div class="chips">${packet.riskFlags.map((flag) => `<span>${flag}</span>`).join('')}</div>
      <ol class="followups mini">
        ${packet.ownerChecklist.map((item) => `<li>${item}</li>`).join('')}
      </ol>
    </article>
  `;
}

function bindEvents() {
  document.querySelectorAll('.lead-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectedLeadId = card.dataset.leadId;
      render();
    });
  });

  document.querySelector('#captureForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const lead = qualifyLead({
      id: `lead-${Date.now()}`,
      source: data.get('source'),
      name: data.get('name'),
      intent: data.get('intent'),
      partySize: Number(data.get('partySize')),
      budget: Number(data.get('budget')),
      requestedDate: data.get('requestedDate'),
      message: data.get('message'),
      sentiment: 'warm',
      responseAgeHours: 0.2,
      email: 'newlead@example.com'
    });
    leads = [lead, ...leads];
    localStorage.setItem('technicalPunchLeads', JSON.stringify(leads));
    selectedLeadId = lead.id;
    render();
    document.querySelector('#operator-board')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.querySelector('.copy-reply')?.addEventListener('click', async () => {
    const text = document.querySelector('.reply-box pre')?.innerText || '';
    if (navigator.clipboard) await navigator.clipboard.writeText(text);
    document.querySelector('.copy-reply').textContent = 'Copied';
  });

  document.querySelector('.export-packets')?.addEventListener('click', async () => {
    const packets = createInbox(leads, business).board.ownerAttention.map((lead) => buildOwnerDecisionPacket(lead, business));
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), packets }, null, 2);
    if (navigator.clipboard) await navigator.clipboard.writeText(payload);
    document.querySelector('.export-packets').textContent = 'Copied packet JSON';
  });
}

render();
