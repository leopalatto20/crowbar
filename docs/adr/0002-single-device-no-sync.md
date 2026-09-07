# Single lifter, single device, no sync

Crowbar is explicitly single-lifter, single-device, offline-first: no accounts, no sync, no third-party tracking. Backup and portability are served by export/import of the local store — from day one.

Retrofitting sync onto a bespoke local schema is the single most expensive change this app could make, and no product promise (privacy, zero-account, offline) requires multi-device. The scope boundary is deliberate.

**Considered Options**: multi-device sync (LAN, self-hosted relay, file-drop) — explicitly out of scope until the product proves itself. Multi-lifter profiles on one device — out of scope; one lifter owns the device.
**Consequences**: device loss = data loss unless exported; the export/import format is part of the public contract and must stay versioned.