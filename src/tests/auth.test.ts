/**
 * Authentication & Verification E2E Test Suite
 * Verifies email registration, 6-digit OTP verification, session security,
 * and desktop handoff routing matching Cherry Studio.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../server/auth-service.js';
import { StudioServer } from '../server/studio-server.js';

describe('AuthService Core Security & OTP Unit Tests', () => {
  const auth = new AuthService();

  test('Rejects invalid registration parameters with descriptive errors', () => {
    assert.throws(() => auth.register('', 'test@domain.com', 'secret123'), /Username must be at least 3 characters/);
    assert.throws(() => auth.register('alice', 'invalid-email', 'secret123'), /Please enter a valid email address/);
    assert.throws(() => auth.register('alice', 'alice@domain.com', '123'), /Password must be at least 6 characters/);
  });

  test('Dispatches 6-digit verification code on valid registration', () => {
    const res = auth.register('dhanwinn_test', 'testuser@repopulse.io', 'SecurePass2026!');
    assert.equal(res.success, true);
    assert.equal(res.email, 'testuser@repopulse.io');
    assert.ok(res.code, 'Verification code must be generated');
    assert.match(res.code, /^\d{6}$/, 'Code must be exactly 6 digits');
  });

  test('Fails verification when code does not match', () => {
    assert.throws(() => {
      auth.verifyCode('testuser@repopulse.io', '000000');
    }, /Invalid verification code/);
  });

  test('Successfully verifies code, marks user verified, and issues session token', () => {
    const code = auth.getPendingCode('testuser@repopulse.io');
    assert.ok(code, 'Pending code must exist');

    const verifyRes = auth.verifyCode('testuser@repopulse.io', code);
    assert.equal(verifyRes.success, true);
    assert.ok(verifyRes.token.startsWith('rpa_'), 'Token should be prefixed with rpa_');
    assert.equal(verifyRes.user.tier, 'PRO');
    assert.equal(verifyRes.user.username, 'dhanwinn_test');

    // Validate active session
    const session = auth.validateToken(verifyRes.token);
    assert.ok(session);
    assert.equal(session?.email, 'testuser@repopulse.io');
  });

  test('Authenticates verified user via login', () => {
    const loginRes = auth.login('testuser@repopulse.io', 'SecurePass2026!');
    assert.equal(loginRes.success, true);
    assert.ok(loginRes.token);
    assert.equal(loginRes.user.tier, 'PRO');

    // Rejects wrong password
    assert.throws(() => {
      auth.login('testuser@repopulse.io', 'WrongPassword!');
    }, /Password incorrect/);
  });

  test('Resends verification code for pending registration and invalidates old code', () => {
    auth.register('bob_maintainer', 'bob@repopulse.io', 'PassBob2026!');
    const initialCode = auth.getPendingCode('bob@repopulse.io');
    assert.ok(initialCode);

    const resend = auth.resendCode('bob@repopulse.io');
    assert.equal(resend.success, true);
    assert.match(resend.code, /^\d{6}$/);
    assert.notEqual(resend.code, '');

    // Attempting old code must fail
    if (initialCode !== resend.code) {
      assert.throws(() => {
        auth.verifyCode('bob@repopulse.io', initialCode);
      }, /Invalid verification code/);
    }

    // Attempting non-6-digit code must fail
    assert.throws(() => {
      auth.verifyCode('bob@repopulse.io', '123');
    }, /Verification code must be exactly 6 numeric digits/);

    // Attempting exact new code succeeds
    const verified = auth.verifyCode('bob@repopulse.io', resend.code);
    assert.equal(verified.success, true);
    assert.ok(verified.token);

    // Attempting to verify again after already verified fails
    assert.throws(() => {
      auth.verifyCode('bob@repopulse.io', resend.code);
    }, /No pending registration found/);
  });
});

describe('StudioServer Authentication HTTP Endpoints E2E', () => {
  const studio = new StudioServer(3949);
  let port: number;

  before(async () => {
    port = await studio.start();
  });

  after(async () => {
    await studio.stop();
  });

  test('GET /login serves the Apple Liquid Glass auth portal HTML', async () => {
    const res = await fetch(`http://localhost:${port}/login`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('RepoPulse Studio'), 'Includes title');
    assert.ok(html.includes('dynamic-island'), 'Includes dynamic island');
    assert.ok(html.includes('otp-container'), 'Includes 6-digit OTP container');
    assert.ok(html.includes('repopulse://auth'), 'Includes deep-link protocol handoff');
    assert.ok(html.includes('view-success'), 'Includes success verification step');
  });

  test('HTTP OTP: Rejects wrong code with 400 Bad Request and allows resend flow', async () => {
    const email = `otp_test_${Date.now()}@repopulse.io`;

    // 1. Register
    const regRes = await fetch(`http://localhost:${port}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'security_lead',
        email,
        password: 'PassPhrase2026!'
      })
    });
    assert.equal(regRes.status, 200);
    const regData = await regRes.json() as any;
    const initialCode = regData.code;
    assert.ok(initialCode);

    // 2. Submit wrong code (e.g. 000000)
    const wrongCodeRes = await fetch(`http://localhost:${port}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code: '000000'
      })
    });
    assert.equal(wrongCodeRes.status, 400);
    const wrongCodeData = await wrongCodeRes.json() as any;
    assert.equal(wrongCodeData.success, false);
    assert.ok(wrongCodeData.error.includes('Invalid verification code'));

    // 3. Submit invalid format code (e.g. '123')
    const shortCodeRes = await fetch(`http://localhost:${port}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code: '123'
      })
    });
    assert.equal(shortCodeRes.status, 400);
    const shortCodeData = await shortCodeRes.json() as any;
    assert.equal(shortCodeData.success, false);
    assert.ok(shortCodeData.error.includes('6 numeric digits'));

    // 4. Resend code
    const resendRes = await fetch(`http://localhost:${port}/api/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    assert.equal(resendRes.status, 200);
    const resendData = await resendRes.json() as any;
    assert.equal(resendData.success, true);
    assert.ok(resendData.code);
    const newCode = resendData.code;

    // 5. Submit old code after resend -> fails
    if (initialCode !== newCode) {
      const oldCodeRes = await fetch(`http://localhost:${port}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: initialCode })
      });
      assert.equal(oldCodeRes.status, 400);
    }

    // 6. Submit EXACT new code -> succeeds
    const exactVerifyRes = await fetch(`http://localhost:${port}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: newCode })
    });
    assert.equal(exactVerifyRes.status, 200);
    const exactVerifyData = await exactVerifyRes.json() as any;
    assert.equal(exactVerifyData.success, true);
    assert.ok(exactVerifyData.token);
    assert.equal(exactVerifyData.user.tier, 'PRO');

    // 7. Submit same code again -> fails
    const reVerifyRes = await fetch(`http://localhost:${port}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: newCode })
    });
    assert.equal(reVerifyRes.status, 400);
  });

  test('Complete E2E: Register -> Verify -> Session lifecycle over HTTP', async () => {
    const email = `maintainer_${Date.now()}@example.org`;

    // 1. POST /api/auth/register
    const regRes = await fetch(`http://localhost:${port}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'pro_maintainer',
        email,
        password: 'SuperSecret2026!'
      })
    });
    assert.equal(regRes.status, 200);
    const regData = await regRes.json() as any;
    assert.equal(regData.success, true);
    assert.ok(regData.code);

    // 2. POST /api/auth/verify
    const verifyRes = await fetch(`http://localhost:${port}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code: regData.code
      })
    });
    assert.equal(verifyRes.status, 200);
    const verifyData = await verifyRes.json() as any;
    assert.equal(verifyData.success, true);
    assert.ok(verifyData.token);
    assert.equal(verifyData.user.tier, 'PRO');

    // 3. GET /api/auth/session
    const sessionRes = await fetch(`http://localhost:${port}/api/auth/session`, {
      headers: { 'Authorization': `Bearer ${verifyData.token}` }
    });
    assert.equal(sessionRes.status, 200);
    const sessionData = await sessionRes.json() as any;
    assert.equal(sessionData.session.email, email);
    assert.equal(sessionData.session.tier, 'PRO');
  });
});
