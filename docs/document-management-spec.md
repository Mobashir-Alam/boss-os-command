# Document Management Spec

## Purpose

This spec defines how document management should work for the CEO-first product slice.

The document system should help the CEO and leadership team manage, review, and verify company records across multiple businesses. It must support both high-level visibility and drill-down access to supporting files.

This is especially important for:

- rental bills
- rent agreements
- purchase bills
- vendor invoices
- financial support documents
- company and legal records
- contracts
- compliance documents

## Product Goals

The document layer should allow the CEO to:

- view all important documents for a company in one place
- filter documents by category and date
- connect a financial number to its supporting file
- check whether required documents exist for a company
- inspect legal, finance, and operational records without leaving the app
- give KAI enough structured context to summarize document health later

## CEO Use Cases

### 1. Verify A Spend

The CEO sees an expense or burn increase and wants to check the supporting file.

Example:

- a rent amount is shown in finance summary
- CEO opens the linked rental bill or rent agreement

### 2. Review Operational Purchases

The CEO wants to understand major purchases and vendor spend.

Example:

- purchase bills
- vendor invoices
- department-specific expenses

### 3. Review Company Records

The CEO wants to inspect foundational documents of a company.

Example:

- incorporation records
- registration certificates
- legal agreements
- board or compliance files

### 4. Audit Readiness

The CEO wants to know whether the business has the right documents in place.

Example:

- missing bills
- missing contracts
- expired compliance files
- incomplete legal records

## Scope For Founder / CEO MVP

For MVP, document management should support:

- upload and store documents per company
- categorize documents clearly
- filter by category and date
- show uploader and upload date
- link documents to departments where relevant
- link documents to finance records where relevant
- allow preview/download access through secure storage links

The MVP does not need:

- OCR extraction
- automated reconciliation
- approval workflows
- version comparison UI
- advanced retention policies

## Core Document Categories

### Finance

- rental bills
- purchase bills
- vendor invoices
- reimbursements
- tax documents
- bank-related files
- payroll support documents

### Legal

- contracts
- agreements
- NDAs
- service agreements
- vendor agreements

### Compliance

- regulatory filings
- certificates
- licenses
- policy acknowledgements

### Company Records

- incorporation documents
- registration certificates
- board records
- ownership support documents
- cap-table support files

### Operations

- office leases
- procurement records
- operational receipts

### HR

- hiring approvals
- offer templates
- policy documents

## Recommended Data Model

The repo already has `startup_documents`, which is a good base. For MVP, we should likely extend that model rather than inventing a totally separate document system immediately.

### Recommended Fields

Each document should support:

- `id`
- `startup_id`
- `title`
- `file_name`
- `file_url`
- `storage_path`
- `category`
- `subcategory`
- `document_date`
- `uploaded_by`
- `uploaded_at`
- `department`
- `vendor_name`
- `amount`
- `currency`
- `linked_financial_entry_id`
- `linked_funding_round_id`
- `linked_stakeholder_id`
- `notes`
- `tags`
- `status`

## Recommended Field Meaning

### `category`

Top-level grouping for filtering and reporting.

Suggested values:

- `finance`
- `legal`
- `compliance`
- `company_record`
- `operations`
- `hr`

### `subcategory`

More specific document type.

Suggested values:

- `rent_bill`
- `rent_agreement`
- `purchase_bill`
- `vendor_invoice`
- `bank_document`
- `tax_document`
- `contract`
- `certificate`
- `incorporation`
- `board_record`
- `ownership_support`
- `policy_document`

### `department`

Optional, for documents tied to a function.

Suggested values for the current CEO model:

- `social_media`
- `video_production_editing`
- `content_management`
- `studio`
- `tech`
- `creators_brands_outreach`
- `hr`
- `graphic_designing`
- `office_management`

### `status`

Useful for future review flows.

Suggested values:

- `active`
- `archived`
- `missing_reference`
- `needs_review`

## Storage Strategy

Documents should be stored in Supabase Storage and referenced from structured database rows.

Recommended pattern:

- storage bucket for company documents
- folder path grouped by startup/company
- database row stores metadata
- UI reads metadata first, then opens secure file link

Example path shape:

- `company-documents/{startup_id}/{category}/{year}/{file_name}`

## Linking Strategy

Documents should not live in isolation.

Where possible, a document should link to:

- a company
- a department
- a financial entry
- a funding round
- a stakeholder

This will make CEO drill-down much more useful.

Example:

- finance dashboard shows a burn spike
- one line item links to a financial entry
- the financial entry links to a purchase bill
- the CEO can open the original bill immediately

## CEO UI Expectations

When we build the UI later, the company-level document repository should support:

- search by name
- filter by category
- filter by department
- filter by date range
- sort by latest uploaded
- badges for bill type / legal type / compliance type
- quick preview action
- linked record context where available

Useful sections on the company page:

- recent documents
- finance support documents
- legal and company documents
- missing critical documents

## KAI Relevance

KAI should later be able to reason over document metadata, not raw file contents at first.

Good KAI use cases later:

- detect that major expenses lack supporting files
- detect that one company has missing legal/compliance documents
- tell the CEO that rent or vendor spend has incomplete documentation
- summarize document health as part of a company review

For MVP, KAI should only use document metadata unless OCR or extraction is explicitly added later.

## MVP Build Recommendation

The simplest good implementation path is:

1. extend `startup_documents` with stronger metadata
2. store files in Supabase Storage
3. show a company-level document repository in the startup detail flow
4. link finance-related documents to finance records
5. surface recent and critical documents in CEO views where useful

## Open Questions For Later

These do not block MVP, but should be answered in future phases:

- Should we support OCR and text extraction?
- Should finance documents require mandatory amount and vendor fields?
- Should some categories require expiry dates?
- Should the CEO be able to request missing documents from a department owner?
- Should we support versioning for contracts and legal records?

## Guidance For Future Lovable UI Prompts

When creating UI in Lovable later, prompts should specify:

- this is a CEO-facing multi-company document repository
- the UI must feel high-signal and business-grade
- document categories must be explicit and easy to scan
- finance, legal, and company records should feel distinct
- recent uploads, missing critical docs, and linked finance context should be visible
- the design should support filtering by company, category, department, and date

This keeps the document experience aligned with the rest of the founder command center rather than feeling like a generic file manager.
