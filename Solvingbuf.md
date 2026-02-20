Solvingbuf.md

1) Problem summary
- Users were able to re-register using the same email/username even after having a verified account. The registration flow would in some cases send an OTP ("OTP sent to email") and allowed duplicate attempts, and this could lead to inconsistent state where the `isVerified` field was toggled or duplicate accounts attempted.

2) Root causes found
- Email/username checks during registration relied on the raw input values. Differences in casing or leading/trailing whitespace allowed `findOne` to miss an existing user (e.g., `User@Mail.com` vs `user@mail.com`).
- The registration endpoint did not explicitly reject attempts to register an already verified account with a clear conflict (409). It returned generic behavior and allowed the path to continue for un-normalized inputs.

3) Files changed
- `src/controllers/auth.controller.js`
  - Normalized `email` (lowercase + trim) and `username` (trim) before all user lookups and creation.
  - Updated `register` to: check for existing user; if `existingUser.isVerified === true` respond `409` and reject; if exists but not verified, respond `409` instructing user to use `resend-otp` instead of creating a new account.
  - Updated `verifyOtp`, `resendOtp`, `login`, `forgotPassword`, `resetPassword` to normalize `email` before queries.

4) What was fixed and why
- Fixed duplicate registrations caused by casing/whitespace mismatches by normalizing email and username at the start of relevant controller functions.
- Prevented re-registration for already-verified accounts by returning `409 Conflict` from `register` when the user exists and `isVerified` is true.
- Clarified response when account exists but is unverified: instruct the client to use `resend-otp` to verify rather than attempting to recreate the account.
- Ensured `resendOtp` returns `409` when account is already verified.

5) Why this resolves the bug
- Normalization removes the opportunity for `findOne` misses due to input formatting differences.
- Early explicit rejection stops any attempt to create duplicate accounts or silently flip verification state.

6) Notes and recommendations
- Ensure MongoDB unique indexes are built for `email` and `username` to provide DB-level protection as a second line of defense.
- Encourage clients to always call `resend-otp` if they receive message that account exists but is unverified.
- Consider adding rate limiting to `register` and `resend-otp` endpoints (already in `server.js`).

7) Testing checklist
- Register a new user (clean email) → success
- Try to register with same email in different case (e.g., `User@Mail.com`) → 409 Conflict
- Try to register with same username → 409 Conflict
- Try to register when existing user exists but not verified → 409 instructing to resend OTP
- Resend OTP for unverified user → 200 OTP resent
- Resend OTP for verified user → 409 Conflict
- Login and forgot/reset flows continue to work (email normalization)

8) Files and code locations to review
- `src/controllers/auth.controller.js` — registration & normalization logic
- `src/middleware/upload.middleware.js` — file validation (not directly related but part of security)
- `server.js` — rate limiting & startup env validation


-- End of file
