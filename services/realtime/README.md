# Realtime Service

The realtime service currently uses an in-memory event buffer for local fan-out. In production this would move to Redis/NATS-backed delivery while keeping browser traffic behind the BFF.
