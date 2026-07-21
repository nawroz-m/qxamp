const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeIdentifier, validateIdentifierAndPassword } = require("../lib/auth-utils.js");

test("normalizes email identifiers for storage", () => {
  const result = normalizeIdentifier("  User@Example.com  ");
  assert.equal(result.identifier, "user@example.com");
  assert.equal(result.identifierType, "email");
});

test("accepts a phone number identifier", () => {
  const result = normalizeIdentifier("+1 555 123 4567");
  assert.equal(result.identifier, "+1 555 123 4567");
  assert.equal(result.identifierType, "phone");
});

test("rejects invalid identifier formats and weak passwords", () => {
  const invalidEmail = validateIdentifierAndPassword("not-an-email", "abc123");
  assert.equal(invalidEmail.ok, false);

  const weakPassword = validateIdentifierAndPassword("user@example.com", "abc");
  assert.equal(weakPassword.ok, false);
});
