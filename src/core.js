const INTENT_LABELS = {
  private_event: 'private event',
  reservation: 'reservation',
  catering: 'catering',
  room_block: 'room block',
  vip_experience: 'VIP experience'
};

const SOURCE_LABELS = {
  instagram_dm: 'Instagram DM',
  site_form: 'site form',
  email: 'inquiry email'
};

export const demoLeads = [
  {
    id: 'aurora-001',
    source: 'instagram_dm',
    name: 'Camille Stone',
    message: 'We want to buy out the patio for a rehearsal dinner. 55 guests, elevated but not stiff. Saw your seafood tower post.',
    requestedDate: '2026-08-14',
    partySize: 55,
    budget: 9500,
    intent: 'private_event',
    sentiment: 'warm',
    responseAgeHours: 0.8,
    email: 'camille@example.com'
  },
  {
    id: 'aurora-002',
    source: 'site_form',
    name: 'James Holloway',
    message: 'Need a table for 4 for an anniversary this Saturday. Prefer wine pairing if possible.',
    requestedDate: '2026-07-18',
    partySize: 4,
    budget: 420,
    intent: 'reservation',
    sentiment: 'warm',
    responseAgeHours: 2,
    email: 'james@example.com'
  },
  {
    id: 'aurora-003',
    source: 'email',
    name: 'Northline Hospitality',
    message: 'Exploring a holiday party venue for 95 people with cocktails, passed apps, and a semi-private room.',
    requestedDate: '2026-12-12',
    partySize: 95,
    budget: 18000,
    intent: 'private_event',
    sentiment: 'shopping',
    responseAgeHours: 18,
    email: 'ops@example.com'
  },
  {
    id: 'aurora-004',
    source: 'instagram_dm',
    name: 'Priya Nair',
    message: 'Can you host a brand dinner for 24 creators next month? Need a premium menu and photo moments.',
    requestedDate: '2026-08-03',
    partySize: 24,
    budget: 7200,
    intent: 'vip_experience',
    sentiment: 'hot',
    responseAgeHours: 4,
    email: 'priya@example.com'
  },
  {
    id: 'aurora-005',
    source: 'email',
    name: 'Taylor Brooks',
    message: 'Do you have catering for a board lunch? 18 people. Need menu options and delivery window.',
    requestedDate: '2026-07-28',
    partySize: 18,
    budget: 1300,
    intent: 'catering',
    sentiment: 'neutral',
    responseAgeHours: 9,
    email: 'taylor@example.com'
  }
];

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const currency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);

export function detectNeeds(lead = {}) {
  const text = `${lead.intent || ''} ${lead.message || ''}`.toLowerCase();
  const needs = new Set();

  if (/private|buy out|buyout|venue|rehearsal|corporate|reception|holiday|event/.test(text)) needs.add('private dining');
  if ((lead.partySize || 0) >= 10 || /large|group|guests|people|party/.test(text)) needs.add('large party');
  if (/next|tonight|saturday|friday|date|specific|requested/.test(text) || lead.requestedDate) needs.add('date-specific hold');
  if (/av|audio|visual|projector|mic|presentation/.test(text)) needs.add('AV / production');
  if (/wine|pairing|cocktail|beverage|bar/.test(text)) needs.add('beverage package');
  if (/photo|creator|brand|vip|premium/.test(text)) needs.add('premium experience');
  if (/delivery|catering|menu options/.test(text)) needs.add('catering logistics');

  return [...needs];
}

function valueTierFor(lead) {
  const budget = Number(lead.budget || 0);
  const partySize = Number(lead.partySize || 0);
  if (budget >= 5000 || partySize >= 35) return 'private dining whale';
  if (budget >= 1500 || partySize >= 12) return 'premium group';
  if (budget >= 300 || partySize >= 4) return 'high-intent table';
  return 'standard booking';
}

function scoreLead(lead) {
  const budget = Number(lead.budget || 0);
  const partySize = Number(lead.partySize || 0);
  const age = Number(lead.responseAgeHours || 0);
  const intent = lead.intent || 'reservation';
  const sentiment = lead.sentiment || 'neutral';

  const revenueScore = clamp(budget / 160, 0, 38);
  const partyScore = clamp(partySize * 0.55, 0, 22);
  const intentScore = {
    private_event: 20,
    vip_experience: 19,
    catering: 13,
    room_block: 15,
    reservation: 8
  }[intent] || 8;
  const sentimentScore = { hot: 14, warm: 12, neutral: 6, shopping: 4, cold: 1 }[sentiment] || 5;
  const sourceScore = { instagram_dm: 9, site_form: 8, email: 6 }[lead.source] || 5;
  const speedRisk = age <= 2 ? 7 : age <= 12 ? 3 : age <= 24 ? -2 : -6;
  const qualificationBoost = lead.requestedDate && lead.email ? 6 : 0;

  return clamp(revenueScore + partyScore + intentScore + sentimentScore + sourceScore + speedRisk + qualificationBoost);
}

export function qualifyLead(lead) {
  const conversionScore = scoreLead(lead);
  const detectedNeeds = detectNeeds(lead);
  const valueTier = valueTierFor(lead);
  const urgency = conversionScore >= 82 && lead.sentiment !== 'shopping' && Number(lead.responseAgeHours || 0) <= 24
    ? 'hot'
    : conversionScore >= 62
      ? 'warm'
      : conversionScore >= 42
        ? 'nurture'
        : 'low-fit';
  const intentLabel = INTENT_LABELS[lead.intent] || 'booking';

  let nextAction = 'Send warm qualification reply and ask for missing booking details.';
  if (valueTier === 'private dining whale') {
    nextAction = `Send premium private-event reply, place a soft hold, and route ${lead.name} to owner review.`;
  } else if (lead.intent === 'reservation') {
    nextAction = `Offer two booking windows and convert ${lead.name} into a confirmed reservation.`;
  } else if (urgency === 'nurture') {
    nextAction = `Clarify ${intentLabel} requirements and schedule a tasteful follow-up.`;
  }

  return {
    ...lead,
    channelLabel: SOURCE_LABELS[lead.source] || 'lead source',
    intentLabel,
    detectedNeeds,
    conversionScore,
    valueTier,
    urgency,
    estimatedRevenue: Number(lead.budget || 0),
    nextAction
  };
}

export function rankLeads(leads = []) {
  return leads.map(qualifyLead).sort((a, b) => {
    if (b.conversionScore !== a.conversionScore) return b.conversionScore - a.conversionScore;
    return b.estimatedRevenue - a.estimatedRevenue;
  });
}

export function draftLeadReply(lead, business = {}) {
  const qualified = qualifyLead(lead);
  const businessName = business.businessName || 'your restaurant';
  const bookingLink = business.bookingLink || 'your booking link';
  const party = lead.partySize ? `${lead.partySize}` : 'your group';
  const dateLine = lead.requestedDate ? ` for ${lead.requestedDate}` : '';
  const isEvent = ['private_event', 'vip_experience', 'catering', 'room_block'].includes(lead.intent);
  const subject = isEvent
    ? `${businessName}: next step for your private dinner / event inquiry`
    : `${businessName}: your reservation request`;

  const detailQuestion = isEvent
    ? 'Could you confirm the preferred start time, ideal flow, and whether you want a hosted bar, beverage minimum, or curated menu?'
    : 'Could you confirm your preferred time window and any celebration notes we should prepare for?';

  const close = isEvent
    ? `If helpful, you can also send details here: ${bookingLink}. I can prepare two package paths for owner approval.`
    : `You can reserve here if the timing looks right: ${bookingLink}.`;

  return {
    channel: lead.source,
    subject,
    approvalRequired: qualified.estimatedRevenue >= 2500 || qualified.valueTier === 'private dining whale',
    body: `Hi ${lead.name}, thanks for reaching out to ${businessName}. We can help with ${qualified.intentLabel}${dateLine} for ${party}. ${detailQuestion}\n\nBased on what you shared (${currency(qualified.estimatedRevenue)} estimated budget), I’d prioritize this as a ${qualified.valueTier} inquiry. ${close}\n\n— ${businessName} reservations team`
  };
}

export function generateFollowUpPlan(lead) {
  const qualified = qualifyLead(lead);
  const eventPhrase = qualified.intent === 'reservation' ? 'reservation' : qualified.intent === 'catering' ? 'catering request' : 'private reception';
  const cadence = qualified.urgency === 'hot' ? [4, 22, 72] : [12, 36, 96];

  return cadence.map((afterHours, index) => ({
    step: index + 1,
    afterHours,
    ownerCanPause: true,
    channel: lead.source,
    message: index === 0
      ? `Friendly follow-up on your ${eventPhrase}; we can hold momentum if the date and guest count are still accurate.`
      : index === 1
        ? `Second touch: offer two clear paths, one premium and one flexible, so the guest can choose without friction.`
        : `Final tasteful close-loop note: release any soft hold and invite them back when timing is right.`
  }));
}

export function organizeRevenueBoard(leads = []) {
  const ranked = rankLeads(leads);
  return {
    hot: ranked.filter((lead) => lead.urgency === 'hot'),
    eventPipeline: ranked.filter((lead) => ['private_event', 'vip_experience', 'catering', 'room_block'].includes(lead.intent)),
    reservationsToday: ranked.filter((lead) => lead.intent === 'reservation'),
    nurture: ranked.filter((lead) => ['nurture', 'low-fit'].includes(lead.urgency)),
    ownerAttention: ranked.filter((lead) => lead.conversionScore >= 75 || lead.estimatedRevenue >= 2500).slice(0, 5)
  };
}

export function summarizePipeline(leads = []) {
  const ranked = rankLeads(leads);
  const totalPotentialRevenue = ranked.reduce((sum, lead) => sum + lead.estimatedRevenue, 0);
  const sourceMix = ranked.reduce((mix, lead) => {
    mix[lead.source] = (mix[lead.source] || 0) + 1;
    return mix;
  }, {});
  const topLead = ranked[0] || null;
  const hotCount = ranked.filter((lead) => lead.urgency === 'hot').length;
  const eventRevenue = ranked
    .filter((lead) => ['private_event', 'vip_experience', 'catering', 'room_block'].includes(lead.intent))
    .reduce((sum, lead) => sum + lead.estimatedRevenue, 0);

  return {
    count: ranked.length,
    totalPotentialRevenue,
    eventRevenue,
    hotCount,
    sourceMix,
    topLead,
    ownerBrief: topLead
      ? `${topLead.name} is the highest-converting inquiry at ${topLead.conversionScore}/100 with ${currency(topLead.estimatedRevenue)} potential revenue.`
      : 'No active inquiries yet.'
  };
}

export function calculateLeadEconomics(leads = [], assumptions = {}) {
  const monthlyLeadMultiplier = Number(assumptions.monthlyLeadMultiplier || 4);
  const currentCaptureRate = Number(assumptions.currentCaptureRate ?? 0.34);
  const improvedCaptureRate = Number(assumptions.improvedCaptureRate ?? 0.52);
  const monthlyPlatformCost = Number(assumptions.monthlyPlatformCost || 900);
  const ranked = rankLeads(leads);
  const activePipelineValue = ranked.reduce((sum, lead) => sum + lead.estimatedRevenue, 0);
  const monthlyPipelineValue = Math.round(activePipelineValue * monthlyLeadMultiplier);
  const currentExpectedRevenue = Math.round(monthlyPipelineValue * currentCaptureRate);
  const improvedExpectedRevenue = Math.round(monthlyPipelineValue * improvedCaptureRate);
  const monthlyRevenueLift = Math.max(0, improvedExpectedRevenue - currentExpectedRevenue);
  const netMonthlyLift = monthlyRevenueLift - monthlyPlatformCost;
  const paybackDays = netMonthlyLift > 0 ? Math.ceil((monthlyPlatformCost / netMonthlyLift) * 30) : Infinity;
  const roiMultiple = monthlyPlatformCost > 0 ? Number((monthlyRevenueLift / monthlyPlatformCost).toFixed(1)) : Infinity;
  const annualizedLift = monthlyRevenueLift * 12;

  return {
    activePipelineValue,
    monthlyPipelineValue,
    currentExpectedRevenue,
    improvedExpectedRevenue,
    monthlyRevenueLift,
    netMonthlyLift,
    paybackDays,
    roiMultiple,
    annualizedLift,
    assumptions: {
      monthlyLeadMultiplier,
      currentCaptureRate,
      improvedCaptureRate,
      monthlyPlatformCost
    }
  };
}

function calculateSlaRisk(leads = []) {
  const ranked = rankLeads(leads);
  const highRiskLeads = ranked.filter((lead) => {
    const age = Number(lead.responseAgeHours || 0);
    const eventLead = ['private_event', 'vip_experience', 'catering', 'room_block'].includes(lead.intent);
    return age >= 12 || (eventLead && age >= 4 && lead.estimatedRevenue >= 2500);
  });
  const atRiskRevenue = highRiskLeads.reduce((sum, lead) => sum + lead.estimatedRevenue, 0);
  const staleHighValueCount = highRiskLeads.filter((lead) => lead.estimatedRevenue >= 2500).length;

  return {
    highRiskLeads,
    atRiskRevenue,
    staleHighValueCount,
    verdict: highRiskLeads.length
      ? `${highRiskLeads.length} inquiry lanes need a faster owner response before revenue leaks.`
      : 'No active SLA leaks detected.'
  };
}

export function simulateRevenueImpact(leads = [], assumptions = {}) {
  const economics = calculateLeadEconomics(leads, assumptions);
  const slaRisk = calculateSlaRisk(leads);
  const recoveryTarget = Math.round(economics.monthlyRevenueLift * 0.55);
  const recommendations = [
    `Recover roughly ${currency(recoveryTarget)} / month by responding faster to high-value event inquiries.`,
    `Protect ${currency(slaRisk.atRiskRevenue)} currently sitting in stale or owner-review lanes.`,
    'Route every whale lead into approve/edit/send instead of letting staff improvise from the inbox.',
    'Use follow-up automation to close the loop without sounding desperate or spammy.'
  ];

  return {
    economics,
    slaRisk,
    recommendations
  };
}

export function buildOwnerDecisionPacket(lead, business = {}) {
  const qualified = qualifyLead(lead);
  const reply = draftLeadReply(qualified, business);
  const eventLead = ['private_event', 'vip_experience', 'catering', 'room_block'].includes(qualified.intent);
  const riskFlags = [];

  if (qualified.estimatedRevenue >= 2500) riskFlags.push('high-value event');
  if (eventLead && qualified.requestedDate) riskFlags.push('soft-hold recommended');
  if (Number(qualified.responseAgeHours || 0) >= 12) riskFlags.push('response SLA risk');
  if (qualified.sentiment === 'shopping') riskFlags.push('comparison shopper');

  const decision = reply.approvalRequired
    ? 'approve_with_owner_review'
    : qualified.urgency === 'hot'
      ? 'approve_to_send'
      : 'edit_then_schedule';

  return {
    leadId: qualified.id,
    headline: `${qualified.name} · ${qualified.intentLabel} · ${currency(qualified.estimatedRevenue)} at stake`,
    decision,
    revenueAtStake: qualified.estimatedRevenue,
    score: qualified.conversionScore,
    riskFlags,
    ownerChecklist: [
      'Confirm date availability',
      'Approve reply tone',
      'Assign owner or event manager',
      eventLead ? 'Choose premium and flexible package paths' : 'Confirm booking window'
    ],
    reply,
    followUps: generateFollowUpPlan(qualified),
    nextAction: qualified.nextAction
  };
}

export function createInbox(leads = demoLeads, business = {}) {
  const ranked = rankLeads(leads);
  return {
    business: {
      businessName: business.businessName || 'Aurora Table Group',
      voice: business.voice || 'polished, warm, concise',
      bookingLink: business.bookingLink || 'https://example.com/book'
    },
    ranked,
    board: organizeRevenueBoard(ranked),
    summary: summarizePipeline(ranked),
    replies: ranked.reduce((acc, lead) => {
      acc[lead.id] = draftLeadReply(lead, business);
      return acc;
    }, {})
  };
}
