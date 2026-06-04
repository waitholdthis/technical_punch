import { describe, expect, it } from 'vitest';
import {
  demoLeads,
  draftLeadReply,
  generateFollowUpPlan,
  organizeRevenueBoard,
  qualifyLead,
  rankLeads,
  summarizePipeline
} from '../src/core.js';

const leads = [
  {
    id: 'lead-001',
    source: 'instagram_dm',
    name: 'Sofia Maren',
    message: 'Hi! Can we book a private dinner for 42 people next Friday? Budget around $6k. We loved your chef table reel.',
    requestedDate: '2026-07-17',
    partySize: 42,
    budget: 6000,
    intent: 'private_event',
    sentiment: 'warm',
    responseAgeHours: 1,
    email: 'sofia@example.com'
  },
  {
    id: 'lead-002',
    source: 'site_form',
    name: 'Devon Price',
    message: 'Do you have a table for 2 tonight at 7?',
    requestedDate: '2026-07-10',
    partySize: 2,
    budget: 160,
    intent: 'reservation',
    sentiment: 'neutral',
    responseAgeHours: 0.5,
    email: 'devon@example.com'
  },
  {
    id: 'lead-003',
    source: 'email',
    name: 'Morgan Events',
    message: 'Comparing venues for a corporate reception in September. Need room rental, beverage minimum, and AV options.',
    requestedDate: '2026-09-03',
    partySize: 80,
    budget: 12000,
    intent: 'private_event',
    sentiment: 'shopping',
    responseAgeHours: 30,
    email: 'events@example.com'
  }
];

describe('Technical Punch hospitality conversion engine', () => {
  it('qualifies a lead with conversion score, value tier, urgency, and next action', () => {
    const qualified = qualifyLead(leads[0]);

    expect(qualified.conversionScore).toBeGreaterThanOrEqual(85);
    expect(qualified.valueTier).toBe('private dining whale');
    expect(qualified.urgency).toBe('hot');
    expect(qualified.nextAction).toContain('Send premium private-event reply');
    expect(qualified.detectedNeeds).toEqual(expect.arrayContaining(['private dining', 'large party', 'date-specific hold']));
  });

  it('ranks high-value warm private event inquiries ahead of smaller reservations', () => {
    const ranked = rankLeads(leads);

    expect(ranked[0]).toMatchObject({ id: 'lead-001', name: 'Sofia Maren' });
    expect(ranked[0].conversionScore).toBeGreaterThan(ranked[1].conversionScore);
    expect(ranked.map((lead) => lead.id)).toContain('lead-002');
  });

  it('drafts source-aware replies with qualification questions and owner approval framing', () => {
    const reply = draftLeadReply(leads[0], {
      businessName: 'Ember & Rye',
      voice: 'polished, warm, concise',
      bookingLink: 'https://ember.example.com/private-events'
    });

    expect(reply.subject).toContain('private dinner');
    expect(reply.body).toContain('Sofia');
    expect(reply.body).toContain('42');
    expect(reply.body).toContain('Ember & Rye');
    expect(reply.body).toContain('confirm the preferred start time');
    expect(reply.approvalRequired).toBe(true);
    expect(reply.channel).toBe('instagram_dm');
  });

  it('generates automatic follow-up schedule without spamming urgent leads', () => {
    const plan = generateFollowUpPlan(leads[2]);

    expect(plan).toHaveLength(3);
    expect(plan[0].afterHours).toBeLessThan(plan[1].afterHours);
    expect(plan[0].message).toContain('private reception');
    expect(plan.every((step) => step.ownerCanPause === true)).toBe(true);
  });

  it('organizes reservations and private events into owner-ready revenue board columns', () => {
    const board = organizeRevenueBoard(leads);

    expect(board.hot.length).toBe(1);
    expect(board.eventPipeline.length).toBe(2);
    expect(board.reservationsToday.length).toBe(1);
    expect(board.ownerAttention[0].id).toBe('lead-001');
  });

  it('summarizes pipeline revenue, source mix, and most likely conversion', () => {
    const summary = summarizePipeline(demoLeads);

    expect(summary.totalPotentialRevenue).toBeGreaterThan(20000);
    expect(summary.topLead).toHaveProperty('conversionScore');
    expect(summary.sourceMix.instagram_dm).toBeGreaterThan(0);
    expect(summary.ownerBrief).toContain('highest-converting inquiry');
  });
});
