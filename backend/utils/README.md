# backend/utils

Put shared backend helper functions here.

If logic is used by multiple routes/services and does not belong to one feature, this is the right place.

## Good candidates

- Input validators
- String/date formatters
- Small parsing helpers
- Generic API response helpers

## Not a good fit

- Request-specific business logic
- Database query orchestration
- Role/permission flow logic tied to one module

## Naming style

Use clear, action-based names like:
- `isValidSequence()`
- `normalizePhoneNumber()`
- `toSafeFilename()`

Keep helpers small and composable.
