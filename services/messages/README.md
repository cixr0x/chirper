# Messages Service

Owner of `msg_*` tables for direct message conversations, message records, and per-user read state.

This scaffold exposes health over HTTP and registers the `messages.v1` gRPC transport. Domain and gRPC controllers are intentionally deferred.
