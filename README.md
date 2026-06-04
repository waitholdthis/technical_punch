# Technical Punch

Technical Punch is an AI booking and lead conversion OS for independent restaurants, hospitality groups, and premium local businesses.

It is built to capture inquiries from website forms, Instagram DMs, and inquiry emails, then turn them into owner-ready action:

- qualify every inquiry by revenue potential, intent, urgency, and fit
- draft polished replies in the business voice
- schedule tasteful follow-ups without spamming guests
- organize reservations, catering, private events, and VIP experiences into a revenue board
- show owners which inquiries are most likely to convert

This repository contains a front-end MVP with a deterministic conversion engine and cinematic operator dashboard. No API keys, credentials, or live customer data are required.

## Product thesis

Independent operators lose revenue in the gray zone between “someone asked a question” and “someone owns the next step.”

Restaurants and premium local businesses usually have leads scattered across DMs, forms, inboxes, texts, and staff memory. Technical Punch acts as the command floor between those channels: it scores conversion probability, drafts the next move, and routes high-value moments to the owner before they decay.

## What the MVP does

### Lead capture simulation

The dashboard models three immediate channels:

- Instagram DM
- website form
- inquiry email

Operators can add a new inquiry through the simulator and see the OS qualify it instantly.

### Qualification engine

`src/core.js` exports pure functions for:

- `qualifyLead(lead)`
- `rankLeads(leads)`
- `draftLeadReply(lead, business)`
- `generateFollowUpPlan(lead)`
- `organizeRevenueBoard(leads)`
- `summarizePipeline(leads)`
- `createInbox(leads, business)`

The score considers:

- estimated revenue
- party size
- intent type
- sentiment
- response age
- source channel
- whether date/contact details exist

### Owner-ready reply drafts

The app drafts source-aware replies with qualification questions and approval flags. High-value private dining leads are explicitly routed for owner approval.

### Follow-up cadence

The system creates a three-step follow-up plan with owner pause controls. The MVP is designed around tasteful hospitality automation, not spam.

### Revenue board

Leads are organized into:

- hot
- event pipeline
- reservations today
- nurture
- owner attention

## Privacy and safety model

This MVP uses demo data only.

Production versions should:

- require consent before messaging guests automatically
- preserve owner approval for premium/high-value replies
- avoid storing payment data in this app
- protect guest contact details
- log when an automated reply or follow-up is generated
- integrate with Instagram, Gmail, reservation tools, and CRMs through scoped OAuth rather than raw passwords

## Local development

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Tests

```bash
npm test
```

The test suite covers:

- lead qualification
- ranking
- reply drafting
- follow-up planning
- revenue board organization
- pipeline summaries

## Production build

```bash
npm run build
```

## Future roadmap

- OAuth intake from Gmail, Instagram, and form webhooks
- owner approval queue with send/edit/reject actions
- calendar availability and private-event hold workflow
- CRM/reservation integrations such as SevenRooms, Resy, OpenTable, Toast, Square, HubSpot, and Airtable
- AI voice/tone profile per brand
- lost-lead analysis and conversion coaching
- revenue attribution by source, staff member, and campaign
- multi-location hospitality group command center

## Positioning

Technical Punch is not a generic chatbot. It is a revenue-control layer for premium local operators who need every serious inquiry handled quickly, elegantly, and with owner-level judgment.
