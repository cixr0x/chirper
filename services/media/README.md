# Media Service

Owner of `media_*` tables for upload state and asset metadata.

The current implementation registers externally hosted profile assets under media-owned IDs.
Delivery stays behind the BFF through asset redirect routes, so `profile` stores asset references
instead of direct URLs for newly managed avatar and banner media.
