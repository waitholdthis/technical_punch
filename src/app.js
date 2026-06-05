import './styles.css';
import {
  buildBuyerProofPacket,
  buildIntegrationStatus,
  buildOwnerDecisionPacket,
  calculateMissedRevenueAudit,
  createInbox,
  demoLeads,
  draftLeadReply,
  generateFollowUpPlan,
  getVerticalPreset,
  qualifyLead,
  recommendTechnicalPunchPackage,
  simulateRevenueImpact,
  summarizePipeline,
  verticalPresets
} from './core.js';

let selectedPresetId = localStorage.getItem('technicalPunchPreset') || 'restaurant';
let auditInputs = readStoredAudit();

function currentPreset() {
  return getVerticalPreset(selectedPresetId);
}

function currentBusiness() {
  const preset = currentPreset();
  return {
    businessName: 'Technical Punch',
    voice: 'polished, fast, conversion-focused',
    bookingLink: 'https://technicalpunch.example/book',
    demoVertical: preset.label,
    clientName: preset.businessName
  };
}

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

function readStoredAudit() {
  try {
    const stored = localStorage.getItem('technicalPunchAudit');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function optionTags(options) {
  return options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
}

function render() {
  const preset = currentPreset();
  const business = currentBusiness();
  const inbox = createInbox(leads, business);
  const summary = summarizePipeline(leads);
  const selected = inbox.ranked.find((lead) => lead.id === selectedLeadId) || inbox.ranked[0];
  selectedLeadId = selected?.id;
  const reply = selected ? draftLeadReply(selected, business) : null;
  const followUps = selected ? generateFollowUpPlan(selected) : [];
  const impact = simulateRevenueImpact(leads, {
    currentCaptureRate: preset.captureRate,
    improvedCaptureRate: preset.improvedCaptureRate,
    monthlyLeadMultiplier: preset.monthlyLeadMultiplier,
    monthlyPlatformCost: preset.monthlyPlatformCost
  });
  const audit = calculateMissedRevenueAudit(auditInputs || {}, preset);
  const integrations = buildIntegrationStatus(preset);
  const proofPacket = buildBuyerProofPacket({ preset, audit, integrations });
  const packageRecommendation = recommendTechnicalPunchPackage(audit, preset);
  const ownerPackets = inbox.board.ownerAttention.map((lead) => buildOwnerDecisionPacket(lead, business));
  const selectedPacket = selected ? buildOwnerDecisionPacket(selected, business) : null;

  document.querySelector('#app').innerHTML = `
    <main>
      ${renderSalesLanding(summary, impact, audit, preset)}
      ${renderVerticalPresets(preset)}
      ${renderIntegrationPanel(integrations, preset)}
      ${renderAuditFlow(audit, preset, packageRecommendation)}
      ${renderBuyerProofRoom(proofPacket)}

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
            <p>Based on moving capture from ${percent(impact.economics.assumptions.currentCaptureRate)} to ${percent(impact.economics.assumptions.improvedCaptureRate)} across ${preset.label.toLowerCase()} inquiry volume.</p>
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
            ${preset.integrationLanes.map((lane) => `<span>${lane}</span>`).join('')}
          </div>
        </article>
        <article class="panel">
          <p class="eyebrow">Automation policy</p>
          <h2>Fast, but owner-safe</h2>
          <p>${preset.ownerPolicy}</p>
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

function renderSalesLanding(summary, impact, audit, preset) {
  return `
    <section class="hero shell" id="sales-page">
      <nav class="nav">
        <div class="brand-mark">TP</div>
        <span>Technical Punch</span>
        <a href="#verticals">Vertical presets</a>
        <a href="#missed-revenue-audit">Run audit</a>
        <a href="#buyer-proof-room">Proof room</a>
        <a href="#operator-board">Command floor</a>
      </nav>

      <div class="hero-grid sales-hero-grid">
        <div>
          <p class="eyebrow">AI booking & lead conversion OS</p>
          <h1>Turn inquiry chaos into owner-controlled revenue.</h1>
          <p class="hero-copy">
            Technical Punch captures leads from site forms, Instagram DMs, inquiry emails, and concierge channels; scores intent;
            drafts owner-safe replies; schedules tasteful follow-ups; and proves the monthly revenue leak before the client buys.
          </p>
          <div class="hero-actions">
            <a class="button primary" href="#missed-revenue-audit">Estimate missed revenue</a>
            <a class="button ghost" href="#buyer-proof-room">Build proof packet</a>
            <a class="button ghost" href="#integrations">View integrations</a>
            <a class="button ghost" href="#operator-board">Open demo app</a>
          </div>
          <div class="proof-strip">
            <span>${preset.label}</span>
            <span>${money(impact.economics.monthlyRevenueLift)} projected lift</span>
            <span>${money(audit.annualizedOpportunity)} annualized audit upside</span>
          </div>
        </div>
        <aside class="signal-card sales-card">
          <span class="scanline"></span>
          <p>Current demo target</p>
          <h2>${preset.businessName}</h2>
          <strong>${summary.topLead?.conversionScore || 0}/100</strong>
          <span>${summary.ownerBrief}</span>
        </aside>
      </div>
    </section>
  `;
}

function renderVerticalPresets(activePreset) {
  return `
    <section class="shell vertical-panel" id="verticals">
      <div class="section-head">
        <div>
          <p class="eyebrow">Vertical presets</p>
          <h2>One product, five buyer-ready sales demos.</h2>
        </div>
        <span class="section-kicker">Active: ${activePreset.label}</span>
      </div>
      <div class="vertical-grid">
        ${verticalPresets.map((preset) => `
          <button class="vertical-card ${preset.id === activePreset.id ? 'active' : ''}" type="button" data-preset-id="${preset.id}">
            <span>${preset.operator}</span>
            <strong>${preset.label}</strong>
            <em>${preset.tagline}</em>
            <b>${preset.heroMetric}</b>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function renderIntegrationPanel(integrations, preset) {
  return `
    <section class="shell integration-panel" id="integrations">
      <div class="section-head">
        <div>
          <p class="eyebrow">Integration command center</p>
          <h2>Fake-believable now. Production-connectable later.</h2>
        </div>
        <span class="section-kicker">${preset.leadMix}</span>
      </div>
      <div class="integration-grid">
        ${integrations.map((lane) => `
          <article class="integration-card">
            <div>
              <span class="status-dot"></span>
              <p>${lane.status}</p>
            </div>
            <h3>${lane.name}</h3>
            <strong>${lane.latency}</strong>
            <p>${lane.description}</p>
            <em>${lane.ownerSafe ? 'Owner-safe automation lane' : 'Human review recommended'}</em>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderAuditFlow(audit, preset, packageRecommendation) {
  const assumptions = audit.assumptions;
  return `
    <section class="shell audit-panel" id="missed-revenue-audit">
      <div class="audit-copy">
        <p class="eyebrow">Missed revenue audit</p>
        <h2>Turn inbox chaos into a dollar estimate.</h2>
        <p>${audit.verdict}</p>
        <div class="audit-stats">
          <article><span>Monthly pipeline</span><strong>${money(audit.monthlyPipelineValue)}</strong></article>
          <article><span>Monthly lift</span><strong>${money(audit.monthlyLift)}</strong></article>
          <article><span>Stale revenue at risk</span><strong>${money(audit.staleRevenueAtRisk)}</strong></article>
          <article><span>Payback</span><strong>${audit.paybackDays} days</strong></article>
        </div>
        <div class="package-strip">
          <span>Recommended package</span>
          <strong>${packageRecommendation.tier}</strong>
          <em>${packageRecommendation.priceAnchor}</em>
        </div>
      </div>
      <form id="auditForm" class="audit-form">
        <label>Weekly inquiry volume <input name="weeklyInquiryVolume" type="number" min="1" value="${assumptions.weeklyInquiryVolume}" /></label>
        <label>Average lead value <input name="averageLeadValue" type="number" min="1" value="${assumptions.averageLeadValue}" /></label>
        <label>Current capture rate <input name="currentCaptureRate" type="number" min="0" max="1" step="0.01" value="${assumptions.currentCaptureRate}" /></label>
        <label>Improved capture rate <input name="improvedCaptureRate" type="number" min="0" max="1" step="0.01" value="${assumptions.improvedCaptureRate}" /></label>
        <label>Stale lead percent <input name="staleLeadPercent" type="number" min="0" max="1" step="0.01" value="${assumptions.staleLeadPercent}" /></label>
        <label>Platform cost <input name="monthlyPlatformCost" type="number" min="0" value="${assumptions.monthlyPlatformCost}" /></label>
        <button class="button primary" type="submit">Recalculate ${preset.label} audit</button>
      </form>
    </section>
  `;
}

function renderBuyerProofRoom(packet) {
  return `
    <section class="shell proof-room" id="buyer-proof-room">
      <div class="proof-room-header">
        <div>
          <p class="eyebrow">Buyer Proof Room</p>
          <h2>Generate the owner-facing sales packet.</h2>
          <p>${packet.executiveSummary}</p>
        </div>
        <div class="proof-actions">
          <button class="button primary copy-proof" type="button">Copy sales summary</button>
          <button class="button ghost export-proof" type="button">Copy proof JSON</button>
          <button class="button ghost print-proof" type="button">Print packet</button>
        </div>
      </div>

      <div class="proof-grid">
        <article class="proof-hero-card">
          <span>${packet.vertical}</span>
          <h3>${packet.headline}</h3>
          <p>${packet.packageRecommendation.promise}</p>
        </article>
        <article>
          <span>Recommended package</span>
          <strong>${packet.packageRecommendation.tier}</strong>
          <em>${packet.packageRecommendation.priceAnchor}</em>
          <p>${packet.packageRecommendation.fit}</p>
        </article>
        <article>
          <span>Annualized opportunity</span>
          <strong>${money(packet.auditSnapshot.annualizedOpportunity)}</strong>
          <p>${packet.auditSnapshot.paybackDays} day payback window on the current assumptions.</p>
        </article>
      </div>

      <div class="proof-columns">
        <article>
          <h3>Commercial case</h3>
          <ul>
            <li>${packet.auditSnapshot.monthlyInquiryVolume} monthly inquiries modeled.</li>
            <li>${money(packet.auditSnapshot.monthlyPipelineValue)} in monthly pipeline value.</li>
            <li>${money(packet.auditSnapshot.monthlyLift)} projected monthly lift.</li>
            <li>${money(packet.auditSnapshot.staleRevenueAtRisk)} stale revenue at risk.</li>
          </ul>
        </article>
        <article>
          <h3>Package includes</h3>
          <ul>${packet.packageRecommendation.includes.map((item) => `<li>${item}</li>`).join('')}</ul>
        </article>
        <article>
          <h3>Next steps</h3>
          <ol>${packet.nextSteps.map((item) => `<li>${item}</li>`).join('')}</ol>
        </article>
      </div>

      <div class="readiness-board">
        <div class="section-head compact">
          <div>
            <p class="eyebrow">Integration readiness</p>
            <h2>Believable now. Connectable later.</h2>
          </div>
          <span class="section-kicker">${packet.ownerSafetyPolicy}</span>
        </div>
        <div class="readiness-grid">
          ${packet.integrationReadiness.map((lane) => `
            <article>
              <span>${lane.status}</span>
              <strong>${lane.name}</strong>
              <em>${lane.note}</em>
            </article>
          `).join('')}
        </div>
      </div>

      <pre class="proof-copy">${packet.copyBlock}</pre>
    </section>
  `;
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
  document.querySelectorAll('.vertical-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectedPresetId = card.dataset.presetId;
      localStorage.setItem('technicalPunchPreset', selectedPresetId);
      auditInputs = null;
      localStorage.removeItem('technicalPunchAudit');
      render();
      document.querySelector('#verticals')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelector('#auditForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    auditInputs = {
      weeklyInquiryVolume: Number(data.get('weeklyInquiryVolume')),
      averageLeadValue: Number(data.get('averageLeadValue')),
      currentCaptureRate: Number(data.get('currentCaptureRate')),
      improvedCaptureRate: Number(data.get('improvedCaptureRate')),
      staleLeadPercent: Number(data.get('staleLeadPercent')),
      monthlyPlatformCost: Number(data.get('monthlyPlatformCost'))
    };
    localStorage.setItem('technicalPunchAudit', JSON.stringify(auditInputs));
    render();
    document.querySelector('#missed-revenue-audit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

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
    const packets = createInbox(leads, currentBusiness()).board.ownerAttention.map((lead) => buildOwnerDecisionPacket(lead, currentBusiness()));
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), preset: currentPreset(), packets }, null, 2);
    if (navigator.clipboard) await navigator.clipboard.writeText(payload);
    document.querySelector('.export-packets').textContent = 'Copied packet JSON';
  });

  document.querySelector('.copy-proof')?.addEventListener('click', async () => {
    const text = document.querySelector('.proof-copy')?.innerText || '';
    if (navigator.clipboard) await navigator.clipboard.writeText(text);
    document.querySelector('.copy-proof').textContent = 'Copied sales summary';
  });

  document.querySelector('.export-proof')?.addEventListener('click', async () => {
    const preset = currentPreset();
    const audit = calculateMissedRevenueAudit(auditInputs || {}, preset);
    const integrations = buildIntegrationStatus(preset);
    const packet = buildBuyerProofPacket({ preset, audit, integrations });
    const payload = JSON.stringify(packet, null, 2);
    if (navigator.clipboard) await navigator.clipboard.writeText(payload);
    document.querySelector('.export-proof').textContent = 'Copied proof JSON';
  });

  document.querySelector('.print-proof')?.addEventListener('click', () => window.print());
}

render();
