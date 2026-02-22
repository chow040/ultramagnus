# FRS — Payment Method Management

## 1. Overview
Add the ability for users to add, view, update, and remove payment methods in Ultramagnus. This enables future paid tiers, billing, and subscription management.

## 2. Goals
- Allow authenticated users to manage payment methods.
- Provide a clean UI and safe backend flows for payment method lifecycle.
- Maintain auditability and reduce risk of storing sensitive data directly.

## 3. Non-Goals
- Charging users or managing subscription plans (covered in a separate billing spec).
- Handling refunds or invoices.
- Supporting multiple currencies or tax calculations.

## 4. User Stories
- As a user, I can add a new card securely.
- As a user, I can see my saved payment methods and which one is default.
- As a user, I can remove a payment method.
- As a user, I can set a payment method as default.

## 5. Functional Requirements
- Users must be authenticated to manage payment methods.
- The system must not store raw card data; use a payment provider tokenization flow.
- Add payment method:
  - Collect card details via provider UI/widget.
  - Create a payment method token and store only token + metadata.
- List payment methods:
  - Show masked card brand/last4/expiry.
  - Mark default payment method.
- Set default:
  - Update default flag for a user.
- Remove:
  - Detach the payment method from the user and delete local reference.

## 6. Data & Storage
- Table: `payment_methods`
  - `id`
  - `user_id`
  - `provider` (e.g., stripe)
  - `provider_payment_method_id`
  - `brand`
  - `last4`
  - `exp_month`
  - `exp_year`
  - `is_default`
  - `created_at`
  - `updated_at`

## 7. API Endpoints (BFF)
- `GET /api/payment-methods` — list user methods
- `POST /api/payment-methods` — add new payment method (accepts provider token)
- `POST /api/payment-methods/:id/default` — set default
- `DELETE /api/payment-methods/:id` — remove method

## 8. UI/UX
- Settings > Billing > Payment Methods
- Primary CTA: “Add payment method”
- List of cards with:
  - brand logo, last4, expiry
  - default badge
  - actions: Set default, Remove

## 9. Security & Compliance
- No raw card data stored on Ultramagnus servers.
- Use provider-hosted UI (e.g., Stripe Elements) to reduce PCI scope.
- Log only non-sensitive metadata.

## 10. Acceptance Criteria
- Adding a payment method succeeds and shows in list.
- Default can be updated and is reflected in UI and backend.
- Removing a method detaches it from the user and no longer appears.
- All operations require authentication.

## 11. Open Questions
- Which payment provider will we use (Stripe, Braintree, etc.)?
- Do we need multiple payment methods per user at launch?
- Should removal be blocked if active subscription exists?

## 12. Milestones
- Backend endpoints + DB schema
- Frontend UI integration
- Provider integration (tokenization)
- QA and release
