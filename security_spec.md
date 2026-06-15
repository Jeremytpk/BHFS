# Bora Holding Full System (BHFS) Security Specification

This document defines the zero-trust security rules and the "Dirty Dozen" vulnerability payloads that must be rejected by the system.

## 1. Data Invariants
1. **Relational Hierarchy Check**: Comments cannot belong to non-existent jobs.
2. **Identity Integrity**: Normal employees can only create, edit, or delete chat messages and comments matching their actual signed-in `uid`. They cannot modify other people's chats or comments.
3. **Role Limitation**: Normal employees are strictly read-only for `branches`, `paystubs`, list of other `employees`, and can only update `jobs` assigned to themselves.
4. **Role Isolation**: Only `sup_admin` can create and edit branch records, register new employee profiles, change employee roles, approve paystubs, and assign jobs.
5. **Terminal State Locking**: Once a job status is `'completed'`, normal technicians can no longer modify the job description, client records, or log additional hours.
6. **Temporal Validation**: No user can spoof `createdAt` or `updatedAt` timestamps. They must exactly match `request.time`.

## 2. The "Dirty Dozen" Payloads (PERMISSION_DENIED cases)
1. **Admin Claim Hijacking**: Employee attempts to overwrite their profile role field to `'sup_admin'`.
2. **Orphaned Writes**: Creating a job ticket comment for a draft, non-existent job ID.
3. **Spoofing Ownership**: Employee tries to publish a chat message using the `senderId` of another technician or the `sup_admin`.
4. **System Field Injection**: Employee tries to alter the `grossPay`, `netPay`, or tax deductions directly in a job document.
5. **State Transition Skipping**: Job status moves directly from `pending` to `completed` without active transition.
6. **Self-Appointed Paystub Creation**: Technician directly writes a `paystub` document to give themselves $5,000 without `sup_admin` approval.
7. **Cross-Branch Snooping**: Technician tries to list all company branches or read branch confidential details if role-restricted.
8. **Junk Character Poisoning**: Malicious agent tries to write a job with a 50KB description containing raw malware characters or path traversal.
9. **Zero Hour Fraud**: Technician tries to complete a job logging `-15` or `9999` hours to corrupt compensation formulas.
10. **Spoofed CreatedAt**: User registers a job with a customized `createdAt` timestamp set to 3 years ago.
11. **Shadow Field Attack**: Technician updates their phone number while injecting a hidden metadata boolean field `isVerifiedByIrs: true`.
12. **Blanket Query Scraping**: Anonymous client attempts to scrape the `/employees/` list.

## 3. Real Security Rules (`firestore.rules`)
We will write a comprehensive definition below.
