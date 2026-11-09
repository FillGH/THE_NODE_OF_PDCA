# BUILD 3 · Export contract v1

The server builds each export from one saved PDCA revision selected by ID. All formats include active Nodes and directed relationships with active endpoints. Trash and deletion Audit are filtered at the source. JSON uses UTF-8 and preserves the layout of the approved PDCA-SYN-01 example.

- `schemaVersion` is 1. `pdca` has `id`, `title`, and `revision`. `exportedAt` is an ISO timestamp. `factoryTimeZone` is `Asia/Bangkok`.
- `nodes` contain `id`, `category`, `title`, `content`, `documents` and image references `{ref, caption, mediaType}`. Only Action Nodes include `action: {pic, dueDate, status}`. Empty PIC and Due Date are null.
- `relationships` contain `id`, `source`, `target`, `label`, and `color`.
- `history` contains `textRevisions`, `categoryChanges`, `relationshipChanges`, `actionStatusChanges` and `actionDueDateChanges`. Events retain saved revision, display name and timestamp. Deleted relationships remain in History while both endpoint Nodes are active. No image binaries or unsaved drafts are included.
- Excel contains two worksheets, `Nodes` and `Relationships`. Dates are Excel dates. Blank fields remain blank.
- PDF contains a paginated graph with directed edges and cross-page references, followed by readable Node details keyed to the same IDs.
