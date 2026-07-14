# Product Analytics and Metrics (METRICS.md)

Analytics and instrumentation blueprint designed specifically for a B2B lead-generation and SaaS auditing tool.

---

## 1. The North Star Metric
Our single North Star metric is **Consultation Bookings Initiated per Week (CBI)**.

### Why this is our North Star:
As a B2B lead-generation tool built for Techvruk, the ultimate measure of the product's business value isn't mere website traffic (MAUs) or simple form submission events. Instead, the real business outcome is driving high-intent startup decision-makers (CTOs, CFOs) into direct sales conversations with Techvruk experts. An increase in CBI means the tool has successfully:
1. Surfaced highly compelling, defensible savings that convince operators they need assistance.
2. Built sufficient product trust to encourage them to schedule a call.

---

## 2. Three Vital Input Metrics

To influence and grow our North Star Metric (CBI), we track and optimize three core upstream input metrics:

1. **Audit Completion Rate (ACR)**:
   * *Formula*: `(Total Completed Audits / Total Landing Page Visitors) * 100`
   * *Why it matters*: Measures the friction of our spend input form. If users bounce before entering their tools, our funnel collapses. We target a baseline ACR of **40%**.
2. **High-Savings Surface Rate (HSSR)**:
   * *Formula*: `(Audits with >$300/mo potential savings / Total Completed Audits) * 100`
   * *Why it matters*: CFOs and CTOs are busy. If our engine surfaces insignificant savings (<$50/mo), the urgency to book a Techvruk consultation is low. Tracking HSSR helps us monitor whether we are attracting the right scale of Series A/B startups.
3. **Lead Capture Conversion Rate (LCCR)**:
   * *Formula*: `(Saved Emails / Total Completed Audits) * 100`
   * *Why it matters*: Tracks the percentage of users willing to hand over their email address after seeing their raw savings dashboard. We target an LCCR of **25%**.

---

## 3. What to Instrument First

On day one of deployment, we would instrument:
* **Form Field Abandonment**: Track which tool field or step has the highest drop-off rate using clean telemetry (e.g., Mixpanel or PostHog).
* **"Share Report" CTR**: Monitor how many users click the "Share" button, giving us a baseline for our organic viral loop.
* **Friction Points on booking CTA**: Measure clicks on the "Book Techvruk Consultation" button to assess copy conversion strength.

---

## 4. The Pivot Trigger Number

We will establish a strict pivot threshold:
> **If LCCR (Lead Capture Conversion Rate) remains under 8% after 200 completed audits, we will initiate a product pivot.**

### The Pivot Action Plan:
A low conversion rate means that while users find the calculator interesting, they do not value the final report or expert support enough to provide an email. If we trigger this threshold, we will pivot from a "Self-Service Calculator" model to a **"Slack-First Workspace App"** model. Instead of an online web form, we will package the audit as a Slack Bot that teams can install into their workspace to auto-monitor and alert them of double-subscribed users in real time.
